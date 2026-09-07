package com.chaanbean.mobile.feature.debtors.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.model.RiskFlag
import com.chaanbean.mobile.feature.debtors.data.AgeingBucket
import com.chaanbean.mobile.feature.debtors.data.BuyerDebtor
import com.chaanbean.mobile.feature.debtors.data.CreateBuyerRequest
import com.chaanbean.mobile.feature.debtors.data.DebtorsRepository
import com.chaanbean.mobile.feature.debtors.data.ageingBucket
import com.chaanbean.mobile.feature.debtors.data.daysOverdue
import com.chaanbean.mobile.feature.debtors.data.primaryAccount
import com.chaanbean.mobile.feature.debtors.data.riskFlag
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Which slice of the portfolio the list is showing. */
enum class DebtorFilter(val label: String) {
    ALL("All"),
    OVERDUE("Overdue"),
    RED("Red"),
    AMBER("Amber"),
    GREEN("Green"),
}

data class PortfolioSummary(
    val buyerCount: Int = 0,
    val totalOutstanding: Double = 0.0,
    val overdueOutstanding: Double = 0.0,
    val redCount: Int = 0,
    val amberCount: Int = 0,
    val greenCount: Int = 0,
    val unratedCount: Int = 0,
    val ageing: List<Pair<AgeingBucket, Double>> = emptyList(),
)

data class DebtorsUiState(
    val buyers: Outcome<List<BuyerDebtor>> = Outcome.Loading,
    val filter: DebtorFilter = DebtorFilter.ALL,
    val submitting: Boolean = false,
    val message: String? = null,
)

class DebtorsViewModel(private val repository: DebtorsRepository) : ViewModel() {

    private val _state = MutableStateFlow(DebtorsUiState())
    val state: StateFlow<DebtorsUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.value = _state.value.copy(buyers = Outcome.Loading)
        viewModelScope.launch {
            _state.value = _state.value.copy(buyers = repository.list())
        }
    }

    fun setFilter(filter: DebtorFilter) {
        _state.value = _state.value.copy(filter = filter)
    }

    fun onboard(request: CreateBuyerRequest) {
        _state.value = _state.value.copy(submitting = true, message = null)
        viewModelScope.launch {
            when (val result = repository.create(request)) {
                is Outcome.Ok -> {
                    // The server's own message reports the flag it computed; passing it
                    // through avoids the client claiming an outcome it did not compute.
                    _state.value = _state.value.copy(
                        submitting = false,
                        message = result.value.message ?: "Buyer created.",
                    )
                    refresh()
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

/** Portfolio totals. Computed on the client because no endpoint aggregates them. */
fun summarise(buyers: List<BuyerDebtor>): PortfolioSummary {
    val buckets = linkedMapOf<AgeingBucket, Double>()
    AgeingBucket.entries.forEach { buckets[it] = 0.0 }

    var total = 0.0
    var overdue = 0.0
    var red = 0
    var amber = 0
    var green = 0
    var unrated = 0

    buyers.forEach { buyer ->
        val account = buyer.primaryAccount()
        val amount = account?.outstandingAmount ?: 0.0
        total += amount

        val days = account?.daysOverdue()
        val bucket = ageingBucket(days)
        buckets[bucket] = (buckets[bucket] ?: 0.0) + amount
        if (days != null && days > 0) overdue += amount

        when (buyer.riskFlag()) {
            RiskFlag.RED -> red++
            RiskFlag.AMBER -> amber++
            RiskFlag.GREEN -> green++
            RiskFlag.UNKNOWN -> unrated++
        }
    }

    return PortfolioSummary(
        buyerCount = buyers.size,
        totalOutstanding = total,
        overdueOutstanding = overdue,
        redCount = red,
        amberCount = amber,
        greenCount = green,
        unratedCount = unrated,
        ageing = buckets.entries.filter { it.value > 0.0 }.map { it.key to it.value },
    )
}

fun applyFilter(buyers: List<BuyerDebtor>, filter: DebtorFilter): List<BuyerDebtor> =
    when (filter) {
        DebtorFilter.ALL -> buyers
        DebtorFilter.OVERDUE -> buyers.filter { (it.primaryAccount()?.daysOverdue() ?: 0) > 0 }
        DebtorFilter.RED -> buyers.filter { it.riskFlag() == RiskFlag.RED }
        DebtorFilter.AMBER -> buyers.filter { it.riskFlag() == RiskFlag.AMBER }
        DebtorFilter.GREEN -> buyers.filter { it.riskFlag() == RiskFlag.GREEN }
    }
