package com.chaanbean.mobile.feature.businesscheck.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.model.RiskFlag
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.RiskBadge
import com.chaanbean.mobile.core.ui.StatusPill
import com.chaanbean.mobile.core.ui.formatInr
import com.chaanbean.mobile.feature.businesscheck.data.BusinessProfile
import com.chaanbean.mobile.feature.businesscheck.data.FinancialYearSummary
import com.chaanbean.mobile.feature.businesscheck.data.parseHardRedFlags

@Composable
internal fun FinancialHealthSection(business: BusinessProfile, onOpenDocuments: () -> Unit) {
    val summaries = business.yearSummaries
    val latest = summaries.lastOrNull()
    ExpandableCard(
        title = "Financial health",
        subtitle = "Derived from the documents on file, not from any tax or bank feed.",
    ) {
        if (latest == null) {
            Text(
                "No financial documents have been processed yet, so there is nothing " +
                    "to summarise.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(10.dp))
            OutlinedButton(onClick = onOpenDocuments) { Text("Upload documents") }
            return@ExpandableCard
        }

        Text(
            "Latest year on file: ${latest.fiscalYear}",
            style = MaterialTheme.typography.titleSmall,
        )
        Spacer(Modifier.height(8.dp))
        KeyValueRow("Revenue", compactInr(latest.revenue))
        KeyValueRow("Gross margin", formatPct(latest.grossMarginPct))
        KeyValueRow("EBITDA", compactInr(latest.ebitda))
        KeyValueRow("Net profit", compactInr(latest.netProfit))
        KeyValueRow("Net margin", formatPct(latest.netMarginPct))
        KeyValueRow("Current ratio", formatRatio(latest.currentRatio))
        KeyValueRow("Debt to equity", formatRatio(latest.debtToEquity))
        KeyValueRow("Revenue source", latest.revenueSource ?: EM_DASH)

        Spacer(Modifier.height(14.dp))
        Text("Year summaries", style = MaterialTheme.typography.titleSmall)
        Spacer(Modifier.height(6.dp))
        summaries.asReversed().forEach { summary ->
            YearSummaryRow(summary)
        }
    }
}

@Composable
private fun YearSummaryRow(summary: FinancialYearSummary) {
    val completeness = completenessPct(summary.dataCompleteness)
    Column(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(summary.fiscalYear, style = MaterialTheme.typography.titleSmall)
            Text(
                "$completeness% complete",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Spacer(Modifier.height(6.dp))
        ScoreBar(
            fraction = completeness / 100f,
            tint = if (completeness >= 75) Chaan.Green else Chaan.Amber,
        )
        Spacer(Modifier.height(6.dp))
        KeyValueRow("Revenue", compactInr(summary.revenue))
        KeyValueRow("Net profit", compactInr(summary.netProfit))
        KeyValueRow("Net margin", formatPct(summary.netMarginPct))
        KeyValueRow("Total assets", compactInr(summary.totalAssets))
        KeyValueRow("Total liabilities", compactInr(summary.totalLiabilities))
        KeyValueRow("GST turnover", compactInr(summary.gstTurnover))
    }
}

@Composable
internal fun ConsistencySection(business: BusinessProfile) {
    val checks = business.consistencyChecks
    val failing = checks.count { it.result.uppercase() == "REVIEW_REQUIRED" }
    ExpandableCard(
        title = "Consistency checks",
        subtitle = if (checks.isEmpty()) {
            "Nothing cross-checked yet."
        } else {
            "$failing of ${checks.size} need a look."
        },
        initiallyExpanded = failing > 0,
    ) {
        if (checks.isEmpty()) {
            Text(
                "Cross-document checks run once two sources cover the same fiscal year.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            return@ExpandableCard
        }
        checks.forEach { check ->
            val review = check.result.uppercase() == "REVIEW_REQUIRED"
            Column(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(check.checkName, style = MaterialTheme.typography.titleSmall)
                        if (check.fiscalYear != null) {
                            Text(
                                check.fiscalYear!!,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                    Spacer(Modifier.width(8.dp))
                    StatusPill(
                        text = humanizeStatus(check.result),
                        tint = if (review) Chaan.Amber else Chaan.Green,
                    )
                }
                Spacer(Modifier.height(6.dp))
                KeyValueRow(check.labelA ?: "Value A", compactInr(check.valueA))
                KeyValueRow(check.labelB ?: "Value B", compactInr(check.valueB))
                KeyValueRow("Discrepancy", formatPct(check.discrepancyPct))
                check.note?.let {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        it,
                        style = MaterialTheme.typography.bodySmall,
                        color = if (review) Chaan.Amber else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
internal fun RiskSection(business: BusinessProfile) {
    val signals = business.riskSignals
    val hardFlags = parseHardRedFlags(business.riskFlag?.hardRedFlags)
    ExpandableCard(
        title = "Risk signals",
        subtitle = "Twelve weighted rules; every one shows the evidence it scored on.",
    ) {
        if (hardFlags.isNotEmpty()) {
            Text("Hard red flags active", style = MaterialTheme.typography.titleSmall, color = Chaan.Red)
            Spacer(Modifier.height(6.dp))
            hardFlags.forEach { flag ->
                Text(
                    "- ${humanizeStatus(flag)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Chaan.Red,
                )
            }
            Spacer(Modifier.height(12.dp))
        }

        if (signals.isEmpty()) {
            Text(
                "Signals have not been computed for this profile yet.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            return@ExpandableCard
        }

        signals.forEach { signal ->
            Column(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            signal.label.ifBlank { signal.signalCode },
                            style = MaterialTheme.typography.titleSmall,
                        )
                        Text(
                            "weight ${formatRatio(signal.weight)}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "${signal.score.toInt()}/100",
                        style = MaterialTheme.typography.titleSmall,
                        color = signalTint(signal.color),
                        fontWeight = FontWeight.Bold,
                    )
                }
                Spacer(Modifier.height(4.dp))
                ScoreBar(fraction = (signal.score / 100.0).toFloat(), tint = signalTint(signal.color))
                Spacer(Modifier.height(6.dp))
                Text(signal.rationale, style = MaterialTheme.typography.bodySmall)
            }
        }

        Spacer(Modifier.height(6.dp))
        Text(
            "GREY signals are scored neutral because the underlying data was never " +
                "collected, not because the business passed.",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
internal fun CreditSection(business: BusinessProfile) {
    val credit = business.creditRec
    ExpandableCard(
        title = "Credit recommendation",
        subtitle = "What the rules engine suggests, not an approval.",
    ) {
        if (credit == null) {
            Text(
                "No credit recommendation has been computed yet.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            return@ExpandableCard
        }

        Row(verticalAlignment = Alignment.CenterVertically) {
            RiskBadge(RiskFlag.from(credit.flag))
            Spacer(Modifier.width(10.dp))
            Text(
                if (credit.isBlocked) "Credit blocked" else formatInr(credit.creditLimit),
                style = MaterialTheme.typography.headlineSmall,
                color = if (credit.isBlocked) Chaan.Red else MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.Bold,
            )
        }
        Spacer(Modifier.height(8.dp))
        if (credit.isBlocked) {
            Text(
                credit.blockReason ?: "Blocked by a hard red flag.",
                style = MaterialTheme.typography.bodyMedium,
                color = Chaan.Red,
            )
        } else {
            KeyValueRow("Tenor", "${credit.tenor} days")
        }
        KeyValueRow("Computed", formatDateTime(credit.computedAt))
        Spacer(Modifier.height(10.dp))
        Text("Why", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(4.dp))
        Text(credit.rationale, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
internal fun CourtCasesSection(business: BusinessProfile) {
    val cases = business.courtCases
    ExpandableCard(
        title = "Court records",
        subtitle = "${cases.size} case(s) entered by hand from eCourts.",
        initiallyExpanded = cases.isNotEmpty(),
    ) {
        if (cases.isEmpty()) {
            Text(
                "No court cases recorded. That is the absence of a manual search " +
                    "result, not proof that none exist.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            return@ExpandableCard
        }
        cases.forEach { courtCase ->
            Column(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            courtCase.caseNumber ?: "Case number not recorded",
                            style = MaterialTheme.typography.titleSmall,
                        )
                        Text(
                            courtCase.courtName ?: EM_DASH,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Spacer(Modifier.width(8.dp))
                    StatusPill(
                        text = humanizeStatus(courtCase.status),
                        tint = caseStatusTint(courtCase.status),
                    )
                }
                Spacer(Modifier.height(6.dp))
                KeyValueRow("Type", courtCase.caseType ?: EM_DASH)
                KeyValueRow("Party role", courtCase.partyRole ?: EM_DASH)
                KeyValueRow("Filed", formatDate(courtCase.filingDate))
                courtCase.description?.let {
                    Spacer(Modifier.height(4.dp))
                    Text(it, style = MaterialTheme.typography.bodySmall)
                }
                Spacer(Modifier.height(6.dp))
                SourceStatusPill(courtCase.sourceStatus)
            }
        }
    }
}

@Composable
internal fun DocumentsSection(business: BusinessProfile, onOpenDocuments: () -> Unit) {
    val documents = business.financialDocuments
    ExpandableCard(
        title = "Documents",
        subtitle = "${business.counts?.financialDocuments ?: documents.size} on file.",
        initiallyExpanded = false,
    ) {
        if (documents.isEmpty()) {
            Text(
                "No documents uploaded yet. Financial figures stay empty until one is.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            documents.forEach { document ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(document.originalName, style = MaterialTheme.typography.bodyMedium)
                        Text(
                            humanizeStatus(document.category) + " - " +
                                (document.fiscalYear ?: "year not set"),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Spacer(Modifier.width(8.dp))
                    StatusPill(
                        text = humanizeStatus(document.processingStatus),
                        tint = processingTint(document.processingStatus),
                    )
                }
            }
        }
        Spacer(Modifier.height(10.dp))
        OutlinedButton(onClick = onOpenDocuments) { Text("Manage documents") }
    }
}

@Composable
internal fun AuditSection(business: BusinessProfile) {
    val logs = business.auditLogs
    ExpandableCard(
        title = "Audit trail",
        subtitle = "${logs.size} event(s) recorded against this profile.",
        initiallyExpanded = false,
    ) {
        if (logs.isEmpty()) {
            Text(
                "No events recorded yet.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            return@ExpandableCard
        }
        logs.take(AUDIT_LIMIT).forEach { log ->
            Column(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        humanizeStatus(log.eventType),
                        style = MaterialTheme.typography.labelSmall,
                        color = Chaan.Accent,
                        modifier = Modifier.weight(1f),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        formatDateTime(log.createdAt),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Spacer(Modifier.height(2.dp))
                Text(log.description, style = MaterialTheme.typography.bodySmall)
                log.actor?.let {
                    Text(
                        "by $it",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        if (logs.size > AUDIT_LIMIT) {
            Spacer(Modifier.height(6.dp))
            Text(
                "Showing the newest $AUDIT_LIMIT of ${logs.size} events.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

private const val AUDIT_LIMIT = 25
