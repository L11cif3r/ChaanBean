package com.chaanbean.mobile.feature.businesscheck.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.feature.businesscheck.data.BusinessCheckRepository
import com.chaanbean.mobile.feature.businesscheck.data.BusinessProfile
import com.chaanbean.mobile.feature.businesscheck.data.CourtCasePayload
import com.chaanbean.mobile.feature.businesscheck.data.CreateBusinessRequest
import com.chaanbean.mobile.feature.businesscheck.data.CreateBusinessResult
import com.chaanbean.mobile.feature.businesscheck.data.DocumentUpload
import com.chaanbean.mobile.feature.businesscheck.data.FinancialDocument
import com.chaanbean.mobile.feature.businesscheck.data.GstManualPayload
import com.chaanbean.mobile.feature.businesscheck.data.McaManualPayload
import com.chaanbean.mobile.feature.businesscheck.data.UdyamManualPayload
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

data class BusinessListUiState(
    val businesses: Outcome<List<BusinessProfile>> = Outcome.Loading,
    val query: String = "",
    val flagFilter: String? = null,
    val submitting: Boolean = false,
    val message: String? = null,
    /** Set once a create resolves, including the 409 case, to the profile to open. */
    val openBusinessId: String? = null,
)

class BusinessListViewModel(
    private val repository: BusinessCheckRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(BusinessListUiState())
    val state: StateFlow<BusinessListUiState> = _state.asStateFlow()

    private var loadJob: Job? = null

    init {
        refresh()
    }

    fun refresh() {
        loadJob?.cancel()
        _state.value = _state.value.copy(businesses = Outcome.Loading)
        loadJob = viewModelScope.launch { load() }
    }

    fun onQueryChange(query: String) {
        _state.value = _state.value.copy(query = query)
        loadJob?.cancel()
        // Same 300 ms debounce the web page uses before it hits /search.
        loadJob = viewModelScope.launch {
            delay(300)
            load()
        }
    }

    fun onFlagFilterChange(flag: String?) {
        _state.value = _state.value.copy(flagFilter = flag)
        refresh()
    }

    fun create(request: CreateBusinessRequest) {
        _state.value = _state.value.copy(submitting = true, message = null)
        viewModelScope.launch {
            when (val outcome = repository.create(request)) {
                is Outcome.Ok -> when (val result = outcome.value) {
                    is CreateBusinessResult.Created -> {
                        _state.value = _state.value.copy(
                            submitting = false,
                            message = "Profile created. Every source opens as a manual task.",
                            openBusinessId = result.business.id,
                        )
                        refresh()
                    }
                    // 409: the GSTIN is already on file, so open what exists rather
                    // than leaving the operator to search for it.
                    is CreateBusinessResult.Duplicate -> _state.value = _state.value.copy(
                        submitting = false,
                        message = result.message,
                        openBusinessId = result.existingId,
                    )
                }
                is Outcome.Err -> _state.value =
                    _state.value.copy(submitting = false, message = outcome.message)
                Outcome.Loading -> Unit
            }
        }
    }

    fun consumeOpenBusinessId() {
        _state.value = _state.value.copy(openBusinessId = null)
    }

    fun clearMessage() {
        _state.value = _state.value.copy(message = null)
    }

    private suspend fun load() {
        val current = _state.value
        val result = if (current.query.isBlank()) {
            repository.list(current.flagFilter)
        } else {
            repository.search(current.query.trim(), current.flagFilter)
        }
        _state.value = _state.value.copy(businesses = result)
    }
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

data class BusinessDetailUiState(
    val business: Outcome<BusinessProfile> = Outcome.Loading,
    val rerunning: Boolean = false,
    val submitting: Boolean = false,
    val message: String? = null,
)

/**
 * GET /api/businesses/{id} already carries the risk flag, credit recommendation,
 * signals and audit log, so the per-section endpoints are not called again here.
 */
class BusinessDetailViewModel(
    private val repository: BusinessCheckRepository,
    private val businessId: String,
) : ViewModel() {

    private val _state = MutableStateFlow(BusinessDetailUiState())
    val state: StateFlow<BusinessDetailUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.value = _state.value.copy(business = Outcome.Loading)
        viewModelScope.launch {
            _state.value = _state.value.copy(business = repository.detail(businessId))
        }
    }

    fun rerunVerification() {
        _state.value = _state.value.copy(rerunning = true, message = null)
        viewModelScope.launch {
            when (val result = repository.rerunVerification(businessId)) {
                is Outcome.Ok -> {
                    _state.value = _state.value.copy(rerunning = false, message = result.value)
                    refresh()
                }
                is Outcome.Err -> _state.value =
                    _state.value.copy(rerunning = false, message = result.message)
                Outcome.Loading -> Unit
            }
        }
    }

    fun submitMca(payload: McaManualPayload) =
        submit("MCA") { repository.submitMca(businessId, payload, ACTOR) }

    fun submitGst(payload: GstManualPayload) =
        submit("GST") { repository.submitGst(businessId, payload, ACTOR) }

    fun submitUdyam(payload: UdyamManualPayload) =
        submit("UDYAM") { repository.submitUdyam(businessId, payload, ACTOR) }

    fun submitCourtCase(payload: CourtCasePayload) =
        submit("ECOURTS") { repository.submitCourtCases(businessId, listOf(payload), ACTOR) }

    fun clearMessage() {
        _state.value = _state.value.copy(message = null)
    }

    private fun submit(sourceType: String, call: suspend () -> Outcome<Unit>) {
        _state.value = _state.value.copy(submitting = true, message = null)
        viewModelScope.launch {
            when (val result = call()) {
                is Outcome.Ok -> {
                    _state.value = _state.value.copy(
                        submitting = false,
                        message = "$sourceType entry recorded as user-provided.",
                    )
                    refresh()
                }
                is Outcome.Err -> _state.value =
                    _state.value.copy(submitting = false, message = result.message)
                Outcome.Loading -> Unit
            }
        }
    }

    private companion object {
        // No signed-in identity is plumbed into this module, so the server stamps
        // its own actor rather than a name this client invented.
        val ACTOR: String? = null
    }
}

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------

data class BusinessCompareUiState(
    val options: Outcome<List<BusinessProfile>> = Outcome.Loading,
    val selectedIds: List<String> = emptyList(),
    val compared: Outcome<List<BusinessProfile>> = Outcome.Ok(emptyList()),
)

class BusinessCompareViewModel(
    private val repository: BusinessCheckRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(BusinessCompareUiState())
    val state: StateFlow<BusinessCompareUiState> = _state.asStateFlow()

    init {
        loadOptions()
    }

    fun loadOptions() {
        _state.value = _state.value.copy(options = Outcome.Loading)
        viewModelScope.launch {
            val options = repository.list(null)
            val preselected = if (options is Outcome.Ok && _state.value.selectedIds.isEmpty()) {
                options.value.take(2).map { it.id }
            } else {
                _state.value.selectedIds
            }
            _state.value = _state.value.copy(options = options, selectedIds = preselected)
            compare()
        }
    }

    /** Mirrors the web selector: 2 minimum, 3 maximum, oldest drops off at 4. */
    fun toggle(id: String) {
        val current = _state.value.selectedIds
        val next = when {
            current.contains(id) -> if (current.size > 2) current - id else current
            current.size < MAX_SELECTION -> current + id
            else -> current.drop(1) + id
        }
        if (next == current) return
        _state.value = _state.value.copy(selectedIds = next)
        viewModelScope.launch { compare() }
    }

    private suspend fun compare() {
        val ids = _state.value.selectedIds
        if (ids.size < 2) {
            _state.value = _state.value.copy(compared = Outcome.Ok(emptyList()))
            return
        }
        _state.value = _state.value.copy(compared = Outcome.Loading)
        _state.value = _state.value.copy(compared = repository.compare(ids))
    }

    private companion object {
        const val MAX_SELECTION = 3
    }
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

data class BusinessDocumentsUiState(
    val documents: Outcome<List<FinancialDocument>> = Outcome.Loading,
    val uploading: Boolean = false,
    val message: String? = null,
)

class BusinessDocumentsViewModel(
    private val repository: BusinessCheckRepository,
    private val businessId: String,
) : ViewModel() {

    private val _state = MutableStateFlow(BusinessDocumentsUiState())
    val state: StateFlow<BusinessDocumentsUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.value = _state.value.copy(documents = Outcome.Loading)
        viewModelScope.launch {
            _state.value = _state.value.copy(documents = repository.documents(businessId))
        }
    }

    fun upload(upload: DocumentUpload) {
        _state.value = _state.value.copy(uploading = true, message = null)
        viewModelScope.launch {
            when (val result = repository.uploadDocument(businessId, upload)) {
                is Outcome.Ok -> {
                    // The handler queues extraction; it does not finish it inline.
                    _state.value = _state.value.copy(
                        uploading = false,
                        message = "${result.value.originalName} queued for extraction.",
                    )
                    refresh()
                }
                is Outcome.Err -> _state.value =
                    _state.value.copy(uploading = false, message = result.message)
                Outcome.Loading -> Unit
            }
        }
    }

    fun reportError(message: String) {
        _state.value = _state.value.copy(message = message)
    }

    fun clearMessage() {
        _state.value = _state.value.copy(message = null)
    }
}
