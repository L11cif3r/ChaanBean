package com.chaanbean.mobile.core.di

import android.content.Context
import androidx.compose.runtime.staticCompositionLocalOf
import com.chaanbean.mobile.BuildConfig
import com.chaanbean.mobile.core.network.buildRetrofit
import kotlinx.serialization.json.Json
import retrofit2.Retrofit

/**
 * Deliberately tiny. It holds only shared infrastructure; every feature builds its
 * own repository from it via its own Module object. That keeps feature packages
 * self-contained and means adding a feature never edits this file.
 */
interface AppContainer {
    val retrofit: Retrofit
    val json: Json
    /** True in the `mock` flavor: repositories serve in-memory fixtures, no network. */
    val useMock: Boolean
    val baseUrl: String
    val session: SessionStore
    val preferences: AppPreferences
}

private class DefaultAppContainer(context: Context) : AppContainer {
    override val json: Json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        explicitNulls = false
        coerceInputValues = true
    }
    override val baseUrl: String = BuildConfig.API_BASE_URL
    override val useMock: Boolean = BuildConfig.USE_MOCK
    override val retrofit: Retrofit by lazy { buildRetrofit(baseUrl, json) }
    override val session: SessionStore = SessionStore(context)
    override val preferences: AppPreferences = AppPreferences(context)
}

fun createAppContainer(context: Context): AppContainer = DefaultAppContainer(context)

val LocalAppContainer = staticCompositionLocalOf<AppContainer> {
    error("No AppContainer provided. Wrap content in CompositionLocalProvider(LocalAppContainer provides ...).")
}
