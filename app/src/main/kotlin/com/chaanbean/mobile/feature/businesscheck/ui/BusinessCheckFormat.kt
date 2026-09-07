package com.chaanbean.mobile.feature.businesscheck.ui

import androidx.compose.ui.graphics.Color
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.formatInr
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlin.math.abs

private val IST: ZoneId = ZoneId.of("Asia/Kolkata")
private val DATE_TIME: DateTimeFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm")
private val DATE_ONLY: DateTimeFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy")

internal const val EM_DASH = "—"

/** Prisma serialises DateTime as ISO-8601 UTC; the audience reads IST. */
internal fun formatDateTime(raw: String?): String = formatIso(raw, DATE_TIME)

internal fun formatDate(raw: String?): String = formatIso(raw, DATE_ONLY)

private fun formatIso(raw: String?, formatter: DateTimeFormatter): String {
    if (raw.isNullOrBlank()) return EM_DASH
    return try {
        formatter.withZone(IST).format(Instant.parse(raw))
    } catch (e: Exception) {
        // Manually entered dates arrive as plain "2017-07-01"; show them as typed.
        raw
    }
}

/** Crore/lakh shorthand, as the web module renders money on these screens. */
internal fun compactInr(value: Double?): String {
    if (value == null) return EM_DASH
    val magnitude = abs(value)
    val sign = if (value < 0) "-" else ""
    return when {
        magnitude >= 10_000_000.0 -> sign + "₹" + String.format("%.2f", magnitude / 10_000_000.0) + "Cr"
        magnitude >= 100_000.0 -> sign + "₹" + String.format("%.2f", magnitude / 100_000.0) + "L"
        else -> sign + formatInr(magnitude)
    }
}

internal fun formatPct(value: Double?): String =
    if (value == null) EM_DASH else String.format("%.1f", value) + "%"

internal fun formatRatio(value: Double?): String =
    if (value == null) EM_DASH else String.format("%.2f", value)

/**
 * dataCompleteness arrives as a 0-100 percentage from the summariser but the web
 * table multiplies by 100, so anything at or below 1 is read as a fraction.
 */
internal fun completenessPct(value: Double): Int =
    if (value <= 1.0) (value * 100).toInt() else value.toInt()

internal fun humanizeStatus(raw: String?): String =
    if (raw.isNullOrBlank()) "UNKNOWN" else raw.trim().replace('_', ' ').uppercase()

/** "GST_MANUAL" -> "GST", which is the `type` the manual-verify endpoint expects. */
internal fun sourceTypeOf(reviewType: String): String =
    reviewType.removeSuffix("_MANUAL").removeSuffix("_EXTRACTION").uppercase()

internal fun sourceLabel(sourceType: String): String = when (sourceType.uppercase()) {
    "GST" -> "GST registration"
    "MCA" -> "MCA master data"
    "UDYAM" -> "Udyam / MSME"
    "ECOURTS" -> "eCourts records"
    else -> sourceType
}

internal fun portalUrlFor(sourceType: String): String? = when (sourceType.uppercase()) {
    "GST" -> "https://services.gst.gov.in/services/searchtp"
    "MCA" -> "https://www.mca.gov.in/content/mca/global/en/mca/master-data/MDS.html"
    "UDYAM" -> "https://udyamregistration.gov.in/UdyamVerifyRegistration/UdyamVerifyRegistration.aspx"
    "ECOURTS" -> "https://ecourts.gov.in/ecourts_home/"
    else -> null
}

internal fun signalTint(color: String?): Color = when (color?.uppercase()) {
    "GREEN" -> Chaan.Green
    "AMBER" -> Chaan.Amber
    "RED" -> Chaan.Red
    else -> Chaan.TextMuted
}

/**
 * USER_PROVIDED is amber rather than green on purpose: it is an operator's
 * transcription of a government portal, not a machine-verified record.
 */
internal fun sourceStatusTint(status: String?): Color = when (status?.uppercase()) {
    "LIVE" -> Chaan.Green
    "PUBLIC_LOOKUP" -> Chaan.Accent
    "USER_PROVIDED", "MANUAL_VERIFICATION" -> Chaan.Amber
    "DEMO" -> Chaan.Brand
    else -> Chaan.TextMuted
}

internal fun sourceStatusNote(status: String?): String = when (status?.uppercase()) {
    "USER_PROVIDED" -> "Typed in by an operator after a manual portal lookup. Not an API response."
    "MANUAL_VERIFICATION" -> "Waiting on an operator to read the portal and enter what they saw."
    "PUBLIC_LOOKUP" -> "Read from a public endpoint that needs no credentials."
    "LIVE" -> "Returned by a live authenticated feed."
    "UNAVAILABLE" -> "Not collected. No record exists for this source."
    else -> "Not collected yet."
}

internal fun taskStatusTint(status: String?): Color = when (status?.uppercase()) {
    "COMPLETED" -> Chaan.Green
    "AWAITING_MANUAL" -> Chaan.Amber
    "FAILED" -> Chaan.Red
    else -> Chaan.TextMuted
}

internal fun processingTint(status: String?): Color = when (status?.uppercase()) {
    "COMPLETED" -> Chaan.Green
    "FAILED" -> Chaan.Red
    "MANUAL_REVIEW_REQUIRED" -> Chaan.Amber
    else -> Chaan.TextMuted
}

internal fun caseStatusTint(status: String?): Color = when (status?.uppercase()) {
    "ACTIVE", "PENDING" -> Chaan.Red
    "DISPOSED", "CLOSED" -> Chaan.TextMuted
    else -> Chaan.Amber
}

internal fun scoreTint(score: Double): Color = when {
    score >= 65.0 -> Chaan.Green
    score >= 35.0 -> Chaan.Amber
    else -> Chaan.Red
}

internal fun formatBytes(bytes: Int): String = when {
    bytes >= 1_048_576 -> String.format("%.1f", bytes / 1_048_576.0) + " MB"
    bytes >= 1024 -> String.format("%.0f", bytes / 1024.0) + " KB"
    else -> "$bytes B"
}
