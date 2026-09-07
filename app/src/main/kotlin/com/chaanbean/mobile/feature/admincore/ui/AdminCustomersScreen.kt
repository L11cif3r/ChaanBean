package com.chaanbean.mobile.feature.admincore.ui

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
import com.chaanbean.mobile.feature.admincore.data.AdminModule
import com.chaanbean.mobile.feature.admincore.data.CustomerRow
import com.chaanbean.mobile.feature.admincore.data.CustomerSummary
import com.chaanbean.mobile.feature.admincore.data.ReportUsage
import com.chaanbean.mobile.feature.admincore.data.RetentionPoint

@Composable
fun AdminCustomersScreen() {
    val vm = rememberVm { AdminCustomersViewModel(AdminModule.repository(it)) }
    val state by vm.state.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            SectionHeader(
                "Customer Engagement",
                "Every tenant on the platform, with the health score the server recomputes per request.",
            )
        }

        when (val data = state.data) {
            is Outcome.Loading -> item { LoadingBox() }
            is Outcome.Err -> item { ErrorBox(data.message, onRetry = { vm.refresh() }) }
            is Outcome.Ok -> {
                val payload = data.value
                item { HealthSummary(payload.summary) }
                item {
                    AdminNote(
                        "Health is derived on every request from activity recency, wallet balance and "
                            + "report consumption. The stored Company.healthScore column is ignored, so "
                            + "these labels can disagree with the database.",
                    )
                }

                item { SectionHeader("Tenants") }
                if (payload.customers.isEmpty()) {
                    item { EmptyBox("No companies on the platform yet.") }
                } else {
                    items(payload.customers, key = { it.id }) { CustomerCard(it) }
                }

                if (payload.reportUsageBreakdown.isNotEmpty()) {
                    item {
                        SectionHeader(
                            "Report consumption",
                            "Wallet ledger pulls across all tenants, by report type.",
                        )
                    }
                    item { ReportUsageCard(payload.reportUsageBreakdown) }
                }

                if (payload.customerRetentionHistory.isNotEmpty()) {
                    item {
                        SectionHeader(
                            "Retention history",
                            "Active customers per month, from the monthly financial records.",
                        )
                    }
                    item { RetentionCard(payload.customerRetentionHistory) }
                }
            }
        }

        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun HealthSummary(summary: CustomerSummary) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SummaryTile(
                label = "Tenants",
                value = summary.totalCustomers.toString(),
                modifier = Modifier.weight(1f),
            )
            SummaryTile(
                label = "Healthy",
                value = summary.healthyCount.toString(),
                tint = Chaan.Green,
                modifier = Modifier.weight(1f),
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SummaryTile(
                label = "At risk",
                value = summary.atRiskCount.toString(),
                tint = Chaan.Amber,
                modifier = Modifier.weight(1f),
            )
            SummaryTile(
                label = "Churned",
                value = summary.churnedCount.toString(),
                tint = Chaan.Red,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun CustomerCard(customer: CustomerRow) {
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Text(customer.name, style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    StatusPill(text = customer.plan.uppercase(), tint = Chaan.Accent)
                    if (customer.hasTrustProfile) {
                        StatusPill(text = "TRUST PROFILE", tint = Chaan.TextMuted)
                    }
                }
            }
            StatusPill(
                text = customer.healthScore.uppercase(),
                tint = healthTint(customer.healthScore),
            )
        }

        Spacer(Modifier.height(10.dp))
        KeyValueRow("Wallet balance", formatInr(customer.walletBalance))
        KeyValueRow("Reports pulled", customer.totalReportsPulled.toString())
        KeyValueRow("Debtors / vendors", "${customer.totalDebtors} / ${customer.totalVendors}")
        KeyValueRow("Active campaigns", customer.activeCampaigns.toString())
        KeyValueRow(
            "Age / last active",
            "${customer.daysSinceSignup}d old · ${customer.daysSinceActive}d idle",
        )

        if (customer.healthReasons.isNotEmpty()) {
            Spacer(Modifier.height(8.dp))
            Text(
                "Why this score",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(2.dp))
            customer.healthReasons.forEach { reason ->
                Text(
                    "· $reason",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun ReportUsageCard(usage: List<ReportUsage>) {
    val peak = usage.maxOfOrNull { it.totalPulls }?.takeIf { it > 0 } ?: 1
    ChaanCard {
        usage.forEach { row ->
            BarRow(
                label = humanizeKey(row.reportType),
                value = row.totalPulls.toString(),
                fraction = row.totalPulls.toFloat() / peak,
                tint = Chaan.Accent,
            )
        }
    }
}

@Composable
private fun RetentionCard(history: List<RetentionPoint>) {
    val peak = history.maxOfOrNull { it.activeCustomers }?.takeIf { it > 0 } ?: 1
    ChaanCard {
        history.forEach { point ->
            BarRow(
                label = point.period,
                value = "${point.activeCustomers} active · ${point.reportsPulled} pulls",
                fraction = point.activeCustomers.toFloat() / peak,
                tint = Chaan.Green,
            )
        }
    }
}
