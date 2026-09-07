package com.chaanbean.mobile.feature.dashboard.data

import retrofit2.http.GET

/**
 * The landing screen is assembled from four independent GETs. main has no
 * dashboard or summary endpoint - its web page reads prisma directly - so the
 * aggregation that page.tsx does server-side happens on the client here.
 */
interface DashboardApi {
    @GET("api/health")
    suspend fun health(): HealthResponse

    @GET("api/buyers")
    suspend fun buyers(): BuyersResponse

    @GET("api/recovery")
    suspend fun recovery(): RecoveryAccountsResponse

    @GET("api/businesses")
    suspend fun businesses(): BusinessesResponse
}
