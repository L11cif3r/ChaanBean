plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "com.chaanbean.mobile"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.chaanbean.mobile"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    flavorDimensions += "backend"
    productFlavors {
        create("mock") {
            dimension = "backend"
            applicationIdSuffix = ".mock"
            versionNameSuffix = "-mock"
            buildConfigField("String", "API_BASE_URL", "\"http://localhost/\"")
            buildConfigField("boolean", "USE_MOCK", "true")
        }
        create("live") {
            dimension = "backend"
            // 10.0.2.2 is the host loopback as seen from the Android emulator.
            buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:3000/\"")
            buildConfigField("boolean", "USE_MOCK", "false")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    sourceSets {
        getByName("main").kotlin.srcDir("src/main/kotlin")
        getByName("mock").kotlin.srcDir("src/mock/kotlin")
        getByName("live").kotlin.srcDir("src/live/kotlin")
        getByName("test").kotlin.srcDir("src/test/kotlin")
    }
    packaging {
        resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" }
    }
    testOptions {
        unitTests {
            isIncludeAndroidResources = true
            all {
                // Gradle forks a separate JVM per test worker, and it does not inherit
                // org.gradle.jvmargs. Without this the worker dies on the same AF_UNIX
                // pipe failure documented in gradle.properties.
                it.jvmArgs("-Djdk.net.unixdomain.tmpdir=C:/gradletmp")
                it.testLogging { showStandardStreams = true }
            }
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    implementation(libs.androidx.navigation.compose)
    debugImplementation(libs.androidx.ui.tooling)

    implementation(libs.retrofit)
    implementation(libs.retrofit.serialization)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization.json)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
}
