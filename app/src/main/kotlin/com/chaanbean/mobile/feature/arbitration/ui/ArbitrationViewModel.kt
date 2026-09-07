package com.chaanbean.mobile.feature.arbitration.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.feature.arbitration.data.ArbitrationCase
import com.chaanbean.mobile.feature.arbitration.data.ArbitrationRepository
import com.chaanbean.mobile.feature.arbitration.data.ArchiveAccess
import com.chaanbean.mobile.feature.arbitration.data.ESignSignature
import com.chaanbean.mobile.feature.arbitration.data.Hearing
import com.chaanbean.mobile.feature.arbitration.data.MsmeInterestResult
import java.time.Instant
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ArbitrationCasesUiState(
    val cases: Outcome<List<ArbitrationCase>> = Outcome.Loading,
)

class ArbitrationCasesViewModel(
    private val repository: ArbitrationRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(ArbitrationCasesUiState())
    val state: StateFlow<ArbitrationCasesUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.value = ArbitrationCasesUiState(cases = Outcome.Loading)
        viewModelScope.launch {
            _state.value = ArbitrationCasesUiState(cases = repository.cases())
        }
    }
}

/**
 * A Section 65B row the server told us it wrote. The evidence table has no read route,
 * so this is everything the client can honestly claim about the trail: what it caused
 * during this session, and the hash only where the response actually carried one.
 */
data class SessionEvidenceEntry(
    val channel: String,
    val action: String,
    val contentHash: String?,
    val recordedAt: String,
    val detail: String,
)

data class ArbitrationCaseUiState(
    val case: Outcome<ArbitrationCase> = Outcome.Loading,
    val signatures: List<ESignSignature> = emptyList(),
    val hearings: List<Hearing> = emptyList(),
    /** Populated only by an explicit recompute; the list payload carries no breakdown. */
    val calculation: MsmeInterestResult? = null,
    val busyAction: String? = null,
    val message: String? = null,
    val sessionEvidence: List<SessionEvidenceEntry> = emptyList(),
    val archive: ArchiveAccess = ArchiveAccess(),
)

class ArbitrationCaseViewModel(
    private val repository: ArbitrationRepository,
    private val caseId: String,
) : ViewModel() {

    private val _state = MutableStateFlow(ArbitrationCaseUiState(archive = repository.archiveAccess()))
    val state: StateFlow<ArbitrationCaseUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.value = _state.value.copy(case = Outcome.Loading)
        viewModelScope.launch { load() }
    }

    private suspend fun load() {
        val result = repository.case(caseId)
        _state.value = when (result) {
            is Outcome.Ok -> _state.value.copy(
                case = result,
                signatures = repository.signaturesOf(result.value),
                hearings = repository.hearingsOf(result.value),
            )
            else -> _state.value.copy(case = result)
        }
    }

    fun recalculateInterest() {
        perform(ACTION_RECALCULATE) {
            when (val result = repository.recalculateInterest(caseId)) {
                is Outcome.Ok -> {
                    _state.value = _state.value.copy(
                        calculation = result.value.calculation,
                        message = result.value.message,
                    )
                    load()
                }
                is Outcome.Err -> fail(result.message)
                Outcome.Loading -> Unit
            }
        }
    }

    fun draftSettlement() {
        perform(ACTION_SETTLEMENT) {
            when (val result = repository.generateSettlement(caseId)) {
                is Outcome.Ok -> {
                    record(
                        SessionEvidenceEntry(
                            channel = "arbitration",
                            action = "settlement_terms_generated",
                            // The handler hashes the draft server-side but returns no hash.
                            contentHash = null,
                            recordedAt = Instant.now().toString(),
                            detail = result.value.settlementDocUrl,
                        ),
                    )
                    _state.value = _state.value.copy(message = result.value.message)
                    load()
                }
                is Outcome.Err -> fail(result.message)
                Outcome.Loading -> Unit
            }
        }
    }

    fun eSign(signatoryName: String, signatoryRole: String) {
        perform(ACTION_E_SIGN) {
            when (val result = repository.eSign(caseId, signatoryName, signatoryRole)) {
                is Outcome.Ok -> {
                    val signed = result.value.signatures.lastOrNull()
                    record(
                        SessionEvidenceEntry(
                            channel = "e_sign",
                            action = "aadhaar_e_sign_recorded",
                            contentHash = signed?.docHash,
                            recordedAt = signed?.signedAt ?: Instant.now().toString(),
                            detail = "${signed?.name.orEmpty()} \u00B7 ${signed?.role.orEmpty()}",
                        ),
                    )
                    _state.value = _state.value.copy(
                        signatures = result.value.signatures,
                        message = result.value.message,
                    )
                    load()
                }
                is Outcome.Err -> fail(result.message)
                Outcome.Loading -> Unit
            }
        }
    }

    fun clearMessage() {
        _state.value = _state.value.copy(message = null)
    }

    private fun perform(action: String, block: suspend () -> Unit) {
        if (_state.value.busyAction != null) return
        _state.value = _state.value.copy(busyAction = action, message = null)
        viewModelScope.launch {
            block()
            _state.value = _state.value.copy(busyAction = null)
        }
    }

    private fun fail(message: String) {
        _state.value = _state.value.copy(message = message)
    }

    private fun record(entry: SessionEvidenceEntry) {
        _state.value = _state.value.copy(
            sessionEvidence = listOf(entry) + _state.value.sessionEvidence,
        )
    }

    companion object {
        const val ACTION_RECALCULATE = "recalculate_interest"
        const val ACTION_SETTLEMENT = "generate_settlement"
        const val ACTION_E_SIGN = "e_sign"
    }
}
