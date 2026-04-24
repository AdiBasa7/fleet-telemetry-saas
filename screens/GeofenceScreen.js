import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Circle } from 'react-native-maps';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { T, SHADOW } from '../theme';

const RADIUS_OPTIONS = [
  { label: '100 m',  value: 0.1 },
  { label: '200 m',  value: 0.2 },
  { label: '500 m',  value: 0.5 },
  { label: '1 km',   value: 1 },
  { label: '5 km',   value: 5 },
  { label: '25 km',  value: 25 },
  { label: '50 km',  value: 50 },
  { label: '100 km', value: 100 },
];

export default function GeofenceScreen() {
  const { token } = useAuth();
  const [devices, setDevices]               = useState([]);
  const [selectedImei, setSelectedImei]     = useState(null);
  const [geofence, setGeofence]             = useState(null);
  const [pendingCenter, setPendingCenter]   = useState(null);
  const [selectedRadius, setSelectedRadius] = useState(1);
  const [alerts, setAlerts]                 = useState([]);
  const [saving, setSaving]                 = useState(false);
  const mapRef                              = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/devices`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data.length > 0) {
          setDevices(json.data);
          setSelectedImei(json.data[0].imei);
        }
      })
      .catch(() => {});
  }, []);

  const fetchData = async () => {
    if (!selectedImei) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [geoRes, alertRes] = await Promise.all([
        fetch(`${API_BASE_URL}/devices/${selectedImei}/geofence`, { headers }),
        fetch(`${API_BASE_URL}/devices/${selectedImei}/geofence/alerts?limit=10&hours=168`, { headers }),
      ]);
      const geoJson   = await geoRes.json();
      const alertJson = await alertRes.json();

      if (geoJson.success && geoJson.data?.enabled) {
        setGeofence(geoJson.data);
        setSelectedRadius(geoJson.data.radiusKm);
      }
      if (alertJson.success) setAlerts(alertJson.data);
    } catch {}
  };

  useEffect(() => { fetchData(); }, [selectedImei]);

  const handleMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setPendingCenter({ latitude, longitude });
  };

  const saveGeofence = async () => {
    const center = pendingCenter || (geofence?.enabled
      ? { latitude: geofence.centerLat, longitude: geofence.centerLon }
      : null);

    if (!center) {
      Alert.alert('⚠️ Atenție', 'Apasă pe hartă pentru a seta centrul zonei.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/devices/${selectedImei}/geofence`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ centerLat: center.latitude, centerLon: center.longitude, radiusKm: selectedRadius }),
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert('✅ Geofence setat', json.message);
        setPendingCenter(null);
        fetchData();
      } else {
        Alert.alert('❌ Eroare', json.error);
      }
    } catch {
      Alert.alert('❌ Eroare rețea', 'Nu s-a putut salva geofence-ul.');
    } finally {
      setSaving(false);
    }
  };

  const deleteGeofence = () => {
    Alert.alert(
      'Dezactivare Geofence',
      'Ești sigur că vrei să dezactivezi zona de geofencing?',
      [
        { text: 'Anulează', style: 'cancel' },
        {
          text: 'Dezactivează', style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_BASE_URL}/devices/${selectedImei}/geofence`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              setGeofence(null);
              setPendingCenter(null);
              Alert.alert('✅ Geofence dezactivat');
            } catch {
              Alert.alert('❌ Eroare', 'Nu s-a putut dezactiva.');
            }
          },
        },
      ]
    );
  };

  const mapCenter = pendingCenter
    || (geofence?.enabled ? { latitude: geofence.centerLat, longitude: geofence.centerLon } : null)
    || { latitude: 45.7489, longitude: 21.2087 };

  const displayCenter = pendingCenter
    || (geofence?.enabled ? { latitude: geofence.centerLat, longitude: geofence.centerLon } : null);

  return (
    <LinearGradient colors={[T.bg, '#0F0328']} style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient colors={['#1A0B3E', '#0E0428']} style={s.header}>
          <Text style={s.title}>📍 Geofencing</Text>
          <Text style={s.sub}>Setează zone de alertă pentru vehicule</Text>
        </LinearGradient>

        {/* Selector mașină */}
        {devices.length > 1 && (
          <View style={s.pickerWrap}>
            <Text style={s.pickerLabel}>Vehicul:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {devices.map(dev => (
                <TouchableOpacity
                  key={dev.imei}
                  style={[s.chip, selectedImei === dev.imei && s.chipActive]}
                  onPress={() => {
                    setSelectedImei(dev.imei);
                    setGeofence(null);
                    setPendingCenter(null);
                    setAlerts([]);
                  }}
                >
                  <Text style={[s.chipTxt, selectedImei === dev.imei && s.chipTxtActive]}>
                    {dev.vehicle?.licensePlate || dev.imei.slice(-6)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Hartă */}
        <MapView
          ref={mapRef}
          style={s.map}
          initialRegion={{
            ...mapCenter,
            latitudeDelta:  selectedRadius ? selectedRadius / 50 : 0.1,
            longitudeDelta: selectedRadius ? selectedRadius / 50 : 0.1,
          }}
          onPress={handleMapPress}
        >
          {displayCenter && (
            <>
              <Circle
                center={displayCenter}
                radius={selectedRadius * 1000}
                strokeColor={T.primary + 'CC'}
                strokeWidth={2}
                fillColor={T.primary + '22'}
              />
              <Marker
                coordinate={displayCenter}
                pinColor="#9333EA"
                title="Centrul Geofence"
                description={`Raza: ${selectedRadius < 1 ? (selectedRadius * 1000) + ' m' : selectedRadius + ' km'}`}
              />
            </>
          )}
        </MapView>

        <View style={s.mapHintWrap}>
          <Text style={s.mapHint}>
            {pendingCenter
              ? '📍 Centru setat — alege raza și apasă Salvează'
              : '👆 Apasă pe hartă pentru a seta centrul zonei'}
          </Text>
        </View>

        {/* Selector rază */}
        <View style={s.card}>
          <Text style={s.cardTitle}>📏 Raza Zonei</Text>
          <View style={s.radiusRow}>
            {RADIUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[s.radiusBtn, selectedRadius === opt.value && s.radiusBtnActive]}
                onPress={() => setSelectedRadius(opt.value)}
              >
                <Text style={[s.radiusBtnTxt, selectedRadius === opt.value && s.radiusBtnTxtActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Butoane acțiune */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={saveGeofence}
            disabled={saving}
          >
            <LinearGradient colors={T.grad} style={s.saveBtnGrad}>
              <Text style={s.saveBtnTxt}>{saving ? 'Se salvează...' : '✅ Salvează Geofence'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {geofence?.enabled && (
            <TouchableOpacity style={s.deleteBtn} onPress={deleteGeofence}>
              <Text style={s.deleteBtnTxt}>🗑️ Dezactivează</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status curent */}
        {geofence?.enabled && (
          <View style={s.card}>
            <Text style={s.cardTitle}>📡 Geofence Activ</Text>
            <Text style={s.statusTxt}>Centru: {geofence.centerLat?.toFixed(5)}, {geofence.centerLon?.toFixed(5)}</Text>
            <Text style={s.statusTxt}>Raza: {geofence.radiusKm < 1 ? (geofence.radiusKm * 1000) + ' m' : geofence.radiusKm + ' km'}</Text>
          </View>
        )}

        {/* Alerte recente */}
        <View style={[s.card, { marginBottom: 32 }]}>
          <Text style={s.cardTitle}>🚨 Alerte Ieșire din Zonă ({alerts.length})</Text>
          {alerts.length === 0 ? (
            <Text style={s.noAlerts}>✅ Nicio ieșire din zonă în ultimele 7 zile</Text>
          ) : (
            alerts.map((alert) => (
              <View key={alert._id} style={s.alertItem}>
                <Text style={s.alertTime}>
                  🕒 {new Date(alert.timestamp).toLocaleString('ro-RO')}
                </Text>
                <Text style={s.alertDetail}>
                  📍 {alert.gps?.latitude?.toFixed(5)}, {alert.gps?.longitude?.toFixed(5)}
                </Text>
                <Text style={s.alertDetail}>
                  🚗 {alert.gps?.speed} km/h · {alert.geofence?.distanceKm} km față de centru
                </Text>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  header:       { padding: 20, paddingTop: 52 },
  title:        { color: T.white, fontSize: 22, fontWeight: 'bold' },
  sub:          { color: T.muted, fontSize: 13, marginTop: 4 },
  map:          { height: 300, width: '100%' },
  mapHintWrap:  { backgroundColor: T.bgCard, paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: T.border },
  mapHint:      { textAlign: 'center', color: T.muted, fontSize: 13 },

  pickerWrap:   { flexDirection: 'row', alignItems: 'center', backgroundColor: T.bgCard, paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: T.border },
  pickerLabel:  { fontSize: 13, color: T.muted, fontWeight: '600' },
  chip:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: T.border, marginRight: 6 },
  chipActive:   { borderColor: T.primary, backgroundColor: T.primary + '22' },
  chipTxt:      { fontSize: 13, color: T.muted },
  chipTxtActive:{ color: T.accent, fontWeight: 'bold' },

  card:         { backgroundColor: T.bgCard, margin: 12, marginBottom: 0, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: T.border, ...SHADOW },
  cardTitle:    { fontSize: 15, fontWeight: 'bold', color: T.white, marginBottom: 12 },

  radiusRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  radiusBtn:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: T.border },
  radiusBtnActive: { borderColor: T.primary, backgroundColor: T.primary + '22' },
  radiusBtnTxt:    { fontSize: 13, color: T.muted },
  radiusBtnTxtActive: { color: T.accent, fontWeight: 'bold' },

  actionRow:    { flexDirection: 'row', margin: 12, gap: 10 },
  saveBtn:      { flex: 1, borderRadius: 14, overflow: 'hidden' },
  saveBtnGrad:  { padding: 15, alignItems: 'center' },
  saveBtnTxt:   { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  deleteBtn:    { backgroundColor: T.redDim, borderWidth: 1.5, borderColor: T.red + '55', padding: 15, borderRadius: 14, alignItems: 'center' },
  deleteBtnTxt: { color: T.red, fontWeight: 'bold', fontSize: 15 },

  statusTxt:    { fontSize: 14, color: T.muted2, marginBottom: 4 },
  noAlerts:     { color: T.green, fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  alertItem:    { borderLeftWidth: 3, borderLeftColor: T.red, paddingLeft: 10, marginBottom: 12 },
  alertTime:    { fontSize: 13, fontWeight: 'bold', color: T.red, marginBottom: 3 },
  alertDetail:  { fontSize: 12, color: T.muted, marginBottom: 2 },
});
