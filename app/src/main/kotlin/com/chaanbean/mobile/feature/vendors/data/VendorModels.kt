package com.chaanbean.mobile.feature.vendors.data

import kotlinx.serialization.Serializable

/**
 * Mirrors prisma `model Vendor`. Dates arrive as ISO-8601 strings over JSON.
 * Nullable fields are nullable here for the same reason they are in the schema.
 */
@Serializable
data class Vendor(
    val id: String,
    val companyId: String = "",
    val name: String,
    val vendorTrustId: String = "",
    val category: String = "Raw Materials",
    val pan: String? = null,
    val gstin: String? = null,
    val cin: String? = null,
    val turnoverRange: String? = null,
    val trustScore: Int = 85,
    val kycStatus: String = "verified",
    val onboardingDate: String? = null,
    val status: String = "active",
    /** Server stores this as a JSON string, not an array. Parsed lazily by the UI. */
    val directorDetails: String? = null,
)

@Serializable
data class VendorListResponse(val vendors: List<Vendor> = emptyList())

@Serializable
data class CreateVendorRequest(
    val name: String,
    val pan: String? = null,
    val gstin: String? = null,
    val cin: String? = null,
    val category: String = "Raw Materials",
    val turnoverRange: String = "\u20B91.5Cr\u20135Cr",
    val directorName: String? = null,
    val phone: String? = null,
)

@Serializable
data class CreateVendorResponse(
    val success: Boolean = false,
    val trustId: String? = null,
    val id: String? = null,
    val vendor: Vendor? = null,
    val error: String? = null,
)
