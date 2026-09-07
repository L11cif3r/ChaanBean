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
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.ErrorBox
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.LoadingBox
import com.chaanbean.mobile.core.ui.SectionHeader
import com.chaanbean.mobile.core.ui.StatusPill
import com.chaanbean.mobile.core.ui.SummaryTile
import com.chaanbean.mobile.core.ui.formatInr
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.admincore.data.AdminCustomers
import com.chaanbean.mobile.feature.admincore.data.AdminFinancials
import com.chaanbean.mobile.feature.admincore.data.AdminModule
import com.chaanbean.mobile.feature.admincore.data.AdminUser
import com.chaanbean.mobile.feature.admincore.data.FinancialsAccess

@Composable
fun AdminOverviewScreen(
    onOpenCustomers: () -> Unit = {},
    onOpenFinancials: () -> Unit = {},
) {
    val vm = rememberVm { AdminOverviewViewModel(AdminModule.repository(it)) }
    val state by vm.state.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            SectionHeader(
                "Executive Overview",
                "ChaanBean internal operations: customer health and monthly run-rate.",
            )
        }

        item { AdminRoleSwitch(role = state.role, onRole = { vm.setRole(it) }) }

        item {
            when (val a = state.admin) {
                is Outcome.Loading -> LoadingBox()
                is Outcome.Err -> ErrorBox(a.message, onRetry = { vm.refresh() })
                is Outcome.Ok -> AdminIdentityCard(a.value)
            }
        }

        item {
            AdminNote(
                "/api/admin/auth takes the role as a parameter and returns the matching admin row. "
                    + "No password, token or session is checked anywhere in the admin API, so the "
                    + "switch above changes which figures the server is willing to send - it is not a login.",
            )
        }

        item {
            when (val f = state.financials) {
                is Outcome.Loading -> LoadingBox()
                is Outcome.Err -> ErrorBox(f.message, onRetry = { vm.refresh() })
                is Outcome.Ok -> when (val access = f.value) {
                    is FinancialsAccess.Allowed -> RevenueTiles(access.data)
                    is FinancialsAccess.Denied -> AccessDeniedCard(access.reason)
                }
            }
        }

        item {
            when (val c = state.customers) {
                is Outcome.Loading -> LoadingBox()
                is Outcome.Err -> ErrorBox(c.message, onRetry = { vm.refresh() })
                is Outcome.Ok -> CustomerHealthTiles(c.value)
            }
        }

        val customers = state.customers
        if (customers is Outcome.Ok && customers.value.featureAdoption.isNotEmpty()) {
            item { SectionHeader("Module adoption", "Share of tenants with at least one row in each module.") }
            item {
                ChaanCard {
                    customers.value.featureAdoption.forEach { adoption ->
                        BarRow(
                            label = adoption.module,
                            value = "${adoption.adoptedCount} · ${adoption.adoptionRatePct}%",
                            fraction = adoption.adoptionRatePct / 100f,
                            tint = Chaan.Accent,
                        )
                    }
                }
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Button(onClick = onOpenCustomers, modifier = Modifier.weight(1f)) {
                    Text("Customers")
                }
                OutlinedButton(onClick = onOpenFinancials, modifier = Modifier.weight(1f)) {
                    Text("Financials")
                }
            }
        }

        item {
            AdminNote(
                "The web console builds this page by querying the database directly; there is no "
                    + "admin overview endpoint. What you see here is composed from /api/admin/customers "
                    + "and /api/admin/financials only, so the pipeline, marketing-attribution and "
                    + "activity-feed panels of the web page have no counterpart on this screen.",
            )
        }

        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun AdminIdentityCard(user: AdminUser) {
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    user.name.ifBlank { "Unnamed admin" },
                    style = MaterialTheme.typography.titleMedium,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    user.email.ifBlank { "no email on record" },
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            StatusPill(
                text = roleLabel(user.role).uppercase(),
                tint = if (user.role == AdminRoles.OWNER) Chaan.Accent else Chaan.TextMuted,
            )
        }
    }
}

@Composable
private fun RevenueTiles(financials: AdminFinancials) {
    val kpis = financials.kpis
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
                label = "Net MRR growth",
                value = formatInr(kpis.netMrrGrowth),
                tint = if (kpis.netMrrGrowth >= 0) Chaan.Green else Chaan.Red,
                modifier = Modifier.weight(1f),
            )
            SummaryTile(
                label = "Paying customers",
                value = kpis.activeCustomers.toString(),
                modifier = Modifier.weight(1f),
            )
        }
        if (financials.summaryTable.isNotEmpty()) {
            Text(
                "Latest closed month on record: ${financials.summaryTable.first().period}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun CustomerHealthTiles(customers: AdminCustomers) {
    val summary = customers.summary
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
        val wallet = customers.customers.sumOf { it.walletBalance }
        ChaanCard {
            KeyValueRow("Wallet balance held", formatInr(wallet))
            KeyValueRow(
                "Reports pulled to date",
                customers.customers.sumOf { it.totalReportsPulled }.toString(),
            )
            KeyValueRow(
                "Debtors under management",
                customers.customers.sumOf { it.totalDebtors }.toString(),
            )
        }
    }
}
