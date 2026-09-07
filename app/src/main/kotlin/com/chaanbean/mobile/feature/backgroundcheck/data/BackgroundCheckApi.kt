package com.chaanbean.mobile.feature.backgroundcheck.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface BackgroundCheckApi {
    /** Parallel fan-out across every requested report type. Debits the wallet server-side. */
    @POST("api/verification")
    suspend fun run(@Body body: VerificationRunRequest): VerificationRunResponse

    @GET("api/verification/status")
    suspend fun gatewayStatus(): GatewayStatusResponse

    @POST("api/verification/otp-initiate")
    suspend fun initiateOtp(@Body body: OtpInitiateRequest): OtpInitiateResponse

    @POST("api/verification/otp-verify")
    suspend fun verifyOtp(@Body body: OtpVerifyRequest): OtpVerifyResponse
}
