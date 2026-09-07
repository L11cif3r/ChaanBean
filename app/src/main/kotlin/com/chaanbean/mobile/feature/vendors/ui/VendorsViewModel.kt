package com.chaanbean.mobile.feature.vendors.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.feature.vendors.data.CreateVendorRequest
import com.chaanbean.mobile.feature.vendors.data.Vendor
import com.chaanbean.mobile.feature.vendors.data.VendorsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class VendorsUiState(
    val vendors: Outcome<List<Vendor>> = Outcome.Loading,
    val submitting: Boolean = false,
    val message: String? = null,
)

class VendorsViewModel(private val repository: VendorsRepository) : ViewModel() {

    private val _state = MutableStateFlow(VendorsUiState())
    val state: StateFlow<VendorsUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.value = _state.value.copy(vendors = Outcome.Loading)
        viewModelScope.launch {
            _state.value = _state.value.copy(vendors = repository.list())
        }
    }

    fun onboard(request: CreateVendorRequest) {
        _state.value = _state.value.copy(submitting = true, message = null)
        viewModelScope.launch {
            when (val result = repository.create(request)) {
                is Outcome.Ok -> {
                    _state.value = _state.value.copy(
                        submitting = false,
                        message = "Onboarded " + result.value.name + " as " + result.value.vendorTrustId,
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
