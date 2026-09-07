package com.chaanbean.mobile.feature.debtors.data

import com.chaanbean.mobile.core.di.AppContainer
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.model.outcomeOf
import java.time.Instant
import java.time.temporal.ChronoUnit

interface DebtorsRepository {
    suspend fun list(): Outcome<List<BuyerDebtor>>

    suspend fun find(buyerId: String): Outcome<BuyerDebtor>

    suspend fun create(request: CreateBuyerRequest): Outcome<CreateBuyerResponse>

    suspend fun refreshRisk(buyerId: String): Outcome<RiskAssessment>

    /** Ok(null) means the account exists but has never been escalated. */
    suspend fun escalation(creditAccountId: String): Outcome<EscalationState?>
}

class LiveDebtorsRepository(private val api: DebtorsApi) : DebtorsRepository {

    override suspend fun list(): Outcome<List<BuyerDebtor>> = outcomeOf { api.list().buyers }

    /**
     * There is no `GET /api/buyers/:id` on the server, so the dossier is filtered
     * out of the same list payload the portfolio screen uses.
     */
    override suspend fun find(buyerId: String): Outcome<BuyerDebtor> = outcomeOf {
        api.list().buyers.firstOrNull { it.id == buyerId }
            ?: throw IllegalStateException("Buyer $buyerId is not in this company's portfolio")
    }

    override suspend fun create(request: CreateBuyerRequest): Outcome<CreateBuyerResponse> =
        outcomeOf {
            val res = api.create(request)
            if (!res.success) throw IllegalStateException(res.error ?: "Buyer was not created")
            res
        }

    override suspend fun refreshRisk(buyerId: String): Outcome<RiskAssessment> = outcomeOf {
        val res = api.refreshRisk(RefreshRiskRequest(buyerId = buyerId))
        res.result ?: throw IllegalStateException(res.error ?: "Risk flag was not recomputed")
    }

    override suspend fun escalation(creditAccountId: String): Outcome<EscalationState?> =
        outcomeOf {
            if (creditAccountId.isBlank()) {
                null
            } else {
                api.recoveryAccounts().accounts
                    .firstOrNull { it.id == creditAccountId }
                    ?.escalationStates
                    ?.firstOrNull()
            }
        }
}

/**
 * In-memory portfolio for the `mock` flavor. Amounts, GSTIN/PAN formats, signal
 * wording and the escalation ladder follow the server's own seed and scoring
 * engine, so the screens are exercised against shapes the live API produces.
 */
class MockDebtorsRepository : DebtorsRepository {

    // Declared before `store` because the fixture builder writes into it.
    private val escalations = mutableMapOf<String, EscalationState>()

    private val store = mutableListOf(
        buyer(
            id = "b1",
            name = "Greenline Retail LLP",
            pan = "AAECG1234H",
            gstin = "27AAECG1234H1Z5",
            mobile = "+91 98765 43210",
            email = "finance@greenlineretail.in",
            address = "Unit 4, Commercial Market Complex, Sector 18, Navi Mumbai 400703",
            language = "en",
            outstanding = 125_000.0,
            creditLimit = 1_500_000.0,
            dueInDays = 12,
            overdueStatus = "current",
            flag = "green",
            score = 84.3,
            recommendedLimit = 1_500_000.0,
            recommendedTenor = 45,
            signals = cleanSignals(
                bureauScore = 762,
                bureau = 95.0,
                turnover = 95.0,
                turnoverEffect = "growing trend -> 95/100",
            ),
        ),
        buyer(
            id = "b2",
            name = "Sunrise Distributors",
            pan = "AAECS5678J",
            gstin = "29AAECS5678J1Z8",
            mobile = "+91 91234 56780",
            email = "accounts@sunrisedist.in",
            address = "Plot 22, Peenya Industrial Area Phase 2, Bengaluru 560058",
            language = "hi",
            outstanding = 480_000.0,
            creditLimit = 400_000.0,
            dueInDays = -35,
            overdueStatus = "overdue",
            flag = "amber",
            score = 61.2,
            recommendedLimit = 400_000.0,
            recommendedTenor = 30,
            signals = listOf(
                SignalBreakdown("Turnover trend (4-yr)", "GST Exact Turnover", 15.0, 45.0, 100.0, "declining trend -> 45/100", "RS-TURNOVER-001"),
                SignalBreakdown("GST compliance", "GST Supreme Report", 20.0, 40.0, 100.0, "lapses filings", "RS-GST-002"),
                SignalBreakdown("Bureau score", "CRIF High Mark", 30.0, 72.0, 100.0, "Score 668 -> band sub-score 72", "RS-BUREAU-001"),
                SignalBreakdown("Litigation exposure", "Court Case History, FIR Check", 15.0, 90.0, 100.0, "Clean", "RS-LIT-001"),
                SignalBreakdown("Network reputation", "Trust Hub peer reports", 10.0, 90.0, 100.0, "No peer defaults", "RS-TRUST-001"),
                SignalBreakdown("Identity consistency", "Mobile to PAN, Mobile Identity, Address checks", 5.0, 55.0, 100.0, "Low address confidence", "RS-ID-001"),
                SignalBreakdown("MSME/company standing", "MSME Report, Company Supreme Report, Director Details", 5.0, 60.0, 100.0, "Clean registration", "RS-STAND-001"),
            ),
            escalation = escalation(
                level = "L1",
                nextActionInHours = 24,
                events = listOf(
                    EscalationEvent(
                        level = "L1",
                        action = "polite_reminder",
                        channel = "whatsapp",
                        at = daysAgo(6),
                        ruleId = "POL-L1-001",
                        explanation = "0-15 days overdue: courteous WhatsApp reminder in the debtor's registered language.",
                        contentHash = "9f2c41ab7d0e",
                    ),
                ),
            ),
        ),
        buyer(
            id = "b3",
            name = "Metro Supplies Co",
            pan = "AAECM9012K",
            gstin = "GSTRED003",
            mobile = "+91 99887 76655",
            email = "billing@metrosupplies.co.in",
            address = "Shop 14, Ghatkopar Trade Centre, Mumbai 400086",
            language = "en",
            outstanding = 890_000.0,
            creditLimit = 0.0,
            dueInDays = -95,
            overdueStatus = "defaulted",
            disputeStatus = "under_arbitration",
            flag = "red",
            score = 28.6,
            recommendedLimit = 0.0,
            recommendedTenor = 15,
            signals = listOf(
                SignalBreakdown("Turnover trend (4-yr)", "GST Exact Turnover", 15.0, 35.0, 100.0, "erratic trend -> 35/100", "RS-TURNOVER-001"),
                SignalBreakdown("GST compliance", "GST Supreme Report", 20.0, 25.0, 100.0, "Filing mismatches detected", "RS-GST-002"),
                SignalBreakdown("Bureau score", "CIBIL", 30.0, 25.0, 100.0, "Score 512 -> band sub-score 25", "RS-BUREAU-001"),
                SignalBreakdown("Litigation exposure", "Court Case History, FIR Check", 15.0, 15.0, 100.0, "Active/unresolved cases - hard flag", "RS-LIT-001"),
                SignalBreakdown("Network reputation", "Trust Hub peer reports", 10.0, 10.0, 100.0, "1 peer-reported default(s) - strong Red signal", "RS-TRUST-001"),
                SignalBreakdown("Identity consistency", "Mobile to PAN, Mobile Identity, Address checks", 5.0, 35.0, 100.0, "Identity mismatch - fraud signal", "RS-ID-001"),
                SignalBreakdown("MSME/company standing", "MSME Report, Company Supreme Report, Director Details", 5.0, 30.0, 100.0, "Disqualified director", "RS-STAND-001"),
            ),
            escalation = escalation(
                level = "L3",
                nextActionInHours = 48,
                events = listOf(
                    EscalationEvent(
                        level = "L1",
                        action = "polite_reminder",
                        channel = "whatsapp",
                        at = daysAgo(75),
                        ruleId = "POL-L1-001",
                        explanation = "First courtesy reminder issued on the registered WhatsApp number.",
                        contentHash = "3a71bd90c412",
                    ),
                    EscalationEvent(
                        level = "L2",
                        action = "firm_reminder",
                        channel = "voice",
                        at = daysAgo(45),
                        ruleId = "POL-L2-002",
                        explanation = "One-way recorded voice announcement placed inside the 09:00-18:00 calling window.",
                        contentHash = "c0d4419e8a67",
                        audioRef = "s3://chaanbean-audio/l2_voice_reminder_v1/en/c0d4419e8a67.mp3",
                        callStatus = "answered",
                        durationSec = 41,
                    ),
                    EscalationEvent(
                        level = "L3",
                        action = "send_legal_notice",
                        channel = "legal_notice",
                        at = daysAgo(15),
                        ruleId = "POL-L3-001",
                        explanation = "Statutory demand notice served by speed post and registered email under MSMED Act 2006 s.16.",
                        contentHash = "hash_l3_metro_demand_notice",
                        govReferenceId = "IT-GST-ACK-2024-8891",
                    ),
                    EscalationEvent(
                        level = "L3",
                        action = "escalate_arbitration",
                        channel = "arbitration",
                        at = daysAgo(3),
                        ruleId = "POL-L3-002",
                        explanation = "Referred to sole arbitrator; case ARB-CB-2024-001 listed for hearing.",
                    ),
                ),
            ),
        ),
        buyer(
            id = "b4",
            name = "Malabar Spices & Trading",
            pan = "AAECM4432L",
            gstin = "32AAECM4432L1Z2",
            mobile = "+91 94470 12345",
            email = "trade@malabarspices.in",
            address = "Warehouse 7, Willingdon Island, Kochi 682003",
            language = "ml",
            outstanding = 320_000.0,
            creditLimit = 250_000.0,
            dueInDays = -42,
            overdueStatus = "overdue",
            flag = "amber",
            score = 58.9,
            recommendedLimit = 250_000.0,
            recommendedTenor = 30,
            signals = listOf(
                SignalBreakdown("Turnover trend (4-yr)", "GST Exact Turnover", 15.0, 80.0, 100.0, "stable trend -> 80/100", "RS-TURNOVER-001"),
                SignalBreakdown("GST compliance", "GST Supreme Report", 20.0, 50.0, 100.0, "Pending OTP - provisional neutral score", "RS-GST-PENDING"),
                SignalBreakdown("Bureau score", "Experian", 30.0, 58.0, 100.0, "Score 621 -> band sub-score 58", "RS-BUREAU-001"),
                SignalBreakdown("Litigation exposure", "Court Case History, FIR Check", 15.0, 45.0, 100.0, "Active/unresolved cases - hard flag", "RS-LIT-001"),
                SignalBreakdown("Network reputation", "Trust Hub peer reports", 10.0, 90.0, 100.0, "No peer defaults", "RS-TRUST-001"),
                SignalBreakdown("Identity consistency", "Mobile to PAN, Mobile Identity, Address checks", 5.0, 88.0, 100.0, "Consistent", "RS-ID-001"),
                SignalBreakdown("MSME/company standing", "MSME Report, Company Supreme Report, Director Details", 5.0, 85.0, 100.0, "Clean registration", "RS-STAND-001"),
            ),
            escalation = escalation(
                level = "L2",
                nextActionInHours = 24,
                events = listOf(
                    EscalationEvent(
                        level = "L1",
                        action = "polite_reminder",
                        channel = "whatsapp",
                        at = daysAgo(20),
                        ruleId = "POL-L1-001",
                        explanation = "Courtesy reminder delivered in Malayalam from the approved template set.",
                        contentHash = "77aa1c3fb920",
                    ),
                    EscalationEvent(
                        level = "L2",
                        action = "firm_reminder",
                        channel = "voice",
                        at = daysAgo(2),
                        ruleId = "POL-L2-002",
                        explanation = "Malayalam voice announcement synthesised once and replayed from the cached asset.",
                        contentHash = "b41e77c0aa38",
                        audioRef = "s3://chaanbean-audio/l2_voice_reminder_v1/ml/b41e77c0aa38.mp3",
                        callStatus = "no_answer",
                        durationSec = 0,
                    ),
                ),
            ),
        ),
        buyer(
            id = "b5",
            name = "Western Infra Projects LLP",
            pan = "AABCW7788Q",
            gstin = "27AABCW7788Q1ZP",
            mobile = "+91 98201 33445",
            email = "payables@westerninfra.co.in",
            address = "5th Floor, Kalpataru Square, Andheri East, Mumbai 400059",
            language = "en",
            outstanding = 1_245_000.0,
            creditLimit = 900_000.0,
            dueInDays = -8,
            overdueStatus = "due",
            flag = "green",
            score = 71.5,
            recommendedLimit = 900_000.0,
            recommendedTenor = 45,
            signals = cleanSignals(
                bureauScore = 704,
                bureau = 85.0,
                turnover = 80.0,
                turnoverEffect = "stable trend -> 80/100",
            ),
        ),
        buyer(
            id = "b6",
            name = "Kaveri Agro Exports Pvt Ltd",
            pan = "AABCK3311M",
            gstin = "29AABCK3311M1Z7",
            mobile = "+91 90080 21176",
            email = "finance@kaveriagro.in",
            address = "Survey 118, Hebbal Industrial Estate, Mysuru 570016",
            language = "kn",
            outstanding = 675_000.0,
            creditLimit = 500_000.0,
            dueInDays = -64,
            overdueStatus = "defaulted",
            disputeStatus = "disputed",
            flag = "amber",
            score = 56.4,
            recommendedLimit = 500_000.0,
            recommendedTenor = 30,
            signals = listOf(
                SignalBreakdown("Turnover trend (4-yr)", "GST Exact Turnover", 15.0, 45.0, 100.0, "declining trend -> 45/100", "RS-TURNOVER-001"),
                SignalBreakdown("GST compliance", "GST Supreme Report", 20.0, 40.0, 100.0, "lapses filings", "RS-GST-002"),
                SignalBreakdown("Bureau score", "CIBIL", 30.0, 58.0, 100.0, "Score 612 -> band sub-score 58", "RS-BUREAU-001"),
                SignalBreakdown("Litigation exposure", "Court Case History, FIR Check", 15.0, 90.0, 100.0, "Clean", "RS-LIT-001"),
                SignalBreakdown("Network reputation", "Trust Hub peer reports", 10.0, 90.0, 100.0, "No peer defaults", "RS-TRUST-001"),
                SignalBreakdown("Identity consistency", "Mobile to PAN, Mobile Identity, Address checks", 5.0, 88.0, 100.0, "Consistent", "RS-ID-001"),
                SignalBreakdown("MSME/company standing", "MSME Report, Company Supreme Report, Director Details", 5.0, 40.0, 100.0, "Invalid MSME", "RS-STAND-001"),
            ),
            escalation = escalation(
                level = "L2",
                nextActionInHours = 12,
                events = listOf(
                    EscalationEvent(
                        level = "L1",
                        action = "polite_reminder",
                        channel = "whatsapp",
                        at = daysAgo(30),
                        ruleId = "POL-L1-001",
                        explanation = "Kannada courtesy reminder delivered to the primary registered mobile.",
                        contentHash = "5d20fe11ca83",
                    ),
                    EscalationEvent(
                        level = "L2",
                        action = "firm_reminder",
                        channel = "email",
                        at = daysAgo(9),
                        ruleId = "POL-L2-003",
                        explanation = "Firm reminder emailed to the payables desk with the invoice ledger attached.",
                        contentHash = "eb90a4c11f22",
                    ),
                ),
            ),
        ),
    )

    override suspend fun list(): Outcome<List<BuyerDebtor>> = Outcome.Ok(store.toList())

    override suspend fun find(buyerId: String): Outcome<BuyerDebtor> {
        val match = store.firstOrNull { it.id == buyerId }
        return if (match != null) Outcome.Ok(match)
        else Outcome.Err("Buyer $buyerId is not in this company's portfolio")
    }

    override suspend fun create(request: CreateBuyerRequest): Outcome<CreateBuyerResponse> {
        // Mirrors the server: one credit account is created alongside the buyer and
        // its overdue status is derived from the operator-supplied days overdue.
        val status = when {
            request.overdueDays > 30 -> "overdue"
            request.overdueDays > 0 -> "due"
            else -> "current"
        }
        val created = buyer(
            id = "b${store.size + 1}",
            name = request.name,
            pan = request.pan?.uppercase(),
            gstin = request.gstin?.uppercase(),
            mobile = request.mobile?.firstOrNull() ?: "+91 98765 43210",
            email = request.email,
            address = request.address,
            language = request.language,
            outstanding = request.initialAmount,
            creditLimit = 400_000.0,
            dueInDays = -request.overdueDays.toLong(),
            overdueStatus = status,
            flag = "amber",
            score = 61.8,
            recommendedLimit = 400_000.0,
            recommendedTenor = 30,
            signals = cleanSignals(
                bureauScore = 648,
                bureau = 58.0,
                turnover = 80.0,
                turnoverEffect = "stable trend -> 80/100",
            ),
        )
        store.add(0, created)
        val risk = created.latestRisk()
        return Outcome.Ok(
            CreateBuyerResponse(
                success = true,
                message = "Buyer created. Parallel verification completed with AMBER risk flag.",
                buyer = created,
                riskFlag = risk?.let {
                    RiskAssessment(
                        flag = it.flag,
                        compositeScore = it.compositeScore,
                        signals = parseSignals(it.signalBreakdown),
                        recommendedLimit = it.recommendedLimit,
                        recommendedTenor = it.recommendedTenor,
                        riskFlagId = it.id,
                    )
                },
            ),
        )
    }

    override suspend fun refreshRisk(buyerId: String): Outcome<RiskAssessment> {
        val index = store.indexOfFirst { it.id == buyerId }
        if (index < 0) return Outcome.Err("Buyer $buyerId is not in this company's portfolio")
        val existing = store[index].latestRisk()
            ?: return Outcome.Err("No risk flag has ever been computed for this buyer")
        // The scoring engine is deterministic, so re-running it over unchanged
        // inputs reproduces the same flag; only the timestamp moves.
        val recomputed = existing.copy(computedAt = Instant.now().toString())
        store[index] = store[index].copy(riskFlags = listOf(recomputed))
        return Outcome.Ok(
            RiskAssessment(
                flag = recomputed.flag,
                compositeScore = recomputed.compositeScore,
                signals = parseSignals(recomputed.signalBreakdown),
                recommendedLimit = recomputed.recommendedLimit,
                recommendedTenor = recomputed.recommendedTenor,
                riskFlagId = recomputed.id,
            ),
        )
    }

    override suspend fun escalation(creditAccountId: String): Outcome<EscalationState?> =
        Outcome.Ok(escalations[creditAccountId])

    private fun escalation(
        level: String,
        nextActionInHours: Long,
        events: List<EscalationEvent>,
    ): EscalationState = EscalationState(
        currentLevel = level,
        history = encodeEscalationHistory(events),
        nextActionAt = hoursAhead(nextActionInHours),
        updatedAt = events.lastOrNull()?.at,
    )

    @Suppress("LongParameterList")
    private fun buyer(
        id: String,
        name: String,
        pan: String?,
        gstin: String?,
        mobile: String,
        email: String?,
        address: String?,
        language: String,
        outstanding: Double,
        creditLimit: Double,
        dueInDays: Long,
        overdueStatus: String,
        flag: String,
        score: Double,
        recommendedLimit: Double,
        recommendedTenor: Int,
        signals: List<SignalBreakdown>,
        disputeStatus: String = "none",
        escalation: EscalationState? = null,
    ): BuyerDebtor {
        val accountId = "ca-$id"
        val due = Instant.now().plus(dueInDays, ChronoUnit.DAYS)
        if (escalation != null) {
            escalations[accountId] =
                escalation.copy(id = "esc-$accountId", creditAccountId = accountId)
        }
        return BuyerDebtor(
            id = id,
            companyId = "acme-traders",
            name = name,
            email = email,
            mobileNumbers = "[\"$mobile\"]",
            pan = pan,
            gstin = gstin,
            address = address,
            language = language,
            createdAt = daysAgo(120),
            updatedAt = daysAgo(1),
            creditAccounts = listOf(
                CreditAccount(
                    id = accountId,
                    buyerId = id,
                    outstandingAmount = outstanding,
                    creditLimit = creditLimit,
                    tenorDays = recommendedTenor,
                    dueDate = due.toString(),
                    overdueStatus = overdueStatus,
                    penalInterestRate = 20.25,
                    disputeStatus = disputeStatus,
                ),
            ),
            riskFlags = listOf(
                BuyerRiskFlag(
                    id = "rf-$id",
                    buyerId = id,
                    flag = flag,
                    compositeScore = score,
                    signalBreakdown = encodeSignals(signals),
                    recommendedLimit = recommendedLimit,
                    recommendedTenor = recommendedTenor,
                    computedAt = daysAgo(1),
                ),
            ),
        )
    }

    private companion object {
        fun daysAgo(days: Long): String =
            Instant.now().minus(days, ChronoUnit.DAYS).toString()

        fun hoursAhead(hours: Long): String =
            Instant.now().plus(hours, ChronoUnit.HOURS).toString()

        /** The seven-signal profile the engine emits when nothing adverse is found. */
        fun cleanSignals(
            bureauScore: Int,
            bureau: Double,
            turnover: Double,
            turnoverEffect: String,
        ): List<SignalBreakdown> = listOf(
            SignalBreakdown("Turnover trend (4-yr)", "GST Exact Turnover", 15.0, turnover, 100.0, turnoverEffect, "RS-TURNOVER-001"),
            SignalBreakdown("GST compliance", "GST Supreme Report", 20.0, 85.0, 100.0, "consistent filings", "RS-GST-002"),
            SignalBreakdown("Bureau score", "CIBIL", 30.0, bureau, 100.0, "Score $bureauScore -> band sub-score ${bureau.toInt()}", "RS-BUREAU-001"),
            SignalBreakdown("Litigation exposure", "Court Case History, FIR Check", 15.0, 90.0, 100.0, "Clean", "RS-LIT-001"),
            SignalBreakdown("Network reputation", "Trust Hub peer reports", 10.0, 90.0, 100.0, "No peer defaults", "RS-TRUST-001"),
            SignalBreakdown("Identity consistency", "Mobile to PAN, Mobile Identity, Address checks", 5.0, 88.0, 100.0, "Consistent", "RS-ID-001"),
            SignalBreakdown("MSME/company standing", "MSME Report, Company Supreme Report, Director Details", 5.0, 85.0, 100.0, "Clean registration", "RS-STAND-001"),
        )
    }
}

/** Every feature exposes exactly this: one factory keyed off the flavor flag. */
object DebtorsModule {
    fun repository(container: AppContainer): DebtorsRepository =
        if (container.useMock) MockDebtorsRepository()
        else LiveDebtorsRepository(container.retrofit.create(DebtorsApi::class.java))
}
