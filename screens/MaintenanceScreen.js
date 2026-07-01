/**
 * ─────────────────────────────────────────────────────
 *  MaintenanceScreen — Remindere mentenanță
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
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, SHADOW } from '../theme';

const TYPES = ['ITP', 'RCA', 'CASCO', 'Revizie', 'Schimb ulei', 'Anvelope', 'Altele'];

const TYPE_ICONS = {
  'ITP': '🔍', 'RCA': '📄', 'CASCO': '🛡️',
  'Revizie': '🔧', 'Schimb ulei': '🛢️', 'Anvelope': '🏎️', 'Altele': '⚙️',
};

const URGENCY_CONFIG = {
  expired: { color: T.red,    bg: T.redDim,       label: 'EXPIRAT', icon: '🔴' },
  critical:{ color: T.red,    bg: T.redDim,       label: '< 7 zile', icon: '🟠' },
  warning: { color: T.orange, bg: '#fb923c22',    label: '< 30 zile', icon: '🟡' },
  ok:      { color: T.green,  bg: T.greenDim,     label: 'OK', icon: '🟢' },
};

function ReminderCard({ item, onDone, onDelete }) {
  const urg = URGENCY_CONFIG[item.urgency] || URGENCY_CONFIG.ok;
  const daysLeft = item.daysLeft;

  return (
    <LinearGradient colors={[T.bgCard2, T.bgCard]} style={rS.card}>
      <View style={[rS.urgBar, { backgroundColor: urg.color }]} />
      <View style={rS.iconBox}>
        <Text style={rS.typeIcon}>{TYPE_ICONS[item.type] || '⚙️'}</Text>
      </View>
      <View style={rS.info}>
        <View style={rS.topRow}>
          <Text style={rS.type}>{item.type}</Text>
          <View style={[rS.badge, { backgroundColor: urg.bg }]}>
            <Text style={[rS.badgeTxt, { color: urg.color }]}>{urg.icon} {urg.label}</Text>
          </View>
        </View>
        {item.dueDate && (
          <Text style={rS.date}>
            📅 {new Date(item.dueDate).toLocaleDateString('ro-RO')}
            {daysLeft !== undefined && daysLeft >= 0 && <Text style={{ color: urg.color }}> ({daysLeft} zile rămase)</Text>}
            {daysLeft !== undefined && daysLeft < 0  && <Text style={{ color: T.red }}> (expirat de {Math.abs(daysLeft)} zile)</Text>}
          </Text>
        )}
        {item.dueKm && <Text style={rS.date}>🛣️  La {item.dueKm.toLocaleString()} km</Text>}
        {item.notes ? <Text style={rS.notes}>{item.notes}</Text> : null}
      </View>
      <View style={rS.actions}>
        <TouchableOpacity onPress={() => onDone(item._id)} style={rS.doneBtn}>
          <Ionicons name="checkmark-circle" size={24} color={T.green} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(item._id)} style={rS.doneBtn}>
          <Ionicons name="trash-outline" size={20} color={T.red} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

function AddModal({ visible, imei, token, onClose, onSaved }) {
  const [type,    setType]    = useState(TYPES[0]);
  const [date,    setDate]    = useState('');
  const [km,      setKm]      = useState('');
  const [notes,   setNotes]   = useState('');
  const [saving,  setSaving]  = useState(false);

  useEffect(() => { if (visible) { setType(TYPES[0]); setDate(''); setKm(''); setNotes(''); } }, [visible]);

  const save = async () => {
    if (!date && !km) { Alert.alert('Atenție', 'Adaugă cel puțin o dată sau un număr de km.'); return; }
    setSaving(true);
    try {
      let dueDate = null;
      if (date) {
        const [d, m, y] = date.split('.');
        dueDate = new Date(`${y}-${m}-${d}`);
        if (isNaN(dueDate)) { Alert.alert('Format dată incorect', 'Folosește formatul ZZ.LL.AAAA'); setSaving(false); return; }
      }
      const res  = await fetch(`${API_BASE_URL}/devices/${imei}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, dueDate, dueKm: km ? parseInt(km) : null, notes }),
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
          <Text style={mS.title}>🔧 Reminder nou</Text>

          <Text style={mS.label}>Tip</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {TYPES.map(t => (
                <TouchableOpacity key={t} style={[mS.typeChip, type === t && mS.typeChipA]} onPress={() => setType(t)}>
                  <Text style={[mS.typeTxt, type === t && mS.typeTxtA]}>{TYPE_ICONS[t]} {t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={mS.label}>Dată scadentă (ZZ.LL.AAAA)</Text>
          <TextInput style={mS.input} value={date} onChangeText={setDate} placeholder="ex: 15.06.2025" placeholderTextColor="#444" keyboardType="numeric" />

          <Text style={mS.label}>Km scadenți (opțional)</Text>
          <TextInput style={mS.input} value={km} onChangeText={setKm} placeholder="ex: 200000" placeholderTextColor="#444" keyboardType="numeric" />

          <Text style={mS.label}>Note (opțional)</Text>
          <TextInput style={[mS.input, { height: 72, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} placeholder="ex: Anvelope de vară" placeholderTextColor="#444" multiline />

          <View style={mS.btnRow}>
            <TouchableOpacity style={mS.cancelBtn} onPress={onClose}><Text style={mS.cancelTxt}>Anulează</Text></TouchableOpacity>
            <TouchableOpacity style={[mS.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
              <Text style={mS.saveTxt}>{saving ? 'Se salvează...' : 'Salvează'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function MaintenanceScreen() {
  const navigation = useNavigation();
  const { top }    = useSafeAreaInsets();
  const { token }  = useAuth();
  const [devices,   setDevices]   = useState([]);
  const [selImei,   setSelImei]   = useState(null);
  const [reminders, setReminders] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showAdd,   setShowAdd]   = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/devices`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(j => { if (j.success && j.data.length) { setDevices(j.data); setSelImei(j.data[0].imei); } })
      .catch(() => {});
  }, []);

  const load = () => {
    if (!selImei) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/devices/${selImei}/maintenance`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(j => { if (j.success) setReminders(j.data); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [selImei]);

  const markDone = async (id) => {
    await fetch(`${API_BASE_URL}/devices/${selImei}/maintenance/${id}/done`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  const deleteItem = (id) => Alert.alert('Ștergere', 'Ștergi acest reminder?', [
    { text: 'Anulează', style: 'cancel' },
    { text: 'Șterge', style: 'destructive', onPress: async () => {
      await fetch(`${API_BASE_URL}/devices/${selImei}/maintenance/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      load();
    }},
  ]);

  const urgent   = reminders.filter(r => r.urgency === 'expired' || r.urgency === 'critical');
  const warnings = reminders.filter(r => r.urgency === 'warning');
  const ok       = reminders.filter(r => r.urgency === 'ok');

  return (
    <LinearGradient colors={[T.bg, '#0F0328']} style={{ flex: 1 }}>
      <LinearGradient colors={['#1A0B3E', '#0E0428']} style={[s.header, { paddingTop: top + 52 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={T.white} />
        </TouchableOpacity>
        <View>
          <Text style={s.title}>🔧 Mentenanță</Text>
          {urgent.length > 0 && <Text style={s.urgentBadge}>⚠️  {urgent.length} acțiuni urgente</Text>}
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.addTxt}>Adaugă</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Selector mașină */}
      {devices.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips} contentContainerStyle={{ padding: 12, gap: 8 }}>
          {devices.map(d => (
            <TouchableOpacity key={d.imei} style={[s.chip, selImei === d.imei && s.chipA]} onPress={() => setSelImei(d.imei)}>
              <Text style={[s.chipTxt, selImei === d.imei && s.chipTxtA]}>{d.vehicle?.licensePlate || d.imei.slice(-6)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading
        ? <ActivityIndicator color={T.accent} style={{ marginTop: 40 }} />
        : (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            {reminders.length === 0 && (
              <View style={s.empty}>
                <Text style={{ fontSize: 48 }}>✅</Text>
                <Text style={s.emptyTxt}>Niciun reminder activ</Text>
                <Text style={s.emptySub}>Adaugă ITP, revizie sau alte scadențe</Text>
              </View>
            )}

            {urgent.length > 0 && (
              <View>
                <Text style={s.sectionTitle}>🔴 Urgente</Text>
                {urgent.map(r => <ReminderCard key={r._id} item={r} onDone={markDone} onDelete={deleteItem} />)}
              </View>
            )}
            {warnings.length > 0 && (
              <View>
                <Text style={s.sectionTitle}>🟡 Atenție</Text>
                {warnings.map(r => <ReminderCard key={r._id} item={r} onDone={markDone} onDelete={deleteItem} />)}
              </View>
            )}
            {ok.length > 0 && (
              <View>
                <Text style={s.sectionTitle}>🟢 OK</Text>
                {ok.map(r => <ReminderCard key={r._id} item={r} onDone={markDone} onDelete={deleteItem} />)}
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        )
      }

      <AddModal visible={showAdd} imei={selImei} token={token} onClose={() => setShowAdd(false)} onSaved={load} />
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, flexWrap: 'wrap', gap: 8 },
  backBtn:     { width: '100%', marginBottom: 4 },
  title:       { color: T.white, fontSize: 22, fontWeight: 'bold' },
  urgentBadge: { color: T.red, fontSize: 12, marginTop: 4 },
  addBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addTxt:      { color: '#fff', fontWeight: 'bold' },
  chips:       { maxHeight: 54 },
  chip:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: T.border },
  chipA:       { borderColor: T.primary, backgroundColor: T.primary + '33' },
  chipTxt:     { color: T.muted, fontSize: 13 },
  chipTxtA:    { color: T.accent, fontWeight: '700' },
  sectionTitle:{ color: T.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginTop: 8 },
  empty:       { alignItems: 'center', marginTop: 60 },
  emptyTxt:    { color: T.white, fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySub:    { color: T.muted, fontSize: 13, marginTop: 6 },
});

const rS = StyleSheet.create({
  card:    { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 12, gap: 10, borderWidth: 1, borderColor: T.border, overflow: 'hidden', ...SHADOW },
  urgBar:  { width: 3, alignSelf: 'stretch', borderRadius: 2, marginRight: 4 },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.bgCard3, justifyContent: 'center', alignItems: 'center' },
  typeIcon:{ fontSize: 22 },
  info:    { flex: 1 },
  topRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  type:    { color: T.white, fontWeight: 'bold', fontSize: 14 },
  badge:   { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeTxt:{ fontSize: 11, fontWeight: '700' },
  date:    { color: T.muted, fontSize: 12, marginBottom: 2 },
  notes:   { color: T.muted2, fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  actions: { gap: 6 },
  doneBtn: { padding: 4 },
});

const mS = StyleSheet.create({
  overlay:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet:     { backgroundColor: T.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 20 },
  title:     { color: T.white, fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  label:     { color: T.muted, fontSize: 12, marginBottom: 6, marginTop: 10 },
  input:     { backgroundColor: T.bgCard2, borderRadius: 10, padding: 12, color: T.white, fontSize: 14, borderWidth: 1, borderColor: T.border },
  typeChip:  { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.bgCard2 },
  typeChipA: { borderColor: T.primary, backgroundColor: T.primary + '33' },
  typeTxt:   { color: T.muted, fontSize: 12 },
  typeTxtA:  { color: T.accent, fontWeight: '700' },
  btnRow:    { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: T.border },
  cancelTxt: { color: T.muted, fontWeight: '600' },
  saveBtn:   { flex: 2, backgroundColor: T.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
  saveTxt:   { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
