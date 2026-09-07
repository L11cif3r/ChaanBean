package com.chaanbean.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.chaanbean.mobile.core.di.LocalAppContainer
import com.chaanbean.mobile.core.i18n.LocalLanguage
import com.chaanbean.mobile.core.i18n.LocalStrings
import com.chaanbean.mobile.core.i18n.stringsFor
import com.chaanbean.mobile.core.ui.ChaanBeanTheme
import com.chaanbean.mobile.core.ui.isDark
import com.chaanbean.mobile.navigation.ChaanBeanApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val container = (application as ChaanBeanApplication).container
        setContent {
            // Read as state so a change in Settings recomposes the whole app at
            // once, the way main's client-side language and theme toggles do.
            val language by container.preferences.language.collectAsState()
            val themeMode by container.preferences.themeMode.collectAsState()

            CompositionLocalProvider(
                LocalAppContainer provides container,
                LocalLanguage provides language,
                LocalStrings provides stringsFor(language),
            ) {
                ChaanBeanTheme(darkTheme = themeMode.isDark()) {
                    ChaanBeanApp()
                }
            }
        }
    }
}
