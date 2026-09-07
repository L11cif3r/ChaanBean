package com.chaanbean.mobile.feature.arbitration.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/**
 * The whole arbitration surface the server offers. There is no GET-by-id, no route for
 * LegalNotice and none for LegalEvidenceLog, so this interface has exactly two calls.
 */
interface ArbitrationApi {
    @GET("api/arbitration")
    suspend fun cases(): ArbitrationListResponse

    @POST("api/arbitration")
    suspend fun act(@Body body: ArbitrationActionRequest): ArbitrationActionResponse
}
