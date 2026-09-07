package com.chaanbean.mobile.feature.backgroundcheck.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.feature.backgroundcheck.data.BackgroundCheckRepository
import com.chaanbean.mobile.feature.backgroundcheck.data.GatewayStatusResponse
import com.chaanbean.mobile.feature.backgroundcheck.data.NormalizedReport
import com.chaanbean.mobile.feature.backgroundcheck.data.OtpInitiateRequest
import com.chaanbean.mobile.feature.backgroundcheck.data.OtpVerifyRequest
import com.chaanbean.mobile.feature.backgroundcheck.data.ReportCatalog
import com.chaanbean.mobile.feature.backgroundcheck.data.VerificationRunRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject

data class RunCheckUiState(
    val subjectId: String = "27AAECG1234H1Z5",
    val subjectType: String = "business",
    val category: String = ReportCatalog.CATEGORY_ALL,
    val selected: Set<String> = setOf("gst_exact_turnover", "bureau_report", "court_case_history"),
    val running: Boolean = false,
    /** null until the first run - the gateway has no "recent runs" endpoint to preload. */
    val reports: Outcome<List<NormalizedReport>>? = null,
    val message: String? = null,
)

class RunCheckViewModel(private val repository: BackgroundCheckRepository) : ViewModel() {

    private val _state = MutableStateFlow(RunCheckUiState())
    val state: StateFlow<RunCheckUiState> = _state.asStateFlow()

    fun onSubjectIdChange(value: String) {
        _state.value = _state.value.copy(subjectId = value)
    }

    fun onSubjectTypeChange(value: String) {
        _state.value = _state.value.copy(subjectType = value)
    }

    fun onCategoryChange(value: String) {
        _state.value = _state.value.copy(category = value)
    }

    fun toggle(code: String) {
        val current = _state.value.selected
        _state.value = _state.value.copy(
            selected = if (code in current) current - code else current + code,
        )
    }

    fun selectBundle() {
        _state.value = _state.value.copy(selected = ReportCatalog.bundle.toSet())
    }

    fun clearSelection() {
        _state.value = _state.value.copy(selected = emptySet())
    }

    fun run() {
        val current = _state.value
        if (current.subjectId.isBlank() || current.selected.isEmpty()) return
        _state.value = current.copy(running = true, reports = Outcome.Loading, message = null)
        viewModelScope.launch {
            // Preserve catalog order rather than Set iteration order.
            val ordered = ReportCatalog.all.map { it.code }.filter { it in current.selected }
            val result = repository.run(
                VerificationRunRequest(
                    subjectId = current.subjectId.trim(),
                    reportTypes = ordered,
                    subjectType = current.subjectType,
                    forceRefresh = true,
                ),
            )
            val note = when (result) {
                is Outcome.Ok -> {
                    val failed = result.value.count { it.status == "failed" }
                    if (failed > 0) "$failed of ${result.value.size} adapters returned failed"
                    else "${result.value.size} reports returned"
                }
                is Outcome.Err -> result.message
                Outcome.Loading -> null
            }
            _state.value = _state.value.copy(running = false, reports = result, message = note)
        }
    }

    fun clearMessage() {
        _state.value = _state.value.copy(message = null)
    }
}

data class GatewayStatusUiState(
    val status: Outcome<GatewayStatusResponse> = Outcome.Loading,
)

class GatewayStatusViewModel(private val repository: BackgroundCheckRepository) : ViewModel() {

    private val _state = MutableStateFlow(GatewayStatusUiState())
    val state: StateFlow<GatewayStatusUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.value = GatewayStatusUiState(status = Outcome.Loading)
        viewModelScope.launch {
            _state.value = GatewayStatusUiState(status = repository.gatewayStatus())
        }
    }
}

data class GstOtpUiState(
    val gstin: String = "27AAECG1234H1Z5",
    val mobile: String = "9876543210",
    val code: String = "",
    val initiating: Boolean = false,
    val verifying: Boolean = false,
    val sessionId: String? = null,
    /** Verbatim text from the gateway. It claims an SMS; the handler sends none. */
    val gatewayMessage: String? = null,
    val reportId: String? = null,
    val payload: JsonObject? = null,
    val error: String? = null,
)

class GstOtpViewModel(private val repository: BackgroundCheckRepository) : ViewModel() {

    private val _state = MutableStateFlow(GstOtpUiState())
    val state: StateFlow<GstOtpUiState> = _state.asStateFlow()

    fun onGstinChange(value: String) {
        _state.value = _state.value.copy(gstin = value)
    }

    fun onMobileChange(value: String) {
        _state.value = _state.value.copy(mobile = value)
    }

    fun onCodeChange(value: String) {
        _state.value = _state.value.copy(code = value.filter { it.isDigit() }.take(6))
    }

    fun initiate() {
        val current = _state.value
        if (current.gstin.isBlank()) return
        _state.value = current.copy(initiating = true, error = null, gatewayMessage = null)
        viewModelScope.launch {
            when (
                val result = repository.initiateOtp(
                    OtpInitiateRequest(
                        gstin = current.gstin.trim(),
                        mobile = current.mobile.trim().ifBlank { null },
                    ),
                )
            ) {
                is Outcome.Ok -> _state.value = _state.value.copy(
                    initiating = false,
                    sessionId = result.value.sessionId,
                    gatewayMessage = result.value.message,
                )
                is Outcome.Err -> _state.value =
                    _state.value.copy(initiating = false, error = result.message)
                Outcome.Loading -> Unit
            }
        }
    }

    fun submit() {
        val current = _state.value
        val session = current.sessionId ?: return
        if (current.code.isBlank()) return
        _state.value = current.copy(verifying = true, error = null)
        viewModelScope.launch {
            when (
                val result = repository.verifyOtp(
                    OtpVerifyRequest(
                        sessionId = session,
                        otp = current.code,
                        subjectId = current.gstin.trim().ifBlank { null },
                    ),
                )
            ) {
                is Outcome.Ok -> _state.value = _state.value.copy(
                    verifying = false,
                    reportId = result.value.reportId,
                    payload = result.value.data,
                )
                is Outcome.Err -> _state.value =
                    _state.value.copy(verifying = false, error = result.message)
                Outcome.Loading -> Unit
            }
        }
    }

    fun reset() {
        _state.value = GstOtpUiState(
            gstin = _state.value.gstin,
            mobile = _state.value.mobile,
        )
    }
}
