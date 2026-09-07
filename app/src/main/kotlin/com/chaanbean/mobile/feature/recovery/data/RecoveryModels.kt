package com.chaanbean.mobile.feature.recovery.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

// ---------------------------------------------------------------------------
// GET /api/recovery  (no query string) -> { accounts: CreditAccount[] }
// Each element is the raw prisma row plus `buyer` and `escalationStates` (take: 1).
// ---------------------------------------------------------------------------

/** Mirrors prisma `model BuyerDebtor`. */
@Serializable
data class RecoveryBuyer(
    val id: String = "",
    val companyId: String = "",
    val name: String = "",
    val contactPerson: String? = null,
    val email: String? = null,
    /** Server stores this as a JSON array encoded in a string. Use [parseMobileNumbers]. */
    val mobileNumbers: String = "[]",
    val pan: String? = null,
    val gstin: String? = null,
    val address: String? = null,
    val language: String = "en",
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

/** Mirrors prisma `model EscalationState`. */
@Serializable
data class EscalationState(
    val id: String = "",
    val creditAccountId: String = "",
    val currentLevel: String = "L1",
    /** JSON array encoded in a string. Use [parseEscalationHistory]. */
    val history: String = "[]",
    val nextActionAt: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

/** Mirrors prisma `model CreditAccount`. */
@Serializable
data class RecoveryAccount(
    val id: String = "",
    val buyerId: String = "",
    val outstandingAmount: Double = 0.0,
    val creditLimit: Double = 0.0,
    val tenorDays: Int = 30,
    val dueDate: String = "",
    val overdueStatus: String = "current",
    val penalInterestRate: Double = 18.0,
    val disputeStatus: String = "none",
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val buyer: RecoveryBuyer? = null,
    val escalationStates: List<EscalationState> = emptyList(),
)

@Serializable
data class RecoveryAccountsResponse(
    val accounts: List<RecoveryAccount> = emptyList(),
    val error: String? = null,
)

// ---------------------------------------------------------------------------
// GET /api/recovery?creditAccountId=...  -> a flattened, different shape.
// Note the handler loads `legalNotices` but never returns them, and it returns
// only `currentLevel` - never the escalation history.
// ---------------------------------------------------------------------------

@Serializable
data class RecoveryAccountSummary(
    val id: String = "",
    val buyerId: String = "",
    val buyerName: String = "",
    val phone: String = "",
    val email: String? = null,
    val language: String = "en",
    val outstandingAmount: Double = 0.0,
    val dueDate: String = "",
    /** `account.overdueStatus`, renamed to `status` by the handler. */
    val status: String = "current",
    val currentLevel: String = "L1",
)

/** Result of `calculateMSMEPenalInterest` in src/lib/arbitration/interest.ts. */
@Serializable
data class StatutoryInterest(
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
    val calculatedAt: String = "",
)

@Serializable
data class PollyVoiceConfig(
    val voiceId: String = "",
    val languageCode: String = "",
    val engine: String = "",
)

@Serializable
data class VoiceCallPreview(
    val templateId: String = "",
    val language: String = "en",
    val scriptText: String = "",
    val audioUrl: String = "",
    val contentHash: String = "",
    val voiceConfig: PollyVoiceConfig? = null,
)

@Serializable
data class RecoveryDetailResponse(
    val account: RecoveryAccountSummary? = null,
    val statutoryInterest: StatutoryInterest? = null,
    val voiceCall: VoiceCallPreview? = null,
    val error: String? = null,
)

/**
 * Domain view assembled by the repository: the detail endpoint plus the escalation
 * history, which only the list endpoint carries.
 */
data class RecoveryDetail(
    val account: RecoveryAccountSummary,
    val statutoryInterest: StatutoryInterest? = null,
    val voiceCall: VoiceCallPreview? = null,
    val history: List<EscalationHistoryEntry> = emptyList(),
    val nextActionAt: String? = null,
    /** False when the second (list) request failed, so the timeline is absent, not empty. */
    val historyAvailable: Boolean = false,
)

// ---------------------------------------------------------------------------
// Escalation history. Three writers append to the same JSON array with three
// different shapes (recovery tick, direct voice call, settlement), so every
// field beyond level/action/channel/at is optional.
// ---------------------------------------------------------------------------

@Serializable
data class EscalationHistoryEntry(
    val level: String = "",
    val action: String = "",
    val channel: String = "",
    val at: String = "",
    val ruleId: String? = null,
    val explanation: String? = null,
    val contentHash: String? = null,
    val govReferenceId: String? = null,
    val audioRef: String? = null,
    val callStatus: String? = null,
    val durationSec: Int? = null,
    val amount: Double? = null,
    val utrNumber: String? = null,
    val receiptNumber: String? = null,
)

// ---------------------------------------------------------------------------
// POST /api/recovery
// ---------------------------------------------------------------------------

/**
 * The handler's own body type also lists "settle_payment", but no branch handles
 * it - that value silently falls through to the recovery tick. Settlement goes to
 * /api/recovery/settle instead, so it is deliberately absent here.
 */
enum class RecoveryAction(val wire: String, val label: String) {
    TICK("tick", "Run policy tick"),
    LEGAL_NOTICE("legal_notice", "Issue legal demand notice"),
    DIRECT_VOICE_CALL("direct_voice_call", "Place L2 voice announcement"),
}

@Serializable
data class RecoveryActionRequest(
    val creditAccountId: String = "",
    val action: String = "tick",
)

/** `RecoveryTickResult` from src/lib/payment-recovery/engine.ts. */
@Serializable
data class RecoveryTickResult(
    val success: Boolean = false,
    val creditAccountId: String = "",
    val level: String = "",
    val action: String = "",
    val channel: String = "",
    val contentHash: String = "",
    val ruleId: String = "",
    val explanation: String = "",
    val govReferenceId: String? = null,
    val callStatus: String? = null,
    val audioRef: String? = null,
    /** Set when the TRAI calling-window / frequency-cap check refused the call. */
    val skippedReason: String? = null,
)

/** `OutboundCallResult` from src/lib/communication/asterisk-vobiz.ts. */
@Serializable
data class OutboundCallResult(
    val callId: String = "",
    val status: String = "",
    val durationSec: Int = 0,
    val sipSessionId: String = "",
    val executedAt: String = "",
    val carrier: String = "",
    val audioPlayed: String = "",
    val sipHeaders: Map<String, String> = emptyMap(),
)

/** One class for all three POST /api/recovery responses; each fills a different subset. */
@Serializable
data class RecoveryActionResponse(
    val success: Boolean = false,
    val message: String? = null,
    val result: RecoveryTickResult? = null,
    val callResult: OutboundCallResult? = null,
    val scriptText: String? = null,
    val audioUrl: String? = null,
    val contentHash: String? = null,
    val govReferenceId: String? = null,
    val error: String? = null,
)

// ---------------------------------------------------------------------------
// POST /api/recovery/settle
// ---------------------------------------------------------------------------

/** Server-accepted `paymentMode` values. Anything else is echoed back unvalidated. */
val PAYMENT_MODES = listOf("UPI", "NEFT", "RTGS", "NET_BANKING", "CARDS")

@Serializable
data class SettlementRequest(
    val creditAccountId: String = "",
    /** Omitted or <= 0 makes the server settle the entire outstanding amount. */
    val paymentAmount: Double? = null,
    val paymentMode: String = "UPI",
    /** Server mints one from a hash of amount + timestamp when this is blank. */
    val utrNumber: String? = null,
    val payerName: String? = null,
)

@Serializable
data class SettlementResponse(
    val success: Boolean = false,
    val message: String? = null,
    val receiptNumber: String? = null,
    val utrNumber: String? = null,
    val settlementHash: String? = null,
    val previousBalance: Double? = null,
    val remainingBalance: Double? = null,
    val isFullySettled: Boolean = false,
    /** Bare CreditAccount row: no buyer, no escalation states. */
    val updatedAccount: RecoveryAccount? = null,
    val error: String? = null,
)

// ---------------------------------------------------------------------------
// Parsing helpers for the fields the server hands over as encoded strings.
// ---------------------------------------------------------------------------

private val embeddedJson = Json {
    ignoreUnknownKeys = true
    isLenient = true
    explicitNulls = false
    coerceInputValues = true
}

fun parseEscalationHistory(raw: String?): List<EscalationHistoryEntry> {
    if (raw.isNullOrBlank()) return emptyList()
    return runCatching {
        embeddedJson.decodeFromString<List<EscalationHistoryEntry>>(raw)
    }.getOrDefault(emptyList())
}

fun parseMobileNumbers(raw: String?): List<String> {
    if (raw.isNullOrBlank()) return emptyList()
    return runCatching { embeddedJson.decodeFromString<List<String>>(raw) }.getOrDefault(emptyList())
}

private val dateFormat = DateTimeFormatter.ofPattern("dd MMM yyyy").withZone(ZoneId.systemDefault())
private val dateTimeFormat = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm").withZone(ZoneId.systemDefault())

fun parseServerInstant(raw: String?): Instant? {
    if (raw.isNullOrBlank()) return null
    return runCatching { Instant.parse(raw) }
        .recoverCatching { OffsetDateTime.parse(raw).toInstant() }
        .getOrNull()
}

fun formatServerDate(raw: String?): String =
    parseServerInstant(raw)?.let { dateFormat.format(it) } ?: raw.orEmpty().ifBlank { "—" }

fun formatServerDateTime(raw: String?): String =
    parseServerInstant(raw)?.let { dateTimeFormat.format(it) } ?: raw.orEmpty().ifBlank { "—" }

/**
 * Same arithmetic the server uses (floor of the millisecond delta, clamped at zero).
 * Null when the timestamp will not parse - the screen says so rather than showing 0.
 */
fun daysOverdue(dueDateIso: String?, now: Instant = Instant.now()): Int? {
    val due = parseServerInstant(dueDateIso) ?: return null
    return ChronoUnit.DAYS.between(due, now).coerceAtLeast(0L).toInt()
}
