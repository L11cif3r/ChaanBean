package com.chaanbean.mobile.feature.backgroundcheck.ui

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
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.EmptyBox
import com.chaanbean.mobile.core.ui.ErrorBox
import com.chaanbean.mobile.core.ui.LoadingBox
import com.chaanbean.mobile.core.ui.SectionHeader
import com.chaanbean.mobile.core.ui.formatInr
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.backgroundcheck.data.BackgroundCheckModule
import com.chaanbean.mobile.feature.backgroundcheck.data.ReportCatalog
import com.chaanbean.mobile.feature.backgroundcheck.data.ReportSpec

@Composable
fun BackgroundCheckScreen(
    onOpenGatewayStatus: () -> Unit,
    onOpenGstOtp: () -> Unit,
) {
    val vm = rememberVm { RunCheckViewModel(BackgroundCheckModule.repository(it)) }
    val state by vm.state.collectAsState()
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(state.message) {
        val message = state.message
        if (message != null) {
            snackbar.showSnackbar(message)
            vm.clearMessage()
        }
    }

    val visible = ReportCatalog.inCategory(state.category)

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { vm.run() },
                text = {
                    Text(
                        when {
                            state.running -> "Running..."
                            state.selected.isEmpty() -> "Select an adapter"
                            else -> "Run ${state.selected.size} checks"
                        },
                    )
                },
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
                    "Background Check Gateway",
                    "One POST fans out across the requested adapters. Results are cached per subject " +
                        "and report type for 7 to 30 days.",
                )
            }

            item {
                CaveatBox(
                    title = "Before you read anything below",
                    text = "The verification endpoint has no authentication and every adapter runs in " +
                        "sandbox unless the matching API key is configured on the server. Most payloads " +
                        "are derived from your own ChaanBean records, not from GSTN, CIBIL, e-Courts or " +
                        "CCTNS. Each report type carries a note saying which.",
                )
            }

            item {
                SubjectCard(
                    subjectId = state.subjectId,
                    subjectType = state.subjectType,
                    selectedCount = state.selected.size,
                    onSubjectIdChange = vm::onSubjectIdChange,
                    onSubjectTypeChange = vm::onSubjectTypeChange,
                )
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    TextButton(onClick = onOpenGatewayStatus) { Text("Adapter status") }
                    TextButton(onClick = onOpenGstOtp) { Text("GST OTP flow") }
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Adapters", style = MaterialTheme.typography.titleMedium)
                    Row {
                        TextButton(onClick = { vm.selectBundle() }) {
                            Text("Bundle (${ReportCatalog.bundle.size})")
                        }
                        TextButton(onClick = { vm.clearSelection() }) { Text("Clear") }
                    }
                }
            }

            item {
                CategoryChips(
                    selected = state.category,
                    onSelect = vm::onCategoryChange,
                )
            }

            items(visible, key = { "adapter-" + it.code }) { spec ->
                AdapterSelectRow(
                    spec = spec,
                    checked = spec.code in state.selected,
                    onToggle = { vm.toggle(spec.code) },
                )
            }

            item {
                SectionHeader("Results", "Exactly what the gateway returned, field for field.")
            }

            when (val reports = state.reports) {
                null -> item {
                    EmptyBox("No run yet. The server exposes no history endpoint, so this list starts empty each session.")
                }
                is Outcome.Loading -> item { LoadingBox() }
                is Outcome.Err -> item { ErrorBox(reports.message, onRetry = { vm.run() }) }
                is Outcome.Ok -> if (reports.value.isEmpty()) {
                    item { EmptyBox("The gateway returned no reports for that request.") }
                } else {
                    items(reports.value, key = { "report-" + it.reportType }) { report ->
                        ReportCard(report, onOpenOtpFlow = onOpenGstOtp)
                    }
                }
            }

            item { Spacer(Modifier.height(80.dp)) }
        }
    }
}

@Composable
private fun SubjectCard(
    subjectId: String,
    subjectType: String,
    selectedCount: Int,
    onSubjectIdChange: (String) -> Unit,
    onSubjectTypeChange: (String) -> Unit,
) {
    ChaanCard {
        Text("Subject", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = subjectId,
            onValueChange = onSubjectIdChange,
            label = { Text("GSTIN, PAN, CIN, mobile or trade name") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(4.dp))
        Text(
            "The gateway matches this against your buyers, vendors and companies before falling " +
                "back to a synthesised entity.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(10.dp))
        SubjectTypeChips(subjectType, onSubjectTypeChange)
        Spacer(Modifier.height(10.dp))
        Text(
            "Indicative debit ${formatInr(selectedCount * 50.0)} - the server charges the wallet " +
                "ledger price per report, defaulting to ₹50, against the first company row it finds.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SubjectTypeChips(selected: String, onSelect: (String) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        FilterChip(
            selected = selected == "business",
            onClick = { onSelect("business") },
            label = { Text("Business") },
        )
        FilterChip(
            selected = selected == "individual",
            onClick = { onSelect("individual") },
            label = { Text("Individual") },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CategoryChips(selected: String, onSelect: (String) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        ReportCatalog.categories.forEach { category ->
            FilterChip(
                selected = selected == category,
                onClick = { onSelect(category) },
                label = { Text(category) },
            )
        }
    }
}

@Composable
private fun AdapterSelectRow(spec: ReportSpec, checked: Boolean, onToggle: () -> Unit) {
    ChaanCard(modifier = Modifier.clickable(onClick = onToggle)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Top,
        ) {
            Checkbox(checked = checked, onCheckedChange = { onToggle() })
            Spacer(Modifier.width(4.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    spec.label,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    "${spec.category} · cached ${spec.cacheTtlHours}h · ${spec.subjectType}",
                    style = MaterialTheme.typography.labelSmall,
                    color = Chaan.Accent,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    spec.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    "Input: ${spec.inputLabel} · e.g. ${spec.sampleId}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        if (checked) {
            Spacer(Modifier.height(10.dp))
            CaveatBox(spec.caveat)
        }
    }
}
