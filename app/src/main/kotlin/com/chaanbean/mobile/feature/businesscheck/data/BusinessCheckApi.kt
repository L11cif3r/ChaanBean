package com.chaanbean.mobile.feature.businesscheck.data

import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * No default parameter values here: Retrofit invokes the interface method
 * through a proxy, so every caller passes every argument explicitly.
 */
interface BusinessCheckApi {

    @GET("api/businesses")
    suspend fun list(
        @Query("createdBy") createdBy: String?,
        @Query("flag") flag: String?,
    ): BusinessListResponse

    @GET("api/businesses/search")
    suspend fun search(
        @Query("q") q: String,
        @Query("flag") flag: String?,
    ): BusinessListResponse

    /** 409 with `existingId` when the GSTIN is already on file, so read the raw response. */
    @POST("api/businesses")
    suspend fun create(@Body body: CreateBusinessRequest): Response<CreateBusinessResponse>

    @GET("api/businesses/{id}")
    suspend fun detail(@Path("id") id: String): BusinessDetailResponse

    @PATCH("api/businesses/{id}")
    suspend fun update(
        @Path("id") id: String,
        @Body body: UpdateBusinessRequest,
    ): BusinessDetailResponse

    @POST("api/businesses/compare")
    suspend fun compare(@Body body: CompareRequest): BusinessListResponse

    @POST("api/businesses/{id}/verify")
    suspend fun verify(@Path("id") id: String): VerifyResponse

    @GET("api/businesses/{id}/risk")
    suspend fun risk(@Path("id") id: String): RiskResponse

    @GET("api/businesses/{id}/credit")
    suspend fun credit(@Path("id") id: String): CreditResponse

    @GET("api/businesses/{id}/audit")
    suspend fun audit(
        @Path("id") id: String,
        @Query("limit") limit: Int,
    ): AuditResponse

    @GET("api/businesses/{id}/documents")
    suspend fun documents(@Path("id") id: String): DocumentsResponse

    /** Single document with its extractions. */
    @GET("api/businesses/{id}/documents/{docId}")
    suspend fun document(
        @Path("id") id: String,
        @Path("docId") docId: String,
    ): SingleDocumentResponse

    /** multipart/form-data: the handler reads `file`, `category` and `fiscalYear`. */
    @Multipart
    @POST("api/businesses/{id}/documents")
    suspend fun uploadDocument(
        @Path("id") id: String,
        @Part file: MultipartBody.Part,
        @Part("category") category: RequestBody,
        @Part("fiscalYear") fiscalYear: RequestBody?,
    ): Response<UploadDocumentResponse>

    @POST("api/businesses/{id}/manual-verify")
    suspend fun manualVerifyMca(
        @Path("id") id: String,
        @Body body: McaManualVerifyRequest,
    ): ManualVerifyResponse

    @POST("api/businesses/{id}/manual-verify")
    suspend fun manualVerifyGst(
        @Path("id") id: String,
        @Body body: GstManualVerifyRequest,
    ): ManualVerifyResponse

    @POST("api/businesses/{id}/manual-verify")
    suspend fun manualVerifyUdyam(
        @Path("id") id: String,
        @Body body: UdyamManualVerifyRequest,
    ): ManualVerifyResponse

    @POST("api/businesses/{id}/manual-verify")
    suspend fun manualVerifyCourtCases(
        @Path("id") id: String,
        @Body body: EcourtsManualVerifyRequest,
    ): ManualVerifyResponse
}
