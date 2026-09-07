package com.chaanbean.mobile.feature.auth.data

import com.chaanbean.mobile.core.di.AppContainer
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.model.outcomeOf
import kotlinx.serialization.json.Json
import retrofit2.Response
import kotlin.math.abs

interface AuthRepository {
    suspend fun loginClient(request: ClientLoginRequest): Outcome<AuthResult>
    suspend fun registerClient(request: ClientRegisterRequest): Outcome<AuthResult>
    suspend fun loginAdmin(request: AdminLoginRequest): Outcome<AuthResult>
    suspend fun registerAdmin(request: AdminRegisterRequest): Outcome<AuthResult>
}

class LiveAuthRepository(
    private val api: AuthApi,
    private val json: Json,
) : AuthRepository {

    override suspend fun loginClient(request: ClientLoginRequest): Outcome<AuthResult> =
        unwrap { api.loginClient(request) }

    override suspend fun registerClient(request: ClientRegisterRequest): Outcome<AuthResult> =
        unwrap { api.registerClient(request) }

    override suspend fun loginAdmin(request: AdminLoginRequest): Outcome<AuthResult> =
        unwrap { api.loginAdmin(request) }

    override suspend fun registerAdmin(request: AdminRegisterRequest): Outcome<AuthResult> =
        unwrap { api.registerAdmin(request) }

    private suspend fun unwrap(call: suspend () -> Response<AuthResponse>): Outcome<AuthResult> =
        outcomeOf {
            val response = call()
            val body = response.body()
            val user = body?.user
            if (!response.isSuccessful || user == null) {
                throw IllegalStateException(failureMessage(response, body))
            }
            AuthResult(type = body.type, user = user, message = body.message)
        }

    private fun failureMessage(response: Response<AuthResponse>, body: AuthResponse?): String {
        body?.error?.let { return it }
        val raw = response.errorBody()?.string()
        val parsed = raw?.takeIf { it.isNotBlank() }?.let {
            runCatching { json.decodeFromString(AuthResponse.serializer(), it) }.getOrNull()
        }
        return parsed?.error ?: "The server rejected the request (HTTP ${response.code()})."
    }
}

/**
 * In-memory stand-in for the `mock` flavor. It reproduces the server's actual branching -
 * including the parts that are not checks at all: no password is compared, and the admin
 * security key is only validated when one is supplied.
 */
class MockAuthRepository : AuthRepository {

    private val companies = mutableListOf(
        MockCompany(
            id = "cmpy_acme_5f21",
            name = "Acme Traders Pvt Ltd",
            email = "trade.operations@acmetraders.in",
            plan = "growth",
            walletBalance = 250_000.0,
        ),
        MockCompany(
            id = "cmpy_zenith_9c04",
            name = "Zenith Precision Logistics Ltd",
            email = "accounts@zenithlogistics.in",
            plan = "enterprise",
            walletBalance = 4_80_000.0,
        ),
        MockCompany(
            id = "cmpy_mahaveer_3b77",
            name = "Mahaveer Steel & Alloys",
            email = "credit.control@mahaveersteel.co.in",
            plan = "growth",
            walletBalance = 1_15_400.0,
        ),
    )

    private val admins = mutableListOf(
        MockAdmin(id = "adm_sv_0001", name = "Siddharth Verma", email = "owner@chaanbean.in", role = "owner"),
        MockAdmin(id = "adm_pn_0002", name = "Priya Nair", email = "priya.nair@chaanbean.in", role = "team_member"),
    )

    override suspend fun loginClient(request: ClientLoginRequest): Outcome<AuthResult> {
        val typed = request.companyName?.trim().orEmpty()
        val company = companies.firstOrNull { typed.isNotEmpty() && it.name.contains(typed, ignoreCase = true) }
            ?: companies.firstOrNull { it.name == "Acme Traders Pvt Ltd" }
            ?: companies.firstOrNull()
            ?: return Outcome.Err("No active client organization account found.")

        return Outcome.Ok(
            AuthResult(
                type = "client",
                user = AuthUser(
                    id = company.id,
                    name = company.name,
                    email = request.email.ifBlank { company.email },
                    role = "client_admin",
                    companyId = company.id,
                    plan = company.plan,
                    walletBalance = company.walletBalance,
                ),
            ),
        )
    }

    override suspend fun registerClient(request: ClientRegisterRequest): Outcome<AuthResult> {
        if (request.companyName.isBlank() || request.email.isBlank()) {
            return Outcome.Err("Enterprise Company Name and Official Email are required.")
        }

        val existing = companies.firstOrNull { it.name == request.companyName }
        if (existing != null) {
            return Outcome.Ok(
                AuthResult(
                    type = "client",
                    message = "Enterprise account already registered. Logged in successfully.",
                    user = AuthUser(
                        id = existing.id,
                        name = existing.name,
                        email = request.email,
                        phone = request.phone,
                        role = "client_admin",
                        companyId = existing.id,
                        plan = existing.plan,
                        walletBalance = existing.walletBalance,
                    ),
                ),
            )
        }

        val created = MockCompany(
            id = "cmpy_" + request.companyName.filter { it.isLetterOrDigit() }.take(6).lowercase() +
                "_" + (companies.size + 1),
            name = request.companyName,
            email = request.email,
            plan = request.plan,
            walletBalance = 250_000.0,
        )
        companies.add(created)

        return Outcome.Ok(
            AuthResult(
                type = "client",
                message = "Enterprise account registered successfully.",
                user = AuthUser(
                    id = created.id,
                    name = created.name,
                    fullName = request.fullName ?: "Trade Director",
                    email = request.email,
                    phone = request.phone,
                    role = "client_admin",
                    companyId = created.id,
                    plan = created.plan,
                    walletBalance = created.walletBalance,
                    trustId = trustIdFor(request.companyName, request.pan),
                ),
            ),
        )
    }

    override suspend fun loginAdmin(request: AdminLoginRequest): Outcome<AuthResult> {
        // request.password is intentionally unused: neither is it used on the server.
        val admin = admins.firstOrNull { it.email.equals(request.email.trim(), ignoreCase = true) }
            ?: admins.firstOrNull { it.role == "owner" }
            ?: admins.first()

        return Outcome.Ok(
            AuthResult(
                type = "admin",
                user = AuthUser(id = admin.id, name = admin.name, email = admin.email, role = admin.role),
            ),
        )
    }

    override suspend fun registerAdmin(request: AdminRegisterRequest): Outcome<AuthResult> {
        if (request.name.isBlank() || request.email.isBlank()) {
            return Outcome.Err("Administrator Name and Official Email are required.")
        }
        val key = request.securityKey?.trim()
        if (!key.isNullOrEmpty() && key !in VALID_PASSKEYS) {
            return Outcome.Err("Invalid Admin Master Security Key.")
        }

        val existing = admins.firstOrNull { it.email.equals(request.email, ignoreCase = true) }
        if (existing != null) {
            return Outcome.Ok(
                AuthResult(
                    type = "admin",
                    message = "Admin credentials verified.",
                    user = AuthUser(id = existing.id, name = existing.name, email = existing.email, role = existing.role),
                ),
            )
        }

        val created = MockAdmin(
            id = "adm_new_" + (admins.size + 1),
            name = request.name,
            email = request.email,
            role = if (request.role == "team_member") "team_member" else "owner",
        )
        admins.add(created)

        return Outcome.Ok(
            AuthResult(
                type = "admin",
                message = "New Administrator successfully registered.",
                user = AuthUser(id = created.id, name = created.name, email = created.email, role = created.role),
            ),
        )
    }

    private data class MockCompany(
        val id: String,
        val name: String,
        val email: String,
        val plan: String,
        val walletBalance: Double,
    )

    private data class MockAdmin(
        val id: String,
        val name: String,
        val email: String,
        val role: String,
    )

    private companion object {
        val VALID_PASSKEYS = listOf("CHAANBEAN-ROOT-2026", "CHAANBEAN-ADMIN", "ADMIN2026")

        /** Same derivation the server uses, so a mock Trust ID matches a live one. */
        fun trustIdFor(companyName: String, pan: String?): String {
            val cleanPan = (pan?.uppercase()?.takeIf { it.isNotBlank() } ?: "AABCC1234F").padEnd(6, 'X')
            val suffix = abs(nameHash(companyName) % 9000 + 1000)
            return "TH-CB-${cleanPan.substring(2, 6)}-$suffix"
        }

        fun nameHash(value: String): Int {
            var hash = 0
            for (ch in value) {
                hash = (hash shl 5) - hash + ch.code
            }
            return hash
        }
    }
}

object AuthModule {
    fun repository(container: AppContainer): AuthRepository =
        if (container.useMock) MockAuthRepository()
        else LiveAuthRepository(container.retrofit.create(AuthApi::class.java), container.json)
}
