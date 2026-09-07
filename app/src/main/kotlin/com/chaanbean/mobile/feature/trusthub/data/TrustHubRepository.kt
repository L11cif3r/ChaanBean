package com.chaanbean.mobile.feature.trusthub.data

import com.chaanbean.mobile.core.di.AppContainer
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.model.outcomeOf
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

interface TrustHubRepository {
    /**
     * A lookup that returns `found = false` is a successful call, not a failure -
     * the screen needs the server's suggested IDs out of that body.
     */
    suspend fun verify(trustId: String): Outcome<TrustVerification>

    suspend fun register(request: RegisterTrustIdRequest): Outcome<IssuedTrustProfile>

    suspend fun reportDefault(request: ReportDefaultRequest): Outcome<LocallyReportedDefault>

    /** Registry reads go through /api/search, which requires a query of 2+ characters. */
    suspend fun searchDefaults(query: String): Outcome<List<SearchHit>>
}

@Serializable
private data class ApiErrorBody(val error: String? = null)

class LiveTrustHubRepository(
    private val api: TrustHubApi,
    private val json: Json,
) : TrustHubRepository {

    override suspend fun verify(trustId: String): Outcome<TrustVerification> = outcomeOf {
        val response = api.verify(trustId)
        val ok = response.body()
        if (response.isSuccessful && ok != null) return@outcomeOf ok

        val raw = response.errorBody()?.string()
        if (response.code() == 404 && raw != null) {
            // Carries `found:false`, the explanation and the server's suggested Trust IDs.
            val decoded = runCatching { json.decodeFromString<TrustVerification>(raw) }.getOrNull()
            if (decoded != null) return@outcomeOf decoded
        }
        throw IllegalStateException(
            messageOf(raw, "Verification failed (HTTP " + response.code() + ")"),
        )
    }

    override suspend fun register(request: RegisterTrustIdRequest): Outcome<IssuedTrustProfile> =
        outcomeOf {
            val response = api.register(request)
            val body = response.body()
            val profile = body?.profile
            if (response.isSuccessful && profile != null) return@outcomeOf profile
            val fallback = if (response.code() == 409) {
                "Trust ID refused: this entity has peer defaults on the registry."
            } else {
                "Trust ID was not issued (HTTP " + response.code() + ")"
            }
            throw IllegalStateException(
                body?.error ?: messageOf(response.errorBody()?.string(), fallback),
            )
        }

    override suspend fun reportDefault(
        request: ReportDefaultRequest,
    ): Outcome<LocallyReportedDefault> = outcomeOf {
        val response = api.reportDefault(request)
        val body = response.body()
        val id = body?.defaultId
        if (!response.isSuccessful || id == null) {
            throw IllegalStateException(
                body?.error ?: messageOf(
                    response.errorBody()?.string(),
                    "Default was not published (HTTP " + response.code() + ")",
                ),
            )
        }
        LocallyReportedDefault(
            defaultId = id,
            debtorName = request.debtorName,
            amountDefaulted = request.amountDefaulted,
            debtorGstin = request.debtorGstin,
            debtorPan = request.debtorPan,
            serverMessage = body.message ?: "Published to the Trust Hub registry.",
        )
    }

    override suspend fun searchDefaults(query: String): Outcome<List<SearchHit>> = outcomeOf {
        api.search(query).results.filter { it.type == "default" }
    }

    private fun messageOf(raw: String?, fallback: String): String {
        if (raw.isNullOrBlank()) return fallback
        return runCatching { json.decodeFromString<ApiErrorBody>(raw).error }.getOrNull() ?: fallback
    }
}

/** The four literal checkpoints the TrustProfile branch always emits, plus the three data-driven ones. */
private fun profileCheckpoints(hasDefaults: Boolean, defaultsCount: Int): List<VerificationCheckpoint> =
    listOf(
        VerificationCheckpoint(
            "gst", "GST Profile & 3B Turnover", "passed",
            "Active GSTIN with consistent GSTR-3B filings across past 12 months.",
        ),
        VerificationCheckpoint(
            "director", "MCA21 Director Vetting", "passed",
            "Verified DIN status with Ministry of Corporate Affairs; zero disqualifications under Sec 164(2).",
        ),
        VerificationCheckpoint(
            "msme", "MSME Udyam Registration", "passed",
            "Classified as Medium Enterprise under MSMED Act 2006 statutory registry.",
        ),
        VerificationCheckpoint(
            "dues", "Payment Critical Dues Check", if (hasDefaults) "failed" else "passed",
            if (hasDefaults) {
                "$defaultsCount adverse peer commercial default(s) reported on network."
            } else {
                "Zero outstanding statutory or undisputed peer defaults on national registry."
            },
        ),
        VerificationCheckpoint(
            "behavior", "Payment Behavior & Tenor Integrity", if (hasDefaults) "warning" else "passed",
            if (hasDefaults) {
                "High tenor volatility observed."
            } else {
                "Weighted Average Delay (WAD) < 4 days over trailing 180 days."
            },
        ),
        VerificationCheckpoint(
            "legal", "Legal & Court Compliance", if (hasDefaults) "warning" else "passed",
            "Zero adverse NCLT insolvency petitions or Section 138 NI Act convictions.",
        ),
        VerificationCheckpoint(
            "bank", "Bank Account Penny-Drop Validation", "passed",
            "100% name-match confirmed via NPCI IMPS penny-drop.",
        ),
    )

class MockTrustHubRepository : TrustHubRepository {

    private val registryDefaults = mutableListOf(
        CommunityDefault(
            id = "cd_9f21",
            reportingCompanyId = "cmp_chaanbean_01",
            debtorGstin = "33AAGCV8812J1Z4",
            debtorPan = "AAGCV8812J",
            debtorName = "Vishwakarma Hardware & Sanitary",
            amountDefaulted = 1845000.0,
            defaultDate = "2026-05-19T00:00:00.000Z",
            notes = "Two cheques returned unpaid; 118 days past the agreed 45-day tenor.",
            verified = true,
            createdAt = "2026-05-22T06:41:00.000Z",
        ),
        CommunityDefault(
            id = "cd_7c04",
            reportingCompanyId = "cmp_chaanbean_01",
            debtorGstin = "07AACCN5561L1ZP",
            debtorPan = "AACCN5561L",
            debtorName = "Nandini Retail Ventures Pvt Ltd",
            amountDefaulted = 624500.0,
            defaultDate = "2026-07-02T00:00:00.000Z",
            notes = "Peer-reported commercial default via Trust Hub network",
            verified = true,
            createdAt = "2026-07-03T10:15:00.000Z",
        ),
    )

    private val profiles = listOf(
        TrustVerification(
            found = true,
            trustId = "TH-CB-GCAM-4821",
            entityName = "Amaravathi Steel Traders Pvt Ltd",
            entityType = "Private Limited Company",
            // Server-side these three are derived from a hash of the entity name, not looked up.
            pan = "AABCA6247Z",
            gstin = "27AABCA6247Z1Z5",
            cin = "U72900MH2024PTC418223",
            kycStatus = "verified",
            trustScore = 94,
            scoreTier = "Excellent Credibility",
            visibility = "network",
            badges = listOf(
                "GST Verified Enterprise",
                "Zero Peer Default Certified",
                "MCA21 Corporate Audited",
                "Trust Network Certified",
            ),
            issuedAt = "2026-03-11T08:20:00.000Z",
            validUntil = "2027-03-11T08:20:00.000Z",
            checkpoints = profileCheckpoints(hasDefaults = false, defaultsCount = 0),
            adverseDefaultsCount = 0,
            certificateHash = "5c1d9a3e7b204f6188ac0d5e93117f42bb6c8d0a41e75239cf8b1470d6a2e913",
            verificationAuthority = "ChaanBean Institutional Trust Network",
        ),
        TrustVerification(
            found = true,
            trustId = "VTID-2001",
            entityName = "Sterling Polymers Pvt Ltd",
            entityType = "Raw Materials",
            pan = "AABCS1234K",
            gstin = "27AABCS1234K1Z5",
            cin = null,
            kycStatus = "verified",
            trustScore = 92,
            scoreTier = "Excellent Credibility",
            visibility = "network",
            badges = listOf(
                "KYC Verified Vendor",
                "GST Active Supplier",
                "ChaanBean Pre-Audited Partner",
            ),
            issuedAt = "2026-07-14T09:12:00.000Z",
            validUntil = "2027-07-14T09:12:00.000Z",
            checkpoints = listOf(
                VerificationCheckpoint(
                    "gst", "GST Profile & 3B Turnover", "passed",
                    "Active GSTIN (27AABCS1234K1Z5) with verified turnover range " +
                        "₹5Cr–25Cr.",
                ),
                VerificationCheckpoint(
                    "director", "Key Signatory Vetting", "passed",
                    "Authorized director & signatory KYC documents validated.",
                ),
                VerificationCheckpoint(
                    "msme", "Enterprise Registration", "passed",
                    "Registered supplier profile in active standing.",
                ),
                VerificationCheckpoint(
                    "dues", "Payment Critical Dues Check", "passed",
                    "No commercial default complaints registered.",
                ),
                VerificationCheckpoint(
                    "bank", "Commercial Bank Verification", "passed",
                    "Settlement account verified via active penny drop.",
                ),
            ),
            adverseDefaultsCount = 0,
            certificateHash = "a71f04c8be3592d16c0847fb2e9a35d0417cc8b96e2f1d3a5087bb4c2e690f18",
            verificationAuthority = "ChaanBean Vendor Verification System",
        ),
        TrustVerification(
            found = true,
            trustId = "TH-33AAGCV8",
            entityName = "Vishwakarma Hardware & Sanitary",
            entityType = "Monitored Trade Counterparty",
            pan = "AAGCV8812J",
            gstin = "33AAGCV8812J1Z4",
            cin = null,
            kycStatus = "flagged",
            trustScore = 45,
            scoreTier = "High Risk (Amber/Red)",
            visibility = "network",
            badges = listOf("Monitored Counterparty", "Watchlist Escalated"),
            issuedAt = "2025-11-06T05:30:00.000Z",
            validUntil = "2026-05-05T05:30:00.000Z",
            checkpoints = listOf(
                VerificationCheckpoint(
                    "gst", "GST Filing Status", "passed",
                    "GSTIN 33AAGCV8812J1Z4 registered.",
                ),
                VerificationCheckpoint(
                    "dues", "Critical Dues & Adverse Defaults", "failed",
                    "Elevated credit risk flag or adverse payment alerts active.",
                ),
            ),
            adverseDefaultsCount = 1,
            adverseDefaults = listOf(registryDefaults[0]),
            certificateHash = "3e8b57cc1d0942a7f61b8e05473ca29d6f0812b45ad937ce1f2604a8bb75d3e0",
            verificationAuthority = "ChaanBean Counterparty Surveillance Engine",
        ),
    )

    override suspend fun verify(trustId: String): Outcome<TrustVerification> {
        val needle = trustId.trim()
        if (needle.isEmpty()) return Outcome.Err("Trust ID is required for verification.")
        val hit = profiles.firstOrNull { profile ->
            profile.trustId?.contains(needle, ignoreCase = true) == true ||
                profile.entityName?.contains(needle, ignoreCase = true) == true ||
                profile.gstin.equals(needle, ignoreCase = true) ||
                profile.pan.equals(needle, ignoreCase = true)
        }
        val notFound = TrustVerification(
            found = false,
            error = "No verified business found for Trust ID '" + needle + "'. Please confirm " +
                "the Trust ID or register your business for Trust ID certification.",
            suggestedIds = listOf("TH-CB-GCAM-4821", "VTID-2001", "TH-33AAGCV8"),
        )
        return Outcome.Ok(hit ?: notFound)
    }

    override suspend fun register(request: RegisterTrustIdRequest): Outcome<IssuedTrustProfile> {
        val pan = request.pan.trim().uppercase()
        val gstin = request.gstin?.trim()?.uppercase()
        // Mirrors the server: a single peer default blocks issuance outright.
        val blocking = registryDefaults.filter { row ->
            row.debtorPan == pan ||
                (gstin != null && row.debtorGstin == gstin) ||
                row.debtorName.contains(request.companyName.trim(), ignoreCase = true)
        }
        if (blocking.isNotEmpty()) {
            val total = blocking.sumOf { it.amountDefaulted }
            return Outcome.Err(
                "Cannot issue verified Trust ID: entity has " + blocking.size +
                    " active peer commercial default(s) totalling ₹" + total.toLong() +
                    " reported in the Community Default Registry.",
            )
        }
        val fee = when (request.businessType) {
            "proprietorship" -> 1000
            "partnership" -> 1500
            "company" -> 2000
            else -> 1500
        }
        val panPrefix = if (pan.length >= 6) pan.substring(2, 6) else "CORP"
        val suffix = 1000 + (kotlin.math.abs(pan.hashCode()) % 9000)
        val badges = listOf(
            "GST Verified Enterprise",
            "Zero Peer Default Certified",
            if (request.businessType == "company") "MCA21 Corporate Audited" else "MSMED Act Registered",
            "Trust Network Certified",
        )
        return Outcome.Ok(
            IssuedTrustProfile(
                id = "tp_" + suffix,
                trustId = "TH-CB-" + panPrefix + "-" + suffix,
                companyName = request.companyName.trim(),
                businessType = request.businessType,
                pan = pan,
                gstin = gstin,
                cin = request.cin?.trim()?.uppercase(),
                authorizedSignatory = request.authorizedSignatory ?: "Authorized Officer",
                phone = request.phone ?: "—",
                badges = badges,
                verificationFee = fee,
                issuedAt = "2026-09-07T11:02:00.000Z",
                certificateHash =
                "d40b1c7e93a25f8016bd4e2a7c9130fb58e6a04d27cc9f13be80a5417d6e2b9c",
            ),
        )
    }

    override suspend fun reportDefault(
        request: ReportDefaultRequest,
    ): Outcome<LocallyReportedDefault> {
        val id = "cd_mock_" + (registryDefaults.size + 1)
        registryDefaults.add(
            CommunityDefault(
                id = id,
                reportingCompanyId = "cmp_chaanbean_01",
                debtorGstin = request.debtorGstin,
                debtorPan = request.debtorPan,
                debtorName = request.debtorName,
                amountDefaulted = request.amountDefaulted,
                defaultDate = request.defaultDate,
                notes = request.notes ?: "Peer-reported commercial default via Trust Hub network",
            ),
        )
        return Outcome.Ok(
            LocallyReportedDefault(
                defaultId = id,
                debtorName = request.debtorName,
                amountDefaulted = request.amountDefaulted,
                debtorGstin = request.debtorGstin,
                debtorPan = request.debtorPan,
                serverMessage = "Community default published to Trust Hub. " +
                    "Associated risk flags updated.",
            ),
        )
    }

    override suspend fun searchDefaults(query: String): Outcome<List<SearchHit>> {
        val q = query.trim()
        if (q.length < 2) return Outcome.Ok(emptyList())
        val hits = registryDefaults
            .filter { row ->
                row.debtorName.contains(q, ignoreCase = true) ||
                    row.debtorGstin?.contains(q, ignoreCase = true) == true ||
                    row.debtorPan?.contains(q, ignoreCase = true) == true
            }
            .take(4)
            .map { row ->
                SearchHit(
                    id = row.id,
                    type = "default",
                    title = row.debtorName,
                    subtitle = "Default Amount: ₹" + row.amountDefaulted.toLong(),
                    identifier = row.debtorGstin ?: row.debtorPan ?: "N/A",
                    badge = "DEFAULTED",
                    badgeColor = "red",
                    href = "/trust-hub",
                )
            }
        return Outcome.Ok(hits)
    }
}

/** Every feature exposes exactly this: one factory keyed off the flavor flag. */
object TrustHubModule {
    fun repository(container: AppContainer): TrustHubRepository =
        if (container.useMock) {
            MockTrustHubRepository()
        } else {
            LiveTrustHubRepository(
                container.retrofit.create(TrustHubApi::class.java),
                container.json,
            )
        }
}
