package com.chaanbean.mobile.feature.arbitration.ui

import androidx.compose.ui.graphics.Color
import com.chaanbean.mobile.core.ui.Chaan
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val IST: ZoneId = ZoneId.of("Asia/Kolkata")
private val DATE_TIME: DateTimeFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm")
private val DATE_ONLY: DateTimeFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy")

/** Prisma serialises DateTime as ISO-8601 UTC; the audience reads IST. */
internal fun formatIsoDateTime(raw: String?): String = format(raw, DATE_TIME)

internal fun formatIsoDate(raw: String?): String = format(raw, DATE_ONLY)

private fun format(raw: String?, formatter: DateTimeFormatter): String {
    if (raw.isNullOrBlank()) return "—"
    return try {
        formatter.withZone(IST).format(Instant.parse(raw))
    } catch (e: Exception) {
        raw
    }
}

internal fun humanize(raw: String): String = raw.replace('_', ' ').uppercase()

internal fun caseStatusTint(status: String): Color = when (status) {
    "award_passed", "closed" -> Chaan.Green
    "settlement_pending", "hearing_scheduled" -> Chaan.Amber
    else -> Chaan.Brand
}

internal fun eSignTint(status: String): Color = when (status) {
    "fully_signed" -> Chaan.Green
    "initiator_signed" -> Chaan.Amber
    else -> Chaan.TextMuted
}

/** Shortens a 64-character SHA-256 so it fits a phone line without hiding it entirely. */
internal fun shortHash(hash: String): String =
    if (hash.length <= 20) hash else hash.take(12) + "…" + hash.takeLast(8)
