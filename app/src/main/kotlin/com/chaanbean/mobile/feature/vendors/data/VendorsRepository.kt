package com.chaanbean.mobile.feature.vendors.data

import com.chaanbean.mobile.core.di.AppContainer
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.model.outcomeOf

interface VendorsRepository {
    suspend fun list(): Outcome<List<Vendor>>
    suspend fun create(request: CreateVendorRequest): Outcome<Vendor>
}

class LiveVendorsRepository(private val api: VendorsApi) : VendorsRepository {
    override suspend fun list(): Outcome<List<Vendor>> = outcomeOf { api.list().vendors }

    override suspend fun create(request: CreateVendorRequest): Outcome<Vendor> = outcomeOf {
        val res = api.create(request)
        res.vendor ?: throw IllegalStateException(res.error ?: "Vendor was not created")
    }
}

class MockVendorsRepository : VendorsRepository {
    private val store = mutableListOf(
        Vendor(
            id = "v1", name = "Sterling Polymers Pvt Ltd", vendorTrustId = "VTID-2001",
            category = "Raw Materials", pan = "AABCS1234K", gstin = "27AABCS1234K1Z5",
            turnoverRange = "\u20B95Cr\u201325Cr", trustScore = 92, kycStatus = "verified",
            onboardingDate = "2026-07-14T09:12:00.000Z", status = "active",
            directorDetails = """[{"name":"R. Balasubramanian","phone":"+91 98200 11223"}]""",
        ),
        Vendor(
            id = "v2", name = "Kaveri Logistics", vendorTrustId = "VTID-2002",
            category = "Logistics", pan = "AAECK9911P", gstin = "29AAECK9911P1ZQ",
            turnoverRange = "\u20B91.5Cr\u20135Cr", trustScore = 84, kycStatus = "verified",
            onboardingDate = "2026-08-02T11:40:00.000Z", status = "active",
            directorDetails = """[{"name":"Meera Iyer","phone":"+91 99450 77812"}]""",
        ),
        Vendor(
            id = "v3", name = "Nimbus IT Services", vendorTrustId = "VTID-2003",
            category = "IT Services", pan = null, gstin = "07AADCN4455R1Z2",
            turnoverRange = "\u20B950L\u20131.5Cr", trustScore = 71, kycStatus = "pending",
            onboardingDate = "2026-08-28T15:05:00.000Z", status = "active",
            directorDetails = """[{"name":"Authorized Signatory","phone":"\u2014"}]""",
        ),
    )

    override suspend fun list(): Outcome<List<Vendor>> = Outcome.Ok(store.toList())

    override suspend fun create(request: CreateVendorRequest): Outcome<Vendor> {
        // Mirrors the server's own trust-id and score rules so the mock stays honest.
        val trustId = "VTID-${2000 + store.size + 1}"
        val vendor = Vendor(
            id = "v${store.size + 1}",
            name = request.name,
            vendorTrustId = trustId,
            category = request.category,
            pan = request.pan?.uppercase(),
            gstin = request.gstin?.uppercase(),
            cin = request.cin?.uppercase(),
            turnoverRange = request.turnoverRange,
            trustScore = if (request.pan != null && request.gstin != null) 92 else 84,
            kycStatus = "verified",
            onboardingDate = null,
            status = "active",
            directorDetails = """[{"name":"${request.directorName ?: "Managing Director"}","phone":"${request.phone ?: ""}"}]""",
        )
        store.add(0, vendor)
        return Outcome.Ok(vendor)
    }
}

/** Every feature exposes exactly this: one factory keyed off the flavor flag. */
object VendorsModule {
    fun repository(container: AppContainer): VendorsRepository =
        if (container.useMock) MockVendorsRepository()
        else LiveVendorsRepository(container.retrofit.create(VendorsApi::class.java))
}
