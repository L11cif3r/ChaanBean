package com.chaanbean.mobile.feature.businesscheck

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.chaanbean.mobile.feature.businesscheck.ui.BusinessCompareScreen
import com.chaanbean.mobile.feature.businesscheck.ui.BusinessDetailScreen
import com.chaanbean.mobile.feature.businesscheck.ui.BusinessDocumentsScreen
import com.chaanbean.mobile.feature.businesscheck.ui.BusinessListScreen

object BusinessCheckRoutes {
    const val ARG_BUSINESS_ID = "businessId"

    const val LIST = "business-check"
    const val COMPARE = "business-check/compare"
    const val DETAIL = "business-check/profile/{businessId}"
    const val DOCUMENTS = "business-check/profile/{businessId}/documents"

    fun detail(businessId: String) = "business-check/profile/$businessId"
    fun documents(businessId: String) = "business-check/profile/$businessId/documents"
}

/**
 * Every feature exposes exactly this shape, so the app-level NavHost can compose
 * them without knowing anything about the feature's internals.
 */
fun NavGraphBuilder.businessCheckGraph(nav: NavHostController) {
    composable(BusinessCheckRoutes.LIST) {
        BusinessListScreen(
            onOpenBusiness = { nav.navigate(BusinessCheckRoutes.detail(it)) },
            onCompare = { nav.navigate(BusinessCheckRoutes.COMPARE) },
        )
    }

    composable(BusinessCheckRoutes.COMPARE) {
        BusinessCompareScreen(
            onBack = { nav.popBackStack() },
            onOpenBusiness = { nav.navigate(BusinessCheckRoutes.detail(it)) },
        )
    }

    composable(
        route = BusinessCheckRoutes.DETAIL,
        arguments = listOf(navArgument(BusinessCheckRoutes.ARG_BUSINESS_ID) { type = NavType.StringType }),
    ) { entry ->
        val id = entry.arguments?.getString(BusinessCheckRoutes.ARG_BUSINESS_ID).orEmpty()
        BusinessDetailScreen(
            businessId = id,
            onBack = { nav.popBackStack() },
            onOpenDocuments = { nav.navigate(BusinessCheckRoutes.documents(id)) },
        )
    }

    composable(
        route = BusinessCheckRoutes.DOCUMENTS,
        arguments = listOf(navArgument(BusinessCheckRoutes.ARG_BUSINESS_ID) { type = NavType.StringType }),
    ) { entry ->
        BusinessDocumentsScreen(
            businessId = entry.arguments?.getString(BusinessCheckRoutes.ARG_BUSINESS_ID).orEmpty(),
            onBack = { nav.popBackStack() },
        )
    }
}
