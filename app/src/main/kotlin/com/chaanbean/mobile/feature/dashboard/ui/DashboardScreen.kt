package com.chaanbean.mobile.feature.dashboard.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.model.RiskFlag
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.EmptyBox
import com.chaanbean.mobile.core.ui.ErrorBox
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.LoadingBox
import com.chaanbean.mobile.core.ui.RiskBadge
import com.chaanbean.mobile.core.ui.SectionHeader
import com.chaanbean.mobile.core.ui.StatusPill
import com.chaanbean.mobile.core.ui.SummaryTile
import com.chaanbean.mobile.core.ui.formatInr
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.dashboard.data.ActivityItem
import com.chaanbean.mobile.feature.dashboard.data.ActivityKind
import com.chaanbean.mobile.feature.dashboard.data.DashboardModule
import com.chaanbean.mobile.feature.dashboard.data.DashboardSnapshot
import com.chaanbean.mobile.feature.dashboard.data.HealthResponse
import com.chaanbean.mobile.feature.dashboard.data.RiskMix
import com.chaanbean.mobile.feature.dashboard.data.exposureFor
import com.chaanbean.mobile.feature.dashboard.data.formatWhen
import com.chaanbean.mobile.feature.dashboard.data.ladder
import com.chaanbean.mobile.feature.dashboard.data.recentActivity
import com.chaanbean.mobile.feature.dashboard.data.riskMix
import com.chaanbean.mobile.feature.dashboard.data.totals

@Composable
fun DashboardScreen() {
    val vm = rememberVm { DashboardViewModel(DashboardModule.repository(it)) }
    val state by vm.state.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            SectionHeader(
                "Enterprise Credit & Recovery Hub",
                "Exposure, deterministic risk mix and recovery state across your B2B credit book.",
            )
        }
        when (val snapshot = state.snapshot) {
            is Outcome.Loading -> item { LoadingBox() }
            is Outcome.Err -> item { ErrorBox(snapshot.message, onRetry = { vm.refresh() }) }
            is Outcome.Ok -> dashboardBody(
                snapshot = snapshot.value,
                refreshing = state.refreshing,
                onRefresh = { vm.refresh() },
            )
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

private fun LazyListScope.dashboardBody(
    snapshot: DashboardSnapshot,
    refreshing: Boolean,
    onRefresh: () -> Unit,
) {
    val totals = snapshot.totals()
    val mix = snapshot.buyers.riskMix()

    item { GatewayCard(snapshot.health, snapshot.healthError, refreshing, onRefresh) }

    item {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            SummaryTile(
                label = "Portfolio exposure",
                value = formatInr(totals.exposure),
                modifier = Modifier.weight(1f),
            )
            SummaryTile(
                label = "At-risk exposure",
                value = formatInr(totals.atRiskExposure),
                tint = if (totals.atRiskExposure > 0.0) Chaan.Amber else null,
                modifier = Modifier.weight(1f),
            )
        }
    }

    item {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            SummaryTile(
                label = "Open escalations",
                value = totals.escalationsOpen.toString(),
                tint = if (totals.escalatedBeyondL1 > 0) Chaan.Red else null,
                modifier = Modifier.weight(1f),
            )
            SummaryTile(
                label = "Wallet balance",
                value = "Not exposed",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.weight(1f),
            )
        }
    }

    item {
        FootNote(
            "Exposure sums every credit account on /api/buyers; at-risk counts only buyers the risk " +
                "engine actually flagged Amber or Red. Wallet balance is stored on the company record " +
                "but no endpoint returns it \u2014 the server emits it once, inside the POST /api/auth " +
                "login response \u2014 so nothing here estimates it.",
        )
    }

    item { RiskMixCard(mix, snapshot) }

    item { RecoveryCard(snapshot) }

    item { VerificationCard(snapshot) }

    item {
        SectionHeader(
            "Recent activity",
            "Assembled from record timestamps. main keeps its court-admissible evidence trail in " +
                "LegalEvidenceLog, and no route exposes that table.",
        )
    }

    item { ActivityCard(snapshot.recentActivity()) }
}

@Composable
private fun GatewayCard(
    health: HealthResponse?,
    healthError: String?,
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
                Text("Gateway status", style = MaterialTheme.typography.titleMedium)
                Text(
                    "GET /api/health",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            when {
                healthError != null -> StatusPill("UNREACHABLE", Chaan.Red)
                health == null -> StatusPill("UNKNOWN", Chaan.TextMuted)
                health.status == "healthy" -> StatusPill("HEALTHY", Chaan.Green)
                else -> StatusPill(health.status.uppercase(), Chaan.Amber)
            }
        }

        Spacer(Modifier.height(10.dp))

        if (health != null) {
            KeyValueRow("Database probe", health.checks.database)
            KeyValueRow("Probe latency", health.latencyMs.toString() + " ms")
            KeyValueRow("Server version", health.version.ifBlank { "\u2014" })
            Spacer(Modifier.height(6.dp))
            Text(
                "Only the database line is a real check. The handler returns \"operational\" as a " +
                    "hardcoded literal for the verification gateway, policy engine, risk scoring engine " +
                    "and voice system without probing any of them.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            Text(
                healthError ?: "No health payload returned.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.End,
        ) {
            TextButton(onClick = onRefresh, enabled = !refreshing) {
                Text(if (refreshing) "Refreshing..." else "Refresh")
            }
        }
    }
}

@Composable
private fun RiskMixCard(mix: RiskMix, snapshot: DashboardSnapshot) {
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom,
        ) {
            Column(Modifier.weight(1f)) {
                Text("Deterministic risk mix", style = MaterialTheme.typography.titleMedium)
                Text(
                    "Latest Green/Amber/Red flag per buyer",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Text(
                mix.total.toString() + " buyers",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
        }

        Spacer(Modifier.height(12.dp))

        if (mix.total == 0) {
            Text(
                snapshot.buyersError ?: "No buyers on the book yet.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            return@ChaanCard
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(10.dp)
                .clip(RoundedCornerShape(999.dp)),
        ) {
            RiskSegment(mix.green, Chaan.Green)
            RiskSegment(mix.amber, Chaan.Amber)
            RiskSegment(mix.red, Chaan.Red)
            RiskSegment(mix.unrated, Chaan.TextMuted)
        }

        Spacer(Modifier.height(14.dp))

        RiskMixRow(RiskFlag.GREEN, mix.green, snapshot.buyers.exposureFor(RiskFlag.GREEN))
        RiskMixRow(RiskFlag.AMBER, mix.amber, snapshot.buyers.exposureFor(RiskFlag.AMBER))
        RiskMixRow(RiskFlag.RED, mix.red, snapshot.buyers.exposureFor(RiskFlag.RED))
        RiskMixRow(RiskFlag.UNKNOWN, mix.unrated, snapshot.buyers.exposureFor(RiskFlag.UNKNOWN))

        if (mix.unrated > 0) {
            Spacer(Modifier.height(8.dp))
            Text(
                "Unrated means the risk engine has not written a flag for that buyer. The web " +
                    "dashboard counts these as Amber; they are held out here so the mix reports only " +
                    "judgements the engine actually made.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun RowScope.RiskSegment(count: Int, color: Color) {
    if (count <= 0) return
    Box(
        Modifier
            .weight(count.toFloat())
            .fillMaxHeight()
            .background(color),
    )
}

@Composable
private fun RiskMixRow(flag: RiskFlag, count: Int, exposure: Double) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RiskBadge(flag)
        Spacer(Modifier.width(10.dp))
        Text(
            count.toString() + (if (count == 1) " buyer" else " buyers"),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(1f),
        )
        Text(
            formatInr(exposure),
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
        )
    }
}

@Composable
private fun RecoveryCard(snapshot: DashboardSnapshot) {
    val totals = snapshot.totals()
    val rungs = snapshot.accounts.ladder()
    ChaanCard {
        Text("Recovery ladder", style = MaterialTheme.typography.titleMedium)
        Text(
            "Escalation state per credit account, newest first",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(10.dp))

        if (snapshot.accountsError != null) {
            Text(
                "/api/recovery did not respond: " + snapshot.accountsError,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.error,
            )
            return@ChaanCard
        }

        if (snapshot.accounts.isEmpty()) {
            Text(
                "No credit accounts under recovery.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            return@ChaanCard
        }

        for ((rung, count) in rungs) {
            KeyValueRow(rung, count.toString() + (if (count == 1) " account" else " accounts"))
        }
        Spacer(Modifier.height(6.dp))
        KeyValueRow("Overdue or defaulted", totals.overdueAccounts.toString() + " accounts")
        KeyValueRow("Overdue exposure", formatInr(totals.overdueExposure))

        if (totals.escalatedBeyondL1 > 0) {
            Spacer(Modifier.height(10.dp))
            StatusPill(
                totals.escalatedBeyondL1.toString() + " PAST L1 - VOICE OR LEGAL STAGE",
                Chaan.Red,
            )
        }
    }
}

@Composable
private fun VerificationCard(snapshot: DashboardSnapshot) {
    val businesses = snapshot.businesses
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom,
        ) {
            Column(Modifier.weight(1f)) {
                Text("Verification pipeline", style = MaterialTheme.typography.titleMedium)
                Text(
                    "Business profiles under due diligence",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Text(
                businesses.size.toString(),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
        }
        Spacer(Modifier.height(10.dp))

        if (snapshot.businessesError != null) {
            Text(
                "/api/businesses did not respond: " + snapshot.businessesError,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.error,
            )
            return@ChaanCard
        }

        if (businesses.isEmpty()) {
            Text(
                "No business profiles submitted for verification.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            return@ChaanCard
        }

        val byStatus = businesses.groupingBy { it.overallStatus }.eachCount()
        for ((status, count) in byStatus.entries.sortedByDescending { it.value }) {
            KeyValueRow(status, count.toString())
        }
        Spacer(Modifier.height(6.dp))
        KeyValueRow("Flagged by the risk engine", businesses.count { it.riskFlag != null }.toString())
        KeyValueRow("Financial documents on file", businesses.sumOf { it.counts?.financialDocuments ?: 0 }.toString())
        KeyValueRow("Court cases recorded", businesses.sumOf { it.counts?.courtCases ?: 0 }.toString())

        Spacer(Modifier.height(8.dp))
        Text(
            "Source status on these profiles is mostly USER_PROVIDED or MANUAL_VERIFICATION: the MCA, " +
                "GST, Udyam and e-Courts adapters open manual tasks rather than pulling live records.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun ActivityCard(items: List<ActivityItem>) {
    if (items.isEmpty()) {
        EmptyBox("Nothing recorded yet on buyers, businesses or recovery.")
        return
    }
    ChaanCard {
        items.forEachIndexed { index, item ->
            if (index > 0) {
                HorizontalDivider(color = MaterialTheme.colorScheme.outline)
            }
            ActivityRow(item)
        }
    }
}

@Composable
private fun ActivityRow(item: ActivityItem) {
    val tint = when (item.kind) {
        ActivityKind.BUYER -> Chaan.Accent
        ActivityKind.BUSINESS -> Chaan.Brand
        ActivityKind.ESCALATION -> Chaan.Amber
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            Modifier
                .padding(top = 5.dp)
                .size(8.dp)
                .clip(RoundedCornerShape(999.dp))
                .background(tint),
        )
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(item.title, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
            Spacer(Modifier.height(2.dp))
            Text(
                item.detail,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Spacer(Modifier.width(10.dp))
        Column(horizontalAlignment = Alignment.End) {
            Text(
                formatWhen(item.at),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (item.flag != RiskFlag.UNKNOWN) {
                Spacer(Modifier.height(4.dp))
                RiskBadge(item.flag)
            }
        }
    }
}

@Composable
private fun FootNote(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(horizontal = 2.dp),
    )
}
