# ChaanBean — External Integration & Architecture Guide

This document specifies all 11 external provider categories, authentication mechanisms, environment variable configurations, operational modes (Sandbox vs. Live), voice mapping specifications, and regulatory frameworks utilized by ChaanBean.

---

## 1. Provider Directory & Architecture Overview

ChaanBean integrates with 11 primary categories of Indian government registries, credit bureaus, identity aggregators, telecom SIP providers, neural TTS engines, and legal compliance portals:

| # | Provider Category | Core Registry / API Endpoint | Auth Method | Sandbox Status | Production Readiness |
|---|---|---|---|---|---|
| 1 | **APIsetu (National Data Exchange)** | MCA21, EPFO, PAN, GSTN, DGFT | OAuth 2.0 / API Key (`X-APISETU-APIKEY`) | Active Mock / Sandbox | Live Ready via NIC / MeitY |
| 2 | **GST Supreme OTP Gateway** | GSP (GST Suvidha Provider) / GSTN | Session Token (`gst_session_token`) + OTP | Active 2-Step OTP Simulator | Live GSP (Iris / Cygnet / Clear) |
| 3 | **Commercial Credit Bureaus** | CIBIL, Experian Commercial, CRIF High Mark | MTLS + Mutual Basic Auth / SOAP/REST | Multi-Bureau Cascading Fallback | Live SFTP / REST Credentials |
| 4 | **Karza KYC Aggregator** | Bank Penny Drop, Statement OCR, Udyam MSME | Header API Key (`x-karza-key`) | Active Deterministic Sandbox | Live Production Karza / Perfios |
| 5 | **Court & Insolvency Registry** | e-Courts API, NCLT / IBC / DRT, High Courts | Bearer Token / Captcha Bypass API | Active Court Records Engine | Live Legal Kart / Legitquest / Court Data API |
| 6 | **Crime & FIR Records** | CCTNS, State EOW & Cyber Cell | State Police Portal Client Cert / API | Active Sandbox Engine | Live Special Cell / EOW API Integration |
| 7 | **DGFT Trade Compliance** | Denied Entity List (DEL), IEC Status | DGFT Public Services REST API | Active Trade Compliance Engine | Live DGFT Public APIs |
| 8 | **Delivery Graph & Logistics** | Shiprocket B2B, Delhivery Enterprise | OAuth 2.0 Bearer Token | Active Logistics Risk Graph | Live Delhivery / Shiprocket Webhooks |
| 9 | **IT & GST Government Portals** | Income Tax e-Filing, GST Portal notices | X.509 Digital Signature (DSC) / API | Active Portal Reference Generator | Live GST/ITD API Portal (`gov_reference_id`) |
| 10 | **Voice Outbound & SIP Trunk** | Asterisk / Vobiz SIP, AWS Polly TTS, AWS S3 | SIP Digest / AWS IAM Signature V4 | Active SIP Call Simulator & Polly Cache | Live Asterisk PBX / Vobiz Trunk + AWS Polly |
| 11 | **Multi-Channel Delivery & e-Sign** | SendGrid, WhatsApp BSP, DLT SMS, NSDL e-Sign | Bearer Tokens / DLT Entity ID / PKCS#7 | Active Mock Gateway & Evidence Logger | Live SendGrid, Gupshup/ValueFirst, NSDL Protean |

---

## 2. Environment Variables & Secret Configuration

To transition ChaanBean from the local development/sandbox mode to production credentials, populate the following environment variables in `.env.production`:

```bash
# ==============================================================================
# DATABASE & SYSTEM
# ==============================================================================
DATABASE_URL="postgresql://chaanbean_user:secret_password@db.chaanbean.internal:5432/chaanbean_prod?schema=public"
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://app.chaanbean.in"

# ==============================================================================
# 1. APISETU (NATIONAL DATA SHARING PLATFORM)
# ==============================================================================
APISETU_BASE_URL="https://apisetu.gov.in/api/v1"
APISETU_CLIENT_ID="chaanbean_mca_live"
APISETU_API_KEY="sec_setu_live_89324792374923"

# ==============================================================================
# 2. GST SUPREME GSP GATEWAY
# ==============================================================================
GST_GSP_BASE_URL="https://gsp.irisgst.com/api/v2"
GST_GSP_CLIENT_ID="cb_gst_prod"
GST_GSP_CLIENT_SECRET="sec_gsp_live_903482348"
GST_GSP_STATE_CD="27"

# ==============================================================================
# 3. COMMERCIAL CREDIT BUREAUS (CIBIL / EXPERIAN / CRIF)
# ==============================================================================
CIBIL_COMMERCIAL_URL="https://commercial.transunioncibil.com/api/v3"
CIBIL_MEMBER_ID="CB_MEMBER_9921"
CIBIL_SECRET_KEY="sec_cibil_live_77218392"
EXPERIAN_COMMERCIAL_URL="https://commercial.experian.in/services/b2b"
EXPERIAN_CLIENT_ID="chaanbean_exp_live"
CRIF_HIGHMARK_URL="https://crifhighmark.com/services/b2b/inquiry"

# ==============================================================================
# 4. KARZA KYC & BANK STATEMENT AGGREGATOR
# ==============================================================================
KARZA_BASE_URL="https://api.karza.in/v3"
KARZA_API_KEY="sec_karza_live_482937498"

# ==============================================================================
# 5 & 6 & 7. COURT, CRIME & DGFT GATEWAYS
# ==============================================================================
ECOURTS_INTEGRATION_URL="https://ecourts.gov.in/api/commercial"
ECOURTS_API_KEY="sec_ecourts_live_99238"
DGFT_PORTAL_URL="https://dgft.gov.in/services/rest"
DGFT_API_KEY="sec_dgft_live_109283"

# ==============================================================================
# 8. DELIVERY GRAPH & LOGISTICS
# ==============================================================================
DELHIVERY_B2B_URL="https://track.delhivery.com/api/v1"
DELHIVERY_API_KEY="sec_delhivery_live_83920"
SHIPROCKET_EMAIL="logistics@chaanbean.in"
SHIPROCKET_PASSWORD="sec_shiprocket_pass_99"

# ==============================================================================
# 9. IT / GST LEGAL DEMAND NOTICE CROSS-REFERENCE
# ==============================================================================
GOV_PORTAL_SIGNING_CERT_PATH="/etc/ssl/certs/chaanbean_dsc.p12"
GOV_PORTAL_SIGNING_PIN="889922"

# ==============================================================================
# 10. VOICE ENGINE (ASTERISK / VOBIZ SIP & AWS POLLY)
# ==============================================================================
ASTERISK_AMI_HOST="sip.chaanbean.internal"
ASTERISK_AMI_PORT="5038"
ASTERISK_AMI_USER="chaanbean_ami"
ASTERISK_AMI_SECRET="sec_asterisk_ami_903248"
VOBIZ_SIP_DOMAIN="trunk.vobiz.in"
VOBIZ_SIP_TRUNK_USER="CB_TRUNK_01"
VOBIZ_SIP_TRUNK_PASSWORD="sec_vobiz_trunk_883"

AWS_REGION="ap-south-1"
AWS_ACCESS_KEY_ID="AKIA_CHAANBEAN_POLLY_LIVE"
AWS_SECRET_ACCESS_KEY="sec_aws_secret_key_8923487239"
AWS_S3_AUDIO_BUCKET="chaanbean-audio-assets-ap-south-1"

# ==============================================================================
# 11. MULTI-CHANNEL & E-SIGN
# ==============================================================================
SENDGRID_API_KEY="SG.chaanbean_live_8923489234892"
SENDGRID_FROM_EMAIL="recovery@notices.chaanbean.in"

WHATSAPP_BSP_URL="https://api.gupshup.io/sm/api/v1/template/msg"
WHATSAPP_BSP_APP_NAME="ChaanBeanRecovery"
WHATSAPP_BSP_API_KEY="sec_gupshup_wa_live_99213"

DLT_TELECOM_ENTITY_ID="1701158932400012"
DLT_SMS_GATEWAY_URL="https://api.textlocal.in/send"
DLT_SMS_API_KEY="sec_textlocal_live_89234"

NSDL_ESIGN_GATEWAY_URL="https://esign.proteantech.in/api/v2.1"
NSDL_ESIGN_CLIENT_CODE="CB_ESIGN_PROD"
NSDL_ESIGN_AUTH_PIN="394029"
```

---

## 3. TRAI Calling Window & Frequency Cap Specifications

ChaanBean strictly adheres to Telecom Regulatory Authority of India (TRAI) Telecom Commercial Communications Customer Preference Regulations (TCCCPR, 2018):

- **Permitted Calling Hours**: 09:00:00 to 18:00:00 Indian Standard Time (IST, UTC+5:30).
- **Timezone Normalization**: All debtor phone timestamps are parsed in `Asia/Kolkata`.
- **Calling Lock**: Any trigger received outside 09:00–18:00 IST is automatically deferred, logged in `EscalationState.nextFollowUp`, and rejected by `src/lib/communication/calling-window.ts`.
- **Daily Frequency Cap**:
  - Maximum **2 voice call attempts per debtor per 24-hour window**.
  - Minimum **4 hours spacing between consecutive call attempts**.
  - Immediate kill switch if debtor presses DTMF `1` (Request Human Callback) or DTMF `9` (Dispute / Insolvency Notice).

---

## 4. Amazon Polly Voice Mappings & Audio S3 Hash-Caching

Voice synthesis is rendered via **Amazon Polly (Neural Engine where available, Standard otherwise)** in the `ap-south-1` (Mumbai) region.

### Synthesis & Caching Flow:
1. `src/lib/communication/polly-s3.ts` generates an SHA-256 hash of the exact parameterized text: `SHA256(language + voiceId + messageText)`.
2. Checks database table `MessageAudioAsset` for an existing cache record.
3. If cache hit: instantly returns `audioUrl` without incurring AWS Polly synthesis latency or per-character billing.
4. If cache miss: invokes AWS Polly `SynthesizeSpeech` API, uploads MP3 binary to AWS S3 bucket (`chaanbean-audio-assets-ap-south-1`), writes record to `MessageAudioAsset`, and returns URL.

### Voice Mapping Matrix:

| Language | ISO Code | Polly Voice ID | Engine | Sample Rate | Native Script |
|---|---|---|---|---|---|
| **English (Indian)** | `en-IN` | `Aditi` / `Raveena` | Neural / Standard | 24,000 Hz | Latin |
| **Hindi** | `hi-IN` | `Aditi` | Neural / Standard | 24,000 Hz | Devanagari |
| **Malayalam** | `ml-IN` | `Midhun` | Standard | 22,050 Hz | Malayalam Script |
| **Tamil** | `ta-IN` | `Priya` | Standard | 22,050 Hz | Tamil Script |
| **Telugu** | `te-IN` | `Chitra` / `Priya` | Standard | 22,050 Hz | Telugu Script |
| **Kannada** | `kn-IN` | `Gagan` | Standard | 22,050 Hz | Kannada Script |
| **Tulu** | `tu-IN` | *(See Gap Analysis)* | — | — | Tulu / Kannada Script |

---

## 5. The Tulu (`tu-IN`) TTS Gap Analysis & Solution Architecture

### The Industry Challenge:
Tulu is a Dravidian language spoken by over 2.5 million people, predominantly in the coastal districts of Karnataka (Dakshina Kannada, Udupi) and northern Kerala (Kasaragod) — a major commercial trading corridor for MSMEs, cashew processing, tile manufacturing, and fisheries.

Currently, **none of the major tier-1 hyperscaler cloud Text-to-Speech engines** (Amazon Web Services Polly, Google Cloud Text-to-Speech, Microsoft Azure Cognitive Services Speech) support native Tulu neural voice synthesis:
- AWS Polly: No `tu-IN` voice exists.
- Google Cloud TTS: No `tu-IN` Wavenet or Neural2 model exists.
- Azure Cognitive Speech: No `tu-IN` neural voice exists.

### ChaanBean Architectural Implementation:
ChaanBean handles this regional market reality through a multi-tiered architecture:

1. **Pre-Approved Structured Script Storage**:
   - High-fidelity pre-approved legal and payment recovery scripts in Tulu (written in both Kannada script and Latin phonetic transliteration) are stored in the database table `TemplateTranslation` under language code `tu`.
2. **Deterministic Voice Fallback**:
   - In automated voice dialer mode, `src/lib/communication/polly-s3.ts` checks if `language === "tu"`.
   - It gracefully falls back to Indian English (`Aditi`) or regional Kannada (`Gagan`), prefixed with an explicit bilingual introductory identifier explaining that the notice is dispatched to the coastal trade counterparty.
3. **Enterprise Custom Voice Hook (Roadmap)**:
   - ChaanBean includes an extensible hook in `src/lib/communication/polly-s3.ts` to connect to open-source Indic-TTS / AI4Bharat (IIT Madras) or custom fine-tuned VITS (Variational Inference with adversarial learning for end-to-end Text-to-Speech) models hosted on internal GPU clusters once licensed.
4. **Human Tele-Caller Prompt Interface**:
   - For Tulu-speaking accounts entering Escalation Level L2, the dashboard displays the native Tulu script to the internal tele-recovery desk for manual outbound calling.

---

## 6. Regulatory Frameworks & Legal Traceability

### 1. MSME Development Act, 2006 (Section 16 Statutory Penal Interest)
- In buyer-seller relationships where the supplier is a registered Udyam MSME, payment is legally mandatory within 45 days of acceptance.
- Under Section 16, failure to settle induces statutory penal interest at **three times (3x) the Reserve Bank of India (RBI) Bank Rate**, compounded monthly.
- RBI Bank Rate is retrieved and updated dynamically (current benchmark: 6.75% per annum -> statutory rate: **20.25% per annum compound interest**).
- Calculated via `src/lib/arbitration/interest.ts` and included in every Arbitration Statement of Claim.

### 2. Legal Demand Notice Cross-Referencing
- Each Demand Notice issued via ChaanBean assigns an immutable `gov_reference_id` formatted as:
  `CB-ITD-GST-2024-[CRC32-HASH]`.
- This reference is cross-matched against the buyer's GSTIN and PAN filing portal records, creating a tamper-proof audit trail admissible in Indian Commercial Courts under Section 65B of the Indian Evidence Act, 1872.

### 3. Immutable Evidence Logging (`LegalEvidenceLog`)
- Every recovery action — including email dispatches, WhatsApp read receipts, Asterisk SIP call recordings, and Aadhaar e-Sign ceremonies — generates a cryptographic SHA-256 fingerprint saved to the `LegalEvidenceLog` table.
- This ensures zero repudiation when escalating from L2 amicable recovery to L3 formal arbitration or NCLT Section 9 insolvency proceedings.
