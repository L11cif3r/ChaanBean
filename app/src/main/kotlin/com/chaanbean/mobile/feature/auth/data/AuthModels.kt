package com.chaanbean.mobile.feature.auth.data

import kotlinx.serialization.Serializable

/**
 * /api/auth is one POST endpoint switched on `action`, so each action gets its own
 * request type instead of a single union of nullable fields.
 *
 * `action` deliberately carries NO default: the shared Json has `encodeDefaults = false`,
 * so a defaulted value would be dropped from the body and the server would answer
 * "Invalid action." Every other default below is chosen to match the server's own
 * default for that field, so omitting it changes nothing.
 */
object AuthAction {
    const val LOGIN_CLIENT = "login_client"
    const val REGISTER_CLIENT = "register_client"
    const val LOGIN_ADMIN = "login_admin"
    const val REGISTER_ADMIN = "register_admin"
}

@Serializable
data class ClientLoginRequest(
    val action: String,
    val email: String,
    val companyName: String? = null,
)

@Serializable
data class ClientRegisterRequest(
    val action: String,
    val companyName: String,
    val email: String,
    val fullName: String? = null,
    val phone: String? = null,
    val pan: String? = null,
    val gstin: String? = null,
    val plan: String = "growth",
    val industry: String = "Wholesale & Industrial Distribution",
)

@Serializable
data class AdminLoginRequest(
    val action: String,
    val email: String,
    /** Accepted by the handler and never compared against anything. */
    val password: String? = null,
)

@Serializable
data class AdminRegisterRequest(
    val action: String,
    val name: String,
    val email: String,
    /** Only checked when present; an absent key skips the check entirely. */
    val securityKey: String? = null,
    val role: String = "owner",
)

/**
 * The union of every `user` object the four actions return. Client login adds
 * plan/walletBalance/companyId, client registration adds fullName/phone/trustId, and
 * admin registration returns the raw AdminUser row with its timestamps.
 */
@Serializable
data class AuthUser(
    val id: String = "",
    val name: String = "",
    val email: String? = null,
    val role: String = "",
    val companyId: String? = null,
    val plan: String? = null,
    val walletBalance: Double? = null,
    val fullName: String? = null,
    val phone: String? = null,
    val trustId: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

@Serializable
data class AuthResponse(
    val success: Boolean = false,
    /** "client" or "admin". */
    val type: String = "",
    val message: String? = null,
    val user: AuthUser? = null,
    val error: String? = null,
)

/** What a screen actually needs once the transport-level shape is unwrapped. */
data class AuthResult(
    val type: String,
    val user: AuthUser,
    val message: String? = null,
)
