package com.chaanbean.mobile.core.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.chaanbean.mobile.core.di.ThemeMode

/** Resolves the stored preference against the system setting. */
@Composable
fun ThemeMode.isDark(): Boolean = when (this) {
    ThemeMode.LIGHT -> false
    ThemeMode.DARK -> true
    ThemeMode.SYSTEM -> isSystemInDarkTheme()
}

private val DarkColors = darkColorScheme(
    primary = Chaan.Brand,
    onPrimary = Color.White,
    secondary = Chaan.Accent,
    onSecondary = Chaan.Bg,
    background = Chaan.Bg,
    onBackground = Chaan.TextPrimary,
    surface = Chaan.Card,
    onSurface = Chaan.TextPrimary,
    surfaceVariant = Chaan.Slate,
    onSurfaceVariant = Chaan.TextSecondary,
    outline = Chaan.Border,
    error = Chaan.Red,
)

private val LightColors = lightColorScheme(
    primary = Chaan.Brand,
    onPrimary = Color.White,
    secondary = Chaan.AccentHover,
    onSecondary = Color.White,
    background = Chaan.LightBg,
    onBackground = Chaan.LightTextPrimary,
    surface = Chaan.LightCard,
    onSurface = Chaan.LightTextPrimary,
    surfaceVariant = Color(0xFFF1F5F9),
    onSurfaceVariant = Chaan.LightTextSecondary,
    outline = Chaan.LightBorder,
    error = Chaan.Red,
)

@Composable
fun ChaanBeanTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = ChaanTypography,
        content = content,
    )
}
