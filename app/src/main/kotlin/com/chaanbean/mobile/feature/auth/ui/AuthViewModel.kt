package com.chaanbean.mobile.feature.auth.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chaanbean.mobile.core.di.Session
import com.chaanbean.mobile.core.di.SessionStore
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.feature.auth.data.AdminLoginRequest
import com.chaanbean.mobile.feature.auth.data.AdminRegisterRequest
import com.chaanbean.mobile.feature.auth.data.AuthAction
import com.chaanbean.mobile.feature.auth.data.AuthRepository
import com.chaanbean.mobile.feature.auth.data.AuthResult
import com.chaanbean.mobile.feature.auth.data.ClientLoginRequest
import com.chaanbean.mobile.feature.auth.data.ClientRegisterRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

enum class AuthPortal { CLIENT, ADMIN }

enum class AuthMode { SIGN_IN, REGISTER }

/** Held in the ViewModel so a rotation does not wipe a half-filled registration form. */
data class AuthForm(
    val clientEmail: String = "",
    val clientPassword: String = "",
    val companyName: String = "",
    val fullName: String = "",
    val phone: String = "",
    val pan: String = "",
    val gstin: String = "",
    val plan: String = "growth",
    val adminEmail: String = "",
    val adminPassword: String = "",
    val adminName: String = "",
    val securityKey: String = "",
    val adminRole: String = "owner",
)

data class AuthUiState(
    val portal: AuthPortal = AuthPortal.CLIENT,
    val mode: AuthMode = AuthMode.SIGN_IN,
    val form: AuthForm = AuthForm(),
    val submitting: Boolean = false,
    val error: String? = null,
    /** Set once the server has answered and the session has been written to disk. */
    val result: AuthResult? = null,
    val storedSession: Session? = null,
)

class AuthViewModel(
    private val repository: AuthRepository,
    private val session: SessionStore,
) : ViewModel() {

    private val _state = MutableStateFlow(AuthUiState(storedSession = session.current.value))
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    fun setPortal(portal: AuthPortal) {
        _state.value = _state.value.copy(portal = portal, error = null)
    }

    fun setMode(mode: AuthMode) {
        _state.value = _state.value.copy(mode = mode, error = null)
    }

    fun updateForm(transform: (AuthForm) -> AuthForm) {
        _state.value = _state.value.copy(form = transform(_state.value.form))
    }

    /** Mirrors the web login page's "Fill Sample Credentials" affordance. */
    fun fillSampleClient() {
        updateForm {
            it.copy(
                clientEmail = "trade.ops@acmetraders.in",
                clientPassword = "ChaanBeanPass2026!",
                companyName = "Acme Traders Pvt Ltd",
            )
        }
    }

    fun fillSampleAdmin() {
        updateForm {
            it.copy(
                adminEmail = "owner@chaanbean.in",
                adminPassword = "RootOwnerKey2026!",
                securityKey = "CHAANBEAN-ROOT-2026",
            )
        }
    }

    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }

    fun signOut() {
        session.clear()
        _state.value = _state.value.copy(result = null, storedSession = null, error = null)
    }

    fun submit() {
        val current = _state.value
        val form = current.form
        val invalid = validate(current.portal, current.mode, form)
        if (invalid != null) {
            _state.value = current.copy(error = invalid)
            return
        }

        _state.value = current.copy(submitting = true, error = null)
        viewModelScope.launch {
            val outcome = when {
                current.portal == AuthPortal.CLIENT && current.mode == AuthMode.SIGN_IN ->
                    repository.loginClient(
                        ClientLoginRequest(
                            action = AuthAction.LOGIN_CLIENT,
                            email = form.clientEmail.trim(),
                            companyName = form.companyName.trim().ifBlank { null },
                        ),
                    )

                current.portal == AuthPortal.CLIENT ->
                    repository.registerClient(
                        ClientRegisterRequest(
                            action = AuthAction.REGISTER_CLIENT,
                            companyName = form.companyName.trim(),
                            email = form.clientEmail.trim(),
                            fullName = form.fullName.trim().ifBlank { null },
                            phone = form.phone.trim().ifBlank { null },
                            pan = form.pan.trim().uppercase().ifBlank { null },
                            gstin = form.gstin.trim().uppercase().ifBlank { null },
                            plan = form.plan,
                        ),
                    )

                current.mode == AuthMode.SIGN_IN ->
                    repository.loginAdmin(
                        AdminLoginRequest(
                            action = AuthAction.LOGIN_ADMIN,
                            email = form.adminEmail.trim(),
                            password = form.adminPassword.ifBlank { null },
                        ),
                    )

                else ->
                    repository.registerAdmin(
                        AdminRegisterRequest(
                            action = AuthAction.REGISTER_ADMIN,
                            name = form.adminName.trim(),
                            email = form.adminEmail.trim(),
                            securityKey = form.securityKey.trim().ifBlank { null },
                            role = form.adminRole,
                        ),
                    )
            }

            when (outcome) {
                is Outcome.Ok -> {
                    val stored = toSession(outcome.value, current.portal, form)
                    session.save(stored)
                    _state.value = _state.value.copy(
                        submitting = false,
                        result = outcome.value,
                        storedSession = stored,
                        error = null,
                    )
                }

                is Outcome.Err -> _state.value =
                    _state.value.copy(submitting = false, error = outcome.message)

                Outcome.Loading -> Unit
            }
        }
    }

    private fun validate(portal: AuthPortal, mode: AuthMode, form: AuthForm): String? = when {
        portal == AuthPortal.CLIENT && form.clientEmail.isBlank() ->
            "Enter the business email to sign in with."

        portal == AuthPortal.CLIENT && mode == AuthMode.REGISTER && form.companyName.isBlank() ->
            "Enterprise Company Name and Official Email are required."

        portal == AuthPortal.ADMIN && form.adminEmail.isBlank() ->
            "Enter the administrator email."

        portal == AuthPortal.ADMIN && mode == AuthMode.REGISTER && form.adminName.isBlank() ->
            "Administrator Name and Official Email are required."

        else -> null
    }

    /**
     * The server returns no token, so there is nothing to store beyond the account it
     * echoed back. Email falls back to what was typed because login_client only returns
     * the address it was handed.
     */
    private fun toSession(result: AuthResult, portal: AuthPortal, form: AuthForm): Session {
        val typedEmail = if (portal == AuthPortal.CLIENT) form.clientEmail.trim() else form.adminEmail.trim()
        val type = result.type.ifBlank { if (portal == AuthPortal.CLIENT) "client" else "admin" }
        return Session(
            id = result.user.id,
            name = result.user.name,
            email = result.user.email?.takeIf { it.isNotBlank() } ?: typedEmail,
            role = result.user.role,
            companyId = result.user.companyId,
            type = type,
        )
    }
}
