import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Callout } from 'react-native-maps';
import { API_BASE_URL, POLLING_INTERVAL_MS } from '../config';
import { useAuth } from '../context/AuthContext';
import { T } from '../theme';

export default function FleetMapScreen({ navigation }) {
  const { top }                 = useSafeAreaInsets();
  const { token }               = useAuth();
  const [devices, setDevices]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(null);
  const [showList,setShowList]  = useState(false);
  const mapRef                  = useRef(null);

  const fetchDevices = async () => {
    try {
      const res  = await fetch(`${API_BASE_URL}/devices`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) { setDevices(json.data); setError(null); }
    } catch { setError('Nu mă pot conecta la server.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchDevices();
    const iv = setInterval(fetchDevices, POLLING_INTERVAL_MS);
    return () => clearInterval(iv);
  }, []);

  // WebSocket live updates
  useEffect(() => {
    global.onDeviceUpdate = (data) => {
      setDevices(prev => prev.map(d =>
        d.imei === data.imei
          ? { ...d, lastPosition: { ...d.lastPosition, latitude: data.latitude, longitude: data.longitude, speed: data.speed, angle: data.angle, ignition: data.ignition, timestamp: data.timestamp } }
          : d
      ));
    };
    return () => { global.onDeviceUpdate = null; };
  }, []);

  const goToVehicle = (device) => {
    const pos = device.lastPosition;
    if (!pos?.latitude) return;
    setShowList(false);
    mapRef.current?.animateToRegion({ latitude: pos.latitude, longitude: pos.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 }, 600);
  };

  if (loading) return (
    <View style={[s.centered, { backgroundColor: '#07010F' }]}>
      <ActivityIndicator size="large" color={T.accent} />
      <Text style={s.loadTxt}>Se încarcă flota...</Text>
    </View>
  );

  if (error) return (
    <View style={[s.centered, { backgroundColor: '#07010F' }]}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>📡</Text>
      <Text style={s.errTxt}>{error}</Text>
      <TouchableOpacity style={s.retryBtn} onPress={fetchDevices}>
        <Text style={s.retryTxt}>Încearcă din nou</Text>
      </TouchableOpacity>
    </View>
  );

  const firstDevice   = devices.find(d => d.lastPosition?.latitude);
  const initialRegion = firstDevice
    ? { latitude: firstDevice.lastPosition.latitude, longitude: firstDevice.lastPosition.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : { latitude: 45.7489, longitude: 21.2087, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  const activeCount  = devices.filter(d => d.lastPosition?.ignition === 1).length;
  const blockedCount = devices.filter(d => d.killSwitchActive).length;
  const offlineCount = devices.filter(d => !d.isConnected).length;

  return (
    <View style={{ flex: 1 }}>
      <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={initialRegion} mapType="standard">
        {devices.map((device) => {
          const pos = device.lastPosition;
          if (!pos?.latitude) return null;
          const pinColor = device.killSwitchActive ? 'red' : pos.ignition === 1 ? 'green' : 'gray';
          return (
            <Marker key={device.imei} coordinate={{ latitude: pos.latitude, longitude: pos.longitude }} pinColor={pinColor} title={device.vehicle?.licensePlate || device.imei}>
              <Callout onPress={() => navigation.navigate('VehicleDetail', { device })} style={s.callout}>
                <Text style={s.calloutTitle}>{device.vehicle?.licensePlate || device.imei}</Text>
                <Text style={s.calloutRow}>🚗 {pos.speed} km/h</Text>
                <Text style={s.calloutRow}>{pos.ignition === 1 ? '🔑 Contact ON' : '🔴 Contact OFF'}</Text>
                {device.killSwitchActive && <Text style={s.calloutKill}>⛔ BLOCAT</Text>}
                <Text style={s.calloutLink}>Apasă pentru detalii →</Text>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Badge top-right */}
      <TouchableOpacity style={[s.badgeWrap, { top: top + 48 }]} onPress={() => setShowList(true)} activeOpacity={0.85}>
        <LinearGradient colors={T.grad} style={s.badge}>
          <Text style={s.badgeTxt}>🚗 {activeCount}/{devices.length} active</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Stats bottom */}
      <LinearGradient colors={['transparent', 'rgba(7,1,15,0.92)']} style={s.bottomOverlay} pointerEvents="none">
        <View style={s.statsRow}>
          {[{ e:'🟢', l:'Active',  v: activeCount,  c: T.green  },
            { e:'🔴', l:'Blocate', v: blockedCount, c: T.red    },
            { e:'📡', l:'Offline', v: offlineCount, c: T.orange },
            { e:'🚗', l:'Total',   v: devices.length, c: T.accent }
          ].map(({ e, l, v, c }) => (
            <View key={l} style={s.pill}>
              <Text style={s.pillVal}>{v}</Text>
              <Text style={[s.pillLbl, { color: c }]}>{e} {l}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Modal lista */}
      <Modal visible={showList} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowList(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top']}>
          <LinearGradient colors={['#1A0B3E', '#0E0428']} style={s.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalTitle}>🚗 Flota ta</Text>
              <Text style={s.modalSub}>{devices.length} vehicule · {activeCount} active</Text>
            </View>
            <TouchableOpacity onPress={() => setShowList(false)} style={s.closeBtn}>
              <Text style={s.closeTxt}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>

          <FlatList
            data={devices}
            keyExtractor={item => item.imei}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
            renderItem={({ item }) => {
              const pos    = item.lastPosition;
              const hasGPS = !!pos?.latitude;
              const sc     = item.killSwitchActive ? T.red : pos?.ignition === 1 ? T.green : '#555';
              const sl     = item.killSwitchActive ? '⛔ Blocat' : pos?.ignition === 1 ? '🔑 Pornit' : '🔴 Oprit';
              return (
                <LinearGradient colors={[T.bgCard2, T.bgCard]} style={s.vCard}>
                  <View style={[s.vAccent, { backgroundColor: sc }]} />
                  <View style={{ flex: 1, padding: 14 }}>
                    <Text style={s.vPlate}>{item.vehicle?.licensePlate || item.imei}</Text>
                    <Text style={s.vMake}>{item.vehicle?.make} {item.vehicle?.model}{item.vehicle?.year ? ` · ${item.vehicle.year}` : ''}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <View style={[s.vDot, { backgroundColor: sc }]} />
                      <Text style={[s.vStatus, { color: sc }]}>{sl}</Text>
                      {pos?.speed > 0 && <Text style={s.vSpeed}> · {pos.speed} km/h</Text>}
                    </View>
                  </View>
                  <TouchableOpacity style={[s.goBtn, !hasGPS && { opacity: 0.4 }]} onPress={() => goToVehicle(item)} disabled={!hasGPS}>
                    <LinearGradient colors={hasGPS ? T.grad : ['#333','#444']} style={s.goBtnGrad}>
                      <Text style={{ fontSize: 18, marginBottom: 2 }}>{hasGPS ? '📍' : '📡'}</Text>
                      <Text style={s.goTxt}>{hasGPS ? 'Du-mă' : 'Fără GPS'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadTxt:     { marginTop: 14, color: T.accent, fontSize: 15 },
  errTxt:      { color: T.red, fontSize: 15, textAlign: 'center', marginBottom: 24 },
  retryBtn:    { backgroundColor: T.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  retryTxt:    { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  callout:     { padding: 8, minWidth: 170 },
  calloutTitle:{ fontWeight: 'bold', fontSize: 15, marginBottom: 6 },
  calloutRow:  { fontSize: 13, color: '#444', marginBottom: 2 },
  calloutKill: { color: '#d32f2f', fontWeight: 'bold', marginTop: 2 },
  calloutLink: { color: T.primary, marginTop: 6, fontSize: 12 },
  badgeWrap:   { position: 'absolute', right: 14 },
  badge:       { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22, shadowColor: T.glow, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 },
  badgeTxt:    { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 40, paddingBottom: 20, paddingHorizontal: 8 },
  statsRow:    { flexDirection: 'row', justifyContent: 'space-around' },
  pill:        { alignItems: 'center', flex: 1 },
  pillVal:     { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  pillLbl:     { fontSize: 10, fontWeight: '600', marginTop: 2 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 },
  modalTitle:  { color: T.white, fontSize: 20, fontWeight: 'bold' },
  modalSub:    { color: T.muted, fontSize: 13, marginTop: 2 },
  closeBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: T.border, justifyContent: 'center', alignItems: 'center' },
  closeTxt:    { color: T.white, fontSize: 16, fontWeight: 'bold' },
  vCard:       { borderRadius: 16, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: T.border },
  vAccent:     { width: 4, alignSelf: 'stretch' },
  vPlate:      { fontSize: 17, fontWeight: 'bold', color: T.white, letterSpacing: 1 },
  vMake:       { fontSize: 12, color: T.muted, marginTop: 2 },
  vDot:        { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  vStatus:     { fontSize: 13, fontWeight: '600' },
  vSpeed:      { fontSize: 13, color: T.muted2 },
  goBtn:       { padding: 12 },
  goBtnGrad:   { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', minWidth: 72 },
  goTxt:       { color: '#fff', fontWeight: 'bold', fontSize: 11 },
});
