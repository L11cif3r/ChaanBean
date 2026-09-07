package com.chaanbean.mobile.core.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.model.RiskFlag

/** Card surface used everywhere; matches the web app's bordered panel. */
@Composable
fun ChaanCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(14.dp))
            .padding(16.dp),
        content = content,
    )
}

@Composable
fun SectionHeader(title: String, subtitle: String? = null, modifier: Modifier = Modifier) {
    Column(modifier = modifier.padding(vertical = 8.dp)) {
        Text(title, style = MaterialTheme.typography.titleLarge)
        if (subtitle != null) {
            Spacer(Modifier.height(2.dp))
            Text(
                subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

/** The Green/Amber/Red pill. Colors come straight from main's palette. */
@Composable
fun RiskBadge(flag: RiskFlag, modifier: Modifier = Modifier) {
    val (bg, fg, label) = when (flag) {
        RiskFlag.GREEN -> Triple(Chaan.Green.copy(alpha = 0.16f), Chaan.Green, "GREEN")
        RiskFlag.AMBER -> Triple(Chaan.Amber.copy(alpha = 0.18f), Chaan.Amber, "AMBER")
        RiskFlag.RED -> Triple(Chaan.Red.copy(alpha = 0.16f), Chaan.Red, "RED")
        RiskFlag.UNKNOWN -> Triple(Chaan.TextMuted.copy(alpha = 0.16f), Chaan.TextMuted, "UNRATED")
    }
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(999.dp))
            .background(bg)
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = fg, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun StatusPill(text: String, tint: Color, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(999.dp))
            .background(tint.copy(alpha = 0.15f))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(text, style = MaterialTheme.typography.labelSmall, color = tint)
    }
}

@Composable
fun KeyValueRow(label: String, value: String, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth().padding(vertical = 5.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(1f),
        )
        Spacer(Modifier.width(12.dp))
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
fun SummaryTile(label: String, value: String, tint: Color? = null, modifier: Modifier = Modifier) {
    ChaanCard(modifier = modifier) {
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            value,
            style = MaterialTheme.typography.headlineMedium,
            color = tint ?: MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
fun LoadingBox(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
    }
}

@Composable
fun ErrorBox(message: String, onRetry: (() -> Unit)? = null, modifier: Modifier = Modifier) {
    ChaanCard(modifier) {
        Text("Something went wrong", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.error)
        Spacer(Modifier.height(6.dp))
        Text(message, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (onRetry != null) {
            Spacer(Modifier.height(12.dp))
            Button(onClick = onRetry) { Text("Retry") }
        }
    }
}

@Composable
fun EmptyBox(message: String, modifier: Modifier = Modifier) {
    ChaanCard(modifier) {
        Text(message, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

/** Renders the three Outcome states so screens never repeat this branch. */
@Composable
fun <T> OutcomeContent(
    outcome: Outcome<T>,
    onRetry: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
    content: @Composable (T) -> Unit,
) {
    when (outcome) {
        is Outcome.Loading -> LoadingBox(modifier)
        is Outcome.Err -> ErrorBox(outcome.message, onRetry, modifier)
        is Outcome.Ok -> content(outcome.value)
    }
}

/** Indian-format currency. main stores money as Float rupees. */
fun formatInr(amount: Double): String {
    val whole = amount.toLong()
    val s = whole.toString()
    if (s.length <= 3) return "\u20B9$s"
    val last3 = s.takeLast(3)
    var rest = s.dropLast(3)
    val parts = mutableListOf<String>()
    while (rest.length > 2) {
        parts.add(0, rest.takeLast(2))
        rest = rest.dropLast(2)
    }
    if (rest.isNotEmpty()) parts.add(0, rest)
    return "\u20B9" + parts.joinToString(",") + "," + last3
}
