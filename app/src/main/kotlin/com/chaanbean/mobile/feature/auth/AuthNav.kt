package com.chaanbean.mobile.feature.auth

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.chaanbean.mobile.feature.auth.ui.IntroScreen
import com.chaanbean.mobile.feature.auth.ui.LoginScreen

object AuthRoutes {
    const val INTRO = "intro"
    const val LOGIN = "login"

    /**
     * Where the flow hands off once a session exists. The auth graph cannot know which
     * other features the host NavHost registered, so it takes the first of these that
     * actually resolves.
     */
    val HANDOFF = listOf("dashboard", "home", "overview", "vendors")
}

fun NavGraphBuilder.authGraph(nav: NavHostController) {
    composable(AuthRoutes.INTRO) {
        IntroScreen(onContinue = { nav.openLogin() })
    }
    composable(AuthRoutes.LOGIN) {
        LoginScreen(
            onWatchIntro = { nav.navigate(AuthRoutes.INTRO) },
            onEnterApp = { nav.leaveAuth() },
        )
    }
}

private fun NavHostController.openLogin() {
    navigate(AuthRoutes.LOGIN) {
        popUpTo(AuthRoutes.INTRO) { inclusive = true }
        launchSingleTop = true
    }
}

/** False when no handoff route is registered, so the login screen can say so. */
private fun NavHostController.leaveAuth(): Boolean {
    val target = AuthRoutes.HANDOFF.firstOrNull { graph.findNode(it) != null } ?: return false
    navigate(target) {
        popUpTo(AuthRoutes.LOGIN) { inclusive = true }
        launchSingleTop = true
    }
    return true
}
