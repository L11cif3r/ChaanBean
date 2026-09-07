package com.chaanbean.mobile.feature.trusthub.data

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

/**
 * Responses are wrapped in retrofit2.Response because the meaningful text lives in
 * the error bodies: verify answers 404 with `suggestedIds`, and register answers
 * 409 with the peer-default rejection reason. Throwing those away would lose the
 * only explanation the user gets.
 */
interface TrustHubApi {
    @GET("api/trust-hub/verify")
    suspend fun verify(@Query("trustId") trustId: String): Response<TrustVerification>

    @POST("api/trust-hub/register")
    suspend fun register(@Body body: RegisterTrustIdRequest): Response<RegisterTrustIdResponse>

    @POST("api/trust-hub/defaults")
    suspend fun reportDefault(@Body body: ReportDefaultRequest): Response<ReportDefaultResponse>

    /** No endpoint lists the default registry; this search is the only way to read it. */
    @GET("api/search")
    suspend fun search(@Query("q") query: String): SearchResponse
}
