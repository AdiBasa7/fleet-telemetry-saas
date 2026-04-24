// app.config.js — config dinamic Expo
// Citește GOOGLE_MAPS_API_KEY din process.env:
//   • Dev local / Expo Go  → din fleet-app/.env
//   • EAS Cloud Build      → din EAS secret injectat automat

const mapsKey = process.env.GOOGLE_MAPS_API_KEY;

if (!mapsKey) {
  console.warn(
    '\n⚠️  GOOGLE_MAPS_API_KEY lipsește din environment!\n' +
    '   Creează fleet-app/.env cu: GOOGLE_MAPS_API_KEY=AIzaSy...\n'
  );
}

module.exports = {
  expo: {
    name: 'fleet-app',
    slug: 'licenta-saas-fleet-telemetry',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: false,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.adibasa.licentasaasfleettelemetry',
      config: {
        googleMapsApiKey: mapsKey,
      },
      infoPlist: {
        // Locația e necesară doar pentru harta vehiculelor (nu tracking utilizator)
        NSLocationWhenInUseUsageDescription:
          'Aplicația afișează vehiculele flotei pe hartă.',
        // Eliminăm NSLocationAlwaysAndWhenInUseUsageDescription —
        // nu avem nevoie de locație în fundal
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      enableProguardInReleaseBuilds: true,
      package: 'com.adibasa.licentasaasfleettelemetry',
      allowBackup: false,
      usesCleartextTraffic: false,
      config: {
        googleMaps: {
          apiKey: mapsKey,
        },
      },
      // ─── Whitelist explicit de permisiuni ─────────────────────
      // Orice permisiune care NU apare aici este ELIMINATĂ din APK,
      // chiar dacă un pachet ar vrea să o adauge automat.
      // Elimină: SYSTEM_ALERT_WINDOW, RECORD_AUDIO, READ_CONTACTS,
      //          ACCESS_BACKGROUND_LOCATION, PROCESS_OUTGOING_CALLS etc.
      permissions: [
        // Rețea — obligatorie pentru API + WebSocket
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',

        // Notificări push (expo-notifications)
        'android.permission.RECEIVE_BOOT_COMPLETED',
        'android.permission.VIBRATE',
        'android.permission.WAKE_LOCK',
        'android.permission.POST_NOTIFICATIONS',

        // Harta — locație precisă pentru centrare opțională
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',

        // Keystore securizat (expo-secure-store)
        'android.permission.USE_BIOMETRIC',
        'android.permission.USE_FINGERPRINT',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      eas: {
        projectId: '8db9dbc4-2b74-423f-8056-b9e097ab6623',
      },
    },
    plugins: [
      'expo-secure-store',
      [
        'expo-build-properties',
        {
          android: {
            // Network Security Config: blochează cleartext + pinning declarativ
            networkSecurityConfig: './android-network-security-config.xml',
          },
        },
      ],
      // expo-notifications fără permisiunea SCHEDULE_EXACT_ALARM
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#FF5E00',
          sounds: [],
        },
      ],
    ],
  },
};
