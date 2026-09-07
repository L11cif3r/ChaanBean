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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
import com.chaanbean.mobile.core.ui.SectionHeader
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.businesscheck.data.BusinessCheckModule
import com.chaanbean.mobile.feature.businesscheck.data.BusinessProfile
import com.chaanbean.mobile.feature.businesscheck.data.CreateBusinessRequest

private val FLAG_FILTERS = listOf<Pair<String, String?>>(
    "All" to null,
    "Green" to "GREEN",
    "Amber" to "AMBER",
    "Red" to "RED",
)

@Composable
fun BusinessListScreen(
    onOpenBusiness: (String) -> Unit,
    onCompare: () -> Unit,
) {
    val vm = rememberVm { BusinessListViewModel(BusinessCheckModule.repository(it)) }
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

    LaunchedEffect(state.openBusinessId) {
        val id = state.openBusinessId
        if (id != null) {
            vm.consumeOpenBusinessId()
            onOpenBusiness(id)
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showSheet = true },
                text = { Text("New business check") },
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
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Bottom,
                ) {
                    SectionHeader(
                        "Business Check",
                        "Verification and financial intelligence on the businesses you sell to.",
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(onClick = onCompare) { Text("Compare") }
                }
            }
            item { ProvenanceNote() }
            item {
                SearchAndFilters(
                    query = state.query,
                    flagFilter = state.flagFilter,
                    onQueryChange = { vm.onQueryChange(it) },
                    onFlagChange = { vm.onFlagFilterChange(it) },
                )
            }

            when (val outcome = state.businesses) {
                is Outcome.Loading -> item { LoadingBox() }
                is Outcome.Err -> item { ErrorBox(outcome.message, onRetry = { vm.refresh() }) }
                is Outcome.Ok -> {
                    val businesses = outcome.value
                    if (businesses.isEmpty()) {
                        item {
                            EmptyBox(
                                if (state.query.isBlank()) {
                                    "No business profiles yet. Start one with the button below."
                                } else {
                                    "Nothing matches \"${state.query}\"."
                                },
                            )
                        }
                    } else {
                        item {
                            Text(
                                "${businesses.size} profile(s)",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        items(businesses, key = { it.id }) { business ->
                            BusinessCard(business, onClick = { onOpenBusiness(business.id) })
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(80.dp)) }
        }
    }

    if (showSheet) {
        NewBusinessSheet(
            submitting = state.submitting,
            onDismiss = { showSheet = false },
            onSubmit = {
                vm.create(it)
                showSheet = false
            },
        )
    }
}

@Composable
private fun SearchAndFilters(
    query: String,
    flagFilter: String?,
    onQueryChange: (String) -> Unit,
    onFlagChange: (String?) -> Unit,
) {
    Column {
        OutlinedTextField(
            value = query,
            onValueChange = onQueryChange,
            label = { Text("Search name, GSTIN, CIN or PAN") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(10.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            FLAG_FILTERS.forEach { (label, value) ->
                SelectChip(
                    label = label,
                    selected = flagFilter == value,
                    onClick = { onFlagChange(value) },
                )
            }
        }
    }
}

@Composable
private fun BusinessCard(business: BusinessProfile, onClick: () -> Unit) {
    val flag = business.riskFlag
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
                    business.gstin ?: business.cin ?: business.pan ?: "No identifiers yet",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.width(12.dp))
            RiskBadge(RiskFlag.from(flag?.flag))
        }

        Spacer(Modifier.height(10.dp))
        KeyValueRow(
            "Risk score",
            if (flag == null) "Not computed" else "${flag.compositeScore.toInt()}/100",
        )
        KeyValueRow(
            "Credit exposure",
            when {
                flag == null -> EM_DASH
                flag.flag.uppercase() == "RED" -> "Blocked"
                else -> compactInr(flag.recommendedLimit)
            },
        )
        KeyValueRow("Latest revenue", compactInr(business.yearSummaries.lastOrNull()?.revenue))
        KeyValueRow(
            "On file",
            "${business.counts?.financialDocuments ?: business.financialDocuments.size} document(s), " +
                "${business.counts?.courtCases ?: business.courtCases.size} court case(s)",
        )
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SourceStatusPill(business.sourceStatus)
            Text(
                humanizeStatus(business.overallStatus),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NewBusinessSheet(
    submitting: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (CreateBusinessRequest) -> Unit,
) {
    var companyName by remember { mutableStateOf("") }
    var gstin by remember { mutableStateOf("") }
    var cin by remember { mutableStateOf("") }
    var pan by remember { mutableStateOf("") }
    var udyamNo by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
        ) {
            Text("Start a business check", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(4.dp))
            Text(
                "Only the company name is required. Every identifier you supply becomes " +
                    "one more portal lookup an operator can complete by hand.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(16.dp))
            OutlinedTextField(
                value = companyName,
                onValueChange = { companyName = it },
                label = { Text("Company name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = gstin,
                onValueChange = { gstin = it.uppercase() },
                label = { Text("GSTIN (optional)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = cin,
                onValueChange = { cin = it.uppercase() },
                label = { Text("CIN (optional)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = pan,
                onValueChange = { pan = it.uppercase() },
                label = { Text("PAN (optional)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = udyamNo,
                onValueChange = { udyamNo = it.uppercase() },
                label = { Text("Udyam number (optional)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it },
                label = { Text("Phone (optional)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(18.dp))
            Button(
                onClick = {
                    onSubmit(
                        CreateBusinessRequest(
                            companyName = companyName.trim(),
                            gstin = gstin.trim().ifBlank { null },
                            cin = cin.trim().ifBlank { null },
                            pan = pan.trim().ifBlank { null },
                            udyamNo = udyamNo.trim().ifBlank { null },
                            phone = phone.trim().ifBlank { null },
                        ),
                    )
                },
                enabled = companyName.isNotBlank() && !submitting,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (submitting) "Creating profile..." else "Create profile")
            }
            Spacer(Modifier.height(8.dp))
            Text(
                "Creating a profile opens one manual review per source. No government " +
                    "API is called.",
                style = MaterialTheme.typography.labelSmall,
                color = Chaan.Amber,
                fontWeight = FontWeight.Medium,
            )
        }
    }
}
