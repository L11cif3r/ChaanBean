package com.chaanbean.mobile.feature.businesscheck.data

import com.chaanbean.mobile.core.di.AppContainer
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.model.outcomeOf
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.Response

/** POST /api/businesses answers 201 with the profile or 409 with the id of the existing one. */
sealed interface CreateBusinessResult {
    data class Created(val business: BusinessProfile) : CreateBusinessResult
    data class Duplicate(val existingId: String, val message: String) : CreateBusinessResult
}

interface BusinessCheckRepository {
    suspend fun list(flag: String?): Outcome<List<BusinessProfile>>
    suspend fun search(query: String, flag: String?): Outcome<List<BusinessProfile>>
    suspend fun create(request: CreateBusinessRequest): Outcome<CreateBusinessResult>
    suspend fun detail(id: String): Outcome<BusinessProfile>
    suspend fun update(id: String, request: UpdateBusinessRequest): Outcome<BusinessProfile>
    suspend fun compare(ids: List<String>): Outcome<List<BusinessProfile>>
    suspend fun rerunVerification(id: String): Outcome<String>
    suspend fun risk(id: String): Outcome<RiskResponse>
    suspend fun credit(id: String): Outcome<CreditRecommendation?>
    suspend fun audit(id: String, limit: Int): Outcome<List<BizAuditLog>>
    suspend fun documents(id: String): Outcome<List<FinancialDocument>>
    suspend fun document(id: String, docId: String): Outcome<FinancialDocument>
    suspend fun uploadDocument(id: String, upload: DocumentUpload): Outcome<FinancialDocument>
    suspend fun submitMca(id: String, payload: McaManualPayload, actor: String?): Outcome<Unit>
    suspend fun submitGst(id: String, payload: GstManualPayload, actor: String?): Outcome<Unit>
    suspend fun submitUdyam(id: String, payload: UdyamManualPayload, actor: String?): Outcome<Unit>
    suspend fun submitCourtCases(
        id: String,
        cases: List<CourtCasePayload>,
        actor: String?,
    ): Outcome<Unit>
}

class LiveBusinessCheckRepository(
    private val api: BusinessCheckApi,
    private val json: Json,
) : BusinessCheckRepository {

    override suspend fun list(flag: String?): Outcome<List<BusinessProfile>> =
        outcomeOf { api.list(null, flag).businesses }

    override suspend fun search(query: String, flag: String?): Outcome<List<BusinessProfile>> =
        outcomeOf { api.search(query, flag).businesses }

    override suspend fun create(request: CreateBusinessRequest): Outcome<CreateBusinessResult> =
        outcomeOf {
            val response = api.create(request)
            val created = if (response.isSuccessful) response.body()?.business else null
            if (created != null) {
                CreateBusinessResult.Created(created)
            } else {
                val error = parseError(response)
                val existingId = error?.existingId
                if (existingId != null) {
                    CreateBusinessResult.Duplicate(
                        existingId = existingId,
                        message = firstText(error.error)
                            ?: "A business with this GSTIN already exists.",
                    )
                } else {
                    throw IllegalStateException(
                        firstText(error?.error)
                            ?: "Business profile was not created (HTTP ${response.code()})",
                    )
                }
            }
        }

    override suspend fun detail(id: String): Outcome<BusinessProfile> = outcomeOf {
        api.detail(id).business ?: throw IllegalStateException("Business $id was not found")
    }

    override suspend fun update(id: String, request: UpdateBusinessRequest): Outcome<BusinessProfile> =
        outcomeOf {
            api.update(id, request).business
                ?: throw IllegalStateException("The server accepted the edit but returned no profile")
        }

    override suspend fun compare(ids: List<String>): Outcome<List<BusinessProfile>> = outcomeOf {
        api.compare(CompareRequest(ids)).businesses
    }

    override suspend fun rerunVerification(id: String): Outcome<String> = outcomeOf {
        val response = api.verify(id)
        // The handler fires the orchestrator and returns immediately; it does not
        // wait for MCA/GST/Udyam tasks to finish, so say that rather than "done".
        response.message ?: "Verification re-initiated"
    }

    override suspend fun risk(id: String): Outcome<RiskResponse> = outcomeOf { api.risk(id) }

    override suspend fun credit(id: String): Outcome<CreditRecommendation?> =
        outcomeOf { api.credit(id).creditRecommendation }

    override suspend fun audit(id: String, limit: Int): Outcome<List<BizAuditLog>> =
        outcomeOf { api.audit(id, limit).auditLogs }

    override suspend fun documents(id: String): Outcome<List<FinancialDocument>> =
        outcomeOf { api.documents(id).documents }

    override suspend fun document(id: String, docId: String): Outcome<FinancialDocument> =
        outcomeOf {
            val res = api.document(id, docId)
            res.document ?: throw IllegalStateException(res.error ?: "Document not found")
        }

    override suspend fun uploadDocument(id: String, upload: DocumentUpload): Outcome<FinancialDocument> =
        outcomeOf {
            val media = upload.mimeType.toMediaTypeOrNull()
            val filePart = MultipartBody.Part.createFormData(
                "file",
                upload.fileName,
                upload.bytes.toRequestBody(media),
            )
            val response = api.uploadDocument(
                id = id,
                file = filePart,
                category = upload.category.toPlainTextBody(),
                fiscalYear = upload.fiscalYear?.toPlainTextBody(),
            )
            val document = if (response.isSuccessful) response.body()?.document else null
            document ?: throw IllegalStateException(
                firstText(parseError(response)?.error)
                    ?: "Upload rejected by the server (HTTP ${response.code()})",
            )
        }

    override suspend fun submitMca(id: String, payload: McaManualPayload, actor: String?): Outcome<Unit> =
        outcomeOf { api.manualVerifyMca(id, McaManualVerifyRequest(payload, actor)); Unit }

    override suspend fun submitGst(id: String, payload: GstManualPayload, actor: String?): Outcome<Unit> =
        outcomeOf { api.manualVerifyGst(id, GstManualVerifyRequest(payload, actor)); Unit }

    override suspend fun submitUdyam(id: String, payload: UdyamManualPayload, actor: String?): Outcome<Unit> =
        outcomeOf { api.manualVerifyUdyam(id, UdyamManualVerifyRequest(payload, actor)); Unit }

    override suspend fun submitCourtCases(
        id: String,
        cases: List<CourtCasePayload>,
        actor: String?,
    ): Outcome<Unit> = outcomeOf {
        api.manualVerifyCourtCases(id, EcourtsManualVerifyRequest(cases, actor))
        Unit
    }

    private fun <T> parseError(response: retrofit2.Response<T>): ApiErrorBody? {
        val raw = try {
            response.errorBody()?.string()
        } catch (t: Throwable) {
            null
        }
        if (raw.isNullOrBlank()) return null
        return try {
            json.decodeFromString(ApiErrorBody.serializer(), raw)
        } catch (t: Throwable) {
            null
        }
    }

    private fun String.toPlainTextBody(): RequestBody =
        toRequestBody("text/plain".toMediaTypeOrNull())
}

/**
 * In-memory fixtures. State lives in a singleton store, not in the repository
 * instance, because Business Check spans four screens and each one builds its
 * own ViewModel: a profile added on the list screen has to be there when the
 * detail screen asks for it.
 */
class MockBusinessCheckRepository : BusinessCheckRepository {

    override suspend fun list(flag: String?): Outcome<List<BusinessProfile>> = Outcome.Ok(
        MockBusinessStore.all().filter { flag == null || it.riskFlag?.flag == flag },
    )

    override suspend fun search(query: String, flag: String?): Outcome<List<BusinessProfile>> {
        val needle = query.trim().lowercase()
        val matches = MockBusinessStore.all()
            .filter { flag == null || it.riskFlag?.flag == flag }
            .filter {
                needle.isEmpty() ||
                    it.companyName.lowercase().contains(needle) ||
                    it.gstin.orEmpty().lowercase().contains(needle) ||
                    it.cin.orEmpty().lowercase().contains(needle) ||
                    it.pan.orEmpty().lowercase().contains(needle)
            }
            .sortedBy { it.companyName }
            .take(20)
        return Outcome.Ok(matches)
    }

    override suspend fun create(request: CreateBusinessRequest): Outcome<CreateBusinessResult> {
        val gstin = request.gstin?.trim()?.uppercase()?.ifBlank { null }
        if (gstin != null) {
            val existing = MockBusinessStore.all().firstOrNull { it.gstin == gstin }
            if (existing != null) {
                return Outcome.Ok(
                    CreateBusinessResult.Duplicate(
                        existingId = existing.id,
                        message = "A business with GSTIN $gstin already exists.",
                    ),
                )
            }
        }
        return Outcome.Ok(CreateBusinessResult.Created(MockBusinessStore.create(request, gstin)))
    }

    override suspend fun detail(id: String): Outcome<BusinessProfile> {
        val business = MockBusinessStore.find(id)
            ?: return Outcome.Err("Business $id was not found")
        return Outcome.Ok(business)
    }

    override suspend fun update(id: String, request: UpdateBusinessRequest): Outcome<BusinessProfile> {
        val updated = MockBusinessStore.mutate(id) { business ->
            business.copy(
                companyName = request.companyName ?: business.companyName,
                gstin = request.gstin ?: business.gstin,
                cin = request.cin ?: business.cin,
                pan = request.pan ?: business.pan,
                udyamNo = request.udyamNo ?: business.udyamNo,
                phone = request.phone ?: business.phone,
                registeredAddr = request.registeredAddr ?: business.registeredAddr,
                enterpriseType = request.enterpriseType ?: business.enterpriseType,
                industryCode = request.industryCode ?: business.industryCode,
                primaryActivity = request.primaryActivity ?: business.primaryActivity,
            )
        } ?: return Outcome.Err("Business $id was not found")
        return Outcome.Ok(updated)
    }

    override suspend fun compare(ids: List<String>): Outcome<List<BusinessProfile>> {
        if (ids.size < 2 || ids.size > 3) {
            return Outcome.Err("Provide 2 or 3 business IDs to compare")
        }
        return Outcome.Ok(ids.mapNotNull { MockBusinessStore.find(it) })
    }

    override suspend fun rerunVerification(id: String): Outcome<String> {
        MockBusinessStore.appendAudit(
            id,
            eventType = "VERIFICATION_RERUN",
            description = "Verification re-initiated for all configured sources",
        ) ?: return Outcome.Err("Business $id was not found")
        return Outcome.Ok("Verification re-initiated")
    }

    override suspend fun risk(id: String): Outcome<RiskResponse> {
        val business = MockBusinessStore.find(id) ?: return Outcome.Err("Business $id was not found")
        return Outcome.Ok(
            RiskResponse(
                riskFlag = business.riskFlag,
                signals = business.riskSignals.sortedByDescending { it.weight },
            ),
        )
    }

    override suspend fun credit(id: String): Outcome<CreditRecommendation?> {
        val business = MockBusinessStore.find(id) ?: return Outcome.Err("Business $id was not found")
        return Outcome.Ok(business.creditRec)
    }

    override suspend fun audit(id: String, limit: Int): Outcome<List<BizAuditLog>> {
        val business = MockBusinessStore.find(id) ?: return Outcome.Err("Business $id was not found")
        return Outcome.Ok(business.auditLogs.take(limit))
    }

    override suspend fun documents(id: String): Outcome<List<FinancialDocument>> {
        val business = MockBusinessStore.find(id) ?: return Outcome.Err("Business $id was not found")
        return Outcome.Ok(business.financialDocuments)
    }

    override suspend fun document(id: String, docId: String): Outcome<FinancialDocument> {
        val business = MockBusinessStore.find(id) ?: return Outcome.Err("Business $id was not found")
        val document = business.financialDocuments.firstOrNull { it.id == docId }
            ?: return Outcome.Err("Document not found")
        return Outcome.Ok(document)
    }

    override suspend fun uploadDocument(id: String, upload: DocumentUpload): Outcome<FinancialDocument> {
        val document = MockBusinessStore.addDocument(id, upload)
            ?: return Outcome.Err("Business $id was not found")
        return Outcome.Ok(document)
    }

    override suspend fun submitMca(id: String, payload: McaManualPayload, actor: String?): Outcome<Unit> {
        val fields = listOf(
            "cin" to payload.cin,
            "companyName" to payload.companyName,
            "registeredAddress" to payload.registeredAddress,
            "incorporationDate" to payload.incorporationDate,
            "status" to payload.status,
            "authorisedCapital" to payload.authorisedCapital,
            "paidUpCapital" to payload.paidUpCapital,
        )
        MockBusinessStore.recordManualEntry(id, "MCA", fields) { business ->
            business.copy(
                cin = payload.cin?.ifBlank { null } ?: business.cin,
                registeredAddr = payload.registeredAddress?.ifBlank { null } ?: business.registeredAddr,
                incorporatedOn = payload.incorporationDate?.ifBlank { null } ?: business.incorporatedOn,
            )
        } ?: return Outcome.Err("Business $id was not found")
        return Outcome.Ok(Unit)
    }

    override suspend fun submitGst(id: String, payload: GstManualPayload, actor: String?): Outcome<Unit> {
        val fields = listOf(
            "gstin" to payload.gstin,
            "legalName" to payload.legalName,
            "tradeName" to payload.tradeName,
            "gstStatus" to payload.gstStatus,
            "taxPayerType" to payload.taxPayerType,
            "registrationDate" to payload.registrationDate,
            "principalAddress" to payload.principalAddress,
        )
        MockBusinessStore.recordManualEntry(id, "GST", fields) { business ->
            business.copy(gstin = payload.gstin?.ifBlank { null } ?: business.gstin)
        } ?: return Outcome.Err("Business $id was not found")
        return Outcome.Ok(Unit)
    }

    override suspend fun submitUdyam(id: String, payload: UdyamManualPayload, actor: String?): Outcome<Unit> {
        val fields = listOf(
            "udyamNo" to payload.udyamNo,
            "enterpriseName" to payload.enterpriseName,
            "ownerName" to payload.ownerName,
            "type" to payload.type,
            "activity" to payload.activity,
            "registrationDate" to payload.registrationDate,
            "district" to payload.district,
            "state" to payload.state,
        )
        MockBusinessStore.recordManualEntry(id, "UDYAM", fields) { business ->
            business.copy(
                udyamNo = payload.udyamNo?.ifBlank { null } ?: business.udyamNo,
                enterpriseType = payload.type?.ifBlank { null } ?: business.enterpriseType,
                primaryActivity = payload.activity?.ifBlank { null } ?: business.primaryActivity,
            )
        } ?: return Outcome.Err("Business $id was not found")
        return Outcome.Ok(Unit)
    }

    override suspend fun submitCourtCases(
        id: String,
        cases: List<CourtCasePayload>,
        actor: String?,
    ): Outcome<Unit> {
        MockBusinessStore.addCourtCases(id, cases) ?: return Outcome.Err("Business $id was not found")
        return Outcome.Ok(Unit)
    }
}

object BusinessCheckModule {
    fun repository(container: AppContainer): BusinessCheckRepository =
        if (container.useMock) {
            MockBusinessCheckRepository()
        } else {
            LiveBusinessCheckRepository(
                api = container.retrofit.create(BusinessCheckApi::class.java),
                json = container.json,
            )
        }
}

/**
 * The fixture set. Three profiles that exercise every branch of the risk engine:
 * a clean GREEN manufacturer, an AMBER trader with an open manual review and a
 * cross-document discrepancy, and a RED exporter blocked by hard red flags.
 */
private object MockBusinessStore {

    private val businesses = mutableListOf(
        ashirvadExtrusions(),
        rathiMetaltech(),
        deccanAgriExports(),
    )
    private var sequence = 0

    fun all(): List<BusinessProfile> = businesses.toList()

    fun find(id: String): BusinessProfile? = businesses.firstOrNull { it.id == id }

    fun mutate(id: String, transform: (BusinessProfile) -> BusinessProfile): BusinessProfile? {
        val index = businesses.indexOfFirst { it.id == id }
        if (index < 0) return null
        val updated = transform(businesses[index])
        businesses[index] = updated
        return updated
    }

    fun appendAudit(
        id: String,
        eventType: String,
        description: String,
    ): BusinessProfile? = mutate(id) { business ->
        business.copy(
            auditLogs = listOf(
                BizAuditLog(
                    id = "log-${nextId()}",
                    businessId = id,
                    eventType = eventType,
                    actor = "operator",
                    description = description,
                    createdAt = null,
                ),
            ) + business.auditLogs,
        )
    }

    fun create(request: CreateBusinessRequest, normalizedGstin: String?): BusinessProfile {
        val id = "biz-new-${nextId()}"
        val identifiers = listOf(
            "GSTIN" to normalizedGstin,
            "CIN" to request.cin?.trim()?.uppercase()?.ifBlank { null },
            "PAN" to request.pan?.trim()?.uppercase()?.ifBlank { null },
            "UDYAM" to request.udyamNo?.trim()?.uppercase()?.ifBlank { null },
            "PHONE" to request.phone?.trim()?.ifBlank { null },
        ).mapNotNull { (type, value) ->
            if (value == null) {
                null
            } else {
                BusinessIdentifier(
                    id = "ident-${nextId()}",
                    businessId = id,
                    identifierType = type,
                    value = value,
                    sourceStatus = "USER_PROVIDED",
                )
            }
        }
        // Mirrors the orchestrator: every V0 source opens as a manual task, none run live.
        val business = BusinessProfile(
            id = id,
            companyName = request.companyName.trim(),
            gstin = normalizedGstin,
            cin = request.cin?.trim()?.uppercase()?.ifBlank { null },
            pan = request.pan?.trim()?.uppercase()?.ifBlank { null },
            udyamNo = request.udyamNo?.trim()?.uppercase()?.ifBlank { null },
            phone = request.phone?.trim()?.ifBlank { null },
            overallStatus = "PENDING",
            sourceStatus = "PENDING",
            createdBy = request.createdBy,
            identifiers = identifiers,
            verificationTasks = listOf("GST", "MCA", "UDYAM", "ECOURTS").map { type ->
                VerificationTask(
                    id = "task-${nextId()}",
                    businessId = id,
                    taskType = type,
                    status = "AWAITING_MANUAL",
                )
            },
            manualReviews = openReviewsFor(id, request),
            auditLogs = listOf(
                BizAuditLog(
                    id = "log-${nextId()}",
                    businessId = id,
                    eventType = "PROFILE_CREATED",
                    actor = request.createdBy ?: "user",
                    description = "Business profile created for \"${request.companyName.trim()}\"",
                ),
            ),
            counts = BusinessCounts(financialDocuments = 0, courtCases = 0),
        )
        businesses.add(0, business)
        return business
    }

    fun addDocument(id: String, upload: DocumentUpload): FinancialDocument? {
        val document = FinancialDocument(
            id = "doc-${nextId()}",
            businessId = id,
            originalName = upload.fileName,
            storagePath = "/uploads/businesses/$id/${upload.fileName}",
            mimeType = upload.mimeType,
            fileSizeBytes = upload.bytes.size,
            category = upload.category,
            fiscalYear = upload.fiscalYear,
            processingStatus = "PENDING",
        )
        val updated = mutate(id) { business ->
            business.copy(
                financialDocuments = listOf(document) + business.financialDocuments,
                counts = BusinessCounts(
                    financialDocuments = business.financialDocuments.size + 1,
                    courtCases = business.courtCases.size,
                ),
            )
        } ?: return null
        appendAudit(
            updated.id,
            eventType = "DOCUMENT_UPLOADED",
            description = "Document \"${upload.fileName}\" uploaded (${upload.category}, ${upload.fiscalYear ?: "no year"})",
        )
        return document
    }

    fun addCourtCases(id: String, cases: List<CourtCasePayload>): BusinessProfile? {
        val added = cases.map { payload ->
            CourtCase(
                id = "case-${nextId()}",
                businessId = id,
                caseNumber = payload.caseNumber,
                courtName = payload.courtName,
                filingDate = payload.filingDate,
                caseType = payload.caseType,
                status = payload.status,
                partyRole = payload.partyRole,
                description = payload.description,
                sourceStatus = "USER_PROVIDED",
                notes = payload.notes,
            )
        }
        mutate(id) { business ->
            business.copy(
                courtCases = added + business.courtCases,
                counts = BusinessCounts(
                    financialDocuments = business.financialDocuments.size,
                    courtCases = business.courtCases.size + added.size,
                ),
            )
        } ?: return null
        closeSource(id, "ECOURTS", listOf("caseCount" to added.size.toString()))
        return appendAudit(
            id,
            eventType = "MANUAL_ENTRY_SUBMITTED",
            description = "${added.size} court case(s) submitted via manual eCourts search",
        )
    }

    fun recordManualEntry(
        id: String,
        sourceType: String,
        fields: List<Pair<String, String?>>,
        transform: (BusinessProfile) -> BusinessProfile,
    ): BusinessProfile? {
        mutate(id, transform) ?: return null
        closeSource(id, sourceType, fields.mapNotNull { (k, v) -> if (v.isNullOrBlank()) null else k to v })
        return appendAudit(
            id,
            eventType = "MANUAL_ENTRY_SUBMITTED",
            description = "$sourceType data submitted via manual portal lookup",
        )
    }

    private fun closeSource(id: String, sourceType: String, fields: List<Pair<String, String>>) {
        val parsed = fields.joinToString(",", "{", "}") { (k, v) -> "\"$k\":\"$v\"" }
        mutate(id) { business ->
            business.copy(
                sourceRecords = listOf(
                    BusinessSourceRecord(
                        id = "src-${nextId()}",
                        businessId = id,
                        sourceType = sourceType,
                        sourceStatus = "USER_PROVIDED",
                        rawPayload = parsed,
                        parsedFields = parsed,
                        notes = "Entered by user after manual $sourceType portal lookup",
                    ),
                ) + business.sourceRecords.filterNot { it.sourceType == sourceType },
                verificationTasks = business.verificationTasks.map { task ->
                    if (task.taskType == sourceType) task.copy(status = "COMPLETED") else task
                },
                manualReviews = business.manualReviews.filterNot {
                    it.reviewType == "${sourceType}_MANUAL"
                },
                sourceStatus = "USER_PROVIDED",
            )
        }
    }

    private fun openReviewsFor(id: String, request: CreateBusinessRequest): List<ManualReview> = listOf(
        ManualReview(
            id = "review-${nextId()}",
            businessId = id,
            reviewType = "GST_MANUAL",
            promptText = "Open the GST Portal and search for GSTIN \"${request.gstin ?: "(enter GSTIN)"}\". " +
                "Enter the registration status, trade name, registration date, and taxpayer type below. " +
                "NOTE: Turnover data is not available via public lookup - please upload GSTR-3B documents in the Documents section.",
            portalUrl = "https://services.gst.gov.in/services/searchtp",
        ),
        ManualReview(
            id = "review-${nextId()}",
            businessId = id,
            reviewType = "MCA_MANUAL",
            promptText = "Open the MCA21 master data page and look up \"${request.companyName}\". " +
                "Enter CIN, incorporation date, registered address and company status.",
            portalUrl = "https://www.mca.gov.in/content/mca/global/en/mca/master-data/MDS.html",
        ),
        ManualReview(
            id = "review-${nextId()}",
            businessId = id,
            reviewType = "UDYAM_MANUAL",
            promptText = "Verify the Udyam registration number on the Udyam portal and enter the enterprise type and activity.",
            portalUrl = "https://udyamregistration.gov.in/UdyamVerifyRegistration/UdyamVerifyRegistration.aspx",
        ),
        ManualReview(
            id = "review-${nextId()}",
            businessId = id,
            reviewType = "ECOURTS_MANUAL",
            promptText = "eCourts requires a CAPTCHA, so it cannot be queried automatically. Search the party name manually and enter any cases found.",
            portalUrl = "https://ecourts.gov.in/ecourts_home/",
        ),
    )

    private fun nextId(): String {
        sequence += 1
        return sequence.toString().padStart(3, '0')
    }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

private fun ashirvadExtrusions(): BusinessProfile {
    val id = "biz-ash-01"
    return BusinessProfile(
        id = id,
        companyName = "Ashirvad Extrusions Pvt Ltd",
        gstin = "29AAGCA4102M1ZP",
        cin = "U25209KA2014PTC076412",
        pan = "AAGCA4102M",
        udyamNo = "UDYAM-KA-03-0041287",
        phone = "+91 80 4712 2190",
        registeredAddr = "Plot 42, KIADB Industrial Area, Peenya Phase II, Bengaluru 560058",
        incorporatedOn = "2014-06-11T00:00:00.000Z",
        enterpriseType = "SMALL",
        industryCode = "25209",
        primaryActivity = "Manufacturing",
        overallStatus = "COMPLETED",
        sourceStatus = "USER_PROVIDED",
        createdAt = "2026-07-19T06:41:00.000Z",
        identifiers = listOf(
            BusinessIdentifier("id-ash-1", id, "GSTIN", "29AAGCA4102M1ZP", true, "USER_PROVIDED"),
            BusinessIdentifier("id-ash-2", id, "CIN", "U25209KA2014PTC076412", true, "USER_PROVIDED"),
            BusinessIdentifier("id-ash-3", id, "PAN", "AAGCA4102M", false, "USER_PROVIDED"),
            BusinessIdentifier("id-ash-4", id, "UDYAM", "UDYAM-KA-03-0041287", true, "USER_PROVIDED"),
            BusinessIdentifier("id-ash-5", id, "PHONE", "+91 80 4712 2190", false, "USER_PROVIDED"),
        ),
        sourceRecords = listOf(
            BusinessSourceRecord(
                id = "src-ash-gst", businessId = id, sourceType = "GST",
                sourceStatus = "USER_PROVIDED",
                rawPayload = "{}",
                parsedFields = "{\"gstin\":\"29AAGCA4102M1ZP\",\"legalName\":\"ASHIRVAD EXTRUSIONS PRIVATE LIMITED\",\"gstStatus\":\"Active\",\"taxPayerType\":\"Regular\",\"registrationDate\":\"2017-07-01\",\"stateCode\":\"29 - Karnataka\"}",
                fetchedAt = "2026-07-19T07:02:00.000Z",
                notes = "Entered by user after manual GST portal lookup",
            ),
            BusinessSourceRecord(
                id = "src-ash-mca", businessId = id, sourceType = "MCA",
                sourceStatus = "USER_PROVIDED",
                rawPayload = "{}",
                parsedFields = "{\"cin\":\"U25209KA2014PTC076412\",\"status\":\"Active\",\"incorporationDate\":\"2014-06-11\",\"authorisedCapital\":\"Rs 1,00,00,000\",\"paidUpCapital\":\"Rs 62,50,000\",\"charges\":\"1 open charge - Canara Bank\"}",
                fetchedAt = "2026-07-19T07:15:00.000Z",
                notes = "Entered by user after manual MCA portal lookup",
            ),
            BusinessSourceRecord(
                id = "src-ash-udyam", businessId = id, sourceType = "UDYAM",
                sourceStatus = "USER_PROVIDED",
                rawPayload = "{}",
                parsedFields = "{\"udyamNo\":\"UDYAM-KA-03-0041287\",\"type\":\"SMALL\",\"activity\":\"Manufacturing\",\"nic\":\"25209\",\"district\":\"Bengaluru Urban\",\"state\":\"Karnataka\"}",
                fetchedAt = "2026-07-19T07:21:00.000Z",
            ),
            BusinessSourceRecord(
                id = "src-ash-ecourts", businessId = id, sourceType = "ECOURTS",
                sourceStatus = "USER_PROVIDED",
                rawPayload = "{\"cases\":[]}",
                parsedFields = "{\"caseCount\":\"0\"}",
                fetchedAt = "2026-07-19T07:34:00.000Z",
                notes = "0 court case(s) entered by user after manual eCourts search",
            ),
        ),
        financialDocuments = listOf(
            FinancialDocument(
                id = "doc-ash-1", businessId = id,
                originalName = "Ashirvad_PnL_FY2024-25.pdf",
                mimeType = "application/pdf", fileSizeBytes = 486_213,
                category = "PNL", fiscalYear = "FY2024-25",
                processingStatus = "COMPLETED", uploadedAt = "2026-07-19T08:02:00.000Z",
            ),
            FinancialDocument(
                id = "doc-ash-2", businessId = id,
                originalName = "Ashirvad_BalanceSheet_FY2024-25.pdf",
                mimeType = "application/pdf", fileSizeBytes = 402_889,
                category = "BALANCE_SHEET", fiscalYear = "FY2024-25",
                processingStatus = "COMPLETED", uploadedAt = "2026-07-19T08:04:00.000Z",
            ),
            FinancialDocument(
                id = "doc-ash-3", businessId = id,
                originalName = "GSTR3B_Apr24_Mar25.xlsx",
                mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileSizeBytes = 118_440,
                category = "GST_RETURN", fiscalYear = "FY2024-25",
                processingStatus = "COMPLETED", uploadedAt = "2026-07-19T08:09:00.000Z",
            ),
        ),
        yearSummaries = listOf(
            FinancialYearSummary(
                id = "fys-ash-1", businessId = id, fiscalYear = "FY2022-23",
                revenue = 132_500_000.0, cogs = 96_500_000.0, grossProfit = 36_000_000.0,
                grossMarginPct = 27.2, ebitda = 15_900_000.0, ebitdaMarginPct = 12.0,
                netProfit = 8_100_000.0, netMarginPct = 6.1,
                totalAssets = 98_400_000.0, totalLiabilities = 52_700_000.0, equity = 45_700_000.0,
                debtToEquity = 1.15, currentRatio = 1.42, gstTurnover = 133_100_000.0,
                revenueSource = "P&L", dataCompleteness = 78.0,
            ),
            FinancialYearSummary(
                id = "fys-ash-2", businessId = id, fiscalYear = "FY2023-24",
                revenue = 154_800_000.0, cogs = 110_900_000.0, grossProfit = 43_900_000.0,
                grossMarginPct = 28.4, ebitda = 19_600_000.0, ebitdaMarginPct = 12.7,
                netProfit = 10_400_000.0, netMarginPct = 6.7,
                totalAssets = 112_600_000.0, totalLiabilities = 56_100_000.0, equity = 56_500_000.0,
                debtToEquity = 0.99, currentRatio = 1.58, gstTurnover = 155_400_000.0,
                revenueSource = "P&L + GSTR-3B", dataCompleteness = 91.0,
            ),
            FinancialYearSummary(
                id = "fys-ash-3", businessId = id, fiscalYear = "FY2024-25",
                revenue = 184_200_000.0, cogs = 129_400_000.0, grossProfit = 54_800_000.0,
                grossMarginPct = 29.7, ebitda = 24_900_000.0, ebitdaMarginPct = 13.5,
                netProfit = 13_600_000.0, netMarginPct = 7.4,
                totalAssets = 131_900_000.0, totalLiabilities = 58_300_000.0, equity = 73_600_000.0,
                debtToEquity = 0.79, currentRatio = 1.71,
                bankInflows = 191_400_000.0, bankOutflows = 178_200_000.0,
                gstTurnover = 184_900_000.0,
                revenueSource = "P&L + GSTR-3B", dataCompleteness = 96.0,
            ),
        ),
        consistencyChecks = listOf(
            FinancialConsistencyCheck(
                id = "chk-ash-1", businessId = id,
                checkName = "GST turnover vs declared revenue", fiscalYear = "FY2024-25",
                valueA = 184_900_000.0, labelA = "GSTR-3B turnover",
                valueB = 184_200_000.0, labelB = "P&L revenue",
                discrepancyPct = 0.4, result = "PASS",
                note = "GSTR-3B turnover is within 0.4% of declared revenue.",
            ),
            FinancialConsistencyCheck(
                id = "chk-ash-2", businessId = id,
                checkName = "Balance sheet identity", fiscalYear = "FY2024-25",
                valueA = 131_900_000.0, labelA = "Total assets",
                valueB = 131_900_000.0, labelB = "Liabilities + equity",
                discrepancyPct = 0.0, result = "PASS",
                note = "Assets equal liabilities plus equity.",
            ),
        ),
        riskSignals = listOf(
            BizRiskSignal("sig-ash-1", id, "REVENUE_STABILITY", "Revenue Stability", "GREEN", 84.0, 1.5, "Revenue grew 16.8% then 19.0% across three years with no contraction."),
            BizRiskSignal("sig-ash-2", id, "PROFITABILITY", "Profitability", "GREEN", 79.0, 1.5, "Net margin improved from 6.1% to 7.4%; EBITDA margin 13.5% in FY2024-25."),
            BizRiskSignal("sig-ash-3", id, "CASH_FLOW", "Cash Flow Health", "GREEN", 76.0, 1.2, "Bank inflows of Rs 19.14Cr exceed outflows by Rs 1.32Cr for FY2024-25."),
            BizRiskSignal("sig-ash-4", id, "DEBT_BURDEN", "Debt Burden", "GREEN", 74.0, 1.2, "Debt-to-equity fell from 1.15 to 0.79 as retained earnings built up."),
            BizRiskSignal("sig-ash-5", id, "LIQUIDITY", "Liquidity Position", "GREEN", 72.0, 1.0, "Current ratio 1.71, comfortably above the 1.2 threshold."),
            BizRiskSignal("sig-ash-6", id, "FINANCIAL_CONSISTENCY", "Financial Consistency", "GREEN", 88.0, 1.0, "Both cross-document checks passed; no discrepancy above 5%."),
            BizRiskSignal("sig-ash-7", id, "LITIGATION", "Litigation History", "GREEN", 80.0, 1.3, "No court cases recorded from the manual eCourts search on 19 Jul 2026."),
            BizRiskSignal("sig-ash-8", id, "IDENTITY_MATCH", "Identity Verification", "GREEN", 82.0, 1.0, "GSTIN legal name matches the MCA company name and the PAN embedded in the GSTIN."),
            BizRiskSignal("sig-ash-9", id, "MSME_STATUS", "MSME / Udyam Registration", "GREEN", 70.0, 0.8, "Udyam registered as a SMALL manufacturing enterprise, NIC 25209."),
            BizRiskSignal("sig-ash-10", id, "GST_COMPLIANCE", "GST Compliance", "GREEN", 77.0, 1.2, "GST status Active, Regular taxpayer, registered since 01 Jul 2017."),
            BizRiskSignal("sig-ash-11", id, "DIRECTOR_HISTORY", "Director / Promoter Background", "GREY", 50.0, 0.6, "Director disqualification data was not collected; scored neutral."),
            BizRiskSignal("sig-ash-12", id, "INDUSTRY_RISK", "Industry Risk", "AMBER", 58.0, 0.7, "Plastic extrusion is input-price sensitive; polymer costs drive margin swings."),
        ),
        riskFlag = BizRiskFlag(
            id = "flag-ash", businessId = id, flag = "GREEN", compositeScore = 76.0,
            signalBreakdown = "{}", hardRedFlags = null,
            recommendedLimit = 4_600_000.0, recommendedTenor = 45,
            computedAt = "2026-07-19T08:12:00.000Z",
        ),
        creditRec = CreditRecommendation(
            id = "cr-ash", businessId = id, creditLimit = 4_600_000.0, tenor = 45, flag = "GREEN",
            rationale = "Risk assessment: GREEN (composite score 76/100). Recommended credit limit: Rs 46.0L for 45 days. " +
                "Key positive signals: Revenue Stability, Profitability, Cash Flow Health, Debt Burden, Liquidity Position, " +
                "Financial Consistency, Litigation History, Identity Verification, MSME / Udyam Registration, GST Compliance.",
            signalRefs = "{}", isBlocked = false,
            computedAt = "2026-07-19T08:12:00.000Z",
        ),
        verificationTasks = listOf(
            VerificationTask("task-ash-1", id, "GST", "COMPLETED"),
            VerificationTask("task-ash-2", id, "MCA", "COMPLETED"),
            VerificationTask("task-ash-3", id, "UDYAM", "COMPLETED"),
            VerificationTask("task-ash-4", id, "ECOURTS", "COMPLETED"),
        ),
        auditLogs = listOf(
            BizAuditLog("log-ash-8", id, "CREDIT_RECOMMENDATION", "system", "Credit recommendation: GREEN - Rs 46.0L for 45 days.", createdAt = "2026-07-19T08:12:00.000Z"),
            BizAuditLog("log-ash-7", id, "RISK_FLAG_COMPUTED", "system", "Risk flag computed: GREEN (score: 76). Hard red flags: none.", createdAt = "2026-07-19T08:12:00.000Z"),
            BizAuditLog("log-ash-6", id, "DOCUMENT_UPLOADED", "operator", "Document \"GSTR3B_Apr24_Mar25.xlsx\" uploaded (GST_RETURN, FY2024-25)", createdAt = "2026-07-19T08:09:00.000Z"),
            BizAuditLog("log-ash-5", id, "DOCUMENT_UPLOADED", "operator", "Document \"Ashirvad_BalanceSheet_FY2024-25.pdf\" uploaded (BALANCE_SHEET, FY2024-25)", createdAt = "2026-07-19T08:04:00.000Z"),
            BizAuditLog("log-ash-4", id, "DOCUMENT_UPLOADED", "operator", "Document \"Ashirvad_PnL_FY2024-25.pdf\" uploaded (PNL, FY2024-25)", createdAt = "2026-07-19T08:02:00.000Z"),
            BizAuditLog("log-ash-3", id, "MANUAL_ENTRY_SUBMITTED", "operator", "UDYAM data submitted via manual portal lookup", createdAt = "2026-07-19T07:21:00.000Z"),
            BizAuditLog("log-ash-2", id, "MANUAL_ENTRY_SUBMITTED", "operator", "MCA data submitted via manual portal lookup", createdAt = "2026-07-19T07:15:00.000Z"),
            BizAuditLog("log-ash-1", id, "PROFILE_CREATED", "operator", "Business profile created for \"Ashirvad Extrusions Pvt Ltd\"", createdAt = "2026-07-19T06:41:00.000Z"),
        ),
        counts = BusinessCounts(financialDocuments = 3, courtCases = 0),
    )
}

private fun rathiMetaltech(): BusinessProfile {
    val id = "biz-rat-02"
    return BusinessProfile(
        id = id,
        companyName = "Rathi Metaltech Industries Pvt Ltd",
        gstin = "27AABCR7712K1Z4",
        cin = null,
        pan = "AABCR7712K",
        udyamNo = "UDYAM-MH-19-0088341",
        phone = "+91 22 4915 8823",
        registeredAddr = "Gala 7, Bhoomi Industrial Estate, Vasai East, Palghar 401208",
        enterpriseType = "MICRO",
        primaryActivity = "Trading",
        overallStatus = "MANUAL_REVIEW_REQUIRED",
        sourceStatus = "USER_PROVIDED",
        createdAt = "2026-08-04T11:20:00.000Z",
        identifiers = listOf(
            BusinessIdentifier("id-rat-1", id, "GSTIN", "27AABCR7712K1Z4", true, "USER_PROVIDED"),
            BusinessIdentifier("id-rat-2", id, "PAN", "AABCR7712K", false, "USER_PROVIDED"),
            BusinessIdentifier("id-rat-3", id, "UDYAM", "UDYAM-MH-19-0088341", true, "USER_PROVIDED"),
        ),
        sourceRecords = listOf(
            BusinessSourceRecord(
                id = "src-rat-gst", businessId = id, sourceType = "GST",
                sourceStatus = "USER_PROVIDED",
                parsedFields = "{\"gstin\":\"27AABCR7712K1Z4\",\"legalName\":\"RATHI METALTECH INDUSTRIES PRIVATE LIMITED\",\"gstStatus\":\"Active\",\"taxPayerType\":\"Regular\",\"registrationDate\":\"2019-11-14\"}",
                fetchedAt = "2026-08-04T11:48:00.000Z",
            ),
            BusinessSourceRecord(
                id = "src-rat-udyam", businessId = id, sourceType = "UDYAM",
                sourceStatus = "USER_PROVIDED",
                parsedFields = "{\"udyamNo\":\"UDYAM-MH-19-0088341\",\"type\":\"MICRO\",\"activity\":\"Trading\",\"district\":\"Palghar\",\"state\":\"Maharashtra\"}",
                fetchedAt = "2026-08-04T11:52:00.000Z",
            ),
            BusinessSourceRecord(
                id = "src-rat-mca", businessId = id, sourceType = "MCA",
                sourceStatus = "UNAVAILABLE",
                notes = "No CIN supplied; MCA master data lookup still outstanding.",
            ),
        ),
        financialDocuments = listOf(
            FinancialDocument(
                id = "doc-rat-1", businessId = id,
                originalName = "Rathi_PnL_FY2024-25.pdf", mimeType = "application/pdf",
                fileSizeBytes = 311_902, category = "PNL", fiscalYear = "FY2024-25",
                processingStatus = "COMPLETED", uploadedAt = "2026-08-04T12:10:00.000Z",
            ),
            FinancialDocument(
                id = "doc-rat-2", businessId = id,
                originalName = "Bank_Statement_HDFC_Q4.pdf", mimeType = "application/pdf",
                fileSizeBytes = 1_204_338, category = "BANK_STATEMENT", fiscalYear = "FY2024-25",
                processingStatus = "MANUAL_REVIEW_REQUIRED",
                processingError = "Scanned pages: no extractable text layer found.",
                uploadedAt = "2026-08-04T12:14:00.000Z",
            ),
        ),
        yearSummaries = listOf(
            FinancialYearSummary(
                id = "fys-rat-1", businessId = id, fiscalYear = "FY2023-24",
                revenue = 61_800_000.0, cogs = 52_600_000.0, grossProfit = 9_200_000.0,
                grossMarginPct = 14.9, ebitda = 3_900_000.0, ebitdaMarginPct = 6.3,
                netProfit = 1_640_000.0, netMarginPct = 2.7,
                totalAssets = 44_200_000.0, totalLiabilities = 32_800_000.0, equity = 11_400_000.0,
                debtToEquity = 2.88, currentRatio = 1.12, gstTurnover = 68_900_000.0,
                revenueSource = "P&L", dataCompleteness = 64.0,
            ),
            FinancialYearSummary(
                id = "fys-rat-2", businessId = id, fiscalYear = "FY2024-25",
                revenue = 58_300_000.0, cogs = 51_100_000.0, grossProfit = 7_200_000.0,
                grossMarginPct = 12.3, ebitda = 2_400_000.0, ebitdaMarginPct = 4.1,
                netProfit = 610_000.0, netMarginPct = 1.0,
                totalAssets = 46_900_000.0, totalLiabilities = 37_100_000.0, equity = 9_800_000.0,
                debtToEquity = 3.79, currentRatio = 0.94, gstTurnover = 68_800_000.0,
                revenueSource = "P&L", dataCompleteness = 58.0,
            ),
        ),
        consistencyChecks = listOf(
            FinancialConsistencyCheck(
                id = "chk-rat-1", businessId = id,
                checkName = "GST turnover vs declared revenue", fiscalYear = "FY2024-25",
                valueA = 68_800_000.0, labelA = "GSTR-3B turnover",
                valueB = 58_300_000.0, labelB = "P&L revenue",
                discrepancyPct = 18.0, result = "REVIEW_REQUIRED",
                note = "GSTR-3B turnover exceeds declared P&L revenue by 18.0%. Ask for a reconciliation before extending terms.",
            ),
        ),
        riskSignals = listOf(
            BizRiskSignal("sig-rat-1", id, "REVENUE_STABILITY", "Revenue Stability", "AMBER", 48.0, 1.5, "Revenue contracted 5.7% year on year."),
            BizRiskSignal("sig-rat-2", id, "PROFITABILITY", "Profitability", "AMBER", 38.0, 1.5, "Net margin fell from 2.7% to 1.0%; gross margin down 2.6 points."),
            BizRiskSignal("sig-rat-3", id, "DEBT_BURDEN", "Debt Burden", "RED", 22.0, 1.2, "Debt-to-equity of 3.79 is well above the 2.0 comfort threshold."),
            BizRiskSignal("sig-rat-4", id, "LIQUIDITY", "Liquidity Position", "RED", 28.0, 1.0, "Current ratio of 0.94 means current liabilities exceed current assets."),
            BizRiskSignal("sig-rat-5", id, "FINANCIAL_CONSISTENCY", "Financial Consistency", "AMBER", 45.0, 1.0, "1 cross-document discrepancy flagged for review. GST turnover is 18.0% above declared revenue."),
            BizRiskSignal("sig-rat-6", id, "LITIGATION", "Litigation History", "AMBER", 55.0, 1.3, "One disposed civil recovery suit on record; nothing currently pending."),
            BizRiskSignal("sig-rat-7", id, "GST_COMPLIANCE", "GST Compliance", "GREEN", 74.0, 1.2, "GST status Active, Regular taxpayer since 14 Nov 2019."),
            BizRiskSignal("sig-rat-8", id, "IDENTITY_MATCH", "Identity Verification", "GREY", 50.0, 1.0, "MCA record not yet collected, so the CIN-to-GSTIN name match could not be run."),
        ),
        riskFlag = BizRiskFlag(
            id = "flag-rat", businessId = id, flag = "AMBER", compositeScore = 44.0,
            hardRedFlags = null, recommendedLimit = 1_200_000.0, recommendedTenor = 30,
            computedAt = "2026-08-04T12:20:00.000Z",
        ),
        creditRec = CreditRecommendation(
            id = "cr-rat", businessId = id, creditLimit = 1_200_000.0, tenor = 30, flag = "AMBER",
            rationale = "Risk assessment: AMBER (composite score 44/100). Moderate risk - reduced credit limit: Rs 12.0L for 30 days. " +
                "Concerns: Revenue Stability, Profitability, Financial Consistency, Litigation History. Close monitoring recommended.",
            isBlocked = false, computedAt = "2026-08-04T12:20:00.000Z",
        ),
        courtCases = listOf(
            CourtCase(
                id = "case-rat-1", businessId = id,
                caseNumber = "CS/2411/2022", courtName = "City Civil Court, Mumbai",
                filingDate = "2022-09-16T00:00:00.000Z", caseType = "CIVIL",
                status = "DISPOSED", partyRole = "DEFENDANT",
                description = "Recovery suit filed by a scrap supplier; settled out of court in 2024.",
                sourceStatus = "USER_PROVIDED",
            ),
        ),
        verificationTasks = listOf(
            VerificationTask("task-rat-1", id, "GST", "COMPLETED"),
            VerificationTask("task-rat-2", id, "MCA", "AWAITING_MANUAL"),
            VerificationTask("task-rat-3", id, "UDYAM", "COMPLETED"),
            VerificationTask("task-rat-4", id, "ECOURTS", "COMPLETED"),
        ),
        manualReviews = listOf(
            ManualReview(
                id = "review-rat-1", businessId = id, reviewType = "MCA_MANUAL", status = "OPEN",
                promptText = "No CIN was supplied. Open the MCA21 master data page, search for \"Rathi Metaltech Industries Pvt Ltd\", " +
                    "and enter the CIN, incorporation date, registered address and company status.",
                portalUrl = "https://www.mca.gov.in/content/mca/global/en/mca/master-data/MDS.html",
            ),
        ),
        auditLogs = listOf(
            BizAuditLog("log-rat-6", id, "CREDIT_RECOMMENDATION", "system", "Credit recommendation: AMBER - Rs 12.0L for 30 days.", createdAt = "2026-08-04T12:20:00.000Z"),
            BizAuditLog("log-rat-5", id, "RISK_FLAG_COMPUTED", "system", "Risk flag computed: AMBER (score: 44). Hard red flags: none.", createdAt = "2026-08-04T12:20:00.000Z"),
            BizAuditLog("log-rat-4", id, "DOCUMENT_PROCESSING_FAILED", "system", "Bank_Statement_HDFC_Q4.pdf has no text layer; routed to manual review.", createdAt = "2026-08-04T12:16:00.000Z"),
            BizAuditLog("log-rat-3", id, "DOCUMENT_UPLOADED", "operator", "Document \"Bank_Statement_HDFC_Q4.pdf\" uploaded (BANK_STATEMENT, FY2024-25)", createdAt = "2026-08-04T12:14:00.000Z"),
            BizAuditLog("log-rat-2", id, "MANUAL_ENTRY_SUBMITTED", "operator", "GST data submitted via manual portal lookup", createdAt = "2026-08-04T11:48:00.000Z"),
            BizAuditLog("log-rat-1", id, "PROFILE_CREATED", "operator", "Business profile created for \"Rathi Metaltech Industries Pvt Ltd\"", createdAt = "2026-08-04T11:20:00.000Z"),
        ),
        counts = BusinessCounts(financialDocuments = 2, courtCases = 1),
    )
}

private fun deccanAgriExports(): BusinessProfile {
    val id = "biz-dec-03"
    return BusinessProfile(
        id = id,
        companyName = "Deccan Agri Exports LLP",
        gstin = "36AAEFD9021Q1ZR",
        cin = "AAF-2871",
        pan = "AAEFD9021Q",
        phone = "+91 40 2311 7788",
        registeredAddr = "6-3-249/A, Road No. 1, Banjara Hills, Hyderabad 500034",
        enterpriseType = "SMALL",
        primaryActivity = "Trading",
        overallStatus = "COMPLETED",
        sourceStatus = "USER_PROVIDED",
        createdAt = "2026-08-27T09:05:00.000Z",
        identifiers = listOf(
            BusinessIdentifier("id-dec-1", id, "GSTIN", "36AAEFD9021Q1ZR", true, "USER_PROVIDED"),
            BusinessIdentifier("id-dec-2", id, "CIN", "AAF-2871", true, "USER_PROVIDED"),
            BusinessIdentifier("id-dec-3", id, "PAN", "AAEFD9021Q", false, "USER_PROVIDED"),
        ),
        sourceRecords = listOf(
            BusinessSourceRecord(
                id = "src-dec-gst", businessId = id, sourceType = "GST",
                sourceStatus = "USER_PROVIDED",
                parsedFields = "{\"gstin\":\"36AAEFD9021Q1ZR\",\"legalName\":\"DECCAN AGRI EXPORTS LLP\",\"gstStatus\":\"Suspended\",\"taxPayerType\":\"Regular\",\"registrationDate\":\"2018-02-22\"}",
                fetchedAt = "2026-08-27T09:41:00.000Z",
            ),
            BusinessSourceRecord(
                id = "src-dec-mca", businessId = id, sourceType = "MCA",
                sourceStatus = "USER_PROVIDED",
                parsedFields = "{\"cin\":\"AAF-2871\",\"status\":\"Under process of striking off\",\"incorporationDate\":\"2017-12-05\",\"charges\":\"2 open charges\"}",
                fetchedAt = "2026-08-27T09:52:00.000Z",
                notes = "LLPIN entered in the CIN field, as the portal reports it.",
            ),
            BusinessSourceRecord(
                id = "src-dec-ecourts", businessId = id, sourceType = "ECOURTS",
                sourceStatus = "USER_PROVIDED",
                rawPayload = "{}", parsedFields = "{\"caseCount\":\"2\"}",
                fetchedAt = "2026-08-27T10:14:00.000Z",
                notes = "2 court case(s) entered by user after manual eCourts search",
            ),
        ),
        financialDocuments = listOf(
            FinancialDocument(
                id = "doc-dec-1", businessId = id,
                originalName = "Deccan_ITR_AY2024-25_scan.jpg", mimeType = "image/jpeg",
                fileSizeBytes = 2_884_112, category = "IT_RETURN", fiscalYear = "FY2023-24",
                processingStatus = "FAILED",
                processingError = "Image OCR produced no recognisable financial fields.",
                uploadedAt = "2026-08-27T10:31:00.000Z",
            ),
        ),
        yearSummaries = listOf(
            FinancialYearSummary(
                id = "fys-dec-1", businessId = id, fiscalYear = "FY2023-24",
                revenue = 24_600_000.0, netProfit = -3_100_000.0, netMarginPct = -12.6,
                totalLiabilities = 41_800_000.0, equity = -4_200_000.0,
                debtToEquity = null, currentRatio = 0.61,
                gstTurnover = 39_400_000.0,
                revenueSource = "Partial - single scanned return", dataCompleteness = 31.0,
            ),
        ),
        consistencyChecks = listOf(
            FinancialConsistencyCheck(
                id = "chk-dec-1", businessId = id,
                checkName = "GST turnover vs declared revenue", fiscalYear = "FY2023-24",
                valueA = 39_400_000.0, labelA = "GSTR-3B turnover",
                valueB = 24_600_000.0, labelB = "Declared revenue",
                discrepancyPct = 60.2, result = "REVIEW_REQUIRED",
                note = "GST turnover is 60.2% above declared revenue - a material inconsistency, not a rounding difference.",
            ),
        ),
        riskSignals = listOf(
            BizRiskSignal("sig-dec-1", id, "LITIGATION", "Litigation History", "RED", 8.0, 1.3, "Insolvency petition pending before NCLT Hyderabad since Mar 2026."),
            BizRiskSignal("sig-dec-2", id, "FINANCIAL_CONSISTENCY", "Financial Consistency", "RED", 12.0, 1.0, "1 cross-document discrepancy flagged for review. GST turnover is 60.2% above declared revenue."),
            BizRiskSignal("sig-dec-3", id, "PROFITABILITY", "Profitability", "RED", 15.0, 1.5, "Net loss of Rs 31.0L on Rs 2.46Cr of revenue; equity is negative."),
            BizRiskSignal("sig-dec-4", id, "LIQUIDITY", "Liquidity Position", "RED", 18.0, 1.0, "Current ratio 0.61 - current liabilities are nearly double current assets."),
            BizRiskSignal("sig-dec-5", id, "GST_COMPLIANCE", "GST Compliance", "RED", 20.0, 1.2, "GST registration is Suspended on the portal as of 27 Aug 2026."),
            BizRiskSignal("sig-dec-6", id, "IDENTITY_MATCH", "Identity Verification", "AMBER", 44.0, 1.0, "MCA reports the LLP as under process of striking off."),
        ),
        riskFlag = BizRiskFlag(
            id = "flag-dec", businessId = id, flag = "RED", compositeScore = 19.0,
            hardRedFlags = "[\"ACTIVE_LITIGATION\",\"MAJOR_FINANCIAL_INCONSISTENCY\"]",
            recommendedLimit = 0.0, recommendedTenor = 0,
            computedAt = "2026-08-27T10:36:00.000Z",
        ),
        creditRec = CreditRecommendation(
            id = "cr-dec", businessId = id, creditLimit = 0.0, tenor = 0, flag = "RED",
            rationale = "Risk assessment: RED (composite score 19/100). CREDIT BLOCKED. " +
                "Hard red flags triggered: ACTIVE_LITIGATION, MAJOR_FINANCIAL_INCONSISTENCY. " +
                "Credit should not be extended until flagged issues are resolved.",
            isBlocked = true,
            blockReason = "ACTIVE_LITIGATION, MAJOR_FINANCIAL_INCONSISTENCY",
            computedAt = "2026-08-27T10:36:00.000Z",
        ),
        courtCases = listOf(
            CourtCase(
                id = "case-dec-1", businessId = id,
                caseNumber = "CP(IB)/118/HDB/2026", courtName = "NCLT, Hyderabad Bench",
                filingDate = "2026-03-09T00:00:00.000Z", caseType = "INSOLVENCY",
                status = "PENDING", partyRole = "RESPONDENT",
                description = "Section 9 petition by an operational creditor for Rs 1.42Cr.",
            ),
            CourtCase(
                id = "case-dec-2", businessId = id,
                caseNumber = "COMOS/442/2025", courtName = "Commercial Court, Ranga Reddy",
                filingDate = "2025-11-21T00:00:00.000Z", caseType = "CIVIL",
                status = "ACTIVE", partyRole = "DEFENDANT",
                description = "Recovery suit for unpaid consignment of turmeric.",
            ),
        ),
        verificationTasks = listOf(
            VerificationTask("task-dec-1", id, "GST", "COMPLETED"),
            VerificationTask("task-dec-2", id, "MCA", "COMPLETED"),
            VerificationTask("task-dec-3", id, "UDYAM", "AWAITING_MANUAL"),
            VerificationTask("task-dec-4", id, "ECOURTS", "COMPLETED"),
        ),
        manualReviews = listOf(
            ManualReview(
                id = "review-dec-1", businessId = id, reviewType = "UDYAM_MANUAL", status = "OPEN",
                promptText = "No Udyam number was supplied. Check the Udyam portal for an MSME registration under PAN AAEFD9021Q.",
                portalUrl = "https://udyamregistration.gov.in/UdyamVerifyRegistration/UdyamVerifyRegistration.aspx",
            ),
        ),
        auditLogs = listOf(
            BizAuditLog("log-dec-6", id, "CREDIT_RECOMMENDATION", "system", "Credit recommendation: RED - credit blocked.", createdAt = "2026-08-27T10:36:00.000Z"),
            BizAuditLog("log-dec-5", id, "RISK_FLAG_COMPUTED", "system", "Risk flag computed: RED (score: 19). Hard red flags: ACTIVE_LITIGATION, MAJOR_FINANCIAL_INCONSISTENCY.", createdAt = "2026-08-27T10:36:00.000Z"),
            BizAuditLog("log-dec-4", id, "DOCUMENT_PROCESSING_FAILED", "system", "Deccan_ITR_AY2024-25_scan.jpg: OCR produced no recognisable financial fields.", createdAt = "2026-08-27T10:33:00.000Z"),
            BizAuditLog("log-dec-3", id, "MANUAL_ENTRY_SUBMITTED", "operator", "2 court case(s) submitted via manual eCourts search", createdAt = "2026-08-27T10:14:00.000Z"),
            BizAuditLog("log-dec-2", id, "MANUAL_ENTRY_SUBMITTED", "operator", "MCA data submitted via manual portal lookup", createdAt = "2026-08-27T09:52:00.000Z"),
            BizAuditLog("log-dec-1", id, "PROFILE_CREATED", "operator", "Business profile created for \"Deccan Agri Exports LLP\"", createdAt = "2026-08-27T09:05:00.000Z"),
        ),
        counts = BusinessCounts(financialDocuments = 1, courtCases = 2),
    )
}
