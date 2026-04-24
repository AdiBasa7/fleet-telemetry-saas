/**
 * ─────────────────────────────────────────────────────
 *  DriversScreen — Management șoferi
 * ─────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { T, SHADOW } from '../theme';

function Avatar({ initials, size = 46, color = T.primary }) {
  return (
    <View style={[avS.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color + '33', borderColor: color + '88' }]}>
      <Text style={[avS.txt, { fontSize: size * 0.35, color }]}>{initials || '?'}</Text>
    </View>
  );
}

function DriverModal({ visible, driver, devices, token, onClose, onSaved }) {
  const editing = !!driver;
  const [name,    setName]    = useState(driver?.name          || '');
  const [phone,   setPhone]   = useState(driver?.phone         || '');
  const [license, setLicense] = useState(driver?.licenseNumber || '');
  const [selImei, setSelImei] = useState(driver?.assignedImei  || null);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (visible) {
      setName(driver?.name || ''); setPhone(driver?.phone || '');
      setLicense(driver?.licenseNumber || ''); setSelImei(driver?.assignedImei || null);
    }
  }, [visible, driver]);

  const save = async () => {
    if (!name.trim()) { Alert.alert('Atenție', 'Numele este obligatoriu.'); return; }
    setSaving(true);
    try {
      const url    = editing ? `${API_BASE_URL}/drivers/${driver._id}` : `${API_BASE_URL}/drivers`;
      const method = editing ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), phone, licenseNumber: license, assignedImei: selImei }),
      });
      const json = await res.json();
      if (json.success) { onSaved(); onClose(); }
      else Alert.alert('Eroare', json.error);
    } catch { Alert.alert('Eroare rețea', 'Nu s-a putut salva.'); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={mS.overlay}>
        <View style={mS.sheet}>
          <View style={mS.handle} />
          <Text style={mS.title}>{editing ? '✏️ Editare șofer' : '➕ Șofer nou'}</Text>

          {[{ label:'Nume complet *', val: name, fn: setName, ph:'Ion Popescu' },
            { label:'Telefon',        val: phone, fn: setPhone, ph:'07xx xxx xxx', kb:'phone-pad' },
            { label:'Nr. permis',     val: license, fn: setLicense, ph:'B123456' },
          ].map(({ label, val, fn, ph, kb }) => (
            <View key={label}>
              <Text style={mS.label}>{label}</Text>
              <TextInput style={mS.input} value={val} onChangeText={fn} placeholder={ph} placeholderTextColor="#444" keyboardType={kb || 'default'} />
            </View>
          ))}

          <Text style={mS.label}>Mașină asignată</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[mS.carChip, !selImei && mS.carChipA]} onPress={() => setSelImei(null)}>
                <Text style={[mS.carTxt, !selImei && mS.carTxtA]}>Nicio mașină</Text>
              </TouchableOpacity>
              {devices.map(d => (
                <TouchableOpacity key={d.imei} style={[mS.carChip, selImei === d.imei && mS.carChipA]} onPress={() => setSelImei(d.imei)}>
                  <Text style={[mS.carTxt, selImei === d.imei && mS.carTxtA]}>{d.vehicle?.licensePlate || d.imei.slice(-6)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={mS.btnRow}>
            <TouchableOpacity style={mS.cancelBtn} onPress={onClose}>
              <Text style={mS.cancelTxt}>Anulează</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[mS.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
              <Text style={mS.saveTxt}>{saving ? 'Se salvează...' : 'Salvează'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function DriversScreen() {
  const { token } = useAuth();
  const [drivers,  setDrivers]  = useState([]);
  const [devices,  setDevices]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showModal,setShowModal]= useState(false);
  const [editing,  setEditing]  = useState(null);

  const load = async () => {
    try {
      const [dr, dv] = await Promise.all([
        fetch(`${API_BASE_URL}/drivers`,  { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`${API_BASE_URL}/devices`,  { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]);
      if (dr.success) setDrivers(dr.data);
      if (dv.success) setDevices(dv.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const remove = (d) => Alert.alert('Dezactivare', `Dezactivezi șoferul ${d.name}?`, [
    { text: 'Anulează', style: 'cancel' },
    { text: 'Dezactivează', style: 'destructive', onPress: async () => {
      await fetch(`${API_BASE_URL}/drivers/${d._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      load();
    }},
  ]);

  const colors = [T.primary, '#9333EA', '#7C3AED', '#6D28D9', '#8B5CF6'];

  return (
    <LinearGradient colors={[T.bg, '#0F0328']} style={{ flex: 1 }}>
      <LinearGradient colors={['#1A0B3E', '#0E0428']} style={s.header}>
        <Text style={s.title}>👤 Șoferi</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => { setEditing(null); setShowModal(true); }}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.addTxt}>Adaugă</Text>
        </TouchableOpacity>
      </LinearGradient>

      {loading
        ? <ActivityIndicator color={T.accent} style={{ marginTop: 40 }} />
        : (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {drivers.length === 0 && (
              <View style={s.empty}>
                <Text style={{ fontSize: 48 }}>👥</Text>
                <Text style={s.emptyTxt}>Niciun șofer adăugat</Text>
                <Text style={s.emptySub}>Apasă "Adaugă" pentru a adăuga primul șofer</Text>
              </View>
            )}
            {drivers.map((d, i) => {
              const car = devices.find(dev => dev.imei === d.assignedImei);
              return (
                <LinearGradient key={d._id} colors={[T.bgCard2, T.bgCard]} style={dS.card}>
                  <Avatar initials={d.avatarInitials} color={colors[i % colors.length]} />
                  <View style={dS.info}>
                    <Text style={dS.name}>{d.name}</Text>
                    {d.phone    ? <Text style={dS.sub}>📞 {d.phone}</Text>    : null}
                    {d.licenseNumber ? <Text style={dS.sub}>🪪 {d.licenseNumber}</Text> : null}
                    <View style={[dS.carBadge, { backgroundColor: car ? T.primary + '33' : T.bgCard3 }]}>
                      <Text style={[dS.carTxt, { color: car ? T.accent : T.muted }]}>
                        {car ? `🚗 ${car.vehicle?.licensePlate || car.imei.slice(-6)}` : 'Neasignat'}
                      </Text>
                    </View>
                  </View>
                  <View style={dS.actions}>
                    <TouchableOpacity onPress={() => { setEditing(d); setShowModal(true); }} style={dS.iconBtn}>
                      <Ionicons name="create-outline" size={20} color={T.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => remove(d)} style={dS.iconBtn}>
                      <Ionicons name="trash-outline" size={20} color={T.red} />
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        )
      }

      <DriverModal
        visible={showModal}
        driver={editing}
        devices={devices}
        token={token}
        onClose={() => setShowModal(false)}
        onSaved={load}
      />
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 52 },
  title:     { color: T.white, fontSize: 22, fontWeight: 'bold' },
  addBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addTxt:    { color: '#fff', fontWeight: 'bold' },
  empty:     { alignItems: 'center', marginTop: 60 },
  emptyTxt:  { color: T.white, fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySub:  { color: T.muted, fontSize: 13, marginTop: 6, textAlign: 'center' },
});

const dS = StyleSheet.create({
  card:    { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: T.border, ...SHADOW },
  info:    { flex: 1 },
  name:    { color: T.white, fontSize: 15, fontWeight: 'bold', marginBottom: 3 },
  sub:     { color: T.muted, fontSize: 12, marginBottom: 2 },
  carBadge:{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginTop: 6 },
  carTxt:  { fontSize: 12, fontWeight: '600' },
  actions: { gap: 8 },
  iconBtn: { padding: 6 },
});

const avS = StyleSheet.create({
  circle: { justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  txt:    { fontWeight: 'bold' },
});

const mS = StyleSheet.create({
  overlay:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet:     { backgroundColor: T.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 20 },
  title:     { color: T.white, fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  label:     { color: T.muted, fontSize: 12, marginBottom: 6, marginTop: 12 },
  input:     { backgroundColor: T.bgCard2, borderRadius: 10, padding: 12, color: T.white, fontSize: 14, borderWidth: 1, borderColor: T.border },
  carChip:   { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.bgCard2 },
  carChipA:  { borderColor: T.primary, backgroundColor: T.primary + '33' },
  carTxt:    { color: T.muted, fontSize: 13 },
  carTxtA:   { color: T.accent, fontWeight: '700' },
  btnRow:    { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: T.border },
  cancelTxt: { color: T.muted, fontWeight: '600' },
  saveBtn:   { flex: 2, backgroundColor: T.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
  saveTxt:   { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
