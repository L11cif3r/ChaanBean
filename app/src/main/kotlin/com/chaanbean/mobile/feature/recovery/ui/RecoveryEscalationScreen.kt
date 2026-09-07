package com.chaanbean.mobile.feature.recovery.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.di.LocalAppContainer
import com.chaanbean.mobile.core.ui.ErrorBox
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.LoadingBox
import com.chaanbean.mobile.core.ui.SectionHeader
import com.chaanbean.mobile.core.ui.StatusPill
import com.chaanbean.mobile.core.ui.formatInr
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.recovery.data.EscalationHistoryEntry
import com.chaanbean.mobile.feature.recovery.data.RecoveryAction
import com.chaanbean.mobile.feature.recovery.data.RecoveryActionResponse
import com.chaanbean.mobile.feature.recovery.data.RecoveryDetail
import com.chaanbean.mobile.feature.recovery.data.RecoveryModule
import com.chaanbean.mobile.feature.recovery.data.StatutoryInterest
import com.chaanbean.mobile.feature.recovery.data.VoiceCallPreview
import com.chaanbean.mobile.feature.recovery.data.daysOverdue
import com.chaanbean.mobile.feature.recovery.data.formatServerDate
import com.chaanbean.mobile.feature.recovery.data.formatServerDateTime

/**
 * The published ladder, transcribed from evaluatePolicy() in
 * src/lib/policy-engine/index.ts. It is documentation of the deployed rules,
 * not a prediction: only the server decides which rule fires next.
 */
private data class LadderStage(
    val level: String,
    val ruleId: String,
    val title: String,
    val trigger: String,
    val behaviour: String,
)

private val LADDER = listOf(
    LadderStage(
        level = "L1",
        ruleId = "POL-L1-001",
        title = "Polite reminder",
        trigger = "Under 30 days overdue and fewer than 4 L1 attempts.",
        behaviour = "Channel rotates WhatsApp → Email → SMS by attempt count. " +
            "Next tick is scheduled in 24h when the balance is above ₹5,00,000, otherwise 72h.",
    ),
    LadderStage(
        level = "L2",
        ruleId = "POL-L2-001",
        title = "Firm multi-channel engagement",
        trigger = "30+ days overdue, or 4 or more L1 attempts.",
        behaviour = "Channel rotates Voice → WhatsApp → Email → SMS by L2 attempt count. " +
            "Voice attempts are checked against the 09:00–18:00 IST window, a 2-call daily " +
            "cap and a 3-hour cool-off. Next tick in 48h.",
    ),
    LadderStage(
        level = "L3",
        ruleId = "POL-L3-NOTICE-001",
        title = "Statutory demand notice",
        trigger = "90+ days overdue, or 60+ days with 3 or more L2 attempts, and no notice served yet.",
        behaviour = "Creates a LegalNotice row with a reference id of the form " +
            "IT-GST-<date>-<hash>. That id is generated locally; nothing is filed with " +
            "the Income Tax or GST portal.",
    ),
    LadderStage(
        level = "L3",
        ruleId = "POL-L3-ARB-001",
        title = "In-house arbitration",
        trigger = "Same thresholds, once a legal notice already exists.",
        behaviour = "Opens an ArbitrationCase at the MSMED §16 statutory rate with the " +
            "accrued compound interest as the claim amount. Next tick in 48h.",
    ),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecoveryEscalationScreen(
    creditAccountId: String,
    onBack: () -> Unit,
    onRecordSettlement: (String) -> Unit,
) {
    val vm = rememberVm {
        RecoveryEscalationViewModel(RecoveryModule.repository(it), creditAccountId)
    }
    val state by vm.state.collectAsState()
    val snackbar = remember { SnackbarHostState() }
    val container = LocalAppContainer.current
    var previewVoice by remember { mutableStateOf<VoiceCallPreview?>(null) }

    previewVoice?.let { voice ->
        VoiceAnnouncementSheet(
            debtorName = voice.templateId,
            languageCode = voice.language,
            script = voice.scriptText,
            audioStreamUrl = voice.contentHash
                .takeIf { it.isNotBlank() }
                ?.let { RecoveryModule.repository(container).audioStreamUrl(it) },
            onDismiss = { previewVoice = null },
        )
    }

    LaunchedEffect(state.message) {
        val message = state.message
        if (message != null) {
            snackbar.showSnackbar(message)
            vm.clearMessage()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Escalation ladder") },
                navigationIcon = { TextButton(onClick = onBack) { Text("Back") } },
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            when (val outcome = state.detail) {
                is Outcome.Loading -> item { LoadingBox() }
                is Outcome.Err -> item { ErrorBox(outcome.message, onRetry = { vm.refresh() }) }
                is Outcome.Ok -> {
                    val detail = outcome.value
                    item { AccountHeader(detail) }
                    item {
                        ActionPanel(
                            running = state.running,
                            onRun = { vm.run(it) },
                            onRecordSettlement = { onRecordSettlement(creditAccountId) },
                        )
                    }
                    state.lastOutcome?.let { last ->
                        item { LastOutcomeCard(last, state.lastAction) }
                    }
                    item { SectionHeader("Policy ladder", "Deterministic rules — no model decides the level.") }
                    items(LADDER.size) { index ->
                        LadderCard(LADDER[index], detail.account.currentLevel)
                    }
                    item {
                        CaveatNote(
                            "The web dashboard advertises day bands of 1–15 / 16–30 / 31–45 / 45+. " +
                                "The policy engine actually deployed uses the 30 / 60 / 90 day " +
                                "thresholds shown above. The thresholds above are the ones in code.",
                        )
                    }
                    detail.statutoryInterest?.let { item { StatutoryInterestCard(it) } }
                    detail.voiceCall?.let { v -> item { VoiceScriptCard(v, onPreview = { previewVoice = v }) } }
                    item { SectionHeader("Escalation history", "Appended by the server on every action.") }
                    if (!detail.historyAvailable) {
                        item {
                            CaveatNote(
                                "History could not be loaded. The detail endpoint returns only the " +
                                    "current level, so the timeline is read from the list endpoint, " +
                                    "and that request failed.",
                                tint = Chaan.Red,
                            )
                        }
                    } else if (detail.history.isEmpty()) {
                        item {
                            CaveatNote(
                                "No recorded actions yet.",
                                tint = Chaan.TextMuted,
                            )
                        }
                    } else {
                        items(detail.history.size) { index ->
                            val reversed = detail.history[detail.history.size - 1 - index]
                            HistoryCard(reversed)
                        }
                    }
                    item { Spacer(Modifier.height(24.dp)) }
                }
            }
        }
    }
}

@Composable
private fun AccountHeader(detail: RecoveryDetail) {
    val account = detail.account
    val overdue = daysOverdue(account.dueDate)
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Text(account.buyerName, style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(2.dp))
                MonoValue("${account.phone} · ${account.language.uppercase()}")
            }
            Spacer(Modifier.width(12.dp))
            StatusPill(account.currentLevel, levelTint(account.currentLevel))
        }
        Spacer(Modifier.height(12.dp))
        KeyValueRow("Outstanding", formatInr(account.outstandingAmount))
        KeyValueRow("Due date", formatServerDate(account.dueDate))
        KeyValueRow("Days overdue", overdue?.let { "$it days" } ?: "Unreadable due date")
        KeyValueRow("Ledger status", account.status)
        account.email?.let { KeyValueRow("Email", it) }
        detail.nextActionAt?.let { KeyValueRow("Next action due", formatServerDateTime(it)) }
    }
}

@Composable
private fun ActionPanel(
    running: RecoveryAction?,
    onRun: (RecoveryAction) -> Unit,
    onRecordSettlement: () -> Unit,
) {
    ChaanCard {
        Text("Trigger recovery", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(4.dp))
        Text(
            "Each of these posts to /api/recovery and writes an escalation entry immediately. " +
                "There is no confirmation step on the server and no way to undo an entry.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(12.dp))
        RecoveryAction.entries.forEach { action ->
            Button(
                onClick = { onRun(action) },
                enabled = running == null,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (running == action) "Running…" else action.label)
            }
            Spacer(Modifier.height(8.dp))
        }
        OutlinedButton(onClick = onRecordSettlement, modifier = Modifier.fillMaxWidth()) {
            Text("Record a settlement")
        }
        Spacer(Modifier.height(12.dp))
        CaveatNote(
            "\"Place L2 voice announcement\" does not dial anyone. The server derives the call " +
                "outcome, duration and SIP session id from a digit sum of the phone number, then " +
                "writes a Call row as if it had happened. It also skips the TRAI calling-window " +
                "and frequency-cap check that the policy tick applies.",
        )
    }
}

@Composable
private fun LastOutcomeCard(response: RecoveryActionResponse, action: RecoveryAction?) {
    ChaanCard {
        Text(
            "Last action" + (action?.let { " · ${it.label}" } ?: ""),
            style = MaterialTheme.typography.titleMedium,
        )
        Spacer(Modifier.height(6.dp))
        response.message?.let {
            Text(it, style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(8.dp))
        }
        response.result?.let { tick ->
            KeyValueRow("Rule", tick.ruleId.ifBlank { "—" })
            KeyValueRow("Level", tick.level.ifBlank { "—" })
            KeyValueRow("Channel", channelLabel(tick.channel))
            if (tick.explanation.isNotBlank()) {
                Spacer(Modifier.height(6.dp))
                Text(
                    tick.explanation,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            tick.govReferenceId?.let { KeyValueRow("Reference id", it) }
            if (tick.contentHash.isNotBlank()) {
                Spacer(Modifier.height(6.dp))
                MonoValue("SHA-256 ${tick.contentHash.take(24)}…")
            }
            tick.skippedReason?.let {
                Spacer(Modifier.height(10.dp))
                CaveatNote("Skipped by policy: $it", tint = Chaan.Amber)
            }
        }
        response.callResult?.let { call ->
            KeyValueRow("Call status", call.status)
            KeyValueRow("Duration", "${call.durationSec}s")
            KeyValueRow("SIP session", call.sipSessionId)
            KeyValueRow("Carrier", call.carrier)
            call.sipHeaders["SIP-Status"]?.let { KeyValueRow("SIP response", it) }
            Spacer(Modifier.height(10.dp))
            CaveatNote(
                "These SIP headers are string literals assembled in the request handler. " +
                    "No call was placed and no carrier acknowledged anything.",
            )
        }
        response.govReferenceId?.let {
            KeyValueRow("Gov reference id", it)
            Spacer(Modifier.height(10.dp))
            CaveatNote(
                "Generated locally as IT-GST-<date>-<hash>. Nothing was filed with the " +
                    "Income Tax or GST portal, and no notice was posted or emailed.",
            )
        }
    }
}

@Composable
private fun LadderCard(stage: LadderStage, currentLevel: String) {
    val active = stage.level.equals(currentLevel, ignoreCase = true)
    val tint = levelTint(stage.level)
    ChaanCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(10.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(if (active) tint else Chaan.TextMuted.copy(alpha = 0.4f)),
            )
            Spacer(Modifier.width(10.dp))
            Text(
                "${stage.level} · ${stage.title}",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = if (active) FontWeight.Bold else FontWeight.Medium,
            )
        }
        Spacer(Modifier.height(6.dp))
        MonoValue(stage.ruleId)
        Spacer(Modifier.height(8.dp))
        Text(stage.trigger, style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(4.dp))
        Text(
            stage.behaviour,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (active) {
            Spacer(Modifier.height(8.dp))
            StatusPill("CURRENT LEVEL", tint)
        }
    }
}

@Composable
private fun StatutoryInterestCard(interest: StatutoryInterest) {
    ChaanCard {
        Text("Statutory penal interest", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(2.dp))
        Text(
            interest.statutorySection,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(10.dp))
        KeyValueRow("Principal", formatInr(interest.principalAmount))
        KeyValueRow("Accrued interest", formatInr(interest.accruedInterest))
        KeyValueRow("Total payable", formatInr(interest.totalPayable))
        KeyValueRow(
            "Statutory rate",
            "${interest.statutoryRatePercent}% p.a. (${interest.multiplicationFactor}× RBI ${interest.rbiBaseRatePercent}%)",
        )
        KeyValueRow("Days overdue", "${interest.daysOverdue}")
        KeyValueRow("Monthly rests", "${interest.compoundingPeriodsMonths}")
        Spacer(Modifier.height(8.dp))
        MonoValue(interest.legalFormula)
        Spacer(Modifier.height(10.dp))
        CaveatNote(
            "The RBI Bank Rate is hardcoded at 6.75% in the server's interest calculator. " +
                "It is not fetched from any RBI source, so this figure is only as current as that constant.",
            tint = Chaan.TextMuted,
        )
    }
}

@Composable
private fun VoiceScriptCard(voice: VoiceCallPreview, onPreview: () -> Unit) {
    ChaanCard {
        Text("Voice announcement script", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        KeyValueRow("Template", voice.templateId)
        KeyValueRow("Language", voice.language.uppercase())
        voice.voiceConfig?.let {
            KeyValueRow("Voice", "${it.voiceId} (${it.languageCode}, ${it.engine})")
        }
        Spacer(Modifier.height(10.dp))
        Text(
            voice.scriptText.ifBlank { "No approved template translation for this language." },
            style = MaterialTheme.typography.bodyMedium,
        )
        Spacer(Modifier.height(6.dp))
        if (voice.scriptText.isNotBlank()) {
            TextButton(onClick = onPreview) { Text("Preview announcement") }
        }
        Spacer(Modifier.height(10.dp))
        if (voice.audioUrl.isNotBlank()) MonoValue("Audio: ${voice.audioUrl}")
        if (voice.contentHash.isNotBlank()) MonoValue("Hash: ${voice.contentHash.take(24)}…")
        Spacer(Modifier.height(10.dp))
        CaveatNote(
            "No speech is synthesized. The server records a MessageAudioAsset row with a URL " +
                "and returns the hash; the audio behind that URL is produced on demand by the " +
                "web app's own /api/audio route, not by Amazon Polly.",
        )
    }
}

@Composable
private fun HistoryCard(entry: EscalationHistoryEntry) {
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                entry.action.replace('_', ' ').replaceFirstChar { it.uppercase() },
                style = MaterialTheme.typography.titleSmall,
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.width(8.dp))
            StatusPill(entry.level.ifBlank { "—" }, levelTint(entry.level))
        }
        Spacer(Modifier.height(6.dp))
        MonoValue("${formatServerDateTime(entry.at)} · ${channelLabel(entry.channel)}")
        entry.explanation?.let {
            Spacer(Modifier.height(8.dp))
            Text(it, style = MaterialTheme.typography.bodyMedium)
        }
        Spacer(Modifier.height(6.dp))
        entry.ruleId?.let { KeyValueRow("Rule", it) }
        entry.govReferenceId?.let { KeyValueRow("Reference id", it) }
        entry.callStatus?.let { KeyValueRow("Call status", "$it · ${entry.durationSec ?: 0}s") }
        entry.amount?.let { KeyValueRow("Amount received", formatInr(it)) }
        entry.utrNumber?.let { KeyValueRow("UTR", it) }
        entry.receiptNumber?.let { KeyValueRow("Receipt", it) }
        entry.contentHash?.let {
            Spacer(Modifier.height(6.dp))
            MonoValue("SHA-256 ${it.take(24)}…")
        }
    }
}
