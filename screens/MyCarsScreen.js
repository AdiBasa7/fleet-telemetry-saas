import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, ActivityIndicator,
  Alert, Linking, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, POLLING_INTERVAL_MS } from '../config';
import { useAuth } from '../context/AuthContext';
import { T, SHADOW } from '../theme';

// ── Modal editare vehicul ─────────────────────────────
function EditVehicleModal({ visible, device, token, onClose, onSaved }) {
  const v = device?.vehicle || {};
  const [licensePlate, setLicensePlate] = useState(v.licensePlate !== 'Necunoscut' ? v.licensePlate : '');
  const [make,         setMake]         = useState(v.make         !== 'Necunoscut' ? v.make         : '');
  const [model,        setModel]        = useState(v.model        !== 'Necunoscut' ? v.model        : '');
  const [year,         setYear]         = useState(v.year && v.year !== 2005 ? String(v.year) : '');
  const [saving,       setSaving]       = useState(false);

  useEffect(() => {
    if (visible && device) {
      const veh = device.vehicle || {};
      setLicensePlate(veh.licensePlate !== 'Necunoscut' ? veh.licensePlate : '');
      setMake(veh.make   !== 'Necunoscut' ? veh.make   : '');
      setModel(veh.model !== 'Necunoscut' ? veh.model  : '');
      setYear(veh.year && veh.year !== 2005 ? String(veh.year) : '');
    }
  }, [visible, device]);

  const save = async () => {
    if (!licensePlate.trim()) {
      Alert.alert('Atenție', 'Numărul de înmatriculare este obligatoriu.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/devices/${device.imei}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          licensePlate: licensePlate.trim(),
          make:  make.trim()  || 'Necunoscut',
          model: model.trim() || 'Necunoscut',
          year:  year ? parseInt(year) : 2005,
        }),
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert('✅ Salvat', 'Datele vehiculului au fost actualizate.');
        onSaved();
        onClose();
      } else {
        Alert.alert('Eroare', json.error);
      }
    } catch {
      Alert.alert('Eroare rețea', 'Nu s-a putut salva.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={editS.overlay}
      >
        <LinearGradient colors={['#1A0B3E', T.bg]} style={editS.sheet}>
          <View style={editS.handle} />
          <Text style={editS.title}>✏️  Editare vehicul</Text>
          {device && <Text style={editS.imeiTxt}>IMEI: {device.imei}</Text>}

          <Text style={editS.label}>Număr înmatriculare *</Text>
          <TextInput
            style={editS.input}
            value={licensePlate}
            onChangeText={t => setLicensePlate(t.toUpperCase())}
            placeholder="ex: TM 01 ABC"
            placeholderTextColor={T.muted}
            autoCapitalize="characters"
          />

          <Text style={editS.label}>Marcă</Text>
          <TextInput
            style={editS.input}
            value={make}
            onChangeText={setMake}
            placeholder="ex: Dacia"
            placeholderTextColor={T.muted}
          />

          <Text style={editS.label}>Model</Text>
          <TextInput
            style={editS.input}
            value={model}
            onChangeText={setModel}
            placeholder="ex: Logan"
            placeholderTextColor={T.muted}
          />

          <Text style={editS.label}>An fabricație</Text>
          <TextInput
            style={editS.input}
            value={year}
            onChangeText={setYear}
            placeholder="ex: 2020"
            placeholderTextColor={T.muted}
            keyboardType="numeric"
            maxLength={4}
          />

          <View style={editS.btnRow}>
            <TouchableOpacity style={editS.cancelBtn} onPress={onClose}>
              <Text style={editS.cancelTxt}>Anulează</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[editS.saveBtn, saving && { opacity: 0.6 }]}
              onPress={save}
              disabled={saving}
            >
              <LinearGradient colors={T.grad} style={editS.saveBtnGrad}>
                <Text style={editS.saveTxt}>{saving ? 'Se salvează...' : 'Salvează'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Rând detaliu ──────────────────────────────────────
function DetailRow({ label, value, valueColor, small }) {
  return (
    <View style={detailS.row}>
      <Text style={detailS.label}>{label}</Text>
      <Text style={[detailS.value, valueColor && { color: valueColor }, small && detailS.small]}>
        {value ?? '—'}
      </Text>
    </View>
  );
}

// ── Card mașină ───────────────────────────────────────
function VehicleCard({ device, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const animH = useRef(new Animated.Value(0)).current;

  const pos      = device.lastPosition || {};
  const vehicle  = device.vehicle     || {};

  const statusColor = pos.ignition === 1 ? T.green : '#666';
  const statusLabel = pos.ignition === 1 ? '🔑 Pornit' : '🔴 Oprit';

  const toggle = () => {
    setExpanded(e => {
      Animated.spring(animH, {
        toValue: e ? 0 : 1,
        useNativeDriver: false,
        tension: 80, friction: 12,
      }).start();
      return !e;
    });
  };

  return (
    <View style={cardS.outer}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.8}>
        <LinearGradient colors={[T.bgCard2, T.bgCard]} style={cardS.header}>
          <View style={[cardS.accentBar, { backgroundColor: statusColor }]} />
          <Text style={cardS.bgCar}>🚗</Text>
          <View style={cardS.headerInfo}>
            <Text style={cardS.plate}>{vehicle.licensePlate || device.imei}</Text>
            <Text style={cardS.makeModel}>
              {vehicle.make} {vehicle.model}{vehicle.year ? ` · ${vehicle.year}` : ''}
            </Text>
            <View style={cardS.statusRow}>
              <View style={[cardS.dot, { backgroundColor: statusColor }]} />
              <Text style={[cardS.statusTxt, { color: statusColor }]}>{statusLabel}</Text>
              {pos.speed > 0 && <Text style={cardS.speed}> · {pos.speed} km/h</Text>}
            </View>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up-circle' : 'chevron-down-circle'}
            size={26} color={T.accent} style={{ opacity: 0.7 }}
          />
        </LinearGradient>
      </TouchableOpacity>

      {expanded && (
        <View style={cardS.body}>

          <View style={cardS.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={cardS.sectionTitle}>📋  Detalii mașină</Text>
              <TouchableOpacity onPress={onEdit} style={cardS.editBtn}>
                <Ionicons name="create-outline" size={14} color={T.accent} />
                <Text style={cardS.editBtnTxt}>Editează</Text>
              </TouchableOpacity>
            </View>
            <DetailRow label="Înmatriculare" value={vehicle.licensePlate} valueColor={T.accent} />
            <DetailRow label="Marcă"         value={vehicle.make} />
            <DetailRow label="Model"         value={vehicle.model} />
            <DetailRow label="An fabricație" value={vehicle.year} />
            <DetailRow label="IMEI"          value={device.imei} small />
          </View>

          <View style={[cardS.section, { borderBottomWidth: 0 }]}>
            <Text style={cardS.sectionTitle}>📡  Status live</Text>
            <DetailRow label="Viteză"      value={`${pos.speed ?? 0} km/h`} valueColor={pos.speed > 0 ? T.accent : undefined} />
            <DetailRow label="Contact"     value={pos.ignition === 1 ? 'Pornit' : 'Oprit'} valueColor={pos.ignition === 1 ? T.green : T.red} />
            <DetailRow label="Conectat"    value={device.isConnected ? 'Da' : 'Nu'} valueColor={device.isConnected ? T.green : T.red} />
          </View>

        </View>
      )}
    </View>
  );
}

// ── Ecran principal ───────────────────────────────────
export default function MyCarsScreen() {
  const { token }                   = useAuth();
  const [devices, setDevices]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [editingDevice, setEditingDevice] = useState(null);

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

  if (loading) {
    return (
      <View style={scrS.centered}>
        <ActivityIndicator size="large" color={T.accent} />
        <Text style={scrS.loadingTxt}>Se încarcă mașinile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={scrS.centered}>
        <Text style={{ fontSize: 48 }}>📡</Text>
        <Text style={scrS.errorTxt}>{error}</Text>
        <TouchableOpacity style={scrS.retryBtn} onPress={fetchDevices}>
          <Text style={scrS.retryTxt}>Încearcă din nou</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeCount = devices.filter(d => d.lastPosition?.ignition === 1).length;

  return (
    <View style={{ flex: 1 }}>
      <View style={scrS.hero}>
        <Text style={[scrS.decoCar, { right: -10, top: -10, fontSize: 110, opacity: 0.06 }]}>🚗</Text>
        <Text style={[scrS.decoCar, { right: 80, top: 20, fontSize: 50, opacity: 0.04, transform: [{ rotate: '-15deg' }] }]}>🏎️</Text>
        <Text style={[scrS.decoCar, { left: -20, bottom: -20, fontSize: 90, opacity: 0.05, transform: [{ scaleX: -1 }] }]}>🚙</Text>
        <View style={scrS.heroContent}>
          <Text style={scrS.heroTitle}>🚘  Flota mea</Text>
          <Text style={scrS.heroSubtitle}>{devices.length} vehicule</Text>
          <View style={scrS.heroBadgesRow}>
            <HeroBadge value={activeCount}                  label="Active"  color={T.green} />
            <HeroBadge value={devices.length - activeCount} label="Oprite"  color="#666" />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={scrS.list}>
        {devices.map(device => (
          <VehicleCard
            key={device.imei}
            device={device}
            onEdit={() => setEditingDevice(device)}
          />
        ))}
        {devices.length === 0 && (
          <View style={scrS.empty}>
            <Text style={{ fontSize: 64 }}>🚗</Text>
            <Text style={scrS.emptyTxt}>Nicio mașină în flotă.</Text>
          </View>
        )}
      </ScrollView>

      <EditVehicleModal
        visible={editingDevice !== null}
        device={editingDevice}
        token={token}
        onClose={() => setEditingDevice(null)}
        onSaved={fetchDevices}
      />
    </View>
  );
}

function HeroBadge({ value, label, color }) {
  return (
    <View style={scrS.heroBadge}>
      <Text style={[scrS.heroBadgeVal, { color }]}>{value}</Text>
      <Text style={scrS.heroBadgeLbl}>{label}</Text>
    </View>
  );
}

const scrS = StyleSheet.create({
  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingTxt:   { marginTop: 14, color: T.accent, fontSize: 15 },
  errorTxt:     { color: T.red, fontSize: 14, textAlign: 'center', marginVertical: 16 },
  retryBtn:     { backgroundColor: T.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  retryTxt:     { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  hero:         { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28, overflow: 'hidden', position: 'relative', backgroundColor: 'rgba(15, 5, 40, 0.65)' },
  decoCar:      { position: 'absolute' },
  heroContent:  { position: 'relative', zIndex: 1 },
  heroTitle:    { color: T.white, fontSize: 26, fontWeight: 'bold' },
  heroSubtitle: { color: T.muted, fontSize: 14, marginTop: 2, marginBottom: 16 },
  heroBadgesRow:{ flexDirection: 'row', gap: 12 },
  heroBadge:    { alignItems: 'center', backgroundColor: T.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  heroBadgeVal: { fontSize: 22, fontWeight: 'bold' },
  heroBadgeLbl: { color: T.muted, fontSize: 11, marginTop: 1 },
  list:         { padding: 16, paddingBottom: 40 },
  empty:        { alignItems: 'center', marginTop: 60 },
  emptyTxt:     { color: T.muted, fontSize: 15, marginTop: 12 },
});

const cardS = StyleSheet.create({
  outer:       { borderRadius: 18, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(25, 12, 55, 0.55)', ...SHADOW },
  header:      { flexDirection: 'row', alignItems: 'center', padding: 16, overflow: 'hidden', position: 'relative' },
  accentBar:   { width: 3, height: '100%', position: 'absolute', left: 0, top: 0, bottom: 0 },
  bgCar:       { position: 'absolute', right: 40, top: -10, fontSize: 80, opacity: 0.04, transform: [{ scaleX: -1 }] },
  headerInfo:  { flex: 1, paddingLeft: 10 },
  plate:       { fontSize: 20, fontWeight: 'bold', color: T.white, letterSpacing: 1.5 },
  makeModel:   { fontSize: 12, color: T.muted, marginTop: 2, marginBottom: 6 },
  statusRow:   { flexDirection: 'row', alignItems: 'center' },
  dot:         { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  statusTxt:   { fontSize: 12, fontWeight: '700' },
  speed:       { fontSize: 12, color: T.muted2 },
  body:        { backgroundColor: 'transparent' },
  section:     { padding: 16, borderBottomWidth: 1, borderBottomColor: T.border },
  sectionTitle:{ fontSize: 13, fontWeight: '700', color: T.accent, letterSpacing: 0.5 },
  editBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.primary + '22', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  editBtnTxt:  { fontSize: 12, color: T.accent, fontWeight: '600' },
});

const detailS = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: T.border },
  label: { fontSize: 13, color: T.muted },
  value: { fontSize: 13, fontWeight: '600', color: T.white },
  small: { fontSize: 11, color: T.muted2 },
});

const editS = StyleSheet.create({
  overlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet:      { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 20 },
  title:      { fontSize: 18, fontWeight: 'bold', color: T.white, marginBottom: 4 },
  imeiTxt:    { fontSize: 11, color: T.muted2, marginBottom: 20 },
  label:      { fontSize: 12, color: T.muted, marginBottom: 6, marginTop: 12 },
  input:      { backgroundColor: T.bgCard, borderRadius: 10, padding: 12, color: T.white, fontSize: 15, borderWidth: 1, borderColor: T.border },
  btnRow:     { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn:  { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: T.border },
  cancelTxt:  { color: T.muted, fontWeight: '600' },
  saveBtn:    { flex: 2, borderRadius: 12, overflow: 'hidden' },
  saveBtnGrad:{ padding: 14, alignItems: 'center' },
  saveTxt:    { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
