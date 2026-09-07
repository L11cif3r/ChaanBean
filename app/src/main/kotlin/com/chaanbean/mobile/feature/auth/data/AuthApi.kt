package com.chaanbean.mobile.feature.auth.data

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

/**
 * All four actions hit the same path. Responses are wrapped in [Response] because the
 * failure body carries the only message worth showing ("Invalid Admin Master Security
 * Key.", "Enterprise Company Name and Official Email are required.") and Retrofit would
 * otherwise collapse it into a bare HTTP code.
 */
interface AuthApi {
    @POST("api/auth")
    suspend fun loginClient(@Body body: ClientLoginRequest): Response<AuthResponse>

    @POST("api/auth")
    suspend fun registerClient(@Body body: ClientRegisterRequest): Response<AuthResponse>

    @POST("api/auth")
    suspend fun loginAdmin(@Body body: AdminLoginRequest): Response<AuthResponse>

    @POST("api/auth")
    suspend fun registerAdmin(@Body body: AdminRegisterRequest): Response<AuthResponse>
}
