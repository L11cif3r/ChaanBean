package com.chaanbean.mobile.feature.debtors.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.feature.debtors.data.BuyerDebtor
import com.chaanbean.mobile.feature.debtors.data.DebtorsRepository
import com.chaanbean.mobile.feature.debtors.data.EscalationState
import com.chaanbean.mobile.feature.debtors.data.primaryAccount
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DebtorDetailUiState(
    val buyer: Outcome<BuyerDebtor> = Outcome.Loading,
    /** Ok(null) means the recovery ladder has never been started for this account. */
    val escalation: Outcome<EscalationState?> = Outcome.Loading,
    val refreshingRisk: Boolean = false,
    val message: String? = null,
)

class DebtorDetailViewModel(
    private val repository: DebtorsRepository,
    private val buyerId: String,
) : ViewModel() {

    private val _state = MutableStateFlow(DebtorDetailUiState())
    val state: StateFlow<DebtorDetailUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.value = _state.value.copy(buyer = Outcome.Loading, escalation = Outcome.Loading)
        viewModelScope.launch {
            val buyer = repository.find(buyerId)
            _state.value = _state.value.copy(buyer = buyer)

            // The escalation ladder hangs off the credit account, so it can only be
            // loaded once the buyer's account id is known.
            val accountId = (buyer as? Outcome.Ok)?.value?.primaryAccount()?.id
            _state.value = _state.value.copy(
                escalation = if (accountId == null) {
                    Outcome.Ok(null)
                } else {
                    repository.escalation(accountId)
                },
            )
        }
    }

    fun refreshRisk() {
        _state.value = _state.value.copy(refreshingRisk = true, message = null)
        viewModelScope.launch {
            when (val result = repository.refreshRisk(buyerId)) {
                is Outcome.Ok -> {
                    val flag = result.value.flag.uppercase()
                    val score = String.format("%.1f", result.value.compositeScore)
                    _state.value = _state.value.copy(
                        refreshingRisk = false,
                        message = "Recomputed: $flag at $score/100",
                    )
                    refresh()
                }
                is Outcome.Err -> _state.value =
                    _state.value.copy(refreshingRisk = false, message = result.message)
                Outcome.Loading -> Unit
            }
        }
    }

    fun clearMessage() {
        _state.value = _state.value.copy(message = null)
    }
}
