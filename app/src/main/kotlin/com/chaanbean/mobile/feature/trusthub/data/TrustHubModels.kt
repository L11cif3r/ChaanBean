package com.chaanbean.mobile.feature.trusthub.data

import kotlinx.serialization.Serializable

/**
 * Mirrors prisma `model CommunityDefault`. This is returned verbatim inside
 * /api/trust-hub/verify's `adverseDefaults`, so the field names are the column
 * names. Dates arrive as ISO-8601 strings.
 */
@Serializable
data class CommunityDefault(
    val id: String = "",
    val reportingCompanyId: String = "",
    val debtorGstin: String? = null,
    val debtorPan: String? = null,
    val debtorName: String = "",
    val amountDefaulted: Double = 0.0,
    val defaultDate: String? = null,
    val evidenceDocUrl: String? = null,
    val notes: String? = null,
    val verified: Boolean = true,
    val createdAt: String? = null,
)

/**
 * One row of /api/trust-hub/verify's `checkpoints` array.
 *
 * `status` is one of passed | warning | failed. Read the handler before trusting
 * it: for a registered TrustProfile only the `dues`, `behavior` and `legal` keys
 * change with the data - the rest are literals in the route file.
 */
@Serializable
data class VerificationCheckpoint(
    val key: String = "",
    val label: String = "",
    val status: String = "passed",
    val detail: String = "",
)

/**
 * GET /api/trust-hub/verify?trustId=...
 *
 * The 404 body has the same shape with `found = false`, `error` and
 * `suggestedIds` populated, so both outcomes decode into this one class.
 */
@Serializable
data class TrustVerification(
    val found: Boolean = false,
    val trustId: String? = null,
    val entityName: String? = null,
    val entityType: String? = null,
    val pan: String? = null,
    val gstin: String? = null,
    val cin: String? = null,
    val kycStatus: String? = null,
    val trustScore: Int? = null,
    val scoreTier: String? = null,
    val visibility: String? = null,
    val badges: List<String> = emptyList(),
    val issuedAt: String? = null,
    val validUntil: String? = null,
    val checkpoints: List<VerificationCheckpoint> = emptyList(),
    val adverseDefaultsCount: Int = 0,
    val adverseDefaults: List<CommunityDefault> = emptyList(),
    val certificateHash: String? = null,
    /** Names which of the handler's three branches answered; drives the caveats we show. */
    val verificationAuthority: String? = null,
    val error: String? = null,
    val suggestedIds: List<String> = emptyList(),
)

/** The branch of /api/trust-hub/verify that produced a result. */
enum class VerificationSource {
    TRUST_PROFILE, VENDOR, COUNTERPARTY, UNKNOWN;

    companion object {
        fun from(authority: String?): VerificationSource = when (authority) {
            "ChaanBean Institutional Trust Network" -> TRUST_PROFILE
            "ChaanBean Vendor Verification System" -> VENDOR
            "ChaanBean Counterparty Surveillance Engine" -> COUNTERPARTY
            else -> UNKNOWN
        }
    }
}

/** POST /api/trust-hub/register. Only `companyName` and `pan` are enforced server-side. */
@Serializable
data class RegisterTrustIdRequest(
    val companyName: String,
    val pan: String,
    val businessType: String = "partnership",
    val gstin: String? = null,
    val cin: String? = null,
    val phone: String? = null,
    val authorizedSignatory: String? = null,
)

@Serializable
data class IssuedTrustProfile(
    val id: String = "",
    val trustId: String = "",
    val companyName: String = "",
    val businessType: String = "",
    val pan: String = "",
    val gstin: String? = null,
    val cin: String? = null,
    val authorizedSignatory: String = "",
    val phone: String = "",
    val badges: List<String> = emptyList(),
    val verificationFee: Int = 0,
    val issuedAt: String? = null,
    val certificateHash: String = "",
)

@Serializable
data class RegisterTrustIdResponse(
    val success: Boolean = false,
    val message: String? = null,
    val trustId: String? = null,
    val profile: IssuedTrustProfile? = null,
    val error: String? = null,
)

/** POST /api/trust-hub/defaults. */
@Serializable
data class ReportDefaultRequest(
    val debtorName: String,
    val amountDefaulted: Double,
    val debtorGstin: String? = null,
    val debtorPan: String? = null,
    val defaultDate: String? = null,
    val notes: String? = null,
)

/** The handler returns only an id - it does not echo the stored row back. */
@Serializable
data class ReportDefaultResponse(
    val success: Boolean = false,
    val message: String? = null,
    val defaultId: String? = null,
    val error: String? = null,
)

/** One row of GET /api/search?q=... - the only read path onto the defaults registry. */
@Serializable
data class SearchHit(
    val id: String = "",
    val type: String = "",
    val title: String = "",
    val subtitle: String = "",
    val identifier: String = "",
    val badge: String = "",
    val badgeColor: String = "sky",
    val href: String = "",
)

@Serializable
data class SearchResponse(val results: List<SearchHit> = emptyList())

/** A default this device filed this session. The server gives back no row to re-read. */
data class LocallyReportedDefault(
    val defaultId: String,
    val debtorName: String,
    val amountDefaulted: Double,
    val debtorGstin: String?,
    val debtorPan: String?,
    val serverMessage: String,
)
