package com.chaanbean.mobile.feature.arbitration.ui

import androidx.compose.foundation.clickable
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
import androidx.compose.material3.MaterialTheme
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
import com.chaanbean.mobile.feature.arbitration.data.ArbitrationCase
import com.chaanbean.mobile.feature.arbitration.data.ArbitrationModule

@Composable
fun ArbitrationCasesScreen(onOpenCase: (String) -> Unit) {
    val vm = rememberVm { ArbitrationCasesViewModel(ArbitrationModule.repository(it)) }
    val state by vm.state.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            SectionHeader(
                "Arbitration & Dispute Resolution",
                "Statutory fast-track claims raised under Section 16 of the MSMED Act 2006 and " +
                    "settled under the Arbitration & Conciliation Act 1996.",
            )
        }
        item { StatutoryEngineCard() }

        when (val cases = state.cases) {
            is Outcome.Loading -> item { LoadingBox() }
            is Outcome.Err -> item { ErrorBox(cases.message, onRetry = { vm.refresh() }) }
            is Outcome.Ok -> {
                item { ClaimTotals(cases.value) }
                if (cases.value.isEmpty()) {
                    item {
                        EmptyBox(
                            "No arbitration claims on the register. Accounts reach this desk " +
                                "only after an L3 legal notice lapses.",
                        )
                    }
                } else {
                    items(cases.value, key = { it.id }) { case ->
                        CaseRow(case = case, onClick = { onOpenCase(case.id) })
                    }
                }
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun ClaimTotals(cases: List<ArbitrationCase>) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        SummaryTile("Claims on register", cases.size.toString(), modifier = Modifier.weight(1f))
        SummaryTile(
            "Total executable claim",
            formatInr(cases.sumOf { it.totalClaimAmount }),
            tint = Chaan.Green,
            modifier = Modifier.weight(1f),
        )
    }
}

/**
 * The rate constants are compiled into the server, not fetched. Saying so here keeps the
 * screen from implying a live RBI feed that does not exist.
 */
@Composable
private fun StatutoryEngineCard() {
    ChaanCard {
        Text("Statutory penal interest engine", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        KeyValueRow("RBI bank rate", "6.75% p.a.")
        KeyValueRow("Statutory multiplier", "3x — MSMED Act 2006, Section 16")
        KeyValueRow("Penal rate applied", "20.25% p.a., compounded with monthly rests")
        KeyValueRow("Formula", "A = P x (1 + (3 x bank rate)/12)^months")
        Spacer(Modifier.height(10.dp))
        Text(
            "The bank rate and the multiplier are constants inside the server's calculator. " +
                "Nothing here reads a live RBI notification, and the rate cannot be overridden " +
                "per case.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun CaseRow(case: ArbitrationCase, onClick: () -> Unit) {
    ChaanCard(modifier = Modifier.clickable(onClick = onClick)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                case.caseNumber.ifBlank { case.id },
                style = MaterialTheme.typography.labelMedium,
                color = Chaan.Brand,
                fontWeight = FontWeight.Bold,
            )
            StatusPill(humanize(case.status), caseStatusTint(case.status))
        }
        Spacer(Modifier.height(6.dp))
        Column {
            Text(
                case.creditAccount?.buyer?.name
                    ?: case.respondentName
                    ?: "Respondent not returned by the server",
                style = MaterialTheme.typography.titleMedium,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                "Claimant: " + (case.claimantName ?: "not recorded"),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Spacer(Modifier.height(10.dp))
        KeyValueRow("Principal", formatInr(case.principalAmount))
        KeyValueRow("Accrued interest", formatInr(case.accruedInterest))
        KeyValueRow("Total claim", formatInr(case.totalClaimAmount))
        KeyValueRow("Penal rate", "${case.penalInterestRate}% p.a.")
        Spacer(Modifier.height(8.dp))
        StatusPill("e-SIGN " + humanize(case.eSignStatus), eSignTint(case.eSignStatus))
    }
}
