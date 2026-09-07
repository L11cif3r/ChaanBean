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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
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
import com.chaanbean.mobile.core.ui.SummaryTile
import com.chaanbean.mobile.core.ui.formatInr
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.admincore.data.AdminModule
import com.chaanbean.mobile.feature.admincore.data.FinancialKpis
import com.chaanbean.mobile.feature.admincore.data.FinancialsAccess
import com.chaanbean.mobile.feature.admincore.data.ModuleRevenue
import com.chaanbean.mobile.feature.admincore.data.MonthlyFinancialRow

@Composable
fun AdminFinancialsScreen() {
    val vm = rememberVm { AdminFinancialsViewModel(AdminModule.repository(it)) }
    val state by vm.state.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            SectionHeader(
                "Monthly Financials",
                "MRR waterfall, module revenue share and the trailing twelve months.",
            )
        }

        item { AdminRoleSwitch(role = state.role, onRole = { vm.setRole(it) }) }

        when (val data = state.data) {
            is Outcome.Loading -> item { LoadingBox() }
            is Outcome.Err -> item { ErrorBox(data.message, onRetry = { vm.refresh() }) }
            is Outcome.Ok -> when (val access = data.value) {
                is FinancialsAccess.Denied -> item { AccessDeniedCard(access.reason) }
                is FinancialsAccess.Allowed -> {
                    val financials = access.data
                    item { KpiTiles(financials.kpis) }
                    item { WaterfallCard(financials.kpis) }
                    item { ForecastCard(financials.kpis) }

                    if (financials.moduleRevenue.isNotEmpty()) {
                        item {
                            SectionHeader(
                                "Revenue by module",
                                "Latest month's gross revenue, split across the five product areas.",
                            )
                        }
                        item { ModuleRevenueCard(financials.moduleRevenue) }
                        item {
                            AdminNote(
                                "This split is not billing data. The server weights row counts - wallet "
                                    + "pulls, calls x5, vendors x10, community defaults x8 - and applies "
                                    + "those percentages to one month of gross revenue. Treat it as an "
                                    + "allocation of activity, not as revenue actually invoiced per module.",
                            )
                        }
                    }

                    item {
                        SectionHeader(
                            "Trailing months",
                            "At most twelve rows, newest first, straight from MonthlyFinancial.",
                        )
                    }
                    if (financials.summaryTable.isEmpty()) {
                        item { EmptyBox("No monthly financial records have been written yet.") }
                    } else {
                        item { MrrTrendCard(financials.summaryTable) }
                        financials.summaryTable.forEach { row ->
                            item(key = row.period) { MonthCard(row) }
                        }
                    }
                }
            }
        }

        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun KpiTiles(kpis: FinancialKpis) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SummaryTile(
                label = "Current MRR",
                value = formatInr(kpis.currentMRR),
                tint = Chaan.Green,
                modifier = Modifier.weight(1f),
            )
            SummaryTile(
                label = "Gross revenue",
                value = formatInr(kpis.grossRevenue),
                modifier = Modifier.weight(1f),
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SummaryTile(
                label = "Growth rate",
                value = "${kpis.growthRatePct}%",
                tint = if (kpis.growthRatePct >= 0) Chaan.Green else Chaan.Red,
                modifier = Modifier.weight(1f),
            )
            SummaryTile(
                label = "Paying customers",
                value = kpis.activeCustomers.toString(),
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun WaterfallCard(kpis: FinancialKpis) {
    ChaanCard {
        Text("MRR movement", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        KeyValueRow("New", "+" + formatInr(kpis.newMRR))
        KeyValueRow("Expansion", "+" + formatInr(kpis.expansionMRR))
        KeyValueRow("Churned", "-" + formatInr(kpis.churnedMRR))
        Spacer(Modifier.height(4.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                "Net movement",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                formatInr(kpis.netMrrGrowth),
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = if (kpis.netMrrGrowth >= 0) Chaan.Green else Chaan.Red,
            )
        }
    }
}

@Composable
private fun ForecastCard(kpis: FinancialKpis) {
    ChaanCard {
        Text("Next month forecast", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(6.dp))
        Text(
            formatInr(kpis.forecastNextMonthMRR),
            style = MaterialTheme.typography.headlineMedium,
            color = Chaan.Accent,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            kpis.forecastMethod.ifBlank { "Method not reported by the server." },
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            "Arithmetic only: the trailing three-month MRR average multiplied by 1.08, plus a twelfth "
                + "of a quarter of the open pipeline weighted by deal probability. No model, no "
                + "confidence interval.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun ModuleRevenueCard(modules: List<ModuleRevenue>) {
    ChaanCard {
        modules.forEach { module ->
            BarRow(
                label = module.module,
                value = "${module.sharePct}% · ${formatInr(module.revenueINR)}",
                fraction = module.sharePct / 100f,
                tint = Chaan.Amber,
            )
        }
    }
}

@Composable
private fun MrrTrendCard(rows: List<MonthlyFinancialRow>) {
    val peak = rows.maxOfOrNull { it.totalMRR }?.takeIf { it > 0.0 } ?: 1.0
    ChaanCard {
        Text("Total MRR by month", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(6.dp))
        rows.asReversed().forEach { row ->
            BarRow(
                label = row.period,
                value = formatInr(row.totalMRR),
                fraction = (row.totalMRR / peak).toFloat(),
                tint = Chaan.Green,
            )
        }
    }
}

@Composable
private fun MonthCard(row: MonthlyFinancialRow) {
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(row.period, style = MaterialTheme.typography.titleMedium)
            Text(
                formatInr(row.totalMRR),
                style = MaterialTheme.typography.titleMedium,
                color = Chaan.Green,
            )
        }
        Spacer(Modifier.height(8.dp))
        KeyValueRow("New / expansion", formatInr(row.newMRR) + " · " + formatInr(row.expansionMRR))
        KeyValueRow("Churned", "-" + formatInr(row.churnedMRR))
        KeyValueRow("Net growth", formatInr(row.netGrowth))
        KeyValueRow("Gross revenue", formatInr(row.grossRevenue))
        KeyValueRow("Customers", row.activeCustomers.toString())
        KeyValueRow("Reports pulled", row.reportsPulled.toString())
        KeyValueRow("Deals won / lost", "${row.dealsWon} / ${row.dealsLost}")
    }
}
