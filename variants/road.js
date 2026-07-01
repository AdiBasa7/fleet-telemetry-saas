/**
 * Variant config — FleetRoad
 * Build cu: VARIANT=road npx expo run:ios (sau eas build)
 */

export default {
  // ── Identity ────────────────────────────────────────────
  appName: 'FleetRoad',
  bundleId: 'com.fleettelemetry.road',
  slug: 'fleetroad',
  primaryColor: '#7B2FBE',   // violet — tema existentă
  accentColor: '#A855F7',

  // ── Theme overrides (se merge cu T din theme.js) ────────
  theme: {
    primary: '#7B2FBE',
    primaryDark: '#5B1F8A',
    primaryLight: '#9D50D4',
    accent: '#A855F7',
    glow: '#9333EA',
    grad: ['#5B1F8A', '#9333EA'],
  },

  // ── Labels & copy ────────────────────────────────────────
  labels: {
    asset: 'Vehicle',
    assets: 'Vehicles',
    fleet: 'Fleet',
    mapTitle: 'Fleet Map',
    geofenceTitle: 'Zone Alerts',
    geofenceSubtitle: 'Set restricted zones for your vehicles',
    maintenanceTitle: 'Maintenance',
    diagnosticsTitle: 'Engine Diagnostics',
    driversTitle: 'Drivers',
    myAssetsTitle: 'My Vehicles',
  },

  // ── Icons (Ionicons names) ────────────────────────────────
  icons: {
    asset: 'car-sport-outline',
    assetActive: 'car-sport',
    map: 'map-outline',
    maintenance: 'construct-outline',
    diagnostics: 'pulse-outline',
    driver: 'person-outline',
    geofence: 'shield-outline',
    rpm: 'speedometer-outline',
  },

  // ── Features toggle ──────────────────────────────────────
  features: {
    rpm: true,
    can: true,
    dtc: true,
    driverScoring: true,
    engineHours: false,    // marine-only
    waterGeofence: false,  // marine-only
    maintenanceSchedule: true,
  },

  // ── Geofence config ──────────────────────────────────────
  geofence: {
    defaultShape: 'polygon',   // poligoane pe uscat
    alertOnExit: true,
    alertOnEntry: true,
    mapStyle: 'standard',
  },
};
