package com.chaanbean.mobile.feature.admincore.data

import com.chaanbean.mobile.core.di.AppContainer
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.model.outcomeOf
import kotlinx.serialization.json.Json
import retrofit2.HttpException

interface AdminRepository {
    suspend fun whoAmI(role: String): Outcome<AdminUser>
    suspend fun switchRole(role: String): Outcome<AdminUser>
    suspend fun customers(): Outcome<AdminCustomers>
    suspend fun financials(role: String): Outcome<FinancialsAccess>
}

class LiveAdminRepository(
    private val api: AdminApi,
    private val json: Json,
) : AdminRepository {

    override suspend fun whoAmI(role: String): Outcome<AdminUser> = outcomeOf {
        api.whoAmI(role).user
            ?: throw IllegalStateException("Server returned no admin user for role \"$role\".")
    }

    override suspend fun switchRole(role: String): Outcome<AdminUser> = outcomeOf {
        api.switchRole(AdminRoleRequest(role)).user
            ?: throw IllegalStateException("No admin account exists with role \"$role\".")
    }

    override suspend fun customers(): Outcome<AdminCustomers> = outcomeOf { api.customers() }

    override suspend fun financials(role: String): Outcome<FinancialsAccess> = try {
        Outcome.Ok(FinancialsAccess.Allowed(api.financials(role)))
    } catch (e: HttpException) {
        if (e.code() == 403) {
            Outcome.Ok(FinancialsAccess.Denied(readDenialReason(e)))
        } else {
            Outcome.Err(e.message ?: "HTTP ${e.code()}", e)
        }
    } catch (t: Throwable) {
        Outcome.Err(t.message ?: t::class.simpleName ?: "Request failed", t)
    }

    private fun readDenialReason(e: HttpException): String {
        val body = e.response()?.errorBody()?.string() ?: return DEFAULT_DENIAL
        return runCatching { json.decodeFromString<AdminAccessError>(body).error }.getOrNull()
            ?: DEFAULT_DENIAL
    }

    private companion object {
        const val DEFAULT_DENIAL = "Access denied: owner-only financial analytics."
    }
}

class MockAdminRepository : AdminRepository {

    private val owner = AdminUser(
        id = "adm_owner_01",
        name = "Siddharth Verma",
        email = "owner@chaanbean.in",
        role = "owner",
        createdAt = "2023-09-04T06:20:00.000Z",
    )

    private val teamMember = AdminUser(
        id = "adm_rep_02",
        name = "Pooja Deshmukh",
        email = "rep@chaanbean.in",
        role = "team_member",
        createdAt = "2024-01-18T10:05:00.000Z",
    )

    private val customers = AdminCustomers(
        customers = listOf(
            CustomerRow(
                id = "cmp_acme", name = "Acme Traders Pvt Ltd", plan = "enterprise",
                walletBalance = 248500.0, healthScore = "Healthy",
                healthReasons = listOf("Active verification consumption and healthy credit balance"),
                daysSinceSignup = 412, daysSinceActive = 1, totalReportsPulled = 318,
                totalDebtors = 24, totalVendors = 12, activeCampaigns = 3, hasTrustProfile = true,
                signupDate = "2024-07-22T05:30:00.000Z", lastActiveAt = "2025-09-06T11:42:00.000Z",
            ),
            CustomerRow(
                id = "cmp_sundaram", name = "Sundaram Auto Components Ltd", plan = "growth",
                walletBalance = 92400.0, healthScore = "Healthy",
                healthReasons = listOf("Active verification consumption and healthy credit balance"),
                daysSinceSignup = 210, daysSinceActive = 2, totalReportsPulled = 146,
                totalDebtors = 18, totalVendors = 9, activeCampaigns = 2, hasTrustProfile = true,
                signupDate = "2025-02-09T07:15:00.000Z", lastActiveAt = "2025-09-05T16:08:00.000Z",
            ),
            CustomerRow(
                id = "cmp_nilgiri", name = "Nilgiri Textile Mills Pvt Ltd", plan = "growth",
                walletBalance = 11400.0, healthScore = "At-Risk",
                healthReasons = listOf("Low wallet balance (₹11,400)"),
                daysSinceSignup = 168, daysSinceActive = 9, totalReportsPulled = 74,
                totalDebtors = 11, totalVendors = 4, activeCampaigns = 1, hasTrustProfile = false,
                signupDate = "2025-03-23T09:00:00.000Z", lastActiveAt = "2025-08-29T12:20:00.000Z",
            ),
            CustomerRow(
                id = "cmp_deccan", name = "Deccan Steel & Alloys Pvt Ltd", plan = "starter",
                walletBalance = 18750.0, healthScore = "At-Risk",
                healthReasons = listOf("No activity in 27 days"),
                daysSinceSignup = 96, daysSinceActive = 27, totalReportsPulled = 22,
                totalDebtors = 6, totalVendors = 2, activeCampaigns = 0, hasTrustProfile = false,
                signupDate = "2025-06-03T04:45:00.000Z", lastActiveAt = "2025-08-11T08:35:00.000Z",
            ),
            CustomerRow(
                id = "cmp_krishna", name = "Krishna Agro Exports LLP", plan = "starter",
                walletBalance = 4200.0, healthScore = "Churned",
                healthReasons = listOf("Inactive for 63 days"),
                daysSinceSignup = 254, daysSinceActive = 63, totalReportsPulled = 8,
                totalDebtors = 4, totalVendors = 1, activeCampaigns = 0, hasTrustProfile = false,
                signupDate = "2024-12-27T06:10:00.000Z", lastActiveAt = "2025-07-06T13:55:00.000Z",
            ),
        ),
        summary = CustomerSummary(
            totalCustomers = 5, healthyCount = 2, atRiskCount = 2, churnedCount = 1,
        ),
        featureAdoption = listOf(
            FeatureAdoption("Verification Gateway & Risk Engine", 5, 100),
            FeatureAdoption("Payment Recovery & Voice Dialing", 3, 60),
            FeatureAdoption("Trust Hub & Community Defaults", 2, 40),
            FeatureAdoption("Vendor Registration & Bulk KYC", 5, 100),
            FeatureAdoption("Arbitration Center", 1, 20),
        ),
        reportUsageBreakdown = listOf(
            ReportUsage("gst_supreme_report", 168),
            ReportUsage("bureau_report", 141),
            ReportUsage("company_supreme_report", 96),
            ReportUsage("director_details", 88),
            ReportUsage("msme_report", 74),
            ReportUsage("payment_behaviour", 61),
            ReportUsage("court_case_history", 52),
            ReportUsage("mobile_to_pan", 37),
        ),
        customerRetentionHistory = MOCK_MONTHS.reversed().map {
            RetentionPoint(
                period = it.period,
                activeCustomers = it.activeCustomers,
                reportsPulled = it.reportsPulled,
                dealsWon = it.dealsWon,
            )
        },
    )

    override suspend fun whoAmI(role: String): Outcome<AdminUser> =
        Outcome.Ok(if (role == "team_member") teamMember else owner)

    override suspend fun switchRole(role: String): Outcome<AdminUser> = whoAmI(role)

    override suspend fun customers(): Outcome<AdminCustomers> = Outcome.Ok(customers)

    override suspend fun financials(role: String): Outcome<FinancialsAccess> {
        // Mirrors the server's only role gate so the mock does not look more permissive than main.
        if (role != "owner") {
            return Outcome.Ok(
                FinancialsAccess.Denied(
                    "Access Denied: Owner-only financial analytics. Contact Siddharth Verma for access.",
                ),
            )
        }
        val latest = MOCK_MONTHS.first()
        val netGrowth = latest.newMRR + latest.expansionMRR - latest.churnedMRR
        return Outcome.Ok(
            FinancialsAccess.Allowed(
                AdminFinancials(
                    authorized = true,
                    kpis = FinancialKpis(
                        currentMRR = latest.totalMRR,
                        newMRR = latest.newMRR,
                        expansionMRR = latest.expansionMRR,
                        churnedMRR = latest.churnedMRR,
                        netMrrGrowth = netGrowth,
                        growthRatePct = 18,
                        activeCustomers = latest.activeCustomers,
                        grossRevenue = latest.grossRevenue,
                        forecastNextMonthMRR = 2_468_000.0,
                        forecastMethod =
                        "Trailing 3-Month Run-Rate + Weighted Pipeline Conversion (Deterministic)",
                    ),
                    moduleRevenue = listOf(
                        ModuleRevenue("Background Check & Verification Gateway", 58, 1_728_400.0),
                        ModuleRevenue("Payment Recovery & Voice Outbound Engine", 21, 625_800.0),
                        ModuleRevenue("Vendor Registration & Bulk KYC", 14, 417_200.0),
                        ModuleRevenue("Trust Hub & Community Defaults", 7, 208_600.0),
                    ),
                    summaryTable = MOCK_MONTHS,
                ),
            ),
        )
    }

    private companion object {
        /** Newest first, matching the server's `orderBy: [{ year: desc }, { month: desc }]`. */
        val MOCK_MONTHS = listOf(
            month("2024-09", 2260000.0, 310000.0, 140000.0, 70000.0, 62, 5740, 15, 4, 2980000.0),
            month("2024-08", 2080000.0, 280000.0, 125000.0, 70000.0, 57, 5120, 14, 5, 2750000.0),
            month("2024-07", 1920000.0, 260000.0, 110000.0, 65000.0, 53, 4620, 13, 3, 2530000.0),
            month("2024-06", 1780000.0, 245000.0, 95000.0, 60000.0, 49, 4150, 12, 4, 2340000.0),
            month("2024-05", 1620000.0, 230000.0, 85000.0, 55000.0, 45, 3680, 11, 3, 2120000.0),
            month("2024-04", 1460000.0, 210000.0, 70000.0, 50000.0, 41, 3240, 10, 4, 1910000.0),
            month("2024-03", 1310000.0, 195000.0, 65000.0, 45000.0, 37, 2890, 9, 3, 1720000.0),
            month("2024-02", 1160000.0, 180000.0, 55000.0, 40000.0, 33, 2450, 8, 2, 1520000.0),
            month("2024-01", 1020000.0, 165000.0, 50000.0, 35000.0, 29, 2100, 7, 3, 1340000.0),
            month("2023-12", 890000.0, 150000.0, 40000.0, 25000.0, 25, 1820, 6, 2, 1150000.0),
            month("2023-11", 770000.0, 110000.0, 25000.0, 15000.0, 21, 1480, 5, 1, 980000.0),
            month("2023-10", 680000.0, 120000.0, 30000.0, 20000.0, 18, 1240, 4, 2, 850000.0),
        )

        fun month(
            period: String,
            totalMRR: Double,
            newMRR: Double,
            expansionMRR: Double,
            churnedMRR: Double,
            activeCustomers: Int,
            reportsPulled: Int,
            dealsWon: Int,
            dealsLost: Int,
            grossRevenue: Double,
        ) = MonthlyFinancialRow(
            period = period,
            totalMRR = totalMRR,
            newMRR = newMRR,
            expansionMRR = expansionMRR,
            churnedMRR = churnedMRR,
            netGrowth = newMRR + expansionMRR - churnedMRR,
            activeCustomers = activeCustomers,
            reportsPulled = reportsPulled,
            dealsWon = dealsWon,
            dealsLost = dealsLost,
            grossRevenue = grossRevenue,
        )
    }
}

object AdminModule {
    fun repository(container: AppContainer): AdminRepository =
        if (container.useMock) MockAdminRepository()
        else LiveAdminRepository(container.retrofit.create(AdminApi::class.java), container.json)
}
