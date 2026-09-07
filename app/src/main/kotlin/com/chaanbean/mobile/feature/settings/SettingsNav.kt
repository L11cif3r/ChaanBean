package com.chaanbean.mobile.feature.settings

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.chaanbean.mobile.feature.settings.ui.DiagnosticsScreen
import com.chaanbean.mobile.feature.settings.ui.DisplaySettingsScreen
import com.chaanbean.mobile.feature.settings.ui.SettingsScreen

object SettingsRoutes {
    const val SETTINGS = "settings"
    const val DIAGNOSTICS = "settings/diagnostics"
    const val DISPLAY = "settings/display"
}

/**
 * Every feature exposes exactly this shape, so the app-level NavHost can compose
 * them without knowing anything about the feature's internals.
 */
fun NavGraphBuilder.settingsGraph(nav: NavHostController) {
    composable(SettingsRoutes.SETTINGS) {
        SettingsScreen(onOpenDiagnostics = { nav.navigate(SettingsRoutes.DIAGNOSTICS) })
    }
    composable(SettingsRoutes.DIAGNOSTICS) {
        DiagnosticsScreen(onBack = { nav.popBackStack() })
    }
    composable(SettingsRoutes.DISPLAY) {
        DisplaySettingsScreen()
    }
}
