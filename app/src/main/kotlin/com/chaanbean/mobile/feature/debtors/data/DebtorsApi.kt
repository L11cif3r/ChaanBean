package com.chaanbean.mobile.feature.debtors.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface DebtorsApi {
    @GET("api/buyers")
    suspend fun list(): BuyerListResponse

    @POST("api/buyers")
    suspend fun create(@Body body: CreateBuyerRequest): CreateBuyerResponse

    @POST("api/risk")
    suspend fun refreshRisk(@Body body: RefreshRiskRequest): RefreshRiskResponse

    /**
     * `GET /api/recovery` without `creditAccountId` returns every credit account
     * with its latest escalation state. The single-account variant of the same
     * route omits `history`, so this listing is the only source for the ladder.
     */
    @GET("api/recovery")
    suspend fun recoveryAccounts(): RecoveryAccountsResponse
}
