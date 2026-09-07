package com.chaanbean.mobile.feature.settings.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.di.LocalAppContainer
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.OutcomeContent
import com.chaanbean.mobile.core.ui.SectionHeader
import com.chaanbean.mobile.core.ui.StatusPill
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.settings.data.CheckEvidence
import com.chaanbean.mobile.feature.settings.data.HealthCheckRow
import com.chaanbean.mobile.feature.settings.data.SettingsModule
import com.chaanbean.mobile.feature.settings.data.checkRows
import com.chaanbean.mobile.feature.settings.data.formatUptime

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiagnosticsScreen(onBack: () -> Unit) {
    val container = LocalAppContainer.current
    val vm = rememberVm {
        SettingsViewModel(SettingsModule.repository(it), it.session, it.baseUrl)
    }
    val state by vm.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Server diagnostics") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                SectionHeader(
                    "GET " + vm.baseUrl + "api/health",
                    "The only diagnostic endpoint the server publishes.",
                )
            }
            item {
                OutcomeContent(outcome = state.health, onRetry = { vm.refresh() }) { probe ->
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        ChaanCard {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text("Response", style = MaterialTheme.typography.titleMedium)
                                StatusPill(
                                    text = probe.response.status.uppercase(),
                                    tint = healthTint(probe.response.status),
                                )
                            }
                            Spacer(Modifier.height(8.dp))
                            KeyValueRow("version", probe.response.version.ifBlank { "not reported" })
                            KeyValueRow("timestamp", probe.response.timestamp.ifBlank { "not reported" })
                            KeyValueRow("uptimeSeconds", formatUptime(probe.response.uptimeSeconds))
                            KeyValueRow("latencyMs", probe.response.latencyMs.toString() + " ms")
                            KeyValueRow(
                                "Device round trip",
                                probe.roundTripMs?.let { it.toString() + " ms" }
                                    ?: "not measured - no request left this build",
                            )
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "latencyMs times the server's own database round trip. It says nothing " +
                                    "about the network between this device and the server.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }

                        ChaanCard {
                            Text("Subsystem checks", style = MaterialTheme.typography.titleMedium)
                            Spacer(Modifier.height(8.dp))
                            probe.response.checkRows().forEach { CheckRow(it) }
                            Spacer(Modifier.height(10.dp))
                            Text(
                                "Only the database check does any work: the handler counts rows in the " +
                                    "Company table and reports whether that threw. The other four values " +
                                    "are string constants in the same handler, so they read \"operational\" " +
                                    "whether or not those subsystems are running - or exist.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }

                        ChaanCard {
                            Text("Connection", style = MaterialTheme.typography.titleMedium)
                            Spacer(Modifier.height(8.dp))
                            KeyValueRow("Base URL", vm.baseUrl)
                            KeyValueRow(
                                "Transport",
                                if (container.useMock) "none - fixtures only" else "OkHttp, cleartext HTTP",
                            )
                            KeyValueRow("Credentials sent", "none")
                            Spacer(Modifier.height(10.dp))
                            TextButton(onClick = { vm.refresh() }) { Text("Re-check") }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}

@Composable
private fun CheckRow(row: HealthCheckRow) {
    Column(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(row.label, style = MaterialTheme.typography.bodyMedium)
            StatusPill(text = row.value.uppercase(), tint = healthTint(row.value))
        }
        Spacer(Modifier.height(2.dp))
        Text(
            when (row.evidence) {
                CheckEvidence.MEASURED -> "Measured: the server queried the database before answering."
                CheckEvidence.DECLARED -> "Declared: a hardcoded literal. Nothing was probed."
            },
            style = MaterialTheme.typography.labelSmall,
            color = when (row.evidence) {
                CheckEvidence.MEASURED -> MaterialTheme.colorScheme.onSurfaceVariant
                CheckEvidence.DECLARED -> Chaan.Amber
            },
        )
    }
}
