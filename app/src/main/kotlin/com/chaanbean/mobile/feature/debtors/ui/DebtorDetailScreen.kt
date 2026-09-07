package com.chaanbean.mobile.feature.debtors.ui

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
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
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
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.LoadingBox
import com.chaanbean.mobile.core.ui.RiskBadge
import com.chaanbean.mobile.core.ui.SectionHeader
import com.chaanbean.mobile.core.ui.StatusPill
import com.chaanbean.mobile.core.ui.formatInr
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.core.model.RiskFlag
import com.chaanbean.mobile.feature.debtors.data.BuyerDebtor
import com.chaanbean.mobile.feature.debtors.data.BuyerRiskFlag
import com.chaanbean.mobile.feature.debtors.data.CreditAccount
import com.chaanbean.mobile.feature.debtors.data.DebtorsModule
import com.chaanbean.mobile.feature.debtors.data.EscalationEvent
import com.chaanbean.mobile.feature.debtors.data.EscalationState
import com.chaanbean.mobile.feature.debtors.data.SignalBreakdown
import com.chaanbean.mobile.feature.debtors.data.ageingBucket
import com.chaanbean.mobile.feature.debtors.data.daysOverdue
import com.chaanbean.mobile.feature.debtors.data.formatDay
import com.chaanbean.mobile.feature.debtors.data.formatMinute
import com.chaanbean.mobile.feature.debtors.data.latestRisk
import com.chaanbean.mobile.feature.debtors.data.parseEscalationHistory
import com.chaanbean.mobile.feature.debtors.data.parseMobileNumbers
import com.chaanbean.mobile.feature.debtors.data.parseSignals
import com.chaanbean.mobile.feature.debtors.data.primaryAccount
import com.chaanbean.mobile.feature.debtors.data.riskFlag

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DebtorDetailScreen(buyerId: String, onBack: () -> Unit) {
    val vm = rememberVm { DebtorDetailViewModel(DebtorsModule.repository(it), buyerId) }
    val state by vm.state.collectAsState()
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
        topBar = {
            TopAppBar(
                title = { Text("Buyer dossier") },
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
            when (val outcome = state.buyer) {
                is Outcome.Loading -> item { LoadingBox() }
                is Outcome.Err -> item { ErrorBox(outcome.message, onRetry = { vm.refresh() }) }
                is Outcome.Ok -> {
                    val buyer = outcome.value
                    item { IdentityCard(buyer) }
                    item {
                        RiskCard(
                            flag = buyer.riskFlag(),
                            risk = buyer.latestRisk(),
                            refreshing = state.refreshingRisk,
                            onRefresh = { vm.refreshRisk() },
                        )
                    }
                    item { CreditAccountCard(buyer.primaryAccount()) }

                    val signals = parseSignals(buyer.latestRisk()?.signalBreakdown)
                    item { SectionHeader("Signal breakdown", "Every flag traces back to a weighted rule.") }
                    if (signals.isEmpty()) {
                        item { EmptyBox("The server sent no signal breakdown for this buyer.") }
                    } else {
                        items(signals.size) { index -> SignalCard(signals[index]) }
                    }

                    item {
                        SectionHeader(
                            "Recovery escalation",
                            "The L1 / L2 / L3 ladder recorded against this buyer's credit account.",
                        )
                    }
                    item { EscalationSection(state.escalation, onRetry = { vm.refresh() }) }
                    item { ProvenanceNote() }
                }
            }
            item { Spacer(Modifier.height(32.dp)) }
        }
    }
}

@Composable
private fun IdentityCard(buyer: BuyerDebtor) {
    ChaanCard {
        Text(buyer.name, style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(8.dp))
        KeyValueRow("GSTIN", buyer.gstin ?: "Not on file")
        KeyValueRow("PAN", buyer.pan ?: "Not on file")
        KeyValueRow("Recovery language", buyer.language.uppercase())
        buyer.contactPerson?.let { KeyValueRow("Contact", it) }
        buyer.email?.let { KeyValueRow("Email", it) }
        val mobiles = parseMobileNumbers(buyer.mobileNumbers)
        if (mobiles.isNotEmpty()) {
            KeyValueRow(
                if (mobiles.size == 1) "Mobile" else "Mobiles",
                mobiles.joinToString(", "),
            )
        }
        buyer.address?.let { KeyValueRow("Address", it) }
        KeyValueRow("On file since", formatDay(buyer.createdAt))
    }
}

@Composable
private fun RiskCard(
    flag: RiskFlag,
    risk: BuyerRiskFlag?,
    refreshing: Boolean,
    onRefresh: () -> Unit,
) {
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text("Credit risk flag", style = MaterialTheme.typography.titleMedium)
                if (risk != null) {
                    Spacer(Modifier.height(2.dp))
                    Text(
                        "Computed " + formatMinute(risk.computedAt),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.width(12.dp))
            RiskBadge(flag)
        }

        Spacer(Modifier.height(12.dp))
        if (risk == null) {
            Text(
                "No risk flag has ever been computed for this buyer.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            Text(
                "${risk.compositeScore.toInt()}/100",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
            )
            Text(
                "composite score",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(8.dp))
            KeyValueRow("Recommended limit", formatInr(risk.recommendedLimit))
            KeyValueRow("Recommended tenor", "${risk.recommendedTenor} days")
            if (flag == RiskFlag.RED) {
                Spacer(Modifier.height(8.dp))
                // Server behaviour: refreshBuyerRiskFlag skips the credit-account
                // update entirely when the flag comes back red.
                Text(
                    "Red flag: the server does not push a recommended limit onto the " +
                        "credit account, so the approved limit below stays where it was.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Chaan.Red,
                )
            }
        }

        Spacer(Modifier.height(12.dp))
        Button(onClick = onRefresh, enabled = !refreshing) {
            Text(if (refreshing) "Recomputing..." else "Recompute flag")
        }
    }
}

@Composable
private fun CreditAccountCard(account: CreditAccount?) {
    ChaanCard {
        Text("Credit account", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        if (account == null) {
            Text(
                "This buyer has no credit account, so there is no exposure, due date " +
                    "or escalation ladder to show.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            return@ChaanCard
        }

        Text(
            formatInr(account.outstandingAmount),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
        )
        Text(
            "unpaid trade invoices",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(10.dp))

        val days = account.daysOverdue()
        KeyValueRow("Approved limit", formatInr(account.creditLimit))
        KeyValueRow("Tenor", "${account.tenorDays} days")
        KeyValueRow("Due date", formatDay(account.dueDate))
        KeyValueRow(
            "Ageing",
            if (days == null || days == 0) {
                ageingBucket(days).label
            } else {
                "${ageingBucket(days).label} ($days days past due)"
            },
        )
        KeyValueRow("Penal interest", "${account.penalInterestRate}% p.a.")
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

@Composable
private fun SignalCard(signal: SignalBreakdown) {
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Text(signal.signal, style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(2.dp))
                Text(
                    signal.source,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.width(12.dp))
            Text(
                "${signal.subScore.toInt()}/${signal.maxScore.toInt()}",
                style = MaterialTheme.typography.titleMedium,
                color = subScoreTint(signal.subScore),
                fontWeight = FontWeight.Bold,
            )
        }
        Spacer(Modifier.height(6.dp))
        Text(signal.effect, style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(6.dp))
        Text(
            "Weight ${signal.weight.toInt()}% - rule ${signal.ruleId}",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun EscalationSection(outcome: Outcome<EscalationState?>, onRetry: () -> Unit) {
    when (outcome) {
        is Outcome.Loading -> LoadingBox()
        is Outcome.Err -> ErrorBox(outcome.message, onRetry = onRetry)
        is Outcome.Ok -> {
            val state = outcome.value
            if (state == null) {
                EmptyBox(
                    "No escalation has been recorded for this credit account. The " +
                        "recovery ladder starts when a tick is run against it.",
                )
            } else {
                EscalationCard(state)
            }
        }
    }
}

@Composable
private fun EscalationCard(state: EscalationState) {
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text("Current level", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(2.dp))
                Text(
                    levelDescription(state.currentLevel),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.width(12.dp))
            StatusPill(text = state.currentLevel, tint = levelTint(state.currentLevel))
        }
        Spacer(Modifier.height(10.dp))
        KeyValueRow("Next action due", formatMinute(state.nextActionAt))
        KeyValueRow("Last updated", formatMinute(state.updatedAt))
    }

    val history = parseEscalationHistory(state.history)
    Spacer(Modifier.height(12.dp))
    if (history.isEmpty()) {
        EmptyBox("The escalation state carries no history entries.")
    } else {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            // Newest first: the server appends, so the list arrives oldest first.
            history.asReversed().forEach { HistoryCard(it) }
        }
    }
}

@Composable
private fun HistoryCard(event: EscalationEvent) {
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    event.action.replace('_', ' ').replaceFirstChar { it.uppercase() },
                    style = MaterialTheme.typography.titleSmall,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    formatMinute(event.at),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.width(12.dp))
            StatusPill(text = event.level, tint = levelTint(event.level))
        }
        Spacer(Modifier.height(8.dp))
        KeyValueRow("Channel", event.channel.replace('_', ' '))
        event.ruleId?.let { KeyValueRow("Rule", it) }
        event.govReferenceId?.let { KeyValueRow("Gov reference", it) }
        event.callStatus?.let { status ->
            val duration = event.durationSec
            KeyValueRow(
                "Call outcome",
                if (duration != null) "$status, ${duration}s" else status,
            )
        }
        event.contentHash?.let { KeyValueRow("Content hash", it) }
        event.explanation?.let {
            Spacer(Modifier.height(6.dp))
            Text(it, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

/**
 * The scoring inputs are produced by the server's verification gateway, which runs
 * its adapters in sandbox mode against records the platform already holds. Saying
 * so here keeps the dossier from reading like an external bureau pull.
 */
@Composable
private fun ProvenanceNote() {
    ChaanCard {
        Text("Where these numbers come from", style = MaterialTheme.typography.titleSmall)
        Spacer(Modifier.height(6.dp))
        Text(
            "The composite score and its signals are computed by a deterministic " +
                "rules engine on the server. Its inputs come from verification " +
                "adapters that, on this deployment, answer in sandbox mode from the " +
                "platform's own database rather than from live GST, bureau or court " +
                "sources. Nothing on this screen is independently verified.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

private fun levelTint(level: String) = when (level.uppercase()) {
    "L3" -> Chaan.Red
    "L2" -> Chaan.Amber
    else -> Chaan.Accent
}

private fun levelDescription(level: String) = when (level.uppercase()) {
    "L1" -> "Courtesy reminders on messaging channels."
    "L2" -> "Firm reminders, including recorded voice calls."
    "L3" -> "Legal notice and arbitration track."
    else -> "Unrecognised escalation level."
}

private fun subScoreTint(subScore: Double) = when {
    subScore >= 75.0 -> Chaan.Green
    subScore >= 45.0 -> Chaan.Amber
    else -> Chaan.Red
}
