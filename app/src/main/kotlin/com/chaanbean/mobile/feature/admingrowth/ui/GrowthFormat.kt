package com.chaanbean.mobile.feature.admingrowth.ui

import androidx.compose.ui.graphics.Color

/** Stage and funnel colours arrive as CSS hex strings straight out of the seed. */
internal fun stageColor(hex: String?, fallback: Color): Color {
    val raw = hex?.trim()?.removePrefix("#") ?: return fallback
    if (raw.length != 6) return fallback
    val parsed = raw.toLongOrNull(16) ?: return fallback
    return Color(parsed or 0xFF000000L)
}

/** Channel and source names are stored snake_case: "paid_search" -> "Paid search". */
internal fun prettyLabel(raw: String): String =
    raw.replace('_', ' ').trim().replaceFirstChar { it.uppercase() }

/** Dates are ISO-8601 strings; the day is all these screens ever show. */
internal fun shortDate(iso: String?): String = iso?.take(10) ?: "—"
