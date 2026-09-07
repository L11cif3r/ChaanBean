package com.chaanbean.mobile.feature.settings.data

import com.chaanbean.mobile.core.di.AppContainer
import com.chaanbean.mobile.core.di.Session
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.model.outcomeOf

interface SettingsRepository {
    suspend fun health(): Outcome<HealthProbe>

    /**
     * The identity this build would show when nothing has been stored locally.
     * Live returns null - the real server hands identity back only from
     * `POST /api/auth`, which this screen deliberately does not call.
     */
    fun placeholderSession(): Session?
}

class LiveSettingsRepository(private val api: SettingsApi) : SettingsRepository {

    override suspend fun health(): Outcome<HealthProbe> = outcomeOf {
        val startNanos = System.nanoTime()
        val response = api.health()
        HealthProbe(
            response = response,
            roundTripMs = (System.nanoTime() - startNanos) / 1_000_000L,
        )
    }

    override fun placeholderSession(): Session? = null
}

class MockSettingsRepository : SettingsRepository {

    /**
     * Values chosen to match what the real handler emits for a seeded database, so
     * the mock flavor does not flatter the server. roundTripMs stays null because no
     * request leaves the device.
     */
    override suspend fun health(): Outcome<HealthProbe> = Outcome.Ok(
        HealthProbe(
            response = HealthResponse(
                status = "healthy",
                version = "1.0.0",
                uptimeSeconds = 51_248.0,
                timestamp = "2026-09-07T09:41:12.480Z",
                latencyMs = 4,
                checks = HealthChecks(
                    database = "up",
                    verificationGateway = "operational",
                    policyEngine = "operational",
                    riskScoringEngine = "operational",
                    voiceSystem = "operational",
                ),
            ),
            roundTripMs = null,
        ),
    )

    /** Mirrors the company and email literals the server's own auth handler falls back to. */
    override fun placeholderSession(): Session = Session(
        id = "cmp_acme_traders_001",
        name = "Acme Traders Pvt Ltd",
        email = "trade.operations@acmetraders.in",
        role = "client_admin",
        companyId = "cmp_acme_traders_001",
        type = "client",
    )
}

/** Every feature exposes exactly this: one factory keyed off the flavor flag. */
object SettingsModule {
    fun repository(container: AppContainer): SettingsRepository =
        if (container.useMock) MockSettingsRepository()
        else LiveSettingsRepository(container.retrofit.create(SettingsApi::class.java))
}
