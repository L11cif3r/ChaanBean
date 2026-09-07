package com.chaanbean.mobile.feature.settings.data

import kotlinx.serialization.Serializable

/**
 * Mirrors the JSON body of `GET /api/health` exactly. Every field carries a default
 * because the handler is free to change shape without the client noticing.
 */
@Serializable
data class HealthResponse(
    /** "healthy" when the database query succeeded, "degraded" when it threw. */
    val status: String = "unknown",
    val version: String = "",
    /** Node's `process.uptime()`, so it resets on every serverless cold start. */
    val uptimeSeconds: Double = 0.0,
    val timestamp: String = "",
    /** Time the server spent on its own database round trip, not the network. */
    val latencyMs: Long = 0,
    val checks: HealthChecks = HealthChecks(),
)

@Serializable
data class HealthChecks(
    val database: String = "unknown",
    val verificationGateway: String = "unknown",
    val policyEngine: String = "unknown",
    val riskScoringEngine: String = "unknown",
    val voiceSystem: String = "unknown",
)

/**
 * The server's answer plus what this device actually observed. Kept separate from
 * [HealthResponse] so the screen can never present a client measurement as if the
 * server had reported it.
 */
data class HealthProbe(
    val response: HealthResponse,
    /** Null when no request left the device, e.g. in the mock flavor. */
    val roundTripMs: Long? = null,
)

/**
 * How the server arrived at a single entry of `checks`. Only `database` is backed by
 * work: the handler runs `prisma.company.count()` and reports the outcome. The other
 * four are string literals in the same handler, so they read "operational" regardless
 * of whether those subsystems exist. The UI labels them accordingly.
 */
enum class CheckEvidence { MEASURED, DECLARED }

data class HealthCheckRow(
    val label: String,
    val value: String,
    val evidence: CheckEvidence,
)

fun HealthResponse.checkRows(): List<HealthCheckRow> = listOf(
    HealthCheckRow("Database", checks.database, CheckEvidence.MEASURED),
    HealthCheckRow("Verification gateway", checks.verificationGateway, CheckEvidence.DECLARED),
    HealthCheckRow("Policy engine", checks.policyEngine, CheckEvidence.DECLARED),
    HealthCheckRow("Risk scoring engine", checks.riskScoringEngine, CheckEvidence.DECLARED),
    HealthCheckRow("Voice system", checks.voiceSystem, CheckEvidence.DECLARED),
)

fun formatUptime(seconds: Double): String {
    val total = seconds.toLong()
    if (total <= 0L) return "not reported"
    val days = total / 86_400
    val hours = (total % 86_400) / 3_600
    val minutes = (total % 3_600) / 60
    val secs = total % 60
    return when {
        days > 0L -> days.toString() + "d " + hours + "h " + minutes + "m"
        hours > 0L -> hours.toString() + "h " + minutes + "m"
        minutes > 0L -> minutes.toString() + "m " + secs + "s"
        else -> secs.toString() + "s"
    }
}
