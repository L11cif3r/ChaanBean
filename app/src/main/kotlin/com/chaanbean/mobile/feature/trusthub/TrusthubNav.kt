package com.chaanbean.mobile.feature.trusthub

import android.net.Uri
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.chaanbean.mobile.feature.trusthub.ui.CommunityDefaultsScreen
import com.chaanbean.mobile.feature.trusthub.ui.TrustRegisterScreen
import com.chaanbean.mobile.feature.trusthub.ui.TrustVerifyScreen

object TrustHubRoutes {
    /** Drawer entry point. The optional query arg lets other screens deep-link a lookup. */
    const val VERIFY = "trusthub/verify"
    const val REGISTER = "trusthub/register"
    const val DEFAULTS = "trusthub/defaults"

    internal const val VERIFY_PATTERN = "trusthub/verify?query={query}"

    fun verify(query: String): String = "trusthub/verify?query=" + Uri.encode(query)
}

/**
 * Every feature exposes exactly this shape, so the app-level NavHost can compose
 * them without knowing anything about the feature's internals.
 */
fun NavGraphBuilder.trustHubGraph(nav: NavHostController) {
    composable(
        route = TrustHubRoutes.VERIFY_PATTERN,
        arguments = listOf(
            navArgument("query") {
                type = NavType.StringType
                defaultValue = ""
            },
        ),
    ) { entry ->
        TrustVerifyScreen(initialQuery = entry.arguments?.getString("query").orEmpty())
    }

    composable(TrustHubRoutes.REGISTER) {
        TrustRegisterScreen(
            onVerifyIssued = { trustId -> nav.navigate(TrustHubRoutes.verify(trustId)) },
        )
    }

    composable(TrustHubRoutes.DEFAULTS) {
        CommunityDefaultsScreen(
            onOpenVerify = { name -> nav.navigate(TrustHubRoutes.verify(name)) },
        )
    }
}
