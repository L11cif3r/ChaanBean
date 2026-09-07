package com.chaanbean.mobile.core.di

import android.content.Context
import com.chaanbean.mobile.core.i18n.Language
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Mirrors main's `darkMode: "class"` toggle, which defaults to bright (commit 3d842f2). */
enum class ThemeMode(val label: String) {
    LIGHT("Bright"),
    DARK("Dark"),
    SYSTEM("Follow system"),
}

/** Device-local display preferences. Nothing here is sent to the server. */
class AppPreferences(context: Context) {
    private val prefs = context.getSharedPreferences("chaanbean.prefs", Context.MODE_PRIVATE)

    private val _language = MutableStateFlow(Language.from(prefs.getString(KEY_LANG, null)))
    val language: StateFlow<Language> = _language.asStateFlow()

    private val _themeMode = MutableStateFlow(
        runCatching { ThemeMode.valueOf(prefs.getString(KEY_THEME, null) ?: ThemeMode.LIGHT.name) }
            .getOrDefault(ThemeMode.LIGHT)
    )
    val themeMode: StateFlow<ThemeMode> = _themeMode.asStateFlow()

    fun setLanguage(language: Language) {
        prefs.edit().putString(KEY_LANG, language.code).apply()
        _language.value = language
    }

    fun setThemeMode(mode: ThemeMode) {
        prefs.edit().putString(KEY_THEME, mode.name).apply()
        _themeMode.value = mode
    }

    private companion object {
        const val KEY_LANG = "language"
        const val KEY_THEME = "themeMode"
    }
}
