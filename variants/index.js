/**
 * Variant resolver — citit o singură dată la startup.
 *
 * Ordinea de prioritate:
 *   1. process.env.VARIANT (EAS build / local .env)
 *   2. Constants.expoConfig.extra.variant (app.config.js fallback)
 *   3. 'road' (default)
 *
 * Import în cod:
 *   import V from '../variants';
 *   V.labels.asset  → 'Vehicle' sau 'Vessel'
 *   V.features.rpm  → true/false
 */

import Constants from 'expo-constants';
import road from './road';
import aqua from './aqua';

const CONFIGS = { road, aqua };

function resolveVariant() {
  // La runtime, expo-constants expune extra din app.config.js
  const fromConfig = Constants.expoConfig?.extra?.variant;
  const raw = (fromConfig || 'road').toLowerCase();
  return CONFIGS[raw] ?? road;
}

const V = resolveVariant();

export default V;

// Named exports pentru conveniență
export const { labels, icons, features, geofence, theme } = V;
export const isAqua = V.bundleId.includes('aqua');
export const isRoad = !isAqua;
