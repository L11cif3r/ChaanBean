package com.chaanbean.mobile.feature.arbitration

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.chaanbean.mobile.feature.arbitration.ui.ArbitrationCaseScreen
import com.chaanbean.mobile.feature.arbitration.ui.ArbitrationCasesScreen

object ArbitrationRoutes {
    const val CASES = "arbitration"
    const val CASE_ARG = "caseId"
    const val CASE_DETAIL = "arbitration/case/{caseId}"

    fun caseDetail(caseId: String): String = "arbitration/case/$caseId"
}

fun NavGraphBuilder.arbitrationGraph(nav: NavHostController) {
    composable(ArbitrationRoutes.CASES) {
        ArbitrationCasesScreen(
            onOpenCase = { caseId -> nav.navigate(ArbitrationRoutes.caseDetail(caseId)) },
        )
    }
    composable(
        route = ArbitrationRoutes.CASE_DETAIL,
        arguments = listOf(navArgument(ArbitrationRoutes.CASE_ARG) { type = NavType.StringType }),
    ) { entry ->
        ArbitrationCaseScreen(
            caseId = entry.arguments?.getString(ArbitrationRoutes.CASE_ARG).orEmpty(),
            onBack = { nav.popBackStack() },
        )
    }
}
