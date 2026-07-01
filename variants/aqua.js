/**
 * Variant config — FleetAqua (Marine)
 * Build cu: VARIANT=aqua npx expo run:ios (sau eas build)
 */

export default {
  // ── Identity ────────────────────────────────────────────
  appName: 'FleetAqua',
  bundleId: 'com.fleettelemetry.aqua',
  slug: 'fleetaqua',
  primaryColor: '#0891B2',   // cyan — temă marină
  accentColor: '#22D3EE',

  // ── Theme overrides ──────────────────────────────────────
  theme: {
    primary: '#0891B2',
    primaryDark: '#0E7490',
    primaryLight: '#22D3EE',
    accent: '#06B6D4',
    glow: '#0891B2',
    grad: ['#0E7490', '#22D3EE'],
    // Fundaluri marine — ocean deep
    bg: '#010D14',
    bgCard: '#031824',
    bgCard2: '#052030',
    bgCard3: '#063040',
    border: 'rgba(8,145,178,0.2)',
    borderBright: 'rgba(34,211,238,0.4)',
    tabBg: '#010A10',
    tabActive: '#22D3EE',
    tabInactive: 'rgba(34,211,238,0.35)',
  },

  // ── Labels & copy ────────────────────────────────────────
  labels: {
    asset: 'Vessel',
    assets: 'Vessels',
    fleet: 'Fleet',
    mapTitle: 'Marine Fleet Map',
    geofenceTitle: 'Water Perimeter',
    geofenceSubtitle: 'Set permitted navigation zones for your vessels',
    maintenanceTitle: 'Engine Service',
    diagnosticsTitle: 'Engine Hours',
    driversTitle: 'Operators',
    myAssetsTitle: 'My Vessels',
  },

  // ── Icons ────────────────────────────────────────────────
  icons: {
    asset: 'boat-outline',
    assetActive: 'boat',
    map: 'map-outline',
    maintenance: 'construct-outline',
    diagnostics: 'time-outline',      // engine hours
    driver: 'person-outline',
    geofence: 'water-outline',         // apă
    rpm: 'speedometer-outline',
  },

  // ── Features toggle ──────────────────────────────────────
  features: {
    rpm: false,              // barci nu au RPM via CAN
    can: false,
    dtc: false,
    driverScoring: false,
    engineHours: true,       // marine-specific
    waterGeofence: true,     // marine-specific — perimetru pe apă
    maintenanceSchedule: true,
  },

  // ── Geofence config ──────────────────────────────────────
  geofence: {
    defaultShape: 'circle',   // zone circulare pe apă — mai simplu de setat
    alertOnExit: true,
    alertOnEntry: false,      // interesează ieșirea din zonă, nu intrarea
    mapStyle: 'satellite',    // vedere satelit — mai util pe apă
    exitAlertMessage: 'Vessel has exited the permitted navigation zone!',
  },
};
