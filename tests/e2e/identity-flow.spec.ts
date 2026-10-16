import crypto from "node:crypto";
import { expect as baseExpect, test, type Page } from "@playwright/test";

// Each step makes several round trips to the Sydney development database, so allow up to 30 s per assertion.
const expect = baseExpect.configure({ timeout: 30_000 });
import postgres from "postgres";
import { gstinChecksumChar } from "../../src/lib/validators";

// Part 2 end to end with Supabase test phone numbers (fixed OTP 123456; no message is sent):
// sign-up → business verification → Plan B through the mock gateway (Part 3) → dashboard → wallet top-up → invite →
// accept as a second user → roles → deactivate → removed, plus the cancelled-GSTIN (manual review) and duplicate-GSTIN
// paths.
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
  const key = Buffer.from(process.env.BLIND_INDEX_KEY!, "base64");
  const hashes = [OWNER, MEMBER, OTHER].map((m) => crypto.createHmac("sha256", key).update(`mobile:${m}`).digest("hex"));
  await db`delete from app_private.otp_events where phone_hash in ${db(hashes)}`;
});

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
  await expect(page.getByText("Plan B: 546 units left")).toBeVisible();
  await expect(page.getByText(orgName).first()).toBeVisible();
});

test("the Owner tops up the wallet; a failed payment changes nothing and the ledger and invoices show the rest", async ({ page }) => {
  test.slow(); // three trips through the mock gateway
  await signIn(page, OWNER);
  await page.goto("/account/billing");
  await expect(page.getByRole("heading", { level: 1, name: "Plan, usage and wallet" })).toBeVisible();
  await expect(page.getByText("546 plan units left · 5 users")).toBeVisible();

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
