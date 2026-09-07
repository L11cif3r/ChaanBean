package com.chaanbean.mobile.feature.search.data

import kotlinx.serialization.Serializable

/**
 * One row of `GET /api/search`. The server builds this shape by hand rather than
 * returning rows, so these are the only fields any result carries - there is no
 * per-record detail to expand into.
 */
@Serializable
data class SearchHit(
    val id: String = "",
    /** debtor | vendor | default | trust_profile */
    val type: String = "",
    val title: String = "",
    val subtitle: String = "",
    val identifier: String = "",
    val badge: String = "",
    /** green | amber | red | sky */
    val badgeColor: String = "",
    /** A web route, e.g. "/buyers/<id>" or the bare page "/vendors". */
    val href: String = "",
)

@Serializable
data class SearchResponse(val results: List<SearchHit> = emptyList())

/**
 * The four result families `/api/search` emits, in the order it emits them, with
 * the `take` cap each query uses. Showing the cap keeps the screen from implying
 * it found everything.
 */
enum class HitKind(
    val wire: String,
    val label: String,
    val blurb: String,
    val serverCap: Int,
) {
    DEBTOR(
        wire = "debtor",
        label = "Buyers & debtors",
        blurb = "Matched on name, GSTIN, PAN or mobile number.",
        serverCap = 5,
    ),
    VENDOR(
        wire = "vendor",
        label = "Vendors",
        blurb = "Matched on name, GSTIN, PAN or Vendor Trust ID.",
        serverCap = 4,
    ),
    DEFAULT(
        wire = "default",
        label = "Community defaults",
        blurb = "Defaults reported by other companies on this instance.",
        serverCap = 4,
    ),
    TRUST_PROFILE(
        wire = "trust_profile",
        label = "Network trust profiles",
        blurb = "Matched on Trust ID or the owning company's name.",
        serverCap = 3,
    ),
    OTHER(
        wire = "",
        label = "Other results",
        blurb = "A result type this build does not recognise.",
        serverCap = 0,
    );

    companion object {
        fun from(raw: String?): HitKind {
            val key = raw?.trim().orEmpty()
            return entries.firstOrNull { it.wire.isNotEmpty() && it.wire == key } ?: OTHER
        }
    }
}

/** Mirrors prisma `model BizRiskFlag`, as included by `/api/businesses/search`. */
@Serializable
data class BizRiskFlag(
    val id: String = "",
    val businessId: String = "",
    /** Server writes these uppercase: GREEN | AMBER | RED. */
    val flag: String = "",
    val compositeScore: Double = 0.0,
    /** JSON string, not an object. */
    val signalBreakdown: String? = null,
    /** JSON string, null when no hard red flag fired. */
    val hardRedFlags: String? = null,
    val recommendedLimit: Double = 0.0,
    val recommendedTenor: Int = 30,
    val computedAt: String? = null,
    val configSnapshot: String? = null,
)

/** Mirrors prisma `model BusinessProfile` plus the `riskFlag` include. */
@Serializable
data class BusinessSummary(
    val id: String = "",
    val companyName: String = "",
    val gstin: String? = null,
    val cin: String? = null,
    val pan: String? = null,
    val udyamNo: String? = null,
    val phone: String? = null,
    val registeredAddr: String? = null,
    val incorporatedOn: String? = null,
    val enterpriseType: String? = null,
    val industryCode: String? = null,
    val primaryActivity: String? = null,
    /** PENDING until the orchestrator finishes, then ACTIVE. */
    val overallStatus: String = "PENDING",
    /**
     * Schema default "PENDING". No handler on main ever advances this, so it is
     * PENDING for every profile the live server returns.
     */
    val sourceStatus: String = "PENDING",
    val createdBy: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val riskFlag: BizRiskFlag? = null,
)

@Serializable
data class BusinessSearchResponse(
    val businesses: List<BusinessSummary> = emptyList(),
    val error: String? = null,
)
