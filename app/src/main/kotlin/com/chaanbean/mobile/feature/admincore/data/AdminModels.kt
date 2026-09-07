package com.chaanbean.mobile.feature.admincore.data

import kotlinx.serialization.Serializable

/**
 * Shapes for the three internal-admin endpoints on main:
 *   GET/POST /api/admin/auth       -> AdminAuthResponse
 *   GET      /api/admin/customers  -> AdminCustomers
 *   GET      /api/admin/financials -> AdminFinancials, or 403 + AdminAccessError
 *
 * Money is Float in prisma, so Double here. Counts and percentages are always
 * integers on the wire (prisma Int, or Math.round on the server).
 */

@Serializable
data class AdminUser(
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val role: String = "team_member",
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

/**
 * `user` is nullable on purpose: the POST handler looks the role up and returns
 * whatever it finds, including null when no such admin row exists.
 */
@Serializable
data class AdminAuthResponse(val user: AdminUser? = null)

@Serializable
data class AdminRoleRequest(val role: String)

@Serializable
data class CustomerRow(
    val id: String = "",
    val name: String = "",
    val plan: String = "growth",
    val walletBalance: Double = 0.0,
    /** "Healthy" | "At-Risk" | "Churned" - recomputed per request, not read from Company.healthScore. */
    val healthScore: String = "Healthy",
    val healthReasons: List<String> = emptyList(),
    val daysSinceSignup: Int = 0,
    val daysSinceActive: Int = 0,
    val totalReportsPulled: Int = 0,
    val totalDebtors: Int = 0,
    val totalVendors: Int = 0,
    val activeCampaigns: Int = 0,
    val hasTrustProfile: Boolean = false,
    val signupDate: String? = null,
    val lastActiveAt: String? = null,
)

@Serializable
data class CustomerSummary(
    val totalCustomers: Int = 0,
    val healthyCount: Int = 0,
    val atRiskCount: Int = 0,
    val churnedCount: Int = 0,
)

@Serializable
data class FeatureAdoption(
    val module: String = "",
    val adoptedCount: Int = 0,
    val adoptionRatePct: Int = 0,
)

@Serializable
data class ReportUsage(
    val reportType: String = "",
    val totalPulls: Int = 0,
)

/** One row of MonthlyFinancial, projected for the retention chart. `period` is "YYYY-MM". */
@Serializable
data class RetentionPoint(
    val period: String = "",
    val activeCustomers: Int = 0,
    val reportsPulled: Int = 0,
    val dealsWon: Int = 0,
)

@Serializable
data class AdminCustomers(
    val customers: List<CustomerRow> = emptyList(),
    val summary: CustomerSummary = CustomerSummary(),
    val featureAdoption: List<FeatureAdoption> = emptyList(),
    val reportUsageBreakdown: List<ReportUsage> = emptyList(),
    val customerRetentionHistory: List<RetentionPoint> = emptyList(),
)

@Serializable
data class FinancialKpis(
    val currentMRR: Double = 0.0,
    val newMRR: Double = 0.0,
    val expansionMRR: Double = 0.0,
    val churnedMRR: Double = 0.0,
    val netMrrGrowth: Double = 0.0,
    val growthRatePct: Int = 0,
    val activeCustomers: Int = 0,
    val grossRevenue: Double = 0.0,
    val forecastNextMonthMRR: Double = 0.0,
    val forecastMethod: String = "",
)

/**
 * Revenue per module is not billed data. The server splits the latest month's
 * gross revenue by a weighted count of rows (wallet pulls, calls x5, vendors x10,
 * community defaults x8), so it is an allocation, not an invoice total.
 */
@Serializable
data class ModuleRevenue(
    val module: String = "",
    val sharePct: Int = 0,
    val revenueINR: Double = 0.0,
)

@Serializable
data class MonthlyFinancialRow(
    val period: String = "",
    val totalMRR: Double = 0.0,
    val newMRR: Double = 0.0,
    val expansionMRR: Double = 0.0,
    val churnedMRR: Double = 0.0,
    val netGrowth: Double = 0.0,
    val activeCustomers: Int = 0,
    val reportsPulled: Int = 0,
    val dealsWon: Int = 0,
    val dealsLost: Int = 0,
    val grossRevenue: Double = 0.0,
)

@Serializable
data class AdminFinancials(
    val authorized: Boolean = true,
    val kpis: FinancialKpis = FinancialKpis(),
    val moduleRevenue: List<ModuleRevenue> = emptyList(),
    /** Newest month first, at most 12 rows. */
    val summaryTable: List<MonthlyFinancialRow> = emptyList(),
)

/** Body of the 403 the financials route returns for any role other than "owner". */
@Serializable
data class AdminAccessError(
    val error: String? = null,
    val authorized: Boolean = false,
)

/**
 * The financials route is the only place in the admin API that refuses a request,
 * so a refusal is a normal result rather than a failure.
 */
sealed interface FinancialsAccess {
    data class Allowed(val data: AdminFinancials) : FinancialsAccess
    data class Denied(val reason: String) : FinancialsAccess
}
