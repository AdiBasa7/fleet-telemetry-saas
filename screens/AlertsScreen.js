import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { T, SHADOW } from '../theme';

const SEVERITY = {
  critical: { color: T.red,    bg: T.redDim    },
  warning:  { color: T.orange, bg: '#fb923c22' },
  info:     { color: T.accent, bg: T.bgCard2   },
};

export default function AlertsScreen() {
  const { token } = useAuth();
  const [alerts,    setAlerts]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [, setError] = useState(null);

  const fetchAlerts = async () => {
    try {
      const devRes  = await fetch(`${API_BASE_URL}/devices`, { headers: { Authorization: `Bearer ${token}` } });
      const devJson = await devRes.json();
      if (!devJson.success) throw new Error();

      const alertArrays = await Promise.all(
        devJson.data.map(async (dev) => {
          try {
            const res  = await fetch(`${API_BASE_URL}/devices/${dev.imei}/alerts?hours=48`, { headers: { Authorization: `Bearer ${token}` } });
            const json = await res.json();
            return json.success ? json.data.map(a => ({ ...a, vehicleLabel: dev.vehicle?.licensePlate || dev.imei.slice(-6) })) : [];
          } catch { return []; }
        })
      );

      setAlerts(alertArrays.flat().sort((a, b) => new Date(b.deviceTimestamp) - new Date(a.deviceTimestamp)));
      setError(null);
    } catch { setError('Nu mă pot conecta la server.'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchAlerts(); const iv = setInterval(fetchAlerts, 30000); return () => clearInterval(iv); }, []);

  const renderAlert = ({ item }) => {
    const sev   = SEVERITY[item.alert?.severity] || SEVERITY.info;
    const time  = new Date(item.deviceTimestamp).toLocaleString('ro-RO', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
    return (
      <LinearGradient colors={[T.bgCard2, T.bgCard]} style={[aS.card, { borderLeftColor: sev.color }]}>
        <View style={[aS.sevBadge, { backgroundColor: sev.bg }]}>
          <Text style={[aS.sevTxt, { color: sev.color }]}>{item.alert?.label}</Text>
        </View>
        <Text style={aS.vehicle}>🚗 {item.vehicleLabel}</Text>
        <Text style={aS.meta}>🕒 {time}</Text>
        <Text style={aS.meta}>📍 {item.gps?.latitude?.toFixed(5)}, {item.gps?.longitude?.toFixed(5)}</Text>
        <Text style={aS.meta}>⚡ {item.gps?.speed} km/h</Text>
        {item.io?.greenDriving_value > 0 && (
          <Text style={[aS.intensity, { color: sev.color }]}>Intensitate: {item.io.greenDriving_value} mg</Text>
        )}
      </LinearGradient>
    );
  };

  if (loading) return (
    <LinearGradient colors={[T.bg, T.bgCard]} style={s.centered}>
      <ActivityIndicator size="large" color={T.accent} />
      <Text style={s.loadTxt}>Se încarcă alertele...</Text>
    </LinearGradient>
  );

  return (
    <LinearGradient colors={[T.bg, '#0F0328']} style={{ flex: 1 }}>
      <LinearGradient colors={['#1A0B3E', '#0E0428']} style={s.header}>
        <Text style={s.title}>🚨 Alerte Flotă</Text>
        <Text style={s.sub}>{alerts.length} evenimente · ultimele 48h</Text>
      </LinearGradient>

      {alerts.length === 0 ? (
        <View style={s.centered}>
          <Text style={{ fontSize: 56 }}>✅</Text>
          <Text style={s.emptyTitle}>Nicio alertă</Text>
          <Text style={s.emptySub}>Flota a condus normal în ultimele 48 de ore.</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={item => item._id}
          renderItem={renderAlert}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAlerts(); }} tintColor={T.accent} />}
        />
      )}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  centered:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header:     { padding: 20, paddingTop: 52 },
  title:      { color: T.white, fontSize: 22, fontWeight: 'bold' },
  sub:        { color: T.muted, fontSize: 13, marginTop: 4 },
  loadTxt:    { color: T.accent, marginTop: 12, fontSize: 14 },
  emptyTitle: { color: T.green, fontSize: 20, fontWeight: 'bold', marginTop: 14 },
  emptySub:   { color: T.muted, fontSize: 14, textAlign: 'center', marginTop: 6 },
});

const aS = StyleSheet.create({
  card:      { borderRadius: 14, padding: 14, borderLeftWidth: 4, borderWidth: 1, borderColor: T.border, ...SHADOW },
  sevBadge:  { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 8 },
  sevTxt:    { fontSize: 14, fontWeight: 'bold' },
  vehicle:   { color: T.white, fontWeight: '700', fontSize: 14, marginBottom: 6 },
  meta:      { color: T.muted, fontSize: 13, marginBottom: 3 },
  intensity: { fontSize: 13, fontWeight: 'bold', marginTop: 6 },
});
