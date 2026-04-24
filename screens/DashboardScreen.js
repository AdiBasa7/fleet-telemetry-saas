/**
 * ─────────────────────────────────────────────────────
 *  DashboardScreen — Analytics flotă cu design violet Poli
 * ─────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Dimensions, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { T, SHADOW } from '../theme';

const { width: W } = Dimensions.get('window');
const CHART_W = W - 48;

// ── Stat card animat ──────────────────────────────────
function StatCard({ icon, label, value, sub, color, delay = 0 }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, delay, useNativeDriver: true, tension: 60, friction: 10 }).start();
  }, []);
  return (
    <Animated.View style={[cardS.wrap, { transform: [{ scale: anim }], opacity: anim }]}>
      <LinearGradient colors={[T.bgCard2, T.bgCard]} style={cardS.inner}>
        <View style={[cardS.iconBox, { backgroundColor: color + '22' }]}>
          <Text style={cardS.iconEmoji}>{icon}</Text>
        </View>
        <Text style={[cardS.value, { color }]}>{value}</Text>
        <Text style={cardS.label}>{label}</Text>
        {sub ? <Text style={cardS.sub}>{sub}</Text> : null}
      </LinearGradient>
    </Animated.View>
  );
}

// ── Vehicul top ───────────────────────────────────────
function TopVehicleRow({ plate, km, trips, rank }) {
  const colors = ['#FBBF24', '#C0C0C0', '#CD7F32'];
  return (
    <View style={topS.row}>
      <Text style={[topS.rank, { color: colors[rank] || T.muted }]}>#{rank + 1}</Text>
      <View style={topS.info}>
        <Text style={topS.plate}>{plate}</Text>
        <Text style={topS.sub}>{trips} curse</Text>
      </View>
      <View style={topS.kmBox}>
        <Text style={topS.km}>{km}</Text>
        <Text style={topS.kmUnit}>km</Text>
      </View>
    </View>
  );
}

const CHART_CONFIG = {
  backgroundGradientFrom: T.bgCard,
  backgroundGradientTo:   T.bgCard2,
  color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`,
  labelColor: () => T.muted,
  strokeWidth: 2,
  propsForDots: { r: '4', strokeWidth: '2', stroke: T.accent },
  propsForBackgroundLines: { stroke: T.border },
  decimalPlaces: 0,
};

export default function DashboardScreen() {
  const { token } = useAuth();
  const [data,    setData]    = useState(null);
  const [days,    setDays]    = useState(7);
  const [loading, setLoading] = useState(true);

  const fetch7  = () => { setDays(7);  setLoading(true); };
  const fetch14 = () => { setDays(14); setLoading(true); };
  const fetch30 = () => { setDays(30); setLoading(true); };

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API_BASE_URL}/stats/fleet?days=${days}`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [days]);

  if (loading) return (
    <View style={s.centered}>
      <ActivityIndicator size="large" color={T.accent} />
      <Text style={s.loadTxt}>Se încarcă statisticile...</Text>
    </View>
  );

  if (!data) return (
    <View style={s.centered}>
      <Text style={{ fontSize: 48 }}>📡</Text>
      <Text style={s.errTxt}>Nu s-au putut încărca datele</Text>
    </View>
  );

  const kmLabels  = data.kmByDay.map(d => d.date.slice(5)); // "MM-DD"
  const kmValues  = data.kmByDay.map(d => d.km || 0);
  const hasKmData = kmValues.some(v => v > 0);

  const { events, fleet, totals, topVehicles } = data;
  const totalEvents = (events.crashes * 5) + events.harshAccel + events.harshBrake + events.harshCorner;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Header ── */}
        <View style={s.header}>
          {/* Decorative circles */}
          <View style={[s.circle, { width: 180, height: 180, top: -60, right: -40, opacity: 0.08 }]} />
          <View style={[s.circle, { width: 100, height: 100, top: 10, right: 80, opacity: 0.05 }]} />
          <View style={s.headerContent}>
            <Text style={s.headerTitle}>📊 Dashboard Flotă</Text>
            <Text style={s.headerSub}>Universitatea Politehnica Timișoara</Text>
          </View>
          {/* Selector zile */}
          <View style={s.daySelector}>
            {[{ label:'7Z', fn: fetch7 }, { label:'14Z', fn: fetch14 }, { label:'30Z', fn: fetch30 }].map(({ label, fn }) => (
              <TouchableOpacity
                key={label}
                style={[s.dayBtn, days === parseInt(label) && s.dayBtnActive]}
                onPress={fn}
              >
                <Text style={[s.dayBtnTxt, days === parseInt(label) && s.dayBtnTxtActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Stat cards 2x2 ── */}
        <View style={s.statsGrid}>
          <StatCard icon="🚗" label="Total vehicule" value={fleet.total}   color={T.accent}  delay={0}   />
          <StatCard icon="🟢" label="Online acum"    value={fleet.online}  color={T.green}   delay={80}  />
          <StatCard icon="🔑" label="În mișcare"     value={fleet.driving} color={T.gold}    delay={160} />
          <StatCard icon="⛔" label="Blocate"        value={fleet.blocked} color={T.red}     delay={240} />
          <StatCard icon="📍" label="Total km"       value={`${totals.km}`} sub={`ultimele ${days} zile`} color={T.primaryLight || '#9D50D4'} delay={320} />
          <StatCard icon="🛣️"  label="Curse totale"  value={totals.trips}  sub={`ultimele ${days} zile`} color={T.accent2}  delay={400} />
        </View>

        {/* ── Grafic km per zi ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>📈 Km parcurși pe zi</Text>
          {hasKmData ? (
            <LineChart
              data={{ labels: kmLabels, datasets: [{ data: kmValues }] }}
              width={CHART_W}
              height={180}
              chartConfig={CHART_CONFIG}
              bezier
              style={s.chart}
              withShadow={false}
            />
          ) : (
            <View style={s.noData}>
              <Text style={s.noDataTxt}>Nicio cursă în perioada selectată</Text>
            </View>
          )}
        </View>

        {/* ── Grafic evenimente ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>⚠️ Evenimente conducere</Text>
          <BarChart
            data={{
              labels: ['Crash', 'Acc.', 'Frân.', 'Viraj'],
              datasets: [{ data: [events.crashes, events.harshAccel, events.harshBrake, events.harshCorner] }],
            }}
            width={CHART_W}
            height={160}
            chartConfig={{
              ...CHART_CONFIG,
              color: (opacity = 1) => `rgba(248, 113, 113, ${opacity})`,
            }}
            style={s.chart}
            showValuesOnTopOfBars
            withInnerLines={false}
          />
          <View style={s.eventSummary}>
            <Text style={[s.eventBadge, { backgroundColor: T.redDim, color: T.red }]}>💥 {events.crashes} crash-uri</Text>
            <Text style={[s.eventBadge, { backgroundColor: '#fb923c22', color: T.orange }]}>⚡ {events.harshAccel + events.harshBrake} frânări/acc.</Text>
            <Text style={[s.eventBadge, { backgroundColor: T.bgCard2, color: T.muted }]}>↩️ {events.harshCorner} viraje</Text>
          </View>
        </View>

        {/* ── Top vehicule ── */}
        {topVehicles.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>🏆 Top vehicule (km)</Text>
            {topVehicles.map((v, i) => (
              <TopVehicleRow key={v.imei} rank={i} plate={v.plate} km={v.km} trips={v.trips} />
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  scroll:   { paddingBottom: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadTxt:  { color: T.accent, marginTop: 12, fontSize: 14 },
  errTxt:   { color: T.red, fontSize: 14, marginTop: 12 },

  header: {
    padding: 24, paddingTop: 52, paddingBottom: 28,
    overflow: 'hidden', position: 'relative',
    backgroundColor: 'rgba(15, 5, 40, 0.65)',
  },
  circle: {
    position: 'absolute', borderRadius: 999,
    backgroundColor: T.accent,
  },
  headerContent: { position: 'relative', zIndex: 1 },
  headerTitle:   { color: T.white, fontSize: 24, fontWeight: 'bold' },
  headerSub:     { color: T.muted, fontSize: 12, marginTop: 3 },

  daySelector: { flexDirection: 'row', gap: 8, marginTop: 16 },
  dayBtn: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: T.border,
  },
  dayBtnActive:    { backgroundColor: T.primary, borderColor: T.primary },
  dayBtnTxt:       { color: T.muted, fontSize: 13, fontWeight: '600' },
  dayBtnTxtActive: { color: T.white },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, paddingTop: 16, gap: 10,
  },

  card: {
    backgroundColor: 'rgba(25, 12, 55, 0.55)',
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    ...SHADOW,
  },
  cardTitle: { color: T.white, fontSize: 15, fontWeight: 'bold', marginBottom: 14 },
  chart:     { borderRadius: 12, marginHorizontal: -4 },
  noData:    { height: 100, justifyContent: 'center', alignItems: 'center' },
  noDataTxt: { color: T.muted, fontSize: 13 },

  eventSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  eventBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: '600', overflow: 'hidden' },
});

const cardS = StyleSheet.create({
  wrap:  { width: (W - 44) / 2 },
  inner: { borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(25, 12, 55, 0.55)', ...SHADOW },
  iconBox:  { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  iconEmoji:{ fontSize: 20 },
  value: { fontSize: 28, fontWeight: 'bold', marginBottom: 2 },
  label: { color: T.muted, fontSize: 12 },
  sub:   { color: T.muted2, fontSize: 10, marginTop: 2 },
});

const topS = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border },
  rank:   { fontSize: 18, fontWeight: 'bold', width: 32 },
  info:   { flex: 1, marginLeft: 8 },
  plate:  { color: T.white, fontWeight: '700', fontSize: 14 },
  sub:    { color: T.muted, fontSize: 11, marginTop: 2 },
  kmBox:  { alignItems: 'flex-end' },
  km:     { color: T.accent, fontWeight: 'bold', fontSize: 18 },
  kmUnit: { color: T.muted, fontSize: 11 },
});
