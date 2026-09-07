# Screen walkthrough

Every screen in the app, in the order you meet it. Captured from the `live` flavor on an
API 36 emulator talking to `main`'s Next.js server, so the figures are real seeded data
rather than mockups.

---

## 1. Opening and sign-in

The app opens on the client portal. `main` enforces an intro-to-login flow on launch
(commit `3d842f2`); this client honours it only on a first run, so a returning user lands
on Home instead.

| Client sign-in | Intro | Create account |
|---|---|---|
| ![](screenshots/01-login-client-signin.png) | ![](screenshots/02-intro.png) | ![](screenshots/03-login-client-register.png) |

The note at the bottom of the sign-in screen is deliberate. `/api/auth` checks no
credential, so the UI says so rather than implying a login happened.

| Admin desk — sign in | Admin desk — register |
|---|---|
| ![](screenshots/04-login-admin-signin.png) | ![](screenshots/05-login-admin-register.png) |

---

## 2. Home dashboard

| Overview | Risk mix | Recent activity |
|---|---|---|
| ![](screenshots/06-dashboard-home.png) | ![](screenshots/07-dashboard-risk-mix.png) | ![](screenshots/08-dashboard-pipeline.png) |

Wallet balance reads "Not exposed" because no endpoint returns it — `main` emits it once,
inside the login response. The gateway card marks `verificationGateway`, `policyEngine`,
`riskScoringEngine` and `voiceSystem` as hardcoded literals rather than probes, because
that is what `/api/health` actually returns.

---

## 3. Navigation

| Drawer — top | Drawer — admin and account |
|---|---|
| ![](screenshots/09-drawer-top.png) | ![](screenshots/10-drawer-lower.png) |

---

## 4. Legal help — every tab

`main` renders its SupportDrawer on every page through `AppShell`; the same content sits
behind the help icon in the top bar here.

| MSME §16 | TRAI rules | Ask legal |
|---|---|---|
| ![](screenshots/11-support-msme16.png) | ![](screenshots/12-support-trai.png) | ![](screenshots/13-support-ask-legal.png) |

The inquiry form is inert on purpose: `main` has no endpoint behind it, and its handler
only flips a local flag, so this copy says so instead of implying a ticket was filed.

---

## 5. Business Check

The deepest module — verification, financial intelligence and the Green/Amber/Red flag.

| List | Filtered by flag |
|---|---|
| ![](screenshots/14-business-check-list.png) | ![](screenshots/15-business-check-list-scrolled.png) |

| Profile | Risk and credit |
|---|---|
| ![](screenshots/47-business-detail.png) | ![](screenshots/48-business-detail-2.png) |

MCA, GST, Udyam and eCourts records are marked `USER_PROVIDED` and tinted amber, never
green: in `main` an operator reads the government portal and types in what they saw. The
provenance is a product feature, not a defect to hide.

---

## 6. Debtors

| Portfolio | Ageing | Debtor profile | Escalation history |
|---|---|---|---|
| ![](screenshots/16-debtors-list.png) | ![](screenshots/17-debtors-ageing.png) | ![](screenshots/51-debtor-detail.png) | ![](screenshots/52-debtor-detail-2.png) |

---

## 7. Payment recovery

| Worklist | By ageing |
|---|---|
| ![](screenshots/18-recovery-worklist.png) | ![](screenshots/19-recovery-worklist-ageing.png) |

| Escalation ladder | Policy rules | Statutory interest |
|---|---|---|
| ![](screenshots/29-recovery-escalation.png) | ![](screenshots/30-recovery-escalation-2.png) | ![](screenshots/31-recovery-escalation-3.png) |

Two warnings on these screens are load-bearing. Every action posts immediately with no
confirmation and no undo. And "Place L2 voice announcement" dials nobody — the server
derives call outcome, duration and SIP session id from a digit sum of the phone number,
then writes a `Call` row as if it had happened, skipping the TRAI calling-window and
frequency-cap checks that the policy tick applies.

---

## 8. Arbitration

![](screenshots/20-arbitration-cases.png)

The MSMED §16 engine: RBI bank rate, the statutory 3× multiplier, and compound interest
with monthly rests. The rate is a constant in the server's calculator — nothing reads a
live RBI notification — and the screen states that.

---

## 9. Trust Hub

| Verify a Trust ID | Register | Community defaults |
|---|---|---|
| ![](screenshots/22-trusthub-verify.png) | ![](screenshots/23-trusthub-register.png) | ![](screenshots/24-trusthub-defaults.png) |

`/api/trust-hub/verify` synthesises PAN, GSTIN and CIN from a hash of the company name.
Those are labelled for what they are rather than presented as verified records.

---

## 10. Vendors

| Trust registry | Onboarding |
|---|---|
| ![](screenshots/25-vendors-registry.png) | ![](screenshots/53-vendors-onboard-sheet.png) |

---

## 11. Background check

| Run a check | Adapter status |
|---|---|
| ![](screenshots/26-background-check.png) | ![](screenshots/27-background-check-adapters.png) |

The OTP endpoint declares an `otp` parameter and never reads it, so any code is accepted.
The screen does not claim the code was validated.

---

## 12. Search

![](screenshots/28-search.png)

---

## 13. Settings

| Settings | Session and build | Diagnostics |
|---|---|---|
| ![](screenshots/32-settings.png) | ![](screenshots/33-settings-2.png) | ![](screenshots/46-settings-diagnostics.png) |

| Language and appearance | Applied labels |
|---|---|
| ![](screenshots/34-language-and-appearance.png) | ![](screenshots/35-language-appearance-2.png) |

Four languages, ported verbatim from `main`'s `translations.ts`. `main` declares seven
language codes but ships strings for only four, so the other three are not offered.

---

## 14. Admin console

| Overview | Metrics |
|---|---|
| ![](screenshots/36-admin-overview.png) | ![](screenshots/37-admin-overview-2.png) |

| Customers | Health scoring |
|---|---|
| ![](screenshots/38-admin-customers.png) | ![](screenshots/39-admin-customers-2.png) |

Health is recomputed per request from activity, wallet balance and report consumption; the
stored `Company.healthScore` column is ignored, so the labels can disagree with the
database. The screen says so.

| Financials | Revenue by module |
|---|---|
| ![](screenshots/40-admin-financials.png) | ![](screenshots/41-admin-financials-2.png) |

| Sales pipeline | Marketing | Attribution |
|---|---|---|
| ![](screenshots/42-admin-pipeline.png) | ![](screenshots/44-admin-marketing.png) | ![](screenshots/45-admin-marketing-2.png) |
