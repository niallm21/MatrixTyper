plugins {
    id("com.android.application")
}

android {
    namespace = "com.accountabillibuddy.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.accountabillibuddy.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 2
        versionName = "0.2.0"
    }

    signingConfigs {
        create("dev") {
            storeFile = file("../keystore/dev.jks")
            storePassword = "abbdev123"
            keyAlias = "abb"
            keyPassword = "abbdev123"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("dev")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
}
