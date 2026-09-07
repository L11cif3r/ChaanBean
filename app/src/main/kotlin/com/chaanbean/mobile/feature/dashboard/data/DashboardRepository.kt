package com.chaanbean.mobile.feature.dashboard.data

import com.chaanbean.mobile.core.di.AppContainer
import com.chaanbean.mobile.core.model.Outcome
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

/**
 * One call loads the whole landing screen.
 *
 * Note what is missing: there is no wallet balance here. `Company.walletBalance`
 * exists in the schema but no GET returns it - the only handler that ever emits it
 * is POST /api/auth, inside a login response. The screen says so rather than
 * estimating a number.
 */
interface DashboardRepository {
    suspend fun load(): Outcome<DashboardSnapshot>
}

class LiveDashboardRepository(private val api: DashboardApi) : DashboardRepository {

    override suspend fun load(): Outcome<DashboardSnapshot> = coroutineScope {
        val health = async { runCatching { api.health() } }
        val buyers = async { runCatching { api.buyers().buyers } }
        val accounts = async { runCatching { api.recovery().accounts } }
        val businesses = async { runCatching { api.businesses().businesses } }

        val healthResult = health.await()
        val buyersResult = buyers.await()
        val accountsResult = accounts.await()
        val businessesResult = businesses.await()

        // A single dead endpoint should cost one panel, not the whole screen. Only a
        // total blackout of the three data endpoints is reported as a load failure.
        if (buyersResult.isFailure && accountsResult.isFailure && businessesResult.isFailure) {
            return@coroutineScope Outcome.Err(
                reason(buyersResult.exceptionOrNull()),
                buyersResult.exceptionOrNull(),
            )
        }

        Outcome.Ok(
            DashboardSnapshot(
                health = healthResult.getOrNull(),
                healthError = healthResult.exceptionOrNull()?.let { reason(it) },
                buyers = buyersResult.getOrDefault(emptyList()),
                buyersError = buyersResult.exceptionOrNull()?.let { reason(it) },
                accounts = accountsResult.getOrDefault(emptyList()),
                accountsError = accountsResult.exceptionOrNull()?.let { reason(it) },
                businesses = businessesResult.getOrDefault(emptyList()),
                businessesError = businessesResult.exceptionOrNull()?.let { reason(it) },
            ),
        )
    }

    private fun reason(t: Throwable?): String =
        t?.message ?: t?.let { it::class.simpleName } ?: "Request failed"
}

class MockDashboardRepository : DashboardRepository {

    override suspend fun load(): Outcome<DashboardSnapshot> = Outcome.Ok(
        DashboardSnapshot(
            health = HealthResponse(
                status = "healthy",
                version = "1.0.0",
                uptimeSeconds = 18432.7,
                timestamp = "2026-09-07T09:41:12.004Z",
                latencyMs = 6,
                checks = HealthChecks(
                    database = "up",
                    verificationGateway = "operational",
                    policyEngine = "operational",
                    riskScoringEngine = "operational",
                    voiceSystem = "operational",
                ),
            ),
            buyers = mockBuyers,
            accounts = mockAccounts,
            businesses = mockBusinesses,
        ),
    )
}

private val mockBuyers = listOf(
    Buyer(
        id = "b1", companyId = "c1", name = "Bharat Metal Works Pvt Ltd",
        contactPerson = "Rakesh Deshmukh", email = "accounts@bharatmetalworks.in",
        mobileNumbers = """["+919820045512"]""",
        pan = "AABCB4521M", gstin = "27AABCB4521M1Z9", language = "hi",
        createdAt = "2026-04-11T06:22:00.000Z",
        creditAccounts = listOf(
            CreditAccount(
                id = "ca1", buyerId = "b1", outstandingAmount = 4_850_000.0,
                creditLimit = 6_000_000.0, tenorDays = 45,
                dueDate = "2026-09-24T00:00:00.000Z", overdueStatus = "current",
            ),
        ),
        riskFlags = listOf(
            BuyerRiskFlag(
                id = "rf1", buyerId = "b1", flag = "green", compositeScore = 82.5,
                recommendedLimit = 6_000_000.0, recommendedTenor = 45,
                computedAt = "2026-09-05T04:10:00.000Z",
            ),
        ),
    ),
    Buyer(
        id = "b2", companyId = "c1", name = "Sundaram Auto Components Ltd",
        contactPerson = "K. Lakshmanan", email = "finance@sundaramauto.co.in",
        mobileNumbers = """["+919840112230"]""",
        pan = "AACCS8812J", gstin = "33AACCS8812J1Z4", language = "ta",
        createdAt = "2026-05-02T10:05:00.000Z",
        creditAccounts = listOf(
            CreditAccount(
                id = "ca2", buyerId = "b2", outstandingAmount = 2_340_000.0,
                creditLimit = 3_000_000.0, tenorDays = 30,
                dueDate = "2026-08-03T00:00:00.000Z", overdueStatus = "overdue",
                penalInterestRate = 20.25,
            ),
        ),
        riskFlags = listOf(
            BuyerRiskFlag(
                id = "rf2", buyerId = "b2", flag = "amber", compositeScore = 58.0,
                recommendedLimit = 1_350_000.0, recommendedTenor = 30,
                computedAt = "2026-09-05T04:10:00.000Z",
            ),
        ),
    ),
    Buyer(
        id = "b3", companyId = "c1", name = "Deccan Pharma Distributors",
        contactPerson = "Sneha Reddy", email = "ap@deccanpharmadist.in",
        mobileNumbers = """["+919966223341"]""",
        pan = "AAECD5567Q", gstin = "36AAECD5567Q1Z2", language = "te",
        createdAt = "2026-03-19T08:44:00.000Z",
        creditAccounts = listOf(
            CreditAccount(
                id = "ca3", buyerId = "b3", outstandingAmount = 1_120_000.0,
                creditLimit = 0.0, tenorDays = 30,
                dueDate = "2026-06-15T00:00:00.000Z", overdueStatus = "defaulted",
                penalInterestRate = 20.25, disputeStatus = "under_arbitration",
            ),
        ),
        riskFlags = listOf(
            BuyerRiskFlag(
                id = "rf3", buyerId = "b3", flag = "red", compositeScore = 24.0,
                recommendedLimit = 0.0, recommendedTenor = 0,
                computedAt = "2026-09-05T04:10:00.000Z",
            ),
        ),
    ),
    Buyer(
        id = "b4", companyId = "c1", name = "Rajasthan Textile Mills Ltd",
        contactPerson = "Mahendra Singh Rathore", email = "payables@rajtextilemills.com",
        mobileNumbers = """["+919829554417"]""",
        pan = "AABCR1129H", gstin = "08AABCR1129H1Z7", language = "hi",
        createdAt = "2026-06-27T12:30:00.000Z",
        creditAccounts = listOf(
            CreditAccount(
                id = "ca4", buyerId = "b4", outstandingAmount = 780_000.0,
                creditLimit = 1_500_000.0, tenorDays = 45,
                dueDate = "2026-09-30T00:00:00.000Z", overdueStatus = "current",
            ),
        ),
        riskFlags = listOf(
            BuyerRiskFlag(
                id = "rf4", buyerId = "b4", flag = "green", compositeScore = 76.0,
                recommendedLimit = 1_500_000.0, recommendedTenor = 45,
                computedAt = "2026-09-05T04:10:00.000Z",
            ),
        ),
    ),
    // Deliberately unrated: the risk engine has never run for this buyer, which is
    // the state main's web dashboard silently renders as Amber.
    Buyer(
        id = "b5", companyId = "c1", name = "Nagpur Agro Exports LLP",
        contactPerson = "Anil Kale", email = "trade@nagpuragroexports.in",
        mobileNumbers = """["+919922008876"]""",
        pan = "AAFCN3390L", gstin = "27AAFCN3390L1ZK", language = "mr",
        createdAt = "2026-09-01T05:15:00.000Z",
        creditAccounts = listOf(
            CreditAccount(
                id = "ca5", buyerId = "b5", outstandingAmount = 615_000.0,
                creditLimit = 0.0, tenorDays = 30,
                dueDate = "2026-10-01T00:00:00.000Z", overdueStatus = "current",
            ),
        ),
        riskFlags = emptyList(),
    ),
)

private val mockAccounts = listOf(
    RecoveryAccount(
        id = "ca1", buyerId = "b1", outstandingAmount = 4_850_000.0,
        creditLimit = 6_000_000.0, tenorDays = 45,
        dueDate = "2026-09-24T00:00:00.000Z", overdueStatus = "current",
        updatedAt = "2026-09-05T04:10:00.000Z",
        buyer = mockBuyers[0].copy(creditAccounts = emptyList(), riskFlags = emptyList()),
        escalationStates = emptyList(),
    ),
    RecoveryAccount(
        id = "ca2", buyerId = "b2", outstandingAmount = 2_340_000.0,
        creditLimit = 3_000_000.0, tenorDays = 30,
        dueDate = "2026-08-03T00:00:00.000Z", overdueStatus = "overdue",
        penalInterestRate = 20.25, updatedAt = "2026-09-06T11:02:00.000Z",
        buyer = mockBuyers[1].copy(creditAccounts = emptyList(), riskFlags = emptyList()),
        escalationStates = listOf(
            EscalationState(
                id = "es1", creditAccountId = "ca2", currentLevel = "L2",
                history = """[{"level":"L1","channel":"whatsapp","ruleId":"POL-L1-REMINDER"}]""",
                nextActionAt = "2026-09-08T04:30:00.000Z",
                updatedAt = "2026-09-06T11:02:00.000Z",
            ),
        ),
    ),
    RecoveryAccount(
        id = "ca3", buyerId = "b3", outstandingAmount = 1_120_000.0,
        creditLimit = 0.0, tenorDays = 30,
        dueDate = "2026-06-15T00:00:00.000Z", overdueStatus = "defaulted",
        penalInterestRate = 20.25, disputeStatus = "under_arbitration",
        updatedAt = "2026-09-06T06:45:00.000Z",
        buyer = mockBuyers[2].copy(creditAccounts = emptyList(), riskFlags = emptyList()),
        escalationStates = listOf(
            EscalationState(
                id = "es2", creditAccountId = "ca3", currentLevel = "L3",
                history = """[{"level":"L2","channel":"voice","ruleId":"POL-L2-MANUAL"}]""",
                nextActionAt = "2026-09-09T04:30:00.000Z",
                updatedAt = "2026-09-06T06:45:00.000Z",
            ),
        ),
    ),
    RecoveryAccount(
        id = "ca4", buyerId = "b4", outstandingAmount = 780_000.0,
        creditLimit = 1_500_000.0, tenorDays = 45,
        dueDate = "2026-09-30T00:00:00.000Z", overdueStatus = "current",
        updatedAt = "2026-08-30T09:00:00.000Z",
        buyer = mockBuyers[3].copy(creditAccounts = emptyList(), riskFlags = emptyList()),
        escalationStates = emptyList(),
    ),
    RecoveryAccount(
        id = "ca5", buyerId = "b5", outstandingAmount = 615_000.0,
        creditLimit = 0.0, tenorDays = 30,
        dueDate = "2026-10-01T00:00:00.000Z", overdueStatus = "current",
        updatedAt = "2026-09-01T05:15:00.000Z",
        buyer = mockBuyers[4].copy(creditAccounts = emptyList(), riskFlags = emptyList()),
        escalationStates = emptyList(),
    ),
)

private val mockBusinesses = listOf(
    BusinessProfile(
        id = "bp1", companyName = "Vishwakarma Engineering Works",
        gstin = "27AAGCV7781K1ZB", cin = "U29100MH2014PTC259871", pan = "AAGCV7781K",
        udyamNo = "UDYAM-MH-19-0044821", overallStatus = "ACTIVE", sourceStatus = "PUBLIC_LOOKUP",
        createdAt = "2026-08-21T07:12:00.000Z", updatedAt = "2026-09-06T13:22:00.000Z",
        riskFlag = BizRiskFlag(
            id = "brf1", businessId = "bp1", flag = "GREEN", compositeScore = 79.4,
            recommendedLimit = 4_000_000.0, recommendedTenor = 45,
            computedAt = "2026-09-06T13:22:00.000Z",
        ),
        yearSummaries = listOf(
            FinancialYearSummary(
                id = "fy1", fiscalYear = "2025-26", revenue = 218_400_000.0,
                netProfit = 14_900_000.0, dataCompleteness = 0.82,
            ),
        ),
        counts = BusinessCounts(financialDocuments = 6, courtCases = 0),
    ),
    BusinessProfile(
        id = "bp2", companyName = "Konkan Marine Foods Pvt Ltd",
        gstin = "27AAJCK2204F1Z6", cin = "U15122MH2018PTC311204", pan = "AAJCK2204F",
        overallStatus = "ACTIVE", sourceStatus = "MANUAL_VERIFICATION",
        createdAt = "2026-08-29T09:40:00.000Z", updatedAt = "2026-09-05T16:08:00.000Z",
        riskFlag = BizRiskFlag(
            id = "brf2", businessId = "bp2", flag = "AMBER", compositeScore = 51.2,
            hardRedFlags = """[]""",
            recommendedLimit = 900_000.0, recommendedTenor = 30,
            computedAt = "2026-09-05T16:08:00.000Z",
        ),
        yearSummaries = listOf(
            FinancialYearSummary(
                id = "fy2", fiscalYear = "2024-25", revenue = 61_250_000.0,
                netProfit = 1_180_000.0, dataCompleteness = 0.44,
            ),
        ),
        counts = BusinessCounts(financialDocuments = 2, courtCases = 1),
    ),
    BusinessProfile(
        id = "bp3", companyName = "Ashirwad Cement Traders",
        gstin = "24AALFA9930C1ZP", pan = "AALFA9930C",
        overallStatus = "PENDING", sourceStatus = "USER_PROVIDED",
        createdAt = "2026-09-07T05:02:00.000Z", updatedAt = "2026-09-07T05:02:00.000Z",
        riskFlag = null,
        yearSummaries = emptyList(),
        counts = BusinessCounts(financialDocuments = 0, courtCases = 0),
    ),
)

/** Every feature exposes exactly this: one factory keyed off the flavor flag. */
object DashboardModule {
    fun repository(container: AppContainer): DashboardRepository =
        if (container.useMock) MockDashboardRepository()
        else LiveDashboardRepository(container.retrofit.create(DashboardApi::class.java))
}
