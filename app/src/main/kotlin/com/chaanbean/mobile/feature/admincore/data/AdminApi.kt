package com.chaanbean.mobile.feature.admincore.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface AdminApi {
    @GET("api/admin/auth")
    suspend fun whoAmI(@Query("role") role: String): AdminAuthResponse

    @POST("api/admin/auth")
    suspend fun switchRole(@Body body: AdminRoleRequest): AdminAuthResponse

    @GET("api/admin/customers")
    suspend fun customers(): AdminCustomers

    /** Throws HttpException(403) for any role but "owner"; the repository turns that into Denied. */
    @GET("api/admin/financials")
    suspend fun financials(@Query("role") role: String): AdminFinancials
}
