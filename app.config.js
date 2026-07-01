// app.config.js — config dinamic Expo
// Citește GOOGLE_MAPS_API_KEY din process.env:
//   • Dev local / Expo Go  → din fleet-app/.env
//   • EAS Cloud Build      → din EAS secret injectat automat
//
// VARIANT controlează care "aromă" se compilează:
//   VARIANT=road npx expo run:ios    → FleetRoad (violet, mașini)
//   VARIANT=aqua npx expo run:ios    → FleetAqua (cyan, bărci)

const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
const variant  = (process.env.VARIANT || 'road').toLowerCase();

// slug-ul EAS NU se schimbă — e legat de projectId-ul înregistrat.
// Două apps pe Store = două proiecte EAS separate (creat cu `eas init` pe un branch nou).
// Deocamdată ambele variante folosesc același proiect EAS; bundle ID-ul le separă pe Store.
const VARIANT_META = {
  road: {
    name: 'FleetRoad',
    slug: 'licenta-saas-fleet-telemetry',  // slug înregistrat EAS
    iosBundleId: 'com.fleettelemetry.road',
    androidPackage: 'com.fleettelemetry.road',
    icon: './assets/icon.png',
    splashBg: '#07010F',
    notifColor: '#7B2FBE',
  },
  aqua: {
    name: 'FleetAqua',
    slug: 'licenta-saas-fleet-telemetry',  // același slug EAS, bundle ID diferit
    iosBundleId: 'com.fleettelemetry.aqua',
    androidPackage: 'com.fleettelemetry.aqua',
    icon: './assets/icon-aqua.png',
    splashBg: '#010D14',
    notifColor: '#0891B2',
  },
};

const meta = VARIANT_META[variant] ?? VARIANT_META.road;

if (!mapsKey) {
  console.warn(
    '\n⚠️  GOOGLE_MAPS_API_KEY lipsește din environment!\n' +
    '   Creează fleet-app/.env cu: GOOGLE_MAPS_API_KEY=AIzaSy...\n'
  );
}

console.log(`\n📦 Building variant: ${meta.name} (${variant})\n`);

module.exports = {
  expo: {
    name: meta.name,
    slug: meta.slug,
    version: '1.0.0',
    orientation: 'portrait',
    icon: meta.icon,
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: meta.splashBg,
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: meta.iosBundleId,
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
      package: meta.androidPackage,
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
      variant,   // ← disponibil în app via Constants.expoConfig.extra.variant
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
          icon: meta.icon,
          color: meta.notifColor,
          sounds: [],
        },
      ],
    ],
  },
};
