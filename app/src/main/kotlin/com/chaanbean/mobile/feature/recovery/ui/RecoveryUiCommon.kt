package com.chaanbean.mobile.feature.recovery.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.ui.Chaan

/** Level strings the server writes: L1, L2, L3, and "Resolved" after a full settlement. */
internal fun levelTint(level: String?): Color = when (level?.trim()?.uppercase()) {
    "L1" -> Chaan.Accent
    "L2" -> Chaan.Amber
    "L3" -> Chaan.Red
    "RESOLVED" -> Chaan.Green
    else -> Chaan.TextMuted
}

internal fun channelLabel(channel: String?): String = when (channel?.lowercase()) {
    "voice" -> "Voice"
    "whatsapp" -> "WhatsApp"
    "email" -> "Email"
    "sms" -> "SMS"
    "legal_notice" -> "Legal notice"
    "arbitration" -> "Arbitration"
    null, "" -> "—"
    else -> channel
}

/** A small banner for the things main's server does not actually do. */
@Composable
internal fun CaveatNote(text: String, tint: Color = Chaan.Amber, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(tint.copy(alpha = 0.12f))
            .padding(PaddingValues(horizontal = 12.dp, vertical = 10.dp)),
    ) {
        Text(text, style = MaterialTheme.typography.bodySmall, color = tint)
    }
}

@Composable
internal fun MonoValue(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        fontWeight = FontWeight.Normal,
        modifier = modifier,
    )
}
