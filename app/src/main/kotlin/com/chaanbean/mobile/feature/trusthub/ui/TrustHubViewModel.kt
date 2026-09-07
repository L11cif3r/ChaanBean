package com.chaanbean.mobile.feature.trusthub.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.feature.trusthub.data.IssuedTrustProfile
import com.chaanbean.mobile.feature.trusthub.data.LocallyReportedDefault
import com.chaanbean.mobile.feature.trusthub.data.RegisterTrustIdRequest
import com.chaanbean.mobile.feature.trusthub.data.ReportDefaultRequest
import com.chaanbean.mobile.feature.trusthub.data.SearchHit
import com.chaanbean.mobile.feature.trusthub.data.TrustHubRepository
import com.chaanbean.mobile.feature.trusthub.data.TrustVerification
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class TrustVerifyUiState(
    val query: String = "",
    /** null until the first lookup runs, so the screen can show its own prompt. */
    val lookup: Outcome<TrustVerification>? = null,
)

class TrustVerifyViewModel(
    private val repository: TrustHubRepository,
    initialQuery: String = "",
) : ViewModel() {

    private val _state = MutableStateFlow(TrustVerifyUiState(query = initialQuery))
    val state: StateFlow<TrustVerifyUiState> = _state.asStateFlow()

    init {
        if (initialQuery.isNotBlank()) verify()
    }

    fun onQueryChange(value: String) {
        _state.value = _state.value.copy(query = value)
    }

    fun verify() {
        val query = _state.value.query.trim()
        if (query.isEmpty()) return
        _state.value = _state.value.copy(lookup = Outcome.Loading)
        viewModelScope.launch {
            _state.value = _state.value.copy(lookup = repository.verify(query))
        }
    }

    fun verify(query: String) {
        _state.value = _state.value.copy(query = query)
        verify()
    }

    fun clear() {
        _state.value = TrustVerifyUiState()
    }
}

data class TrustRegisterUiState(
    val submitting: Boolean = false,
    val issued: IssuedTrustProfile? = null,
    val error: String? = null,
)

class TrustRegisterViewModel(private val repository: TrustHubRepository) : ViewModel() {

    private val _state = MutableStateFlow(TrustRegisterUiState())
    val state: StateFlow<TrustRegisterUiState> = _state.asStateFlow()

    fun submit(request: RegisterTrustIdRequest) {
        _state.value = TrustRegisterUiState(submitting = true)
        viewModelScope.launch {
            when (val result = repository.register(request)) {
                is Outcome.Ok -> _state.value =
                    TrustRegisterUiState(submitting = false, issued = result.value)
                is Outcome.Err -> _state.value =
                    TrustRegisterUiState(submitting = false, error = result.message)
                Outcome.Loading -> Unit
            }
        }
    }

    fun reset() {
        _state.value = TrustRegisterUiState()
    }
}

data class CommunityDefaultsUiState(
    val query: String = "",
    /** null until a search runs; /api/search refuses queries shorter than 2 characters. */
    val results: Outcome<List<SearchHit>>? = null,
    val reportedThisSession: List<LocallyReportedDefault> = emptyList(),
    val submitting: Boolean = false,
    val message: String? = null,
)

class CommunityDefaultsViewModel(private val repository: TrustHubRepository) : ViewModel() {

    private val _state = MutableStateFlow(CommunityDefaultsUiState())
    val state: StateFlow<CommunityDefaultsUiState> = _state.asStateFlow()

    fun onQueryChange(value: String) {
        _state.value = _state.value.copy(query = value)
    }

    fun search() {
        val query = _state.value.query.trim()
        if (query.length < 2) {
            _state.value = _state.value.copy(
                results = Outcome.Err("Enter at least 2 characters; the search endpoint ignores shorter queries."),
            )
            return
        }
        _state.value = _state.value.copy(results = Outcome.Loading)
        viewModelScope.launch {
            _state.value = _state.value.copy(results = repository.searchDefaults(query))
        }
    }

    fun report(request: ReportDefaultRequest) {
        _state.value = _state.value.copy(submitting = true, message = null)
        viewModelScope.launch {
            when (val result = repository.reportDefault(request)) {
                is Outcome.Ok -> {
                    _state.value = _state.value.copy(
                        submitting = false,
                        reportedThisSession = listOf(result.value) + _state.value.reportedThisSession,
                        message = result.value.serverMessage,
                    )
                    // The registry has no list endpoint, so re-run the search the user is on.
                    if (_state.value.query.trim().length >= 2) search()
                }
                is Outcome.Err -> _state.value =
                    _state.value.copy(submitting = false, message = result.message)
                Outcome.Loading -> Unit
            }
        }
    }

    fun clearMessage() {
        _state.value = _state.value.copy(message = null)
    }
}
