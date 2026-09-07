package com.chaanbean.mobile.feature.search.data

import com.chaanbean.mobile.core.di.AppContainer
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.model.outcomeOf

/** The shortest query `/api/search` will act on; below this it returns an empty list. */
const val MIN_QUERY_LENGTH: Int = 2

interface SearchRepository {
    suspend fun search(query: String): Outcome<List<SearchHit>>
    suspend fun searchBusinesses(query: String, flag: String?): Outcome<List<BusinessSummary>>
}

class LiveSearchRepository(private val api: SearchApi) : SearchRepository {

    override suspend fun search(query: String): Outcome<List<SearchHit>> = outcomeOf {
        api.search(query.trim()).results
    }

    override suspend fun searchBusinesses(
        query: String,
        flag: String?,
    ): Outcome<List<BusinessSummary>> = outcomeOf {
        val res = api.searchBusinesses(query.trim(), flag?.uppercase())
        // The handler catches its own exceptions and answers 500 with {error},
        // so a body carrying `error` is a failure Retrofit will not have raised.
        val failure = res.error
        if (failure != null && res.businesses.isEmpty()) throw IllegalStateException(failure)
        res.businesses
    }
}

/**
 * In-memory stand-in that reproduces main's matching rules, not just its shapes:
 * substring matching (SQLite LIKE, so case-insensitive for ASCII), the per-family
 * `take` caps, the 2-character floor on /api/search, and the AMBER fallback the
 * server substitutes for buyers that have no computed risk flag.
 */
class MockSearchRepository : SearchRepository {

    private class Row(val hit: SearchHit, val fields: List<String>)

    private val rows = listOf(
        Row(
            SearchHit(
                id = "bd-8841",
                type = "debtor",
                title = "Rathi Steel Traders LLP",
                subtitle = "Outstanding: \u20B918,42,000",
                identifier = "27AACFR8821L1ZK",
                badge = "RED RISK",
                badgeColor = "red",
                href = "/buyers/bd-8841",
            ),
            listOf("Rathi Steel Traders LLP", "27AACFR8821L1ZK", "AACFR8821L", "+91 98204 41230"),
        ),
        Row(
            SearchHit(
                id = "bd-8842",
                type = "debtor",
                title = "Sundaram Auto Components Pvt Ltd",
                subtitle = "Outstanding: \u20B96,20,000",
                identifier = "33AABCS4512M1ZP",
                badge = "GREEN RISK",
                badgeColor = "green",
                href = "/buyers/bd-8842",
            ),
            listOf("Sundaram Auto Components Pvt Ltd", "33AABCS4512M1ZP", "AABCS4512M", "+91 90031 77451"),
        ),
        Row(
            // No RiskFlag row exists for this buyer; the server still labels it AMBER.
            SearchHit(
                id = "bd-8843",
                type = "debtor",
                title = "Meenakshi Textiles Pvt Ltd",
                subtitle = "Outstanding: \u20B92,15,500",
                identifier = "AAJCM6620F",
                badge = "AMBER RISK",
                badgeColor = "amber",
                href = "/buyers/bd-8843",
            ),
            listOf("Meenakshi Textiles Pvt Ltd", "AAJCM6620F", "+91 94440 20918"),
        ),
        Row(
            SearchHit(
                id = "v1",
                type = "vendor",
                title = "Sterling Polymers Pvt Ltd",
                subtitle = "Trust Score: 92/100 \u00B7 Raw Materials",
                identifier = "VTID-2001",
                badge = "KYC VERIFIED",
                badgeColor = "green",
                href = "/vendors",
            ),
            listOf("Sterling Polymers Pvt Ltd", "27AABCS1234K1Z5", "AABCS1234K", "VTID-2001"),
        ),
        Row(
            SearchHit(
                id = "v2",
                type = "vendor",
                title = "Kaveri Logistics",
                subtitle = "Trust Score: 84/100 \u00B7 Logistics",
                identifier = "VTID-2002",
                badge = "KYC VERIFIED",
                badgeColor = "green",
                href = "/vendors",
            ),
            listOf("Kaveri Logistics", "29AAECK9911P1ZQ", "AAECK9911P", "VTID-2002"),
        ),
        Row(
            SearchHit(
                id = "v3",
                type = "vendor",
                title = "Nimbus IT Services",
                subtitle = "Trust Score: 71/100 \u00B7 IT Services",
                identifier = "VTID-2003",
                badge = "PENDING",
                badgeColor = "amber",
                href = "/vendors",
            ),
            listOf("Nimbus IT Services", "07AADCN4455R1Z2", "VTID-2003"),
        ),
        Row(
            SearchHit(
                id = "cd-311",
                type = "default",
                title = "Vasudha Agro Exports Pvt Ltd",
                subtitle = "Default Amount: \u20B99,75,000",
                identifier = "24AAFCV3390Q1Z8",
                badge = "DEFAULTED",
                badgeColor = "red",
                href = "/trust-hub",
            ),
            listOf("Vasudha Agro Exports Pvt Ltd", "24AAFCV3390Q1Z8", "AAFCV3390Q"),
        ),
        Row(
            SearchHit(
                id = "cd-312",
                type = "default",
                title = "Rathi Steel Traders LLP",
                subtitle = "Default Amount: \u20B94,10,000",
                identifier = "AACFR8821L",
                badge = "DEFAULTED",
                badgeColor = "red",
                href = "/trust-hub",
            ),
            listOf("Rathi Steel Traders LLP", "27AACFR8821L1ZK", "AACFR8821L"),
        ),
        Row(
            SearchHit(
                id = "tp-77",
                type = "trust_profile",
                title = "Deccan Industrial Supplies Pvt Ltd",
                subtitle = "Network Organization \u00B7 Trust ID: TRUST-CB-1042",
                identifier = "TRUST-CB-1042",
                badge = "NETWORK TRUST",
                badgeColor = "sky",
                href = "/trust-hub",
            ),
            listOf("Deccan Industrial Supplies Pvt Ltd", "TRUST-CB-1042"),
        ),
        Row(
            SearchHit(
                id = "tp-78",
                type = "trust_profile",
                title = "Sundaram Auto Components Pvt Ltd",
                subtitle = "Network Organization \u00B7 Trust ID: TRUST-CB-1108",
                identifier = "TRUST-CB-1108",
                badge = "NETWORK TRUST",
                badgeColor = "sky",
                href = "/trust-hub",
            ),
            listOf("Sundaram Auto Components Pvt Ltd", "TRUST-CB-1108"),
        ),
    )

    private val businesses = listOf(
        BusinessSummary(
            id = "bp-4401",
            companyName = "Bharat Packaging Industries",
            pan = "AAGCB7712H",
            udyamNo = "UDYAM-KA-03-0012345",
            phone = "+91 80412 66701",
            registeredAddr = "Plot 42, Peenya Industrial Area Phase II, Bengaluru 560058",
            incorporatedOn = "2016-03-11T00:00:00.000Z",
            enterpriseType = "Small",
            primaryActivity = "Corrugated packaging manufacture",
            overallStatus = "ACTIVE",
            createdAt = "2026-08-19T06:22:00.000Z",
            riskFlag = null,
        ),
        BusinessSummary(
            id = "bp-4402",
            companyName = "Rathi Steel Traders LLP",
            gstin = "27AACFR8821L1ZK",
            pan = "AACFR8821L",
            cin = "AAB-9921",
            phone = "+91 98204 41230",
            registeredAddr = "Unit 7, Kalamboli Steel Market, Navi Mumbai 410218",
            incorporatedOn = "2013-07-29T00:00:00.000Z",
            enterpriseType = "Small",
            primaryActivity = "Wholesale trade in TMT bars and structural steel",
            overallStatus = "ACTIVE",
            createdAt = "2026-07-02T10:15:00.000Z",
            riskFlag = BizRiskFlag(
                id = "brf-4402",
                businessId = "bp-4402",
                flag = "AMBER",
                compositeScore = 54.2,
                recommendedLimit = 1200000.0,
                recommendedTenor = 30,
                computedAt = "2026-08-30T04:40:00.000Z",
            ),
        ),
        BusinessSummary(
            id = "bp-4403",
            companyName = "Sundaram Auto Components Pvt Ltd",
            gstin = "33AABCS4512M1ZP",
            pan = "AABCS4512M",
            cin = "U34103TN2011PTC081234",
            phone = "+91 90031 77451",
            registeredAddr = "SIDCO Industrial Estate, Ambattur, Chennai 600098",
            incorporatedOn = "2011-05-04T00:00:00.000Z",
            enterpriseType = "Medium",
            primaryActivity = "Precision machined components for automotive OEMs",
            overallStatus = "ACTIVE",
            createdAt = "2026-06-18T08:05:00.000Z",
            riskFlag = BizRiskFlag(
                id = "brf-4403",
                businessId = "bp-4403",
                flag = "GREEN",
                compositeScore = 78.5,
                recommendedLimit = 4500000.0,
                recommendedTenor = 45,
                computedAt = "2026-08-31T11:02:00.000Z",
            ),
        ),
        BusinessSummary(
            id = "bp-4404",
            companyName = "Vasudha Agro Exports Pvt Ltd",
            gstin = "24AAFCV3390Q1Z8",
            pan = "AAFCV3390Q",
            cin = "U01100GJ2018PTC104556",
            phone = "+91 79294 30118",
            registeredAddr = "Survey 118/2, Kadi Road, Mehsana 384002, Gujarat",
            incorporatedOn = "2018-11-23T00:00:00.000Z",
            enterpriseType = "Small",
            primaryActivity = "Export of dehydrated onion and spice powders",
            overallStatus = "ACTIVE",
            createdAt = "2026-08-04T13:47:00.000Z",
            riskFlag = BizRiskFlag(
                id = "brf-4404",
                businessId = "bp-4404",
                flag = "RED",
                compositeScore = 31.0,
                hardRedFlags = """["GST filings lapsed 2 consecutive quarters","Reported community default"]""",
                recommendedLimit = 0.0,
                recommendedTenor = 15,
                computedAt = "2026-09-01T05:31:00.000Z",
            ),
        ),
    )

    override suspend fun search(query: String): Outcome<List<SearchHit>> {
        val q = query.trim()
        if (q.length < MIN_QUERY_LENGTH) return Outcome.Ok(emptyList())
        val matched = rows.filter { row -> row.fields.any { it.contains(q, ignoreCase = true) } }
        val ordered = HitKind.entries
            .filter { it != HitKind.OTHER }
            .flatMap { kind ->
                matched.filter { it.hit.type == kind.wire }.take(kind.serverCap)
            }
        return Outcome.Ok(ordered.map { it.hit })
    }

    override suspend fun searchBusinesses(
        query: String,
        flag: String?,
    ): Outcome<List<BusinessSummary>> {
        val q = query.trim()
        val wanted = flag?.trim()?.uppercase()
        val matched = businesses
            .filter { b ->
                q.isEmpty() || listOfNotNull(b.companyName, b.gstin, b.cin, b.pan)
                    .any { it.contains(q, ignoreCase = true) }
            }
            .filter { b -> wanted == null || b.riskFlag?.flag?.uppercase() == wanted }
            .sortedBy { it.companyName }
            .take(20)
        return Outcome.Ok(matched)
    }
}

object SearchModule {
    fun repository(container: AppContainer): SearchRepository =
        if (container.useMock) MockSearchRepository()
        else LiveSearchRepository(container.retrofit.create(SearchApi::class.java))
}
