package com.chaanbean.mobile.feature.businesscheck.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/**
 * Mirrors the prisma models in the BUSINESS VERIFICATION & FINANCIAL INTELLIGENCE (V0)
 * block. One profile type covers every endpoint: /api/businesses includes only
 * riskFlag + one year summary + _count, /api/businesses/[id] includes everything,
 * and compare/search include a subset. Missing relations decode as empty lists.
 *
 * Prisma Float -> Double, DateTime -> ISO-8601 String.
 */
@Serializable
data class BusinessProfile(
    val id: String,
    val companyName: String,
    val gstin: String? = null,
    val cin: String? = null,
    val pan: String? = null,
    val udyamNo: String? = null,
    val phone: String? = null,
    val registeredAddr: String? = null,
    val incorporatedOn: String? = null,
    val enterpriseType: String? = null,
    val industryCode: String? = null,
    val primaryActivity: String? = null,
    val overallStatus: String = "PENDING",
    val sourceStatus: String = "PENDING",
    val createdBy: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val identifiers: List<BusinessIdentifier> = emptyList(),
    val sourceRecords: List<BusinessSourceRecord> = emptyList(),
    val financialDocuments: List<FinancialDocument> = emptyList(),
    val yearSummaries: List<FinancialYearSummary> = emptyList(),
    val consistencyChecks: List<FinancialConsistencyCheck> = emptyList(),
    val riskSignals: List<BizRiskSignal> = emptyList(),
    val riskFlag: BizRiskFlag? = null,
    val creditRec: CreditRecommendation? = null,
    val courtCases: List<CourtCase> = emptyList(),
    val verificationTasks: List<VerificationTask> = emptyList(),
    val manualReviews: List<ManualReview> = emptyList(),
    val auditLogs: List<BizAuditLog> = emptyList(),
    @SerialName("_count") val counts: BusinessCounts? = null,
)

/** Prisma `_count` projection; present on the list and compare endpoints only. */
@Serializable
data class BusinessCounts(
    val financialDocuments: Int = 0,
    val courtCases: Int = 0,
)

@Serializable
data class BusinessIdentifier(
    val id: String,
    val businessId: String = "",
    val identifierType: String = "",
    val value: String = "",
    val verified: Boolean = false,
    val sourceStatus: String = "PENDING",
    val verifiedAt: String? = null,
    val createdAt: String? = null,
)

/**
 * One fetch from a public source. In V0 every adapter (MCA, GST, Udyam, eCourts)
 * writes sourceStatus = USER_PROVIDED: the operator reads the government portal
 * and types what they saw. `rawPayload` / `parsedFields` are JSON held as strings.
 */
@Serializable
data class BusinessSourceRecord(
    val id: String,
    val businessId: String = "",
    val sourceType: String = "",
    val sourceStatus: String = "UNAVAILABLE",
    val rawPayload: String = "{}",
    val parsedFields: String? = null,
    val fetchedAt: String? = null,
    val notes: String? = null,
)

@Serializable
data class FinancialDocument(
    val id: String,
    val businessId: String = "",
    val originalName: String = "",
    val storagePath: String = "",
    val mimeType: String = "",
    val fileSizeBytes: Int = 0,
    val category: String = "OTHER",
    val fiscalYear: String? = null,
    val processingStatus: String = "PENDING",
    val processingError: String? = null,
    val uploadedAt: String? = null,
    val processedAt: String? = null,
    val extractions: List<FinancialExtraction> = emptyList(),
)

@Serializable
data class FinancialExtraction(
    val id: String,
    val documentId: String = "",
    val businessId: String = "",
    val extractionMethod: String = "",
    val rawText: String? = null,
    val fields: String = "{}",
    val confidence: String = "HIGH",
    val extractedAt: String? = null,
)

@Serializable
data class FinancialYearSummary(
    val id: String = "",
    val businessId: String = "",
    val fiscalYear: String = "",
    val revenue: Double? = null,
    val cogs: Double? = null,
    val grossProfit: Double? = null,
    val grossMarginPct: Double? = null,
    val ebitda: Double? = null,
    val ebitdaMarginPct: Double? = null,
    val netProfit: Double? = null,
    val netMarginPct: Double? = null,
    val totalAssets: Double? = null,
    val totalLiabilities: Double? = null,
    val equity: Double? = null,
    val debtToEquity: Double? = null,
    val currentRatio: Double? = null,
    val bankInflows: Double? = null,
    val bankOutflows: Double? = null,
    val gstTurnover: Double? = null,
    val revenueSource: String? = null,
    val dataCompleteness: Double = 0.0,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

/** result is PASS | REVIEW_REQUIRED. */
@Serializable
data class FinancialConsistencyCheck(
    val id: String = "",
    val businessId: String = "",
    val checkName: String = "",
    val fiscalYear: String? = null,
    val valueA: Double? = null,
    val labelA: String? = null,
    val valueB: Double? = null,
    val labelB: String? = null,
    val discrepancyPct: Double? = null,
    val result: String = "PASS",
    val note: String? = null,
    val checkedAt: String? = null,
)

/** One of the 12 deterministic signals. color is GREEN | AMBER | RED | GREY. */
@Serializable
data class BizRiskSignal(
    val id: String = "",
    val businessId: String = "",
    val signalCode: String = "",
    val label: String = "",
    val color: String = "GREY",
    val score: Double = 0.0,
    val weight: Double = 1.0,
    val rationale: String = "",
    val sourceRefs: String? = null,
    val computedAt: String? = null,
)

/** `hardRedFlags` is a JSON array held as a string; see [parseHardRedFlags]. */
@Serializable
data class BizRiskFlag(
    val id: String = "",
    val businessId: String = "",
    val flag: String = "PENDING",
    val compositeScore: Double = 0.0,
    val signalBreakdown: String = "{}",
    val hardRedFlags: String? = null,
    val recommendedLimit: Double = 0.0,
    val recommendedTenor: Int = 30,
    val computedAt: String? = null,
    val configSnapshot: String? = null,
)

@Serializable
data class CreditRecommendation(
    val id: String = "",
    val businessId: String = "",
    val creditLimit: Double = 0.0,
    val tenor: Int = 30,
    val flag: String = "PENDING",
    val rationale: String = "",
    val signalRefs: String = "{}",
    val documentTrail: String? = null,
    val isBlocked: Boolean = false,
    val blockReason: String? = null,
    val computedAt: String? = null,
)

@Serializable
data class CourtCase(
    val id: String,
    val businessId: String = "",
    val caseNumber: String? = null,
    val courtName: String? = null,
    val filingDate: String? = null,
    val caseType: String? = null,
    val status: String? = null,
    val partyRole: String? = null,
    val description: String? = null,
    val sourceStatus: String = "USER_PROVIDED",
    val notes: String? = null,
    val createdAt: String? = null,
)

/** status is PENDING | AWAITING_MANUAL | COMPLETED | FAILED. */
@Serializable
data class VerificationTask(
    val id: String = "",
    val businessId: String = "",
    val taskType: String = "",
    val status: String = "PENDING",
    val result: String? = null,
    val error: String? = null,
    val retriesCount: Int = 0,
    val startedAt: String? = null,
    val completedAt: String? = null,
    val createdAt: String? = null,
)

@Serializable
data class ManualReview(
    val id: String,
    val businessId: String = "",
    val reviewType: String = "",
    val status: String = "OPEN",
    val promptText: String = "",
    val portalUrl: String? = null,
    val submittedData: String? = null,
    val submittedAt: String? = null,
    val reviewedBy: String? = null,
    val createdAt: String? = null,
)

@Serializable
data class BizAuditLog(
    val id: String,
    val businessId: String = "",
    val eventType: String = "",
    val actor: String? = null,
    val description: String = "",
    val metadata: String? = null,
    val createdAt: String? = null,
)

// ---------------------------------------------------------------------------
// Requests and envelopes
// ---------------------------------------------------------------------------

@Serializable
data class CreateBusinessRequest(
    val companyName: String,
    val gstin: String? = null,
    val cin: String? = null,
    val pan: String? = null,
    val udyamNo: String? = null,
    val phone: String? = null,
    val createdBy: String? = null,
)

/** PATCH accepts only this whitelist; anything else is dropped by the handler. */
@Serializable
data class UpdateBusinessRequest(
    val companyName: String? = null,
    val gstin: String? = null,
    val cin: String? = null,
    val pan: String? = null,
    val udyamNo: String? = null,
    val phone: String? = null,
    val registeredAddr: String? = null,
    val enterpriseType: String? = null,
    val industryCode: String? = null,
    val primaryActivity: String? = null,
)

@Serializable
data class CompareRequest(val businessIds: List<String>)

@Serializable
data class BusinessListResponse(val businesses: List<BusinessProfile> = emptyList())

@Serializable
data class BusinessDetailResponse(val business: BusinessProfile? = null)

@Serializable
data class CreateBusinessResponse(
    val success: Boolean = false,
    val business: BusinessProfile? = null,
)

@Serializable
data class VerifyResponse(
    val success: Boolean = false,
    val message: String? = null,
)

@Serializable
data class RiskResponse(
    val riskFlag: BizRiskFlag? = null,
    val signals: List<BizRiskSignal> = emptyList(),
)

@Serializable
data class CreditResponse(val creditRecommendation: CreditRecommendation? = null)

@Serializable
data class AuditResponse(val auditLogs: List<BizAuditLog> = emptyList())

@Serializable
data class DocumentsResponse(val documents: List<FinancialDocument> = emptyList())

@Serializable
data class UploadDocumentResponse(
    val success: Boolean = false,
    val document: FinancialDocument? = null,
)

@Serializable
data class ManualVerifyResponse(val success: Boolean = false)

/**
 * Non-2xx bodies. `error` is a plain string on most paths but a zod
 * `flatten()` object on POST /api/businesses validation failures, so it stays
 * an untyped element and is squashed by [firstText].
 */
@Serializable
data class ApiErrorBody(
    val error: JsonElement? = null,
    val existingId: String? = null,
)

/** First string leaf of a zod error tree, or of a plain string error. */
fun firstText(element: JsonElement?): String? = when (element) {
    null -> null
    is JsonPrimitive -> element.content.takeIf { it.isNotBlank() && it != "null" }
    is JsonArray -> element.firstNotNullOfOrNull { firstText(it) }
    is JsonObject -> element.values.firstNotNullOfOrNull { firstText(it) }
    else -> null
}

// ---------------------------------------------------------------------------
// Manual verification payloads
//
// V0 has no live MCA/GST/Udyam/eCourts feed. Each of these is what a human read
// off the official portal, and the server files it as sourceStatus=USER_PROVIDED.
// ---------------------------------------------------------------------------

@Serializable
data class McaManualPayload(
    val cin: String? = null,
    val companyName: String? = null,
    val registeredAddress: String? = null,
    val incorporationDate: String? = null,
    val status: String? = null,
    val authorisedCapital: String? = null,
    val paidUpCapital: String? = null,
    val charges: String? = null,
    val rawText: String? = null,
)

@Serializable
data class GstManualPayload(
    val gstin: String? = null,
    val tradeName: String? = null,
    val legalName: String? = null,
    val registrationDate: String? = null,
    val taxPayerType: String? = null,
    val gstStatus: String? = null,
    val stateCode: String? = null,
    val principalAddress: String? = null,
    val rawText: String? = null,
)

@Serializable
data class UdyamManualPayload(
    val udyamNo: String? = null,
    val enterpriseName: String? = null,
    val ownerName: String? = null,
    val type: String? = null,
    val activity: String? = null,
    val nic: String? = null,
    val registrationDate: String? = null,
    val district: String? = null,
    val state: String? = null,
    val validUpto: String? = null,
    val rawText: String? = null,
)

@Serializable
data class CourtCasePayload(
    val caseNumber: String? = null,
    val courtName: String? = null,
    val filingDate: String? = null,
    val caseType: String? = null,
    val status: String? = null,
    val partyRole: String? = null,
    val description: String? = null,
    val notes: String? = null,
)

@Serializable
data class McaManualVerifyRequest(
    val payload: McaManualPayload,
    val actor: String? = null,
    val type: String = "MCA",
)

@Serializable
data class GstManualVerifyRequest(
    val payload: GstManualPayload,
    val actor: String? = null,
    val type: String = "GST",
)

@Serializable
data class UdyamManualVerifyRequest(
    val payload: UdyamManualPayload,
    val actor: String? = null,
    val type: String = "UDYAM",
)

/** ECOURTS is the one type whose payload is an array, not an object. */
@Serializable
data class EcourtsManualVerifyRequest(
    val payload: List<CourtCasePayload>,
    val actor: String? = null,
    val type: String = "ECOURTS",
)

/** Bytes already read out of the picked content Uri, ready for the multipart POST. */
class DocumentUpload(
    val fileName: String,
    val mimeType: String,
    val bytes: ByteArray,
    val category: String,
    val fiscalYear: String?,
)

// ---------------------------------------------------------------------------
// Small parsers for the JSON-in-a-string columns
// ---------------------------------------------------------------------------

/** `["ACTIVE_LITIGATION","IDENTITY_MISMATCH"]` -> the two codes. */
fun parseHardRedFlags(raw: String?): List<String> {
    if (raw.isNullOrBlank()) return emptyList()
    return raw.trim()
        .removePrefix("[")
        .removeSuffix("]")
        .split(',')
        .map { it.trim().trim('"') }
        .filter { it.isNotEmpty() }
}

/** Flat `{"key":"value"}` pairs out of a parsedFields blob, order preserved. */
fun parseFlatFields(raw: String?): List<Pair<String, String>> {
    if (raw.isNullOrBlank()) return emptyList()
    val body = raw.trim().removePrefix("{").removeSuffix("}")
    if (body.isBlank()) return emptyList()
    val pairs = mutableListOf<Pair<String, String>>()
    var depth = 0
    var inString = false
    var escaped = false
    val current = StringBuilder()
    for (ch in body) {
        when {
            escaped -> {
                current.append(ch)
                escaped = false
            }
            ch == '\\' -> {
                current.append(ch)
                escaped = true
            }
            ch == '"' -> {
                current.append(ch)
                inString = !inString
            }
            !inString && (ch == '{' || ch == '[') -> {
                depth++
                current.append(ch)
            }
            !inString && (ch == '}' || ch == ']') -> {
                depth--
                current.append(ch)
            }
            !inString && depth == 0 && ch == ',' -> {
                pairs.addSplit(current.toString())
                current.setLength(0)
            }
            else -> current.append(ch)
        }
    }
    pairs.addSplit(current.toString())
    return pairs
}

private fun MutableList<Pair<String, String>>.addSplit(chunk: String) {
    val idx = chunk.indexOf(':')
    if (idx <= 0) return
    val key = chunk.substring(0, idx).trim().trim('"')
    val value = chunk.substring(idx + 1).trim().trim('"')
    // Nested objects and arrays are not rendered as key/value rows.
    if (key.isBlank() || value.isBlank() || value == "null") return
    if (value.startsWith("{") || value.startsWith("[")) return
    add(key to value)
}

/** "registeredAddress" -> "Registered Address", matching the web app's label rule. */
fun humanizeKey(key: String): String {
    val spaced = StringBuilder()
    for ((index, ch) in key.withIndex()) {
        if (index > 0 && ch.isUpperCase()) spaced.append(' ')
        spaced.append(ch)
    }
    return spaced.toString().replaceFirstChar { it.uppercase() }
}
