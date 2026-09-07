package com.chaanbean.mobile.feature.admingrowth

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.chaanbean.mobile.feature.admingrowth.ui.MarketingScreen
import com.chaanbean.mobile.feature.admingrowth.ui.PipelineScreen

object AdminGrowthRoutes {
    const val PIPELINE = "admin/pipeline"
    const val MARKETING = "admin/marketing"
}

fun NavGraphBuilder.adminGrowthGraph(nav: NavHostController) {
    composable(AdminGrowthRoutes.PIPELINE) { PipelineScreen() }
    composable(AdminGrowthRoutes.MARKETING) { MarketingScreen() }
}
