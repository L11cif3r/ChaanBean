package com.chaanbean.mobile.navigation

/**
 * Indirection for the Business Check entry point so the shell does not depend on
 * that feature's internals. Kept as a one-line constant rather than importing
 * BusinessCheckRoutes directly, because the shell only ever needs the list route.
 */
object BusinessCheckEntry {
    const val ROUTE = "business-check"
}
