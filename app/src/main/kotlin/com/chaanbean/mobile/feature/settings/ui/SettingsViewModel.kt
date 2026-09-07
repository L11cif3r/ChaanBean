package com.chaanbean.mobile.feature.settings.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chaanbean.mobile.core.di.Session
import com.chaanbean.mobile.core.di.SessionStore
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.feature.settings.data.HealthProbe
import com.chaanbean.mobile.feature.settings.data.SettingsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SettingsUiState(
    val health: Outcome<HealthProbe> = Outcome.Loading,
    /** What is actually stored on this device. Null means nobody has signed in. */
    val session: Session? = null,
    /** Fixture identity offered by the mock flavor only; never presented as a real sign-in. */
    val placeholderSession: Session? = null,
    val message: String? = null,
)

class SettingsViewModel(
    private val repository: SettingsRepository,
    private val sessionStore: SessionStore,
    val baseUrl: String,
) : ViewModel() {

    private val _state = MutableStateFlow(
        SettingsUiState(placeholderSession = repository.placeholderSession()),
    )
    val state: StateFlow<SettingsUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            sessionStore.current.collect { stored ->
                _state.value = _state.value.copy(session = stored)
            }
        }
        refresh()
    }

    fun refresh() {
        _state.value = _state.value.copy(health = Outcome.Loading)
        viewModelScope.launch {
            _state.value = _state.value.copy(health = repository.health())
        }
    }

    /**
     * Clears the locally cached user record. There is no server call to make: the
     * server issues no session, so there is none to invalidate.
     */
    fun signOut() {
        sessionStore.clear()
        _state.value = _state.value.copy(
            message = "Cleared on this device. The server keeps no session to end.",
        )
    }

    fun clearMessage() {
        _state.value = _state.value.copy(message = null)
    }
}
