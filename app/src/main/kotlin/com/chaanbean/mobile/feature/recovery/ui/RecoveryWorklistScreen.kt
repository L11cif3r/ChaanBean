package com.chaanbean.mobile.feature.recovery.ui

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
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
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
import com.chaanbean.mobile.core.ui.SummaryTile
import com.chaanbean.mobile.core.ui.formatInr
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.recovery.data.RecoveryAccount
import com.chaanbean.mobile.feature.recovery.data.RecoveryModule
import com.chaanbean.mobile.feature.recovery.data.daysOverdue
import com.chaanbean.mobile.feature.recovery.data.formatServerDate

private val LEVEL_FILTERS = listOf("L1", "L2", "L3", "Resolved")

@Composable
fun RecoveryWorklistScreen(onOpenAccount: (String) -> Unit) {
    val vm = rememberVm { RecoveryWorklistViewModel(RecoveryModule.repository(it)) }
    val state by vm.state.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            SectionHeader(
                "Recovery worklist",
                "Every credit account the server monitors, ordered by exposure. " +
                    "Escalation level comes from the newest EscalationState row.",
            )
        }

        when (val outcome = state.accounts) {
            is Outcome.Loading -> item { LoadingBox() }
            is Outcome.Err -> item { ErrorBox(outcome.message, onRetry = { vm.refresh() }) }
            is Outcome.Ok -> {
                val all = outcome.value
                item { WorklistSummary(all) }
                item {
                    LevelFilterRow(
                        selected = state.levelFilter,
                        onSelect = { vm.setLevelFilter(it) },
                    )
                }
                val visible = state.levelFilter
                    ?.let { level -> all.filter { it.escalationStates.firstOrNull()?.currentLevel == level } }
                    ?: all
                if (visible.isEmpty()) {
                    item { EmptyBox("No accounts at this escalation level.") }
                } else {
                    items(visible, key = { it.id }) { account ->
                        WorklistRow(account, onClick = { onOpenAccount(account.id) })
                    }
                }
                item {
                    CaveatNote(
                        "GET /api/recovery is unauthenticated and returns every credit account in the " +
                            "database, not the ones belonging to a signed-in company. There is no " +
                            "company scoping to apply on the client.",
                    )
                }
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun WorklistSummary(accounts: List<RecoveryAccount>) {
    val exposure = accounts.sumOf { it.outstandingAmount }
    val open = accounts.count { it.outstandingAmount > 0.0 }
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        SummaryTile("Open exposure", formatInr(exposure), Chaan.Brand, Modifier.weight(1f))
        SummaryTile("Accounts owing", open.toString(), Chaan.Accent, Modifier.weight(1f))
    }
}

@Composable
private fun LevelFilterRow(selected: String?, onSelect: (String?) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        FilterButton("All", selected == null) { onSelect(null) }
        LEVEL_FILTERS.forEach { level ->
            FilterButton(level, selected == level) { onSelect(level) }
        }
    }
}

@Composable
private fun FilterButton(label: String, active: Boolean, onClick: () -> Unit) {
    if (active) {
        Button(onClick = onClick) { Text(label) }
    } else {
        OutlinedButton(onClick = onClick) { Text(label) }
    }
}

@Composable
private fun WorklistRow(account: RecoveryAccount, onClick: () -> Unit) {
    val state = account.escalationStates.firstOrNull()
    val level = state?.currentLevel
    val overdue = daysOverdue(account.dueDate)

    ChaanCard(modifier = Modifier.clickable(onClick = onClick)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    account.buyer?.name ?: "Unnamed debtor",
                    style = MaterialTheme.typography.titleMedium,
                )
                Spacer(Modifier.height(2.dp))
                MonoValue(
                    listOfNotNull(
                        account.buyer?.gstin,
                        account.buyer?.language?.uppercase(),
                    ).joinToString(" · ").ifBlank { "No GSTIN on file" },
                )
            }
            Spacer(Modifier.width(12.dp))
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    formatInr(account.outstandingAmount),
                    style = MaterialTheme.typography.titleMedium,
                    color = if (account.outstandingAmount > 0) Chaan.Brand else Chaan.Green,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(4.dp))
                StatusPill(
                    text = level ?: "NO STATE",
                    tint = levelTint(level),
                )
            }
        }
        Spacer(Modifier.height(10.dp))
        KeyValueRow("Due date", formatServerDate(account.dueDate))
        KeyValueRow(
            "Days overdue",
            overdue?.let { "$it days" } ?: "Unreadable due date",
        )
        KeyValueRow("Ledger status", account.overdueStatus)
        if (account.disputeStatus != "none") {
            KeyValueRow("Dispute", account.disputeStatus)
        }
        state?.nextActionAt?.let { KeyValueRow("Next action due", formatServerDate(it)) }
        if (state == null) {
            Spacer(Modifier.height(8.dp))
            CaveatNote(
                "No EscalationState row yet. The first policy tick creates one at L1.",
                tint = Chaan.TextMuted,
            )
        }
    }
}
