package com.chaanbean.mobile.feature.backgroundcheck

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.chaanbean.mobile.feature.backgroundcheck.ui.BackgroundCheckScreen
import com.chaanbean.mobile.feature.backgroundcheck.ui.GatewayStatusScreen
import com.chaanbean.mobile.feature.backgroundcheck.ui.GstOtpScreen

object BackgroundCheckRoutes {
    const val RUN = "background-check"
    const val GATEWAY_STATUS = "background-check/adapters"
    const val GST_OTP = "background-check/gst-otp"
}

fun NavGraphBuilder.backgroundCheckGraph(nav: NavHostController) {
    composable(BackgroundCheckRoutes.RUN) {
        BackgroundCheckScreen(
            onOpenGatewayStatus = { nav.navigate(BackgroundCheckRoutes.GATEWAY_STATUS) },
            onOpenGstOtp = { nav.navigate(BackgroundCheckRoutes.GST_OTP) },
        )
    }
    composable(BackgroundCheckRoutes.GATEWAY_STATUS) { GatewayStatusScreen() }
    composable(BackgroundCheckRoutes.GST_OTP) { GstOtpScreen() }
}
