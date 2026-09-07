plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
}

// services.gradle.org is unreachable from this network, so the wrapper task
// cannot HEAD-check the distribution URL. The 8.12 distribution is already in
// the local wrapper cache, so skip the check rather than the wrapper.
tasks.wrapper {
    gradleVersion = "8.12"
    distributionType = Wrapper.DistributionType.ALL
    validateDistributionUrl = false
}
