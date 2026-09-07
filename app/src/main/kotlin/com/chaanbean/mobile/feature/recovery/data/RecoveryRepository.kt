package com.chaanbean.mobile.feature.recovery.data

import com.chaanbean.mobile.core.di.AppContainer
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.model.outcomeOf
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.Instant
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.pow
import kotlin.math.round

interface RecoveryRepository {
    suspend fun worklist(): Outcome<List<RecoveryAccount>>
    suspend fun detail(creditAccountId: String): Outcome<RecoveryDetail>
    suspend fun runAction(creditAccountId: String, action: RecoveryAction): Outcome<RecoveryActionResponse>
    suspend fun settle(request: SettlementRequest): Outcome<SettlementResponse>

    /** Metadata for a rendered announcement. */
    suspend fun audioAsset(hash: String): Outcome<AudioAssetResponse>

    /**
     * Absolute URL the media player streams from, or null when this build has no
     * server to stream from (the mock flavor).
     */
    fun audioStreamUrl(hash: String): String?
}

class LiveRecoveryRepository(
    private val api: RecoveryApi,
    private val baseUrl: String,
) : RecoveryRepository {

    override suspend fun worklist(): Outcome<List<RecoveryAccount>> = outcomeOf { api.list().accounts }

    override suspend fun detail(creditAccountId: String): Outcome<RecoveryDetail> = outcomeOf {
        val res = api.detail(creditAccountId)
        val account = res.account
            ?: throw IllegalStateException(res.error ?: "Credit account not found")

        // The detail endpoint returns only `currentLevel`, so the escalation timeline has
        // to be lifted out of the list endpoint's `escalationStates[0].history`.
        val state = runCatching {
            api.list().accounts.firstOrNull { it.id == creditAccountId }
                ?.escalationStates?.firstOrNull()
        }.getOrNull()

        RecoveryDetail(
            account = account,
            statutoryInterest = res.statutoryInterest,
            voiceCall = res.voiceCall,
            history = parseEscalationHistory(state?.history),
            nextActionAt = state?.nextActionAt,
            historyAvailable = state != null,
        )
    }

    override suspend fun runAction(
        creditAccountId: String,
        action: RecoveryAction,
    ): Outcome<RecoveryActionResponse> = outcomeOf {
        val res = api.action(RecoveryActionRequest(creditAccountId, action.wire))
        if (!res.success && res.error != null) throw IllegalStateException(res.error)
        res
    }

    override suspend fun settle(request: SettlementRequest): Outcome<SettlementResponse> = outcomeOf {
        val res = api.settle(request)
        if (!res.success && res.error != null) throw IllegalStateException(res.error)
        res
    }

    override suspend fun audioAsset(hash: String): Outcome<AudioAssetResponse> =
        outcomeOf { api.audioAsset(hash) }

    // baseUrl already carries its trailing slash (Retrofit requires it).
    override fun audioStreamUrl(hash: String): String = baseUrl + "api/audio/" + hash
}

/**
 * In-memory stand-in for the `mock` flavor. It reproduces the server's behaviour
 * including the parts that are wrong - overpayment is discarded, and a repeated
 * settlement applies twice - so the mock never looks safer than production.
 */
class MockRecoveryRepository : RecoveryRepository {

    private val json = Json { encodeDefaults = true; explicitNulls = false }

    private fun daysAgo(days: Long): String =
        Instant.now().minus(days, ChronoUnit.DAYS).toString()

    private val store = mutableListOf(
        RecoveryAccount(
            id = "ca_ganga_textiles",
            buyerId = "bd_ganga",
            outstandingAmount = 762_000.0,
            creditLimit = 900_000.0,
            tenorDays = 45,
            dueDate = daysAgo(97),
            overdueStatus = "defaulted",
            penalInterestRate = 20.25,
            disputeStatus = "none",
            buyer = RecoveryBuyer(
                id = "bd_ganga",
                name = "Ganga Textile Mills Pvt Ltd",
                contactPerson = "Suresh Agarwal",
                email = "accounts@gangatextilemills.in",
                mobileNumbers = """["+919820114477","+912228834411"]""",
                pan = "AAFCG7712M",
                gstin = "27AAFCG7712M1ZK",
                address = "Plot 44, MIDC Tarapur, Boisar, Maharashtra 401506",
                language = "hi",
            ),
            escalationStates = listOf(
                EscalationState(
                    id = "es_ganga",
                    creditAccountId = "ca_ganga_textiles",
                    currentLevel = "L3",
                    nextActionAt = Instant.now().plus(2, ChronoUnit.DAYS).toString(),
                    history = json.encodeToString(
                        listOf(
                            EscalationHistoryEntry(
                                level = "L1", action = "polite_reminder", channel = "whatsapp",
                                at = daysAgo(74), ruleId = "POL-L1-001",
                                explanation = "Day 23 overdue — L1 whatsapp polite reminder (attempt 1).",
                                contentHash = "3f9a1c77e2b48d5c6a0f1e2d3c4b5a69788899aabbccddeeff001122334455",
                            ),
                            EscalationHistoryEntry(
                                level = "L2", action = "firm_reminder", channel = "voice",
                                at = daysAgo(58), ruleId = "POL-L2-001",
                                explanation = "Day 39 overdue, L1 exhausted (4 attempts) — Escalate to L2 voice.",
                                contentHash = "aa41b8c0d3e5f6a7b8c9d0e1f2a3b4c5d6e7f80911223344556677889900aa",
                                callStatus = "answered", durationSec = 41,
                                audioRef = "/api/audio/aa41b8c0d3e5f6a7b8c9d0e1f2a3b4c5",
                            ),
                            EscalationHistoryEntry(
                                level = "L3", action = "send_legal_notice", channel = "legal_notice",
                                at = daysAgo(6), ruleId = "POL-L3-NOTICE-001",
                                explanation = "91 days overdue — L3 Statutory Demand Notice required per policy.",
                                contentHash = "c17d4e9f2b8a6350d1e2f3a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7",
                                govReferenceId = "IT-GST-20260901-C17D4E9F",
                            ),
                        ),
                    ),
                ),
            ),
        ),
        RecoveryAccount(
            id = "ca_bharat_auto",
            buyerId = "bd_bharat",
            outstandingAmount = 184_500.0,
            creditLimit = 250_000.0,
            tenorDays = 30,
            dueDate = daysAgo(42),
            overdueStatus = "overdue",
            penalInterestRate = 18.0,
            disputeStatus = "none",
            buyer = RecoveryBuyer(
                id = "bd_bharat",
                name = "Bharat Auto Components Pvt Ltd",
                contactPerson = "Kavitha Raman",
                email = "payables@bharatautocomp.co.in",
                mobileNumbers = """["+919844021156"]""",
                pan = "AABCB4590Q",
                gstin = "29AABCB4590Q1Z8",
                address = "No. 18, Peenya Industrial Area Phase II, Bengaluru 560058",
                language = "kn",
            ),
            escalationStates = listOf(
                EscalationState(
                    id = "es_bharat",
                    creditAccountId = "ca_bharat_auto",
                    currentLevel = "L2",
                    nextActionAt = Instant.now().plus(2, ChronoUnit.DAYS).toString(),
                    history = json.encodeToString(
                        listOf(
                            EscalationHistoryEntry(
                                level = "L1", action = "polite_reminder", channel = "email",
                                at = daysAgo(21), ruleId = "POL-L1-001",
                                explanation = "Day 21 overdue — L1 email polite reminder (attempt 2).",
                                contentHash = "5b2c7d1e8f0a3946b5c4d3e2f1a0b9c8d7e6f504132231405566778899aabb",
                            ),
                            EscalationHistoryEntry(
                                level = "L2", action = "firm_reminder", channel = "voice",
                                at = daysAgo(4), ruleId = "POL-L2-001",
                                explanation = "Day 38 overdue, L1 exhausted (4 attempts) — Escalate to L2 voice.",
                                contentHash = "9e0f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f70819202a3b4c5",
                                callStatus = "busy", durationSec = 0,
                            ),
                        ),
                    ),
                ),
            ),
        ),
        RecoveryAccount(
            id = "ca_vasant_steel",
            buyerId = "bd_vasant",
            outstandingAmount = 325_000.0,
            creditLimit = 400_000.0,
            tenorDays = 30,
            dueDate = daysAgo(33),
            overdueStatus = "overdue",
            penalInterestRate = 18.0,
            disputeStatus = "disputed",
            buyer = RecoveryBuyer(
                id = "bd_vasant",
                name = "Vasant Steel Traders",
                contactPerson = "Nilesh Vasant Deshmukh",
                email = "nilesh@vasantsteel.in",
                mobileNumbers = """["+919930556612"]""",
                pan = "AGRPD2288L",
                gstin = "27AGRPD2288L1Z3",
                address = "Shop 7, Kalamboli Steel Market, Navi Mumbai 410218",
                language = "en",
            ),
            escalationStates = listOf(
                EscalationState(
                    id = "es_vasant",
                    creditAccountId = "ca_vasant_steel",
                    currentLevel = "L2",
                    nextActionAt = Instant.now().plus(1, ChronoUnit.DAYS).toString(),
                    history = json.encodeToString(
                        listOf(
                            EscalationHistoryEntry(
                                level = "L2", action = "firm_reminder", channel = "whatsapp",
                                at = daysAgo(2), ruleId = "POL-L2-001",
                                explanation = "Day 31 overdue, L1 exhausted (4 attempts) — Escalate to L2 whatsapp.",
                                contentHash = "1122334455667788990aabbccddeeff00112233445566778899aabbccddeeff",
                            ),
                        ),
                    ),
                ),
            ),
        ),
        RecoveryAccount(
            id = "ca_deccan_agro",
            buyerId = "bd_deccan",
            outstandingAmount = 96_750.0,
            creditLimit = 150_000.0,
            tenorDays = 30,
            dueDate = daysAgo(12),
            overdueStatus = "due",
            penalInterestRate = 18.0,
            disputeStatus = "none",
            buyer = RecoveryBuyer(
                id = "bd_deccan",
                name = "Deccan Agro Exports LLP",
                contactPerson = "P. Lakshmi Narayana",
                email = "finance@deccanagroexports.com",
                mobileNumbers = """["+919701188234"]""",
                pan = "AAQFD1183J",
                gstin = "36AAQFD1183J1ZP",
                address = "Survey 112/2, Jeedimetla, Hyderabad 500055",
                language = "te",
            ),
            escalationStates = listOf(
                EscalationState(
                    id = "es_deccan",
                    creditAccountId = "ca_deccan_agro",
                    currentLevel = "L1",
                    nextActionAt = Instant.now().plus(3, ChronoUnit.DAYS).toString(),
                    history = json.encodeToString(
                        listOf(
                            EscalationHistoryEntry(
                                level = "L1", action = "polite_reminder", channel = "whatsapp",
                                at = daysAgo(5), ruleId = "POL-L1-001",
                                explanation = "Day 7 overdue — L1 whatsapp polite reminder (attempt 1).",
                                contentHash = "ff00112233445566778899aabbccddeeff00112233445566778899aabbccdd",
                            ),
                        ),
                    ),
                ),
            ),
        ),
        RecoveryAccount(
            id = "ca_konkan_marine",
            buyerId = "bd_konkan",
            outstandingAmount = 0.0,
            creditLimit = 200_000.0,
            tenorDays = 30,
            dueDate = daysAgo(61),
            overdueStatus = "settled",
            penalInterestRate = 18.0,
            disputeStatus = "none",
            buyer = RecoveryBuyer(
                id = "bd_konkan",
                name = "Konkan Marine Foods Pvt Ltd",
                contactPerson = "Anjali Salgaonkar",
                email = "ar@konkanmarinefoods.in",
                mobileNumbers = """["+919764430098"]""",
                pan = "AADCK6641F",
                gstin = "30AADCK6641F1ZR",
                address = "Fisheries Complex, Vasco da Gama, Goa 403802",
                language = "ml",
            ),
            escalationStates = listOf(
                EscalationState(
                    id = "es_konkan",
                    creditAccountId = "ca_konkan_marine",
                    currentLevel = "Resolved",
                    nextActionAt = null,
                    history = json.encodeToString(
                        listOf(
                            EscalationHistoryEntry(
                                level = "Resolved", action = "payment_received", channel = "RTGS",
                                at = daysAgo(9), amount = 211_400.0,
                                utrNumber = "UTR-CB-RTGS-M8K2QP-4A9C11DE",
                                receiptNumber = "RCP-CB-M8K2QP",
                            ),
                        ),
                    ),
                ),
            ),
        ),
    )

    override suspend fun worklist(): Outcome<List<RecoveryAccount>> =
        Outcome.Ok(store.sortedByDescending { it.outstandingAmount })

    override suspend fun detail(creditAccountId: String): Outcome<RecoveryDetail> {
        val account = store.firstOrNull { it.id == creditAccountId }
            ?: return Outcome.Err("Credit account not found")
        val state = account.escalationStates.firstOrNull()
        val buyer = account.buyer
        val lang = buyer?.language ?: "en"
        return Outcome.Ok(
            RecoveryDetail(
                account = RecoveryAccountSummary(
                    id = account.id,
                    buyerId = account.buyerId,
                    buyerName = buyer?.name.orEmpty(),
                    phone = parseMobileNumbers(buyer?.mobileNumbers).firstOrNull() ?: "+919876543210",
                    email = buyer?.email,
                    language = lang,
                    outstandingAmount = account.outstandingAmount,
                    dueDate = account.dueDate,
                    status = account.overdueStatus,
                    currentLevel = state?.currentLevel ?: "L1",
                ),
                statutoryInterest = msmeInterest(account.outstandingAmount, account.dueDate),
                voiceCall = VoiceCallPreview(
                    templateId = "l2_voice_reminder_v1",
                    language = lang,
                    scriptText = voiceScript(buyer?.name.orEmpty(), account.outstandingAmount, account.dueDate, lang),
                    audioUrl = "/api/audio/" + Integer.toHexString(account.id.hashCode()),
                    contentHash = "%064x".format(account.id.hashCode().toLong() and 0xFFFFFFFFL),
                    voiceConfig = pollyVoice(lang),
                ),
                history = parseEscalationHistory(state?.history),
                nextActionAt = state?.nextActionAt,
                historyAvailable = state != null,
            ),
        )
    }

    override suspend fun runAction(
        creditAccountId: String,
        action: RecoveryAction,
    ): Outcome<RecoveryActionResponse> {
        val index = store.indexOfFirst { it.id == creditAccountId }
        if (index < 0) return Outcome.Err("Credit account not found")
        val account = store[index]
        val state = account.escalationStates.firstOrNull()
        val history = parseEscalationHistory(state?.history).toMutableList()
        val days = daysOverdue(account.dueDate) ?: 0

        val entry: EscalationHistoryEntry
        val response: RecoveryActionResponse

        when (action) {
            RecoveryAction.DIRECT_VOICE_CALL -> {
                val sip = "SIP-VOBIZ-MB4K7Q2-${account.id.takeLast(4).uppercase()}"
                entry = EscalationHistoryEntry(
                    level = "L2",
                    action = "direct_voice_announcement",
                    channel = "voice",
                    at = Instant.now().toString(),
                    ruleId = "POL-L2-MANUAL",
                    explanation = "Manual one-way voice recovery call executed via Asterisk PBX / Vobiz SIP Trunk ($sip).",
                    callStatus = "answered",
                    durationSec = 42,
                )
                response = RecoveryActionResponse(
                    success = true,
                    message = "One-way call connected (answered) · Duration: 42s · SIP Session: $sip",
                    callResult = OutboundCallResult(
                        callId = "call_${account.id}",
                        status = "answered",
                        durationSec = 42,
                        sipSessionId = sip,
                        executedAt = Instant.now().toString(),
                        carrier = "Vobiz Telecom India (SIP/PSTN)",
                        audioPlayed = "/api/audio/${account.id}",
                        sipHeaders = mapOf(
                            "SIP-Status" to "SIP/2.0 200 OK",
                            "Q850-Cause" to "16 (Normal Call Clearing)",
                            "TRAI-Calling-Window" to "Compliant (09:00–18:00 IST)",
                            "RTP-Audio-Codec" to "PCMU/8000 (G.711u) / Opus",
                        ),
                    ),
                    scriptText = entry.explanation,
                )
            }

            RecoveryAction.LEGAL_NOTICE -> {
                val govRef = "IT-GST-%s-%08X".format(
                    LocalDate.now().toString().replace("-", ""),
                    account.id.hashCode(),
                )
                entry = EscalationHistoryEntry(
                    level = "L3",
                    action = "send_legal_notice",
                    channel = "legal_notice",
                    at = Instant.now().toString(),
                    ruleId = "POL-L3-NOTICE-MANUAL",
                    explanation = "Legal demand notice issued manually, outside the policy ladder.",
                    govReferenceId = govRef,
                )
                response = RecoveryActionResponse(
                    success = true,
                    message = "Legal demand notice issued · Gov Ref ID: $govRef",
                    govReferenceId = govRef,
                )
            }

            RecoveryAction.TICK -> {
                val decision = evaluatePolicy(
                    currentLevel = state?.currentLevel ?: "L1",
                    daysOverdue = days,
                    outstandingAmount = account.outstandingAmount,
                    l1Attempts = history.count { it.level == "L1" },
                    l2Attempts = history.count { it.level == "L2" },
                    legalNoticeSent = history.any { it.channel == "legal_notice" },
                )
                entry = EscalationHistoryEntry(
                    level = decision.level,
                    action = decision.action,
                    channel = decision.channel,
                    at = Instant.now().toString(),
                    ruleId = decision.ruleId,
                    explanation = decision.explanation,
                )
                response = RecoveryActionResponse(
                    success = true,
                    message = "Recovery tick executed · ${decision.action} via ${decision.channel} (${decision.level})",
                    result = RecoveryTickResult(
                        success = true,
                        creditAccountId = creditAccountId,
                        level = decision.level,
                        action = decision.action,
                        channel = decision.channel,
                        ruleId = decision.ruleId,
                        explanation = decision.explanation,
                    ),
                )
            }
        }

        history.add(entry)
        store[index] = account.copy(
            escalationStates = listOf(
                (state ?: EscalationState(id = "es_${account.id}", creditAccountId = account.id)).copy(
                    currentLevel = entry.level,
                    history = json.encodeToString(history.toList()),
                    nextActionAt = Instant.now().plus(2, ChronoUnit.DAYS).toString(),
                ),
            ),
        )
        return Outcome.Ok(response)
    }

    override suspend fun settle(request: SettlementRequest): Outcome<SettlementResponse> {
        val index = store.indexOfFirst { it.id == request.creditAccountId }
        if (index < 0) return Outcome.Err("Credit account not found")
        val account = store[index]

        val paid = request.paymentAmount?.takeIf { it > 0 } ?: account.outstandingAmount
        // Deliberately mirrors the server: overpayment is clamped away and lost.
        val remaining = (account.outstandingAmount - paid).coerceAtLeast(0.0)
        val fullySettled = remaining == 0.0
        val stamp = System.currentTimeMillis().toString(36).uppercase()
        val utr = request.utrNumber?.takeIf { it.isNotBlank() }
            ?: "UTR-CB-${request.paymentMode}-$stamp-${stamp.takeLast(8)}"
        val receipt = "RCP-CB-$stamp"

        val state = account.escalationStates.firstOrNull()
        val history = parseEscalationHistory(state?.history).toMutableList()
        history.add(
            EscalationHistoryEntry(
                level = if (fullySettled) "Resolved" else state?.currentLevel.orEmpty(),
                action = "payment_received",
                channel = request.paymentMode,
                at = Instant.now().toString(),
                amount = paid,
                utrNumber = utr,
                receiptNumber = receipt,
            ),
        )

        val updated = account.copy(
            outstandingAmount = remaining,
            overdueStatus = if (fullySettled) "settled" else account.overdueStatus,
            escalationStates = state?.let {
                listOf(
                    it.copy(
                        currentLevel = if (fullySettled) "Resolved" else it.currentLevel,
                        history = json.encodeToString(history.toList()),
                        nextActionAt = if (fullySettled) null else it.nextActionAt,
                    ),
                )
            } ?: emptyList(),
        )
        store[index] = updated

        return Outcome.Ok(
            SettlementResponse(
                success = true,
                message = "Payment of ₹${paid.toLong()} successfully reconciled via ${request.paymentMode}.",
                receiptNumber = receipt,
                utrNumber = utr,
                settlementHash = "%064x".format((utr.hashCode().toLong() and 0xFFFFFFFFL)),
                previousBalance = account.outstandingAmount,
                remainingBalance = remaining,
                isFullySettled = fullySettled,
                updatedAccount = updated.copy(buyer = null, escalationStates = emptyList()),
            ),
        )
    }

    private data class MockDecision(
        val level: String,
        val action: String,
        val channel: String,
        val ruleId: String,
        val explanation: String,
    )

    /** Ported from evaluatePolicy() in src/lib/policy-engine/index.ts, thresholds included. */
    private fun evaluatePolicy(
        currentLevel: String,
        daysOverdue: Int,
        outstandingAmount: Double,
        l1Attempts: Int,
        l2Attempts: Int,
        legalNoticeSent: Boolean,
    ): MockDecision {
        if (daysOverdue >= 90 || (daysOverdue >= 60 && l2Attempts >= 3)) {
            return if (!legalNoticeSent) {
                MockDecision(
                    "L3", "send_legal_notice", "legal_notice", "POL-L3-NOTICE-001",
                    "$daysOverdue days overdue — L3 Statutory Demand Notice required per policy.",
                )
            } else {
                MockDecision(
                    "L3", "escalate_arbitration", "arbitration", "POL-L3-ARB-001",
                    "Legal notice sent without dispute resolution — route to in-house Arbitration Center.",
                )
            }
        }
        if (daysOverdue >= 30 || l1Attempts >= 4) {
            val channels = listOf("voice", "whatsapp", "email", "sms")
            val channel = channels[l2Attempts % channels.size]
            return MockDecision(
                "L2", "firm_reminder", channel, "POL-L2-001",
                "Day $daysOverdue overdue, L1 exhausted ($l1Attempts attempts) — Escalate to L2 $channel.",
            )
        }
        val l1Channels = listOf("whatsapp", "email", "sms")
        val channel = l1Channels[l1Attempts % l1Channels.size]
        // outstandingAmount only shifts the next-action delay server-side; kept for parity.
        val urgency = if (outstandingAmount > 500_000) "24h" else "72h"
        return MockDecision(
            "L1", "polite_reminder", channel, "POL-L1-001",
            "Day $daysOverdue overdue — L1 $channel polite reminder (attempt ${l1Attempts + 1}, next in $urgency).",
        )
    }

    /** Same compound-interest formula as calculateMSMEPenalInterest(). */
    private fun msmeInterest(principal: Double, dueDateIso: String): StatutoryInterest {
        val days = daysOverdue(dueDateIso) ?: 0
        val rbi = 6.75
        val statutory = rbi * 3
        val months = days / 30.4167
        val total = principal * (1 + statutory / 100.0 / 12.0).pow(months)
        val accrued = (total - principal).coerceAtLeast(0.0)
        return StatutoryInterest(
            principalAmount = round2(principal),
            statutoryRatePercent = statutory,
            rbiBaseRatePercent = rbi,
            multiplicationFactor = 3,
            daysOverdue = days,
            compoundingPeriodsMonths = round(months * 10) / 10,
            accruedInterest = round2(accrued),
            totalPayable = round2(total),
            legalFormula = "A = P * (1 + (3 * RBI_Bank_Rate)/12)^months (MSMED Act 2006 §16)",
            statutorySection = "Section 16, MSMED Act 2006 (Mandatory Compound Interest with Monthly Rests)",
            calculatedAt = Instant.now().toString(),
        )
    }

    private fun round2(v: Double): Double = round(v * 100) / 100

    private fun pollyVoice(lang: String): PollyVoiceConfig = when (lang) {
        "hi", "ta", "kn" -> PollyVoiceConfig("Kajal", "hi-IN", if (lang == "hi") "neural" else "standard")
        "en" -> PollyVoiceConfig("Aditi", "en-IN", "neural")
        else -> PollyVoiceConfig("Aditi", "en-IN", "standard")
    }

    private fun voiceScript(name: String, amount: Double, dueDateIso: String, lang: String): String =
        "Namaste $name. This is an automated statutory reminder from ChaanBean on behalf of your supplier. " +
            "An amount of ₹${amount.toLong()} was due on ${formatServerDate(dueDateIso)} and remains unpaid. " +
            "Please arrange settlement to avoid escalation under the MSMED Act 2006. " +
            "(Template l2_voice_reminder_v1, language $lang.)"

    override suspend fun audioAsset(hash: String): Outcome<AudioAssetResponse> = Outcome.Ok(
        AudioAssetResponse(
            hash = hash,
            exists = false,
            asset = null,
            audioStreamUrl = "/api/audio/$hash",
            durationSec = 38,
            mimeType = "audio/wav",
        )
    )

    /** No server in this flavor, so there is nothing to stream. */
    override fun audioStreamUrl(hash: String): String? = null
}

/** Every feature exposes exactly this: one factory keyed off the flavor flag. */
object RecoveryModule {
    // Shared instance so a settlement recorded on one screen is visible on the
    // worklist when you navigate back. The live repository is stateless.
    private val mock: MockRecoveryRepository by lazy { MockRecoveryRepository() }

    fun repository(container: AppContainer): RecoveryRepository =
        if (container.useMock) mock
        else LiveRecoveryRepository(
            container.retrofit.create(RecoveryApi::class.java),
            container.baseUrl,
        )
}
