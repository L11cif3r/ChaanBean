package com.chaanbean.mobile.feature.debtors.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.EmptyBox
import com.chaanbean.mobile.core.ui.ErrorBox
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.LoadingBox
import com.chaanbean.mobile.core.ui.RiskBadge
import com.chaanbean.mobile.core.ui.SectionHeader
import com.chaanbean.mobile.core.ui.StatusPill
import com.chaanbean.mobile.core.ui.SummaryTile
import com.chaanbean.mobile.core.ui.formatInr
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.debtors.data.BuyerDebtor
import com.chaanbean.mobile.feature.debtors.data.CreateBuyerRequest
import com.chaanbean.mobile.feature.debtors.data.DEBTOR_LANGUAGES
import com.chaanbean.mobile.feature.debtors.data.DebtorsModule
import com.chaanbean.mobile.feature.debtors.data.ageingBucket
import com.chaanbean.mobile.feature.debtors.data.daysOverdue
import com.chaanbean.mobile.feature.debtors.data.latestRisk
import com.chaanbean.mobile.feature.debtors.data.primaryAccount
import com.chaanbean.mobile.feature.debtors.data.riskFlag

@Composable
fun DebtorsScreen(onOpenBuyer: (String) -> Unit) {
    val vm = rememberVm { DebtorsViewModel(DebtorsModule.repository(it)) }
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
                text = { Text("Add buyer") },
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
                    "Debtors & Counterparty Portfolio",
                    "Outstanding exposure by buyer, with the deterministic Green / Amber / Red flag last computed by the server.",
                )
            }

            when (val outcome = state.buyers) {
                is Outcome.Loading -> item { LoadingBox() }
                is Outcome.Err -> item { ErrorBox(outcome.message, onRetry = { vm.refresh() }) }
                is Outcome.Ok -> {
                    val summary = summarise(outcome.value)
                    item { ExposureTiles(summary) }
                    item { AgeingCard(summary) }
                    item {
                        FilterRow(
                            selected = state.filter,
                            onSelect = { vm.setFilter(it) },
                        )
                    }

                    val visible = applyFilter(outcome.value, state.filter)
                    if (visible.isEmpty()) {
                        item {
                            EmptyBox(
                                if (outcome.value.isEmpty()) {
                                    "No buyers in this portfolio yet."
                                } else {
                                    "No buyer matches the ${state.filter.label} filter."
                                },
                            )
                        }
                    } else {
                        items(visible, key = { it.id }) { buyer ->
                            DebtorRow(buyer, onClick = { onOpenBuyer(buyer.id) })
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(80.dp)) }
        }
    }

    if (showSheet) {
        AddBuyerSheet(
            submitting = state.submitting,
            onDismiss = { showSheet = false },
            onSubmit = {
                vm.onboard(it)
                showSheet = false
            },
        )
    }
}

@Composable
private fun ExposureTiles(summary: PortfolioSummary) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            SummaryTile(
                label = "Total outstanding",
                value = formatInr(summary.totalOutstanding),
                modifier = Modifier.weight(1f),
            )
            SummaryTile(
                label = "Overdue",
                value = formatInr(summary.overdueOutstanding),
                tint = if (summary.overdueOutstanding > 0.0) Chaan.Amber else null,
                modifier = Modifier.weight(1f),
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            SummaryTile(
                label = "Buyers",
                value = summary.buyerCount.toString(),
                modifier = Modifier.weight(1f),
            )
            SummaryTile(
                label = "Red flags",
                value = summary.redCount.toString(),
                tint = if (summary.redCount > 0) Chaan.Red else null,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun AgeingCard(summary: PortfolioSummary) {
    ChaanCard {
        Text("Ageing of outstanding", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(2.dp))
        Text(
            "Derived on the device from each account's due date. The server exposes no ageing endpoint.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(8.dp))
        if (summary.ageing.isEmpty()) {
            Text(
                "Nothing outstanding.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            summary.ageing.forEach { (bucket, amount) ->
                KeyValueRow(bucket.label, formatInr(amount))
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(
            "Flags: ${summary.greenCount} green - ${summary.amberCount} amber - " +
                "${summary.redCount} red - ${summary.unratedCount} unrated",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FilterRow(selected: DebtorFilter, onSelect: (DebtorFilter) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        DebtorFilter.entries.forEach { filter ->
            FilterChip(
                selected = filter == selected,
                onClick = { onSelect(filter) },
                label = { Text(filter.label) },
            )
        }
    }
}

@Composable
private fun DebtorRow(buyer: BuyerDebtor, onClick: () -> Unit) {
    val account = buyer.primaryAccount()
    val risk = buyer.latestRisk()
    val days = account?.daysOverdue()

    ChaanCard(modifier = Modifier.clickable(onClick = onClick)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Text(buyer.name, style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(2.dp))
                Text(
                    buyer.gstin ?: buyer.pan ?: "No GSTIN or PAN on file",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.width(12.dp))
            Column(horizontalAlignment = Alignment.End) {
                RiskBadge(buyer.riskFlag())
                if (risk != null) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "${risk.compositeScore.toInt()}/100",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        Spacer(Modifier.height(10.dp))
        if (account == null) {
            // The debtors page reads creditAccounts[0]; a buyer without one has no
            // exposure figures at all, and saying so beats printing a zero.
            Text(
                "No credit account on this buyer yet.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            Text(
                formatInr(account.outstandingAmount),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
            )
            Text(
                "outstanding",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(8.dp))
            KeyValueRow("Approved limit", formatInr(account.creditLimit))
            KeyValueRow("Ageing", ageingBucket(days).label)
            KeyValueRow(
                "Recommended tenor",
                "${risk?.recommendedTenor ?: account.tenorDays} days",
            )
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatusPill(
                    text = account.overdueStatus.uppercase(),
                    tint = overdueTint(account.overdueStatus),
                )
                if (account.disputeStatus != "none") {
                    StatusPill(
                        text = account.disputeStatus.uppercase().replace('_', ' '),
                        tint = Chaan.Accent,
                    )
                }
            }
        }
    }
}

internal fun overdueTint(status: String) = when (status) {
    "defaulted" -> Chaan.Red
    "overdue" -> Chaan.Amber
    "due" -> Chaan.Accent
    else -> Chaan.Green
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddBuyerSheet(
    submitting: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (CreateBuyerRequest) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var gstin by remember { mutableStateOf("") }
    var pan by remember { mutableStateOf("") }
    var mobile by remember { mutableStateOf("") }
    var language by remember { mutableStateOf("en") }
    var amount by remember { mutableStateOf("250000") }
    var overdueDays by remember { mutableStateOf("15") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
        ) {
            Text("Add a buyer", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(4.dp))
            Text(
                "Creating a buyer also creates its first credit account and runs the " +
                    "scoring engine. The verification adapters behind that score answer " +
                    "from the platform's own records in sandbox mode - they are not live " +
                    "bureau or GST portal pulls.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(16.dp))
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Buyer trade name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = gstin,
                onValueChange = { gstin = it },
                label = { Text("GSTIN (optional)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = pan,
                onValueChange = { pan = it },
                label = { Text("PAN (optional)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = mobile,
                onValueChange = { mobile = it },
                label = { Text("Primary mobile (optional)") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it.filter { c -> c.isDigit() } },
                    label = { Text("Outstanding") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = overdueDays,
                    onValueChange = { overdueDays = it.filter { c -> c.isDigit() } },
                    label = { Text("Days overdue") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                )
            }
            Spacer(Modifier.height(14.dp))
            Text(
                "Recovery language",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(6.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                DEBTOR_LANGUAGES.forEach { (code, label) ->
                    FilterChip(
                        selected = code == language,
                        onClick = { language = code },
                        label = { Text(label) },
                    )
                }
            }
            Spacer(Modifier.height(18.dp))
            Button(
                onClick = {
                    onSubmit(
                        CreateBuyerRequest(
                            name = name.trim(),
                            pan = pan.trim().uppercase().ifBlank { null },
                            gstin = gstin.trim().uppercase().ifBlank { null },
                            mobile = mobile.trim().ifBlank { null }?.let { listOf(it) },
                            language = language,
                            initialAmount = amount.toDoubleOrNull() ?: 0.0,
                            overdueDays = overdueDays.toIntOrNull() ?: 0,
                        ),
                    )
                },
                enabled = name.isNotBlank() && !submitting,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (submitting) "Scoring..." else "Create & score")
            }
        }
    }
}
