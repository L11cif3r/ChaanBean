package com.chaanbean.mobile.feature.admincore.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.feature.admincore.data.AdminCustomers
import com.chaanbean.mobile.feature.admincore.data.AdminRepository
import com.chaanbean.mobile.feature.admincore.data.AdminUser
import com.chaanbean.mobile.feature.admincore.data.FinancialsAccess
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** The two roles main's seed creates. The server accepts any string and falls back to the first row. */
object AdminRoles {
    const val OWNER = "owner"
    const val TEAM_MEMBER = "team_member"
}

data class AdminOverviewUiState(
    val role: String = AdminRoles.OWNER,
    val admin: Outcome<AdminUser> = Outcome.Loading,
    val customers: Outcome<AdminCustomers> = Outcome.Loading,
    val financials: Outcome<FinancialsAccess> = Outcome.Loading,
)

class AdminOverviewViewModel(private val repository: AdminRepository) : ViewModel() {

    private val _state = MutableStateFlow(AdminOverviewUiState())
    val state: StateFlow<AdminOverviewUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        val role = _state.value.role
        _state.value = _state.value.copy(
            admin = Outcome.Loading,
            customers = Outcome.Loading,
            financials = Outcome.Loading,
        )
        viewModelScope.launch {
            _state.value = _state.value.copy(admin = repository.whoAmI(role))
        }
        viewModelScope.launch {
            _state.value = _state.value.copy(customers = repository.customers())
        }
        viewModelScope.launch {
            _state.value = _state.value.copy(financials = repository.financials(role))
        }
    }

    fun setRole(role: String) {
        if (role == _state.value.role) return
        _state.value = _state.value.copy(role = role)
        refresh()
    }
}

data class AdminCustomersUiState(
    val data: Outcome<AdminCustomers> = Outcome.Loading,
)

class AdminCustomersViewModel(private val repository: AdminRepository) : ViewModel() {

    private val _state = MutableStateFlow(AdminCustomersUiState())
    val state: StateFlow<AdminCustomersUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.value = _state.value.copy(data = Outcome.Loading)
        viewModelScope.launch {
            _state.value = _state.value.copy(data = repository.customers())
        }
    }
}

data class AdminFinancialsUiState(
    val role: String = AdminRoles.OWNER,
    val data: Outcome<FinancialsAccess> = Outcome.Loading,
)

class AdminFinancialsViewModel(private val repository: AdminRepository) : ViewModel() {

    private val _state = MutableStateFlow(AdminFinancialsUiState())
    val state: StateFlow<AdminFinancialsUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.value = _state.value.copy(data = Outcome.Loading)
        viewModelScope.launch {
            _state.value = _state.value.copy(data = repository.financials(_state.value.role))
        }
    }

    fun setRole(role: String) {
        if (role == _state.value.role) return
        _state.value = _state.value.copy(role = role)
        refresh()
    }
}
