package com.chaanbean.mobile.feature.recovery.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.feature.recovery.data.RecoveryAccount
import com.chaanbean.mobile.feature.recovery.data.RecoveryAction
import com.chaanbean.mobile.feature.recovery.data.RecoveryActionResponse
import com.chaanbean.mobile.feature.recovery.data.RecoveryDetail
import com.chaanbean.mobile.feature.recovery.data.RecoveryRepository
import com.chaanbean.mobile.feature.recovery.data.SettlementRequest
import com.chaanbean.mobile.feature.recovery.data.SettlementResponse
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

// ---------------------------------------------------------------------------
// Worklist
// ---------------------------------------------------------------------------

data class RecoveryWorklistUiState(
    val accounts: Outcome<List<RecoveryAccount>> = Outcome.Loading,
    val levelFilter: String? = null,
)

class RecoveryWorklistViewModel(private val repository: RecoveryRepository) : ViewModel() {

    private val _state = MutableStateFlow(RecoveryWorklistUiState())
    val state: StateFlow<RecoveryWorklistUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.value = _state.value.copy(accounts = Outcome.Loading)
        viewModelScope.launch {
            _state.value = _state.value.copy(accounts = repository.worklist())
        }
    }

    fun setLevelFilter(level: String?) {
        _state.value = _state.value.copy(levelFilter = level)
    }
}

// ---------------------------------------------------------------------------
// Escalation ladder
// ---------------------------------------------------------------------------

data class RecoveryEscalationUiState(
    val detail: Outcome<RecoveryDetail> = Outcome.Loading,
    val running: RecoveryAction? = null,
    val lastOutcome: RecoveryActionResponse? = null,
    val lastAction: RecoveryAction? = null,
    val message: String? = null,
)

class RecoveryEscalationViewModel(
    private val repository: RecoveryRepository,
    private val creditAccountId: String,
) : ViewModel() {

    private val _state = MutableStateFlow(RecoveryEscalationUiState())
    val state: StateFlow<RecoveryEscalationUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.value = _state.value.copy(detail = Outcome.Loading)
        viewModelScope.launch {
            _state.value = _state.value.copy(detail = repository.detail(creditAccountId))
        }
    }

    fun run(action: RecoveryAction) {
        if (_state.value.running != null) return
        _state.value = _state.value.copy(running = action, message = null)
        viewModelScope.launch {
            when (val result = repository.runAction(creditAccountId, action)) {
                is Outcome.Ok -> {
                    _state.value = _state.value.copy(
                        running = null,
                        lastOutcome = result.value,
                        lastAction = action,
                        message = result.value.message ?: "Action completed",
                    )
                    _state.value = _state.value.copy(detail = repository.detail(creditAccountId))
                }
                is Outcome.Err -> _state.value =
                    _state.value.copy(running = null, message = result.message)
                Outcome.Loading -> Unit
            }
        }
    }

    fun clearMessage() {
        _state.value = _state.value.copy(message = null)
    }
}

// ---------------------------------------------------------------------------
// Settlement
// ---------------------------------------------------------------------------

data class RecoverySettlementUiState(
    val detail: Outcome<RecoveryDetail> = Outcome.Loading,
    val submitting: Boolean = false,
    /**
     * The settle route has no idempotency key, so the client is the only thing that
     * knows a submission already happened in this session. It is not a guarantee.
     */
    val submissions: Int = 0,
    val receipt: SettlementResponse? = null,
    val message: String? = null,
)

class RecoverySettlementViewModel(
    private val repository: RecoveryRepository,
    private val creditAccountId: String,
) : ViewModel() {

    private val _state = MutableStateFlow(RecoverySettlementUiState())
    val state: StateFlow<RecoverySettlementUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.value = _state.value.copy(detail = Outcome.Loading)
        viewModelScope.launch {
            _state.value = _state.value.copy(detail = repository.detail(creditAccountId))
        }
    }

    fun submit(amount: Double?, mode: String, utr: String?, payerName: String?) {
        if (_state.value.submitting) return
        _state.value = _state.value.copy(submitting = true, message = null)
        viewModelScope.launch {
            val request = SettlementRequest(
                creditAccountId = creditAccountId,
                paymentAmount = amount,
                paymentMode = mode,
                utrNumber = utr,
                payerName = payerName,
            )
            when (val result = repository.settle(request)) {
                is Outcome.Ok -> {
                    _state.value = _state.value.copy(
                        submitting = false,
                        submissions = _state.value.submissions + 1,
                        receipt = result.value,
                        message = result.value.message,
                    )
                    _state.value = _state.value.copy(detail = repository.detail(creditAccountId))
                }
                is Outcome.Err -> _state.value = _state.value.copy(
                    // A failure here is ambiguous: the route writes balance, escalation
                    // state and evidence log as three separate unwrapped calls, so the
                    // first may have landed. Count it as a submission.
                    submitting = false,
                    submissions = _state.value.submissions + 1,
                    message = result.message,
                )
                Outcome.Loading -> Unit
            }
        }
    }

    fun clearMessage() {
        _state.value = _state.value.copy(message = null)
    }
}
