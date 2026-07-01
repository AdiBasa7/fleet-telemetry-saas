/**
 * WaterPerimeterScreen — ecran exclusiv FleetAqua.
 *
 * Înlocuiește GeofenceScreen pentru varianta aqua.
 * Diferențe față de GeofenceScreen (road):
 *  - Zone circulare pe hartă (nu poligoane), default 500m
 *  - Hartă în mod satelit (vezi apa reală)
 *  - Copy orientat pe bărci ("vessel exits zone")
 *  - Fără opțiuni de entry-alert (interesează doar ieșirea)
 *  - Culori cyan în loc de violet
 */

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { T } from '../theme';
import V from '../variants';

// Marine: zone mai mici (bărci pe golf, nu pe uscat)
const RADIUS_OPTIONS = [
  { label: '200 m', value: 0.2 },
  { label: '500 m', value: 0.5 },
  { label: '1 km',  value: 1 },
  { label: '2 km',  value: 2 },
  { label: '5 km',  value: 5 },
];

// Theme pentru aqua
const AQ = {
  primary:    V.theme.primary,
  accent:     V.theme.accent,
  grad:       V.theme.grad,
  bg:         V.theme.bg,
  bgCard:     V.theme.bgCard,
  border:     V.theme.border,
};

export default function WaterPerimeterScreen() {
  const { token } = useAuth();
  const [devices, setDevices]             = useState([]);
  const [selectedImei, setSelectedImei]   = useState(null);
  const [geofence, setGeofence]           = useState(null);
  const [pendingCenter, setPendingCenter] = useState(null);
  const [selectedRadius, setSelectedRadius] = useState(0.5); // 500m default pe apă
  const [alerts, setAlerts]               = useState([]);
  const [saving, setSaving]               = useState(false);
  const mapRef = useRef(null);

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

  useEffect(() => {
    if (!selectedImei) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_BASE_URL}/devices/${selectedImei}/geofence`, { headers }).then(r => r.json()),
      fetch(`${API_BASE_URL}/devices/${selectedImei}/geofence/alerts?limit=10&hours=168`, { headers }).then(r => r.json()),
    ]).then(([geoJson, alertJson]) => {
      if (geoJson.success && geoJson.data?.enabled) {
        setGeofence(geoJson.data);
        setSelectedRadius(geoJson.data.radiusKm ?? 0.5);
      }
      if (alertJson.success) setAlerts(alertJson.data ?? []);
    }).catch(() => {});
  }, [selectedImei]);

  const handleMapPress = (e) => {
    setPendingCenter(e.nativeEvent.coordinate);
  };

  const savePerimeter = async () => {
    if (!pendingCenter) {
      Alert.alert('Tap on the map', 'Tap the center of the permitted navigation zone first.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/devices/${selectedImei}/geofence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          enabled: true,
          type: 'circle',
          center: pendingCenter,
          radiusKm: selectedRadius,
          alertOnExit: true,
          alertOnEntry: false,  // marine: only exit matters
        }),
      });
      const json = await res.json();
      if (json.success) {
        setGeofence(json.data);
        setPendingCenter(null);
        Alert.alert('✓ Perimeter saved', `Alert zone set: ${selectedRadius * 1000}m radius on water.`);
      }
    } catch {
      Alert.alert('Error', 'Could not save perimeter. Check connection.');
    } finally {
      setSaving(false);
    }
  };

  const deletePerimeter = async () => {
    Alert.alert('Delete Perimeter', 'Remove the navigation zone for this vessel?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await fetch(`${API_BASE_URL}/devices/${selectedImei}/geofence`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          setGeofence(null);
        },
      },
    ]);
  };

  const activeCenter = pendingCenter ?? geofence?.center ?? null;

  return (
    <View style={[styles.root, { backgroundColor: AQ.bg }]}>
      {/* Header */}
      <LinearGradient colors={AQ.grad} style={styles.header}>
        <Ionicons name="water" size={22} color="#fff" />
        <Text style={styles.headerTitle}>Water Perimeter</Text>
      </LinearGradient>

      {/* Vessel selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vesselRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {devices.map(d => (
          <TouchableOpacity
            key={d.imei}
            onPress={() => setSelectedImei(d.imei)}
            style={[
              styles.vesselChip,
              { borderColor: selectedImei === d.imei ? AQ.primary : AQ.border },
            ]}
          >
            <Ionicons name={selectedImei === d.imei ? 'boat' : 'boat-outline'} size={14} color={selectedImei === d.imei ? AQ.accent : '#888'} />
            <Text style={[styles.vesselChipText, { color: selectedImei === d.imei ? AQ.accent : '#888' }]}>
              {d.vehicle?.licensePlate ?? d.imei}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Map — satellite mode for water */}
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          mapType="satellite"
          onPress={handleMapPress}
          initialRegion={{
            latitude:  activeCenter?.latitude  ?? 44.4268,
            longitude: activeCenter?.longitude ?? 26.1025,
            latitudeDelta:  0.05,
            longitudeDelta: 0.05,
          }}
        >
          {activeCenter && (
            <>
              <Circle
                center={activeCenter}
                radius={selectedRadius * 1000}
                strokeColor={AQ.accent}
                fillColor={`${AQ.primary}30`}
                strokeWidth={2}
              />
              <Marker coordinate={activeCenter} pinColor={AQ.primary} title="Zone center" />
            </>
          )}
        </MapView>
        <View style={styles.mapHint}>
          <Text style={styles.mapHintText}>Tap map to set zone center</Text>
        </View>
      </View>

      {/* Radius selector */}
      <View style={[styles.section, { backgroundColor: AQ.bgCard }]}>
        <Text style={styles.sectionLabel}>Zone radius</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {RADIUS_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setSelectedRadius(opt.value)}
              style={[
                styles.radiusChip,
                { borderColor: selectedRadius === opt.value ? AQ.primary : AQ.border,
                  backgroundColor: selectedRadius === opt.value ? `${AQ.primary}20` : 'transparent' },
              ]}
            >
              <Text style={{ color: selectedRadius === opt.value ? AQ.accent : '#888', fontSize: 12 }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={savePerimeter}
          disabled={saving}
          style={[styles.btnSave, { backgroundColor: AQ.primary }]}
        >
          <Text style={styles.btnText}>{saving ? 'Saving…' : 'Save Perimeter'}</Text>
        </TouchableOpacity>
        {geofence && (
          <TouchableOpacity onPress={deletePerimeter} style={styles.btnDelete}>
            <Ionicons name="trash-outline" size={16} color="#F87171" />
            <Text style={styles.btnDeleteText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Recent exit alerts */}
      {alerts.length > 0 && (
        <View style={[styles.alertsSection, { backgroundColor: AQ.bgCard }]}>
          <Text style={[styles.sectionLabel, { marginBottom: 8 }]}>Recent Zone Exits</Text>
          {alerts.slice(0, 5).map((a, i) => (
            <View key={i} style={styles.alertRow}>
              <Ionicons name="warning-outline" size={14} color="#FB923C" />
              <Text style={styles.alertText}>
                {a.type === 'EXIT' ? 'Vessel exited zone' : 'Vessel entered zone'} — {new Date(a.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingTop: 56 },
  headerTitle:  { color: '#fff', fontSize: 18, fontWeight: '700' },
  vesselRow:    { maxHeight: 56, paddingVertical: 8 },
  vesselChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  vesselChipText: { fontSize: 12, fontWeight: '500' },
  mapWrap:      { height: 260, position: 'relative' },
  map:          { flex: 1 },
  mapHint:      { position: 'absolute', bottom: 8, left: 0, right: 0, alignItems: 'center' },
  mapHintText:  { color: 'rgba(255,255,255,0.7)', fontSize: 11, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  section:      { padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  sectionLabel: { color: '#aaa', fontSize: 11, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  radiusChip:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  actions:      { flexDirection: 'row', gap: 12, padding: 16 },
  btnSave:      { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  btnText:      { color: '#fff', fontWeight: '600' },
  btnDelete:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)' },
  btnDeleteText:{ color: '#F87171', fontWeight: '500', fontSize: 13 },
  alertsSection:{ margin: 16, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  alertRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  alertText:    { color: '#aaa', fontSize: 12, flex: 1 },
});
