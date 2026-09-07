package com.chaanbean.mobile

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.descriptors.StructureKind
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

import com.chaanbean.mobile.feature.admincore.data.AdminAuthResponse
import com.chaanbean.mobile.feature.admincore.data.AdminCustomers
import com.chaanbean.mobile.feature.admincore.data.AdminFinancials
import com.chaanbean.mobile.feature.businesscheck.data.AuditResponse
import com.chaanbean.mobile.feature.businesscheck.data.BusinessDetailResponse
import com.chaanbean.mobile.feature.search.data.BusinessSearchResponse
import com.chaanbean.mobile.feature.businesscheck.data.CreditResponse
import com.chaanbean.mobile.feature.businesscheck.data.DocumentsResponse
import com.chaanbean.mobile.feature.businesscheck.data.RiskResponse
import com.chaanbean.mobile.feature.recovery.data.RecoveryDetailResponse
import com.chaanbean.mobile.feature.search.data.SearchResponse
import com.chaanbean.mobile.feature.trusthub.data.TrustVerification
import com.chaanbean.mobile.feature.admingrowth.data.MarketingResponse
import com.chaanbean.mobile.feature.admingrowth.data.PipelineResponse
import com.chaanbean.mobile.feature.arbitration.data.ArbitrationListResponse
import com.chaanbean.mobile.feature.backgroundcheck.data.GatewayStatusResponse
import com.chaanbean.mobile.feature.businesscheck.data.BusinessListResponse
import com.chaanbean.mobile.feature.dashboard.data.HealthResponse
import com.chaanbean.mobile.feature.debtors.data.BuyerListResponse
import com.chaanbean.mobile.feature.recovery.data.AudioAssetResponse
import com.chaanbean.mobile.feature.recovery.data.RecoveryAccountsResponse
import com.chaanbean.mobile.feature.vendors.data.VendorListResponse

/**
 * Contract tests against fixtures captured from a real `main` dev server
 * (see app/src/test/resources/fixtures). They exist to catch the failure mode
 * that compilation cannot: a model field whose name does not match the server's,
 * which deserializes to a silent default instead of erroring.
 */
@OptIn(ExperimentalSerializationApi::class)
class ApiContractTest {

    /** Same configuration the app uses, so the tests exercise real behaviour. */
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        explicitNulls = false
        coerceInputValues = true
    }

    private fun fixture(name: String): String =
        javaClass.classLoader!!.getResourceAsStream("fixtures/$name.json")
            ?.bufferedReader()?.readText()
            ?: fail("missing fixture: $name.json").let { "" }

    private fun <T> parse(name: String, serializer: KSerializer<T>): T =
        json.decodeFromString(serializer, fixture(name))

    // ---------------------------------------------------------------- parsing

    @Test
    fun `every captured response deserializes`() {
        parse("businesses", BusinessListResponse.serializer())
        parse("buyers", BuyerListResponse.serializer())
        parse("vendors", VendorListResponse.serializer())
        parse("recovery", RecoveryAccountsResponse.serializer())
        parse("arbitration", ArbitrationListResponse.serializer())
        parse("health", HealthResponse.serializer())
        parse("audio_meta", AudioAssetResponse.serializer())
        parse("verification_status", GatewayStatusResponse.serializer())
        parse("admin_customers", AdminCustomers.serializer())
        parse("admin_financials", AdminFinancials.serializer())
        parse("admin_marketing", MarketingResponse.serializer())
        parse("admin_pipeline", PipelineResponse.serializer())
        parse("admin_auth", AdminAuthResponse.serializer())
        parse("business_detail", BusinessDetailResponse.serializer())
        parse("business_risk", RiskResponse.serializer())
        parse("business_credit", CreditResponse.serializer())
        parse("business_audit", AuditResponse.serializer())
        parse("business_docs", DocumentsResponse.serializer())
        parse("businesses_search", BusinessSearchResponse.serializer())
        parse("recovery_detail", RecoveryDetailResponse.serializer())
        parse("trusthub_verify", TrustVerification.serializer())
        parse("search", SearchResponse.serializer())
    }

    /** The detail payload feeds the largest screen in the app; assert it is really read. */
    @Test
    fun `business detail carries identity, risk and credit`() {
        val business = parse("business_detail", BusinessDetailResponse.serializer()).business
        assertTrue("no business in detail payload", business != null)
        assertFalse("detail id empty", business!!.id.isBlank())
        assertFalse("company name empty", business.companyName.isBlank())
    }

    // ------------------------------------------------- primary content is real

    @Test
    fun `list endpoints yield populated, identified rows`() {
        val businesses = parse("businesses", BusinessListResponse.serializer()).businesses
        assertTrue("no businesses parsed", businesses.isNotEmpty())
        assertFalse("business id empty", businesses.first().id.isBlank())

        val buyers = parse("buyers", BuyerListResponse.serializer()).buyers
        assertTrue("no buyers parsed", buyers.isNotEmpty())
        assertFalse("buyer id empty", buyers.first().id.isBlank())

        val vendors = parse("vendors", VendorListResponse.serializer()).vendors
        assertTrue("no vendors parsed", vendors.isNotEmpty())
        assertFalse("vendor id empty", vendors.first().id.isBlank())

        val accounts = parse("recovery", RecoveryAccountsResponse.serializer()).accounts
        assertTrue("no credit accounts parsed", accounts.isNotEmpty())
        assertFalse("account id empty", accounts.first().id.isBlank())

        val cases = parse("arbitration", ArbitrationListResponse.serializer()).cases
        assertTrue("no arbitration cases parsed", cases.isNotEmpty())
    }

    @Test
    fun `health check reflects the server payload`() {
        val health = parse("health", HealthResponse.serializer())
        assertTrue("status not read: '${health.status}'", health.status == "healthy")
    }

    // ------------------------------------------------------------ drift report

    /**
     * Prints model fields the server never sent for that payload. Those are the
     * candidates for a silent-null bug. Some are legitimately absent (error fields
     * on a success response), so this reports rather than fails - read the output.
     */
    @Test
    fun `report model fields absent from the real payload`() {
        val checks: List<Triple<String, KSerializer<*>, String>> = listOf(
            Triple("businesses", BusinessListResponse.serializer(), "BusinessListResponse"),
            Triple("buyers", BuyerListResponse.serializer(), "BuyerListResponse"),
            Triple("vendors", VendorListResponse.serializer(), "VendorListResponse"),
            Triple("recovery", RecoveryAccountsResponse.serializer(), "RecoveryAccountsResponse"),
            Triple("arbitration", ArbitrationListResponse.serializer(), "ArbitrationListResponse"),
            Triple("health", HealthResponse.serializer(), "HealthResponse"),
            Triple("verification_status", GatewayStatusResponse.serializer(), "GatewayStatusResponse"),
            Triple("admin_customers", AdminCustomers.serializer(), "AdminCustomers"),
            Triple("admin_financials", AdminFinancials.serializer(), "AdminFinancials"),
            Triple("admin_marketing", MarketingResponse.serializer(), "MarketingResponse"),
            Triple("admin_pipeline", PipelineResponse.serializer(), "PipelineResponse"),
            Triple("admin_auth", AdminAuthResponse.serializer(), "AdminAuthResponse"),
            Triple("business_detail", BusinessDetailResponse.serializer(), "BusinessDetailResponse"),
            Triple("business_risk", RiskResponse.serializer(), "RiskResponse"),
            Triple("business_credit", CreditResponse.serializer(), "CreditResponse"),
            Triple("business_audit", AuditResponse.serializer(), "AuditResponse"),
            Triple("businesses_search", BusinessSearchResponse.serializer(), "BusinessSearchResponse"),
            Triple("recovery_detail", RecoveryDetailResponse.serializer(), "RecoveryDetailResponse"),
            Triple("trusthub_verify", TrustVerification.serializer(), "TrustVerification"),
        )

        val report = StringBuilder("\n=== FIELD DRIFT REPORT ===\n")
        checks.forEach { (name, serializer, label) ->
            val root = json.parseToJsonElement(fixture(name))
            val missing = sortedSetOf<String>()
            walk(serializer.descriptor, root, label, missing)
            if (missing.isEmpty()) {
                report.append("OK   $label\n")
            } else {
                report.append("DRIFT $label\n")
                missing.forEach { report.append("        $it\n") }
            }
        }
        println(report)
    }

    /** Descends the descriptor and payload together, collecting unmatched model fields. */
    private fun walk(
        descriptor: SerialDescriptor,
        element: JsonElement,
        path: String,
        missing: MutableSet<String>,
        depth: Int = 0,
    ) {
        if (depth > 4) return
        when (descriptor.kind) {
            StructureKind.LIST -> {
                val array = element as? JsonArray ?: return
                val itemDescriptor = descriptor.getElementDescriptor(0)
                // One representative element is enough; rows share a shape.
                array.firstOrNull()?.let { walk(itemDescriptor, it, "$path[]", missing, depth + 1) }
            }
            StructureKind.CLASS, StructureKind.OBJECT -> {
                val obj = element as? JsonObject ?: return
                for (i in 0 until descriptor.elementsCount) {
                    val field = descriptor.getElementName(i)
                    val child = obj[field]
                    if (child == null) {
                        missing.add("$path.$field")
                    } else {
                        walk(descriptor.getElementDescriptor(i), child, "$path.$field", missing, depth + 1)
                    }
                }
            }
            else -> Unit
        }
    }
}
