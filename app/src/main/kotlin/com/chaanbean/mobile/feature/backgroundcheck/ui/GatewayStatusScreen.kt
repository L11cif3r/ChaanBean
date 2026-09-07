package com.chaanbean.mobile.feature.backgroundcheck.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.ErrorBox
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.LoadingBox
import com.chaanbean.mobile.core.ui.SectionHeader
import com.chaanbean.mobile.core.ui.StatusPill
import com.chaanbean.mobile.core.ui.SummaryTile
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.backgroundcheck.data.BackgroundCheckModule
import com.chaanbean.mobile.feature.backgroundcheck.data.GatewayAdapter
import com.chaanbean.mobile.feature.backgroundcheck.data.GatewaySummary
import com.chaanbean.mobile.feature.backgroundcheck.data.ReportCatalog

@Composable
fun GatewayStatusScreen() {
    val vm = rememberVm { GatewayStatusViewModel(BackgroundCheckModule.repository(it)) }
    val state by vm.state.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            SectionHeader(
                "Adapter Gateway Status",
                "The 11 provider adapters registered behind the verification gateway.",
            )
        }

        item {
            CaveatBox(
                title = "How to read this screen",
                text = "GET /api/verification/status returns a fixed manifest. The latency and " +
                    "circuit-breaker values are constants in the handler, not measurements, and " +
                    "failingCount is hardcoded to zero. \"live\" means only that the matching API key " +
                    "environment variable is set on the server - nothing is called to check it.",
            )
        }

        when (val status = state.status) {
            is Outcome.Loading -> item { LoadingBox() }

            is Outcome.Err -> item { ErrorBox(status.message, onRetry = { vm.refresh() }) }

            is Outcome.Ok -> {
                item { SummaryRow(status.value.summary) }
                status.value.timestamp?.let { stamp ->
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                "Reported at $stamp",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            TextButton(onClick = { vm.refresh() }) { Text("Refresh") }
                        }
                    }
                }
                items(status.value.adapters, key = { it.id }) { AdapterCard(it) }
            }
        }

        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun SummaryRow(summary: GatewaySummary) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        SummaryTile("Adapters", summary.totalAdapters.toString(), modifier = Modifier.weight(1f))
        SummaryTile(
            "Live",
            summary.liveCount.toString(),
            tint = if (summary.liveCount > 0) Chaan.Green else Chaan.TextMuted,
            modifier = Modifier.weight(1f),
        )
        SummaryTile(
            "Sandbox",
            summary.sandboxCount.toString(),
            tint = Chaan.Amber,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun AdapterCard(adapter: GatewayAdapter) {
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Text(adapter.name, style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(2.dp))
                Text(
                    adapter.id,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            StatusPill(
                text = adapter.status.uppercase(),
                tint = if (adapter.status == "live") Chaan.Green else Chaan.Amber,
            )
        }
        Spacer(Modifier.height(10.dp))
        KeyValueRow("Type", humanizeKey(adapter.type))
        KeyValueRow("Declared latency", "${adapter.latencyMs} ms")
        KeyValueRow("Circuit breaker", adapter.circuitBreaker)
        KeyValueRow("Endpoint", adapter.endpoint)
        if (adapter.reportsSupported.isNotEmpty()) {
            Spacer(Modifier.height(6.dp))
            Text(
                "SUPPORTS",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                adapter.reportsSupported.joinToString(", ") { ReportCatalog.label(it) },
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }
}
