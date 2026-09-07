package com.chaanbean.mobile.feature.dashboard.data

import com.chaanbean.mobile.core.model.RiskFlag
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

// ---------------------------------------------------------------------------
// Wire types. Every field carries a default because main's handlers return
// prisma rows verbatim and omit whatever the row left null.
// ---------------------------------------------------------------------------

/**
 * GET /api/health. Only `checks.database` is a real probe (a `company.count()`);
 * the other four check values are string literals in the route handler.
 */
@Serializable
data class HealthChecks(
    val database: String = "unknown",
    val verificationGateway: String = "unknown",
    val policyEngine: String = "unknown",
    val riskScoringEngine: String = "unknown",
    val voiceSystem: String = "unknown",
)

@Serializable
data class HealthResponse(
    val status: String = "unknown",
    val version: String = "",
    val uptimeSeconds: Double = 0.0,
    val timestamp: String? = null,
    val latencyMs: Long = 0,
    val checks: HealthChecks = HealthChecks(),
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
    val overdueStatus: String = "current",
    val penalInterestRate: Double = 18.0,
    val disputeStatus: String = "none",
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

/** Mirrors prisma `model RiskFlag` (the buyer-side flag). `flag` is lowercase here. */
@Serializable
data class BuyerRiskFlag(
    val id: String = "",
    val buyerId: String = "",
    val flag: String? = null,
    val compositeScore: Double = 0.0,
    val recommendedLimit: Double = 0.0,
    val recommendedTenor: Int = 30,
    val computedAt: String? = null,
)

/** Mirrors prisma `model BuyerDebtor` as returned by GET /api/buyers. */
@Serializable
data class Buyer(
    val id: String = "",
    val companyId: String = "",
    val name: String = "",
    val contactPerson: String? = null,
    val email: String? = null,
    /** Server stores this as a JSON array encoded into a string. */
    val mobileNumbers: String? = null,
    val pan: String? = null,
    val gstin: String? = null,
    val language: String = "en",
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val creditAccounts: List<CreditAccount> = emptyList(),
    val riskFlags: List<BuyerRiskFlag> = emptyList(),
)

@Serializable
data class BuyersResponse(val buyers: List<Buyer> = emptyList())

/** Mirrors prisma `model EscalationState`. `history` is a JSON array in a string. */
@Serializable
data class EscalationState(
    val id: String = "",
    val creditAccountId: String = "",
    val currentLevel: String = "L1",
    val history: String? = null,
    val nextActionAt: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

/** GET /api/recovery with no query returns credit accounts joined to buyer + latest escalation. */
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
    val updatedAt: String? = null,
    val buyer: Buyer? = null,
    val escalationStates: List<EscalationState> = emptyList(),
)

@Serializable
data class RecoveryAccountsResponse(val accounts: List<RecoveryAccount> = emptyList())

/** Mirrors prisma `model BizRiskFlag`. `flag` is uppercase on this side of the schema. */
@Serializable
data class BizRiskFlag(
    val id: String = "",
    val businessId: String = "",
    val flag: String? = null,
    val compositeScore: Double = 0.0,
    val hardRedFlags: String? = null,
    val recommendedLimit: Double = 0.0,
    val recommendedTenor: Int = 30,
    val computedAt: String? = null,
)

@Serializable
data class FinancialYearSummary(
    val id: String = "",
    val fiscalYear: String = "",
    val revenue: Double? = null,
    val netProfit: Double? = null,
    val dataCompleteness: Double = 0.0,
)

@Serializable
data class BusinessCounts(
    val financialDocuments: Int = 0,
    val courtCases: Int = 0,
)

/** Mirrors prisma `model BusinessProfile` as returned by GET /api/businesses. */
@Serializable
data class BusinessProfile(
    val id: String = "",
    val companyName: String = "",
    val gstin: String? = null,
    val cin: String? = null,
    val pan: String? = null,
    val udyamNo: String? = null,
    val overallStatus: String = "PENDING",
    val sourceStatus: String = "PENDING",
    val createdBy: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val riskFlag: BizRiskFlag? = null,
    val yearSummaries: List<FinancialYearSummary> = emptyList(),
    @SerialName("_count") val counts: BusinessCounts? = null,
)

@Serializable
data class BusinessesResponse(val businesses: List<BusinessProfile> = emptyList())

// ---------------------------------------------------------------------------
// Snapshot + derived figures
// ---------------------------------------------------------------------------

/**
 * One load of the landing screen. Each source carries its own error slot so a
 * single dead endpoint degrades one panel instead of blanking the dashboard.
 */
data class DashboardSnapshot(
    val health: HealthResponse? = null,
    val healthError: String? = null,
    val buyers: List<Buyer> = emptyList(),
    val buyersError: String? = null,
    val accounts: List<RecoveryAccount> = emptyList(),
    val accountsError: String? = null,
    val businesses: List<BusinessProfile> = emptyList(),
    val businessesError: String? = null,
)

/**
 * Counts of the deterministic flag. `unrated` is kept separate on purpose:
 * main's own web dashboard buckets buyers with no computed flag into Amber,
 * which reports a risk judgement the risk engine never made.
 */
data class RiskMix(
    val green: Int = 0,
    val amber: Int = 0,
    val red: Int = 0,
    val unrated: Int = 0,
) {
    val total: Int get() = green + amber + red + unrated
}

data class PortfolioTotals(
    val exposure: Double = 0.0,
    val sanctionedLimit: Double = 0.0,
    val atRiskExposure: Double = 0.0,
    val overdueExposure: Double = 0.0,
    val overdueAccounts: Int = 0,
    val escalationsOpen: Int = 0,
    val escalatedBeyondL1: Int = 0,
)

/** Latest flag the risk engine actually computed for this buyer, if any. */
fun Buyer.flag(): RiskFlag = RiskFlag.from(riskFlags.firstOrNull()?.flag)

fun Buyer.exposure(): Double = creditAccounts.sumOf { it.outstandingAmount }

fun Buyer.sanctionedLimit(): Double = creditAccounts.sumOf { it.creditLimit }

fun List<Buyer>.riskMix(): RiskMix {
    var green = 0
    var amber = 0
    var red = 0
    var unrated = 0
    for (buyer in this) {
        when (buyer.flag()) {
            RiskFlag.GREEN -> green++
            RiskFlag.AMBER -> amber++
            RiskFlag.RED -> red++
            RiskFlag.UNKNOWN -> unrated++
        }
    }
    return RiskMix(green, amber, red, unrated)
}

fun List<Buyer>.exposureFor(flag: RiskFlag): Double =
    filter { it.flag() == flag }.sumOf { it.exposure() }

fun DashboardSnapshot.totals(): PortfolioTotals {
    val overdue = accounts.filter { it.overdueStatus == "overdue" || it.overdueStatus == "defaulted" }
    val escalated = accounts.filter { it.escalationStates.isNotEmpty() }
    return PortfolioTotals(
        exposure = buyers.sumOf { it.exposure() },
        sanctionedLimit = buyers.sumOf { it.sanctionedLimit() },
        atRiskExposure = buyers.exposureFor(RiskFlag.AMBER) + buyers.exposureFor(RiskFlag.RED),
        overdueExposure = overdue.sumOf { it.outstandingAmount },
        overdueAccounts = overdue.size,
        escalationsOpen = escalated.size,
        escalatedBeyondL1 = escalated.count { it.escalationStates.first().currentLevel != "L1" },
    )
}

/** Accounts per ladder rung, including the accounts the engine has never touched. */
fun List<RecoveryAccount>.ladder(): Map<String, Int> {
    val rungs = linkedMapOf("L1" to 0, "L2" to 0, "L3" to 0, "Not started" to 0)
    for (account in this) {
        val level = account.escalationStates.firstOrNull()?.currentLevel
        val key = if (level != null && rungs.containsKey(level)) level else "Not started"
        rungs[key] = (rungs[key] ?: 0) + 1
    }
    return rungs
}

enum class ActivityKind { BUYER, BUSINESS, ESCALATION }

data class ActivityItem(
    val id: String,
    val kind: ActivityKind,
    val title: String,
    val detail: String,
    /** Raw ISO-8601 from the server; kept for sorting. */
    val at: String?,
    val flag: RiskFlag = RiskFlag.UNKNOWN,
)

/**
 * main has no activity or evidence endpoint - its web dashboard reads
 * `LegalEvidenceLog` straight from prisma and no route exposes that table. So the
 * feed is assembled from the record timestamps the three list endpoints do return.
 */
fun DashboardSnapshot.recentActivity(limit: Int = 8): List<ActivityItem> {
    val items = mutableListOf<ActivityItem>()

    for (business in businesses) {
        items += ActivityItem(
            id = "biz-" + business.id,
            kind = ActivityKind.BUSINESS,
            title = business.companyName,
            detail = "Verification " + business.overallStatus.lowercase() +
                (business.counts?.courtCases?.takeIf { it > 0 }?.let { " \u00B7 $it court case(s) on file" } ?: ""),
            at = business.updatedAt ?: business.createdAt,
            flag = RiskFlag.from(business.riskFlag?.flag),
        )
    }

    for (account in accounts) {
        val state = account.escalationStates.firstOrNull() ?: continue
        items += ActivityItem(
            id = "esc-" + state.id,
            kind = ActivityKind.ESCALATION,
            title = account.buyer?.name ?: "Credit account " + account.id.take(8),
            detail = "Recovery ladder at " + state.currentLevel + " \u00B7 " +
                inr(account.outstandingAmount) + " outstanding",
            at = state.updatedAt ?: state.createdAt,
        )
    }

    for (buyer in buyers) {
        items += ActivityItem(
            id = "buyer-" + buyer.id,
            kind = ActivityKind.BUYER,
            title = buyer.name,
            detail = "Buyer on book \u00B7 " + inr(buyer.exposure()) + " exposure",
            at = buyer.createdAt,
            flag = buyer.flag(),
        )
    }

    // Prisma serialises every DateTime as UTC ISO-8601, so lexical order is chronological.
    return items.sortedByDescending { it.at ?: "" }.take(limit)
}

private val activityFormat: DateTimeFormatter =
    DateTimeFormatter.ofPattern("dd MMM \u00B7 HH:mm").withZone(ZoneId.systemDefault())

fun formatWhen(iso: String?): String {
    if (iso.isNullOrBlank()) return "\u2014"
    return runCatching { activityFormat.format(Instant.parse(iso)) }.getOrDefault(iso)
}

/** Local rupee helper for strings built in the data layer. */
private fun inr(amount: Double): String {
    val whole = amount.toLong().toString()
    if (whole.length <= 3) return "\u20B9" + whole
    val last3 = whole.takeLast(3)
    var rest = whole.dropLast(3)
    val groups = mutableListOf<String>()
    while (rest.length > 2) {
        groups.add(0, rest.takeLast(2))
        rest = rest.dropLast(2)
    }
    if (rest.isNotEmpty()) groups.add(0, rest)
    return "\u20B9" + groups.joinToString(",") + "," + last3
}
