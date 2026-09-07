package com.chaanbean.mobile.feature.arbitration.data

import com.chaanbean.mobile.core.di.AppContainer
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.model.outcomeOf
import java.security.MessageDigest
import java.time.Instant
import java.time.temporal.ChronoUnit
import kotlin.math.max
import kotlin.math.pow
import kotlin.math.roundToLong
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

data class InterestRecalculation(
    val calculation: MsmeInterestResult,
    val updatedCase: ArbitrationCase?,
    val message: String,
)

data class SettlementDraft(
    val settlementDocUrl: String,
    val terms: String,
    val message: String,
)

data class ESignResult(
    val signatures: List<ESignSignature>,
    val eSignStatus: String,
    val message: String,
)

/**
 * What of the stored legal record the client can actually read back.
 *
 * The server writes LegalNotice and LegalEvidenceLog rows but exposes no route that
 * returns either; the web dashboard reads them straight out of prisma in a server
 * component. Screens use this to say so rather than render an empty list as if the
 * archive were genuinely empty.
 */
data class ArchiveAccess(
    val legalNoticesReadable: Boolean = false,
    val evidenceLogReadable: Boolean = false,
    val note: String = "",
)

interface ArbitrationRepository {
    suspend fun cases(): Outcome<List<ArbitrationCase>>
    suspend fun case(caseId: String): Outcome<ArbitrationCase>
    suspend fun recalculateInterest(caseId: String): Outcome<InterestRecalculation>
    suspend fun generateSettlement(caseId: String): Outcome<SettlementDraft>
    suspend fun eSign(
        caseId: String,
        signatoryName: String,
        signatoryRole: String,
    ): Outcome<ESignResult>

    fun signaturesOf(case: ArbitrationCase): List<ESignSignature>
    fun hearingsOf(case: ArbitrationCase): List<Hearing>
    fun archiveAccess(): ArchiveAccess
}

private const val ARCHIVE_NOTE =
    "The server stores legal notices and Section 65B evidence rows but publishes no route " +
        "that reads them back. Only entries this device created during this session can be listed."

class LiveArbitrationRepository(
    private val api: ArbitrationApi,
    private val json: Json,
) : ArbitrationRepository {

    override suspend fun cases(): Outcome<List<ArbitrationCase>> = outcomeOf { api.cases().cases }

    // The server has no GET /api/arbitration/{id}, so a single case is the list filtered.
    override suspend fun case(caseId: String): Outcome<ArbitrationCase> = outcomeOf {
        api.cases().cases.firstOrNull { it.id == caseId }
            ?: throw IllegalStateException("Arbitration case $caseId is no longer in the register")
    }

    override suspend fun recalculateInterest(caseId: String): Outcome<InterestRecalculation> =
        outcomeOf {
            val res = api.act(
                ArbitrationActionRequest(caseId, ArbitrationActions.RECALCULATE_INTEREST),
            )
            val calc = res.calculation
                ?: throw IllegalStateException(res.error ?: "Server returned no calculation")
            InterestRecalculation(
                calculation = calc,
                updatedCase = res.updatedCase,
                message = res.message ?: "Statutory penal interest recomputed",
            )
        }

    override suspend fun generateSettlement(caseId: String): Outcome<SettlementDraft> = outcomeOf {
        val res = api.act(ArbitrationActionRequest(caseId, ArbitrationActions.GENERATE_SETTLEMENT))
        val url = res.settlementDocUrl
            ?: throw IllegalStateException(res.error ?: "Server returned no settlement document")
        SettlementDraft(
            settlementDocUrl = url,
            terms = res.terms.orEmpty(),
            message = res.message ?: "Settlement agreement drafted",
        )
    }

    override suspend fun eSign(
        caseId: String,
        signatoryName: String,
        signatoryRole: String,
    ): Outcome<ESignResult> = outcomeOf {
        val res = api.act(
            ArbitrationActionRequest(
                caseId = caseId,
                action = ArbitrationActions.E_SIGN,
                signatoryName = signatoryName,
                signatoryRole = signatoryRole,
            ),
        )
        val signatures = res.signatures
            ?: throw IllegalStateException(res.error ?: "Server returned no signature block")
        ESignResult(
            signatures = signatures,
            eSignStatus = res.eSignStatus ?: "pending",
            message = res.message ?: "Signature recorded",
        )
    }

    override fun signaturesOf(case: ArbitrationCase): List<ESignSignature> =
        parseSignatures(json, case.eSignSignatures)

    override fun hearingsOf(case: ArbitrationCase): List<Hearing> =
        parseHearings(json, case.hearings)

    override fun archiveAccess(): ArchiveAccess = ArchiveAccess(
        legalNoticesReadable = false,
        evidenceLogReadable = false,
        note = ARCHIVE_NOTE,
    )
}

/**
 * In-memory stand-in for the same contract, including the same gaps: it will not serve
 * legal notices or evidence rows either, because the real server cannot.
 */
class MockArbitrationRepository(private val json: Json) : ArbitrationRepository {

    private val store = mutableListOf(
        ArbitrationCase(
            id = "arb1",
            creditAccountId = "ca-1",
            caseNumber = "ARB-CB-2026-0114",
            status = "settlement_pending",
            assignedLegalOwner = "Adv. Rajesh Nair, Nair & Associates, Kochi",
            claimantName = "Sundaram Industrial Fasteners Pvt Ltd",
            respondentName = "Deccan Auto Components Ltd",
            principalAmount = 4_82_000.0,
            penalInterestRate = 20.25,
            accruedInterest = 61_430.55,
            totalClaimAmount = 5_43_430.55,
            statutoryBasis = MSMED_BASIS,
            settlementTerms = "Mutually agreed out-of-court settlement: Principal \u20B94,82,000 + " +
                "negotiated interest \u20B936,858 payable in 2 tranches over 30 days under the " +
                "Arbitration & Conciliation Act 1996.",
            settlementDocUrl =
            "https://chaanbean-docs.s3.ap-south-1.amazonaws.com/settlements/arb1-settlement.pdf",
            eSignStatus = "initiator_signed",
            eSignSignatures = """[{"name":"Harish Parekh","role":"Authorized Signatory (Claimant)",""" +
                """"signedAt":"2026-08-21T06:41:09.000Z",""" +
                """"authMode":"Aadhaar e-Sign (UIDAI OTP Verified)",""" +
                """"docHash":"9f2b41c0d7e58a63b1f4c2098d5a7e31bb04c6f89a2d3e17c5b80a4f6d29e5c1"}]""",
            hearings = """[{"arbitrator":"Justice (Retd.) M. K. Ramanathan",""" +
                """"hearingDate":"2026-09-19T05:30:00.000Z",""" +
                """"venue":"MSME Facilitation Council, Chennai \u2014 Virtual Chamber"}]""",
            createdAt = "2026-07-30T10:15:00.000Z",
            updatedAt = "2026-08-21T06:41:09.000Z",
            creditAccount = ArbCreditAccount(
                id = "ca-1",
                buyerId = "b-1",
                outstandingAmount = 4_82_000.0,
                creditLimit = 7_50_000.0,
                tenorDays = 45,
                dueDate = "2026-05-12T00:00:00.000Z",
                overdueStatus = "defaulted",
                penalInterestRate = 20.25,
                disputeStatus = "under_arbitration",
                buyer = ArbBuyer(
                    id = "b-1",
                    name = "Deccan Auto Components Ltd",
                    contactPerson = "S. Venkataraman",
                    email = "accounts@deccanauto.co.in",
                    mobileNumbers = """["+91 98450 22417","+91 80 4123 8890"]""",
                    pan = "AADCD7712M",
                    gstin = "29AADCD7712M1ZK",
                    address = "Plot 14, Peenya Industrial Area Phase II, Bengaluru 560058",
                    language = "kn",
                ),
            ),
        ),
        ArbitrationCase(
            id = "arb2",
            creditAccountId = "ca-2",
            caseNumber = "ARB-CB-2026-0121",
            status = "open",
            assignedLegalOwner = "Adv. Preeti Shah, Shah Legal LLP, Ahmedabad",
            claimantName = "Sundaram Industrial Fasteners Pvt Ltd",
            respondentName = "Saurashtra Packaging Works",
            principalAmount = 12_60_000.0,
            penalInterestRate = 20.25,
            accruedInterest = 1_94_812.40,
            totalClaimAmount = 14_54_812.40,
            statutoryBasis = MSMED_BASIS,
            eSignStatus = "pending",
            createdAt = "2026-08-05T08:02:00.000Z",
            updatedAt = "2026-08-05T08:02:00.000Z",
            creditAccount = ArbCreditAccount(
                id = "ca-2",
                buyerId = "b-2",
                outstandingAmount = 12_60_000.0,
                creditLimit = 15_00_000.0,
                tenorDays = 30,
                dueDate = "2026-03-28T00:00:00.000Z",
                overdueStatus = "defaulted",
                penalInterestRate = 20.25,
                disputeStatus = "disputed",
                buyer = ArbBuyer(
                    id = "b-2",
                    name = "Saurashtra Packaging Works",
                    contactPerson = "Nileshbhai Patel",
                    email = "nilesh@saurashtrapack.in",
                    mobileNumbers = """["+91 99099 41180"]""",
                    pan = "AAGFS4410Q",
                    gstin = "24AAGFS4410Q1Z8",
                    address = "Survey 208, GIDC Estate, Rajkot 360003",
                    language = "hi",
                ),
            ),
        ),
        ArbitrationCase(
            id = "arb3",
            creditAccountId = "ca-3",
            caseNumber = "ARB-CB-2026-0098",
            status = "award_passed",
            assignedLegalOwner = "Adv. Fatima Sheikh, Sheikh & Co, Mumbai",
            claimantName = "Sundaram Industrial Fasteners Pvt Ltd",
            respondentName = "Konkan Marine Traders LLP",
            principalAmount = 2_35_500.0,
            penalInterestRate = 20.25,
            accruedInterest = 18_744.10,
            totalClaimAmount = 2_54_244.10,
            statutoryBasis = MSMED_BASIS,
            settlementTerms = "Full and final settlement of \u20B92,46,750 payable by RTGS within " +
                "15 days; claimant waives residual interest on realisation.",
            settlementDocUrl =
            "https://chaanbean-docs.s3.ap-south-1.amazonaws.com/settlements/arb3-settlement.pdf",
            eSignStatus = "fully_signed",
            eSignSignatures = """[{"name":"Harish Parekh","role":"Authorized Signatory (Claimant)",""" +
                """"signedAt":"2026-06-11T09:12:44.000Z",""" +
                """"authMode":"Aadhaar e-Sign (UIDAI OTP Verified)",""" +
                """"docHash":"41ac9d7e0b6f2c85913da4f70e8b62c1d59704af38be2c6015d7f9a3b8e40c72"},""" +
                """{"name":"Anjali Deshmukh","role":"Designated Partner (Respondent)",""" +
                """"signedAt":"2026-06-12T04:28:05.000Z",""" +
                """"authMode":"Aadhaar e-Sign (UIDAI OTP Verified)",""" +
                """"docHash":"c3170e8b95a4d2f61c8e07b34d9520af7168e3c40b25da9f8710c6e435bd21a9"}]""",
            hearings = """[{"arbitrator":"Adv. (Arb.) Kavita Raghunathan",""" +
                """"hearingDate":"2026-06-04T06:00:00.000Z",""" +
                """"venue":"Mumbai Centre for International Arbitration \u2014 Fast Track"}]""",
            createdAt = "2026-04-18T11:44:00.000Z",
            updatedAt = "2026-06-12T04:28:05.000Z",
            creditAccount = ArbCreditAccount(
                id = "ca-3",
                buyerId = "b-3",
                outstandingAmount = 0.0,
                creditLimit = 4_00_000.0,
                tenorDays = 30,
                dueDate = "2026-01-20T00:00:00.000Z",
                overdueStatus = "defaulted",
                penalInterestRate = 20.25,
                disputeStatus = "under_arbitration",
                buyer = ArbBuyer(
                    id = "b-3",
                    name = "Konkan Marine Traders LLP",
                    contactPerson = "Anjali Deshmukh",
                    email = "ops@konkanmarine.co.in",
                    mobileNumbers = """["+91 91670 33028"]""",
                    pan = "AAFCK9023H",
                    gstin = "27AAFCK9023H1ZR",
                    address = "Shop 7, Sassoon Dock Complex, Colaba, Mumbai 400005",
                    language = "en",
                ),
            ),
        ),
    )

    override suspend fun cases(): Outcome<List<ArbitrationCase>> = Outcome.Ok(store.toList())

    override suspend fun case(caseId: String): Outcome<ArbitrationCase> {
        val found = store.firstOrNull { it.id == caseId }
        return if (found == null) {
            Outcome.Err("Arbitration case $caseId is no longer in the register")
        } else {
            Outcome.Ok(found)
        }
    }

    override suspend fun recalculateInterest(caseId: String): Outcome<InterestRecalculation> {
        val index = store.indexOfFirst { it.id == caseId }
        if (index < 0) return Outcome.Err("Arbitration case not found")
        val current = store[index]
        val calc = calculateMsmePenalInterest(
            principal = current.principalAmount,
            dueDate = current.creditAccount?.dueDate,
        )
        val updated = current.copy(
            penalInterestRate = calc.statutoryRatePercent,
            accruedInterest = calc.accruedInterest,
            totalClaimAmount = calc.totalPayable,
        )
        store[index] = updated
        return Outcome.Ok(
            InterestRecalculation(
                calculation = calc,
                updatedCase = updated,
                message = "Statutory penal interest recomputed under MSMED Act 2006 \u00A716",
            ),
        )
    }

    override suspend fun generateSettlement(caseId: String): Outcome<SettlementDraft> {
        val index = store.indexOfFirst { it.id == caseId }
        if (index < 0) return Outcome.Err("Arbitration case not found")
        val current = store[index]
        val url =
            "https://chaanbean-docs.s3.ap-south-1.amazonaws.com/settlements/$caseId-settlement.pdf"
        val negotiated = (current.accruedInterest * 0.6).roundToLong()
        val terms = "Mutually agreed out-of-court settlement: Principal " +
            "\u20B9${indianGrouping(current.principalAmount.toLong())} + negotiated interest " +
            "\u20B9${indianGrouping(negotiated)} payable in 2 tranches over 30 days under the " +
            "Arbitration & Conciliation Act 1996."
        store[index] = current.copy(
            status = "settlement_pending",
            settlementTerms = terms,
            settlementDocUrl = url,
            eSignStatus = "pending",
        )
        return Outcome.Ok(
            SettlementDraft(
                settlementDocUrl = url,
                terms = terms,
                message = "Settlement agreement generated \u2014 ready for Aadhaar e-Sign",
            ),
        )
    }

    override suspend fun eSign(
        caseId: String,
        signatoryName: String,
        signatoryRole: String,
    ): Outcome<ESignResult> {
        val index = store.indexOfFirst { it.id == caseId }
        if (index < 0) return Outcome.Err("Arbitration case not found")
        val current = store[index]
        val timestamp = Instant.now().toString()
        val signature = ESignSignature(
            name = signatoryName,
            role = signatoryRole,
            signedAt = timestamp,
            authMode = "Aadhaar e-Sign (UIDAI OTP Verified)",
            docHash = sha256("$caseId:$signatoryName:$timestamp"),
        )
        val signatures = parseSignatures(json, current.eSignSignatures) + signature
        val fullySigned = signatures.size >= 2
        store[index] = current.copy(
            eSignStatus = if (fullySigned) "fully_signed" else "initiator_signed",
            status = if (fullySigned) "award_passed" else "settlement_pending",
            eSignSignatures = json.encodeToString(signatures),
        )
        return Outcome.Ok(
            ESignResult(
                signatures = signatures,
                eSignStatus = if (fullySigned) "fully_signed" else "initiator_signed",
                message = "Aadhaar e-Sign recorded for $signatoryName ($signatoryRole)",
            ),
        )
    }

    override fun signaturesOf(case: ArbitrationCase): List<ESignSignature> =
        parseSignatures(json, case.eSignSignatures)

    override fun hearingsOf(case: ArbitrationCase): List<Hearing> =
        parseHearings(json, case.hearings)

    override fun archiveAccess(): ArchiveAccess = ArchiveAccess(
        legalNoticesReadable = false,
        evidenceLogReadable = false,
        note = ARCHIVE_NOTE,
    )

    private companion object {
        const val MSMED_BASIS =
            "Micro, Small and Medium Enterprises Development (MSMED) Act, 2006 (Section 16)"
    }
}

/**
 * Kotlin port of `calculateMSMEPenalInterest` in src/lib/arbitration/interest.ts, kept
 * arithmetically identical so the mock flavor reports what the live server would.
 */
fun calculateMsmePenalInterest(
    principal: Double,
    dueDate: String?,
    asOf: Instant = Instant.now(),
    rbiBankRate: Double = 6.75,
): MsmeInterestResult {
    val due = runCatching { Instant.parse(dueDate) }.getOrNull()
    val daysOverdue = if (due == null) 0 else max(0L, ChronoUnit.DAYS.between(due, asOf)).toInt()

    val statutoryRatePercent = rbiBankRate * 3
    val monthlyRate = statutoryRatePercent / 100.0 / 12.0
    val months = daysOverdue / 30.4167
    val totalPayable = principal * (1.0 + monthlyRate).pow(months)
    val accruedInterest = max(0.0, totalPayable - principal)

    return MsmeInterestResult(
        principalAmount = round2(principal),
        statutoryRatePercent = statutoryRatePercent,
        rbiBaseRatePercent = rbiBankRate,
        multiplicationFactor = 3,
        daysOverdue = daysOverdue,
        compoundingPeriodsMonths = (months * 10).roundToLong() / 10.0,
        accruedInterest = round2(accruedInterest),
        totalPayable = round2(totalPayable),
        legalFormula = "A = P * (1 + (3 * RBI_Bank_Rate)/12)^months (MSMED Act 2006 \u00A716)",
        statutorySection =
        "Section 16, MSMED Act 2006 (Mandatory Compound Interest with Monthly Rests)",
        calculatedAt = asOf.toString(),
    )
}

private fun round2(value: Double): Double = (value * 100).roundToLong() / 100.0

private fun sha256(input: String): String =
    MessageDigest.getInstance("SHA-256")
        .digest(input.toByteArray())
        .joinToString("") { byte -> "%02x".format(byte) }

/** Lakh/crore digit grouping, matching `toLocaleString("en-IN")` on the server. */
private fun indianGrouping(value: Long): String {
    val s = value.toString()
    if (s.length <= 3) return s
    val last3 = s.takeLast(3)
    var rest = s.dropLast(3)
    val parts = mutableListOf<String>()
    while (rest.length > 2) {
        parts.add(0, rest.takeLast(2))
        rest = rest.dropLast(2)
    }
    if (rest.isNotEmpty()) parts.add(0, rest)
    return parts.joinToString(",") + "," + last3
}

object ArbitrationModule {
    fun repository(container: AppContainer): ArbitrationRepository =
        if (container.useMock) {
            MockArbitrationRepository(container.json)
        } else {
            LiveArbitrationRepository(
                container.retrofit.create(ArbitrationApi::class.java),
                container.json,
            )
        }
}
