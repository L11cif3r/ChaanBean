package com.chaanbean.mobile.core.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.di.ThemeMode

/** Resolves the stored preference against the system setting. */
@Composable
fun ThemeMode.isDark(): Boolean = when (this) {
    ThemeMode.LIGHT -> false
    ThemeMode.DARK -> true
    ThemeMode.SYSTEM -> isSystemInDarkTheme()
}

/**
 * Generous radii. The reference rounds panels to roughly a quarter of their
 * short edge and makes every control a full pill, which is what stops a dense
 * data screen reading like a spreadsheet.
 */
val ChaanShapes = Shapes(
    extraSmall = RoundedCornerShape(12.dp),
    small = RoundedCornerShape(16.dp),
    medium = RoundedCornerShape(22.dp),
    large = RoundedCornerShape(28.dp),
    extraLarge = RoundedCornerShape(34.dp),
)

private val DarkColors = darkColorScheme(
    primary = Chaan.Brand,               // cream pill
    onPrimary = Chaan.Ink,               // near-black label on it
    secondary = Chaan.Clay,
    onSecondary = Chaan.TextPrimary,
    background = Chaan.Bg,
    onBackground = Chaan.TextPrimary,
    surface = Chaan.Card,
    onSurface = Chaan.TextPrimary,
    surfaceVariant = Chaan.Slate,
    onSurfaceVariant = Chaan.TextSecondary,
    outline = Chaan.Border,
    outlineVariant = Chaan.BorderLight,
    error = Chaan.Red,
    onError = Chaan.TextPrimary,
)

private val LightColors = lightColorScheme(
    primary = Chaan.Ink,                 // near-black pill on ivory
    onPrimary = Chaan.BrandLight,
    secondary = Chaan.Clay,
    onSecondary = Chaan.BrandLight,
    background = Chaan.LightBg,
    onBackground = Chaan.LightTextPrimary,
    surface = Chaan.LightCard,
    onSurface = Chaan.LightTextPrimary,
    surfaceVariant = Chaan.LightSurfaceVariant,
    onSurfaceVariant = Chaan.LightTextSecondary,
    outline = Chaan.LightBorder,
    outlineVariant = Chaan.LightBorder,
    error = Chaan.Red,
    onError = Chaan.BrandLight,
)

@Composable
fun ChaanBeanTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = ChaanTypography,
        shapes = ChaanShapes,
        content = content,
    )
}
