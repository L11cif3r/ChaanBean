package com.chaanbean.mobile.core.ui

import androidx.compose.ui.graphics.Color

/**
 * Warm editorial palette: espresso grounds, cream surfaces, clay accents.
 *
 * The token NAMES are unchanged from the earlier slate/red theme because ~35
 * screens reference them directly; only the values moved. `Accent` and `Brand`
 * are warm neutrals now rather than sky blue and red, so the chrome reads as
 * one material instead of two.
 *
 * Green / Amber / Red are the exception. They are the product's actual output —
 * main's deterministic risk flag — so they stay recognisably semantic and are
 * warmed only enough to sit in the palette. Nothing decorative may use them.
 */
object Chaan {
    // Grounds
    val Bg = Color(0xFF16110F)          // espresso
    val Card = Color(0xFF241D19)        // cocoa
    val CardHover = Color(0xFF2F2621)   // mocha
    val Border = Color(0xFF3A2E28)
    val BorderLight = Color(0xFF4B3C34)

    // Ink on dark
    val TextPrimary = Color(0xFFF3ECE3)  // cream
    val TextSecondary = Color(0xFFB6A395)
    val TextMuted = Color(0xFF8A7768)

    // Risk semantics — reserved, never decorative
    val Green = Color(0xFF5FA37C)
    val GreenDark = Color(0xFF1E3A2C)
    val Amber = Color(0xFFD9A05B)
    val AmberDark = Color(0xFF4A3418)
    val Red = Color(0xFFC96A54)
    val RedDark = Color(0xFF48231B)

    // Warm neutrals replacing the old navy / slate / sky / red chrome
    val Navy = Color(0xFF1C1512)
    val Slate = Color(0xFF2A211C)
    val Accent = Color(0xFFC9AE94)       // sand — links and active states
    val AccentHover = Color(0xFFB08968)  // clay
    val Brand = Color(0xFFE8DDD0)        // cream: primary CTA on dark
    val BrandLight = Color(0xFFFBF7F2)
    val BrandDark = Color(0xFFB08968)

    // Light mode: ivory paper rather than white
    val LightBg = Color(0xFFF6F1EA)
    val LightCard = Color(0xFFFDFAF6)
    val LightBorder = Color(0xFFE3D8CA)
    val LightSurfaceVariant = Color(0xFFF0E8DC)
    val LightTextPrimary = Color(0xFF1F1815)
    val LightTextSecondary = Color(0xFF6B5A4E)

    // Added by the editorial pass
    val Clay = Color(0xFFB08968)
    val Sand = Color(0xFFC9AE94)
    val Ink = Color(0xFF14100E)          // near-black pill CTA on cream
    val Scrim = Color(0x66120D0B)        // frosted overlay on imagery
}
