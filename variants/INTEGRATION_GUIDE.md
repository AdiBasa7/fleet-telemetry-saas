# Variant Integration Guide

## Cum funcționează sistemul

`VARIANT=road` sau `VARIANT=aqua` în `.env` → `app.config.js` → `extra.variant` → `variants/index.js` rezolvă config-ul → toate ecranele consumă `V`.

## 1. Adaptare ecran existent (3 linii de cod)

```js
// screens/MyCarsScreen.js — ÎNAINTE
import { T, SHADOW } from '../theme';
// ... undeva în JSX:
<Text>My Vehicles</Text>
<Ionicons name="car-sport-outline" />

// screens/MyCarsScreen.js — DUPĂ
import { T, SHADOW } from '../theme';
import V from '../variants';          // ← linie nouă
// ... undeva în JSX:
<Text>{V.labels.myAssetsTitle}</Text>  // 'My Vehicles' sau 'My Vessels'
<Ionicons name={V.icons.asset} />      // 'car-sport-outline' sau 'boat-outline'
```

## 2. Ascunde features care nu există în varianta curentă

```js
import V from '../variants';

// Ascunde RPM Report în FleetAqua (barcile nu au CAN bus)
{V.features.rpm && (
  <TouchableOpacity onPress={() => nav.navigate('RpmReport')}>
    <Text>RPM Report</Text>
  </TouchableOpacity>
)}

// Afișează Engine Hours NUMAI în FleetAqua
{V.features.engineHours && (
  <EngineHoursWidget />
)}
```

## 3. Navigator — screen swap per variantă

```js
// App.js — în MainMenuScreen sau în Stack navigator
import V, { isAqua } from './variants';
import GeofenceScreen      from './screens/GeofenceScreen';
import WaterPerimeterScreen from './screens/WaterPerimeterScreen';

// Alege screen-ul corect la build time
const ZoneScreen = isAqua ? WaterPerimeterScreen : GeofenceScreen;

// Și în navigator:
<Stack.Screen
  name="Geofence"
  component={ZoneScreen}
  options={{ title: V.labels.geofenceTitle }}
/>
```

## 4. Culori în stiluri dinamice

```js
import V from '../variants';

// NU hardcoda '#7B2FBE' — folosește V.theme
const styles = StyleSheet.create({
  btn: {
    backgroundColor: V.theme.primary,  // violet (road) sau cyan (aqua)
    borderColor: V.theme.accent,
  },
});
```

## 5. Build commands

```bash
# Dezvoltare locală
VARIANT=road npx expo start
VARIANT=aqua npx expo start

# iOS local
VARIANT=road npx expo run:ios
VARIANT=aqua npx expo run:ios

# EAS Cloud Build (vezi eas.json)
eas build --profile road --platform ios
eas build --profile aqua --platform ios
eas build --profile aqua --platform android
```

## 6. Structura .env pentru dev local

```bash
# fleet-app/.env.road
GOOGLE_MAPS_API_KEY=AIzaSy...
VARIANT=road

# fleet-app/.env.aqua
GOOGLE_MAPS_API_KEY=AIzaSy...
VARIANT=aqua
```

Folosești: `cp .env.road .env` înainte de `npx expo start`.

## 7. Ecrane complet noi (aqua-only)

Pentru ecrane care nu au echivalent în road (ex: engine hours, logbook), le pui
direct în navigator sub `isAqua`:

```js
{isAqua && (
  <Stack.Screen name="EngineHours" component={EngineHoursScreen} />
)}
```

## Regula de aur

Nu duplica logica de business (fetch, state, calcule).
Duplica NUMAI prezentarea când diferă fundamental (ex: WaterPerimeterScreen vs GeofenceScreen).
Tot restul: `V.labels`, `V.icons`, `V.features`, `V.theme` sunt suficiente.
