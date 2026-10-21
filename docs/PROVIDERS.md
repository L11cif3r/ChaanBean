# Outside services: dummies now, real providers later

Every outside service the portal calls has a **dummy** ("mock") that works without keys, so the whole portal can be
built and tested before contracts are signed. A real provider plugs in behind the same interface and is switched on
with one environment variable. Screens, the check engine, billing and reports never change when a provider does.

The single list of services, the providers PRD v3.0 section 17 names for each, and the keys each needs is
[`src/server/providers/registry.ts`](../src/server/providers/registry.ts).

## Switching a service

One variable per service or item code, `PROVIDER_<SERVICE>`. Unset means the dummy.

```bash
PROVIDER_CW_GST_SEARCH=surepass          # Surepass for GST search
PROVIDER_CW_MSME=zoop,surepass           # Zoop first; Surepass when Zoop fails (v3 FR-CW-07 fallback)
PROVIDER_SMS=exotel
PROVIDER_WHATSAPP=exotel
PROVIDER_OTP=exotel
PROVIDER_EMAIL=ses                       # or zeptomail
PROVIDER_STORAGE=s3                      # write-once store for sealed PDFs (or gcs)
PROVIDER_PAYMENTS=razorpay
```

- A name the service does not know stops the server with a clear message (no silent fallback to the dummy).
- A real provider whose keys are missing answers "not connected" and names the missing keys; checks show
  "Not available from source. Not charged." and the next provider in the chain is tried.
- `GET /api/health` lists which provider each service uses and which keys are missing (names only, never values).

| Service (variable suffix) | Dummy behaviour | Real providers (primary first) | Keys |
| --- | --- | --- | --- |
| `IDENTITY` (sign-up GST search, company search by GSTIN, PAN) | GSTIN 13th character 9/8/7/6 = cancelled/suspended/not found/down | apisetu (written), surepass | GSTN_CLIENT_ID, GSTN_API_KEY / SUREPASS_API_TOKEN |
| `UPI` (bank-linked mobile) | mobile ending 0 not linked, 9 unavailable | surepass, razorpay | SUREPASS_API_TOKEN / RAZORPAY_* |
| `CW_GST_SEARCH` | sample GST profile and 12 months of filings | apisetu (written), surepass, setu | GSTN_* / SUREPASS_API_TOKEN |
| `CW_GST_TURNOVER_CY`, `CW_GST_TURNOVER_4Y` | turnover by year and month; needs the buyer's consent | finagg, vayana | GSP_CLIENT_ID, GSP_CLIENT_SECRET, GSP_ASP_ID |
| `GSP` (buyer's GST portal OTP) | username with "noapi" = API access off; OTP 123456 | finagg, vayana | as above |
| `CW_CIBIL_COMPANY`, `CW_CIBIL_PERSONAL` | rank/score; GSTIN or PAN ending Y = 95 days overdue, X = 45 | cibil, crif, experian | BUREAU_API_KEY, BUREAU_API_SECRET |
| `CW_MSME` | Udyam profile | zoop, surepass, gridlines | ZOOP_APP_ID, ZOOP_API_KEY |
| `CW_PAN` | PAN valid | surepass, cashfree | SUREPASS_API_TOKEN |
| `CW_IEC_PROFILE`, `CW_IEC_TURNOVER` | IEC profile; trade by year | surepass / volza | SUREPASS_API_TOKEN / VOLZA_API_KEY |
| `CW_COMPANY` | MCA profile; CIN ending 999999 struck off | mca (written: MCA open data), probe42 | DATA_GOV_IN_API_KEY / PROBE42_API_KEY |
| `CW_DIRECTORS`, `CW_CREDIT_RATING` | directors; ratings | probe42 | PROBE42_API_KEY |
| `CC_COURT` | three ranked cases; name with CLEAN / COMMON / DOWN | surepass, legalkart | SUREPASS_API_TOKEN |
| `CC_FIR` | covered states only | authbridge, idfy | FIR_PROVIDER_API_KEY |
| `CC_AML` | name with SANCTION or PEP = list hit | signzy, hyperverge | SIGNZY_API_KEY |
| `OTP`, `SMS` | no message sent; OTP 123456; messages in /dev/outbox | fast2sms (written, DLT route), exotel | FAST2SMS_API_KEY, FAST2SMS_SENDER_ID, FAST2SMS_DLT_TEMPLATE_ID / EXOTEL_* |
| `WHATSAPP` | messages in /dev/outbox | exotel | EXOTEL_* |
| `GST_CERTIFICATE` (own GST certificate) | OTP 123456, sample PDF | apisetu (written; needs the encryption scheme) | GSTN_CLIENT_ID, GSTN_API_KEY, GSTN_RC_BASE_URL, GSTN_ENCRYPTION_* |
| `KYC` (person signing up, v4 11.2) | test DigiLocker page at /account/kyc/test, made-up masked document | digilocker (slot) | DIGILOCKER_CLIENT_ID, DIGILOCKER_CLIENT_SECRET, DIGILOCKER_REDIRECT_URI |
| `EMAIL` | messages in /dev/outbox | ses, zeptomail | SES_FROM_EMAIL, AWS_REGION / ZEPTOMAIL_TOKEN, ZEPTOMAIL_FROM_EMAIL |
| `PAYMENTS` | /dev/pay test checkout with a signed webhook | razorpay, cashfree | RAZORPAY_* |
| `STORAGE` (sealed PDFs) | write-once table in the database | s3 (Object Lock), gcs (Bucket Lock) | EVIDENCE_S3_BUCKET, AWS_* / EVIDENCE_GCS_BUCKET, GOOGLE_APPLICATION_CREDENTIALS |

## Connecting a real provider

1. Put its keys in the secret store (production) or `.env.local` (development). Never in code, chat or email.
2. Write the adapter in `src/server/providers/<service>/<provider>.ts`, implementing that service's interface (the
   same one the dummy implements). Return the **normalised** shape in `src/lib/checks.ts` / `src/lib/cases.ts`, never
   the provider's own JSON; put the provider's response in `raw` (it is stored encrypted, never shown).
   - Wrong input from us (4xx): `status: "not_available"`, `error.retryable: false`, a plain message.
   - Provider down or rate limited (5xx, network): `error.retryable: true` so the engine retries, then falls back.
   - Ran and found nothing: `status: "no_data"` (still charged, v3 FR-BIL-05).
3. Register it in that service's index file (the `REAL` map), next to the dummy.
4. Switch the variable, run the unit tests for that service, then try one real lookup on a test record.
5. Keep the dummy: tests and local development keep using it.

Until step 3 is done for a provider, choosing it uses a **slot** (`src/server/providers/slots.ts`) that answers "not
connected" safely, so a half-finished switch never breaks the portal.

## PRD v4.0 additions (20 Oct)

- **Sample data mode** (section 10). `SAMPLE_DATA_MODE=true` (or `organisations.sample_data_mode`) shows sample data for
  every check and never touches the wallet. Otherwise each check uses its live provider when one is set with keys, and
  sample data when not; every section says "Live" or "Sample", and sample reports carry "SAMPLE DATA: not a real report".
- **API Setu GSTN** (`src/server/providers/identity/apisetu.ts`, check adapter `checks/apisetu.ts`):
  `GET {GSTN_BASE_URL}/gstn/v2/taxpayers/{gstin}` with `X-APISETU-CLIENTID` and `X-APISETU-APIKEY`; an unknown GSTIN
  comes back as `[]`. Switch on with `PROVIDER_IDENTITY=apisetu` (sign-up, company search) and
  `PROVIDER_CW_GST_SEARCH=apisetu` (the ₹15 GST search). Live since 20 Oct on https://apisetu.gov.in. API Setu has no
  return-filing API and does not list other GSTINs on the PAN, so the report says "Not in this source" for those; filing
  history and turnover still need a GSP.
- **MCA open data** (`src/server/providers/mca.ts`): data.gov.in resource `MCA_DATASET_RESOURCE_IDS` (RoC-wise master data,
  about 37 lakh rows). Its filters are exact-match only, so name search runs on our copy, `public.mca_companies`, filled
  by the job `mca.import_page` one state at a time (`POST /api/v1/dev/mca-import {"state":"Karnataka"}`, progress with
  GET). Karnataka is loaded (2.3 lakh unique companies, data as of 13 Oct 2026). All India needs the paid database plan.
  A CIN that is not in the copy is fetched live and saved.
- **Company check from MCA** (`src/server/providers/checks/mca.ts`): `PROVIDER_CW_COMPANY=mca` (or `mca,probe42`). Needs
  the buyer's CIN; AGM, balance sheet and charges are not in the open data.
- **SMS OTP through Fast2SMS** (`src/server/providers/sms/fast2sms.ts`): consent and agreement OTPs use it with
  `PROVIDER_OTP=fast2sms`. Sign-in OTP comes from Supabase Auth: set `PROVIDER_SMS=fast2sms` and `SEND_SMS_HOOK_SECRET`,
  then add `https://<host>/api/v1/auth/sms-hook` as the Send SMS hook in Supabase Auth > Hooks.
- **KYC with DigiLocker**: the dummy is a test consent page; the real adapter is written when partner access is set up.

