import crypto from "node:crypto";
import { expect as baseExpect, test, type Locator, type Page } from "@playwright/test";

// Each step makes several round trips to the Sydney development database, so allow up to 30 s per assertion.
const expect = baseExpect.configure({ timeout: 30_000 });
import postgres from "postgres";
import { gstinChecksumChar } from "../../src/lib/validators";

// Part 2 end to end with Supabase test phone numbers (fixed OTP 123456; no message is sent):
// sign-up → business verification → Plan B through the mock gateway (Part 3) → dashboard → wallet top-up → invite →
// accept as a second user → counterparties (Part 4: add by GSTIN, duplicates, edit, archive, search) → Credit Worthiness
// (Part 5) → buyer consent: approve, withdraw, decline, expiry and the request limit (Part 7) → roles →
// deactivate → removed, plus the cancelled-GSTIN (manual review) and duplicate-GSTIN paths.
// Needs: Phone provider + test numbers enabled in Supabase (see docs/PARTS.md, Part 2). The suite deletes and re-creates
// its own numbers 90000 00011 to 00013 on every run; 90000 00001 to 00003 are kept for trying the portal by hand and
// must never be used here (the user's verified test business lives on 00001).
const OWNER = "9000000011";
const MEMBER = "9000000012";
const OTHER = "9000000013";
const OTP = "123456";

const gstinWith = (entity: string) => {
  // The PAN's 9th character is fixed at 1: the dummy MSME source answers "not registered" when it is 8.
  // 608 is skipped: 29AAPFQ6081F1ZQ belongs to the kept hand-testing business of 90000 00001.
  const n = 100 + Math.floor(Math.random() * 899);
  const base = `29AAPFQ${n >= 608 ? n + 1 : n}1F${entity}Z`;
  return base + gstinChecksumChar(base);
};

/** Leaves out the faded example data the report shows in place of a section without data (it sits under [inert]). */
const real = (l: Locator) => l.and(l.page().locator(":not([inert] *)"));

test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "Runs once at desktop size; layouts are covered by shell.spec.ts");

let db: ReturnType<typeof postgres>;

test.beforeAll(async ({ request }) => {
  const probe = await request.post("/api/v1/auth/otp/send", { data: { mobile: OTHER } });
  test.skip(probe.status() === 503, "Phone sign-in is not enabled in Supabase yet");

  const url = new URL(process.env.DIRECT_URL!);
  db = postgres(url.toString(), { ssl: "require", max: 2, onnotice: () => undefined });
  // Never wipe the hand-testing numbers (90000 00001 to 00003): the user keeps a verified business there.
  for (const m of [OWNER, MEMBER, OTHER]) if (["9000000001", "9000000002", "9000000003"].includes(m)) throw new Error(`e2e must not use ${m}`);
  // Start clean: remove the test-number users and their organisations, and reset their OTP limits.
  const phones = [OWNER, MEMBER, OTHER].map((m) => `91${m}`);
  await db`delete from public.organisations where created_by in (select id from auth.users where phone in ${db(phones)})`;
  await db`delete from auth.users where phone in ${db(phones)}`;
  await resetOtpLimits(OWNER, MEMBER, OTHER);
});

/** The suite signs the Owner in more often than the 5 OTPs an hour a real user may ask for. */
async function resetOtpLimits(...mobiles: string[]) {
  const key = Buffer.from(process.env.BLIND_INDEX_KEY!, "base64");
  const hashes = mobiles.map((m) => crypto.createHmac("sha256", key).update(`mobile:${m}`).digest("hex"));
  await db`delete from app_private.otp_events where phone_hash in ${db(hashes)}`;
}

test.afterAll(async () => {
  await db?.end();
});

async function signIn(page: Page, mobile: string, next?: string, opts: { staysOnLogin?: boolean } = {}) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await page.getByLabel("Mobile number").fill(mobile);
  await page.getByRole("button", { name: "Send OTP" }).click();
  await expect(page.getByText(/Enter the 6-digit OTP/)).toBeVisible();
  await page.getByLabel("One-time password digit 1").click();
  await page.keyboard.type(OTP); // the sixth digit submits
  if (!opts.staysOnLogin) await expect(page).not.toHaveURL(/\/login/);
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

async function verifyBusiness(page: Page, gstin: string, name: string, email: string) {
  await page.getByLabel("GSTIN").fill(gstin);
  await page.getByRole("button", { name: "Fetch details" }).click();
  return { name, email };
}

async function profileAndCreate(page: Page, name: string, email: string, submit: RegExp) {
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Designation").selectOption("Proprietor");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("checkbox", { name: /I confirm I am authorised/ }).check();
  await page.getByRole("checkbox", { name: /I accept the/ }).check();
  await page.getByRole("button", { name: submit }).click();
}

const firstGstin = gstinWith("1");
let orgName = "";
let inviteLink = "";

test("a new user signs up with OTP and verifies the business by GSTIN", async ({ page }) => {
  test.slow(); // sign-up, business verification, plan purchase and the first compile of each page
  await signIn(page, OWNER);
  await expect(page).toHaveURL(/\/signup\/business/);
  await verifyBusiness(page, firstGstin, "Rakesh Owner", "rakesh@steeltraders.in");
  await expect(page.getByText("Details from GST records")).toBeVisible();
  await expect(page.getByText("Test data")).toBeVisible();
  orgName = (await page.locator("dt", { hasText: "Trade name" }).locator("+ dd").textContent()) ?? "";
  await profileAndCreate(page, "Rakesh Owner", "rakesh@steeltraders.in", /Create account/);
  await expect(page).toHaveURL(/\/signup\/plan/);

  // S03: Plan B is recommended and preselected; ₹17,599 + 18% GST, paid through the mock gateway's signed webhook.
  await page.getByRole("button", { name: "Pay ₹20,766.82" }).click();
  await expect(page).toHaveURL(/\/dev\/pay\/mock_order_/);
  await page.getByRole("button", { name: "Pay successfully" }).click();
  await expect(page).toHaveURL(/\/signup\/plan\?order=/);
  await expect(page.getByText("Payment received")).toBeVisible();
  await page.getByRole("link", { name: "Go to dashboard" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Welcome back, Rakesh" })).toBeVisible();
  // v4 section 3: the plan payment goes into the wallet in full.
  await expect(page.getByText("Wallet: ₹20,766.82")).toBeAttached();
  await expect(page.getByText(orgName).first()).toBeVisible();
});

test("the Owner tops up the wallet; a failed payment changes nothing and the ledger and invoices show the rest", async ({ page }) => {
  test.slow(); // three trips through the mock gateway
  await signIn(page, OWNER);
  await page.goto("/account/billing");
  await expect(page.getByRole("heading", { level: 1, name: "Plan, usage and wallet" })).toBeVisible();
  await expect(page.getByText("Plan payments go into your wallet · 5 users")).toBeVisible();

  const topUp = async (amount: string, outcome: "Pay successfully" | "Fail the payment") => {
    await page.getByRole("button", { name: "Add money" }).click();
    await page.getByLabel("Amount (₹)").fill(amount);
    await page.getByRole("button", { name: "Continue to pay" }).click();
    await expect(page).toHaveURL(/\/dev\/pay\/mock_order_/);
    await page.getByRole("button", { name: outcome }).click();
    await expect(page).toHaveURL(/\/account\/billing\?order=/);
  };

  await page.getByRole("button", { name: "Add money" }).click();
  await page.getByLabel("Amount (₹)").fill("500");
  await page.getByRole("button", { name: "Continue to pay" }).click();
  await expect(page.getByText("Enter an amount between ₹1,000 and ₹5,00,000.")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await topUp("1500", "Fail the payment");
  await expect(page.getByText("Payment failed")).toBeVisible();
  await expect(page.getByText("The bank declined this payment (test).")).toBeVisible();

  await page.goto("/account/billing");
  await topUp("2000", "Pay successfully");
  await expect(page.getByText("₹2,000 was added to your wallet. The GST invoice is ready.")).toBeVisible();
  await expect(page.getByText("Wallet top-up", { exact: true })).toBeVisible();
  await expect(page.getByText("Chaanbean wallet top-up", { exact: true })).toBeVisible();
  await expect(page.getByText("Plan B subscription, 12 months")).toBeVisible();
});

test("the Owner invites a Member; the link arrives in the outbox", async ({ page }) => {
  await signIn(page, OWNER);
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/account/team");
  await expect(page.getByText("1 of 5 seats used")).toBeVisible();
  await page.getByRole("button", { name: "Invite user" }).click();
  await page.getByLabel("Full name").last().fill("Anita Member");
  await page.getByLabel("Mobile").last().fill(MEMBER);
  await page.getByLabel("Email").last().fill("anita@steeltraders.in");
  await page.getByLabel("Role").last().selectOption("member");
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByText("Pending invitations")).toBeVisible();
  await expect(page.getByText("2 of 5 seats used")).toBeVisible();

  await page.goto("/dev/outbox");
  inviteLink = (await page.locator('a[href*="/invite/"]').first().getAttribute("href")) ?? "";
  expect(inviteLink).toMatch(/\/invite\//);
});

test("the invited Member signs in with the invited mobile and accepts", async ({ page }) => {
  await page.goto(inviteLink);
  await expect(page.getByRole("heading", { name: /Join .* on Chaanbean/ })).toBeVisible();
  await page.getByRole("link", { name: "Sign in with this mobile to accept" }).click();
  await signIn(page, MEMBER, new URL(inviteLink).pathname);
  await expect(page).toHaveURL(/\/invite\//);
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(orgName).first()).toBeVisible();
  // Members cannot manage the team (PRD 4.3).
  await page.goto("/account/team");
  await expect(page.getByText("Only Owners and Admins can manage the team")).toBeVisible();
  await page.goto("/account/billing");
  await expect(page.getByText("Only Owners and Admins can see billing")).toBeVisible();
});

// Part 4: counterparties (S05, S06, S07), run here because they need the Owner's organisation from the steps above.
const buyerGstin = gstinWith("2");
const buyerMobile = `98${String(Math.floor(Math.random() * 9_000_000) + 1_000_000)}3`; // ends in 3: the mock UPI says linked
let buyerName = "";
let buyerPath = "";

// One signed-in Owner session for these steps: the PRD allows 5 OTP sends an hour per number.
test.describe("counterparties", () => {
  let page: Page;
  test.beforeAll(async ({ browser, baseURL, viewport }) => {
    page = await (await browser.newContext({ baseURL, viewport })).newPage(); // a manual context does not get the config's use options
    await signIn(page, OWNER, "/counterparties");
  });
  test.afterAll(async () => {
    await page?.context().close();
  });

  test("the Owner adds a buyer by GSTIN: details are fetched and the mobile is checked through UPI", async () => {
    await page.goto("/counterparties");
    await expect(page.getByRole("heading", { level: 1, name: "Counterparties" })).toBeVisible();
    await page.getByRole("link", { name: "Add counterparty" }).first().click();
    await expect(page).toHaveURL(/\/counterparties\/new/);
    await page.getByLabel("GSTIN").fill(buyerGstin);
    await page.getByRole("button", { name: "Fetch details" }).click();
    await expect(page.getByText("Details from GST records")).toBeVisible();
    buyerName = await page.getByLabel("Legal name").inputValue();
    expect(buyerName.length).toBeGreaterThan(2);
    await page.getByLabel("Contact person").fill("Suresh Buyer");
    await page.getByLabel(/^Mobile/).fill(buyerMobile);
    await expect(page.getByText(/Adding a buyer costs ₹11\.80 \(₹10 \+ GST\) from your wallet/)).toBeVisible(); // v3 CP_ADD
    await page.getByRole("button", { name: "Check bank-linked mobile" }).click();
    await expect(page.getByText(/Linked to a bank account/)).toBeVisible();
    await page.getByLabel(/Credit days/).fill("30");
    await page.getByLabel(/Tags/).fill("wholesale, pune");
    await page.getByRole("button", { name: "Save counterparty" }).click();
    await expect(page).toHaveURL(/\/counterparties\/[0-9a-f-]{36}$/);
    buyerPath = new URL(page.url()).pathname;
    await expect(page.getByRole("heading", { level: 1, name: buyerName })).toBeVisible();
    await expect(page.getByText("Bank-linked", { exact: true })).toBeVisible();
  });

  test("the same GSTIN or mobile cannot be added twice; the warning links to the existing profile", async () => {
    await page.goto("/counterparties/new");
    await page.getByLabel("GSTIN").fill(buyerGstin);
    await page.getByLabel("Legal name").click(); // leaving the GSTIN field runs the duplicate check
    await expect(page.getByText("This counterparty already exists.")).toBeVisible();
    await expect(page.getByRole("link", { name: `Open ${buyerName}` })).toHaveAttribute("href", buyerPath);

    await page.getByRole("radio", { name: /Business without GST/ }).click();
    await page.getByLabel("PAN").fill("AAAPZ1234C");
    await page.getByLabel(/^Mobile/).fill(buyerMobile);
    await page.getByLabel("Contact person").click();
    await expect(page.getByText("This counterparty already exists.")).toBeVisible();
  });

  test("the Owner edits, archives and restores the buyer, and Activity shows each change", async () => {
    await page.goto(buyerPath);
    await page.getByRole("button", { name: "Edit" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel(/^Mobile/)).toHaveValue(buyerMobile); // unmasked only in the edit form
    await dialog.getByLabel("Contact person").fill("Suresh K Buyer");
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Changes saved")).toBeVisible();

    await page.getByRole("button", { name: "Archive" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Archive" }).click();
    await expect(page.getByText(/This counterparty is archived/)).toBeVisible();
    await page.getByRole("button", { name: "Restore" }).click();
    await expect(page.getByText(/This counterparty is archived/)).toBeHidden();

    await page.getByRole("tab", { name: /Activity/ }).click();
    for (const label of ["Added", "Details changed", "Archived", "Restored"]) {
      await expect(page.getByText(new RegExp(`^${label} by `))).toBeVisible();
    }
  });

  // Part 5: Credit Worthiness public checks (PRD v2.0 Figures 4, 5 and 8).
  test("the Owner runs Credit Worthiness: sees the cost, runs it with a cancel bar, and gets one report", async () => {
    test.slow(); // the cancel window and several round trips to the Sydney database
    await page.goto(`${buyerPath.replace("/counterparties/", "/checks/new?counterparty=")}`);
    await expect(page.getByRole("heading", { name: "Choose a check" })).toBeVisible();
    // v2: packages first; single checks sit under "Customise".
    await page.getByRole("button", { name: "Customise" }).click();
    await page.getByRole("checkbox", { name: /Credit rating/ }).check();
    // v4: rupees only. GST search ₹15 + Company ₹2 + Directors ₹189 + Credit rating ₹189 = ₹395, + 18% GST.
    await expect(page.locator("aside").getByText("₹466.10").first()).toBeVisible();
    // v4 section 8: no confirm popup. "Run search" starts a short countdown with Cancel, then opens the report.
    await page.locator("aside").getByRole("button", { name: /^Run search/ }).click();
    await expect(page.getByText(/^Starting in/)).toBeVisible();
    await expect(page).toHaveURL(/\/reports\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1, name: buyerName })).toBeVisible();
    // Public checks only, so no turnover or CIBIL yet: "Not enough data" and no safe range.
    await expect(page.getByText("Not enough data", { exact: true })).toBeVisible();
    await expect(page.getByText("Run GST turnover to get a safe credit range.")).toBeVisible();
    await expect(page.getByText("GST returns filed on time")).toBeVisible();
    await expect(page.getByText("12 of 12")).toBeVisible();
    await page.goto(buyerPath);
    await expect(page.getByRole("tab", { name: /Reports\s*\(1\)/ })).toBeVisible();
  });

  // Part 7: buyer consent for GST turnover and CIBIL (PRD v2.0 Figures 6 and 7, S09 rules, S10).
  let consentLink = "";
  let reportPath = "";

  async function askBuyer(choose: () => Promise<void>) {
    await page.goto(buyerPath.replace("/counterparties/", "/checks/new?counterparty="));
    await expect(page.getByRole("heading", { name: "Choose a check" })).toBeVisible();
    await page.getByRole("button", { name: "Customise" }).click();
    await choose();
    // A check that needs a yes stops after "Run search" to show who is asked and how, in the cost panel.
    const panel = page.locator("aside");
    await panel.getByRole("button", { name: /^Run search/ }).click();
    await expect(panel.getByText("Ask the buyer to say yes")).toBeVisible();
    return panel;
  }

  async function sendAndGetLink(panel: ReturnType<Page["locator"]>) {
    await panel.getByRole("button", { name: "Send request and run" }).click();
    await expect(page).toHaveURL(/\/reports\/[0-9a-f-]{36}$/);
    reportPath = new URL(page.url()).pathname;
    await expect(page.getByText(/Waiting for the buyer to say yes since/)).toBeVisible();
    await page.goto("/dev/outbox");
    consentLink = (await page.locator('a[href*="/c/"]').first().getAttribute("href")) ?? "";
    expect(consentLink).toMatch(/\/c\/[A-Za-z0-9_-]+$/);
  }

  async function buyerPage(browser: import("@playwright/test").Browser, baseURL: string | undefined) {
    // The buyer has no account and opens the link on a phone.
    const buyer = await (await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } })).newPage();
    await buyer.goto(consentLink);
    await expect(buyer.getByRole("heading", { level: 1, name: /wants to check your business credit/ })).toBeVisible();
    return buyer;
  }

  async function buyerOtp(buyer: Page) {
    await buyer.getByRole("button", { name: "Send OTP" }).click();
    await buyer.getByLabel("Mobile OTP digit 1").click();
    await buyer.keyboard.type(OTP);
    await expect(buyer.getByText("Mobile verified")).toBeVisible();
  }

  test("the Owner asks for GST turnover and company CIBIL: the link goes out and those checks wait", async () => {
    const dialog = await askBuyer(async () => {
      await page.getByRole("checkbox", { name: "GST turnover filed" }).check();
      await expect(page.getByRole("radio", { name: /Last 4 years/ })).toBeChecked(); // v3 6.2 default
      await page.getByRole("checkbox", { name: "CIBIL report" }).check();
      await expect(page.getByRole("radio", { name: "Company CIBIL" })).toBeChecked();
    });
    await expect(dialog.getByRole("checkbox", { name: /^SMS/ })).toBeChecked();
    await expect(dialog.getByRole("checkbox", { name: /^Email/ })).toBeDisabled(); // no email on file
    await dialog.getByLabel("Purpose").selectOption("supply_on_credit");
    await sendAndGetLink(dialog);
    await page.goto(reportPath);
    await expect(page.getByText("Buyer consent")).toBeVisible();
    await expect(page.getByText("Waiting for the buyer to say yes", { exact: true }).first()).toBeVisible();
  });

  test("the buyer verifies by OTP, gives GST portal access and bureau details, and approves", async ({ browser, baseURL }) => {
    test.slow(); // several round trips to the Sydney database
    const buyer = await buyerPage(browser, baseURL);
    await expect(buyer.getByText("GST turnover you filed in the last 4 years")).toBeVisible();
    await expect(buyer.getByText("Company credit report (CIBIL)")).toBeVisible();
    await expect(buyer.getByRole("button", { name: "Approve and continue" })).toBeDisabled();
    await buyerOtp(buyer);

    // GST portal: API access off first, then a wrong GSTN OTP, then the right one.
    await buyer.getByLabel("GST portal username").fill("noapi_trader");
    await buyer.getByRole("button", { name: "Get GST portal OTP" }).click();
    await expect(buyer.getByText(/API access is not turned on/).first()).toBeVisible();
    await buyer.getByLabel("GST portal username").fill("trader_blr");
    await buyer.getByRole("button", { name: "Get GST portal OTP" }).click();
    await buyer.getByLabel("GST portal OTP digit 1").click();
    await buyer.keyboard.type("111111");
    await expect(buyer.getByText(/GST portal did not accept this OTP/).first()).toBeVisible();
    await buyer.getByLabel("GST portal OTP digit 1").click();
    await buyer.keyboard.type(OTP);
    await expect(buyer.getByText("GST portal access given")).toBeVisible();

    await buyer.getByLabel("Company PAN").fill(buyerGstin.slice(2, 12));
    await buyer.getByLabel("Date of incorporation").fill("2015-04-01");
    await buyer.getByRole("checkbox", { name: /I consent to share the data above/ }).check();
    await buyer.getByRole("button", { name: "Approve and continue" }).click();
    await expect(buyer.getByText(/You said yes on/)).toBeVisible();
    await buyer.context().close();

    // The waiting checks run at once: turnover and CIBIL fill in, and the report gets a safe credit range.
    await page.goto(reportPath);
    await expect(page.getByText("Said yes", { exact: true })).toBeVisible();
    await expect(real(page.getByText(/^CIBIL CMR-\d$/))).toBeVisible();
    await expect(page.getByText("Run GST turnover to get a safe credit range.")).toHaveCount(0);
  });

  test("the buyer withdraws from the same link: their data leaves the report at once", async ({ browser, baseURL }) => {
    const buyer = await buyerPage(browser, baseURL);
    await expect(buyer.getByText(/You said yes on/)).toBeVisible();
    await expect(buyer.getByRole("button", { name: "Withdraw consent" })).toBeDisabled();
    await buyerOtp(buyer);
    await buyer.getByRole("button", { name: "Withdraw consent" }).click();
    await buyer.getByRole("dialog").getByRole("button", { name: "Withdraw consent" }).click();
    await expect(buyer.getByText(/You withdrew your consent on/)).toBeVisible();
    await buyer.context().close();

    await page.goto(reportPath);
    await expect(page.getByText("Withdrawn", { exact: true })).toBeVisible();
    await expect(page.getByText(/Consent withdrawn\. The buyer took back their yes/).first()).toBeVisible();
    await expect(real(page.getByText(/^CIBIL CMR-\d$/))).toHaveCount(0);
  });

  test("a buyer who says no is not asked for OTP, and nothing is charged for those checks", async ({ browser, baseURL }) => {
    test.slow(); // several round trips to the Sydney database
    const dialog = await askBuyer(async () => {
      await page.getByRole("checkbox", { name: "CIBIL report" }).check();
      await page.getByRole("radio", { name: /^Personal/ }).check();
      await page.getByLabel("Their PAN").fill("ABCPS1234K");
      await page.getByLabel("Date of birth").fill("1980-05-12");
    });
    await sendAndGetLink(dialog);
    const buyer = await buyerPage(browser, baseURL);
    await expect(buyer.getByLabel("Owner's PAN")).toBeVisible();
    await buyer.getByRole("button", { name: "Decline" }).click();
    await buyer.getByRole("dialog").getByRole("button", { name: "Decline" }).click();
    await expect(buyer.getByText(/You said no on/)).toBeVisible();
    await buyer.context().close();
    await page.goto(reportPath);
    await expect(page.getByText("Said no", { exact: true })).toBeVisible();
    await expect(page.getByText(/The buyer said no\. Not charged\./).first()).toBeVisible();
  });

  test("after 72 hours the link expires; then the 3-in-7-days limit stops a fourth request", async ({ browser, baseURL }) => {
    test.slow(); // several round trips to the Sydney database
    const dialog = await askBuyer(() => page.getByRole("checkbox", { name: "CIBIL report" }).check());
    await expect(dialog.getByText(/said no on/)).toBeVisible(); // the "no" from the step above
    await sendAndGetLink(dialog);
    const tokenHash = crypto.createHash("sha256").update(consentLink.split("/c/")[1]).digest("hex");
    await db`update public.consent_requests set expires_at = now() - interval '1 minute' where token_hash = ${tokenHash}`;
    const buyer = await (await browser.newContext({ baseURL })).newPage();
    await buyer.goto(consentLink);
    await expect(buyer.getByText(/This request has expired/)).toBeVisible();
    await buyer.context().close();
    await page.goto(reportPath);
    await expect(page.getByText("No reply", { exact: true })).toBeVisible();
    await expect(page.getByText(/did not reply in 72 hours\. Not charged\./).first()).toBeVisible();

    const fourth = await askBuyer(() => page.getByRole("checkbox", { name: "CIBIL report" }).check());
    await expect(fourth.getByText(/You have sent 3 requests to .* in the last 7 days/)).toBeVisible();
    await expect(fourth.getByRole("button", { name: "Send request and run" })).toBeDisabled();
  });

  test("personal CIBIL for a director goes to that person's own mobile, who confirms their PAN and date of birth", async ({ browser, baseURL }) => {
    test.slow(); // several round trips to the Sydney database
    const dialog = await askBuyer(async () => {
      await page.getByRole("checkbox", { name: "CIBIL report" }).check();
      await page.getByRole("radio", { name: /^Personal/ }).check();
      await page.getByRole("checkbox", { name: /The buyer's contact/ }).uncheck();
      await page.getByLabel("Full name").fill("Ravi Director");
      await page.getByLabel("Their mobile").fill("9876500011");
      await page.getByLabel("Their PAN").fill("ABCPR1234K");
      await page.getByLabel("Date of birth").fill("1979-03-02");
    });
    await expect(dialog.getByText(/a yes by OTP from Ravi Director/)).toBeVisible();
    await sendAndGetLink(dialog);

    const person = await (await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } })).newPage();
    await person.goto(consentLink);
    await expect(person.getByRole("heading", { level: 1, name: /wants to check your personal credit report/ })).toBeVisible();
    await buyerOtp(person);
    await person.getByLabel("Your PAN").fill("ABCPR9999K");
    await person.getByLabel("Your date of birth").fill("1979-03-02");
    await person.getByRole("checkbox", { name: /I consent to share the data above/ }).check();
    await person.getByRole("button", { name: "Approve and continue" }).click();
    await expect(person.getByText(/does not match the details on the request/).first()).toBeVisible();
    await person.getByLabel("Your PAN").fill("ABCPR1234K");
    await person.getByRole("button", { name: "Approve and continue" }).click();
    await expect(person.getByText(/You said yes on/)).toBeVisible();
    await person.context().close();

    await page.goto(reportPath);
    await expect(page.getByText("Consent from Ravi Director (personal CIBIL)")).toBeVisible();
    await expect(page.getByText("Personal: Ravi Director")).toBeVisible();
  });

  test("one by one: each check shows its own cost, and Business identity fills in", async () => {
    test.slow(); // several round trips to the Sydney database
    await page.goto(buyerPath.replace("/counterparties/", "/checks/new?counterparty="));
    await expect(page.getByRole("heading", { name: "Choose a check" })).toBeVisible();
    await page.getByRole("button", { name: "Customise" }).click();
    for (const name of [/^GST search/, /^Company check/, /^Director details/]) await page.getByRole("checkbox", { name }).uncheck();
    await page.getByRole("checkbox", { name: /^PAN check/ }).check();
    await page.getByRole("checkbox", { name: /^MSME report/ }).check();
    await page.getByRole("radio", { name: "One by one" }).check();
    await page.locator("aside").getByRole("button", { name: /^Run search/ }).click();
    await expect(page).toHaveURL(/\/reports\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Ready to run").first()).toBeVisible();
    await page.getByRole("button", { name: /^Run (MSME report|PAN check)$/ }).first().click();
    // The cost shows inside the section, then a short cancel bar starts the check.
    await expect(page.getByText(/^Run (MSME report|PAN check)\?$/)).toBeVisible();
    await expect(page.getByText(/₹17\.70|₹223\.02/).first()).toBeVisible();
    await page.getByRole("button", { name: "Yes, run search" }).click();
    await expect(page.getByRole("heading", { name: "Business identity" })).toBeVisible();
    await expect(page.getByText(/^(MSME \(Udyam\)|PAN)$/).first()).toBeVisible();
  });

  // Part 8: Case Check (PRD v3.0 section 7, Figure 17).
  test("Case Check: the user picks checks, sees the cost, reviews ranked matches, and a confirmed case changes the risk", async () => {
    test.slow(); // several round trips to the Sydney database
    await page.goto(buyerPath.replace("/counterparties/", "/cases?counterparty="));
    await expect(page.getByRole("heading", { level: 1, name: "Case Check" })).toBeVisible();
    await expect(page.getByLabel(/^Name/)).toHaveValue(buyerName);
    await expect(page.getByRole("checkbox", { name: /^Court case history/ })).not.toBeChecked(); // nothing pre-ticked (FR-CC-01)
    await expect(page.getByText(/Covered states:/)).toBeVisible();
    await page.getByLabel(/^District/).fill("Bengaluru Urban");
    await page.getByRole("checkbox", { name: /^Court case history/ }).check();
    await page.getByRole("checkbox", { name: /^Money laundering check/ }).check();
    await page.locator("aside").getByRole("button", { name: /^Run search/ }).click();
    await expect(page).toHaveURL(/\/cases\/[0-9a-f-]{36}$/);

    const rows = page.locator("[data-match]"); // match cards (v2)
    await expect(rows).toHaveCount(3);
    await expect(rows.first().getByText("High")).toBeVisible();
    await expect(page.getByText(/No records found for the details given\. This does not prove there are none\. Charged/)).toBeVisible();
    await rows.first().getByRole("button", { name: "This is them" }).click();
    await expect(rows.first().getByRole("button", { name: "This is them" })).toHaveAttribute("aria-pressed", "true");

    // Only a confirmed match counts: the buyer's credit report now shows the case.
    await page.goto(reportPath);
    await expect(page.getByText(/1 pending cheque bounce or recovery case/)).toBeVisible();
    await page.goto(buyerPath);
    await expect(page.getByRole("tab", { name: /Cases\s*\(1\)/ })).toBeVisible();
  });

  // Part 9: Business Security (PRD v3.0 section 8, Figures 19 to 23).
  let txPath = "";
  let agreementLink = "";

  test("Business Security: the user drafts a seller agreement, previews it and sends it for acceptance", async () => {
    test.slow(); // several round trips to the Sydney database
    await page.goto(buyerPath.replace("/counterparties/", "/transactions/new?counterparty="));
    await expect(page.getByRole("heading", { level: 1, name: "New agreement" })).toBeVisible();
    await page.getByLabel(/^Invoice or GST bill no/).fill(`INV-E2E-${Date.now() % 100000}`);
    await page.getByLabel("Product, item 1", { exact: true }).fill("TMT bars 12 mm");
    await page.getByLabel("HSN, item 1", { exact: true }).fill("7214");
    await page.getByLabel("Quantity, item 1", { exact: true }).fill("20");
    await page.getByLabel("Unit, item 1", { exact: true }).fill("MT");
    await page.getByLabel("Price per unit, item 1", { exact: true }).fill("52000");
    await expect(page.getByLabel("Total (₹)")).toHaveValue("₹12,27,200"); // 20 × ₹52,000 + 18% GST, as in Figure 19
    await page.getByLabel(/^Amount paid now/).fill("200000");
    await page.getByRole("button", { name: "Preview agreement" }).click();
    await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]{36}\/review$/);
    txPath = new URL(page.url()).pathname.replace(/\/review$/, "");
    await expect(page.getByRole("button", { name: /Send for acceptance/ })).toBeDisabled();
    await page.getByLabel(/I confirm the details are correct/).check();
    await page.getByRole("button", { name: /Send for acceptance/ }).click();
    await expect(page).toHaveURL(new RegExp(`${txPath}$`));
    await expect(page.getByText("Sent", { exact: true }).first()).toBeVisible();
    await page.goto("/dev/outbox");
    agreementLink = (await page.locator('a[href*="/a/"]').first().getAttribute("href")) ?? "";
    expect(agreementLink).toMatch(/\/a\/[A-Za-z0-9_-]+$/);
  });

  test("the counterparty asks for changes; the user edits and sends version 2 free; the counterparty accepts by OTP", async ({ browser, baseURL }) => {
    test.slow();
    const cp = await (await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } })).newPage();
    await cp.goto(agreementLink);
    await expect(cp.getByRole("heading", { level: 1, name: /has shared a supply on credit agreement/ })).toBeVisible();
    await expect(cp.getByText("₹10,27,200").first()).toBeVisible(); // balance after the ₹2,00,000 paid now
    await cp.getByRole("button", { name: "Request changes" }).click();
    await cp.getByRole("dialog").getByLabel("Your comment").fill("Please make the due date 45 days, not 30.");
    await cp.getByRole("dialog").getByRole("button", { name: "Send request" }).click();
    await expect(cp.getByText(/You asked .* for changes/)).toBeVisible();

    await page.goto(txPath);
    await expect(page.getByText(/Changes asked:/)).toBeVisible();
    await page.goto(`${txPath}/edit`);
    await page.getByRole("button", { name: "Preview agreement" }).click();
    await expect(page).toHaveURL(/\/review$/);
    await expect(page.getByText(/Sending costs nothing/)).toBeVisible(); // resending after a change request is free
    await page.getByLabel(/I confirm the details are correct/).check();
    await page.getByRole("button", { name: "Send again" }).click();
    await expect(page.getByText("Version 2", { exact: false }).first()).toBeVisible();
    await page.goto("/dev/outbox"); // version 2 has its own link
    agreementLink = (await page.locator('a[href*="/a/"]').first().getAttribute("href")) ?? "";

    await cp.goto(agreementLink);
    await expect(cp.getByText(/Version 2/)).toBeVisible();
    await cp.getByRole("button", { name: "Send OTP" }).click();
    await cp.getByLabel("OTP digit 1").click();
    await cp.keyboard.type("111111");
    await cp.getByLabel(/I have received the goods/).check();
    await cp.getByRole("button", { name: "I Accept" }).click();
    await expect(cp.getByText(/The OTP is incorrect/)).toBeVisible();
    await cp.getByLabel("OTP digit 1").click();
    await cp.keyboard.type(OTP);
    await cp.getByRole("button", { name: "I Accept" }).click();
    await expect(cp.getByText(/You accepted this agreement/)).toBeVisible();
    await expect(cp.getByRole("link", { name: /Download sealed agreement/ })).toBeVisible();
    await cp.context().close();
  });

  test("the sealed agreement verifies; a changed file does not; payments go to interest first and close the deal", async () => {
    test.slow();
    await page.goto(txPath);
    await expect(page.getByText("SHA-256")).toBeVisible();
    const reference = (await page.getByText(/^CHB-TX-\d{6} ·/).first().innerText()).slice(0, 13);
    const pdf = await (await page.request.get(`/api/v1${txPath}/pdf`)).body();
    await page.goto(`/v/${reference}`);
    await page.locator("#pdf").setInputFiles({ name: "sealed.pdf", mimeType: "application/pdf", buffer: pdf });
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByText("Authentic and unchanged.")).toBeVisible();
    const changed = Buffer.from(pdf);
    changed[changed.length - 20] ^= 1;
    await page.locator("#pdf").setInputFiles({ name: "changed.pdf", mimeType: "application/pdf", buffer: changed });
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByText(/Does not match/)).toBeVisible();

    await page.goto(txPath);
    await expect(page.getByText("Active", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Record payment received" }).click();
    await page.getByRole("dialog").getByLabel(/^Amount/).fill("27200");
    await page.getByRole("dialog").getByRole("button", { name: "Save payment" }).click();
    await expect(page.getByText("Partly paid", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Mark fully paid" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Mark fully paid" }).click();
    await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible();
    await page.goto(buyerPath);
    await expect(page.getByRole("tab", { name: /Agreements\s*\(1\)/ })).toBeVisible();

    // FR-BS-09: the evidence pack is a ZIP once sealed.
    const pack = await page.request.get(`/api/v1${txPath}/evidence`);
    expect(pack.status()).toBe(200);
    expect((await pack.body()).readUInt32LE(0)).toBe(0x04034b50);
  });

  // Part 9b: E-Settlement (PRD v3.0 8.7; v1.0 S17).
  test("E-Settlement: an overdue agreement is settled in instalments after a counter-proposal, and the first instalment is paid", async ({ browser, baseURL }) => {
    test.slow();
    test.setTimeout(360_000); // the whole settlement flow; the Sydney database is slow at times
    const day = (n: number) => new Date(Date.now() + 5.5 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
    const latest = async (kind: string) => {
      await page.goto("/dev/outbox");
      return (await page.locator(`a[href*="/${kind}/"]`).first().getAttribute("href")) ?? "";
    };
    // An agreement whose due date has passed.
    await page.goto(buyerPath.replace("/counterparties/", "/transactions/new?counterparty="));
    await page.getByLabel(/^Invoice or GST bill no/).fill(`INV-ST-${Date.now() % 100000}`);
    await page.locator("#tx-date").fill(day(-40));
    await page.locator("#tx-due").fill(day(-10));
    await page.getByLabel("Product, item 1", { exact: true }).fill("TMT bars 12 mm");
    await page.getByLabel("Quantity, item 1", { exact: true }).fill("2");
    await page.getByLabel("Unit, item 1", { exact: true }).fill("MT");
    await page.getByLabel("Price per unit, item 1", { exact: true }).fill("50000");
    await page.getByRole("button", { name: "Preview agreement" }).click();
    await expect(page).toHaveURL(/\/review$/);
    const overduePath = new URL(page.url()).pathname.replace(/\/review$/, "");
    await page.getByLabel(/I confirm the details are correct/).check();
    await page.getByRole("button", { name: /Send for acceptance/ }).click();
    await expect(page).toHaveURL(new RegExp(`${overduePath}$`));
    const buyer = await (await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } })).newPage();
    await buyer.goto(await latest("a"));
    await buyer.getByRole("button", { name: "Send OTP" }).click();
    await buyer.getByLabel("OTP digit 1").click();
    await buyer.keyboard.type(OTP);
    await buyer.getByLabel(/I have received the goods/).check();
    await buyer.getByRole("button", { name: "I Accept" }).click();
    await expect(buyer.getByText(/You accepted this agreement/)).toBeVisible();

    // S17 from the overdue agreement.
    await page.goto(overduePath);
    await expect(page.getByText("Overdue", { exact: true }).first()).toBeVisible();
    await page.getByRole("link", { name: "Start E-Settlement" }).click();
    await expect(page).toHaveURL(/\/settlements\/new\?transaction=/);
    await expect(page.getByText("Interest to today")).toBeVisible();
    await page.locator("#st-amount").fill("100000");
    await page.locator("#st-interest").fill("1500");
    await page.getByRole("button", { name: "Split equally" }).click();
    await expect(page.getByText("Adds up to ₹1,01,500")).toBeVisible();
    await page.getByRole("button", { name: "Preview and send" }).click();
    await expect(page).toHaveURL(/\/settlements\/[0-9a-f-]{36}\/review$/);
    const stPath = new URL(page.url()).pathname.replace(/\/review$/, "");
    await page.getByLabel(/I confirm the debtor has agreed/).check();
    await page.getByRole("button", { name: /Send for acceptance/ }).click();
    await expect(page).toHaveURL(new RegExp(`${stPath}$`));

    // The debtor proposes four instalments of a smaller total.
    await buyer.goto(await latest("s"));
    await expect(buyer.getByRole("heading", { level: 1, name: /has offered you a settlement/ })).toBeVisible();
    await buyer.getByRole("button", { name: "Propose other terms" }).click();
    const dlg = buyer.getByRole("dialog");
    await dlg.getByLabel(/^Total you can pay/).fill("96000");
    await dlg.getByLabel("Instalments", { exact: true }).selectOption("4");
    await dlg.getByRole("button", { name: "Split equally" }).click();
    await dlg.getByRole("button", { name: "Send proposal" }).click();
    await expect(buyer.getByText(/You sent other terms/)).toBeVisible();

    // The creditor accepts the proposal; it goes back for OTP acceptance, free.
    await page.goto(stPath);
    await expect(page.getByText("Their proposal", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Accept proposal" }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Accept proposal" }).click();
    await expect(page.getByText("Their proposal was sent back for acceptance.")).toBeVisible({ timeout: 60_000 });
    await buyer.goto(await latest("s"));
    await expect(buyer.getByText("4 instalments")).toBeVisible();
    await buyer.getByRole("button", { name: "Send OTP" }).click();
    await buyer.getByLabel("OTP digit 1").click();
    await buyer.keyboard.type(OTP);
    await buyer.getByLabel(/I agree to pay/).check();
    await buyer.getByRole("button", { name: "I Accept" }).click();
    await expect(buyer.getByText(/You accepted this settlement/)).toBeVisible();
    await buyer.context().close();

    // Sealed, running, the original is Settled; the first instalment is paid.
    await page.goto(stPath);
    await expect(page.getByText("SHA-256")).toBeVisible();
    await page.getByRole("button", { name: "Record payment received" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Save payment" }).click();
    await expect(page.getByText(/^Paid ·/).first()).toBeVisible();
    const zip = await page.request.get(`/api/v1${stPath}/evidence`);
    expect((await zip.body()).readUInt32LE(0)).toBe(0x04034b50);
    await page.goto(overduePath);
    await expect(page.getByText("Settled by E-Settlement").first()).toBeVisible();
  });

  test("the list finds the buyer by name and by full mobile, and masks the mobile", async () => {
    await page.goto("/counterparties");
    const search = page.getByLabel("Search counterparties");
    await search.fill(buyerName.slice(0, 6));
    await expect(page.getByRole("link", { name: buyerName })).toBeVisible();
    await search.fill(buyerMobile);
    await expect(page.getByRole("link", { name: buyerName })).toBeVisible();
    await expect(page.getByText(`${buyerMobile.slice(0, 2)}••••${buyerMobile.slice(-4)}`)).toBeVisible();
    await search.fill("zzzz no such buyer");
    await expect(page.getByText("No counterparties match your search")).toBeVisible();
  });
});

test("someone else cannot register the same GSTIN and can ask for access instead", async ({ page }) => {
  await signIn(page, OTHER);
  await expect(page).toHaveURL(/\/signup\/business/);
  await page.getByLabel("GSTIN").fill(firstGstin);
  await page.getByRole("button", { name: "Fetch details" }).click();
  await expect(page.getByText("This business already has an account. Ask its Owner to invite you.")).toBeVisible();
  await page.getByLabel("Your name").fill("Vikram Sales");
  await page.getByRole("button", { name: "Request access" }).click();
  await expect(page.getByText(/Request sent/)).toBeVisible();
});

test("a cancelled GSTIN goes to manual review with a document", async ({ page }) => {
  await signIn(page, OTHER);
  await page.getByLabel("GSTIN").fill(gstinWith("9"));
  await page.getByRole("button", { name: "Fetch details" }).click();
  await expect(page.getByText(/This GSTIN is Cancelled/)).toBeVisible();
  await page.locator("#file").setInputFiles({ name: "gst-certificate.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test certificate") });
  await expect(page.getByText("Uploaded: gst-certificate.pdf")).toBeVisible();
  await profileAndCreate(page, "Vikram Sales", "vikram@agencies.in", /Submit for review/);
  await expect(page.getByText(/We are reviewing/)).toBeVisible();
});

test("the Owner sees the access request, changes a role and deactivates the Member", async ({ page }) => {
  await resetOtpLimits(OWNER);
  await signIn(page, OWNER);
  await page.goto("/account/team");
  await expect(page.getByText("Access requests")).toBeVisible();
  await expect(page.getByText("Vikram Sales")).toBeVisible();
  await page.getByLabel("Change role for Anita Member").selectOption("viewer");
  await expect(page.getByText("Role changed")).toBeVisible();
  await page.getByRole("row", { name: /Anita Member/ }).getByRole("button", { name: "Deactivate" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Deactivate" }).click();
  await expect(page.getByText("User deactivated")).toBeVisible();
  await signOut(page);
});

test("a deactivated user is told their access was removed", async ({ page }) => {
  await signIn(page, MEMBER, undefined, { staysOnLogin: true });
  await expect(page.getByText(new RegExp(`Your access to .* has been removed`))).toBeVisible();
});

test("signed out, app pages go back to sign-in", async ({ page }) => {
  await page.goto("/account/team");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Fteam/);
});
