/**
 * ╔══════════════════════════════════════════════════════╗
 *  CockpitScreen — Bord de mașină HUD live
 *  Design: speedometer animat, telemetrie live,
 *  glassmorphism, stele animate, violet Poli
 * ╔══════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions,
  TouchableOpacity, ScrollView, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, G, Text as SvgText, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { T } from '../theme';

const { width: W, height: H } = Dimensions.get('window');
const CX = W / 2;

// ── Stele animate în fundal ───────────────────────────
const STARS = Array.from({ length: 60 }, (_, i) => ({
  x: Math.random() * W,
  y: Math.random() * H * 0.55,
  r: Math.random() * 1.8 + 0.4,
  delay: Math.random() * 2000,
}));

function StarField() {
  const anims = useRef(STARS.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    STARS.forEach((_, i) => {
      const pulse = () => Animated.sequence([
        Animated.timing(anims[i], { toValue: 1, duration: 800 + Math.random() * 1200, delay: STARS[i].delay, useNativeDriver: true }),
        Animated.timing(anims[i], { toValue: 0.2, duration: 800 + Math.random() * 1200, useNativeDriver: true }),
      ]);
      Animated.loop(pulse()).start();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {STARS.map((star, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: star.x, top: star.y,
          width: star.r * 2, height: star.r * 2, borderRadius: star.r,
          backgroundColor: '#fff', opacity: anims[i],
        }} />
      ))}
    </View>
  );
}

// ── Speedometer SVG ───────────────────────────────────
const R_OUTER = 120;
const R_INNER = 90;
const CX_SVG  = 140;
const CY_SVG  = 140;
const SZ      = 280;
const MIN_ANGLE = -220; // grade (stânga)
const MAX_ANGLE = 40;   // grade (dreapta)
const MAX_SPEED = 200;

function polarToXY(angleDeg, radius) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: CX_SVG + radius * Math.cos(rad), y: CY_SVG + radius * Math.sin(rad) };
}

function arcPath(startAngle, endAngle, r) {
  const s   = polarToXY(startAngle, r);
  const e   = polarToXY(endAngle,   r);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

function Speedometer({ speed, maxSpeed = MAX_SPEED }) {
  const animSpeed = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(animSpeed, { toValue: speed, useNativeDriver: false, tension: 40, friction: 8 }).start();
  }, [speed]);

  const [displaySpeed, setDisplaySpeed] = useState(speed);
  useEffect(() => {
    const id = animSpeed.addListener(({ value }) => setDisplaySpeed(Math.round(value)));
    return () => animSpeed.removeListener(id);
  }, []);

  const fraction   = Math.min(displaySpeed / maxSpeed, 1);
  const needleAngle = MIN_ANGLE + fraction * (MAX_ANGLE - MIN_ANGLE);

  const tickCount  = 21;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const angle  = MIN_ANGLE + (i / (tickCount - 1)) * (MAX_ANGLE - MIN_ANGLE);
    const outer  = polarToXY(angle, R_OUTER - 4);
    const inner  = polarToXY(angle, R_OUTER - (i % 5 === 0 ? 20 : 12));
    const isMajor = i % 5 === 0;
    const spd    = Math.round((i / (tickCount - 1)) * maxSpeed);
    const label  = polarToXY(angle, R_OUTER - 34);
    return { outer, inner, isMajor, spd, label };
  });

  const arcEnd     = MIN_ANGLE + fraction * (MAX_ANGLE - MIN_ANGLE);
  const needleEnd  = polarToXY(needleAngle, R_INNER - 10);
  const needleBase1 = polarToXY(needleAngle + 90, 8);
  const needleBase2 = polarToXY(needleAngle - 90, 8);

  const speedColor = displaySpeed > 130 ? T.red : displaySpeed > 80 ? T.orange : T.accent;

  return (
    <Svg width={SZ} height={SZ}>
      {/* Track background */}
      <Path d={arcPath(MIN_ANGLE, MAX_ANGLE, R_OUTER - 8)} stroke={T.border} strokeWidth={8} fill="none" strokeLinecap="round" />
      {/* Progress arc */}
      {fraction > 0 && <Path d={arcPath(MIN_ANGLE, arcEnd, R_OUTER - 8)} stroke={speedColor} strokeWidth={8} fill="none" strokeLinecap="round" />}
      {/* Glow on progress */}
      {fraction > 0 && <Path d={arcPath(MIN_ANGLE, arcEnd, R_OUTER - 8)} stroke={speedColor} strokeWidth={16} fill="none" strokeLinecap="round" opacity={0.18} />}

      {/* Ticks */}
      {ticks.map((t, i) => (
        <G key={i}>
          <Line x1={t.outer.x} y1={t.outer.y} x2={t.inner.x} y2={t.inner.y}
            stroke={t.isMajor ? 'rgba(192,132,252,0.7)' : 'rgba(192,132,252,0.3)'}
            strokeWidth={t.isMajor ? 2 : 1} strokeLinecap="round" />
          {t.isMajor && (
            <SvgText x={t.label.x} y={t.label.y + 4} textAnchor="middle"
              fill="rgba(192,132,252,0.6)" fontSize={10} fontWeight="600">
              {t.spd}
            </SvgText>
          )}
        </G>
      ))}

      {/* Inner circle glow */}
      <Circle cx={CX_SVG} cy={CY_SVG} r={R_INNER - 2} fill={T.bgCard} stroke={T.border} strokeWidth={1} />
      <Circle cx={CX_SVG} cy={CY_SVG} r={R_INNER - 8} fill="none" stroke={speedColor} strokeWidth={0.5} opacity={0.3} />

      {/* Needle */}
      <Path
        d={`M ${needleBase1.x} ${needleBase1.y} L ${needleEnd.x} ${needleEnd.y} L ${needleBase2.x} ${needleBase2.y} Z`}
        fill={speedColor} opacity={0.95}
      />
      {/* Needle center dot */}
      <Circle cx={CX_SVG} cy={CY_SVG} r={10} fill={speedColor} opacity={0.9} />
      <Circle cx={CX_SVG} cy={CY_SVG} r={5}  fill={T.bgCard} />

      {/* Speed value */}
      <SvgText x={CX_SVG} y={CY_SVG + 32} textAnchor="middle" fill={speedColor} fontSize={36} fontWeight="bold">
        {displaySpeed}
      </SvgText>
      <SvgText x={CX_SVG} y={CY_SVG + 52} textAnchor="middle" fill="rgba(192,132,252,0.5)" fontSize={13}>
        km/h
      </SvgText>
    </Svg>
  );
}

// ── Card telemetrie ───────────────────────────────────
function TelCard({ icon, label, value, color = T.accent, pulse = false }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!pulse) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  return (
    <View style={telS.wrap}>
      <LinearGradient colors={['rgba(28,13,64,0.9)', 'rgba(17,6,38,0.95)']} style={telS.card}>
        <Animated.Text style={[telS.icon, { opacity: pulse ? anim : 1 }]}>{icon}</Animated.Text>
        <Text style={[telS.value, { color }]}>{value}</Text>
        <Text style={telS.label}>{label}</Text>
      </LinearGradient>
    </View>
  );
}

export default function CockpitScreen({ route, navigation }) {
  const { token }  = useAuth();
  const device     = route?.params?.device || null;
  const imei       = device?.imei || route?.params?.imei;

  const [pos,      setPos]      = useState(device?.lastPosition || {});
  const [io,       setIo]       = useState({});
  const [address,  setAddress]  = useState('Se determină locația...');
  const [trip,     setTrip]     = useState(null);
  const scanAnim   = useRef(new Animated.Value(0)).current;

  // Scan animation pe header
  useEffect(() => {
    Animated.loop(
      Animated.timing(scanAnim, { toValue: 1, duration: 2400, useNativeDriver: true })
    ).start();
  }, []);

  // Polling live date
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [devRes, tripRes] = await Promise.all([
          fetch(`${API_BASE_URL}/devices/${imei}`,           { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/devices/${imei}/trips/active`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const devJson  = await devRes.json();
        const tripJson = await tripRes.json();
        if (devJson.success) {
          setPos(devJson.data.lastPosition || {});
          setIo(devJson.data.latestRecord?.io || {});
        }
        if (tripJson.success && tripJson.data) setTrip(tripJson.data);
        else setTrip(null);
      } catch {}
    };

    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, [imei]);

  // Geocoding când se schimbă coordonatele
  useEffect(() => {
    if (!pos.latitude || !pos.longitude) return;
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.latitude}&lon=${pos.longitude}&zoom=16`, {
      headers: { 'User-Agent': 'FleetTelemetryApp/1.0' },
    })
      .then(r => r.json())
      .then(j => {
        const a = j.address || {};
        setAddress([a.road, a.house_number, a.city || a.town || a.village].filter(Boolean).join(' ') || j.display_name?.split(',')[0] || '—');
      })
      .catch(() => setAddress('—'));
  }, [Math.round((pos.latitude || 0) * 1000), Math.round((pos.longitude || 0) * 1000)]);

  const speed     = pos.speed || 0;
  const ignition  = pos.ignition === 1;
  const plate     = device?.vehicle?.licensePlate || imei?.slice(-6) || '——';

  const scanTranslate = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, SZ + 10] });

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar barStyle="light-content" />
      <StarField />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* ── Header ── */}
        <LinearGradient colors={['#12042E', T.bg]} style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={T.accent} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.plate}>{plate}</Text>
            <View style={s.statusRow}>
              <Animated.View style={[s.dot, { backgroundColor: ignition ? T.green : '#555', opacity: ignition ? scanAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.3, 1] }) : 1 }]} />
              <Text style={[s.status, { color: ignition ? T.green : '#666' }]}>
                {ignition ? 'CONTACT PORNIT' : 'CONTACT OPRIT'}
              </Text>
            </View>
          </View>
          <View style={s.headerRight}>
            {device?.isConnected
              ? <Text style={s.liveBadge}>● LIVE</Text>
              : <Text style={[s.liveBadge, { color: '#555' }]}>OFFLINE</Text>}
          </View>
        </LinearGradient>

        {/* ── Speedometer ── */}
        <View style={s.speedWrap}>
          {/* Scan line effect */}
          <Animated.View style={[s.scanLine, { transform: [{ translateY: scanTranslate }] }]} pointerEvents="none" />
          <Speedometer speed={speed} />
        </View>

        {/* ── Adresă curentă ── */}
        <View style={s.addressWrap}>
          <Ionicons name="location" size={14} color={T.accent} />
          <Text style={s.addressTxt} numberOfLines={1}>{address}</Text>
        </View>

        {/* ── Trip activ ── */}
        {trip && (
          <LinearGradient colors={[T.primary + '22', T.bgCard]} style={s.tripCard}>
            <Text style={s.tripTitle}>🚀 Cursă activă</Text>
            <View style={s.tripRow}>
              <Text style={s.tripStat}>{(trip.distanceKm || 0).toFixed(1)} km</Text>
              <Text style={s.tripLabel}>Distanță</Text>
            </View>
            <View style={s.tripRow}>
              <Text style={s.tripStat}>{trip.startAddress || '—'}</Text>
              <Text style={s.tripLabel}>Plecare</Text>
            </View>
          </LinearGradient>
        )}

        {/* ── Grid telemetrie ── */}
        <View style={s.telGrid}>
          <TelCard icon="🔑" label="Contact"    value={ignition ? 'PORNIT' : 'OPRIT'}   color={ignition ? T.green : '#666'} pulse={ignition} />
          <TelCard icon="📡" label="Sateliți"   value={`${pos.satellites || io?.gnss_status || 0}`} />
          <TelCard icon="🔋" label="Tensiune"   value={io.external_voltage_mV ? `${(io.external_voltage_mV / 1000).toFixed(1)}V` : '—'} color={io.external_voltage_mV < 11500 ? T.red : T.green} />
          <TelCard icon="🧭" label="Direcție"   value={angleToCompass(pos.angle || 0)}  color={T.accent2} />
          <TelCard icon="⚡" label="Kill switch" value={device?.killSwitchActive ? 'ACTIV' : 'Normal'} color={device?.killSwitchActive ? T.red : T.green} />
          <TelCard icon="📍" label="Altitudine"  value={pos.altitude != null ? `${pos.altitude}m` : '—'} />
        </View>

        {/* ── Coordonate ── */}
        <View style={s.coordCard}>
          <Text style={s.coordLabel}>📍 Coordonate GPS</Text>
          <Text style={s.coord}>{pos.latitude?.toFixed(6) || '—'}, {pos.longitude?.toFixed(6) || '—'}</Text>
          {pos.timestamp && <Text style={s.coordTime}>Ultima actualizare: {new Date(pos.timestamp).toLocaleTimeString('ro-RO')}</Text>}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function angleToCompass(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SV', 'V', 'NV'];
  return dirs[Math.round(deg / 45) % 8];
}

const s = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16 },
  backBtn:     { padding: 8 },
  headerCenter:{ flex: 1, alignItems: 'center' },
  plate:       { color: T.white, fontSize: 22, fontWeight: 'bold', letterSpacing: 2 },
  statusRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  status:      { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  headerRight: { width: 60, alignItems: 'flex-end' },
  liveBadge:   { color: T.green, fontSize: 12, fontWeight: 'bold' },

  speedWrap: { alignItems: 'center', marginTop: 8, overflow: 'hidden' },
  scanLine:  {
    position: 'absolute', left: CX - 140, right: CX - 140,
    width: 280, height: 2,
    backgroundColor: 'rgba(168,85,247,0.15)',
    shadowColor: T.accent, shadowOpacity: 0.8, shadowRadius: 6,
  },

  addressWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 24, marginTop: 4 },
  addressTxt:  { color: T.muted, fontSize: 12, flex: 1 },

  tripCard:    { marginHorizontal: 16, marginTop: 14, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: T.primary + '44' },
  tripTitle:   { color: T.accent, fontWeight: 'bold', fontSize: 13, marginBottom: 8 },
  tripRow:     { marginBottom: 4 },
  tripStat:    { color: T.white, fontWeight: '700', fontSize: 14 },
  tripLabel:   { color: T.muted, fontSize: 11 },

  telGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },

  coordCard:  { marginHorizontal: 16, marginTop: 4, backgroundColor: T.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: T.border },
  coordLabel: { color: T.muted, fontSize: 11, marginBottom: 4 },
  coord:      { color: T.accent2, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  coordTime:  { color: T.muted2, fontSize: 11, marginTop: 4 },
});

const telS = StyleSheet.create({
  wrap:  { width: (W - 44) / 3 },
  card:  { borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: T.border },
  icon:  { fontSize: 22, marginBottom: 6 },
  value: { fontSize: 15, fontWeight: 'bold', textAlign: 'center', marginBottom: 2 },
  label: { color: T.muted, fontSize: 10, textAlign: 'center' },
});
