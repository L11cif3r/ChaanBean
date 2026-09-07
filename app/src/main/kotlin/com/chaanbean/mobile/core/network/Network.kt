package com.chaanbean.mobile.core.network

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import com.chaanbean.mobile.BuildConfig
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit

fun buildRetrofit(baseUrl: String, json: Json): Retrofit {
    val logging = HttpLoggingInterceptor().apply {
        // Bodies only in debug. The server sends no credentials and this app holds
        // no token, so there is nothing secret in a request body - but a release
        // build should not narrate customer data into logcat regardless.
        level = if (BuildConfig.DEBUG) {
            HttpLoggingInterceptor.Level.BODY
        } else {
            HttpLoggingInterceptor.Level.BASIC
        }
    }
    val client = OkHttpClient.Builder()
        .addInterceptor(logging)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    return Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
}
