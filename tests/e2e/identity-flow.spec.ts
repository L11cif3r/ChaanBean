import crypto from "node:crypto";
import { expect as baseExpect, test, type Page } from "@playwright/test";

// Each step makes several round trips to the Sydney development database, so allow up to 30 s per assertion.
const expect = baseExpect.configure({ timeout: 30_000 });
import postgres from "postgres";
import { gstinChecksumChar } from "../../src/lib/validators";

// Part 2 end to end with Supabase test phone numbers (fixed OTP 123456; no message is sent):
// sign-up → business verification → Plan B through the mock gateway (Part 3) → dashboard → wallet top-up → invite →
// accept as a second user → counterparties (Part 4: add by GSTIN, duplicates, edit, archive, search) → Credit Worthiness
// (Part 5) → buyer consent: approve, withdraw, decline, expiry and the request limit (Part 7) → roles →
// deactivate → removed, plus the cancelled-GSTIN (manual review) and duplicate-GSTIN paths.
// Needs: Phone provider + test numbers 919000000001..3 enabled in Supabase (see docs/PARTS.md, Part 2).

const OWNER = "9000000001";
const MEMBER = "9000000002";
const OTHER = "9000000003";
const OTP = "123456";

const gstinWith = (entity: string) => {
  const base = `29AAPFQ${String(1000 + Math.floor(Math.random() * 9000))}F${entity}Z`;
  return base + gstinChecksumChar(base);
};

test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "Runs once at desktop size; layouts are covered by shell.spec.ts");

let db: ReturnType<typeof postgres>;

test.beforeAll(async ({ request }) => {
  const probe = await request.post("/api/v1/auth/otp/send", { data: { mobile: OTHER } });
  test.skip(probe.status() === 503, "Phone sign-in is not enabled in Supabase yet");

  const url = new URL(process.env.DIRECT_URL!);
  db = postgres(url.toString(), { ssl: "require", max: 2, onnotice: () => undefined });
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
  await expect(page.getByRole("heading", { level: 1, name: "Welcome, Rakesh" })).toBeVisible();
  await expect(page.getByText("Plan B: 450 units left")).toBeVisible();
  await expect(page.getByText(orgName).first()).toBeVisible();
});

test("the Owner tops up the wallet; a failed payment changes nothing and the ledger and invoices show the rest", async ({ page }) => {
  test.slow(); // three trips through the mock gateway
  await signIn(page, OWNER);
  await page.goto("/account/billing");
  await expect(page.getByRole("heading", { level: 1, name: "Plan, usage and wallet" })).toBeVisible();
  await expect(page.getByText("450 plan units left · 5 users")).toBeVisible();

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
  test("the Owner runs Credit Worthiness: sees the cost, confirms, and gets one report", async () => {
    await page.goto(`${buyerPath.replace("/counterparties/", "/checks/new?counterparty=")}`);
    await expect(page.getByText("This search will cost")).toBeVisible();
    await page.getByRole("checkbox", { name: /Credit rating/ }).check();
    await page.getByRole("button", { name: "Continue" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Confirm your search")).toBeVisible();
    await expect(dialog.getByText(/3 units from plan · ₹223\.02 from wallet/)).toBeVisible();
    await dialog.getByRole("button", { name: "Yes, run search" }).click();
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
    await expect(page.getByText("This search will cost")).toBeVisible();
    await choose();
    await page.getByRole("button", { name: "Continue" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Ask the buyer to say yes")).toBeVisible();
    return dialog;
  }

  async function sendAndGetLink(dialog: ReturnType<Page["getByRole"]>) {
    await dialog.getByRole("button", { name: "Yes, run search" }).click();
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
    await expect(page.getByText(/^CIBIL CMR-\d$/)).toBeVisible();
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
    await expect(page.getByText(/^CIBIL CMR-\d$/)).toHaveCount(0);
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
    await expect(fourth.getByRole("button", { name: "Yes, run search" })).toBeDisabled();
    await fourth.getByRole("button", { name: "Cancel" }).click();
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

  test("one by one: each check has its own cost popup, and Business identity fills in", async () => {
    test.slow(); // several round trips to the Sydney database
    await page.goto(buyerPath.replace("/counterparties/", "/checks/new?counterparty="));
    await expect(page.getByText("This search will cost")).toBeVisible();
    for (const name of [/^GST search/, /^Company check/, /^Director details/]) await page.getByRole("checkbox", { name }).uncheck();
    await page.getByRole("checkbox", { name: /^PAN check/ }).check();
    await page.getByRole("checkbox", { name: /^MSME report/ }).check();
    await page.getByRole("button", { name: "Continue" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("radio", { name: "I will run each one myself" }).check();
    await expect(dialog.getByText("Will be deducted as you run each one")).toBeVisible();
    await dialog.getByRole("button", { name: "Yes, run search" }).click();
    await expect(page).toHaveURL(/\/reports\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Ready to run").first()).toBeVisible();
    await page.getByRole("button", { name: "Run this check" }).first().click();
    const one = page.getByRole("dialog");
    await expect(one.getByText(/^Run (MSME report|PAN check)\?$/)).toBeVisible();
    await expect(one.getByText(/1 unit from plan · ₹0 from wallet/)).toBeVisible();
    await one.getByRole("button", { name: "Yes, run search" }).click();
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
    await page.getByRole("button", { name: "Continue" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Confirm your search")).toBeVisible();
    await dialog.getByRole("button", { name: "Yes, run search" }).click();
    await expect(page).toHaveURL(/\/cases\/[0-9a-f-]{36}$/);

    const rows = page.locator("tbody tr");
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
