/**
 * Expo app configuration.
 *
 * Replaces the previous static `app.json` so the backend a build talks to is
 * chosen by `APP_ENV` at build time instead of being hardcoded. `eas.json`
 * sets APP_ENV per build profile; running `npx expo start` with nothing set
 * gives development.
 *
 * The package name is deliberately fixed: once an app is published, changing
 * `com.nearbytez.app` creates a different app on the Play Store and orphans
 * every existing install.
 */

const ENVIRONMENTS = {
  development: {
    // The Android emulator's route to the host machine.
    apiUrl: "http://10.0.2.2:5000/api/v1",
    socketUrl: "http://10.0.2.2:5000",
    name: "NearBitez Dev",
  },
  staging: {
    apiUrl: "https://near-bitez.onrender.com/api/v1",
    socketUrl: "https://near-bitez.onrender.com",
    name: "NearBitez Staging",
  },
  production: {
    apiUrl: "https://near-bitez.onrender.com/api/v1",
    socketUrl: "https://near-bitez.onrender.com",
    name: "NearBitez",
  },
};

const appEnv = process.env.APP_ENV || "development";
const env = ENVIRONMENTS[appEnv];

if (!env) {
  throw new Error(
    `Unknown APP_ENV "${appEnv}". Expected one of: ${Object.keys(ENVIRONMENTS).join(", ")}.`
  );
}

/**
 * Bumped on every store submission.
 *
 * `version` is what users see; `versionCode` is what Google Play orders
 * uploads by and must strictly increase or the upload is rejected.
 */
const VERSION = "1.0.0";
const VERSION_CODE = 1;

export default {
  expo: {
    name: env.name,
    slug: "nearbytez",
    version: VERSION,
    orientation: "portrait",
    scheme: "nearbytez",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    icon: "./assets/icon.png",
    // Warm cream matches the app's light background, so the splash does not
    // flash a different colour before the first screen paints.
    backgroundColor: "#f8f5f0",

    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#f8f5f0",
      dark: {
        image: "./assets/splash.png",
        backgroundColor: "#18161b",
      },
    },

    assetBundlePatterns: ["**/*"],

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.nearbytez.app",
    },

    android: {
      package: "com.nearbytez.app",
      versionCode: VERSION_CODE,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ea580c",
      },
      edgeToEdgeEnabled: true,
      /**
       * Declared explicitly so the store listing's permission list is exactly
       * what the app uses. INTERNET is required for the API and socket;
       * the media permissions back the vendor's menu-photo picker.
       *
       * Nothing here requests location — the app has no map or GPS feature —
       * and nothing requests camera, because the picker only reads the gallery.
       */
      permissions: [
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.VIBRATE",
        "android.permission.READ_MEDIA_IMAGES",
      ],
      blockedPermissions: [
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
      ],
    },

    plugins: [
      "expo-secure-store",
      "expo-asset",
      [
        "expo-image-picker",
        {
          // Shown in the Android permission dialog. Explains why before asking.
          photosPermission:
            "NearBitez needs access to your photos so you can add pictures of your dishes.",
        },
      ],
    ],

    extra: {
      appEnv,
      apiUrl: env.apiUrl,
      socketUrl: env.socketUrl,
    },
  },
};
