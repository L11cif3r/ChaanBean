import { expect, test } from "@playwright/test";
import { SCREENS } from "../../src/lib/screens";

// Signed out: public pages render; every signed-in page sends the visitor to /login and back afterwards.
const BUILT = new Set(["S01", "S02", "S18", "S04", "S10", "S15", "S21", "S22"]);
const PROTECTED_AREAS = new Set(["app"]);

for (const s of SCREENS) {
  const protectedPage = PROTECTED_AREAS.has(s.area) || s.path.startsWith("/signup");
  test(`${s.id} ${s.sample} ${protectedPage ? "requires sign-in" : "renders"}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && !m.text().includes("401") && errors.push(m.text()));

    const res = await page.goto(s.sample);
    expect(res?.status()).toBeLessThan(400);
    if (protectedPage) {
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(s.sample).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
      await expect(page.getByRole("heading", { level: 1, name: "Sign in to Chaanbean" })).toBeVisible();
    } else {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (!BUILT.has(s.id)) await expect(page.getByText(`Screen ${s.id}`)).toBeVisible();
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

test("the sign-in form needs a valid mobile before sending", async ({ page }) => {
  await page.goto("/login");
  const send = page.getByRole("button", { name: "Send OTP" });
  await expect(send).toBeDisabled();
  await page.getByLabel("Mobile number").fill("12345");
  await expect(send).toBeDisabled();
  await page.getByLabel("Mobile number").fill("98765 43210");
  await expect(send).toBeEnabled();
});

test("API errors carry a support reference", async ({ request }) => {
  const res = await request.get("/api/v1/me");
  expect(res.status()).toBe(401);
  const body = await res.json();
  expect(body.error.code).toBe("unauthenticated");
  expect(body.error.reference).toMatch(/^CB-[A-Z0-9]{10}$/);
  expect(res.headers()["x-request-id"]).toBe(body.error.reference);
});
