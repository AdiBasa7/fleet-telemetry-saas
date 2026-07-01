import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, POLLING_INTERVAL_MS } from '../config';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, SHADOW } from '../theme';

function EditVehicleModal({ visible, device, token, onClose, onSaved }) {
  const v = device?.vehicle || {};
  const [licensePlate, setLicensePlate] = useState('');
  const [make,         setMake]         = useState('');
  const [model,        setModel]        = useState('');
  const [year,         setYear]         = useState('');
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={editS.overlay}>
        <LinearGradient colors={['#1A0B3E', T.bg]} style={editS.sheet}>
          <View style={editS.handle} />
          <Text style={editS.title}>✏️  Editare vehicul</Text>
          {device && <Text style={editS.imeiTxt}>IMEI: {device.imei}</Text>}

          <Text style={editS.label}>Număr înmatriculare *</Text>
          <TextInput
            style={editS.input}
            value={licensePlate}
            onChangeText={t => setLicensePlate(t.toUpperCase())}
            placeholder="ex: AR 16 FMS"
            placeholderTextColor={T.muted}
            autoCapitalize="characters"
          />

          <Text style={editS.label}>Marcă</Text>
          <TextInput
            style={editS.input}
            value={make}
            onChangeText={setMake}
            placeholder="ex: Volkswagen"
            placeholderTextColor={T.muted}
          />

          <Text style={editS.label}>Model</Text>
          <TextInput
            style={editS.input}
            value={model}
            onChangeText={setModel}
            placeholder="ex: Passat"
            placeholderTextColor={T.muted}
          />

          <Text style={editS.label}>An fabricație</Text>
          <TextInput
            style={editS.input}
            value={year}
            onChangeText={setYear}
            placeholder="ex: 2015"
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

function Row({ label, value, highlight, valueColor }) {
  return (
    <View style={r.wrap}>
      <Text style={r.label}>{label}</Text>
      <Text style={[r.value, highlight && r.highlight, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const r = StyleSheet.create({
  wrap:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border },
  label:     { fontSize: 13, color: T.muted },
  value:     { fontSize: 13, fontWeight: '600', color: T.white },
  highlight: { fontSize: 16, fontWeight: 'bold', color: T.accent },
});

// Calculează combustibilul în litri dacă tankCapacityL e setat pe device
function fuelLiters(pct, tankL) {
  if (pct == null || !tankL) return null;
  return ((pct / 100) * tankL).toFixed(1);
}

// Redă starea ușii ca text + emoji
function doorLabel(val) {
  if (val == null) return '—';
  return val === 1 ? '🔓 Deschisă' : '🔒 Închisă';
}

// Convertește °C raw → valoare afișabilă (unele LV-CAN200 trimit cu offset -40)
function tempDisplay(raw) {
  if (raw == null) return '—';
  return `${raw} °C`;
}

export default function VehicleDetailScreen({ route, navigation }) {
  const { top }          = useSafeAreaInsets();
  const { device: init } = route.params;
  const { token }        = useAuth();
  const [device,    setDevice]    = useState(init);
  const [latest,    setLatest]    = useState(null);
  const [score,     setScore]     = useState(null);
  const [editModal, setEditModal] = useState(false);
  // Date CAN live — actualizate atât din polling cât și din Socket.IO
  const [canData,   setCanData]   = useState(init.lastCanData || {});

  const fetchDetails = async () => {
    try {
      const res  = await fetch(`${API_BASE_URL}/devices/${init.imei}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        setDevice(json.data);
        setLatest(json.data.latestRecord);
        if (json.data.lastCanData) setCanData(json.data.lastCanData);
      }
    } catch {}
  };

  const fetchScore = async () => {
    try {
      const res  = await fetch(`${API_BASE_URL}/devices/${init.imei}/driving-score?days=7`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setScore(json.data);
    } catch {}
  };

  useEffect(() => {
    fetchDetails(); fetchScore();
    const iv = setInterval(fetchDetails, POLLING_INTERVAL_MS);

    // Abonare Socket.IO pentru date CAN în timp real
    const prevHandler = global.onDeviceUpdate;
    global.onDeviceUpdate = (data) => {
      if (prevHandler) prevHandler(data);
      if (data.imei === init.imei && data.can) {
        setCanData(prev => {
          const merged = { ...prev };
          Object.entries(data.can).forEach(([k, v]) => { if (v !== null) merged[k] = v; });
          return merged;
        });
      }
    };

    return () => {
      clearInterval(iv);
      global.onDeviceUpdate = prevHandler;
    };
  }, []);

  const pos = device.lastPosition || {};
  const io  = latest?.io  || {};
  const gps = latest?.gps || {};
  const lowBattery = io.external_voltage_mV != null && io.external_voltage_mV < 11500;
  const offline    = !device.isConnected && device.lastSeen && (Date.now() - new Date(device.lastSeen)) > 600000;

  const scoreColor = !score ? T.muted
    : score.score >= 90 ? T.green : score.score >= 75 ? '#86efac' : score.score >= 60 ? T.orange : T.red;

  return (
    <LinearGradient colors={[T.bg, '#0F0328']} style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Bannere avertisment */}
        {lowBattery && (
          <View style={s.banner}><Text style={[s.bannerTxt, { color: T.orange }]}>🔋 Baterie slabă: {(io.external_voltage_mV/1000).toFixed(2)}V</Text></View>
        )}
        {offline && (
          <View style={[s.banner, { borderColor: T.red + '44' }]}><Text style={[s.bannerTxt, { color: T.red }]}>📡 Dispozitiv offline de peste 10 minute</Text></View>
        )}

        {/* Header */}
        <LinearGradient colors={['#1A0B3E', '#0E0428']} style={[s.header, { paddingTop: top + 52 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={26} color={T.white} />
          </TouchableOpacity>
          <Text style={s.plate}>{device.vehicle?.licensePlate || 'Necunoscut'}</Text>
          <Text style={s.makeModel}>
            {device.vehicle?.make !== 'Necunoscut' ? device.vehicle.make : ''}
            {device.vehicle?.model !== 'Necunoscut' ? ` ${device.vehicle.model}` : ''}
            {device.vehicle?.year && device.vehicle.year !== 2005 ? ` · ${device.vehicle.year}` : ''}
          </Text>
          <Text style={s.imei}>IMEI: {device.imei}</Text>
          <View style={s.statusRow}>
            <View style={[s.dot, { backgroundColor: device.isConnected ? T.green : T.red }]} />
            <Text style={[s.statusTxt, { color: device.isConnected ? T.green : T.red }]}>
              {device.isConnected ? 'Online' : 'Offline'} · {device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString('ro-RO') : '—'}
            </Text>
          </View>
          <TouchableOpacity style={s.editBtn} onPress={() => setEditModal(true)}>
            <Ionicons name="create-outline" size={14} color={T.accent} />
            <Text style={s.editBtnTxt}>Editează vehicul</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Butoane acțiuni rapide */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionBtn} onPress={() => navigation.navigate('RouteHistory', { device })}>
            <Ionicons name="map" size={20} color={T.accent} />
            <Text style={s.actionTxt}>Traseu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => navigation.navigate('Cockpit', { device })}>
            <Ionicons name="speedometer" size={20} color={T.accent} />
            <Text style={s.actionTxt}>Cockpit</Text>
          </TouchableOpacity>
        </View>

        {/* GPS */}
        <View style={s.card}>
          <Text style={s.cardTitle}>📍 Poziție GPS Live</Text>
          <Row label="Latitudine"  value={`${(gps.latitude  ?? pos.latitude  ?? 0).toFixed(6)}°`} />
          <Row label="Longitudine" value={`${(gps.longitude ?? pos.longitude ?? 0).toFixed(6)}°`} />
          <Row label="Viteză"      value={`${gps.speed ?? pos.speed ?? 0} km/h`} highlight />
          <Row label="Direcție"    value={`${gps.angle ?? pos.angle ?? 0}°`} />
          {gps.satellites > 0 && <Row label="Sateliți GPS" value={gps.satellites} />}
        </View>

        {/* Status motor */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🔑 Status Motor</Text>
          <Row label="Contact"   value={io.ignition === 1 ? '✅ PORNIT' : '🔴 OPRIT'} valueColor={io.ignition === 1 ? T.green : T.red} />
          <Row label="Mișcare"   value={io.movement === 1 ? 'Da' : 'Nu'} />
          {io.external_voltage_mV != null && <Row label="Tensiune baterie" value={`${(io.external_voltage_mV/1000).toFixed(2)} V`} valueColor={lowBattery ? T.red : T.green} />}
        </View>

        {/* Telemetrie CAN (LV-CAN200) */}
        {(canData.fuel_level_pct != null || canData.odometer_m != null ||
          canData.coolant_temp_c != null || canData.oil_temp_c != null) && (
          <View style={s.card}>
            <Text style={s.cardTitle}>⛽ Telemetrie CAN — Alfa Romeo 159</Text>

            {canData.fuel_level_pct != null && (
              <Row
                label="Combustibil"
                value={
                  fuelLiters(canData.fuel_level_pct, device.tankCapacityL)
                    ? `${canData.fuel_level_pct}%  (${fuelLiters(canData.fuel_level_pct, device.tankCapacityL)} L)`
                    : `${canData.fuel_level_pct}%`
                }
                highlight
                valueColor={
                  canData.fuel_level_pct < 10 ? T.red
                  : canData.fuel_level_pct < 25 ? T.orange
                  : T.green
                }
              />
            )}

            {canData.odometer_m != null && (
              <Row
                label="Odometru total"
                value={`${(canData.odometer_m / 1000).toLocaleString('ro-RO', { maximumFractionDigits: 0 })} km`}
              />
            )}

            {canData.coolant_temp_c != null && (
              <Row
                label="Temp. răcire"
                value={tempDisplay(canData.coolant_temp_c)}
                valueColor={
                  canData.coolant_temp_c > 105 ? T.red
                  : canData.coolant_temp_c > 95  ? T.orange
                  : T.green
                }
              />
            )}

            {canData.oil_temp_c != null && (
              <Row
                label="Temp. ulei"
                value={tempDisplay(canData.oil_temp_c)}
                valueColor={canData.oil_temp_c > 130 ? T.red : T.green}
              />
            )}

            {/* Uși — afișate doar dacă există date */}
            {(canData.door_fl != null || canData.door_fr != null ||
              canData.door_rl != null || canData.door_rr != null ||
              canData.trunk_open != null) && (
              <>
                <Text style={[s.cardTitle, { marginTop: 10, fontSize: 12, color: T.muted }]}>Stare uși</Text>
                {canData.door_fl   != null && <Row label="Față stânga"  value={doorLabel(canData.door_fl)}  valueColor={canData.door_fl  ? T.orange : T.green} />}
                {canData.door_fr   != null && <Row label="Față dreapta" value={doorLabel(canData.door_fr)}  valueColor={canData.door_fr  ? T.orange : T.green} />}
                {canData.door_rl   != null && <Row label="Spate stânga" value={doorLabel(canData.door_rl)}  valueColor={canData.door_rl  ? T.orange : T.green} />}
                {canData.door_rr   != null && <Row label="Spate dreapta"value={doorLabel(canData.door_rr)}  valueColor={canData.door_rr  ? T.orange : T.green} />}
                {canData.trunk_open!= null && <Row label="Portbagaj"    value={doorLabel(canData.trunk_open)} valueColor={canData.trunk_open ? T.orange : T.green} />}
              </>
            )}

            {canData.updatedAt && (
              <Text style={{ fontSize: 10, color: T.muted2, marginTop: 8, textAlign: 'right' }}>
                Actualizat: {new Date(canData.updatedAt).toLocaleTimeString('ro-RO')}
              </Text>
            )}
          </View>
        )}

        {/* Scor conducere */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🏆 Scor Conducere (7 zile)</Text>
          {score ? (
            <>
              <View style={s.scoreRow}>
                <Text style={[s.scoreBig, { color: scoreColor }]}>{score.score}</Text>
                <View style={[s.gradeBox, { backgroundColor: scoreColor + '33' }]}>
                  <Text style={[s.gradeTxt, { color: scoreColor }]}>{score.grade}</Text>
                </View>
              </View>
              <Row label="Crash-uri"         value={String(score.events.crashes)}       valueColor={score.events.crashes > 0 ? T.red : T.green} />
              <Row label="Frânări bruște"    value={String(score.events.harshBraking)} />
              <Row label="Accelerări bruște" value={String(score.events.harshAccel)} />
              <Row label="Viraje bruște"     value={String(score.events.harshCornering)} />
            </>
          ) : <Text style={{ color: T.muted, fontSize: 13 }}>Se calculează scorul...</Text>}
        </View>

      </ScrollView>

      <EditVehicleModal
        visible={editModal}
        device={device}
        token={token}
        onClose={() => setEditModal(false)}
        onSaved={fetchDetails}
      />
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  banner:    { margin: 12, marginBottom: 0, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: T.orange + '44', backgroundColor: '#fb923c11' },
  bannerTxt: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  header:    { padding: 24, alignItems: 'center' },
  backBtn:   { position: 'absolute', top: 16, left: 16 },
  plate:     { color: T.white, fontSize: 28, fontWeight: 'bold', letterSpacing: 2 },
  makeModel: { color: T.muted, fontSize: 13, marginTop: 2 },
  imei:      { color: T.muted2, fontSize: 11, marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  dot:       { width: 8, height: 8, borderRadius: 4 },
  statusTxt: { fontSize: 12 },
  editBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14, backgroundColor: T.primary + '33', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: T.primary + '55' },
  editBtnTxt:{ color: T.accent, fontSize: 13, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 12, margin: 16, marginBottom: 0 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: T.border },
  actionTxt: { color: T.accent, fontWeight: '700', fontSize: 14 },
  card:      { backgroundColor: T.bgCard, margin: 16, marginBottom: 0, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: T.border, ...SHADOW },
  cardTitle: { color: T.white, fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  scoreRow:  { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  scoreBig:  { fontSize: 52, fontWeight: 'bold' },
  gradeBox:  { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 },
  gradeTxt:  { fontSize: 24, fontWeight: 'bold' },
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
