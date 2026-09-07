package com.chaanbean.mobile.feature.admingrowth.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.feature.admingrowth.data.AdminGrowthRepository
import com.chaanbean.mobile.feature.admingrowth.data.CreateDealRequest
import com.chaanbean.mobile.feature.admingrowth.data.CreateLeadRequest
import com.chaanbean.mobile.feature.admingrowth.data.Deal
import com.chaanbean.mobile.feature.admingrowth.data.MarketingResponse
import com.chaanbean.mobile.feature.admingrowth.data.PipelineResponse
import com.chaanbean.mobile.feature.admingrowth.data.PipelineStage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class PipelineUiState(
    val data: Outcome<PipelineResponse> = Outcome.Loading,
    /** Null until the first load picks the first stage that actually holds deals. */
    val selectedStageId: String? = null,
    val openDealId: String? = null,
    val busy: Boolean = false,
    val message: String? = null,
)

/** The open deal is looked up fresh each recomposition so it reflects the last refresh. */
val PipelineUiState.response: PipelineResponse?
    get() {
        val loaded = data
        return if (loaded is Outcome.Ok) loaded.value else null
    }

val PipelineUiState.stages: List<PipelineStage>
    get() = response?.stages.orEmpty()

val PipelineUiState.selectedStage: PipelineStage?
    get() = stages.firstOrNull { it.id == selectedStageId } ?: stages.firstOrNull()

val PipelineUiState.openDeal: Deal?
    get() = openDealId?.let { id -> stages.flatMap { it.deals }.firstOrNull { it.id == id } }

class PipelineViewModel(private val repository: AdminGrowthRepository) : ViewModel() {

    private val _state = MutableStateFlow(PipelineUiState())
    val state: StateFlow<PipelineUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.value = _state.value.copy(data = Outcome.Loading)
        viewModelScope.launch {
            val result = repository.pipeline()
            val stages = if (result is Outcome.Ok) result.value.stages else emptyList()
            val keepSelection = _state.value.selectedStageId?.takeIf { id -> stages.any { it.id == id } }
            _state.value = _state.value.copy(
                data = result,
                selectedStageId = keepSelection
                    ?: stages.firstOrNull { it.deals.isNotEmpty() }?.id
                    ?: stages.firstOrNull()?.id,
            )
        }
    }

    fun selectStage(stageId: String) {
        _state.value = _state.value.copy(selectedStageId = stageId)
    }

    fun openDeal(dealId: String) {
        _state.value = _state.value.copy(openDealId = dealId)
    }

    fun closeDeal() {
        _state.value = _state.value.copy(openDealId = null)
    }

    fun moveDeal(dealId: String, newStageId: String, winLossReason: String?) = mutate(
        block = { repository.moveStage(dealId, newStageId, winLossReason) },
        describe = { stageName -> "Deal moved to \"$stageName\"" },
    )

    fun createDeal(request: CreateDealRequest) = mutate(
        block = { repository.createDeal(request) },
        describe = { deal -> "Deal \"${deal.title}\" created" },
    )

    fun createLead(request: CreateLeadRequest) = mutate(
        block = { repository.createLead(request) },
        describe = { lead -> "Lead captured: ${lead.companyName}" },
    )

    fun convertToCompany(dealId: String, plan: String) = mutate(
        block = { repository.convertToCompany(dealId, null, plan) },
        describe = { message -> message },
    )

    fun addNote(dealId: String?, leadId: String?, description: String) = mutate(
        block = { repository.addNote(dealId, leadId, description) },
        describe = { "Activity logged" },
    )

    fun clearMessage() {
        _state.value = _state.value.copy(message = null)
    }

    /** Every mutation follows the same arc: block the UI, report, then reload the board. */
    private fun <T> mutate(block: suspend () -> Outcome<T>, describe: (T) -> String) {
        if (_state.value.busy) return
        _state.value = _state.value.copy(busy = true, message = null)
        viewModelScope.launch {
            when (val result = block()) {
                is Outcome.Ok -> {
                    _state.value = _state.value.copy(busy = false, message = describe(result.value))
                    refresh()
                }
                is Outcome.Err -> _state.value =
                    _state.value.copy(busy = false, message = result.message)
                Outcome.Loading -> _state.value = _state.value.copy(busy = false)
            }
        }
    }
}

data class MarketingUiState(
    val data: Outcome<MarketingResponse> = Outcome.Loading,
    val expandedChannelId: String? = null,
)

class MarketingViewModel(private val repository: AdminGrowthRepository) : ViewModel() {

    private val _state = MutableStateFlow(MarketingUiState())
    val state: StateFlow<MarketingUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.value = _state.value.copy(data = Outcome.Loading)
        viewModelScope.launch {
            _state.value = _state.value.copy(data = repository.marketing())
        }
    }

    fun toggleChannel(channelId: String) {
        _state.value = _state.value.copy(
            expandedChannelId = if (_state.value.expandedChannelId == channelId) null else channelId,
        )
    }
}
