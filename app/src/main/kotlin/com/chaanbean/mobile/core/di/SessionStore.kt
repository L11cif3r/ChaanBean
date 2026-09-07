package com.chaanbean.mobile.core.di

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * The single seam where identity lives.
 *
 * main's server performs NO authentication - /api/auth returns a user object
 * without ever checking a credential, and none of its 42 handlers read a token.
 * So this stores whatever the server handed back and nothing more. It exists as
 * one isolated class precisely so that when the server grows real sessions, the
 * change is confined here plus an OkHttp interceptor, not spread across features.
 */
class SessionStore(context: Context) {
    private val prefs = context.getSharedPreferences("chaanbean.session", Context.MODE_PRIVATE)

    private val _current = MutableStateFlow(read())
    val current: StateFlow<Session?> = _current.asStateFlow()

    fun save(session: Session) {
        prefs.edit()
            .putString(KEY_ID, session.id)
            .putString(KEY_NAME, session.name)
            .putString(KEY_EMAIL, session.email)
            .putString(KEY_ROLE, session.role)
            .putString(KEY_COMPANY, session.companyId)
            .putString(KEY_TYPE, session.type)
            .apply()
        _current.value = session
    }

    fun clear() {
        prefs.edit().clear().apply()
        _current.value = null
    }

    private fun read(): Session? {
        val id = prefs.getString(KEY_ID, null) ?: return null
        return Session(
            id = id,
            name = prefs.getString(KEY_NAME, "") ?: "",
            email = prefs.getString(KEY_EMAIL, "") ?: "",
            role = prefs.getString(KEY_ROLE, "") ?: "",
            companyId = prefs.getString(KEY_COMPANY, null),
            type = prefs.getString(KEY_TYPE, "client") ?: "client",
        )
    }

    private companion object {
        const val KEY_ID = "id"
        const val KEY_NAME = "name"
        const val KEY_EMAIL = "email"
        const val KEY_ROLE = "role"
        const val KEY_COMPANY = "companyId"
        const val KEY_TYPE = "type"
    }
}

data class Session(
    val id: String,
    val name: String,
    val email: String,
    val role: String,
    val companyId: String?,
    val type: String,
)
