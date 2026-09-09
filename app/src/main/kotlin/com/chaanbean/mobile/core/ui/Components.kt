package com.chaanbean.mobile.core.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.model.RiskFlag

private val CardShape = RoundedCornerShape(26.dp)
private val Pill = RoundedCornerShape(999.dp)

/**
 * The panel every screen is built from. Softly rounded, hairline-bordered and
 * filled with a faint vertical wash, so a stack reads as layered paper rather
 * than flat blocks.
 */
@Composable
fun ChaanCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    val scheme = MaterialTheme.colorScheme
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(CardShape)
            .background(
                Brush.verticalGradient(
                    listOf(scheme.surface, scheme.surface.copy(alpha = 0.92f)),
                )
            )
            .border(1.dp, scheme.outline.copy(alpha = 0.7f), CardShape)
            .padding(horizontal = 18.dp, vertical = 18.dp),
        content = content,
    )
}

@Composable
fun SectionHeader(title: String, subtitle: String? = null, modifier: Modifier = Modifier) {
    Column(modifier = modifier.padding(top = 14.dp, bottom = 6.dp)) {
        Text(title, style = MaterialTheme.typography.headlineMedium)
        if (subtitle != null) {
            Spacer(Modifier.height(5.dp))
            Text(
                subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

/** The Green/Amber/Red flag — the one place these colours are permitted. */
@Composable
fun RiskBadge(flag: RiskFlag, modifier: Modifier = Modifier) {
    val (tint, label) = when (flag) {
        RiskFlag.GREEN -> Chaan.Green to "GREEN"
        RiskFlag.AMBER -> Chaan.Amber to "AMBER"
        RiskFlag.RED -> Chaan.Red to "RED"
        RiskFlag.UNKNOWN -> Chaan.TextMuted to "UNRATED"
    }
    Box(
        modifier = modifier
            .clip(Pill)
            .background(tint.copy(alpha = 0.15f))
            .border(1.dp, tint.copy(alpha = 0.45f), Pill)
            .padding(horizontal = 12.dp, vertical = 5.dp),
    ) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = tint, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun StatusPill(text: String, tint: Color, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .clip(Pill)
            .background(tint.copy(alpha = 0.13f))
            .border(1.dp, tint.copy(alpha = 0.35f), Pill)
            .padding(horizontal = 12.dp, vertical = 5.dp),
    ) {
        Text(text, style = MaterialTheme.typography.labelSmall, color = tint)
    }
}

/** Label left, value right, over a hairline so long lists stay scannable. */
@Composable
fun KeyValueRow(label: String, value: String, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(vertical = 9.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Text(
                label,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.width(14.dp))
            Text(
                value,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.weight(1f),
            )
        }
        Box(
            Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.35f))
        )
    }
}

/** Metric tile: wide-tracked kicker over a large, lightly-set figure. */
@Composable
fun SummaryTile(label: String, value: String, tint: Color? = null, modifier: Modifier = Modifier) {
    ChaanCard(modifier = modifier) {
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(10.dp))
        Text(
            value,
            style = MaterialTheme.typography.headlineMedium,
            color = tint ?: MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
fun LoadingBox(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = Chaan.Clay, strokeWidth = 2.dp)
    }
}

@Composable
fun ErrorBox(message: String, onRetry: (() -> Unit)? = null, modifier: Modifier = Modifier) {
    ChaanCard(modifier) {
        Text("SOMETHING WENT WRONG", style = MaterialTheme.typography.labelSmall, color = Chaan.Red)
        Spacer(Modifier.height(8.dp))
        Text(message, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (onRetry != null) {
            Spacer(Modifier.height(16.dp))
            PillButton("Retry", onClick = onRetry)
        }
    }
}

@Composable
fun EmptyBox(message: String, modifier: Modifier = Modifier) {
    ChaanCard(modifier) {
        Text(message, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

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

// ------------------------------------------------------- editorial additions

/** Full-width pill CTA — cream on espresso, near-black on ivory. */
@Composable
fun PillButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        shape = Pill,
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
        ),
        contentPadding = PaddingValues(vertical = 17.dp),
        modifier = modifier.fillMaxWidth(),
    ) {
        Text(label, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
    }
}

/** Translucent circular control, as used for back / search / favourite. */
@Composable
fun CircleIconButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    diameter: Int = 42,
    content: @Composable () -> Unit,
) {
    Box(
        modifier = modifier
            .size(diameter.dp)
            .clip(Pill)
            .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.10f))
            .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f), Pill)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        content()
    }
}

/** Filter chip; passing `onRemove` draws the trailing ×. */
@Composable
fun FilterChip(
    label: String,
    modifier: Modifier = Modifier,
    selected: Boolean = false,
    onClick: (() -> Unit)? = null,
    onRemove: (() -> Unit)? = null,
) {
    val scheme = MaterialTheme.colorScheme
    val bg = if (selected) Chaan.Clay.copy(alpha = 0.22f) else scheme.onSurface.copy(alpha = 0.06f)
    val edge = if (selected) Chaan.Clay else scheme.outline
    Row(
        modifier = modifier
            .clip(Pill)
            .background(bg)
            .border(1.dp, edge.copy(alpha = 0.7f), Pill)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 14.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = if (selected) scheme.onSurface else scheme.onSurfaceVariant,
        )
        if (onRemove != null) {
            Spacer(Modifier.width(8.dp))
            Text(
                "×",
                style = MaterialTheme.typography.bodyMedium,
                color = scheme.onSurfaceVariant,
                modifier = Modifier.clickable(onClick = onRemove),
            )
        }
    }
}

/** Wide-tracked kicker, the "BEAUTY STUDIO" line in the reference. */
@Composable
fun Kicker(text: String, modifier: Modifier = Modifier, tint: Color? = null) {
    Text(
        text.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        color = tint ?: MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = modifier,
    )
}

/** Floating pill bar that hovers over content, like the reference's action bar. */
@Composable
fun FloatingBar(
    modifier: Modifier = Modifier,
    content: @Composable RowScope.() -> Unit,
) {
    Row(
        modifier = modifier
            .clip(Pill)
            .background(Chaan.Ink.copy(alpha = 0.92f))
            .border(1.dp, Chaan.BorderLight.copy(alpha = 0.6f), Pill)
            .padding(horizontal = 10.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        content = content,
    )
}

/** Indian-format currency. main stores money as Float rupees. */
fun formatInr(amount: Double): String {
    val whole = amount.toLong()
    val s = whole.toString()
    if (s.length <= 3) return "₹$s"
    val last3 = s.takeLast(3)
    var rest = s.dropLast(3)
    val parts = mutableListOf<String>()
    while (rest.length > 2) {
        parts.add(0, rest.takeLast(2))
        rest = rest.dropLast(2)
    }
    if (rest.isNotEmpty()) parts.add(0, rest)
    return "₹" + parts.joinToString(",") + "," + last3
}
