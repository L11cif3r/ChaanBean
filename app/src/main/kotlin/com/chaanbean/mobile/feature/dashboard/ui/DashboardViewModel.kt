package com.chaanbean.mobile.feature.dashboard.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.feature.dashboard.data.DashboardRepository
import com.chaanbean.mobile.feature.dashboard.data.DashboardSnapshot
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DashboardUiState(
    val snapshot: Outcome<DashboardSnapshot> = Outcome.Loading,
    val refreshing: Boolean = false,
)

class DashboardViewModel(private val repository: DashboardRepository) : ViewModel() {

    private val _state = MutableStateFlow(DashboardUiState())
    val state: StateFlow<DashboardUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    /** A refresh keeps the current figures on screen instead of flashing a spinner. */
    fun refresh() {
        val hasData = _state.value.snapshot is Outcome.Ok
        _state.value = _state.value.copy(
            snapshot = if (hasData) _state.value.snapshot else Outcome.Loading,
            refreshing = true,
        )
        viewModelScope.launch {
            _state.value = DashboardUiState(snapshot = repository.load(), refreshing = false)
        }
    }
}
