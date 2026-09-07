package com.chaanbean.mobile.feature.admincore.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard

internal fun roleLabel(role: String): String = when (role) {
    AdminRoles.OWNER -> "Owner"
    AdminRoles.TEAM_MEMBER -> "Team member"
    else -> role.replace('_', ' ')
}

/**
 * Sends the chosen role as a query parameter, which is exactly what the server
 * treats as identity. It is a view switch, not a sign-in - see AdminNote below.
 */
@Composable
internal fun AdminRoleSwitch(
    role: String,
    onRole: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RoleButton("Owner", role == AdminRoles.OWNER) { onRole(AdminRoles.OWNER) }
        RoleButton("Team member", role == AdminRoles.TEAM_MEMBER) { onRole(AdminRoles.TEAM_MEMBER) }
    }
}

@Composable
private fun RoleButton(text: String, selected: Boolean, onClick: () -> Unit) {
    if (selected) {
        Button(onClick = onClick) { Text(text) }
    } else {
        OutlinedButton(onClick = onClick) { Text(text) }
    }
}

/** Muted card used to state, in the UI, what the server does and does not actually do. */
@Composable
internal fun AdminNote(text: String, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Chaan.Amber.copy(alpha = 0.10f))
            .padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        Text(
            text,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
internal fun AccessDeniedCard(reason: String, modifier: Modifier = Modifier) {
    ChaanCard(modifier) {
        Text(
            "Refused by the server",
            style = MaterialTheme.typography.titleMedium,
            color = Chaan.Amber,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            reason,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "The role is sent as a query parameter, so this gate is a display rule rather than an "
                + "enforced permission. Switch back to Owner to read the figures.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

/** Dependency-free horizontal bar. `fraction` is clamped so a zero value still renders a stub. */
@Composable
internal fun BarRow(
    label: String,
    value: String,
    fraction: Float,
    tint: Color,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                label,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.width(10.dp))
            Text(value, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
        }
        Spacer(Modifier.height(4.dp))
        Box(
            Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(999.dp))
                .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.35f)),
        ) {
            Box(
                Modifier
                    .fillMaxWidth(fraction.coerceIn(0.02f, 1f))
                    .height(6.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(tint),
            )
        }
    }
}

internal fun healthTint(healthScore: String): Color = when (healthScore) {
    "Healthy" -> Chaan.Green
    "At-Risk" -> Chaan.Amber
    "Churned" -> Chaan.Red
    else -> Chaan.TextMuted
}

/** "gst_supreme_report" reads badly in a list; the server stores the raw key. */
internal fun humanizeKey(raw: String): String =
    raw.split('_').filter { it.isNotBlank() }.joinToString(" ") { word ->
        word.replaceFirstChar { it.uppercaseChar() }
    }
