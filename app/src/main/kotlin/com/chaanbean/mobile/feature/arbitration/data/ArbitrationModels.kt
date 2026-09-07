package com.chaanbean.mobile.feature.arbitration.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json

/**
 * Mirrors prisma `model ArbitrationCase`. `GET /api/arbitration` returns these under
 * `cases`, each with `creditAccount.buyer` included; the `updatedCase` echoed by a POST
 * carries no relations at all, so [creditAccount] must tolerate being absent.
 */
@Serializable
data class ArbitrationCase(
    val id: String = "",
    val creditAccountId: String = "",
    val caseNumber: String = "",
    val status: String = "open",
    val assignedLegalOwner: String? = null,
    val claimantName: String? = null,
    val respondentName: String? = null,
    val principalAmount: Double = 0.0,
    val penalInterestRate: Double = 21.75,
    val accruedInterest: Double = 0.0,
    val totalClaimAmount: Double = 0.0,
    val statutoryBasis: String = "",
    val settlementTerms: String? = null,
    val settlementDocUrl: String? = null,
    val eSignStatus: String = "pending",
    /** JSON array of [ESignSignature], stored by the server as a string column. */
    val eSignSignatures: String? = null,
    /** JSON array of [Hearing], stored by the server as a string column. */
    val hearings: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val creditAccount: ArbCreditAccount? = null,
)

/** Mirrors prisma `model CreditAccount`, as included by the arbitration GET handler. */
@Serializable
data class ArbCreditAccount(
    val id: String = "",
    val buyerId: String = "",
    val outstandingAmount: Double = 0.0,
    val creditLimit: Double = 0.0,
    val tenorDays: Int = 30,
    val dueDate: String? = null,
    val overdueStatus: String = "current",
    val penalInterestRate: Double = 18.0,
    val disputeStatus: String = "none",
    val buyer: ArbBuyer? = null,
)

/** Mirrors prisma `model BuyerDebtor`. `mobileNumbers` is a JSON array held as a string. */
@Serializable
data class ArbBuyer(
    val id: String = "",
    val name: String = "",
    val contactPerson: String? = null,
    val email: String? = null,
    val mobileNumbers: String? = null,
    val pan: String? = null,
    val gstin: String? = null,
    val address: String? = null,
    val language: String = "en",
)

@Serializable
data class ArbitrationListResponse(val cases: List<ArbitrationCase> = emptyList())

/**
 * Mirrors `MSMEInterestResult` from src/lib/arbitration/interest.ts field for field.
 * The RBI bank rate is a hardcoded default (6.75) in that file, not a live rate lookup.
 */
@Serializable
data class MsmeInterestResult(
    val principalAmount: Double = 0.0,
    val statutoryRatePercent: Double = 0.0,
    val rbiBaseRatePercent: Double = 0.0,
    val multiplicationFactor: Int = 3,
    val daysOverdue: Int = 0,
    val compoundingPeriodsMonths: Double = 0.0,
    val accruedInterest: Double = 0.0,
    val totalPayable: Double = 0.0,
    val legalFormula: String = "",
    val statutorySection: String = "",
    val calculatedAt: String? = null,
)

/** One entry of the case's `eSignSignatures` JSON, as written by the `e_sign` action. */
@Serializable
data class ESignSignature(
    val name: String = "",
    val role: String = "",
    val signedAt: String? = null,
    val authMode: String = "",
    val docHash: String = "",
)

/** One entry of the case's `hearings` JSON. No handler writes this column; it is seeded only. */
@Serializable
data class Hearing(
    val arbitrator: String = "",
    val hearingDate: String? = null,
    val venue: String = "",
)

/** Mirrors prisma `model LegalNotice`. No API route returns these; see [ArchiveAccess]. */
@Serializable
data class LegalNotice(
    val id: String = "",
    val creditAccountId: String = "",
    val templateId: String = "",
    val sentAt: String? = null,
    val channel: String = "registered_post_email",
    val govReferenceId: String? = null,
    val contentHash: String = "",
    val status: String = "served",
)

/** Mirrors prisma `model LegalEvidenceLog` - the Section 65B electronic-record trail. */
@Serializable
data class LegalEvidenceEntry(
    val id: String = "",
    val relatedEntityType: String = "",
    val relatedEntityId: String = "",
    val channel: String = "",
    val contentHash: String = "",
    val deliveredAt: String? = null,
    val metadata: String? = null,
)

@Serializable
data class ArbitrationActionRequest(
    val caseId: String,
    val action: String,
    val signatoryName: String? = null,
    val signatoryRole: String? = null,
)

/**
 * One response class for all three actions, because the handler returns a different
 * subset of these keys per action and Retrofit needs a single return type.
 */
@Serializable
data class ArbitrationActionResponse(
    val success: Boolean = false,
    val message: String? = null,
    val error: String? = null,
    val calculation: MsmeInterestResult? = null,
    val updatedCase: ArbitrationCase? = null,
    val settlementDocUrl: String? = null,
    val terms: String? = null,
    val signatures: List<ESignSignature>? = null,
    val eSignStatus: String? = null,
)

/** Action strings the handler accepts. Anything else answers 400 "Unknown action". */
object ArbitrationActions {
    const val RECALCULATE_INTEREST = "recalculate_interest"
    const val GENERATE_SETTLEMENT = "generate_settlement"
    const val E_SIGN = "e_sign"
}

fun parseSignatures(json: Json, raw: String?): List<ESignSignature> =
    decodeList(json, raw)

fun parseHearings(json: Json, raw: String?): List<Hearing> =
    decodeList(json, raw)

private inline fun <reified T> decodeList(json: Json, raw: String?): List<T> {
    if (raw.isNullOrBlank()) return emptyList()
    return try {
        json.decodeFromString<List<T>>(raw)
    } catch (e: Exception) {
        emptyList()
    }
}
