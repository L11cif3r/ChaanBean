package com.chaanbean.mobile.feature.vendors

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.chaanbean.mobile.feature.vendors.ui.VendorsScreen

object VendorsRoutes {
    const val LIST = "vendors"
}

/**
 * Every feature exposes exactly this shape, so the app-level NavHost can compose
 * them without knowing anything about the feature's internals.
 */
fun NavGraphBuilder.vendorsGraph(nav: NavHostController) {
    composable(VendorsRoutes.LIST) { VendorsScreen() }
}
