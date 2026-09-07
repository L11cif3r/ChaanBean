package com.chaanbean.mobile.feature.admingrowth.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
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
import com.chaanbean.mobile.core.ui.SummaryTile
import com.chaanbean.mobile.core.ui.formatInr
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.admingrowth.data.AdminGrowthModule
import com.chaanbean.mobile.feature.admingrowth.data.AdminUser
import com.chaanbean.mobile.feature.admingrowth.data.CreateDealRequest
import com.chaanbean.mobile.feature.admingrowth.data.CreateLeadRequest
import com.chaanbean.mobile.feature.admingrowth.data.Deal
import com.chaanbean.mobile.feature.admingrowth.data.Lead
import com.chaanbean.mobile.feature.admingrowth.data.PipelineMetrics
import com.chaanbean.mobile.feature.admingrowth.data.PipelineStage

/**
 * The web build shows all seven stages side by side as a kanban. On a phone the
 * columns become a stage strip: pick a stage, work the deals in it, and move a
 * deal with the same `move_stage` POST the board uses.
 */
@Composable
fun PipelineScreen() {
    val vm = rememberVm { PipelineViewModel(AdminGrowthModule.repository(it)) }
    val state by vm.state.collectAsState()
    val snackbar = remember { SnackbarHostState() }
    var showNewDeal by remember { mutableStateOf(false) }
    var showNewLead by remember { mutableStateOf(false) }

    LaunchedEffect(state.message) {
        val message = state.message
        if (message != null) {
            snackbar.showSnackbar(message)
            vm.clearMessage()
        }
    }

    val stages = state.stages
    val stage = state.selectedStage

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        floatingActionButton = {
            if (stage != null) {
                ExtendedFloatingActionButton(
                    onClick = { showNewDeal = true },
                    text = { Text("New deal") },
                    icon = {},
                )
            }
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
                    "Sales Pipeline",
                    "Every stage move is written back through /api/admin/pipeline and logged as a sales activity.",
                )
            }
            item { OpenEndpointNotice(onCaptureLead = { showNewLead = true }) }

            when (val data = state.data) {
                is Outcome.Loading -> item { LoadingBox() }
                is Outcome.Err -> item { ErrorBox(data.message, onRetry = { vm.refresh() }) }
                is Outcome.Ok -> {
                    item { MetricsStrip(data.value.metrics) }
                    item {
                        StageStrip(
                            stages = stages,
                            selectedId = stage?.id,
                            onSelect = { vm.selectStage(it) },
                        )
                    }
                    if (stage == null) {
                        item { EmptyBox("The server returned no pipeline stages.") }
                    } else {
                        item { StageSummary(stage) }
                        if (stage.deals.isEmpty()) {
                            item { EmptyBox("No deals sitting in ${stage.name}.") }
                        } else {
                            items(stage.deals, key = { it.id }) { deal ->
                                DealCard(deal = deal, onClick = { vm.openDeal(deal.id) })
                            }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(96.dp)) }
        }
    }

    val openDeal = state.openDeal
    if (openDeal != null) {
        DealSheet(
            deal = openDeal,
            stages = stages,
            busy = state.busy,
            onDismiss = { vm.closeDeal() },
            onMove = { stageId, reason -> vm.moveDeal(openDeal.id, stageId, reason) },
            onConvert = { plan -> vm.convertToCompany(openDeal.id, plan) },
            onAddNote = { note -> vm.addNote(openDeal.id, openDeal.leadId, note) },
        )
    }

    if (showNewDeal && stage != null) {
        NewDealSheet(
            stage = stage,
            leads = state.response?.leads.orEmpty(),
            users = state.response?.users.orEmpty(),
            busy = state.busy,
            onDismiss = { showNewDeal = false },
            onSubmit = {
                vm.createDeal(it)
                showNewDeal = false
            },
        )
    }

    if (showNewLead) {
        NewLeadSheet(
            users = state.response?.users.orEmpty(),
            busy = state.busy,
            onDismiss = { showNewLead = false },
            onSubmit = {
                vm.createLead(it)
                showNewLead = false
            },
        )
    }
}

@Composable
private fun OpenEndpointNotice(onCaptureLead: () -> Unit) {
    ChaanCard {
        Text("Unauthenticated admin endpoint", style = MaterialTheme.typography.titleSmall)
        Spacer(Modifier.height(4.dp))
        Text(
            "The server checks no session or role on /api/admin/pipeline. Anything visible here, " +
                "and every move made from here, is open to any client that can reach the API.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(8.dp))
        TextButton(onClick = onCaptureLead) { Text("Capture a lead") }
    }
}

@Composable
private fun MetricsStrip(metrics: PipelineMetrics) {
    Column {
        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                SummaryTile(
                    "Pipeline value",
                    formatInr(metrics.totalPipelineValue),
                    modifier = Modifier.width(210.dp),
                )
            }
            item {
                SummaryTile(
                    "Weighted",
                    formatInr(metrics.weightedPipelineValue),
                    tint = Chaan.Accent,
                    modifier = Modifier.width(210.dp),
                )
            }
            item {
                SummaryTile(
                    "Open deals",
                    metrics.totalDealsCount.toString(),
                    modifier = Modifier.width(160.dp),
                )
            }
            item {
                SummaryTile(
                    "Win rate",
                    "${metrics.winRate}%",
                    tint = Chaan.Green,
                    modifier = Modifier.width(160.dp),
                )
            }
            item {
                SummaryTile(
                    "Avg deal size",
                    formatInr(metrics.avgDealSize),
                    modifier = Modifier.width(210.dp),
                )
            }
        }
        if (metrics.wonDealsCount + metrics.lostDealsCount == 0) {
            Spacer(Modifier.height(6.dp))
            Text(
                "Win rate is the server's hardcoded 65% fallback: nothing has reached Won or Lost yet.",
                style = MaterialTheme.typography.bodySmall,
                color = Chaan.Amber,
            )
        }
    }
}

@Composable
private fun StageStrip(
    stages: List<PipelineStage>,
    selectedId: String?,
    onSelect: (String) -> Unit,
) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(stages, key = { it.id }) { stage ->
            val tint = stageColor(stage.color, MaterialTheme.colorScheme.onSurfaceVariant)
            val selected = stage.id == selectedId
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(
                        if (selected) tint.copy(alpha = 0.20f)
                        else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                    )
                    .clickable { onSelect(stage.id) }
                    .padding(horizontal = 14.dp, vertical = 9.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier
                        .size(8.dp)
                        .clip(RoundedCornerShape(999.dp))
                        .background(tint),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    stage.name,
                    style = MaterialTheme.typography.labelLarge,
                    color = if (selected) tint else MaterialTheme.colorScheme.onSurface,
                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    stage.deals.size.toString(),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun StageSummary(stage: PipelineStage) {
    val value = stage.deals.sumOf { it.value }
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            "Stage ${stage.order} · ${stage.name}",
            style = MaterialTheme.typography.titleMedium,
        )
        Text(
            "${stage.deals.size} deals · ${formatInr(value)}",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun DealCard(deal: Deal, onClick: () -> Unit) {
    ChaanCard(modifier = Modifier.clickable { onClick() }) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    deal.title,
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                val subtitle = deal.lead?.companyName ?: deal.company?.name
                if (subtitle != null) {
                    Spacer(Modifier.height(2.dp))
                    Text(
                        subtitle,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.width(12.dp))
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    formatInr(deal.value),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    "${deal.probability}% likely",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            val stageName = deal.stage?.name
            if (stageName != null) {
                StatusPill(
                    text = stageName.uppercase(),
                    tint = stageColor(deal.stage?.color, Chaan.Accent),
                )
                Spacer(Modifier.width(8.dp))
            }
            if (deal.companyId != null) {
                StatusPill(text = "CUSTOMER", tint = Chaan.Green)
                Spacer(Modifier.width(8.dp))
            }
            Text(
                "Moved ${shortDate(deal.stageUpdatedAt)}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        val owner = deal.owner?.name
        if (owner != null) {
            Spacer(Modifier.height(8.dp))
            Text(
                "Owner: $owner",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DealSheet(
    deal: Deal,
    stages: List<PipelineStage>,
    busy: Boolean,
    onDismiss: () -> Unit,
    onMove: (String, String?) -> Unit,
    onConvert: (String) -> Unit,
    onAddNote: (String) -> Unit,
) {
    var reason by remember(deal.id) { mutableStateOf(deal.winLossReason.orEmpty()) }
    var note by remember(deal.id) { mutableStateOf("") }
    var plan by remember(deal.id) { mutableStateOf(deal.company?.plan ?: "growth") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .heightIn(max = 620.dp)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
        ) {
            Text(deal.title, style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))
            val stageName = deal.stage?.name
            if (stageName != null) {
                StatusPill(
                    text = stageName.uppercase(),
                    tint = stageColor(deal.stage?.color, Chaan.Accent),
                )
            }
            Spacer(Modifier.height(14.dp))

            KeyValueRow("Deal value", formatInr(deal.value))
            KeyValueRow("Probability", "${deal.probability}%")
            KeyValueRow("Owner", deal.owner?.name ?: "Unassigned")
            deal.lead?.let { lead ->
                KeyValueRow("Lead", "${lead.name} · ${lead.companyName}")
                KeyValueRow("Contact", lead.email)
                KeyValueRow("Phone", lead.phone)
                KeyValueRow("Lead source", prettyLabel(lead.source))
            }
            KeyValueRow("Stage updated", shortDate(deal.stageUpdatedAt))
            KeyValueRow("Created", shortDate(deal.createdAt))
            if (deal.closedAt != null) KeyValueRow("Closed", shortDate(deal.closedAt))
            if (!deal.winLossReason.isNullOrBlank()) {
                KeyValueRow("Win/loss reason", deal.winLossReason.orEmpty())
            }
            Spacer(Modifier.height(6.dp))
            Text(
                "Probability is not editable per deal: the server recomputes it from the stage name " +
                    "on every move (Won 100, Lost 0, Negotiation 80, Proposal Sent 60, anything else 40).",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            deal.company?.let { company ->
                Spacer(Modifier.height(16.dp))
                Text("Linked customer", style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(6.dp))
                KeyValueRow("Company", company.name)
                KeyValueRow("Plan", company.plan)
                KeyValueRow("Wallet", formatInr(company.walletBalance))
                KeyValueRow("KYC status", company.kycStatus)
                Spacer(Modifier.height(4.dp))
                Text(
                    "Plan, wallet and KYC status are set to fixed values by the conversion handler, " +
                        "not verified against anything.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Spacer(Modifier.height(18.dp))
            Text("Move to stage", style = MaterialTheme.typography.titleSmall)
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = reason,
                onValueChange = { reason = it },
                label = { Text("Win/loss reason (optional)") },
                singleLine = true,
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(stages, key = { it.id }) { target ->
                    val tint = stageColor(target.color, MaterialTheme.colorScheme.onSurfaceVariant)
                    val current = target.id == deal.stageId
                    Text(
                        text = target.name,
                        style = MaterialTheme.typography.labelLarge,
                        color = if (current) MaterialTheme.colorScheme.onSurfaceVariant else tint,
                        modifier = Modifier
                            .clip(RoundedCornerShape(999.dp))
                            .background(tint.copy(alpha = if (current) 0.08f else 0.18f))
                            .clickable(enabled = !busy && !current) {
                                onMove(target.id, reason.trim().ifBlank { null })
                            }
                            .padding(horizontal = 14.dp, vertical = 9.dp),
                    )
                }
            }
            Spacer(Modifier.height(6.dp))
            Text(
                "The reason is stored on the deal for every move, not only for Won and Lost.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            if (deal.stage?.name == "Won" && deal.companyId == null) {
                Spacer(Modifier.height(18.dp))
                Text("Provision a customer company", style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(6.dp))
                Text(
                    "Creates a live Company from this deal on a ₹2,00,000 opening wallet and marks " +
                        "its KYC verified without running any check.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(10.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(listOf("starter", "growth", "enterprise")) { option ->
                        ChoicePill(
                            label = prettyLabel(option),
                            selected = plan == option,
                            onClick = { plan = option },
                        )
                    }
                }
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = { onConvert(plan) },
                    enabled = !busy,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (busy) "Working..." else "Convert to customer")
                }
            }

            Spacer(Modifier.height(18.dp))
            Text("Recent activity", style = MaterialTheme.typography.titleSmall)
            Spacer(Modifier.height(6.dp))
            if (deal.activities.isEmpty()) {
                Text(
                    "Nothing logged against this deal yet.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                deal.activities.forEach { activity ->
                    Column(Modifier.padding(vertical = 6.dp)) {
                        Text(
                            "${prettyLabel(activity.type)} · ${shortDate(activity.createdAt)}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(activity.description, style = MaterialTheme.typography.bodySmall)
                    }
                }
                Text(
                    "The endpoint returns only the five most recent activities per deal.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = note,
                onValueChange = { note = it },
                label = { Text("Log a note") },
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedButton(
                onClick = {
                    onAddNote(note.trim())
                    note = ""
                },
                enabled = !busy && note.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Add activity")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NewDealSheet(
    stage: PipelineStage,
    leads: List<Lead>,
    users: List<AdminUser>,
    busy: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (CreateDealRequest) -> Unit,
) {
    var title by remember { mutableStateOf("") }
    var value by remember { mutableStateOf("350000") }
    var probability by remember { mutableStateOf("50") }
    var leadId by remember { mutableStateOf<String?>(null) }
    var ownerId by remember { mutableStateOf(users.firstOrNull()?.id) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .heightIn(max = 620.dp)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
        ) {
            Text("New deal in ${stage.name}", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(4.dp))
            Text(
                "The deal lands in the stage selected on the board. Probability is honoured only on " +
                    "creation; the next stage move overwrites it.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(16.dp))
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Deal title") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = value,
                onValueChange = { value = it },
                label = { Text("Annual contract value (₹)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = probability,
                onValueChange = { probability = it },
                label = { Text("Probability %") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )

            if (leads.isNotEmpty()) {
                Spacer(Modifier.height(16.dp))
                Text("Link a lead (optional)", style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(8.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(leads, key = { it.id }) { lead ->
                        ChoicePill(
                            label = lead.companyName,
                            selected = leadId == lead.id,
                            onClick = { leadId = if (leadId == lead.id) null else lead.id },
                        )
                    }
                }
                Spacer(Modifier.height(6.dp))
                Text(
                    "The endpoint returns only the 20 most recent leads, so older ones cannot be linked here.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            if (users.isNotEmpty()) {
                Spacer(Modifier.height(16.dp))
                Text("Owner", style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(8.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(users, key = { it.id }) { user ->
                        ChoicePill(
                            label = user.name,
                            selected = ownerId == user.id,
                            onClick = { ownerId = user.id },
                        )
                    }
                }
            }

            Spacer(Modifier.height(18.dp))
            Button(
                onClick = {
                    onSubmit(
                        CreateDealRequest(
                            title = title.trim(),
                            value = value.trim().toDoubleOrNull() ?: 0.0,
                            probability = probability.trim().toIntOrNull() ?: 50,
                            stageId = stage.id,
                            leadId = leadId,
                            ownerId = ownerId,
                        ),
                    )
                },
                enabled = title.isNotBlank() && !busy,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (busy) "Working..." else "Create deal")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NewLeadSheet(
    users: List<AdminUser>,
    busy: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (CreateLeadRequest) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var companyName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var source by remember { mutableStateOf("organic") }
    var assignedTo by remember { mutableStateOf(users.firstOrNull()?.id) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .heightIn(max = 620.dp)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
        ) {
            Text("Capture a lead", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(4.dp))
            Text(
                "Attribution is recorded only if a marketing channel with exactly this source name " +
                    "already exists on the server; otherwise the lead is saved unattributed and never " +
                    "appears in the marketing report.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(16.dp))
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Contact name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = companyName,
                onValueChange = { companyName = it },
                label = { Text("Company name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it },
                label = { Text("Phone") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(16.dp))
            Text("Source", style = MaterialTheme.typography.titleSmall)
            Spacer(Modifier.height(8.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(SEEDED_CHANNELS) { option ->
                    ChoicePill(
                        label = prettyLabel(option),
                        selected = source == option,
                        onClick = { source = option },
                    )
                }
            }
            if (users.isNotEmpty()) {
                Spacer(Modifier.height(16.dp))
                Text("Assign to", style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(8.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(users, key = { it.id }) { user ->
                        ChoicePill(
                            label = user.name,
                            selected = assignedTo == user.id,
                            onClick = { assignedTo = user.id },
                        )
                    }
                }
            }
            Spacer(Modifier.height(18.dp))
            Button(
                onClick = {
                    onSubmit(
                        CreateLeadRequest(
                            name = name.trim(),
                            companyName = companyName.trim(),
                            email = email.trim(),
                            phone = phone.trim(),
                            source = source,
                            assignedTo = assignedTo,
                        ),
                    )
                },
                enabled = name.isNotBlank() && companyName.isNotBlank() && !busy,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (busy) "Working..." else "Save lead")
            }
        }
    }
}

@Composable
private fun ChoicePill(label: String, selected: Boolean, onClick: () -> Unit) {
    val tint: Color = if (selected) Chaan.Accent else MaterialTheme.colorScheme.onSurfaceVariant
    Text(
        text = label,
        style = MaterialTheme.typography.labelLarge,
        color = tint,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(tint.copy(alpha = if (selected) 0.20f else 0.10f))
            .clickable { onClick() }
            .padding(horizontal = 14.dp, vertical = 9.dp),
    )
}

/** The channel names main's seed creates; anything else saves without attribution. */
private val SEEDED_CHANNELS = listOf(
    "organic",
    "referral",
    "paid_search",
    "whatsapp_inbound",
    "direct",
    "partner",
    "trust_hub_referral",
)
