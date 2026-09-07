package com.chaanbean.mobile.core.i18n

import androidx.compose.runtime.staticCompositionLocalOf

/**
 * Current language's strings. Defaults to English so a composable preview or a
 * screen rendered outside the app shell still reads correctly.
 */
val LocalStrings = staticCompositionLocalOf { stringsFor(Language.EN) }

val LocalLanguage = staticCompositionLocalOf { Language.EN }
