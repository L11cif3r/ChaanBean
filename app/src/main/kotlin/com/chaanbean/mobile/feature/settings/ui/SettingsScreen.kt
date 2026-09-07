package com.chaanbean.mobile.feature.settings.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.di.LocalAppContainer
import com.chaanbean.mobile.core.di.Session
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.ErrorBox
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.LoadingBox
import com.chaanbean.mobile.core.ui.SectionHeader
import com.chaanbean.mobile.core.ui.StatusPill
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.di.FlavorInfo
import com.chaanbean.mobile.feature.settings.data.HealthProbe
import com.chaanbean.mobile.feature.settings.data.SettingsModule
import com.chaanbean.mobile.feature.settings.data.formatUptime

/** Shared by both screens in this package so one status never gets two colours. */
internal fun healthTint(status: String): Color = when (status.lowercase()) {
    "healthy", "up", "operational" -> Chaan.Green
    "degraded", "standby" -> Chaan.Amber
    "down", "unhealthy" -> Chaan.Red
    else -> Chaan.TextMuted
}

@Composable
fun SettingsScreen(onOpenDiagnostics: () -> Unit) {
    val container = LocalAppContainer.current
    val vm = rememberVm {
        SettingsViewModel(SettingsModule.repository(it), it.session, it.baseUrl)
    }
    val state by vm.state.collectAsState()
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(state.message) {
        val message = state.message
        if (message != null) {
            snackbar.showSnackbar(message)
            vm.clearMessage()
        }
    }

    Scaffold(snackbarHost = { SnackbarHost(snackbar) }) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                SectionHeader(
                    "Settings & diagnostics",
                    "Who this device thinks you are, what it is pointed at, and whether that server answers.",
                )
            }
            item {
                SessionCard(
                    session = state.session,
                    placeholder = state.placeholderSession,
                    onSignOut = { vm.signOut() },
                )
            }
            item { BuildCard(baseUrl = vm.baseUrl, usingMock = container.useMock) }
            item {
                HealthCard(
                    health = state.health,
                    onRetry = { vm.refresh() },
                    onOpenDiagnostics = onOpenDiagnostics,
                )
            }
            item { SecurityNoteCard() }
            item { UnavailableCard() }
            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}

@Composable
private fun SessionCard(
    session: Session?,
    placeholder: Session?,
    onSignOut: () -> Unit,
) {
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Signed-in identity", style = MaterialTheme.typography.titleMedium)
            StatusPill(
                text = if (session != null) "STORED" else "NONE",
                tint = if (session != null) Chaan.Green else Chaan.TextMuted,
            )
        }
        Spacer(Modifier.height(8.dp))

        if (session != null) {
            KeyValueRow("Name", session.name.ifBlank { "—" })
            KeyValueRow("Email", session.email.ifBlank { "—" })
            KeyValueRow("Role", session.role.ifBlank { "—" })
            KeyValueRow("Account type", session.type)
            KeyValueRow("Company ID", session.companyId ?: "—")
            KeyValueRow("User ID", session.id)
            Spacer(Modifier.height(12.dp))
            Text(
                "This record was handed over by the server and cached here. Nothing about it was " +
                    "cryptographically verified, and no token was issued alongside it.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(12.dp))
            OutlinedButton(onClick = onSignOut) { Text("Sign out on this device") }
        } else {
            Text(
                "No identity is stored on this device.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (placeholder != null) {
                Spacer(Modifier.height(12.dp))
                Text(
                    "Fixture identity used by this mock build:",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(4.dp))
                KeyValueRow("Organisation", placeholder.name)
                KeyValueRow("Email", placeholder.email)
                KeyValueRow("Role", placeholder.role)
                Spacer(Modifier.height(8.dp))
                Text(
                    "No sign-in happened. These are in-memory values, shown so the screen is not blank.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun BuildCard(baseUrl: String, usingMock: Boolean) {
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Build", style = MaterialTheme.typography.titleMedium)
            StatusPill(
                text = FlavorInfo.NAME.uppercase(),
                tint = if (usingMock) Chaan.Amber else Chaan.Accent,
            )
        }
        Spacer(Modifier.height(8.dp))
        Text(
            FlavorInfo.DESCRIPTION,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(10.dp))
        KeyValueRow("Flavor", FlavorInfo.NAME)
        KeyValueRow("API base URL", baseUrl)
        KeyValueRow("Repositories", if (usingMock) "in-memory fixtures" else "Retrofit over HTTP")
        if (usingMock) {
            Spacer(Modifier.height(10.dp))
            Text(
                "The base URL above is configured but unused: no repository in this flavor opens a socket.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun HealthCard(
    health: Outcome<HealthProbe>,
    onRetry: () -> Unit,
    onOpenDiagnostics: () -> Unit,
) {
    when (health) {
        is Outcome.Loading -> ChaanCard {
            Text("Server health", style = MaterialTheme.typography.titleMedium)
            LoadingBox()
        }

        is Outcome.Err -> ErrorBox(
            "GET /api/health did not answer: " + health.message,
            onRetry = onRetry,
        )

        is Outcome.Ok -> {
            val probe = health.value
            val response = probe.response
            ChaanCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Server health", style = MaterialTheme.typography.titleMedium)
                    StatusPill(
                        text = response.status.uppercase(),
                        tint = healthTint(response.status),
                    )
                }
                Spacer(Modifier.height(8.dp))
                KeyValueRow("API version", response.version.ifBlank { "not reported" })
                KeyValueRow("Process uptime", formatUptime(response.uptimeSeconds))
                KeyValueRow("Server-side latency", response.latencyMs.toString() + " ms")
                KeyValueRow(
                    "Round trip from device",
                    probe.roundTripMs?.let { it.toString() + " ms" } ?: "no request was sent",
                )
                KeyValueRow("Server timestamp", response.timestamp.ifBlank { "not reported" })
                Spacer(Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = onOpenDiagnostics) { Text("Subsystem checks") }
                    Spacer(Modifier.width(4.dp))
                    TextButton(onClick = onRetry) { Text("Re-check") }
                }
            }
        }
    }
}

@Composable
private fun SecurityNoteCard() {
    ChaanCard {
        Text("Security", style = MaterialTheme.typography.titleMedium, color = Chaan.Amber)
        Spacer(Modifier.height(8.dp))
        Column {
            Text(
                "This build attaches no credentials to any request, because the server checks none. " +
                    "Its routes read no token, cookie or signature, and POST /api/auth returns a user " +
                    "record without ever validating a password.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "Signing out therefore clears the cached record here and nothing else - there is no " +
                    "server-side session to invalidate. Anyone who can reach the API can read and write " +
                    "the same data this app does, so treat any deployment of it as public.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun UnavailableCard() {
    ChaanCard {
        Text("Not available on mobile", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        Text(
            "The web console's settings page shows a wallet credit ledger and an eleven-row " +
                "verification gateway registry. Neither has an HTTP route: the ledger is read from " +
                "the database inside the page itself, and the registry is a fixed array in the page " +
                "source. Its latencies and circuit-breaker states are constants, not measurements.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(10.dp))
        Text(
            "This screen shows nothing it cannot fetch.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
