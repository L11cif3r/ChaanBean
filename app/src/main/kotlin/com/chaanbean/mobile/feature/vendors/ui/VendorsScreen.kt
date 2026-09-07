package com.chaanbean.mobile.feature.vendors.ui

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
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.vendors.data.CreateVendorRequest
import com.chaanbean.mobile.feature.vendors.data.Vendor
import com.chaanbean.mobile.feature.vendors.data.VendorsModule

@Composable
fun VendorsScreen() {
    val vm = rememberVm { VendorsViewModel(VendorsModule.repository(it)) }
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
                text = { Text("Onboard vendor") },
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
                    "Vendor Trust Registry",
                    "Suppliers onboarded to your network, each with a ChaanBean Trust ID.",
                )
            }
            when (val v = state.vendors) {
                is Outcome.Loading -> item { LoadingBox() }
                is Outcome.Err -> item { ErrorBox(v.message, onRetry = { vm.refresh() }) }
                is Outcome.Ok -> {
                    if (v.value.isEmpty()) {
                        item { EmptyBox("No vendors onboarded yet.") }
                    } else {
                        items(v.value, key = { it.id }) { VendorRow(it) }
                    }
                }
            }
            item { Spacer(Modifier.height(80.dp)) }
        }
    }

    if (showSheet) {
        OnboardVendorSheet(
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
private fun VendorRow(vendor: Vendor) {
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(vendor.name, style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(2.dp))
                Text(
                    vendor.vendorTrustId,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            TrustScore(vendor.trustScore)
        }
        Spacer(Modifier.height(10.dp))
        KeyValueRow("Category", vendor.category)
        vendor.gstin?.let { KeyValueRow("GSTIN", it) }
        vendor.pan?.let { KeyValueRow("PAN", it) }
        vendor.turnoverRange?.let { KeyValueRow("Turnover", it) }
        Spacer(Modifier.height(8.dp))
        StatusPill(
            text = vendor.kycStatus.uppercase(),
            tint = if (vendor.kycStatus == "verified") Chaan.Green else Chaan.Amber,
        )
    }
}

@Composable
private fun TrustScore(score: Int) {
    val tint = when {
        score >= 90 -> Chaan.Green
        score >= 75 -> Chaan.Amber
        else -> Chaan.Red
    }
    Column(horizontalAlignment = Alignment.End) {
        Text(
            score.toString(),
            style = MaterialTheme.typography.headlineMedium,
            color = tint,
            fontWeight = FontWeight.Bold,
        )
        Text(
            "TRUST",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun OnboardVendorSheet(
    submitting: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (CreateVendorRequest) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var pan by remember { mutableStateOf("") }
    var gstin by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("Raw Materials") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
        ) {
            Text("Onboard a vendor", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(4.dp))
            Text(
                "A Trust ID is issued on submission. Supplying both PAN and GSTIN raises the initial trust score.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(16.dp))
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Vendor name") },
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
                value = gstin,
                onValueChange = { gstin = it },
                label = { Text("GSTIN (optional)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = category,
                onValueChange = { category = it },
                label = { Text("Category") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(18.dp))
            Button(
                onClick = {
                    onSubmit(
                        CreateVendorRequest(
                            name = name.trim(),
                            pan = pan.trim().ifBlank { null },
                            gstin = gstin.trim().ifBlank { null },
                            category = category.trim().ifBlank { "Raw Materials" },
                        ),
                    )
                },
                enabled = name.isNotBlank() && !submitting,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (submitting) "Submitting..." else "Issue Trust ID")
            }
        }
    }
}
