package com.chaanbean.mobile.feature.trusthub.ui

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
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.EmptyBox
import com.chaanbean.mobile.core.ui.ErrorBox
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.LoadingBox
import com.chaanbean.mobile.core.ui.SectionHeader
import com.chaanbean.mobile.core.ui.StatusPill
import com.chaanbean.mobile.core.ui.formatInr
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.trusthub.data.LocallyReportedDefault
import com.chaanbean.mobile.feature.trusthub.data.ReportDefaultRequest
import com.chaanbean.mobile.feature.trusthub.data.SearchHit
import com.chaanbean.mobile.feature.trusthub.data.TrustHubModule

@Composable
fun CommunityDefaultsScreen(onOpenVerify: (String) -> Unit = {}) {
    val vm = rememberVm { CommunityDefaultsViewModel(TrustHubModule.repository(it)) }
    val state by vm.state.collectAsState()
    var showSheet by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(state.message) {
        val message = state.message
        if (message != null) {
            snackbar.showSnackbar(message)
            vm.clearMessage()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showSheet = true },
                text = { Text("Report a default") },
                icon = {},
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
                    "Community defaults",
                    "Commercial defaults members have published to the network. One published " +
                        "default forces a red risk flag on any matching buyer.",
                )
            }
            item { NoFeedEndpointCard() }
            item {
                ChaanCard {
                    OutlinedTextField(
                        value = state.query,
                        onValueChange = vm::onQueryChange,
                        label = { Text("Debtor name, GSTIN or PAN") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = { vm.search() },
                        enabled = state.query.isNotBlank(),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Search the registry")
                    }
                }
            }

            when (val results = state.results) {
                null -> Unit
                is Outcome.Loading -> item { LoadingBox() }
                is Outcome.Err -> item { ErrorBox(results.message, onRetry = { vm.search() }) }
                is Outcome.Ok -> {
                    item { SectionHeader("Registry matches") }
                    if (results.value.isEmpty()) {
                        item {
                            EmptyBox(
                                "No default rows matched that text. Search matches on the debtor " +
                                    "name, GSTIN and PAN columns only.",
                            )
                        }
                    } else {
                        items(results.value, key = { it.id }) { hit ->
                            SearchHitRow(hit, onVerify = { onOpenVerify(hit.title) })
                        }
                    }
                }
            }

            if (state.reportedThisSession.isNotEmpty()) {
                item {
                    SectionHeader(
                        "Filed from this device",
                        "Kept locally for this session: the report endpoint returns only an id, " +
                            "and no endpoint reads the stored row back.",
                    )
                }
                items(state.reportedThisSession, key = { it.defaultId }) { ReportedRow(it) }
            }

            item { Spacer(Modifier.height(88.dp)) }
        }
    }

    if (showSheet) {
        ReportDefaultSheet(
            submitting = state.submitting,
            onDismiss = { showSheet = false },
            onSubmit = {
                vm.report(it)
                showSheet = false
            },
        )
    }
}

@Composable
private fun NoFeedEndpointCard() {
    ChaanCard {
        StatusPill("NO FEED ENDPOINT", Chaan.Amber)
        Spacer(Modifier.height(10.dp))
        Text(
            "The server exposes no endpoint that lists the community default registry. " +
                "/api/trust-hub/defaults only accepts new reports.",
            style = MaterialTheme.typography.bodyMedium,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "So this screen is a search, not a feed: it queries /api/search, which returns at " +
                "most four default rows per query and only for text that matches a debtor name, " +
                "GSTIN or PAN. There is no way from here to see the whole registry, or the most " +
                "recent entries.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun SearchHitRow(hit: SearchHit, onVerify: () -> Unit) {
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Text(hit.title, style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(2.dp))
                Text(
                    hit.identifier,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.width(8.dp))
            StatusPill(hit.badge, Chaan.Red)
        }
        Spacer(Modifier.height(8.dp))
        // The search endpoint sends the amount pre-formatted inside `subtitle`; there is no
        // numeric field on this response to reformat.
        Text(hit.subtitle, style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(4.dp))
        Text(
            "Search returns no default date, reporter or notes - open the full lookup for those.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(10.dp))
        OutlinedButton(onClick = onVerify, modifier = Modifier.fillMaxWidth()) {
            Text("Verify this business")
        }
    }
}

@Composable
private fun ReportedRow(entry: LocallyReportedDefault) {
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Text(
                entry.debtorName,
                style = MaterialTheme.typography.titleSmall,
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.width(8.dp))
            Text(
                formatInr(entry.amountDefaulted),
                style = MaterialTheme.typography.titleSmall,
                color = Chaan.Red,
                fontWeight = FontWeight.Bold,
            )
        }
        Spacer(Modifier.height(8.dp))
        entry.debtorGstin?.let { KeyValueRow("Debtor GSTIN", it) }
        entry.debtorPan?.let { KeyValueRow("Debtor PAN", it) }
        KeyValueRow("Registry id", entry.defaultId)
        Spacer(Modifier.height(8.dp))
        Text(
            entry.serverMessage,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReportDefaultSheet(
    submitting: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (ReportDefaultRequest) -> Unit,
) {
    var debtorName by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var gstin by remember { mutableStateOf("") }
    var pan by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

    val parsedAmount = amount.trim().toDoubleOrNull()

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
        ) {
            Text("Report a commercial default", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(6.dp))
            Text(
                "This is published to every member on the network and is stored with its " +
                    "verified column already set to true - no one reviews it first. Any buyer " +
                    "whose name, GSTIN or PAN matches is immediately forced to a red risk flag, " +
                    "and the entity is blocked from being issued a Trust ID.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                "Name matching is a substring match, so a short or generic name can flag " +
                    "unrelated businesses. There is no delete endpoint.",
                style = MaterialTheme.typography.bodyMedium,
                color = Chaan.Amber,
            )
            Spacer(Modifier.height(16.dp))
            OutlinedTextField(
                value = debtorName,
                onValueChange = { debtorName = it },
                label = { Text("Debtor entity name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = amount,
                onValueChange = { amount = it },
                label = { Text("Amount defaulted (rupees)") },
                singleLine = true,
                isError = amount.isNotBlank() && parsedAmount == null,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = gstin,
                onValueChange = { gstin = it },
                label = { Text("Debtor GSTIN (optional)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = pan,
                onValueChange = { pan = it },
                label = { Text("Debtor PAN (optional)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text("Notes (optional)") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(18.dp))
            Button(
                onClick = {
                    if (parsedAmount != null) {
                        onSubmit(
                            ReportDefaultRequest(
                                debtorName = debtorName.trim(),
                                amountDefaulted = parsedAmount,
                                debtorGstin = gstin.trim().ifBlank { null }?.uppercase(),
                                debtorPan = pan.trim().ifBlank { null }?.uppercase(),
                                notes = notes.trim().ifBlank { null },
                            ),
                        )
                    }
                },
                enabled = debtorName.isNotBlank() && parsedAmount != null && !submitting,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (submitting) "Publishing..." else "Publish to the network")
            }
        }
    }
}
