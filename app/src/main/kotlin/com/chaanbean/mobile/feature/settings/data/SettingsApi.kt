package com.chaanbean.mobile.feature.settings.data

import retrofit2.http.GET

/**
 * The whole diagnostic surface the server offers. The web console's settings page
 * renders its wallet ledger and gateway registry server-side and exposes no route
 * for either, so there is nothing else to declare here.
 */
interface SettingsApi {
    @GET("api/health")
    suspend fun health(): HealthResponse
}
