package com.chaanbean.mobile.navigation

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.chaanbean.mobile.core.di.LocalAppContainer
import com.chaanbean.mobile.core.i18n.LocalStrings
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.SupportSheet
import com.chaanbean.mobile.feature.admincore.admincoreGraph
import com.chaanbean.mobile.feature.admingrowth.adminGrowthGraph
import com.chaanbean.mobile.feature.arbitration.arbitrationGraph
import com.chaanbean.mobile.feature.auth.AuthRoutes
import com.chaanbean.mobile.feature.auth.authGraph
import com.chaanbean.mobile.feature.backgroundcheck.backgroundCheckGraph
import com.chaanbean.mobile.feature.businesscheck.businessCheckGraph
import com.chaanbean.mobile.feature.dashboard.DashboardRoutes
import com.chaanbean.mobile.feature.dashboard.dashboardGraph
import com.chaanbean.mobile.feature.debtors.debtorsGraph
import com.chaanbean.mobile.feature.recovery.recoveryGraph
import com.chaanbean.mobile.feature.search.SearchRoutes
import com.chaanbean.mobile.feature.search.searchGraph
import com.chaanbean.mobile.feature.settings.settingsGraph
import com.chaanbean.mobile.feature.trusthub.trustHubGraph
import com.chaanbean.mobile.feature.vendors.vendorsGraph
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChaanBeanApp() {
    val nav = rememberNavController()
    val container = LocalAppContainer.current
    val strings = LocalStrings.current
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    val backStackEntry by nav.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val chromeless = currentRoute in CHROMELESS_ROUTES
    // main's AppShell renders SupportDrawer on every page; mirror that placement.
    var showSupport by remember { mutableStateOf(false) }

    // main enforces an intro-to-login flow on launch (commit 3d842f2). Honour that
    // only when nothing is stored yet, so a returning user lands on Home instead.
    val startRoute = if (container.session.current.value == null) {
        AuthRoutes.INTRO
    } else {
        DashboardRoutes.HOME
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = !chromeless,
        drawerContent = {
            ModalDrawerSheet {
                Spacer(Modifier.height(20.dp))
                Text(
                    "ChaanBean",
                    style = MaterialTheme.typography.headlineMedium,
                    color = Chaan.Brand,
                    modifier = Modifier.padding(horizontal = 24.dp),
                )
                Text(
                    strings.tagline,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 24.dp),
                )
                Spacer(Modifier.height(16.dp))
                Column(Modifier.verticalScroll(rememberScrollState())) {
                    DRAWER_GROUPS.forEach { group ->
                        HorizontalDivider(Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
                        Text(
                            group.heading.uppercase(),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 28.dp, vertical = 4.dp),
                        )
                        group.items.forEach { item ->
                            val selected = backStackEntry?.destination?.hierarchy
                                ?.any { it.route == item.route } == true
                            NavigationDrawerItem(
                                label = { Text(localizedTitle(item, strings)) },
                                selected = selected,
                                onClick = {
                                    scope.launch { drawerState.close() }
                                    if (currentRoute != item.route) {
                                        nav.navigate(item.route) {
                                            launchSingleTop = true
                                            restoreState = true
                                            popUpTo(DashboardRoutes.HOME) { saveState = true }
                                        }
                                    }
                                },
                                modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
                            )
                        }
                    }
                    Spacer(Modifier.height(24.dp))
                }
            }
        },
    ) {
        Scaffold(
            topBar = {
                if (!chromeless) {
                    TopAppBar(
                        title = { Text(titleForRoute(currentRoute)) },
                        navigationIcon = {
                            IconButton(onClick = { scope.launch { drawerState.open() } }) {
                                Icon(Icons.Filled.Menu, contentDescription = "Open navigation")
                            }
                        },
                        actions = {
                            IconButton(onClick = { showSupport = true }) {
                                Icon(Icons.AutoMirrored.Filled.HelpOutline, contentDescription = "Legal help")
                            }
                            IconButton(onClick = {
                                nav.navigate(SearchRoutes.HOME) { launchSingleTop = true }
                            }) {
                                Icon(Icons.Filled.Search, contentDescription = "Search")
                            }
                        },
                    )
                }
            },
        ) { padding ->
            NavHost(
                navController = nav,
                startDestination = startRoute,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
            ) {
                authGraph(nav)
                dashboardGraph(nav)
                businessCheckGraph(nav)
                debtorsGraph(nav)
                recoveryGraph(nav)
                arbitrationGraph(nav)
                trustHubGraph(nav)
                vendorsGraph(nav)
                backgroundCheckGraph(nav)
                searchGraph(nav)
                settingsGraph(nav)
                admincoreGraph(nav)
                adminGrowthGraph(nav)
            }
        }
    }

    if (showSupport) {
        SupportSheet(onDismiss = { showSupport = false })
    }
}
