/**
 * ============================================================
 *  Fleet Telemetry — Racing HUD Premium
 *  Concept: Floating Glassmorphism Tab Bar + Video Background
 *  4 tabs: Acasă · Hartă · Analiză · Flotă
 * ============================================================
 */

import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  Platform, TouchableOpacity,
} from 'react-native';
import { BlurView }           from 'expo-blur';
import { Ionicons }           from '@expo/vector-icons';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import { io as socketIO }     from 'socket.io-client';
import { API_BASE_URL, WS_URL } from './config';
import VideoBackground        from './components/VideoBackground';
import IntroScreen            from './components/IntroScreen';
import { AuthProvider, useAuth } from './context/AuthContext';

// ── Screens ───────────────────────────────────────────
import FleetMapScreen      from './screens/FleetMapScreen';
import VehicleDetailScreen from './screens/VehicleDetailScreen';
import RouteHistoryScreen  from './screens/RouteHistoryScreen';
import AlertsScreen        from './screens/AlertsScreen';
import AccountScreen       from './screens/AccountScreen';
import MyCarsScreen        from './screens/MyCarsScreen';
import LoginScreen         from './screens/LoginScreen';
import RegisterScreen      from './screens/RegisterScreen';
import MainMenuScreen      from './screens/MainMenuScreen';
import TripsScreen         from './screens/TripsScreen';
import MaintenanceScreen   from './screens/MaintenanceScreen';
import CockpitScreen       from './screens/CockpitScreen';
import AuditLogScreen      from './screens/AuditLogScreen';
import RpmReportScreen    from './screens/RpmReportScreen';
import { useSecurityGuard } from './hooks/useSecurityGuard';

// ── Navigatori ────────────────────────────────────────
const Tab       = createBottomTabNavigator();
const Stack     = createStackNavigator();
const AuthStack = createStackNavigator();

// ── Design tokens ─────────────────────────────────────
const NEON_ORANGE   = '#FF5E00';
const INACTIVE      = 'rgba(255,255,255,0.35)';
const BAR_H         = 70;
const BAR_BOTTOM    = 14;
const BAR_SIDE      = 20;
const BAR_RADIUS    = 28;
const CONTAINER_H   = BAR_H + BAR_BOTTOM;

// ── Push notifications ────────────────────────────────
let Notifications;
try { Notifications = require('expo-notifications'); } catch {}

async function registerForPushNotifications(token) {
  if (!Notifications) return;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== 'granted') return;
    const { data: pushToken } = await Notifications.getExpoPushTokenAsync();
    await fetch(`${API_BASE_URL}/auth/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pushToken }),
    });
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default', importance: Notifications.AndroidImportance.MAX,
      });
    }
  } catch (e) { if (__DEV__) console.warn('Push registration:', e.message); }
}

// ── Header options comune ─────────────────────────────
const HO = {
  headerStyle:         { backgroundColor: 'rgba(8, 2, 20, 0.92)' },
  headerTintColor:     NEON_ORANGE,
  headerTitleStyle:    { fontWeight: 'bold', color: '#FFFFFF', fontSize: 16 },
  headerShadowVisible: false,
  cardStyle:           { backgroundColor: 'transparent' },
};

// ── Auth ──────────────────────────────────────────────
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login"    component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// ── Tab 1 · Acasă ─────────────────────────────────────
// MainMenuScreen direct, fără stack extra

// ── Tab 2 · Hartă ─────────────────────────────────────
function MapStack() {
  return (
    <Stack.Navigator screenOptions={HO} sceneContainerStyle={{ backgroundColor: '#07010F' }}>
      <Stack.Screen name="FleetMap"      component={FleetMapScreen}
        options={{ title: '🛰️  Live' }} />
      <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen}
        options={({ route }) => ({ title: route.params?.device?.vehicle?.licensePlate || 'Detalii' })} />
      <Stack.Screen name="RouteHistory"  component={RouteHistoryScreen}
        options={({ route }) => ({ title: `Traseu · ${route.params?.device?.vehicle?.licensePlate || '—'}` })} />
      <Stack.Screen name="Cockpit"       component={CockpitScreen}
        options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// ── Tab 3 · Analiză ───────────────────────────────────
function AnalysisStack() {
  return (
    <Stack.Navigator screenOptions={HO} sceneContainerStyle={{ backgroundColor: '#07010F' }}>
      <Stack.Screen name="Trips"    component={TripsScreen}    options={{ title: '📊  Analiză & Jurnal' }} />
      <Stack.Screen name="Alerts"    component={AlertsScreen}    options={{ title: '🚨  Alerte' }} />
      <Stack.Screen name="AuditLog"  component={AuditLogScreen}  options={{ title: '🛡️   Jurnal activitate' }} />
      <Stack.Screen name="RpmReport" component={RpmReportScreen} options={{ title: '📊  Raport Turații' }} />
    </Stack.Navigator>
  );
}

// ── Tab 4 · Flotă ─────────────────────────────────────
function FleetStack() {
  return (
    <Stack.Navigator screenOptions={HO} sceneContainerStyle={{ backgroundColor: '#07010F' }}>
      <Stack.Screen
        name="MyCars"
        component={MyCarsScreen}
        options={({ navigation }) => ({
          title: '🚘  Mașini',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Account')}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                marginRight: 14, paddingHorizontal: 12, paddingVertical: 6,
                backgroundColor: `${NEON_ORANGE}22`,
                borderRadius: 20, borderWidth: 1, borderColor: `${NEON_ORANGE}66`,
              }}
            >
              <Ionicons name="person-circle" size={20} color={NEON_ORANGE} />
              <Text style={{ color: NEON_ORANGE, fontWeight: '700', fontSize: 13 }}>Cont</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen name="Maintenance" component={MaintenanceScreen} options={{ title: '🔧  Mentenanță' }} />
      <Stack.Screen name="Account"     component={AccountScreen}     options={{ title: '👤  Contul meu' }} />
      <Stack.Screen name="Cockpit"     component={CockpitScreen}     options={{ headerShown: false }} />
      <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen}
        options={({ route }) => ({ title: route.params?.device?.vehicle?.licensePlate || 'Detalii' })} />
    </Stack.Navigator>
  );
}

// ── Definiții tab-uri ─────────────────────────────────
const TABS = [
  { name: 'Acasă',   icon: 'home-outline',      iconFocused: 'home',       color: NEON_ORANGE },
  { name: 'Hartă',   icon: 'navigate-outline',  iconFocused: 'navigate',   color: NEON_ORANGE },
  { name: 'Analiză', icon: 'bar-chart-outline', iconFocused: 'bar-chart',  color: NEON_ORANGE },
  { name: 'Flotă',   icon: 'car-outline',       iconFocused: 'car',        color: NEON_ORANGE },
];

// ── Custom Tab Bar — Racing HUD ───────────────────────
function RacingTabBar({ state, navigation }) {
  return (
    <View style={tb.container} pointerEvents="box-none">

      {/* ── Bara de sticlă (BlurView) ─────────────── */}
      <View style={tb.bar}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        {/* Overlay semi-transparent suplimentar pentru contrast */}
        <View style={tb.barDim} />
        {/* Accent neon: linie subțire la mijlocul barei (sus) */}
        <View style={tb.accentLine} />
      </View>

      {/* ── Tab items ──────────────────────────────── */}
      <View style={tb.row} pointerEvents="box-none">
        {state.routes.map((route, i) => {
          const def     = TABS[i];
          const focused = state.index === i;
          const onPress = () => navigation.navigate(route.name);
          const color   = focused ? def.color : INACTIVE;

          return (
            <TouchableOpacity
              key={route.key}
              style={tb.tabItem}
              onPress={onPress}
              activeOpacity={0.7}
            >
              <View style={[
                tb.iconWrap,
                focused && {
                  shadowColor:   def.color,
                  shadowOpacity: 1,
                  shadowRadius:  12,
                  shadowOffset:  { width: 0, height: 0 },
                  elevation:     10,
                },
              ]}>
                <Ionicons
                  name={focused ? def.iconFocused : def.icon}
                  size={25}
                  color={color}
                />
              </View>
              {focused && (
                <View style={[tb.activeDot, { backgroundColor: def.color }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tb = StyleSheet.create({
  container: {
    height:   CONTAINER_H,
    overflow: 'visible',
  },

  // Bara vizuală glassmorphism
  bar: {
    position:     'absolute',
    bottom:       BAR_BOTTOM,
    left:         BAR_SIDE,
    right:        BAR_SIDE,
    height:       BAR_H,
    borderRadius: BAR_RADIUS,
    overflow:     'hidden',
    borderWidth:  1,
    borderColor:  'rgba(255, 255, 255, 0.08)',
  },
  barDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 0, 10, 0.50)',
  },
  // Linie neon subțire la mijlocul barei (accent vizual)
  accentLine: {
    position:        'absolute',
    top:             0,
    left:            '20%',
    right:           '20%',
    height:          1,
    backgroundColor: `${NEON_ORANGE}66`,
    borderRadius:    1,
  },

  // Rândul de items — suprapus peste bară
  row: {
    position:      'absolute',
    bottom:        BAR_BOTTOM,
    left:          BAR_SIDE,
    right:         BAR_SIDE,
    height:        BAR_H,
    flexDirection: 'row',
    alignItems:    'center',
  },

  // Tab normal
  tabItem: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    height:         BAR_H,
  },
  iconWrap: {
    alignItems:     'center',
    justifyContent: 'center',
    width:          44,
    height:         44,
    borderRadius:   22,
  },
  activeDot: {
    width:        4,
    height:       4,
    borderRadius: 2,
    marginTop:    3,
  },

});

// ── Main App ──────────────────────────────────────────
function MainApp() {
  // Activează: screenshot prevention + root/jailbreak detection
  useSecurityGuard();

  return (
    <View style={{ flex: 1, backgroundColor: '#07010F' }}>
      {/* Video loop full-screen în fundal — apare pe toate ecranele */}
      <VideoBackground />

      <Tab.Navigator
        tabBar={props => <RacingTabBar {...props} />}
        sceneContainerStyle={{ backgroundColor: '#07010F' }}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Acasă"   component={MainMenuScreen} />
        <Tab.Screen name="Hartă"   component={MapStack} />
        <Tab.Screen name="Analiză" component={AnalysisStack} />
        <Tab.Screen name="Flotă"   component={FleetStack} />
      </Tab.Navigator>
    </View>
  );
}

// ── Root Navigator ────────────────────────────────────
function RootNavigator() {
  const { user, loading, token } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user || !token) return;
    registerForPushNotifications(token);
    const socket = socketIO(WS_URL, { transports: ['websocket'], autoConnect: true });
    socket.on('connect',    () => { if (__DEV__) console.log('⚡ WS conectat'); });
    socket.on('disconnect', () => { if (__DEV__) console.log('⚡ WS deconectat'); });
    socket.on('device_update', data => { if (global.onDeviceUpdate) global.onDeviceUpdate(data); });
    socketRef.current = socket;
    return () => socket.disconnect();
  }, [user, token]);

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#07010F' }}>
      <ActivityIndicator size="large" color={NEON_ORANGE} />
    </View>
  );

  return user ? <MainApp /> : <AuthNavigator />;
}

const NAV_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background:   '#07010F',
    card:         'rgba(8, 2, 20, 0.92)',
    text:         '#FFFFFF',
    border:       'rgba(255,255,255,0.08)',
    primary:      '#FF5E00',
    notification: '#FF5E00',
  },
};

export default function App() {
  const [introDone, setIntroDone] = useState(false);

  return (
    <AuthProvider>
      <NavigationContainer theme={NAV_THEME}>
        <RootNavigator />
      </NavigationContainer>
      {!introDone && <IntroScreen onDone={() => setIntroDone(true)} />}
    </AuthProvider>
  );
}
