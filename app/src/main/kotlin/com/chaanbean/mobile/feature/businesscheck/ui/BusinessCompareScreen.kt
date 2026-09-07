package com.chaanbean.mobile.feature.businesscheck.ui

import androidx.compose.foundation.clickable
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
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.model.RiskFlag
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.EmptyBox
import com.chaanbean.mobile.core.ui.ErrorBox
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.LoadingBox
import com.chaanbean.mobile.core.ui.RiskBadge
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.businesscheck.data.BusinessCheckModule
import com.chaanbean.mobile.feature.businesscheck.data.BusinessProfile

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BusinessCompareScreen(
    onBack: () -> Unit,
    onOpenBusiness: (String) -> Unit,
) {
    val vm = rememberVm { BusinessCompareViewModel(BusinessCheckModule.repository(it)) }
    val state by vm.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Compare businesses") },
                navigationIcon = { TextButton(onClick = onBack) { Text("Back") } },
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
                Text(
                    "Pick two or three profiles. The same risk engine scored all of " +
                        "them, so the columns are directly comparable.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }

            item {
                SelectorCard(
                    options = state.options,
                    selectedIds = state.selectedIds,
                    onToggle = { vm.toggle(it) },
                    onRetry = { vm.loadOptions() },
                )
            }

            when (val compared = state.compared) {
                is Outcome.Loading -> item { LoadingBox() }
                is Outcome.Err -> item { ErrorBox(compared.message, onRetry = { vm.loadOptions() }) }
                is Outcome.Ok -> {
                    if (compared.value.size < 2) {
                        item { EmptyBox("Select at least two businesses to compare.") }
                    } else {
                        compared.value.forEach { business ->
                            item(key = business.id) {
                                CompareColumn(
                                    business = business,
                                    onClick = { onOpenBusiness(business.id) },
                                )
                            }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(32.dp)) }
        }
    }
}

@Composable
private fun SelectorCard(
    options: Outcome<List<BusinessProfile>>,
    selectedIds: List<String>,
    onToggle: (String) -> Unit,
    onRetry: () -> Unit,
) {
    ChaanCard {
        Text(
            "SELECTED ${selectedIds.size}/3",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(10.dp))
        when (options) {
            is Outcome.Loading -> LoadingBox()
            is Outcome.Err -> ErrorBox(options.message, onRetry = onRetry)
            is Outcome.Ok -> {
                if (options.value.isEmpty()) {
                    Text(
                        "No business profiles exist yet.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    // One chip per row: company names are long enough that a wrapping
                    // strip would truncate them on a phone.
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        options.value.forEach { option ->
                            SelectChip(
                                label = option.companyName,
                                selected = selectedIds.contains(option.id),
                                onClick = { onToggle(option.id) },
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CompareColumn(business: BusinessProfile, onClick: () -> Unit) {
    val flag = business.riskFlag
    val latest = business.yearSummaries.lastOrNull()
    ChaanCard(modifier = Modifier.clickable(onClick = onClick)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Text(business.companyName, style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(2.dp))
                Text(
                    business.gstin ?: business.cin ?: business.pan ?: "No identifiers",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.width(12.dp))
            RiskBadge(RiskFlag.from(flag?.flag))
        }

        Spacer(Modifier.height(10.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    "RISK SCORE",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    if (flag == null) EM_DASH else "${flag.compositeScore.toInt()}/100",
                    style = MaterialTheme.typography.titleLarge,
                    color = if (flag == null) MaterialTheme.colorScheme.onSurface else scoreTint(flag.compositeScore),
                    fontWeight = FontWeight.Bold,
                )
            }
            Column(Modifier.weight(1f)) {
                Text(
                    "CREDIT EXPOSURE",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    when {
                        flag == null -> EM_DASH
                        flag.flag.uppercase() == "RED" -> "BLOCKED"
                        else -> compactInr(flag.recommendedLimit)
                    },
                    style = MaterialTheme.typography.titleLarge,
                    color = if (flag?.flag?.uppercase() == "RED") Chaan.Red else Chaan.Green,
                    fontWeight = FontWeight.Bold,
                )
            }
        }

        Spacer(Modifier.height(12.dp))
        Text(
            "FINANCIALS (${latest?.fiscalYear ?: "no year on file"})",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(4.dp))
        KeyValueRow("Annual revenue", compactInr(latest?.revenue))
        KeyValueRow("Net profit", compactInr(latest?.netProfit))
        KeyValueRow("Net margin", formatPct(latest?.netMarginPct))
        KeyValueRow("Current ratio", formatRatio(latest?.currentRatio))
        KeyValueRow("Debt to equity", formatRatio(latest?.debtToEquity))

        Spacer(Modifier.height(12.dp))
        Text(
            "VERIFICATION",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(4.dp))
        KeyValueRow("Overall status", humanizeStatus(business.overallStatus))
        KeyValueRow("Provenance", humanizeStatus(business.sourceStatus))
        KeyValueRow(
            "Documents",
            (business.counts?.financialDocuments ?: business.financialDocuments.size).toString(),
        )
        KeyValueRow(
            "Court cases",
            (business.counts?.courtCases ?: business.courtCases.size).toString(),
        )

        val redSignals = business.riskSignals.filter { it.color.uppercase() == "RED" }
        if (redSignals.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            Text("Red signals", style = MaterialTheme.typography.labelSmall, color = Chaan.Red)
            redSignals.forEach { signal ->
                Text(
                    "- ${signal.label.ifBlank { signal.signalCode }}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Chaan.Red,
                )
            }
        }
    }
}
