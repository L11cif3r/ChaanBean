package com.chaanbean.mobile.feature.admingrowth.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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
import com.chaanbean.mobile.feature.admingrowth.data.AdminGrowthModule
import com.chaanbean.mobile.feature.admingrowth.data.FunnelStage
import com.chaanbean.mobile.feature.admingrowth.data.MarketingChannelRow
import com.chaanbean.mobile.feature.admingrowth.data.MarketingResponse
import com.chaanbean.mobile.feature.admingrowth.data.TrustHubReferrals

@Composable
fun MarketingScreen() {
    val vm = rememberVm { MarketingViewModel(AdminGrowthModule.repository(it)) }
    val state by vm.state.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            SectionHeader(
                "Marketing Attribution",
                "Channel cost, CPL, CAC and conversion, computed by the server from lead attribution rows.",
            )
        }
        when (val data = state.data) {
            is Outcome.Loading -> item { LoadingBox() }
            is Outcome.Err -> item { ErrorBox(data.message, onRetry = { vm.refresh() }) }
            is Outcome.Ok -> {
                val report = data.value
                item { MarketingKpis(report) }
                item { SpendCaveat() }
                item {
                    Text("Pipeline funnel", style = MaterialTheme.typography.titleMedium)
                }
                if (report.pipelineStages.isEmpty()) {
                    item { EmptyBox("The server returned no pipeline stages.") }
                } else {
                    item { FunnelCard(report.pipelineStages) }
                }
                item {
                    Text("Channels", style = MaterialTheme.typography.titleMedium)
                }
                if (report.channels.isEmpty()) {
                    item { EmptyBox("No marketing channels are configured on the server.") }
                } else {
                    items(report.channels, key = { it.id }) { channel ->
                        ChannelCard(
                            channel = channel,
                            expanded = state.expandedChannelId == channel.id,
                            onToggle = { vm.toggleChannel(channel.id) },
                        )
                    }
                }
                item { TrustHubCard(report.trustHubReferrals) }
            }
        }
        item { Spacer(Modifier.height(32.dp)) }
    }
}

@Composable
private fun MarketingKpis(report: MarketingResponse) {
    val spend = report.channels.sumOf { it.totalCost }
    val wonRevenue = report.channels.sumOf { it.revenueWon }
    val attributedLeads = report.channels.sumOf { it.leadsCount }
    val attributedWins = report.channels.sumOf { it.wonCount }
    LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            SummaryTile("Channel budget", formatInr(spend), modifier = Modifier.width(210.dp))
        }
        item {
            SummaryTile(
                "Attributed won revenue",
                formatInr(wonRevenue),
                tint = Chaan.Green,
                modifier = Modifier.width(230.dp),
            )
        }
        item {
            SummaryTile(
                "Blended CAC",
                if (attributedWins > 0) formatInr(spend / attributedWins) else "—",
                tint = Chaan.Accent,
                modifier = Modifier.width(210.dp),
            )
        }
        item {
            SummaryTile("Attributed leads", attributedLeads.toString(), modifier = Modifier.width(180.dp))
        }
        item {
            SummaryTile("Attributed wins", attributedWins.toString(), modifier = Modifier.width(180.dp))
        }
    }
}

@Composable
private fun SpendCaveat() {
    ChaanCard {
        Text("How these numbers are produced", style = MaterialTheme.typography.titleSmall)
        Spacer(Modifier.height(6.dp))
        Text(
            "Spend is each channel's budget column alone. This endpoint does not fold campaign-source " +
                "cost into it, though the web dashboard does, so the two reports disagree on total " +
                "spend; per-campaign cost is listed under each channel below.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            "Blended CAC above divides that budget by wins the server could attribute to a channel, " +
                "not by every won deal. Leads with no attribution row are counted nowhere.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun FunnelCard(stages: List<FunnelStage>) {
    val maxCount = stages.maxOf { it.count }
    ChaanCard {
        stages.forEach { stage ->
            val tint = stageColor(stage.color, Chaan.Accent)
            Column(Modifier.padding(vertical = 6.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(stage.stage, style = MaterialTheme.typography.bodyMedium)
                    Text(
                        "${stage.count} · ${formatInr(stage.value)}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Spacer(Modifier.height(4.dp))
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(999.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                ) {
                    if (stage.count > 0 && maxCount > 0) {
                        val fraction = (stage.count.toFloat() / maxCount).coerceIn(0.04f, 1f)
                        Box(
                            Modifier
                                .fillMaxWidth(fraction)
                                .height(6.dp)
                                .clip(RoundedCornerShape(999.dp))
                                .background(tint),
                        )
                    }
                }
            }
        }
        Spacer(Modifier.height(6.dp))
        Text(
            "Counts are live deal counts per stage, not a historical conversion funnel: a deal appears " +
                "only in the stage it currently sits in.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun ChannelCard(
    channel: MarketingChannelRow,
    expanded: Boolean,
    onToggle: () -> Unit,
) {
    ChaanCard(modifier = Modifier.clickable { onToggle() }) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(prettyLabel(channel.name), style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(4.dp))
                StatusPill(text = channel.type.uppercase(), tint = Chaan.Accent)
            }
            Spacer(Modifier.width(12.dp))
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    formatInr(channel.revenueWon),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (channel.revenueWon > 0) Chaan.Green else MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    "won revenue",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Spacer(Modifier.height(10.dp))
        KeyValueRow("Budget", formatInr(channel.totalCost))
        KeyValueRow("Leads attributed", channel.leadsCount.toString())
        KeyValueRow("Cost per lead", if (channel.cpl > 0) formatInr(channel.cpl) else "—")
        KeyValueRow("Won deals", channel.wonCount.toString())
        KeyValueRow("CAC", if (channel.cac > 0) formatInr(channel.cac) else "—")
        KeyValueRow("Conversion", "${channel.convRate}%")

        if (channel.sources.isEmpty()) {
            Spacer(Modifier.height(8.dp))
            Text(
                "No campaign sources recorded for this channel.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else if (!expanded) {
            Spacer(Modifier.height(8.dp))
            Text(
                "${channel.sources.size} campaign source(s) — tap to expand",
                style = MaterialTheme.typography.labelSmall,
                color = Chaan.Accent,
            )
        } else {
            Spacer(Modifier.height(10.dp))
            Text("Campaign sources", style = MaterialTheme.typography.titleSmall)
            channel.sources.forEach { source ->
                Column(Modifier.padding(top = 8.dp)) {
                    Text(source.name, style = MaterialTheme.typography.bodyMedium)
                    if (source.utmCampaign != null) {
                        Text(
                            "utm_campaign=${source.utmCampaign}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Spacer(Modifier.height(4.dp))
                    KeyValueRow("Campaign cost", formatInr(source.cost))
                    KeyValueRow("Leads (stored counter)", source.leadsCount.toString())
                    KeyValueRow("Deals (stored counter)", source.dealsCount.toString())
                }
            }
            Spacer(Modifier.height(6.dp))
            Text(
                "These two counters are columns on the campaign source; nothing in the API recomputes " +
                    "them from live leads or deals, so they can drift from the channel totals above.",
                style = MaterialTheme.typography.bodySmall,
                color = Chaan.Amber,
            )
        }
    }
}

@Composable
private fun TrustHubCard(referrals: TrustHubReferrals) {
    ChaanCard {
        Text("Trust Hub peer referrals", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        KeyValueRow("Referral attributions", referrals.totalReferrals.toString())
        KeyValueRow("Converted to Won", referrals.convertedCount.toString())
        Spacer(Modifier.height(8.dp))
        Text(
            "These are the only two figures the endpoint returns for the referral loop. The web " +
                "dashboard's K-factor and its larger invite totals are not computed by the server, " +
                "so they are not shown here.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
