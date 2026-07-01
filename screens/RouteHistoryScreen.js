import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../theme';

const PERIODS = [
  { label: 'Azi',    hours: 24 },
  { label: 'Ieri',   hours: 48 },
  { label: '7 Zile', hours: 168 },
];

export default function RouteHistoryScreen({ route }) {
  const navigation  = useNavigation();
  const { top }     = useSafeAreaInsets();
  const { device }  = route.params;
  const { token }   = useAuth();
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [period,  setPeriod]    = useState(PERIODS[0]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/devices/${device.imei}/history?hours=${period.hours}&limit=500`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setRecords([...json.data].reverse());
    } catch {}
    finally { setLoading(false); }
  }, [device.imei, token, period]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const coords = records.filter(r => r.gps?.latitude && r.gps?.longitude).map(r => ({ latitude: r.gps.latitude, longitude: r.gps.longitude }));

  const totalKm = coords.reduce((acc, pt, i) => {
    if (i === 0) return acc;
    const prev = coords[i - 1];
    const R = 6371;
    const dLat = (pt.latitude  - prev.latitude)  * Math.PI / 180;
    const dLon = (pt.longitude - prev.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(prev.latitude * Math.PI/180) * Math.cos(pt.latitude * Math.PI/180) * Math.sin(dLon/2)**2;
    return acc + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }, 0);

  const maxSpeed = records.reduce((mx, r) => Math.max(mx, r.gps?.speed || 0), 0);
  const mid      = Math.floor(coords.length / 2);
  const region   = coords.length > 0
    ? { latitude: coords[mid].latitude, longitude: coords[mid].longitude, latitudeDelta: 0.15, longitudeDelta: 0.15 }
    : { latitude: 45.7489, longitude: 21.2087, latitudeDelta: 0.3, longitudeDelta: 0.3 };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Header */}
      <LinearGradient colors={['#1A0B3E', T.bg]} style={[s.headerRow, { paddingTop: top + 52 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backTxt}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Traseu · {device?.vehicle?.licensePlate || '—'}</Text>
      </LinearGradient>

      {/* Selector perioadă */}
      <LinearGradient colors={['#1A0B3E', T.bg]} style={s.periodWrap}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.label}
            style={[s.periodBtn, period.label === p.label && s.periodBtnA]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[s.periodTxt, period.label === p.label && s.periodTxtA]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </LinearGradient>

      {/* Hartă */}
      {loading ? (
        <View style={s.loadWrap}>
          <ActivityIndicator size="large" color={T.accent} />
          <Text style={s.loadTxt}>Se încarcă traseul...</Text>
        </View>
      ) : (
        <MapView style={{ flex: 1 }} region={region}>
          {coords.length > 1 && (
            <Polyline coordinates={coords} strokeColor={T.accent} strokeWidth={4} />
          )}
          {coords.length > 0 && (
            <>
              <Marker coordinate={coords[0]}             pinColor="green" title="Start" description={new Date(records[0]?.deviceTimestamp).toLocaleTimeString('ro-RO')} />
              <Marker coordinate={coords[coords.length - 1]} pinColor="red"   title="Final" description={new Date(records[records.length - 1]?.deviceTimestamp).toLocaleTimeString('ro-RO')} />
            </>
          )}
        </MapView>
      )}

      {/* Statistici */}
      <LinearGradient colors={[T.bgCard, T.bgCard2]} style={s.statsRow}>
        {[
          { icon: '📍', label: 'Puncte GPS', value: String(records.length) },
          { icon: '🛣️',  label: 'Distanță',   value: `${totalKm.toFixed(1)} km` },
          { icon: '⚡', label: 'Vit. max',   value: `${maxSpeed} km/h` },
        ].map(({ icon, label, value }) => (
          <View key={label} style={s.statCard}>
            <Text style={s.statIcon}>{icon}</Text>
            <Text style={s.statVal}>{value}</Text>
            <Text style={s.statLbl}>{label}</Text>
          </View>
        ))}
      </LinearGradient>

      {coords.length === 0 && !loading && (
        <View style={s.empty}>
          <Text style={s.emptyTxt}>Nicio deplasare înregistrată în această perioadă.</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  headerRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  backBtn:     { padding: 4 },
  backTxt:     { color: '#fff', fontSize: 32, lineHeight: 34 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 },
  periodWrap:  { flexDirection: 'row', padding: 10, gap: 8 },
  periodBtn:   { flex: 1, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: T.border, alignItems: 'center' },
  periodBtnA:  { borderColor: T.primary, backgroundColor: T.primary + '33' },
  periodTxt:   { fontSize: 13, color: T.muted },
  periodTxtA:  { color: T.accent, fontWeight: '700' },
  loadWrap:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadTxt:     { marginTop: 12, color: T.accent, fontSize: 14 },
  statsRow:    { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: T.border },
  statCard:    { flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: T.bgCard3, borderRadius: 12 },
  statIcon:    { fontSize: 20, marginBottom: 2 },
  statVal:     { fontSize: 15, fontWeight: 'bold', color: T.accent },
  statLbl:     { fontSize: 10, color: T.muted, marginTop: 2 },
  empty:       { padding: 20, alignItems: 'center' },
  emptyTxt:    { color: T.muted, fontSize: 14, textAlign: 'center' },
});
