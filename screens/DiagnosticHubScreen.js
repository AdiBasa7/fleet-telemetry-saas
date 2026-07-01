/**
 * ─────────────────────────────────────────────────────
 *  DiagnosticHubScreen — Home ecran modul DIAGNOSIS
 *  Echivalentul MainMenuScreen dar pentru diagnoza
 *  Afișează status general vehicul + shortcuturi la
 *  funcțiile de diagnosticare
 * ─────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, ActivityIndicator,
} from 'react-native';
import { LinearGradient }  from 'expo-linear-gradient';
import { Ionicons }        from '@expo/vector-icons';
import { useNavigation }   from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL }    from '../config';
import { useAuth }         from '../context/AuthContext';
import { T, SHADOW }       from '../theme';

const C = {
  critical: '#EF4444',
  warning:  '#F59E0B',
  ok:       '#10B981',
  purple:   '#A855F7',
  cyan:     '#22D3EE',
};

// ─── Status orb animat ────────────────────────────────────────
function StatusOrb({ status }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const color = status === 'CRITICAL' ? C.critical : status === 'WARNING' ? C.warning : C.ok;

  useEffect(() => {
    if (status === 'OK') return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [status]);

  return (
    <Animated.View style={[orb.wrap, { transform: [{ scale: pulse }] }]}>
      <View style={[orb.outer, { borderColor: color + '44' }]}>
        <View style={[orb.inner, { backgroundColor: color + '22', borderColor: color + '88' }]}>
          <View style={[orb.core, { backgroundColor: color }]} />
        </View>
      </View>
      <Text style={[orb.label, { color }]}>
        {status === 'CRITICAL' ? 'CRITIC' : status === 'WARNING' ? 'AVERTIZARE' : 'SISTEM OK'}
      </Text>
    </Animated.View>
  );
}

const orb = StyleSheet.create({
  wrap:  { alignItems: 'center', marginBottom: 24 },
  outer: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  inner: { width: 76, height: 76, borderRadius: 38, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  core:  { width: 32, height: 32, borderRadius: 16 },
  label: { marginTop: 10, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
});

// ─── Shortcut card ────────────────────────────────────────────
const SHORTCUTS = [
  { id: 'live',    icon: 'pulse',          label: 'Dashboard Live',        sub: 'Gauge-uri RPM, Boost, Temp',    screen: 'LiveDiagDashboard', colors: ['#1C0D40', '#2D1260'], color: C.purple  },
  { id: 'dtc',     icon: 'bug',            label: 'Coduri DTC',            sub: 'Coduri eroare active',           screen: 'DTCScreen',         colors: ['#0D2010', '#1A3A20'], color: C.ok      },
  { id: 'session', icon: 'clipboard',      label: 'Sesiuni Diagnosticare', sub: 'Istoric sesiuni și evenimente',  screen: 'DiagSessions',      colors: ['#1A0D30', '#2A1450'], color: C.cyan    },
  { id: 'report',  icon: 'document-text',  label: 'Raport Fiabilitate',    sub: 'Statistici și tendințe',         screen: 'ReliabilityReport', colors: ['#1A1000', '#2A1A00'], color: C.warning },
];

// Componentă separată — useRef nu poate fi apelat în .map()
function ShortcutCard({ item, onPress, dtcCount }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[dh.shortcutWrap, { transform: [{ scale }] }]}>
      <TouchableOpacity
        onPress={() => onPress(item.screen)}
        onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 50 }).start()}
        activeOpacity={1}
      >
        <LinearGradient colors={item.colors} style={[dh.shortcut, { borderColor: item.color + '33' }]}>
          <View style={[dh.shortcutIcon, { backgroundColor: item.color + '18', borderColor: item.color + '33' }]}>
            <Ionicons name={item.icon} size={28} color={item.color} />
          </View>
          <Text style={[dh.shortcutLabel, { color: item.color }]}>{item.label}</Text>
          <Text style={dh.shortcutSub}>{item.sub}</Text>
          {item.id === 'dtc' && dtcCount > 0 && (
            <View style={dh.badge}>
              <Text style={dh.badgeText}>{dtcCount}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function DiagnosticHubScreen({ route }) {
  const navigation  = useNavigation();
  const { top }     = useSafeAreaInsets();
  const { token }   = useAuth();
  const imei        = route?.params?.imei;
  const diagTopPad  = top + 38 + 20; // safeAreaTop + pill height + gap

  const [status, setStatus]     = useState('OK');
  const [dtcCount, setDtcCount] = useState(0);
  const [session, setSession]   = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!imei) { setLoading(false); return; }

    async function load() {
      try {
        const [dtcRes, sessRes] = await Promise.all([
          fetch(`${API_BASE_URL}/diagnostics/${imei}/dtc`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/diagnostics/${imei}/sessions/active`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const [dtcJson, sessJson] = await Promise.all([dtcRes.json(), sessRes.json()]);

        if (dtcJson.success) {
          const highCount = dtcJson.data.filter(d => d.severity === 'HIGH').length;
          const medCount  = dtcJson.data.filter(d => d.severity === 'MEDIUM').length;
          setDtcCount(dtcJson.data.length);
          setStatus(highCount > 0 ? 'CRITICAL' : medCount > 0 ? 'WARNING' : 'OK');
        }
        if (sessJson.success && sessJson.data) {
          setSession(sessJson.data);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [imei, token]);

  const navigate = (screen) => {
    navigation.navigate(screen, { imei });
  };

  return (
    <LinearGradient colors={['#07010F', '#0A0025']} style={dh.container}>
      {/* Header — paddingTop dinamic ca să nu se suprapună cu toggle-ul */}
      <View style={[dh.header, { paddingTop: diagTopPad }]}>
        <View style={dh.modeBadge}>
          <Ionicons name="flask" size={12} color={C.purple} />
          <Text style={dh.modeText}>MOD DIAGNOSTICARE</Text>
        </View>
        <Text style={dh.title}>Tele-Diagnoză OBD2</Text>
        <Text style={dh.imeiText}>AR17XKR · Alfa Romeo 159 JTDM</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={C.purple} style={{ flex: 1 }} />
      ) : (
        <ScrollView contentContainerStyle={dh.scroll} showsVerticalScrollIndicator={false}>

          {/* Status orb */}
          <StatusOrb status={status} />

          {/* Info pills */}
          <View style={dh.pills}>
            <View style={[dh.pill, dtcCount > 0 && { borderColor: dtcCount > 0 ? C.warning : C.ok }]}>
              <Text style={[dh.pillVal, { color: dtcCount > 0 ? C.critical : C.ok }]}>{dtcCount}</Text>
              <Text style={dh.pillLabel}>DTC active</Text>
            </View>
            <View style={dh.pill}>
              <Text style={[dh.pillVal, { color: C.purple }]}>
                {session ? 'ACTIVA' : '—'}
              </Text>
              <Text style={dh.pillLabel}>Sesiune</Text>
            </View>
            {session && (
              <View style={dh.pill}>
                <Text style={[dh.pillVal, { color: C.cyan }]}>
                  {session.troubleEvents?.length || 0}
                </Text>
                <Text style={dh.pillLabel}>Eventos</Text>
              </View>
            )}
          </View>

          {/* Sesiune activa banner */}
          {session && (
            <View style={dh.sessionBanner}>
              <View style={dh.sessionDot} />
              <Text style={dh.sessionText}>
                Sesiune activă din {new Date(session.startTime).toLocaleTimeString('ro-RO')}
              </Text>
              <Text style={dh.sessionDtcCount}>{session.dtcCount} DTC</Text>
            </View>
          )}

          {/* Shortcuturi */}
          <View style={dh.grid}>
            {SHORTCUTS.map((item) => (
              <ShortcutCard key={item.id} item={item} onPress={navigate} dtcCount={dtcCount} />
            ))}
          </View>

          <Text style={dh.footer}>Fleet Telemetry · Tele-Diagnoză · UPT ETcTI</Text>
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const dh = StyleSheet.create({
  container:     { flex: 1 },
  header:        { paddingTop: 16, paddingBottom: 20, alignItems: 'center' },
  modeBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(168,85,247,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(168,85,247,0.25)', marginBottom: 12 },
  modeText:      { color: C.purple, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  title:         { color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  imeiText:      { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  scroll:        { paddingHorizontal: 20, paddingBottom: 120, alignItems: 'center' },
  pills:         { flexDirection: 'row', gap: 12, marginBottom: 16 },
  pill:          { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  pillVal:       { fontSize: 20, fontWeight: '800' },
  pillLabel:     { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  sessionBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(168,85,247,0.1)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(168,85,247,0.25)', width: '100%' },
  sessionDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: C.purple },
  sessionText:   { flex: 1, color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  sessionDtcCount: { color: C.purple, fontWeight: '700', fontSize: 12 },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: '100%', justifyContent: 'space-between' },
  shortcutWrap:  { width: '47%' },
  shortcut:      { borderRadius: 20, padding: 18, borderWidth: 1, minHeight: 140, justifyContent: 'space-between', position: 'relative' },
  shortcutIcon:  { width: 52, height: 52, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  shortcutLabel: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  shortcutSub:   { color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 16 },
  badge:         { position: 'absolute', top: 10, right: 10, backgroundColor: C.critical, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText:     { color: '#FFF', fontSize: 11, fontWeight: '800' },
  footer:        { color: 'rgba(255,255,255,0.15)', fontSize: 10, marginTop: 24 },
});
