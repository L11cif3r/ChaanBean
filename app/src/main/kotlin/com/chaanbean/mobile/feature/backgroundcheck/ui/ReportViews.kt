package com.chaanbean.mobile.feature.backgroundcheck.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.StatusPill
import com.chaanbean.mobile.core.ui.formatInr
import com.chaanbean.mobile.feature.backgroundcheck.data.NormalizedReport
import com.chaanbean.mobile.feature.backgroundcheck.data.ReportCatalog
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** Amber-bordered note. Used for everything the server does not really do. */
@Composable
fun CaveatBox(
    text: String,
    title: String = "What the server actually does",
    tint: Color = Chaan.Amber,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(tint.copy(alpha = 0.12f))
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Text(
            title.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = tint,
            fontWeight = FontWeight.Bold,
        )
        Spacer(Modifier.height(4.dp))
        Text(text, style = MaterialTheme.typography.bodySmall)
    }
}

fun statusTint(status: String): Color = when (status) {
    "completed" -> Chaan.Green
    "pending" -> Chaan.Amber
    "failed" -> Chaan.Red
    else -> Chaan.TextMuted
}

/**
 * Renders one NormalizedReport. Field rows come straight from the `data` object the
 * adapter returned - nothing is added, and nothing is marked "verified" that the
 * response did not say.
 */
@Composable
fun ReportCard(report: NormalizedReport, onOpenOtpFlow: (() -> Unit)? = null) {
    val spec = ReportCatalog.spec(report.reportType)
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    spec?.label ?: report.reportType,
                    style = MaterialTheme.typography.titleMedium,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    report.reportType,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            StatusPill(report.status.uppercase(), statusTint(report.status))
        }

        Spacer(Modifier.height(10.dp))
        KeyValueRow("Provider", report.provider.ifBlank { "—" })
        KeyValueRow("Subject", "${report.subjectId} (${report.subjectType})")
        report.fetchedAt?.let { KeyValueRow("Fetched at", it) }
        report.expiresAt?.let { KeyValueRow("Cached until", it) }

        if (report.data.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            Text(
                "RESPONSE",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(4.dp))
            JsonFields(report.data)
        }

        if (report.otpRequired) {
            Spacer(Modifier.height(12.dp))
            CaveatBox(
                title = "otpRequired = true",
                text = "The gateway flagged this report as OTP-gated but returned the payload above " +
                    "anyway - no consent step ran. The separate OTP screen goes through the same " +
                    "adapter and does not add verification.",
            )
            if (onOpenOtpFlow != null) {
                TextButton(onClick = onOpenOtpFlow) { Text("Open the GST OTP flow") }
            }
        }

        val caveat = spec?.caveat
        if (caveat != null) {
            Spacer(Modifier.height(10.dp))
            CaveatBox(caveat)
        }
    }
}

/** Recursive key/value rendering of an arbitrary adapter payload. */
@Composable
fun JsonFields(obj: JsonObject, depth: Int = 0) {
    Column(Modifier.fillMaxWidth()) {
        for ((key, value) in obj) {
            JsonField(key, value, depth)
        }
    }
}

@Composable
private fun JsonField(key: String, value: JsonElement, depth: Int) {
    val label = humanizeKey(key)
    when (value) {
        is JsonPrimitive -> KeyValueRow(label, jsonScalar(key, value))

        is JsonArray -> when {
            value.isEmpty() -> KeyValueRow(label, "None")

            value.all { it is JsonPrimitive } -> KeyValueRow(
                label,
                value.joinToString(", ") { jsonScalar(key, it as JsonPrimitive) },
            )

            depth >= 2 -> KeyValueRow(label, "${value.size} entries")

            else -> {
                Spacer(Modifier.height(6.dp))
                Text(
                    label,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                value.forEachIndexed { index, element ->
                    if (element is JsonObject) {
                        Column(Modifier.padding(start = 10.dp, top = 4.dp)) {
                            Text(
                                "#${index + 1}",
                                style = MaterialTheme.typography.labelSmall,
                                color = Chaan.Accent,
                            )
                            JsonFields(element, depth + 1)
                        }
                    } else {
                        KeyValueRow("#${index + 1}", element.toString())
                    }
                }
            }
        }

        is JsonObject -> if (depth >= 2) {
            KeyValueRow(label, "${value.size} fields")
        } else {
            Spacer(Modifier.height(6.dp))
            Text(
                label,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Column(Modifier.padding(start = 10.dp)) { JsonFields(value, depth + 1) }
        }
    }
}

private val MONEY_KEY_HINTS = listOf(
    "amount",
    "capital",
    "networth",
    "turnover",
    "itcclaimed",
    "creditlimit",
    "outstanding",
    "claim",
)

/** Booleans read as Yes/No; rupee-denominated numbers get Indian grouping. */
fun jsonScalar(key: String, primitive: JsonPrimitive): String {
    if (primitive.isString) return primitive.content
    return when (val raw = primitive.content) {
        "true" -> "Yes"
        "false" -> "No"
        "null" -> "—"
        else -> {
            val number = raw.toDoubleOrNull() ?: return raw
            val lower = key.lowercase()
            val isRupees = MONEY_KEY_HINTS.any { lower.contains(it) } && !lower.contains("usd")
            if (isRupees && number >= 1000) formatInr(number) else raw
        }
    }
}

fun humanizeKey(raw: String): String {
    val spaced = StringBuilder()
    raw.forEachIndexed { index, char ->
        when {
            char == '_' || char == '-' -> spaced.append(' ')
            char.isUpperCase() && index > 0 && raw[index - 1].isLowerCase() -> {
                spaced.append(' ')
                spaced.append(char)
            }
            else -> spaced.append(char)
        }
    }
    return spaced.toString()
        .split(' ')
        .filter { it.isNotBlank() }
        .joinToString(" ") { word -> word.replaceFirstChar { it.uppercaseChar() } }
}
