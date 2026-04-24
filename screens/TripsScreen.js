/**
 * ─────────────────────────────────────────────────────
 *  TripsScreen — Jurnal de bord + Export PDF
 * ─────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { T, SHADOW } from '../theme';

function formatDuration(min) {
  if (!min) return '0 min';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}min`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function TripCard({ trip }) {
  const [expanded, setExpanded] = useState(false);
  const hasIssues = (trip.speedAlerts || 0) + (trip.harshEvents || 0) > 0;

  return (
    <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.85}>
      <LinearGradient colors={[T.bgCard2, T.bgCard]} style={tripS.card}>
        {/* Bara laterală colorată */}
        <View style={[tripS.bar, { backgroundColor: hasIssues ? T.orange : T.green }]} />

        <View style={tripS.main}>
          <View style={tripS.row}>
            <Text style={tripS.date}>{formatDate(trip.startTime)}</Text>
            <Text style={[tripS.km, { color: T.accent }]}>{(trip.distanceKm || 0).toFixed(1)} km</Text>
          </View>

          <View style={tripS.row}>
            <View style={tripS.addrCol}>
              <Text style={tripS.addrLabel}>🟢 De la</Text>
              <Text style={tripS.addr} numberOfLines={1}>{trip.startAddress || 'Adresă necunoscută'}</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={T.muted} style={{ marginHorizontal: 8, marginTop: 16 }} />
            <View style={tripS.addrCol}>
              <Text style={tripS.addrLabel}>🔴 Până la</Text>
              <Text style={tripS.addr} numberOfLines={1}>{trip.endAddress || 'Adresă necunoscută'}</Text>
            </View>
          </View>

          <View style={tripS.pills}>
            <View style={tripS.pill}><Text style={tripS.pillTxt}>⏱ {formatDuration(trip.durationMin)}</Text></View>
            <View style={tripS.pill}><Text style={tripS.pillTxt}>🚀 max {trip.maxSpeedKmh || 0} km/h</Text></View>
            <View style={tripS.pill}><Text style={tripS.pillTxt}>⚡ avg {trip.avgSpeedKmh || 0} km/h</Text></View>
            {(trip.idleMin || 0) > 0 && <View style={[tripS.pill, { backgroundColor: '#fb923c22' }]}><Text style={[tripS.pillTxt, { color: T.orange }]}>⏳ {trip.idleMin}min ralanti</Text></View>}
          </View>

          {expanded && (
            <View style={tripS.details}>
              {trip.driverName ? <Text style={tripS.driver}>👤 Șofer: {trip.driverName}</Text> : null}
              {(trip.speedAlerts || 0) > 0 && <Text style={tripS.alert}>⚡ {trip.speedAlerts} depășiri viteză</Text>}
              {(trip.harshEvents || 0) > 0 && <Text style={tripS.alert}>⚠️ {trip.harshEvents} evenimente conduct agresiv</Text>}
            </View>
          )}
        </View>

        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={T.muted} style={{ alignSelf: 'center', marginLeft: 4 }} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function TripsScreen({ route, navigation }) {
  const { token } = useAuth();
  const imei = route?.params?.imei || null;

  const [devices,     setDevices]     = useState([]);
  const [selImei,     setSelImei]     = useState(imei);
  const [trips,       setTrips]       = useState([]);
  const [summary,     setSummary]     = useState({ totalKm: 0, totalMin: 0 });
  const [loading,     setLoading]     = useState(true);
  const [exporting,   setExporting]   = useState(false);
  const [days,        setDays]        = useState(30);

  useEffect(() => {
    fetch(`${API_BASE_URL}/devices`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(j => {
        if (j.success && j.data.length) {
          setDevices(j.data);
          if (!selImei) setSelImei(j.data[0].imei);
        }
      }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selImei) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/devices/${selImei}/trips?days=${days}&limit=50`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(j => {
        if (j.success) { setTrips(j.data); setSummary({ totalKm: j.totalKm, totalMin: j.totalMin }); }
      }).catch(() => {})
      .finally(() => setLoading(false));
  }, [selImei, days]);

  const exportPDF = async () => {
    if (!trips.length) { Alert.alert('Atenție', 'Nu există curse pentru export.'); return; }
    setExporting(true);
    try {
      const device  = devices.find(d => d.imei === selImei);
      const plate   = device?.vehicle?.licensePlate || selImei;
      const rows    = trips.map((t, i) => `
        <tr style="background:${i % 2 === 0 ? '#f9f6ff' : '#fff'}">
          <td>${i + 1}</td>
          <td>${formatDate(t.startTime)}</td>
          <td>${t.startAddress || '—'}</td>
          <td>${t.endAddress || '—'}</td>
          <td><strong>${(t.distanceKm || 0).toFixed(1)} km</strong></td>
          <td>${formatDuration(t.durationMin)}</td>
          <td>${t.avgSpeedKmh || 0} km/h</td>
          <td>${t.maxSpeedKmh || 0} km/h</td>
          <td>${t.driverName || '—'}</td>
        </tr>`).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
          h1 { color: #7B2FBE; margin-bottom: 4px; }
          .sub { color: #888; font-size: 13px; margin-bottom: 20px; }
          .summary { display:flex; gap:24px; margin-bottom:24px; }
          .scard { background: #f3e8ff; border-radius:10px; padding:12px 20px; }
          .scard .val { font-size:22px; font-weight:bold; color:#7B2FBE; }
          .scard .lbl { font-size:12px; color:#888; }
          table { width:100%; border-collapse:collapse; font-size:12px; }
          th { background:#7B2FBE; color:#fff; padding:8px 6px; text-align:left; }
          td { padding:7px 6px; border-bottom:1px solid #eee; }
          .footer { margin-top:30px; color:#aaa; font-size:11px; text-align:center; }
        </style></head><body>
        <h1>📋 Jurnal de Bord — ${plate}</h1>
        <p class="sub">Perioada: ultimele ${days} zile · Generat: ${new Date().toLocaleString('ro-RO')}</p>
        <div class="summary">
          <div class="scard"><div class="val">${summary.totalKm} km</div><div class="lbl">Total km parcurși</div></div>
          <div class="scard"><div class="val">${trips.length}</div><div class="lbl">Total curse</div></div>
          <div class="scard"><div class="val">${formatDuration(summary.totalMin)}</div><div class="lbl">Timp total condus</div></div>
        </div>
        <table>
          <tr><th>#</th><th>Data/Ora</th><th>Plecare</th><th>Sosire</th><th>Km</th><th>Durată</th><th>Vit. med.</th><th>Vit. max.</th><th>Șofer</th></tr>
          ${rows}
        </table>
        <p class="footer">Fleet Telemetry · Universitatea Politehnica Timișoara · ${new Date().getFullYear()}</p>
        </body></html>`;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Jurnal ${plate}` });
    } catch (err) {
      Alert.alert('Eroare', 'Nu s-a putut genera PDF-ul: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <LinearGradient colors={[T.bg, '#0F0328']} style={{ flex: 1 }}>
      {/* Header */}
      <LinearGradient colors={['#1A0B3E', '#0E0428']} style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.title}>🛣️  Jurnal de bord</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[s.pdfBtn, { backgroundColor: '#7B2FBE' }]}
              onPress={() => {
                const device = devices.find(d => d.imei === selImei);
                navigation.navigate('RpmReport', {
                  imei:   selImei,
                  plate:  device?.vehicle?.licensePlate || selImei,
                  days,
                  startDate: new Date(Date.now() - days * 86400000).toISOString().split('T')[0],
                  endDate:   new Date().toISOString().split('T')[0],
                });
              }}
            >
              <Ionicons name="speedometer" size={16} color="#fff" />
              <Text style={s.pdfTxt}>RPM</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.pdfBtn, exporting && { opacity: 0.6 }]}
              onPress={exportPDF}
              disabled={exporting}
            >
              <Ionicons name="document-text" size={16} color="#fff" />
              <Text style={s.pdfTxt}>{exporting ? '...' : 'PDF'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.summaryPills}>
          <Text style={s.summaryPill}>📍 {summary.totalKm} km</Text>
          <Text style={s.summaryPill}>🛣️  {trips.length} curse</Text>
          <Text style={s.summaryPill}>⏱ {formatDuration(summary.totalMin)}</Text>
        </View>
      </LinearGradient>

      {/* Selector mașină */}
      {devices.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips} contentContainerStyle={{ padding: 12, gap: 8 }}>
          {devices.map(d => (
            <TouchableOpacity
              key={d.imei}
              style={[s.chip, selImei === d.imei && s.chipActive]}
              onPress={() => setSelImei(d.imei)}
            >
              <Text style={[s.chipTxt, selImei === d.imei && s.chipTxtActive]}>
                {d.vehicle?.licensePlate || d.imei.slice(-6)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Selector zile */}
      <View style={s.dayRow}>
        {[7, 14, 30].map(d => (
          <TouchableOpacity key={d} style={[s.dayBtn, days === d && s.dayBtnA]} onPress={() => setDays(d)}>
            <Text style={[s.dayTxt, days === d && s.dayTxtA]}>Ultimele {d}Z</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <ActivityIndicator color={T.accent} style={{ marginTop: 40 }} />
        : (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            {trips.length === 0
              ? <View style={s.empty}><Text style={{ fontSize: 48 }}>🚗</Text><Text style={s.emptyTxt}>Nicio cursă în această perioadă</Text></View>
              : trips.map(t => <TripCard key={t._id} trip={t} />)
            }
            <View style={{ height: 32 }} />
          </ScrollView>
        )
      }
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  header:     { padding: 20, paddingTop: 52 },
  title:      { color: T.white, fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  headerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryPills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  summaryPill:  { backgroundColor: 'rgba(168,85,247,0.15)', color: T.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: '600', overflow: 'hidden' },
  pdfBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  pdfTxt:     { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  chips:      { maxHeight: 54 },
  chip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.bgCard },
  chipActive: { borderColor: T.primary, backgroundColor: T.primary + '33' },
  chipTxt:    { color: T.muted, fontSize: 13 },
  chipTxtActive: { color: T.accent, fontWeight: '700' },
  dayRow:     { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  dayBtn:     { flex: 1, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: T.border, alignItems: 'center' },
  dayBtnA:    { backgroundColor: T.primary, borderColor: T.primary },
  dayTxt:     { color: T.muted, fontSize: 12 },
  dayTxtA:    { color: '#fff', fontWeight: '700' },
  empty:      { alignItems: 'center', marginTop: 60 },
  emptyTxt:   { color: T.muted, marginTop: 12, fontSize: 14 },
});

const tripS = StyleSheet.create({
  card:    { flexDirection: 'row', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: T.border, overflow: 'hidden', ...SHADOW },
  bar:     { width: 3, borderRadius: 2, marginRight: 12, alignSelf: 'stretch' },
  main:    { flex: 1 },
  row:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  date:    { color: T.muted, fontSize: 12 },
  km:      { fontWeight: 'bold', fontSize: 18 },
  addrCol: { flex: 1 },
  addrLabel: { color: T.muted, fontSize: 10, marginBottom: 2 },
  addr:    { color: T.white, fontSize: 12, fontWeight: '600' },
  pills:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  pill:    { backgroundColor: T.bgCard3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillTxt: { color: T.muted, fontSize: 11 },
  details: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border },
  driver:  { color: T.accent2, fontSize: 12, marginBottom: 4 },
  alert:   { color: T.orange, fontSize: 12, marginBottom: 2 },
});
