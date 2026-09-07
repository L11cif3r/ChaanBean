package com.chaanbean.mobile.feature.search.data

import retrofit2.http.GET
import retrofit2.http.Query

interface SearchApi {
    /** Returns `{ results: [] }` unchecked for any q shorter than 2 characters. */
    @GET("api/search")
    suspend fun search(@Query("q") q: String): SearchResponse

    /** `flag` is optional; Retrofit omits the parameter entirely when it is null. */
    @GET("api/businesses/search")
    suspend fun searchBusinesses(
        @Query("q") q: String,
        @Query("flag") flag: String?,
    ): BusinessSearchResponse
}
