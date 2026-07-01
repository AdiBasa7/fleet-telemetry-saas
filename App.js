/*
 * Project: Sistem Integrat de Telemetrie Auto
 * Author: Basa Adrian
 * University: Universitatea Politehnica Timișoara (UPT)
 * Faculty: ETC-TI
 * Year: 2026
 */

import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  Platform, TouchableOpacity,
} from 'react-native';
import { BlurView }           from 'expo-blur';
import { Ionicons }           from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import { io as socketIO }     from 'socket.io-client';
import { API_BASE_URL, WS_URL } from './config';
import VideoBackground        from './components/VideoBackground';
import IntroScreen            from './components/IntroScreen';
import { AuthProvider, useAuth } from './context/AuthContext';

// Screens
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
import RpmReportScreen     from './screens/RpmReportScreen';
import CanTelemetryScreen  from './screens/CanTelemetryScreen';
import DiagnosticHubScreen from './screens/DiagnosticHubScreen';
import LiveDiagDashboard   from './screens/LiveDiagDashboard';
import DTCScreen           from './screens/DTCScreen';
import { AppModeProvider, useAppMode, APP_MODES } from './context/AppModeContext';
import { useSecurityGuard } from './hooks/useSecurityGuard';

// Navigators
const Tab       = createBottomTabNavigator();
const Stack     = createStackNavigator();
const AuthStack = createStackNavigator();

// Design tokens — glassmorphism tab bar
const NEON_ORANGE = '#FF5E00';
const INACTIVE    = 'rgba(255,255,255,0.35)';
const BAR_H       = 70;
const BAR_BOTTOM  = 14;
const BAR_SIDE    = 20;
const BAR_RADIUS  = 28;
const CONTAINER_H = BAR_H + BAR_BOTTOM;

// Expo Notifications (optional dep — graceful fallback)
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

const HO = { headerShown: false, cardStyle: { backgroundColor: 'transparent' } };

// Auth
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login"    component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// Tab 1 · Acasă — MainMenuScreen (no extra stack)

// Tab 2 · Hartă
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

// Tab 3 · Analiză
function AnalysisStack() {
  return (
    <Stack.Navigator screenOptions={HO} sceneContainerStyle={{ backgroundColor: '#07010F' }}>
      <Stack.Screen name="Trips"    component={TripsScreen}    options={{ headerShown: false }} />
      <Stack.Screen name="Alerts"    component={AlertsScreen}    options={{ title: '🚨  Alerte' }} />
      <Stack.Screen name="AuditLog"  component={AuditLogScreen}  options={{ title: '🛡️   Jurnal activitate' }} />
      <Stack.Screen name="RpmReport" component={RpmReportScreen} options={{ title: '📊  Raport Turații' }} />
    </Stack.Navigator>
  );
}

// Tab 4 · Flotă
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
      <Stack.Screen name="Maintenance"   component={MaintenanceScreen}   options={{ title: '🔧  Mentenanță' }} />
      <Stack.Screen name="Account"       component={AccountScreen}       options={{ title: '👤  Contul meu' }} />
      <Stack.Screen name="Cockpit"       component={CockpitScreen}       options={{ headerShown: false }} />
      <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen}
        options={({ route }) => ({ title: route.params?.device?.vehicle?.licensePlate || 'Detalii' })} />
    </Stack.Navigator>
  );
}

// Diagnosis mode — separate tab navigator with purple accent
const DiagTab   = createBottomTabNavigator();
const DiagStack = createStackNavigator();

function DiagMainStack() {
  return (
    <DiagStack.Navigator screenOptions={HO} sceneContainerStyle={{ backgroundColor: '#07010F' }}>
      <DiagStack.Screen name="DiagHub"           component={DiagnosticHubScreen}  options={{ headerShown: false }} />
      <DiagStack.Screen name="LiveDiagDashboard" component={LiveDiagDashboard}    options={{ title: '📊  Dashboard Live', headerShown: false }} />
      <DiagStack.Screen name="DTCScreen"         component={DTCScreen}            options={{ title: '⚠  Coduri DTC' }} />
      <DiagStack.Screen name="CanTelemetry"      component={CanTelemetryScreen}   options={{ title: '📡  Telemetrie CAN' }} />
      <DiagStack.Screen name="DiagSessions"      component={CanTelemetryScreen}   options={{ title: '📋  Sesiuni (în curând)' }} />
      <DiagStack.Screen name="ReliabilityReport" component={CanTelemetryScreen}   options={{ title: '📈  Fiabilitate (în curând)' }} />
    </DiagStack.Navigator>
  );
}

const DIAG_TABS = [
  { name: 'Diagnoză',  icon: 'flask-outline',     iconFocused: 'flask',      color: '#A855F7' },
  { name: 'Dashboard', icon: 'pulse-outline',      iconFocused: 'pulse',      color: '#A855F7' },
  { name: 'DTC',       icon: 'bug-outline',        iconFocused: 'bug',        color: '#A855F7' },
  { name: 'Sesiuni',   icon: 'clipboard-outline',  iconFocused: 'clipboard',  color: '#A855F7' },
];

function DiagTabBar({ state, navigation }) {
  const NEON_PURPLE = '#A855F7';
  return (
    <View style={tb.container} pointerEvents="box-none">
      <View style={[tb.bar, { borderColor: 'rgba(168,85,247,0.18)' }]}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={tb.barDim} />
        <View style={[tb.accentLine, { backgroundColor: `${NEON_PURPLE}66` }]} />
      </View>
      <View style={tb.row} pointerEvents="box-none">
        {state.routes.map((route, i) => {
          const def     = DIAG_TABS[i] || DIAG_TABS[0];
          const focused = state.index === i;
          const color   = focused ? def.color : INACTIVE;
          return (
            <TouchableOpacity
              key={route.key}
              style={tb.tabItem}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={0.7}
            >
              <View style={[tb.iconWrap, focused && {
                shadowColor: def.color, shadowOpacity: 1, shadowRadius: 12,
                shadowOffset: { width: 0, height: 0 }, elevation: 10,
              }]}>
                <Ionicons name={focused ? def.iconFocused : def.icon} size={25} color={color} />
              </View>
              {focused && <View style={[tb.activeDot, { backgroundColor: def.color }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function DiagnosisApp({ diagTopPad = 96 }) {
  return (
    <DiagTab.Navigator tabBar={props => <DiagTabBar {...props} />} sceneContainerStyle={{ backgroundColor: '#07010F' }} screenOptions={{ headerShown: false }}>
      <DiagTab.Screen name="Diagnoză"  component={DiagMainStack}     initialParams={{ diagTopPad }} />
      <DiagTab.Screen name="Dashboard" component={LiveDiagDashboard} initialParams={{ diagTopPad }} />
      <DiagTab.Screen name="DTC"       component={DTCScreen}         initialParams={{ diagTopPad }} />
      <DiagTab.Screen name="Sesiuni"   component={CanTelemetryScreen} initialParams={{ diagTopPad }} />
    </DiagTab.Navigator>
  );
}

// Mode toggle pill (TRACKING / DIAGNOSIS) — anchored to safe area top
const TOGGLE_PILL_H = 38;

function ModeToggle() {
  const { top }  = useSafeAreaInsets();
  const { mode, toggleMode } = useAppMode();
  const isTracking = mode === APP_MODES.TRACKING;
  return (
    <View style={[mt.wrapper, { top }]} pointerEvents="box-none">
      <View style={mt.pill}>
        <TouchableOpacity
          style={[mt.btn, isTracking && mt.btnActive]}
          onPress={() => !isTracking && toggleMode()}
          activeOpacity={0.75}
        >
          <Ionicons name="navigate" size={13} color={isTracking ? '#FF5E00' : 'rgba(255,255,255,0.35)'} />
          <Text style={[mt.btnText, isTracking && { color: '#FF5E00' }]}>TRACKING</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[mt.btn, !isTracking && mt.btnActiveDiag]}
          onPress={() => isTracking && toggleMode()}
          activeOpacity={0.75}
        >
          <Ionicons name="flask" size={13} color={!isTracking ? '#A855F7' : 'rgba(255,255,255,0.35)'} />
          <Text style={[mt.btnText, !isTracking && { color: '#A855F7' }]}>DIAGNOSIS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const mt = StyleSheet.create({
  wrapper:       { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 999, paddingTop: 4 },
  pill:          { flexDirection: 'row', backgroundColor: 'rgba(3,0,10,0.88)', borderRadius: 24, padding: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', gap: 2 },
  btn:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  btnActive:     { backgroundColor: 'rgba(255,94,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,94,0,0.3)' },
  btnActiveDiag: { backgroundColor: 'rgba(168,85,247,0.15)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)' },
  btnText:       { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
});

const TABS = [
  { name: 'Acasă',   icon: 'home-outline',      iconFocused: 'home',      color: NEON_ORANGE },
  { name: 'Hartă',   icon: 'navigate-outline',  iconFocused: 'navigate',  color: NEON_ORANGE },
  { name: 'Analiză', icon: 'bar-chart-outline', iconFocused: 'bar-chart', color: NEON_ORANGE },
  { name: 'Flotă',   icon: 'car-outline',       iconFocused: 'car',       color: NEON_ORANGE },
];

// Racing HUD tab bar — glassmorphism floating pill
function RacingTabBar({ state, navigation }) {
  return (
    <View style={tb.container} pointerEvents="box-none">
      <View style={tb.bar}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={tb.barDim} />
        <View style={tb.accentLine} />
      </View>
      <View style={tb.row} pointerEvents="box-none">
        {state.routes.map((route, i) => {
          const def     = TABS[i];
          const focused = state.index === i;
          const color   = focused ? def.color : INACTIVE;
          return (
            <TouchableOpacity
              key={route.key}
              style={tb.tabItem}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={0.7}
            >
              <View style={[tb.iconWrap, focused && {
                shadowColor:   def.color,
                shadowOpacity: 1,
                shadowRadius:  12,
                shadowOffset:  { width: 0, height: 0 },
                elevation:     10,
              }]}>
                <Ionicons name={focused ? def.iconFocused : def.icon} size={25} color={color} />
              </View>
              {focused && <View style={[tb.activeDot, { backgroundColor: def.color }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tb = StyleSheet.create({
  container: { height: CONTAINER_H, overflow: 'visible' },
  bar: {
    position: 'absolute', bottom: BAR_BOTTOM, left: BAR_SIDE, right: BAR_SIDE,
    height: BAR_H, borderRadius: BAR_RADIUS, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  barDim:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3, 0, 10, 0.50)' },
  accentLine: {
    position: 'absolute', top: 0, left: '20%', right: '20%',
    height: 1, backgroundColor: `${NEON_ORANGE}66`, borderRadius: 1,
  },
  row: {
    position: 'absolute', bottom: BAR_BOTTOM, left: BAR_SIDE, right: BAR_SIDE,
    height: BAR_H, flexDirection: 'row', alignItems: 'center',
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: BAR_H },
  iconWrap: { alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 22 },
  activeDot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
});

// Main app shell — switches between TRACKING and DIAGNOSIS navigators
function MainApp() {
  useSecurityGuard();
  const { mode } = useAppMode();
  const { top }  = useSafeAreaInsets();
  // DIAGNOSIS screens need padding = safe area top + toggle pill height + gap
  const diagTopPad = top + TOGGLE_PILL_H + 10;

  return (
    <View style={{ flex: 1, backgroundColor: '#07010F' }}>
      <VideoBackground />
      {mode === APP_MODES.TRACKING && (
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
      )}
      {mode === APP_MODES.DIAGNOSIS && <DiagnosisApp diagTopPad={diagTopPad} />}
      <ModeToggle />
    </View>
  );
}

function RootNavigator() {
  const { user, loading, token } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user || !token) return;
    registerForPushNotifications(token);
    const socket = socketIO(WS_URL, { transports: ['websocket'], autoConnect: true });
    socket.on('connect',       () => { if (__DEV__) console.log('⚡ WS conectat'); });
    socket.on('disconnect',    () => { if (__DEV__) console.log('⚡ WS deconectat'); });
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
    <SafeAreaProvider>
      <AppModeProvider>
        <AuthProvider>
          <NavigationContainer theme={NAV_THEME}>
            <RootNavigator />
          </NavigationContainer>
          {!introDone && <IntroScreen onDone={() => setIntroDone(true)} />}
        </AuthProvider>
      </AppModeProvider>
    </SafeAreaProvider>
  );
}
