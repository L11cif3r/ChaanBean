package com.chaanbean.mobile.feature.recovery.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface RecoveryApi {
    /** Worklist. Carries `buyer` and the newest `escalationStates` entry per account. */
    @GET("api/recovery")
    suspend fun list(): RecoveryAccountsResponse

    /** Same path, different response shape: flattened account + interest + voice script. */
    @GET("api/recovery")
    suspend fun detail(@Query("creditAccountId") creditAccountId: String): RecoveryDetailResponse

    @POST("api/recovery")
    suspend fun action(@Body body: RecoveryActionRequest): RecoveryActionResponse

    /**
     * Separate route. The main recovery handler declares a "settle_payment" action in
     * its body type but implements no branch for it, so posting that value there runs
     * a recovery tick instead of recording money.
     */
    @POST("api/recovery/settle")
    suspend fun settle(@Body body: SettlementRequest): SettlementResponse

    /**
     * Metadata for a rendered call announcement. `format=json` is required: without it
     * the same route streams a WAV body, which Retrofit would fail to deserialize.
     */
    @GET("api/audio/{hash}")
    suspend fun audioAsset(
        @Path("hash") hash: String,
        @Query("format") format: String = "json",
    ): AudioAssetResponse
}
