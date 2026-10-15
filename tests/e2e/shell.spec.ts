import { expect, test } from "@playwright/test";
import { SCREENS } from "../../src/lib/screens";

// Every route in PRD 6.2 loads, shows its heading, has no horizontal scroll and logs no console errors.
for (const s of SCREENS) {
  test(`${s.id} ${s.sample} renders`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));

    const res = await page.goto(s.sample);
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(`Screen ${s.id}`)).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

test("the sidebar marks the current page and navigates", async ({ page, isMobile }) => {
  await page.goto("/dashboard");
  if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
  const nav = page.getByRole("navigation", { name: "Main navigation" }).last();
  await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Counterparties" }).click();
  await expect(page).toHaveURL(/\/counterparties$/);
  await expect(page.getByRole("heading", { level: 1, name: "Counterparties" })).toBeVisible();
  if (isMobile) await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
});

test("API errors carry a support reference", async ({ request }) => {
  const res = await request.get("/api/v1/me");
  expect(res.status()).toBe(401);
  const body = await res.json();
  expect(body.error.code).toBe("unauthenticated");
  expect(body.error.reference).toMatch(/^CB-[A-Z0-9]{10}$/);
  expect(res.headers()["x-request-id"]).toBe(body.error.reference);
});
