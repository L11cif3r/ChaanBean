package com.chaanbean.mobile.feature.admingrowth.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/**
 * The pipeline POST is a single endpoint that switches on a string `action`, so
 * each mutation gets its own typed method here rather than one union body.
 */
interface AdminGrowthApi {
    @GET("api/admin/pipeline")
    suspend fun pipeline(): PipelineResponse

    @GET("api/admin/marketing")
    suspend fun marketing(): MarketingResponse

    @POST("api/admin/pipeline")
    suspend fun moveStage(@Body body: MoveStageRequest): PipelineActionResponse

    @POST("api/admin/pipeline")
    suspend fun createDeal(@Body body: CreateDealRequest): PipelineActionResponse

    @POST("api/admin/pipeline")
    suspend fun createLead(@Body body: CreateLeadRequest): PipelineActionResponse

    @POST("api/admin/pipeline")
    suspend fun convertToCompany(@Body body: ConvertToCompanyRequest): PipelineActionResponse

    @POST("api/admin/pipeline")
    suspend fun addActivity(@Body body: AddActivityRequest): PipelineActionResponse
}
