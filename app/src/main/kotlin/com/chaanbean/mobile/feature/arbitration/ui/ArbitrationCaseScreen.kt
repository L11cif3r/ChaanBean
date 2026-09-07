package com.chaanbean.mobile.feature.arbitration.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
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
import com.chaanbean.mobile.core.ui.ErrorBox
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.LoadingBox
import com.chaanbean.mobile.core.ui.StatusPill
import com.chaanbean.mobile.core.ui.SummaryTile
import com.chaanbean.mobile.core.ui.formatInr
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.arbitration.data.ArbitrationCase
import com.chaanbean.mobile.feature.arbitration.data.ArbitrationModule
import com.chaanbean.mobile.feature.arbitration.data.ArchiveAccess
import com.chaanbean.mobile.feature.arbitration.data.ESignSignature
import com.chaanbean.mobile.feature.arbitration.data.Hearing
import com.chaanbean.mobile.feature.arbitration.data.MsmeInterestResult

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ArbitrationCaseScreen(caseId: String, onBack: () -> Unit) {
    val vm = rememberVm { ArbitrationCaseViewModel(ArbitrationModule.repository(it), caseId) }
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
                title = {
                    val loaded = state.case
                    Text(
                        if (loaded is Outcome.Ok) {
                            loaded.value.caseNumber.ifBlank { "Arbitration case" }
                        } else {
                            "Arbitration case"
                        },
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
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
            when (val loaded = state.case) {
                is Outcome.Loading -> item { LoadingBox() }
                is Outcome.Err -> item { ErrorBox(loaded.message, onRetry = { vm.refresh() }) }
                is Outcome.Ok -> {
                    val case = loaded.value
                    item { Spacer(Modifier.height(4.dp)) }
                    item { PartiesCard(case) }
                    item { ClaimBreakdown(case) }
                    item {
                        InterestCard(
                            calculation = state.calculation,
                            busy = state.busyAction == ArbitrationCaseViewModel.ACTION_RECALCULATE,
                            onRecalculate = { vm.recalculateInterest() },
                        )
                    }
                    item {
                        SettlementCard(
                            case = case,
                            busy = state.busyAction == ArbitrationCaseViewModel.ACTION_SETTLEMENT,
                            onDraft = { vm.draftSettlement() },
                        )
                    }
                    item {
                        ESignCard(
                            eSignStatus = case.eSignStatus,
                            signatures = state.signatures,
                            busy = state.busyAction == ArbitrationCaseViewModel.ACTION_E_SIGN,
                            onSign = { name, role -> vm.eSign(name, role) },
                        )
                    }
                    item { HearingsCard(state.hearings) }
                    item { LegalNoticeCard(case, state.archive) }
                    item { EvidenceLogCard(state.sessionEvidence, state.archive) }
                }
            }
            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}

@Composable
private fun PartiesCard(case: ArbitrationCase) {
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Parties & forum", style = MaterialTheme.typography.titleMedium)
            StatusPill(humanize(case.status), caseStatusTint(case.status))
        }
        Spacer(Modifier.height(8.dp))
        KeyValueRow("Claimant", case.claimantName ?: "Not recorded")
        KeyValueRow(
            "Respondent",
            case.creditAccount?.buyer?.name ?: case.respondentName ?: "Not recorded",
        )
        KeyValueRow("Legal owner", case.assignedLegalOwner ?: "Unassigned")
        case.creditAccount?.buyer?.gstin?.let { KeyValueRow("Respondent GSTIN", it) }
        case.creditAccount?.buyer?.pan?.let { KeyValueRow("Respondent PAN", it) }
        KeyValueRow("Case opened", formatIsoDate(case.createdAt))
        KeyValueRow("Last updated", formatIsoDateTime(case.updatedAt))
        Spacer(Modifier.height(10.dp))
        Text("Statutory ground of claim", style = MaterialTheme.typography.labelMedium)
        Spacer(Modifier.height(2.dp))
        Text(
            case.statutoryBasis.ifBlank { "Not recorded" },
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun ClaimBreakdown(case: ArbitrationCase) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            SummaryTile(
                "Principal debt",
                formatInr(case.principalAmount),
                modifier = Modifier.weight(1f),
            )
            SummaryTile(
                "Accrued interest",
                formatInr(case.accruedInterest),
                tint = Chaan.Red,
                modifier = Modifier.weight(1f),
            )
        }
        SummaryTile(
            "Total executable claim",
            formatInr(case.totalClaimAmount),
            tint = Chaan.Green,
        )
        ChaanCard {
            KeyValueRow("Penal rate on record", "${case.penalInterestRate}% p.a.")
            case.creditAccount?.let { account ->
                KeyValueRow("Invoice due date", formatIsoDate(account.dueDate))
                KeyValueRow("Agreed tenor", "${account.tenorDays} days")
                KeyValueRow("Account status", humanize(account.overdueStatus))
                KeyValueRow("Dispute status", humanize(account.disputeStatus))
            }
        }
    }
}

/**
 * The list payload carries only the stored totals, so the day-count and compounding
 * breakdown exist only after the server recomputes them on request.
 */
@Composable
private fun InterestCard(
    calculation: MsmeInterestResult?,
    busy: Boolean,
    onRecalculate: () -> Unit,
) {
    ChaanCard {
        Text("MSMED Act 2006, Section 16", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(4.dp))
        Text(
            "Compound interest with monthly rests at three times the RBI bank rate.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(10.dp))
        if (calculation == null) {
            Text(
                "No breakdown yet. The case list returns only the stored principal, interest " +
                    "and total; the day-count, compounding periods and formula come back only " +
                    "from a recompute.",
                style = MaterialTheme.typography.bodyMedium,
            )
        } else {
            KeyValueRow("Principal taken", formatInr(calculation.principalAmount))
            KeyValueRow("RBI bank rate", "${calculation.rbiBaseRatePercent}% p.a.")
            KeyValueRow("Multiplier", "${calculation.multiplicationFactor}x")
            KeyValueRow("Statutory rate", "${calculation.statutoryRatePercent}% p.a.")
            KeyValueRow("Days overdue", calculation.daysOverdue.toString())
            KeyValueRow("Monthly rests", calculation.compoundingPeriodsMonths.toString())
            KeyValueRow("Accrued interest", formatInr(calculation.accruedInterest))
            KeyValueRow("Total payable", formatInr(calculation.totalPayable))
            KeyValueRow("Computed at", formatIsoDateTime(calculation.calculatedAt))
            Spacer(Modifier.height(8.dp))
            Text(
                calculation.legalFormula,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                calculation.statutorySection,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Spacer(Modifier.height(12.dp))
        Button(onClick = onRecalculate, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
            Text(if (busy) "Recomputing..." else "Recompute statutory interest")
        }
        Spacer(Modifier.height(8.dp))
        Text(
            "A recompute overwrites the stored penal rate, accrued interest and total claim " +
                "on the server. Days overdue are measured from the credit account's due date.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun SettlementCard(case: ArbitrationCase, busy: Boolean, onDraft: () -> Unit) {
    ChaanCard {
        Text("Settlement draft", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        val terms = case.settlementTerms
        if (terms.isNullOrBlank()) {
            Text(
                "No settlement terms drafted for this case.",
                style = MaterialTheme.typography.bodyMedium,
            )
        } else {
            Text(terms, style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(8.dp))
            case.settlementDocUrl?.let {
                Text("Document reference", style = MaterialTheme.typography.labelMedium)
                Spacer(Modifier.height(2.dp))
                Text(
                    it,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Spacer(Modifier.height(12.dp))
        OutlinedButton(onClick = onDraft, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
            Text(if (busy) "Drafting..." else "Draft settlement terms")
        }
        Spacer(Modifier.height(8.dp))
        Text(
            "The server composes the document URL as a string and stores the terms; it does " +
                "not generate, upload or verify a PDF. Treat the link as a reference, not a " +
                "downloadable agreement.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun ESignCard(
    eSignStatus: String,
    signatures: List<ESignSignature>,
    busy: Boolean,
    onSign: (String, String) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("Authorized Signatory (Claimant)") }

    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("e-Sign audit trail", style = MaterialTheme.typography.titleMedium)
            StatusPill(humanize(eSignStatus), eSignTint(eSignStatus))
        }
        Spacer(Modifier.height(8.dp))
        if (signatures.isEmpty()) {
            Text(
                "No signatures recorded. Two are required before the case moves to award.",
                style = MaterialTheme.typography.bodyMedium,
            )
        } else {
            signatures.forEachIndexed { index, signature ->
                if (index > 0) {
                    Spacer(Modifier.height(8.dp))
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                    Spacer(Modifier.height(8.dp))
                }
                Text(
                    signature.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    signature.role,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(6.dp))
                KeyValueRow("Signed at", formatIsoDateTime(signature.signedAt))
                KeyValueRow("Auth mode claimed", signature.authMode)
                KeyValueRow("SHA-256", shortHash(signature.docHash))
            }
        }
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = name,
            onValueChange = { name = it },
            label = { Text("Signatory name") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(
            value = role,
            onValueChange = { role = it },
            label = { Text("Signatory role") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = { onSign(name.trim(), role.trim()) },
            enabled = !busy && name.isNotBlank() && eSignStatus != "fully_signed",
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                when {
                    eSignStatus == "fully_signed" -> "Fully signed"
                    busy -> "Recording..."
                    else -> "Record signature"
                },
            )
        }
        Spacer(Modifier.height(8.dp))
        Text(
            "The server labels each entry \"Aadhaar e-Sign (UIDAI OTP Verified)\" but performs " +
                "no UIDAI call and verifies no identity. It stores the name you type here and a " +
                "SHA-256 of case id, name and timestamp. This is an audit note, not a verified " +
                "signature.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun HearingsCard(hearings: List<Hearing>) {
    ChaanCard {
        Text("Chamber hearings", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        if (hearings.isEmpty()) {
            Text(
                "No hearing on record. No endpoint schedules or writes hearings, so this list " +
                    "only ever shows rows seeded directly into the database.",
                style = MaterialTheme.typography.bodyMedium,
            )
        } else {
            hearings.forEachIndexed { index, hearing ->
                if (index > 0) {
                    Spacer(Modifier.height(8.dp))
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                    Spacer(Modifier.height(8.dp))
                }
                Text(hearing.arbitrator, style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(4.dp))
                KeyValueRow("Listed for", formatIsoDateTime(hearing.hearingDate))
                KeyValueRow("Venue", hearing.venue)
            }
        }
    }
}

@Composable
private fun LegalNoticeCard(case: ArbitrationCase, archive: ArchiveAccess) {
    ChaanCard {
        Text("Legal notice status", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        if (archive.legalNoticesReadable) {
            Text("Notices served on this account.", style = MaterialTheme.typography.bodyMedium)
        } else {
            Text(
                "Notices served on this credit account cannot be listed here. The arbitration " +
                    "endpoint does not include them and no other route returns the legal notice " +
                    "table, so this screen will not guess at a served/acknowledged status.",
                style = MaterialTheme.typography.bodyMedium,
            )
        }
        Spacer(Modifier.height(10.dp))
        Text("What the server does return", style = MaterialTheme.typography.labelMedium)
        Spacer(Modifier.height(4.dp))
        val account = case.creditAccount
        if (account == null) {
            Text(
                "This response carried no credit account, so nothing account-level is available.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            KeyValueRow("Dispute status", humanize(account.disputeStatus))
            KeyValueRow("Overdue status", humanize(account.overdueStatus))
            KeyValueRow("Outstanding", formatInr(account.outstandingAmount))
            KeyValueRow("Credit account", account.id)
        }
    }
}

@Composable
private fun EvidenceLogCard(entries: List<SessionEvidenceEntry>, archive: ArchiveAccess) {
    ChaanCard {
        Text(
            "Evidence log — Section 65B, Indian Evidence Act",
            style = MaterialTheme.typography.titleMedium,
        )
        Spacer(Modifier.height(8.dp))
        if (entries.isEmpty()) {
            Text(
                "Nothing recorded from this device yet.",
                style = MaterialTheme.typography.bodyMedium,
            )
        } else {
            entries.forEachIndexed { index, entry ->
                if (index > 0) {
                    Spacer(Modifier.height(8.dp))
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                    Spacer(Modifier.height(8.dp))
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(humanize(entry.action), style = MaterialTheme.typography.titleSmall)
                    StatusPill(entry.channel.uppercase(), Chaan.Accent)
                }
                Spacer(Modifier.height(4.dp))
                KeyValueRow("Recorded at", formatIsoDateTime(entry.recordedAt))
                KeyValueRow("Detail", entry.detail)
                KeyValueRow(
                    "SHA-256",
                    entry.contentHash?.let { shortHash(it) } ?: "Not returned by the server",
                )
            }
        }
        Spacer(Modifier.height(10.dp))
        Text(
            archive.note,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
