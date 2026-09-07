package com.chaanbean.mobile.feature.search

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.chaanbean.mobile.feature.search.ui.SearchScreen

object SearchRoutes {
    const val HOME = "search"
}

/**
 * Search is a single leaf destination. Results carry a web page path rather than a
 * record route, so nothing here navigates onward; `nav` is accepted to keep the
 * feature-graph signature uniform for the app-level NavHost.
 */
fun NavGraphBuilder.searchGraph(nav: NavHostController) {
    composable(SearchRoutes.HOME) { SearchScreen() }
}
