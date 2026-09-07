package com.chaanbean.mobile.core.ui

import androidx.compose.ui.graphics.Color

// Sampled verbatim from main's tailwind.config.ts `chaan.*` palette so the
// Android client and the web app read as one product rather than two.
object Chaan {
    val Bg = Color(0xFF0B0F17)
    val Card = Color(0xFF131B2A)
    val CardHover = Color(0xFF1A2538)
    val Border = Color(0xFF243247)
    val BorderLight = Color(0xFF334460)
    val TextPrimary = Color(0xFFF8FAFC)
    val TextSecondary = Color(0xFF94A3B8)
    val TextMuted = Color(0xFF64748B)

    val Green = Color(0xFF10B981)
    val GreenDark = Color(0xFF064E3B)
    val Amber = Color(0xFFF59E0B)
    val AmberDark = Color(0xFF78350F)
    val Red = Color(0xFFEF4444)
    val RedDark = Color(0xFF7F1D1D)

    val Navy = Color(0xFF0E1524)
    val Slate = Color(0xFF1E293B)
    val Accent = Color(0xFF38BDF8)
    val AccentHover = Color(0xFF0284C7)
    val Brand = Color(0xFFF44851)
    val BrandLight = Color(0xFFFF6B72)
    val BrandDark = Color(0xFFD9303A)

    // Light-mode surfaces. main defaults to bright mode (commit 3d842f2), so
    // these are the primary scheme, not an afterthought.
    val LightBg = Color(0xFFF8FAFC)
    val LightCard = Color(0xFFFFFFFF)
    val LightBorder = Color(0xFFE2E8F0)
    val LightTextPrimary = Color(0xFF0F172A)
    val LightTextSecondary = Color(0xFF475569)
}
