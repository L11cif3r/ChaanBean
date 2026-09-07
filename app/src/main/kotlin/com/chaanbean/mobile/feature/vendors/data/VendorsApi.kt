package com.chaanbean.mobile.feature.vendors.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface VendorsApi {
    @GET("api/vendors")
    suspend fun list(): VendorListResponse

    @POST("api/vendors")
    suspend fun create(@Body body: CreateVendorRequest): CreateVendorResponse
}
