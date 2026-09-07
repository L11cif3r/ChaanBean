package com.chaanbean.mobile.feature.backgroundcheck.data

import com.chaanbean.mobile.core.di.AppContainer
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.model.outcomeOf
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.add
import kotlinx.serialization.json.addJsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject

interface BackgroundCheckRepository {
    suspend fun run(request: VerificationRunRequest): Outcome<List<NormalizedReport>>
    suspend fun gatewayStatus(): Outcome<GatewayStatusResponse>
    suspend fun initiateOtp(request: OtpInitiateRequest): Outcome<OtpInitiateResponse>
    suspend fun verifyOtp(request: OtpVerifyRequest): Outcome<OtpVerifyResponse>
}

class LiveBackgroundCheckRepository(
    private val api: BackgroundCheckApi,
) : BackgroundCheckRepository {

    override suspend fun run(request: VerificationRunRequest): Outcome<List<NormalizedReport>> =
        outcomeOf {
            val res = api.run(request)
            val error = res.error
            if (error != null) throw IllegalStateException(error)
            res.reports
        }

    override suspend fun gatewayStatus(): Outcome<GatewayStatusResponse> =
        outcomeOf { api.gatewayStatus() }

    override suspend fun initiateOtp(request: OtpInitiateRequest): Outcome<OtpInitiateResponse> =
        outcomeOf {
            val res = api.initiateOtp(request)
            val error = res.error
            if (error != null) throw IllegalStateException(error)
            res
        }

    override suspend fun verifyOtp(request: OtpVerifyRequest): Outcome<OtpVerifyResponse> =
        outcomeOf {
            val res = api.verifyOtp(request)
            val error = res.error
            if (error != null) throw IllegalStateException(error)
            res
        }
}

/**
 * In-memory stand-in. The payload keys are copied from the server's adapters so the
 * mock exercises the same rendering path, and the sandbox-only values are the same
 * kind of derived-from-your-own-records numbers the real handlers produce.
 */
class MockBackgroundCheckRepository : BackgroundCheckRepository {

    private val fetchedAt = "2026-09-07T09:41:00.000Z"
    private val expiresAt = "2026-10-07T09:41:00.000Z"

    override suspend fun run(request: VerificationRunRequest): Outcome<List<NormalizedReport>> {
        if (request.subjectId.isBlank() || request.reportTypes.isEmpty()) {
            return Outcome.Err("subjectId and reportTypes are required")
        }
        return Outcome.Ok(request.reportTypes.map { report(it, request.subjectId, request.subjectType) })
    }

    override suspend fun gatewayStatus(): Outcome<GatewayStatusResponse> = Outcome.Ok(
        GatewayStatusResponse(
            timestamp = fetchedAt,
            summary = GatewaySummary(
                totalAdapters = adapters.size,
                liveCount = adapters.count { it.status == "live" },
                sandboxCount = adapters.count { it.status == "sandbox" },
                failingCount = 0,
            ),
            adapters = adapters,
        ),
    )

    override suspend fun initiateOtp(request: OtpInitiateRequest): Outcome<OtpInitiateResponse> {
        if (request.gstin.isBlank()) return Outcome.Err("GSTIN is required")
        val tail = request.mobile?.takeLast(4).orEmpty().ifBlank { "3210" }
        return Outcome.Ok(
            OtpInitiateResponse(
                sessionId = "GST-OTP-9F2A41C0B7E3",
                status = "otp_sent",
                message = "OTP dispatched to registered mobile ending in ***$tail via GSTN SMS gateway.",
            ),
        )
    }

    /** Accepts any code, exactly as the server does - see verifyGstSupremeOtp in clients.ts. */
    override suspend fun verifyOtp(request: OtpVerifyRequest): Outcome<OtpVerifyResponse> {
        if (request.sessionId.isBlank() || request.otp.isBlank()) {
            return Outcome.Err("sessionId and otp are required")
        }
        if (!request.sessionId.startsWith("GST-OTP")) {
            return Outcome.Err("Invalid or expired OTP session.")
        }
        return Outcome.Ok(
            OtpVerifyResponse(
                success = true,
                reportId = "cmvr8x1k40001mock",
                data = gstSupremeData,
            ),
        )
    }

    private fun report(code: String, subjectId: String, subjectType: String): NormalizedReport {
        val provider = when (code) {
            "gst_slab_check" -> "GSTN Public Portal Gateway"
            "gst_exact_turnover" -> "APIsetu / GSTN Portal Gateway"
            "gst_supreme_report" -> "GST Supreme Intermediary Gateway"
            "bureau_report" -> "CIBIL Commercial Gateway"
            "payment_behaviour" -> "Commercial Payment History Exchange"
            "court_case_history" -> "e-Courts Judicial Database Gateway"
            "fir_check" -> "CCTNS Police Database Intermediary"
            "director_details" -> "MCA21 Corporate Registry Gateway"
            "msme_report" -> "Udyam Registration Portal Gateway"
            "import_export_report" -> "DGFT / ICEGATE Trade Gateway"
            "mobile_to_pan" -> "NSDL / Income Tax Department KYC Gateway"
            "mobile_identity", "mobile_to_address" -> "Telecom KYC & Subscriber Registry"
            "address_enrichment" -> "Hyperlocal Delivery Graph Aggregator"
            "find_someone" -> "ChaanBean Skip Tracing & Recovery Intelligence"
            else -> "MCA21 & Financial Aggregator Gateway"
        }
        return NormalizedReport(
            reportType = code,
            subjectType = subjectType,
            subjectId = subjectId,
            provider = provider,
            status = "completed",
            fetchedAt = fetchedAt,
            expiresAt = expiresAt,
            data = payload(code, subjectId),
            otpRequired = code == "gst_supreme_report",
        )
    }

    private fun payload(code: String, subjectId: String): JsonObject = when (code) {
        "gst_slab_check" -> buildJsonObject {
            put("gstin", "27AAECG1234H1Z5")
            put("indicativeSlab", "₹5Cr+ (Medium/Large)")
            put("registrationDate", "2018-07-01")
            put("jurisdiction", "Maharashtra (Ward 04, Bandra Kurla Complex)")
            put("taxpayerType", "Regular Commercial Taxpayer")
            put("source", "GSTN Public Gateway Records")
        }

        "gst_exact_turnover" -> buildJsonObject {
            put("turnoverTrend", "growing")
            putJsonArray("annualTurnover") {
                addJsonObject {
                    put("year", "FY21")
                    put("amount", 26250000)
                    put("grossMarginPct", 18.2)
                }
                addJsonObject {
                    put("year", "FY22")
                    put("amount", 30800000)
                    put("grossMarginPct", 19.5)
                }
                addJsonObject {
                    put("year", "FY23")
                    put("amount", 36750000)
                    put("grossMarginPct", 17.8)
                }
                addJsonObject {
                    put("year", "FY24")
                    put("amount", 43750000)
                    put("grossMarginPct", 21.0)
                }
            }
            put("filingStatus", "GSTR-3B & GSTR-1 Verified Consistent")
            put("source", "APIsetu / GSTN Portal Records")
        }

        "gst_supreme_report" -> gstSupremeData

        "bureau_report" -> buildJsonObject {
            put("bureauScore", 715)
            put("provider", "CIBIL")
            put("band", "good")
            put("delinquentAccounts", 0)
            put("totalTradeLines", 12)
            put("utilizationRatePct", 44.0)
            putJsonArray("fallbackChainUsed") { add("CIBIL Commercial") }
        }

        "payment_behaviour" -> buildJsonObject {
            put("averagePaymentDelayDays", 38)
            put("defaultHistory", 0)
            put("onTimePaymentPct", 62)
            put("inquiriesLast3Months", 3)
        }

        "court_case_history" -> buildJsonObject {
            put("activeCases", 2)
            put("resolvedCases", 2)
            putJsonArray("cases") {
                addJsonObject {
                    put("cnrNumber", "CB-ARB-ARB-2026-0417")
                    put("court", "ChaanBean Institutional Arbitration Tribunal, Mumbai")
                    put("caseType", "MSMED Act §18 Statutory Arbitration Claim")
                    put("status", "Active Hearing")
                    put("claimAmount", 4820000)
                    put("filingYear", 2026)
                }
                addJsonObject {
                    put("cnrNumber", "MHCC02-004128-2025")
                    put("court", "City Civil Court, Dindoshi, Mumbai")
                    put("caseType", "Commercial Summary Suit (Sec 138 NI Act / Order 37 CPC)")
                    put("status", "Notice Issued & Pending Adjudication")
                    put("claimAmount", 1265000)
                    put("filingYear", 2025)
                }
            }
        }

        "fir_check" -> buildJsonObject {
            put("firRegistered", true)
            putJsonObject("firDetails") {
                put("firNumber", "FIR/204/2025")
                put("policeStation", "MIDC Andheri Police Station, Mumbai")
                putJsonArray("sections") {
                    add("Section 138 Negotiable Instruments Act")
                    add("Section 420 IPC (Cheating)")
                }
                put("status", "Charge-Sheet Filed / Summons Issued")
                put("year", 2025)
            }
        }

        "director_details" -> buildJsonObject {
            putJsonArray("directors") {
                addJsonObject {
                    put("din", "02847192")
                    put("name", "Rajeshwar Rao Deshmukh")
                    put("designation", "Managing Director")
                    put("status", "active")
                }
                addJsonObject {
                    put("din", "07891234")
                    put("name", "Sunita Deshmukh")
                    put("designation", "Director")
                    put("status", "active")
                }
            }
        }

        "msme_report" -> buildJsonObject {
            put("udyamNumber", "UDYAM-MH-03-0048291")
            put("enterpriseName", "Sharda Metallics Pvt Ltd")
            put("category", "Small Enterprise")
            put("dateOfIncorporation", "2017-06-12")
            put("valid", true)
            put("majorActivity", "Manufacturing & Wholesale Distribution")
            put("nic2Digit", "28 - Machinery & Wholesale Trade")
        }

        "import_export_report" -> buildJsonObject {
            put("iecCode", "03ECG12310")
            put("activeShipments", 18)
            put("totalExportValueUSD", 850000)
            put("totalImportValueUSD", 320000)
            put("complianceStatus", "DEL / Denied Entity List: Clear")
        }

        "mobile_to_pan" -> buildJsonObject {
            put("pan", "AAECG1234H")
            put("panHolderName", "Sharda Metallics Pvt Ltd")
            put("panStatus", "ACTIVE_AND_SEEDED_WITH_AADHAAR")
            put("panMatch", true)
            put("seededWithAadhaar", true)
        }

        "mobile_identity", "mobile_to_address" -> buildJsonObject {
            put("mobileVerified", true)
            put("subscriberName", "Sharda Metallics Pvt Ltd")
            put("simActiveDays", 1420)
            put("circle", "Maharashtra & Goa")
            put("addressConfidence", 0.96)
            put("registeredAddress", "Plot C-14, MIDC Andheri East, Mumbai 400093")
        }

        "address_enrichment" -> buildJsonObject {
            put("addressConfidence", 0.98)
            putJsonArray("deliveryGraphSources") {
                add("Swiggy Instamart")
                add("Amazon Business")
                add("Zomato")
                add("Meesho")
                add("Paytm Merchant")
            }
            put("lastActiveDeliveryDate", "2026-09-05T06:20:00.000Z")
            put("matchedCluster", "Plot C-14, MIDC Andheri East, Mumbai 400093")
        }

        "find_someone" -> buildJsonObject {
            put("subject", "Rajeshwar Rao Deshmukh")
            putJsonArray("alternateMobiles") {
                add("+91 98201 43310")
                add("+91 98204 43310")
            }
            putJsonArray("associatedEmails") {
                add("accounts@shardametallics.in")
                add("director.aaecg@gmail.com")
            }
            putJsonArray("activeGeoLocations") {
                add("MIDC Andheri East, Mumbai")
                add("Bhiwandi Warehousing Cluster")
            }
            putJsonArray("linkedEntities") {
                add("Sharda Metallics Pvt Ltd")
                add("Sharda Logistics LLP")
            }
            put("lastActiveDate", "2026-09-05T06:20:00.000Z")
        }

        // company_supreme_report, and pan_to_mobile_email, which the server routes here too.
        else -> buildJsonObject {
            put("cin", "U74999MH2018PTC312345")
            put("status", "Active")
            put("paidUpCapital", 10000000)
            put("authorizedCapital", 25000000)
            put("financialsAvailable", true)
            put("netWorth", 38500000)
            put("ebitdaMarginPct", 16.4)
            put("debtToEquityRatio", 0.75)
            if (code == "pan_to_mobile_email") {
                put("subjectId", subjectId)
            }
        }
    }

    private val gstSupremeData: JsonObject = buildJsonObject {
        put("filingConsistency", "consistent")
        put("last12Filings", 12)
        put("counterpartyPanCount", 20)
        putJsonArray("counterpartyPans") {
            add("AABCS1234F")
            add("AAECK9911P")
            add("AADCN4455R")
            add("AAECS5678J")
            add("AAECM9012K")
        }
        put("mismatches", false)
        put("totalITCClaimed", 5400000)
    }

    private val adapters = listOf(
        GatewayAdapter(
            id = "apisetu",
            name = "APIsetu (GST Exact Turnover)",
            type = "government_tax",
            status = "sandbox",
            latencyMs = 142,
            circuitBreaker = "closed",
            endpoint = "https://apisetu.gov.in/gst/v1/turnover",
            reportsSupported = listOf("gst_exact_turnover", "gst_slab_check"),
        ),
        GatewayAdapter(
            id = "gst_supreme",
            name = "GST Supreme Report (OTP Flow)",
            type = "tax_filing_history",
            status = "sandbox",
            latencyMs = 180,
            circuitBreaker = "closed",
            endpoint = "https://services.gst.gov.in/services/api/returns",
            reportsSupported = listOf("gst_supreme_report"),
        ),
        GatewayAdapter(
            id = "cibil_commercial",
            name = "TransUnion CIBIL Commercial API",
            type = "credit_bureau",
            status = "sandbox",
            latencyMs = 210,
            circuitBreaker = "closed",
            endpoint = "https://api.cibil.com/commercial/v1/report",
            reportsSupported = listOf("bureau_report"),
        ),
        GatewayAdapter(
            id = "experian",
            name = "Experian Commercial Bureau (Fallback #1)",
            type = "credit_bureau",
            status = "sandbox",
            latencyMs = 195,
            circuitBreaker = "standby",
            endpoint = "https://api.experian.in/commercial/v2",
            reportsSupported = listOf("bureau_report"),
        ),
        GatewayAdapter(
            id = "crif_high_mark",
            name = "CRIF High Mark API (Fallback #2)",
            type = "credit_bureau",
            status = "sandbox",
            latencyMs = 205,
            circuitBreaker = "standby",
            endpoint = "https://api.crifhighmark.com/v1",
            reportsSupported = listOf("bureau_report"),
        ),
        GatewayAdapter(
            id = "kyc_aggregator",
            name = "Karza / Digitap / Perfios KYC Aggregator",
            type = "identity_corporate",
            status = "sandbox",
            latencyMs = 110,
            circuitBreaker = "closed",
            endpoint = "https://api.karza.in/v3",
            reportsSupported = listOf(
                "mobile_to_pan",
                "mobile_identity",
                "mobile_to_address",
                "company_supreme_report",
                "msme_report",
                "director_details",
                "find_someone",
            ),
        ),
        GatewayAdapter(
            id = "ecourts",
            name = "e-Courts Case Aggregator",
            type = "judicial_records",
            status = "sandbox",
            latencyMs = 160,
            circuitBreaker = "closed",
            endpoint = "https://services.ecourts.gov.in/ecourtindia_v6",
            reportsSupported = listOf("court_case_history"),
        ),
        GatewayAdapter(
            id = "cctns_fir",
            name = "CCTNS Police FIR Database",
            type = "law_enforcement",
            status = "sandbox",
            latencyMs = 140,
            circuitBreaker = "closed",
            endpoint = "https://digitalpolice.gov.in/cctns/v1",
            reportsSupported = listOf("fir_check"),
        ),
        GatewayAdapter(
            id = "dgft_icegate",
            name = "DGFT / ICEGATE Import Export Gateway",
            type = "trade_customs",
            status = "sandbox",
            latencyMs = 130,
            circuitBreaker = "closed",
            endpoint = "https://dgft.gov.in/api/v1/iec",
            reportsSupported = listOf("import_export_report"),
        ),
        GatewayAdapter(
            id = "delivery_graph",
            name = "E-Commerce Delivery Graph (Swiggy, Zomato, Amazon, Meesho)",
            type = "address_enrichment",
            status = "sandbox",
            latencyMs = 120,
            circuitBreaker = "closed",
            endpoint = "https://delivery-graph.chaanbean.in/v1",
            reportsSupported = listOf("address_enrichment"),
        ),
        GatewayAdapter(
            id = "it_gst_ref",
            name = "Income Tax & GST Portal Reference Lookup",
            type = "legal_notice_acknowledgment",
            status = "sandbox",
            latencyMs = 95,
            circuitBreaker = "closed",
            endpoint = "https://eportal.incometax.gov.in/iec/foservices/api/ref",
            reportsSupported = listOf("legal_notice_gov_ref"),
        ),
    )
}

object BackgroundCheckModule {
    fun repository(container: AppContainer): BackgroundCheckRepository =
        if (container.useMock) MockBackgroundCheckRepository()
        else LiveBackgroundCheckRepository(container.retrofit.create(BackgroundCheckApi::class.java))
}
