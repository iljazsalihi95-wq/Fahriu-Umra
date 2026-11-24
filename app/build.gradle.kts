plugins { id("com.android.application") }
android { namespace = "com.fahriutravel.umra"; compileSdk = 35
 defaultConfig { applicationId = "com.fahriutravel.umra"; minSdk = 24; targetSdk = 35; versionCode = 2; versionName = "1.1.0" }
 buildTypes { getByName("release") { isMinifyEnabled = false } }
 compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
}

dependencies { implementation("androidx.webkit:webkit:1.12.0") }
