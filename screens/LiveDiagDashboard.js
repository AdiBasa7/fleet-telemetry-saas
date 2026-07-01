/**
 * ============================================================
 *  LiveDiagDashboard — Dashboard Real-Time Diagnosticare
 *  Gauge-uri SVG animate nativ, 60fps fără re-render React
 *  Date live via Socket.IO → diag_update + device_update
 * ============================================================
 */

import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions,
  TouchableOpacity,
} from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, G, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { io as socketIO } from 'socket.io-client';
import { WS_URL, API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../theme';

const { width: SW } = Dimensions.get('window');
const GAUGE_SIZE    = (SW - 48) / 2; // 2 coloane cu margini
const BOOST_W       = SW - 32;        // Boost gauge lat, full-width

// ─── Culori specifice modului diagnostic ─────────────────────
const C = {
  rpm:     '#FF5E00', // neon orange
  speed:   '#10B981', // green
  coolant: '#3B82F6', // blue
  oil:     '#F59E0B', // amber
  boost:   '#A855F7', // purple
  fuel:    '#22D3EE', // cyan
  danger:  '#EF4444',
  warn:    '#F59E0B',
  ok:      '#10B981',
  bg:      '#07010F',
  card:    'rgba(255,255,255,0.04)',
  border:  'rgba(255,255,255,0.08)',
  text:    '#FFFFFF',
  muted:   'rgba(255,255,255,0.45)',
};

// ─── Utilitare matematice gauge ───────────────────────────────
function polarToXY(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  const s   = polarToXY(cx, cy, r, startDeg);
  const e   = polarToXY(cx, cy, r, endDeg);
  const lg  = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${lg} 1 ${e.x} ${e.y}`;
}

// ─── Gauge circular semi — componenta core ────────────────────
// Primește `value` din parent (actualizat la 200ms via setInterval).
// Fără Animated.Value — re-render-ul la 200ms e imperceptibil vizual.
function CircularGauge({ value, min, max, label, unit, color, size, dangerAbove, warnAbove }) {
  const display = value ?? min;
  const cx  = size / 2;
  const cy  = size / 2;
  const r   = size * 0.38;
  const strokeW = size * 0.065;
  const START_DEG = -135;
  const END_DEG   =  135;
  const RANGE_DEG = END_DEG - START_DEG;

  const trackPath = arcPath(cx, cy, r, START_DEG, END_DEG);
  const needleDeg = START_DEG + ((Math.max(min, Math.min(max, display)) - min) / (max - min)) * RANGE_DEG;
  const needle    = polarToXY(cx, cy, r * 0.72, needleDeg);

  const activeColor = (dangerAbove && display >= dangerAbove) ? C.danger
                    : (warnAbove   && display >= warnAbove)   ? C.warn
                    : color;

  const fillRatio  = Math.max(0, Math.min(1, (display - min) / (max - min)));
  const fillEndDeg = START_DEG + fillRatio * RANGE_DEG;
  const fillPath   = arcPath(cx, cy, r, START_DEG, Math.max(START_DEG + 1, fillEndDeg));

  return (
    <View style={[gs.gaugeCont, { width: size, height: size + 24 }]}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id={`g_${label}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={activeColor} stopOpacity="1" />
            <Stop offset="1" stopColor={activeColor} stopOpacity="0.5" />
          </SvgGradient>
        </Defs>

        {/* Track gri */}
        <Path d={trackPath} stroke="rgba(255,255,255,0.08)" strokeWidth={strokeW} fill="none" strokeLinecap="round" />

        {/* Arc valoare curentă */}
        <Path d={fillPath} stroke={`url(#g_${label})`} strokeWidth={strokeW} fill="none" strokeLinecap="round" />

        {/* Tick marks — 5 mari */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const deg   = START_DEG + t * RANGE_DEG;
          const outer = polarToXY(cx, cy, r + strokeW * 0.6, deg);
          const inner = polarToXY(cx, cy, r - strokeW * 0.6, deg);
          return <Line key={t} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />;
        })}

        {/* Ac indicator */}
        <Line
          x1={cx} y1={cy}
          x2={needle.x} y2={needle.y}
          stroke={activeColor} strokeWidth={2.5}
          strokeLinecap="round"
        />
        <Circle cx={cx} cy={cy} r={size * 0.045} fill={activeColor} />
        <Circle cx={cx} cy={cy} r={size * 0.025} fill={C.bg} />

        {/* Valoare text centru */}
        <SvgText
          x={cx} y={cy + size * 0.14}
          textAnchor="middle"
          fill={activeColor}
          fontSize={size * 0.19}
          fontWeight="700"
        >
          {display}
        </SvgText>
        <SvgText
          x={cx} y={cy + size * 0.28}
          textAnchor="middle"
          fill="rgba(255,255,255,0.4)"
          fontSize={size * 0.09}
        >
          {unit}
        </SvgText>
      </Svg>
      <Text style={[gs.gaugeLabel, { color: activeColor }]}>{label}</Text>
    </View>
  );
}

// ─── Boost Bar orizontala (Actual vs Desired) ─────────────────
function BoostBar({ actual, desired, width }) {
  const maxKpa = 250;
  const actualPct  = Math.max(0, Math.min(1, (actual  || 0) / maxKpa));
  const desiredPct = Math.max(0, Math.min(1, (desired || 0) / maxKpa));
  const deficit    = desired > 0 ? Math.max(0, desired - actual) : 0;
  const deficitPct = desired > 0 ? deficit / desired : 0;

  const barColor = deficitPct > 0.3 ? C.danger : deficitPct > 0.15 ? C.warn : C.boost;

  return (
    <View style={[bb.container, { width }]}>
      <View style={bb.header}>
        <View style={bb.labelRow}>
          <Ionicons name="speedometer" size={14} color={C.boost} />
          <Text style={bb.label}>Boost Turbo</Text>
        </View>
        <View style={bb.values}>
          <Text style={[bb.actual, { color: barColor }]}>
            {actual != null ? `${actual.toFixed(0)} kPa` : '— kPa'}
          </Text>
          {desired != null && desired > 0 && (
            <Text style={bb.desired}> / {desired.toFixed(0)} dorit</Text>
          )}
        </View>
      </View>

      {/* Bar track */}
      <View style={bb.track}>
        {/* Valoare desired (fundal) */}
        {desired > 0 && (
          <View style={[bb.desiredBar, { width: `${desiredPct * 100}%` }]} />
        )}
        {/* Valoare actual */}
        <View style={[bb.actualBar, { width: `${actualPct * 100}%`, backgroundColor: barColor }]} />
      </View>

      {deficit > 10 && (
        <Text style={bb.deficit}>⚠ Deficit {deficit.toFixed(0)} kPa ({(deficitPct * 100).toFixed(0)}%)</Text>
      )}
    </View>
  );
}

// ─── Mini metric card (fuel, temp linie) ─────────────────────
function MetricCard({ icon, label, value, unit, color, warning }) {
  return (
    <View style={[mc.card, warning && mc.cardWarn]}>
      <Ionicons name={icon} size={18} color={warning ? C.warn : color} />
      <Text style={[mc.value, { color: warning ? C.warn : color }]}>
        {value != null ? `${value}` : '—'}
        <Text style={mc.unit}> {unit}</Text>
      </Text>
      <Text style={mc.label}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
export default function LiveDiagDashboard({ route }) {
  const { top }    = useSafeAreaInsets();
  const { token }  = useAuth();
  const imei       = route?.params?.imei;
  const diagTopPad = top + 38 + 20;

  // Refs pentru valorile live — nu redeclanșăm React render la fiecare frame
  const liveRef = useRef({
    engine_rpm: 0, speed_kmh: 0, coolant_temp_c: 0,
    oil_temp_c: 0, boost_actual_kpa: null, boost_desired_kpa: null,
    fuel_level_pct: 0, throttle_pct: null, intake_air_temp_c: null,
    dtc_code: null,
  });

  // State minimal pentru re-render periodic (nu la fiecare pachet!)
  const [snapshot, setSnapshot] = useState({ ...liveRef.current });
  const [troubleEvents, setTroubleEvents] = useState([]);
  const [newDtc, setNewDtc] = useState(null);
  const [connected, setConnected] = useState(false);
  const tickRef = useRef(null);

  // ── Pornire polling display la 200ms (5fps UI refresh) ───
  // Socket.IO primeste date la ~2-5s, 5fps e mai mult decat suficient pentru display
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setSnapshot({ ...liveRef.current });
    }, 200);
    return () => clearInterval(tickRef.current);
  }, []);

  // ── Socket.IO subscriptie ─────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const socket = socketIO(WS_URL, { transports: ['websocket'] });

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // Date CAN din device_update (track vehicul + CAN)
    socket.on('device_update', (data) => {
      if (imei && data.imei !== imei) return;
      const c = data.can || {};
      Object.assign(liveRef.current, {
        engine_rpm:        c.engine_rpm        ?? liveRef.current.engine_rpm,
        speed_kmh:         c.can_speed         ?? data.speed ?? liveRef.current.speed_kmh,
        coolant_temp_c:    c.coolant_temp_c    ?? liveRef.current.coolant_temp_c,
        oil_temp_c:        c.oil_temp_c        ?? liveRef.current.oil_temp_c,
        fuel_level_pct:    c.fuel_level_pct    ?? liveRef.current.fuel_level_pct,
        boost_actual_kpa:  c.boost_actual_kpa  ?? liveRef.current.boost_actual_kpa,
        boost_desired_kpa: c.boost_desired_kpa ?? liveRef.current.boost_desired_kpa,
        intake_air_temp_c: c.intake_air_temp_c ?? liveRef.current.intake_air_temp_c,
        throttle_pct:      c.throttle_pct      ?? liveRef.current.throttle_pct,
        dtc_code:          c.dtc_code          ?? liveRef.current.dtc_code,
      });
    });

    // Trouble events din diagnostic engine
    socket.on('diag_update', (data) => {
      if (imei && data.imei !== imei) return;
      if (data.troubleEvents?.length > 0) {
        setTroubleEvents(prev => [...data.troubleEvents, ...prev].slice(0, 10));
      }
      if (data.newDtc) {
        setNewDtc(data.newDtc);
        setTimeout(() => setNewDtc(null), 8000); // Banner 8s
      }
    });

    return () => socket.disconnect();
  }, [token, imei]);

  const { engine_rpm, speed_kmh, coolant_temp_c, oil_temp_c,
          boost_actual_kpa, boost_desired_kpa, fuel_level_pct,
          throttle_pct, intake_air_temp_c } = snapshot;

  return (
    <LinearGradient colors={[C.bg, '#0A0020']} style={gs.container}>
      {/* Header status */}
      <View style={[gs.header, { paddingTop: diagTopPad }]}>
        <View style={gs.connBadge}>
          <View style={[gs.dot, { backgroundColor: connected ? C.ok : C.danger }]} />
          <Text style={[gs.connText, { color: connected ? C.ok : C.danger }]}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </Text>
        </View>
        <Text style={gs.title}>Dashboard Diagnosticare</Text>
        <Text style={gs.subtitle}>AR17XKR · Alfa Romeo 159 JTDM</Text>
      </View>

      {/* Banner DTC nou detectat */}
      {newDtc && (
        <View style={[gs.dtcBanner, { borderColor: newDtc.severity === 'HIGH' ? C.danger : C.warn }]}>
          <Ionicons name="warning" size={18} color={newDtc.severity === 'HIGH' ? C.danger : C.warn} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[gs.dtcCode, { color: newDtc.severity === 'HIGH' ? C.danger : C.warn }]}>
              {newDtc.code} detectat
            </Text>
            <Text style={gs.dtcDesc} numberOfLines={1}>{newDtc.description}</Text>
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={gs.scroll}>

        {/* ── Rândul 1: RPM + Viteză ──────────────────────── */}
        <View style={gs.row}>
          <CircularGauge
            value={engine_rpm}
            min={0} max={5000}
            label="RPM" unit="rpm"
            color={C.rpm} size={GAUGE_SIZE}
            warnAbove={3500} dangerAbove={4200}
          />
          <CircularGauge
            value={speed_kmh}
            min={0} max={200}
            label="Viteză" unit="km/h"
            color={C.speed} size={GAUGE_SIZE}
            warnAbove={120} dangerAbove={160}
          />
        </View>

        {/* ── Rândul 2: Coolant + Ulei ─────────────────────── */}
        <View style={gs.row}>
          <CircularGauge
            value={coolant_temp_c}
            min={-10} max={130}
            label="Răcire" unit="°C"
            color={C.coolant} size={GAUGE_SIZE}
            warnAbove={100} dangerAbove={110}
          />
          <CircularGauge
            value={oil_temp_c}
            min={-10} max={150}
            label="Ulei" unit="°C"
            color={C.oil} size={GAUGE_SIZE}
            warnAbove={110} dangerAbove={130}
          />
        </View>

        {/* ── Boost Bar ─────────────────────────────────────── */}
        {(boost_actual_kpa != null || boost_desired_kpa != null) ? (
          <View style={gs.boostWrap}>
            <BoostBar
              actual={boost_actual_kpa}
              desired={boost_desired_kpa}
              width={BOOST_W}
            />
          </View>
        ) : (
          <View style={gs.boostUnavailable}>
            <Ionicons name="information-circle-outline" size={16} color={C.muted} />
            <Text style={gs.boostUnavailText}>
              Boost direct indisponibil — activează DEBUG_IO=1 și identifică IDs
            </Text>
          </View>
        )}

        {/* ── Mini cards ────────────────────────────────────── */}
        <View style={gs.miniRow}>
          <MetricCard icon="water" label="Combustibil" value={fuel_level_pct}
            unit="%" color={C.fuel} warning={fuel_level_pct != null && fuel_level_pct < 15} />
          <MetricCard icon="thermometer" label="Aer Admisie" value={intake_air_temp_c}
            unit="°C" color={C.boost} warning={intake_air_temp_c != null && intake_air_temp_c > 50} />
          <MetricCard icon="speedometer-outline" label="Acceleratie" value={throttle_pct}
            unit="%" color={C.rpm} />
        </View>

        {/* ── Trouble Events ────────────────────────────────── */}
        {troubleEvents.length > 0 && (
          <View style={gs.eventsSection}>
            <Text style={gs.sectionTitle}>⚠ Eventos Detectate</Text>
            {troubleEvents.slice(0, 5).map((ev, i) => (
              <View key={i} style={[gs.eventCard, {
                borderLeftColor: ev.severity === 'HIGH' ? C.danger : ev.severity === 'MEDIUM' ? C.warn : C.ok,
              }]}>
                <View style={gs.eventHeader}>
                  <Text style={[gs.eventType, {
                    color: ev.severity === 'HIGH' ? C.danger : ev.severity === 'MEDIUM' ? C.warn : C.ok,
                  }]}>{ev.type}</Text>
                  <Text style={gs.eventConf}>{Math.round((ev.confidence || 0) * 100)}% conf.</Text>
                </View>
                <Text style={gs.eventDesc}>{ev.description}</Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </LinearGradient>
  );
}

// ─── Stiluri ─────────────────────────────────────────────────
const gs = StyleSheet.create({
  container:    { flex: 1 },
  header:       { paddingTop: 12, paddingBottom: 16, paddingHorizontal: 16, alignItems: 'center' },
  connBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  dot:          { width: 7, height: 7, borderRadius: 3.5 },
  connText:     { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  title:        { color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 2 },
  subtitle:     { color: C.muted, fontSize: 12 },
  scroll:       { paddingHorizontal: 16, paddingBottom: 120 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  gaugeCont:    { alignItems: 'center', backgroundColor: C.card, borderRadius: 20, padding: 8, borderWidth: 1, borderColor: C.border },
  gaugeLabel:   { fontSize: 12, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
  boostWrap:    { marginBottom: 12, backgroundColor: C.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.border },
  boostUnavailable: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginBottom: 12, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  boostUnavailText: { color: C.muted, fontSize: 12, flex: 1 },
  miniRow:      { flexDirection: 'row', gap: 8, marginBottom: 16 },
  eventsSection: { marginBottom: 16 },
  sectionTitle: { color: C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  eventCard:    { backgroundColor: C.card, borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 3, borderWidth: 1, borderColor: C.border },
  eventHeader:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  eventType:    { fontSize: 12, fontWeight: '700' },
  eventConf:    { color: C.muted, fontSize: 11 },
  eventDesc:    { color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 18 },
  dtcBanner:    { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, padding: 12, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, borderWidth: 1 },
  dtcCode:      { fontSize: 13, fontWeight: '800' },
  dtcDesc:      { color: C.muted, fontSize: 12 },
});

const bb = StyleSheet.create({
  container:  { },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  labelRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label:      { color: C.boost, fontSize: 13, fontWeight: '700' },
  values:     { flexDirection: 'row', alignItems: 'baseline' },
  actual:     { fontSize: 16, fontWeight: '800' },
  desired:    { color: C.muted, fontSize: 12 },
  track:      { height: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden', position: 'relative' },
  desiredBar: { position: 'absolute', height: '100%', backgroundColor: 'rgba(168,85,247,0.2)', borderRadius: 6 },
  actualBar:  { height: '100%', borderRadius: 6 },
  deficit:    { color: C.warn, fontSize: 11, fontWeight: '600', marginTop: 6 },
});

const mc = StyleSheet.create({
  card:     { flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.border },
  cardWarn: { borderColor: 'rgba(245,158,11,0.4)', backgroundColor: 'rgba(245,158,11,0.06)' },
  value:    { fontSize: 18, fontWeight: '800' },
  unit:     { fontSize: 11, fontWeight: '400' },
  label:    { color: C.muted, fontSize: 10, fontWeight: '600' },
});
