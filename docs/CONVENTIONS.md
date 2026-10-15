# Conventions

Rules every part follows. If a change needs to break one, write down why in the pull request.

## Data

- **Money is integer paise** (`bigint` in TypeScript, `bigint` columns in SQL). Never floats. Format with
  `src/lib/money.ts` (`₹15,13,360`, `₹1.84 Cr`).
- **Business dates are IST calendar dates** as `YYYY-MM-DD` strings (`src/lib/dates.ts`); timestamps are stored in UTC
  (`timestamptz`). Show dates as DD MMM YYYY and times in IST.
- **Every tenant table has `org_id`** and row-level security with at least a read policy for members
  (`org_id IN (SELECT app_private.user_org_ids())`). Writes go through the server or Postgres functions.
- **Personal data is encrypted at field level**: PAN, mobile, email, address, Aadhaar last 4 (PRD section 15). Store
  `<field>_ciphertext` (from `encryptField(value, "<table>.<field>")`) and `<field>_hash` (from
  `blindIndex(normalised, "<field>")`) when the field is searched. Encrypted fields can only be found by exact match.
- **Validate identifiers** with `src/lib/validators.ts` in both the form and the API.
- **Migrations** are SQL in `supabase/migrations/`, applied with the Supabase connector, then the file is renamed to
  the recorded version and types are regenerated. Run the connector's security advisors after every change.

## Code

- **No provider calls outside the adapter layer** (`src/server/providers/`, from Part 5). Screens and business logic
  never call a provider directly (PRD 12.1).
- **Every API route uses `route()`** from `src/server/http.ts` and declares its capability. Errors are `AppError`s with
  plain, user-facing messages; anything else becomes a 500 with a support reference.
- **Every state change is audited** with `audit()`, or inside the same Postgres function when the change is made there.
- **Never log OTPs, full PAN or full mobile numbers.** Use `redact()` / `redactText()` from `src/lib/mask.ts` on
  anything that might contain them.
- **All UI strings live in `messages/en.json`** (NFR-10). Server components use `getTranslations`, client components
  `useTranslations`.
- **Reads of cookies, headers, search params or the path go inside `<Suspense>`** (Cache Components).
- Buttons default to `type="button"`; destructive actions use `ConfirmDialog`.

## Tests

- Business logic gets unit tests (`tests/unit`, target 70% coverage per NFR-11).
- Anything relying on the database (row-level security, functions, triggers) gets a database test (`tests/db`).
  Database tests create `ZZ TEST …` data and remove it afterwards (audit rows stay: the log is append-only).
- Each Must flow gets a Playwright test (`tests/e2e`) at 360 px and desktop widths.
