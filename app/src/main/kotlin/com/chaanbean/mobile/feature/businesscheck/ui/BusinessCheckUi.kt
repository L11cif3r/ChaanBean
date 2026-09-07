package com.chaanbean.mobile.feature.businesscheck.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.StatusPill

/** Collapsible panel; the web module renders the same profile as accordions. */
@Composable
internal fun ExpandableCard(
    title: String,
    subtitle: String? = null,
    initiallyExpanded: Boolean = true,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    var expanded by rememberSaveable { mutableStateOf(initiallyExpanded) }
    ChaanCard(modifier = modifier) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { expanded = !expanded },
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium)
                if (subtitle != null) {
                    Spacer(Modifier.height(2.dp))
                    Text(
                        subtitle,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.width(12.dp))
            Text(
                if (expanded) "Hide" else "Show",
                style = MaterialTheme.typography.labelMedium,
                color = Chaan.Accent,
            )
        }
        if (expanded) {
            Spacer(Modifier.height(10.dp))
            content()
        }
    }
}

@Composable
internal fun SelectChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val tint = if (selected) Chaan.Brand else MaterialTheme.colorScheme.outline
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(999.dp))
            .border(1.dp, tint, RoundedCornerShape(999.dp))
            .background(if (selected) Chaan.Brand.copy(alpha = 0.12f) else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 7.dp),
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = if (selected) Chaan.Brand else MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
        )
    }
}

/** Provenance marker for one field or source record. */
@Composable
internal fun SourceStatusPill(status: String?, modifier: Modifier = Modifier) {
    StatusPill(
        text = humanizeStatus(status ?: "UNAVAILABLE"),
        tint = sourceStatusTint(status),
        modifier = modifier,
    )
}

/** A labelled value plus the provenance of the source that supplied it. */
@Composable
internal fun ProvenancedField(
    label: String,
    value: String?,
    sourceStatus: String?,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(3.dp))
        Text(
            value?.takeIf { it.isNotBlank() } ?: "Not provided",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
        )
        if (sourceStatus != null) {
            Spacer(Modifier.height(5.dp))
            SourceStatusPill(sourceStatus)
        }
    }
}

/** Horizontal bar; avoids a determinate progress indicator so the label stays exact. */
@Composable
internal fun ScoreBar(fraction: Float, tint: Color, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(8.dp)
            .clip(RoundedCornerShape(999.dp))
            .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.35f)),
    ) {
        Box(
            Modifier
                .fillMaxWidth(fraction.coerceIn(0f, 1f))
                .height(8.dp)
                .clip(RoundedCornerShape(999.dp))
                .background(tint),
        )
    }
}

@Composable
internal fun PortalButton(sourceType: String, url: String, modifier: Modifier = Modifier) {
    val uriHandler = LocalUriHandler.current
    TextButton(onClick = { uriHandler.openUri(url) }, modifier = modifier) {
        Text("Open the official ${sourceType.uppercase()} portal")
    }
}

/**
 * V0 has no live MCA/GST/Udyam/eCourts feed. Every screen in this module says so
 * once, so nothing here reads as an independently verified government record.
 */
@Composable
internal fun ProvenanceNote(modifier: Modifier = Modifier) {
    ChaanCard(modifier = modifier) {
        Text("How this data was collected", style = MaterialTheme.typography.titleSmall)
        Spacer(Modifier.height(6.dp))
        Text(
            "Business Check runs in public-data mode. MCA, GST, Udyam and eCourts " +
                "records are not fetched from government APIs: an operator opens the " +
                "portal, reads the page and types in what they saw, and the server " +
                "files it as USER_PROVIDED. Financial figures come from documents you " +
                "upload. Nothing on these screens is independently verified.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
