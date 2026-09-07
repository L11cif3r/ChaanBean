package com.chaanbean.mobile.feature.recovery

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.chaanbean.mobile.feature.recovery.ui.RecoveryEscalationScreen
import com.chaanbean.mobile.feature.recovery.ui.RecoverySettlementScreen
import com.chaanbean.mobile.feature.recovery.ui.RecoveryWorklistScreen

object RecoveryRoutes {
    const val ARG_ACCOUNT_ID = "creditAccountId"

    const val WORKLIST = "recovery"
    const val ESCALATION = "recovery/account/{creditAccountId}"
    const val SETTLEMENT = "recovery/settle/{creditAccountId}"

    fun escalation(creditAccountId: String) = "recovery/account/$creditAccountId"
    fun settlement(creditAccountId: String) = "recovery/settle/$creditAccountId"
}

/**
 * Every feature exposes exactly this shape, so the app-level NavHost can compose
 * them without knowing anything about the feature's internals.
 */
fun NavGraphBuilder.recoveryGraph(nav: NavHostController) {
    composable(RecoveryRoutes.WORKLIST) {
        RecoveryWorklistScreen(
            onOpenAccount = { nav.navigate(RecoveryRoutes.escalation(it)) },
        )
    }

    composable(
        route = RecoveryRoutes.ESCALATION,
        arguments = listOf(navArgument(RecoveryRoutes.ARG_ACCOUNT_ID) { type = NavType.StringType }),
    ) { entry ->
        val id = entry.arguments?.getString(RecoveryRoutes.ARG_ACCOUNT_ID).orEmpty()
        RecoveryEscalationScreen(
            creditAccountId = id,
            onBack = { nav.popBackStack() },
            onRecordSettlement = { nav.navigate(RecoveryRoutes.settlement(it)) },
        )
    }

    composable(
        route = RecoveryRoutes.SETTLEMENT,
        arguments = listOf(navArgument(RecoveryRoutes.ARG_ACCOUNT_ID) { type = NavType.StringType }),
    ) { entry ->
        val id = entry.arguments?.getString(RecoveryRoutes.ARG_ACCOUNT_ID).orEmpty()
        RecoverySettlementScreen(
            creditAccountId = id,
            onBack = { nav.popBackStack() },
        )
    }
}
