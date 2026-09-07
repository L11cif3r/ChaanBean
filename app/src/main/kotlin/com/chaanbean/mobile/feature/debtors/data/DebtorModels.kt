package com.chaanbean.mobile.feature.debtors.data

import com.chaanbean.mobile.core.model.RiskFlag
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

/**
 * Mirrors prisma `model BuyerDebtor`. `GET /api/buyers` includes `creditAccounts`
 * (all of them) and `riskFlags` (only the single most recent, `take: 1`).
 */
@Serializable
data class BuyerDebtor(
    val id: String = "",
    val companyId: String = "",
    val name: String = "",
    val contactPerson: String? = null,
    val email: String? = null,
    /** Server stores this as a JSON array encoded in a string, not an array. */
    val mobileNumbers: String = "[]",
    val pan: String? = null,
    val gstin: String? = null,
    val address: String? = null,
    val language: String = "en",
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val creditAccounts: List<CreditAccount> = emptyList(),
    val riskFlags: List<BuyerRiskFlag> = emptyList(),
)

/** Mirrors prisma `model CreditAccount`. */
@Serializable
data class CreditAccount(
    val id: String = "",
    val buyerId: String = "",
    val outstandingAmount: Double = 0.0,
    val creditLimit: Double = 0.0,
    val tenorDays: Int = 30,
    val dueDate: String? = null,
    /** current | due | overdue | defaulted */
    val overdueStatus: String = "current",
    val penalInterestRate: Double = 18.0,
    /** none | disputed | under_arbitration */
    val disputeStatus: String = "none",
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

/**
 * Mirrors prisma `model RiskFlag`. Named `BuyerRiskFlag` because `RiskFlag` in
 * this codebase is the core Green/Amber/Red enum.
 */
@Serializable
data class BuyerRiskFlag(
    val id: String = "",
    val buyerId: String = "",
    /** green | amber | red, lowercase from the server. */
    val flag: String = "",
    val compositeScore: Double = 0.0,
    /** JSON array of SignalBreakdown, encoded in a string. */
    val signalBreakdown: String = "[]",
    val recommendedLimit: Double = 0.0,
    val recommendedTenor: Int = 30,
    val computedAt: String? = null,
)

/** One row of the deterministic scoring engine's explanation (`SignalBreakdown`). */
@Serializable
data class SignalBreakdown(
    val signal: String = "",
    val source: String = "",
    val weight: Double = 0.0,
    val subScore: Double = 0.0,
    val maxScore: Double = 100.0,
    val effect: String = "",
    val ruleId: String = "",
)

@Serializable
data class BuyerListResponse(val buyers: List<BuyerDebtor> = emptyList())

/**
 * `POST /api/buyers`. `mobile` is left null when the operator gives no number so
 * the server applies its own fallback rather than us inventing one.
 */
@Serializable
data class CreateBuyerRequest(
    val name: String = "",
    val pan: String? = null,
    val gstin: String? = null,
    val mobile: List<String>? = null,
    val language: String = "en",
    val email: String? = null,
    val address: String? = null,
    val initialAmount: Double = 0.0,
    val overdueDays: Int = 0,
)

@Serializable
data class CreateBuyerResponse(
    val success: Boolean = false,
    val message: String? = null,
    val buyer: BuyerDebtor? = null,
    val riskFlag: RiskAssessment? = null,
    val error: String? = null,
)

/** Return of `refreshBuyerRiskFlag` -- shared by `POST /api/buyers` and `POST /api/risk`. */
@Serializable
data class RiskAssessment(
    val flag: String = "",
    val compositeScore: Double = 0.0,
    val signals: List<SignalBreakdown> = emptyList(),
    val pendingReports: List<String> = emptyList(),
    val recommendedLimit: Double = 0.0,
    val recommendedTenor: Int = 30,
    val riskFlagId: String? = null,
)

@Serializable
data class RefreshRiskRequest(
    val buyerId: String = "",
    val peerReportedDefaults: Int? = null,
)

@Serializable
data class RefreshRiskResponse(
    val result: RiskAssessment? = null,
    val error: String? = null,
)

/**
 * `GET /api/recovery` with no query string. The escalation ladder lives on the
 * credit account, not the buyer, and there is no per-buyer endpoint for it.
 */
@Serializable
data class RecoveryAccount(
    val id: String = "",
    val buyerId: String = "",
    val outstandingAmount: Double = 0.0,
    val creditLimit: Double = 0.0,
    val tenorDays: Int = 30,
    val dueDate: String? = null,
    val overdueStatus: String = "current",
    val penalInterestRate: Double = 18.0,
    val disputeStatus: String = "none",
    val escalationStates: List<EscalationState> = emptyList(),
)

@Serializable
data class RecoveryAccountsResponse(val accounts: List<RecoveryAccount> = emptyList())

/** Mirrors prisma `model EscalationState`. */
@Serializable
data class EscalationState(
    val id: String = "",
    val creditAccountId: String = "",
    /** L1 | L2 | L3 */
    val currentLevel: String = "L1",
    /** JSON array of EscalationEvent, encoded in a string. */
    val history: String = "[]",
    val nextActionAt: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

/**
 * One appended entry of `EscalationState.history`. The server writes this from
 * three different places (seed, recovery tick, manual voice call) and each writes
 * a different subset of keys, so everything past the first three is nullable.
 */
@Serializable
data class EscalationEvent(
    val level: String = "",
    val action: String = "",
    val channel: String = "",
    val at: String? = null,
    val ruleId: String? = null,
    val explanation: String? = null,
    val contentHash: String? = null,
    val govReferenceId: String? = null,
    val audioRef: String? = null,
    val callStatus: String? = null,
    val durationSec: Int? = null,
)

// --- Derived helpers -------------------------------------------------------
//
// The server hands several structures over as JSON encoded inside a string
// field, so the client has to decode a second time. This parser is local to the
// feature and tolerant: a malformed string degrades to an empty list rather
// than taking the screen down.

private val embedded = Json {
    ignoreUnknownKeys = true
    isLenient = true
    coerceInputValues = true
}

fun parseMobileNumbers(raw: String?): List<String> = decodeOrEmpty(raw)

fun parseSignals(raw: String?): List<SignalBreakdown> = decodeOrEmpty(raw)

fun parseEscalationHistory(raw: String?): List<EscalationEvent> = decodeOrEmpty(raw)

private inline fun <reified T> decodeOrEmpty(raw: String?): List<T> {
    if (raw.isNullOrBlank()) return emptyList()
    return try {
        embedded.decodeFromString<List<T>>(raw)
    } catch (t: Throwable) {
        emptyList()
    }
}

/** Inverse of [parseSignals]; the mock repository builds fixtures with it. */
fun encodeSignals(signals: List<SignalBreakdown>): String = embedded.encodeToString(signals)

/** Inverse of [parseEscalationHistory]. */
fun encodeEscalationHistory(events: List<EscalationEvent>): String = embedded.encodeToString(events)

/** The debtors page reads `creditAccounts[0]`; this client does the same. */
fun BuyerDebtor.primaryAccount(): CreditAccount? = creditAccounts.firstOrNull()

/** The list endpoint already applies `orderBy computedAt desc, take 1`. */
fun BuyerDebtor.latestRisk(): BuyerRiskFlag? = riskFlags.firstOrNull()

fun BuyerDebtor.riskFlag(): RiskFlag = RiskFlag.from(latestRisk()?.flag)

fun BuyerDebtor.outstanding(): Double = primaryAccount()?.outstandingAmount ?: 0.0

/** Days past `dueDate`, floored at zero. Null when the server sent no due date. */
fun CreditAccount.daysOverdue(now: Instant = Instant.now()): Int? {
    val due = parseInstant(dueDate) ?: return null
    val days = ChronoUnit.DAYS.between(due, now)
    return if (days < 0) 0 else days.toInt()
}

enum class AgeingBucket(val label: String) {
    NOT_DUE("Not yet due"),
    D1_30("1-30 days"),
    D31_60("31-60 days"),
    D61_90("61-90 days"),
    D90_PLUS("90+ days"),
    UNKNOWN("No due date"),
}

fun ageingBucket(days: Int?): AgeingBucket = when {
    days == null -> AgeingBucket.UNKNOWN
    days <= 0 -> AgeingBucket.NOT_DUE
    days <= 30 -> AgeingBucket.D1_30
    days <= 60 -> AgeingBucket.D31_60
    days <= 90 -> AgeingBucket.D61_90
    else -> AgeingBucket.D90_PLUS
}

fun parseInstant(raw: String?): Instant? {
    if (raw.isNullOrBlank()) return null
    return try {
        Instant.parse(raw)
    } catch (t: Throwable) {
        null
    }
}

private val dayFormat: DateTimeFormatter =
    DateTimeFormatter.ofPattern("dd MMM yyyy").withZone(ZoneId.systemDefault())

private val minuteFormat: DateTimeFormatter =
    DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm").withZone(ZoneId.systemDefault())

fun formatDay(raw: String?): String = parseInstant(raw)?.let { dayFormat.format(it) } ?: "—"

fun formatMinute(raw: String?): String =
    parseInstant(raw)?.let { minuteFormat.format(it) } ?: "—"

/** Language codes the server accepts on BuyerDebtor.language. */
val DEBTOR_LANGUAGES: List<Pair<String, String>> = listOf(
    "en" to "English",
    "hi" to "Hindi",
    "ml" to "Malayalam",
    "ta" to "Tamil",
    "te" to "Telugu",
    "kn" to "Kannada",
    "tu" to "Tulu",
)
