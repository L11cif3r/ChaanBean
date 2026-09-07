package com.chaanbean.mobile.feature.backgroundcheck.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

/**
 * Wire shapes for `/api/verification*`.
 *
 * `data` is `Record<string, unknown>` on the server - every adapter puts a different
 * set of keys in it - so it stays a JsonObject here and the UI renders whatever
 * actually arrived instead of a shape we guessed.
 */
@Serializable
data class NormalizedReport(
    val reportType: String = "",
    val subjectType: String = "business",
    val subjectId: String = "",
    val provider: String = "",
    /** completed | pending | failed */
    val status: String = "completed",
    val fetchedAt: String? = null,
    val expiresAt: String? = null,
    val data: JsonObject = JsonObject(emptyMap()),
    /** Set only by the gst_supreme_report adapter. It is a flag, not an enforcement. */
    val otpRequired: Boolean = false,
)

@Serializable
data class VerificationRunRequest(
    val subjectId: String,
    val reportTypes: List<String> = emptyList(),
    val subjectType: String = "business",
    val companyId: String? = null,
    val forceRefresh: Boolean = true,
)

@Serializable
data class VerificationRunResponse(
    val success: Boolean = false,
    val subjectId: String = "",
    val subjectType: String = "business",
    val reportCount: Int = 0,
    val reports: List<NormalizedReport> = emptyList(),
    val error: String? = null,
)

@Serializable
data class GatewayStatusResponse(
    val timestamp: String? = null,
    val summary: GatewaySummary = GatewaySummary(),
    val adapters: List<GatewayAdapter> = emptyList(),
)

@Serializable
data class GatewaySummary(
    val totalAdapters: Int = 0,
    val liveCount: Int = 0,
    val sandboxCount: Int = 0,
    val failingCount: Int = 0,
)

@Serializable
data class GatewayAdapter(
    val id: String = "",
    val name: String = "",
    val type: String = "",
    /** "live" only when the matching API key env var is set on the server; else "sandbox". */
    val status: String = "sandbox",
    /** A constant written into the handler, not a measurement. */
    val latencyMs: Int = 0,
    val circuitBreaker: String = "closed",
    val endpoint: String = "",
    val reportsSupported: List<String> = emptyList(),
)

@Serializable
data class OtpInitiateRequest(
    val gstin: String,
    val mobile: String? = null,
)

@Serializable
data class OtpInitiateResponse(
    val sessionId: String? = null,
    /** "otp_sent" */
    val status: String? = null,
    val message: String? = null,
    val error: String? = null,
)

@Serializable
data class OtpVerifyRequest(
    val sessionId: String,
    val otp: String,
    val subjectId: String? = null,
    val subjectType: String = "business",
)

@Serializable
data class OtpVerifyResponse(
    val success: Boolean = false,
    val reportId: String? = null,
    val data: JsonObject = JsonObject(emptyMap()),
    val error: String? = null,
)

/**
 * One of the 17 `ReportType` members in `src/lib/verification-gateway/types.ts`.
 *
 * `caveat` records what the server actually does for that report type, read off
 * `clients.ts` / `adapters.ts`. The screen shows it so a sandbox-synthesised
 * number is never mistaken for a third-party pull.
 */
data class ReportSpec(
    val code: String,
    val label: String,
    val category: String,
    val description: String,
    val inputLabel: String,
    val sampleId: String,
    val subjectType: String,
    val cacheTtlHours: Int,
    val caveat: String,
)

object ReportCatalog {

    const val CATEGORY_ALL = "All"
    const val CATEGORY_TAX = "Tax & GST"
    const val CATEGORY_BUREAU = "Credit Bureau"
    const val CATEGORY_JUDICIAL = "Judicial & FIR"
    const val CATEGORY_CORPORATE = "Corporate & MSME"
    const val CATEGORY_IDENTITY = "Identity & Delivery"

    val categories = listOf(
        CATEGORY_ALL,
        CATEGORY_TAX,
        CATEGORY_BUREAU,
        CATEGORY_JUDICIAL,
        CATEGORY_CORPORATE,
        CATEGORY_IDENTITY,
    )

    /** All 17, in the order the web runner lists them. */
    val all = listOf(
        ReportSpec(
            code = "gst_exact_turnover",
            label = "GST Exact Turnover",
            category = CATEGORY_TAX,
            description = "Multi-year GSTR-3B taxable turnover with gross margins.",
            inputLabel = "GSTIN",
            sampleId = "27AAECG1234H1Z5",
            subjectType = "business",
            cacheTtlHours = 720,
            caveat = "Calls APIsetu only when APISETU_API_KEY is set. Otherwise the four FY rows are projected from the stored credit limit.",
        ),
        ReportSpec(
            code = "gst_slab_check",
            label = "GST Slab Check",
            category = CATEGORY_TAX,
            description = "Turnover band, tax ward jurisdiction and registration date.",
            inputLabel = "GSTIN or PAN",
            sampleId = "27AAECG1234H1Z5",
            subjectType = "business",
            cacheTtlHours = 168,
            caveat = "The slab is bucketed from the stored credit limit; registration date and taxpayer type are constants in the adapter.",
        ),
        ReportSpec(
            code = "gst_supreme_report",
            label = "GST Supreme Report",
            category = CATEGORY_TAX,
            description = "Filing regularity, GSTR-1 vs 3B mismatches and counterparty PANs.",
            inputLabel = "GSTIN",
            sampleId = "27AAECG1234H1Z5",
            subjectType = "business",
            cacheTtlHours = 720,
            caveat = "This route returns the full payload with no OTP at all; otpRequired is only a flag on the response.",
        ),
        ReportSpec(
            code = "bureau_report",
            label = "Bureau Report (CIBIL/Experian/CRIF)",
            category = CATEGORY_BUREAU,
            description = "Commercial score, trade lines and utilisation with provider fallback.",
            inputLabel = "PAN or commercial name",
            sampleId = "AAECG1234H",
            subjectType = "business",
            cacheTtlHours = 720,
            caveat = "No bureau is contacted. The score is one of four fixed values chosen by your own overdue/default flags.",
        ),
        ReportSpec(
            code = "payment_behaviour",
            label = "Payment Behaviour Report",
            category = CATEGORY_BUREAU,
            description = "Average delay days, on-time percentage and recent enquiries.",
            inputLabel = "PAN / GSTIN / trade name",
            sampleId = "27AAECG1234H1Z5",
            subjectType = "business",
            cacheTtlHours = 720,
            caveat = "All four numbers are constants selected by the overdue/defaulted flag on your own credit accounts.",
        ),
        ReportSpec(
            code = "court_case_history",
            label = "Court Case History",
            category = CATEGORY_JUDICIAL,
            description = "Summary suits, s.138 NI Act matters and arbitration claims.",
            inputLabel = "Company / director / PAN",
            sampleId = "27AAECG1234H1Z5",
            subjectType = "business",
            cacheTtlHours = 720,
            caveat = "e-Courts is not queried. Cases are built from your own arbitration records and community-default entries; resolvedCases is hardcoded to 2.",
        ),
        ReportSpec(
            code = "fir_check",
            label = "FIR Check",
            category = CATEGORY_JUDICIAL,
            description = "CCTNS check for registered criminal FIRs.",
            inputLabel = "Entity or director name",
            sampleId = "27AAECG1234H1Z5",
            subjectType = "business",
            cacheTtlHours = 720,
            caveat = "CCTNS is not queried. An FIR is synthesised only when a community-default note mentions a bounced cheque or s.138.",
        ),
        ReportSpec(
            code = "company_supreme_report",
            label = "Company Supreme Report",
            category = CATEGORY_CORPORATE,
            description = "MCA21 standing, capital structure, net worth and leverage.",
            inputLabel = "CIN or PAN",
            sampleId = "27AAECG1234H1Z5",
            subjectType = "business",
            cacheTtlHours = 720,
            caveat = "MCA21 is not queried. Capital, net worth and ratios are two fixed sets chosen by the defaulted flag.",
        ),
        ReportSpec(
            code = "director_details",
            label = "Director Details",
            category = CATEGORY_CORPORATE,
            description = "Board roster, DIN status and disqualification check.",
            inputLabel = "DIN, name or CIN",
            sampleId = "27AAECG1234H1Z5",
            subjectType = "business",
            cacheTtlHours = 720,
            caveat = "Returns the directorDetails JSON stored on your vendor row; if there is none, two placeholder directors are returned.",
        ),
        ReportSpec(
            code = "msme_report",
            label = "MSME Report (Udyam)",
            category = CATEGORY_CORPORATE,
            description = "Udyam number, enterprise tier, NIC code and major activity.",
            inputLabel = "Udyam number or PAN",
            sampleId = "27AAECG1234H1Z5",
            subjectType = "business",
            cacheTtlHours = 720,
            caveat = "The Udyam portal is not queried. The number is assembled from the GSTIN state code and the incorporation date is a constant.",
        ),
        ReportSpec(
            code = "import_export_report",
            label = "Import Export Report",
            category = CATEGORY_CORPORATE,
            description = "IEC validity, shipment counts and DEL compliance.",
            inputLabel = "IEC code or PAN",
            sampleId = "27AAECG1234H1Z5",
            subjectType = "business",
            cacheTtlHours = 720,
            caveat = "DGFT/ICEGATE is not queried. The IEC is a slice of the PAN and the shipment/value figures are constants.",
        ),
        ReportSpec(
            code = "mobile_to_pan",
            label = "Mobile to PAN",
            category = CATEGORY_IDENTITY,
            description = "PAN linkage and Aadhaar seeding status for a mobile number.",
            inputLabel = "10-digit mobile",
            sampleId = "9876543210",
            subjectType = "individual",
            cacheTtlHours = 168,
            caveat = "NSDL is not queried. panMatch and seededWithAadhaar are hardcoded true for every input.",
        ),
        ReportSpec(
            code = "mobile_identity",
            label = "Mobile Identity",
            category = CATEGORY_IDENTITY,
            description = "Telecom KYC name concordance and SIM tenure.",
            inputLabel = "10-digit mobile",
            sampleId = "9876543210",
            subjectType = "individual",
            cacheTtlHours = 168,
            caveat = "No telecom operator is contacted. mobileVerified is always true and simActiveDays is the constant 1420.",
        ),
        ReportSpec(
            code = "mobile_to_address",
            label = "Mobile to Address",
            category = CATEGORY_IDENTITY,
            description = "Subscriber address resolution with a confidence score.",
            inputLabel = "10-digit mobile",
            sampleId = "9876543210",
            subjectType = "individual",
            cacheTtlHours = 168,
            caveat = "Same handler branch as Mobile Identity. The address is the one already stored on your own record; the circle is inferred from the GSTIN prefix.",
        ),
        ReportSpec(
            code = "pan_to_mobile_email",
            label = "PAN to Mobile & Email",
            category = CATEGORY_IDENTITY,
            description = "Contactability resolution from a PAN.",
            inputLabel = "PAN",
            sampleId = "AAECG1234H",
            subjectType = "business",
            cacheTtlHours = 168,
            caveat = "The server has no branch for this type: it falls through to the corporate-registry payload, so you get CIN and capital figures, not a mobile or email.",
        ),
        ReportSpec(
            code = "address_enrichment",
            label = "Address Enrichment",
            category = CATEGORY_IDENTITY,
            description = "Operational-address confirmation via delivery-graph sources.",
            inputLabel = "PAN / GSTIN / address",
            sampleId = "27AAECG1234H1Z5",
            subjectType = "business",
            cacheTtlHours = 168,
            caveat = "No delivery platform is contacted. The source list is a fixed array and the confidence is 0.98, or 0.42 when the subject is flagged defaulted.",
        ),
        ReportSpec(
            code = "find_someone",
            label = "Find Someone",
            category = CATEGORY_IDENTITY,
            description = "Skip tracing for alternate numbers, emails and locations.",
            inputLabel = "Name, mobile or PAN",
            sampleId = "27AAECG1234H1Z5",
            subjectType = "business",
            cacheTtlHours = 168,
            caveat = "Alternate mobiles and emails are string-mangled from the record you already hold, not traced.",
        ),
    )

    /** BUNDLE_REPORT_TYPES from types.ts - what the web app fans out in one call. */
    val bundle = listOf(
        "gst_exact_turnover",
        "gst_supreme_report",
        "bureau_report",
        "court_case_history",
        "msme_report",
        "company_supreme_report",
        "director_details",
        "mobile_to_pan",
        "mobile_identity",
        "address_enrichment",
        "fir_check",
    )

    private val byCode = all.associateBy { it.code }

    fun spec(code: String): ReportSpec? = byCode[code]

    fun label(code: String): String = byCode[code]?.label ?: code

    fun inCategory(category: String): List<ReportSpec> =
        if (category == CATEGORY_ALL) all else all.filter { it.category == category }
}
