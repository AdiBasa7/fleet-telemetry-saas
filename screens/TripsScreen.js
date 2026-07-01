/**
 * ─────────────────────────────────────────────────────
 *  TripsScreen — Jurnal de bord + Fleet Report Builder
 *  7 secțiuni selectabile: curse, viteză, ralanti,
 *  CO₂, evenimente, activitate zilnică, histogramă RPM
 * ─────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, SHADOW } from '../theme';

// ── Helpers ───────────────────────────────────────────
function formatDuration(min) {
  if (!min) return '0 min';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}min`;
}
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ro-RO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function dateToIso(d) { return d.toISOString().split('T')[0]; }

// ── Calcule analitice din trips array ────────────────
function computeSpeedProfile(trips) {
  const bands = [
    { label: 'Urban aglomerat (0–30)',  min: 0,  max: 30,  km: 0 },
    { label: 'Urban normal (30–60)',    min: 30, max: 60,  km: 0 },
    { label: 'Drum național (60–90)',   min: 60, max: 90,  km: 0 },
    { label: 'Extra-urban / A (90+)',   min: 90, max: 999, km: 0 },
  ];
  trips.forEach(t => {
    const avg = t.avgSpeedKmh || 0;
    const band = bands.find(b => avg >= b.min && avg < b.max);
    if (band) band.km += t.distanceKm || 0;
  });
  const total = bands.reduce((s, b) => s + b.km, 0) || 1;
  return bands.map(b => ({ ...b, pct: Math.round(b.km / total * 100) }));
}

function computeDailyActivity(trips) {
  const map = {};
  trips.forEach(t => {
    const day = t.startTime ? t.startTime.slice(0, 10) : 'necunoscut';
    if (!map[day]) map[day] = { km: 0, trips: 0 };
    map[day].km += t.distanceKm || 0;
    map[day].trips++;
  });
  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, v]) => ({ day, km: v.km.toFixed(1), trips: v.trips }));
}

// ── TripCard ──────────────────────────────────────────
function TripCard({ trip }) {
  const [expanded, setExpanded] = useState(false);
  const hasIssues = (trip.speedAlerts || 0) + (trip.harshEvents || 0) > 0;

  return (
    <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.85}>
      <LinearGradient colors={[T.bgCard2, T.bgCard]} style={tripS.card}>
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
            {(trip.idleMin || 0) > 0 && (
              <View style={[tripS.pill, { backgroundColor: '#fb923c22' }]}>
                <Text style={[tripS.pillTxt, { color: T.orange }]}>⏳ {trip.idleMin}min ralanti</Text>
              </View>
            )}
          </View>
          {expanded && (
            <View style={tripS.details}>
              {trip.driverName ? <Text style={tripS.driver}>👤 Șofer: {trip.driverName}</Text> : null}
              {(trip.speedAlerts  || 0) > 0 && <Text style={tripS.alert}>⚡ {trip.speedAlerts} depășiri viteză</Text>}
              {(trip.harshEvents  || 0) > 0 && <Text style={tripS.alert}>⚠️ {trip.harshEvents} evenimente condus agresiv</Text>}
              <Text style={tripS.detail}>📍 Start: {trip.startAddress || '—'}</Text>
              <Text style={tripS.detail}>🏁 Stop:  {trip.endAddress  || '—'}</Text>
              <Text style={tripS.detail}>⏱ Durată: {formatDuration(trip.durationMin)}</Text>
              <Text style={tripS.detail}>📏 Distanță: {(trip.distanceKm || 0).toFixed(2)} km</Text>
            </View>
          )}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16} color={T.muted}
          style={{ alignSelf: 'center', marginLeft: 4 }}
        />
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Parametrii raport ─────────────────────────────────
const RPT_SECTIONS = [
  { key: 'trips',  icon: '🛣️',  label: 'Jurnal curse',          desc: 'Start, end, durată, km, viteză medie/max' },
  { key: 'speed',  icon: '🏎️',  label: 'Profil viteză',         desc: 'Distribuție urban / drum / autostradă' },
  { key: 'idle',   icon: '⏳',  label: 'Timp la ralanti',       desc: 'Motor pornit fără deplasare + cost estimat' },
  { key: 'co2',    icon: '🌿',  label: 'Emisii CO₂',            desc: 'Impact ambiental estimat (diesel JTDM)' },
  { key: 'events', icon: '⚠️',  label: 'Comportament agresiv',  desc: 'Frânări, accelerări și viraje bruște' },
  { key: 'daily',  icon: '📅',  label: 'Activitate zilnică',    desc: 'Km și curse per zi' },
  { key: 'rpm',    icon: '📊',  label: 'Histogramă RPM',        desc: 'Clase 0–6 turații (necesită adaptor CAN)' },
];

// ── Main Screen ───────────────────────────────────────
export default function TripsScreen({ route, navigation }) {
  const { top }   = useSafeAreaInsets();
  const { token } = useAuth();
  const imei = route?.params?.imei || null;

  const [devices,     setDevices]     = useState([]);
  const [selImei,     setSelImei]     = useState(imei);
  const [trips,       setTrips]       = useState([]);
  const [summary,     setSummary]     = useState({ totalKm: 0, totalMin: 0 });
  const [loading,     setLoading]     = useState(true);
  const [days,        setDays]        = useState(30);

  // Report builder
  const [showReport,  setShowReport]  = useState(false);
  const [generating,  setGenerating]  = useState(false);
  const [rptParams,   setRptParams]   = useState({
    trips: true, speed: true, idle: true,
    co2: true,  events: true, daily: true, rpm: false,
  });

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
    fetch(`${API_BASE_URL}/devices/${selImei}/trips?days=${days}&limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json()).then(j => {
        if (j.success) { setTrips(j.data); setSummary({ totalKm: j.totalKm, totalMin: j.totalMin }); }
      }).catch(() => {})
      .finally(() => setLoading(false));
  }, [selImei, days]);

  const toggleParam = (key) =>
    setRptParams(p => ({ ...p, [key]: !p[key] }));

  // ── HTML generators ──────────────────────────────────
  const buildTripsSection = () => {
    const rows = trips.map((t, i) => `
      <tr style="background:${i % 2 === 0 ? '#f9f6ff' : '#fff'}">
        <td>${i + 1}</td>
        <td>${formatDate(t.startTime)}</td>
        <td>${t.startAddress || '—'}</td>
        <td>${t.endAddress || '—'}</td>
        <td><strong>${(t.distanceKm || 0).toFixed(1)} km</strong></td>
        <td>${formatDuration(t.durationMin)}</td>
        <td>${t.avgSpeedKmh || 0} km/h</td>
        <td>${t.maxSpeedKmh || 0} km/h</td>
        <td>${(t.idleMin || 0) > 0 ? `${t.idleMin} min` : '—'}</td>
      </tr>`).join('');
    return `
      <h2 style="color:#5B21B6;margin-top:32px">🛣️ Jurnal curse</h2>
      <table>
        <tr><th>#</th><th>Data/Ora</th><th>Plecare</th><th>Destinație</th>
            <th>Km</th><th>Durată</th><th>Vit. med.</th><th>Vit. max.</th><th>Ralanti</th></tr>
        ${rows}
      </table>`;
  };

  const buildSpeedSection = () => {
    const bands = computeSpeedProfile(trips);
    const rows = bands.map(b => `
      <tr>
        <td>${b.label}</td>
        <td><strong>${b.km.toFixed(1)} km</strong></td>
        <td>
          <div style="background:#e9d5ff;border-radius:4px;height:14px;width:100%;min-width:120px">
            <div style="background:#7C3AED;border-radius:4px;height:14px;width:${b.pct}%"></div>
          </div>
        </td>
        <td><strong>${b.pct}%</strong></td>
      </tr>`).join('');
    return `
      <h2 style="color:#5B21B6;margin-top:32px">🏎️ Profil viteză</h2>
      <table>
        <tr><th>Categorie</th><th>Distanță</th><th>Distribuție</th><th>%</th></tr>
        ${rows}
      </table>`;
  };

  const buildIdleSection = () => {
    const totalIdle = trips.reduce((s, t) => s + (t.idleMin || 0), 0);
    const totalDriving = summary.totalMin || 1;
    const idlePct = Math.round(totalIdle / totalDriving * 100);
    const fuelWasted = (totalIdle / 60 * 0.5).toFixed(1); // 0.5L/h la ralanti
    const costLei = (parseFloat(fuelWasted) * 7.5).toFixed(2); // ~7.5 lei/L motorină
    return `
      <h2 style="color:#5B21B6;margin-top:32px">⏳ Timp la ralanti</h2>
      <div class="kpi-row">
        <div class="kpi"><div class="kpi-val">${formatDuration(totalIdle)}</div><div class="kpi-lbl">Total timp ralanti</div></div>
        <div class="kpi"><div class="kpi-val">${idlePct}%</div><div class="kpi-lbl">Din timpul total de condus</div></div>
        <div class="kpi"><div class="kpi-val">${fuelWasted} L</div><div class="kpi-lbl">Combustibil estimat risipit</div></div>
        <div class="kpi"><div class="kpi-val">${costLei} lei</div><div class="kpi-lbl">Cost estimat ralanti</div></div>
      </div>
      <p style="color:#888;font-size:12px">* Calcul estimativ: consum ralanti 0.5 L/h · preț motorină 7.5 lei/L</p>`;
  };

  const buildCO2Section = () => {
    const totalKm = parseFloat(summary.totalKm) || 0;
    const consumL = (totalKm * 0.065).toFixed(1);     // 6.5 L/100km diesel
    const co2kg   = (totalKm * 0.172).toFixed(1);     // 2.64 kg CO₂/L × 6.5 L/100km
    const trees   = Math.round(parseFloat(co2kg) / 21); // un copac absoarbe ~21 kg CO₂/an
    return `
      <h2 style="color:#5B21B6;margin-top:32px">🌿 Emisii CO₂ estimate</h2>
      <div class="kpi-row">
        <div class="kpi"><div class="kpi-val">${totalKm} km</div><div class="kpi-lbl">Total km parcurși</div></div>
        <div class="kpi"><div class="kpi-val">${consumL} L</div><div class="kpi-lbl">Combustibil estimat</div></div>
        <div class="kpi"><div class="kpi-val">${co2kg} kg</div><div class="kpi-lbl">CO₂ emis</div></div>
        <div class="kpi"><div class="kpi-val">${trees} 🌳</div><div class="kpi-lbl">Copaci necesari compensare/an</div></div>
      </div>
      <p style="color:#888;font-size:12px">* Alfa Romeo 159 JTDM 2.0: 6.5 L/100km · 172 g CO₂/km (NEDC)</p>`;
  };

  const buildEventsSection = () => {
    const totalEvents  = trips.reduce((s, t) => s + (t.harshEvents || 0), 0);
    const totalAlerts  = trips.reduce((s, t) => s + (t.speedAlerts || 0), 0);
    const totalIdle    = trips.reduce((s, t) => s + (t.idleMin || 0), 0);
    const worstTrips   = [...trips]
      .sort((a, b) => (b.harshEvents || 0) - (a.harshEvents || 0))
      .slice(0, 3);
    const worstRows = worstTrips.map(t => `
      <tr>
        <td>${formatDate(t.startTime)}</td>
        <td>${t.startAddress || '—'} → ${t.endAddress || '—'}</td>
        <td style="color:#f97316;font-weight:bold">${t.harshEvents || 0}</td>
        <td>${t.speedAlerts || 0}</td>
      </tr>`).join('');
    return `
      <h2 style="color:#5B21B6;margin-top:32px">⚠️ Comportament agresiv</h2>
      <div class="kpi-row">
        <div class="kpi"><div class="kpi-val" style="color:#f97316">${totalEvents}</div><div class="kpi-lbl">Evenimente agresive</div></div>
        <div class="kpi"><div class="kpi-val" style="color:#ef4444">${totalAlerts}</div><div class="kpi-lbl">Depășiri viteză</div></div>
        <div class="kpi"><div class="kpi-val">${trips.length > 0 ? (totalEvents / trips.length).toFixed(1) : 0}</div><div class="kpi-lbl">Medie/cursă</div></div>
        <div class="kpi"><div class="kpi-val">${totalIdle}</div><div class="kpi-lbl">Min ralanti total</div></div>
      </div>
      ${worstTrips.length > 0 ? `
      <h3 style="color:#7C3AED;font-size:14px">Top curse cu cele mai multe evenimente:</h3>
      <table>
        <tr><th>Data</th><th>Traseu</th><th>Ev. agresive</th><th>Depășiri</th></tr>
        ${worstRows}
      </table>` : ''}`;
  };

  const buildDailySection = () => {
    const daily = computeDailyActivity(trips);
    const rows = daily.map((d, i) => `
      <tr style="background:${i % 2 === 0 ? '#f9f6ff' : '#fff'}">
        <td>${d.day}</td>
        <td><strong>${d.km} km</strong></td>
        <td>${d.trips} ${d.trips === 1 ? 'cursă' : 'curse'}</td>
      </tr>`).join('');
    return `
      <h2 style="color:#5B21B6;margin-top:32px">📅 Activitate zilnică</h2>
      <table>
        <tr><th>Data</th><th>Km parcurși</th><th>Nr. curse</th></tr>
        ${rows || '<tr><td colspan="3" style="text-align:center;color:#aaa">Fără activitate</td></tr>'}
      </table>`;
  };

  const buildRpmSection = async (plate) => {
    try {
      const endDate   = dateToIso(new Date());
      const startDate = dateToIso(new Date(Date.now() - days * 86400000));
      const resp = await fetch(
        `${API_BASE_URL}/devices/${selImei}/trips/rpm-report?startDate=${startDate}&endDate=${endDate}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await resp.json();
      if (!json.success || !json.classes) return '<h2 style="color:#5B21B6;margin-top:32px">📊 Histogramă RPM</h2><p style="color:#aaa">Date indisponibile.</p>';
      const maxMin = Math.max(...json.classes.map(c => c.minutes), 1);
      const rows = json.classes.map(c => `
        <tr>
          <td><strong>Clasa ${c.class}</strong></td>
          <td>${c.range}</td>
          <td>${c.minutes} min</td>
          <td>
            <div style="background:#e9d5ff;border-radius:4px;height:14px;width:100%;min-width:100px">
              <div style="background:#7C3AED;border-radius:4px;height:14px;width:${Math.round(c.minutes / maxMin * 100)}%"></div>
            </div>
          </td>
          <td>${c.pct || 0}%</td>
        </tr>`).join('');
      return `
        <h2 style="color:#5B21B6;margin-top:32px">📊 Histogramă RPM — ${plate}</h2>
        <p style="color:#888;font-size:12px">Perioada: ${startDate} → ${endDate} · Total: ${json.totalMinutes || 0} minute</p>
        <table>
          <tr><th>Clasă</th><th>Interval (RPM)</th><th>Timp (min)</th><th>Distribuție</th><th>%</th></tr>
          ${rows}
        </table>`;
    } catch {
      return '<h2 style="color:#5B21B6;margin-top:32px">📊 Histogramă RPM</h2><p style="color:#aaa">Eroare la încărcarea datelor RPM.</p>';
    }
  };

  // ── Generate PDF ─────────────────────────────────────
  const generatePDF = async () => {
    if (!trips.length && !rptParams.rpm) {
      Alert.alert('Atenție', 'Nu există date pentru export.');
      return;
    }
    setGenerating(true);
    try {
      const device = devices.find(d => d.imei === selImei);
      const plate  = device?.vehicle?.licensePlate || selImei || '—';
      const make   = [device?.vehicle?.make, device?.vehicle?.model].filter(Boolean).join(' ') || '';

      let sections = '';
      if (rptParams.trips)  sections += buildTripsSection();
      if (rptParams.speed)  sections += buildSpeedSection();
      if (rptParams.idle)   sections += buildIdleSection();
      if (rptParams.co2)    sections += buildCO2Section();
      if (rptParams.events) sections += buildEventsSection();
      if (rptParams.daily)  sections += buildDailySection();
      if (rptParams.rpm)    sections += await buildRpmSection(plate);

      const selectedCount = Object.values(rptParams).filter(Boolean).length;

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 28px; color: #111; }
          h1 { color: #5B21B6; margin-bottom: 2px; font-size: 22px; }
          h2 { font-size: 16px; border-left: 4px solid #7C3AED; padding-left: 10px; }
          .sub { color: #888; font-size: 12px; margin-bottom: 24px; }
          .exec { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:24px; padding:16px;
                  background:#f3e8ff; border-radius:12px; }
          .exec-kpi { text-align:center; min-width:80px; }
          .exec-kpi .val { font-size:20px; font-weight:bold; color:#5B21B6; }
          .exec-kpi .lbl { font-size:11px; color:#888; }
          .kpi-row { display:flex; gap:12px; flex-wrap:wrap; margin:12px 0; }
          .kpi { background:#f3e8ff; border-radius:10px; padding:10px 16px; min-width:100px; text-align:center; }
          .kpi-val { font-size:18px; font-weight:bold; color:#5B21B6; }
          .kpi-lbl { font-size:11px; color:#888; }
          table { width:100%; border-collapse:collapse; font-size:11px; margin-top:8px; }
          th { background:#5B21B6; color:#fff; padding:7px 6px; text-align:left; }
          td { padding:6px 6px; border-bottom:1px solid #eee; }
          .badge { display:inline-block; background:#ede9fe; color:#5B21B6; border-radius:6px;
                   padding:2px 7px; font-size:10px; font-weight:bold; }
          .footer { margin-top:36px; color:#aaa; font-size:10px; text-align:center; border-top:1px solid #eee; padding-top:12px; }
        </style></head><body>
        <h1>📋 Raport Fleet Telemetry — ${plate}</h1>
        <p class="sub">${make} · Perioada: ultimele ${days} zile ·
           ${selectedCount} secțiuni · Generat: ${new Date().toLocaleString('ro-RO')}</p>

        <div class="exec">
          <div class="exec-kpi"><div class="val">${summary.totalKm}</div><div class="lbl">km parcurși</div></div>
          <div class="exec-kpi"><div class="val">${trips.length}</div><div class="lbl">curse</div></div>
          <div class="exec-kpi"><div class="val">${formatDuration(summary.totalMin)}</div><div class="lbl">timp condus</div></div>
          <div class="exec-kpi"><div class="val">${trips.length > 0 ? (parseFloat(summary.totalKm) / trips.length).toFixed(1) : 0} km</div><div class="lbl">dist. medie/cursă</div></div>
          <div class="exec-kpi"><div class="val">${trips.reduce((s,t) => s + (t.harshEvents||0), 0)}</div><div class="lbl">ev. agresive</div></div>
          <div class="exec-kpi"><div class="val">${(parseFloat(summary.totalKm) * 0.172).toFixed(0)} kg</div><div class="lbl">CO₂ estimat</div></div>
        </div>

        ${sections}

        <p class="footer">
          Fleet Telemetry · Universitatea Politehnica Timișoara · ${new Date().getFullYear()}<br>
          Generat automat — date provenite de la dispozitivul Teltonika FMC130 + LV-CAN200
        </p>
        </body></html>`;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType:    'application/pdf',
        dialogTitle: `Raport Fleet — ${plate}`,
      });
      setShowReport(false);
    } catch (err) {
      Alert.alert('Eroare', 'Nu s-a putut genera raportul: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // ── Report Builder Modal ──────────────────────────────
  const ReportModal = () => (
    <Modal visible={showReport} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowReport(false)}>
      <LinearGradient colors={['#0E0428', '#1A0B3E']} style={{ flex: 1 }}>
        {/* Modal header */}
        <View style={mS.header}>
          <View>
            <Text style={mS.title}>📋 Configurează raport</Text>
            <Text style={mS.sub}>Selectează secțiunile de inclus în PDF</Text>
          </View>
          <TouchableOpacity onPress={() => setShowReport(false)} style={mS.closeBtn}>
            <Ionicons name="close" size={20} color={T.white} />
          </TouchableOpacity>
        </View>

        {/* Vehicle & period summary */}
        <View style={mS.infoBar}>
          <Text style={mS.infoTxt}>
            🚗 {devices.find(d => d.imei === selImei)?.vehicle?.licensePlate || selImei || '—'}
            {'  ·  '}📅 Ultimele {days} zile
            {'  ·  '}🛣️ {summary.totalKm} km · {trips.length} curse
          </Text>
        </View>

        {/* Section toggles */}
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 120 }}>
          {RPT_SECTIONS.map(sec => (
            <TouchableOpacity
              key={sec.key}
              style={[mS.secRow, rptParams[sec.key] && mS.secRowActive]}
              onPress={() => toggleParam(sec.key)}
              activeOpacity={0.8}
            >
              <Text style={mS.secIcon}>{sec.icon}</Text>
              <View style={mS.secText}>
                <Text style={mS.secLabel}>{sec.label}</Text>
                <Text style={mS.secDesc}>{sec.desc}</Text>
              </View>
              <View style={[mS.toggle, rptParams[sec.key] && mS.toggleOn]}>
                {rptParams[sec.key] && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>
          ))}

          {/* Selected count */}
          <Text style={mS.selectedHint}>
            {Object.values(rptParams).filter(Boolean).length} secțiuni selectate
          </Text>
        </ScrollView>

        {/* Generate button — pinned to bottom */}
        <View style={mS.footer}>
          <TouchableOpacity
            style={[mS.genBtn, generating && { opacity: 0.6 }]}
            onPress={generatePDF}
            disabled={generating}
          >
            <LinearGradient colors={['#7C3AED', '#5B21B6']} style={mS.genBtnGrad}>
              {generating
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="document-text" size={18} color="#fff" /><Text style={mS.genTxt}>Generează PDF</Text></>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Modal>
  );

  // ── Render ────────────────────────────────────────────
  return (
    <LinearGradient colors={[T.bg, '#0F0328']} style={{ flex: 1 }}>
      <ReportModal />

      {/* Header */}
      <LinearGradient colors={['#1A0B3E', '#0E0428']} style={[s.header, { paddingTop: top + 52 }]}>
        <View style={s.headerRow}>
          <Text style={s.title}>🛣️  Jurnal de bord</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* RPM quick-link */}
            <TouchableOpacity
              style={[s.hBtn, { backgroundColor: '#6D28D9' }]}
              onPress={() => {
                const device = devices.find(d => d.imei === selImei);
                navigation.navigate('RpmReport', {
                  imei:      selImei,
                  plate:     device?.vehicle?.licensePlate || selImei,
                  days,
                  startDate: dateToIso(new Date(Date.now() - days * 86400000)),
                  endDate:   dateToIso(new Date()),
                });
              }}
            >
              <Ionicons name="speedometer-outline" size={16} color="#fff" />
              <Text style={s.hBtnTxt}>RPM</Text>
            </TouchableOpacity>

            {/* Report builder */}
            <TouchableOpacity
              style={[s.hBtn, { backgroundColor: T.primary }]}
              onPress={() => setShowReport(true)}
            >
              <Ionicons name="document-text-outline" size={16} color="#fff" />
              <Text style={s.hBtnTxt}>Raport</Text>
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
      {devices.length > 0 && (
        <View style={s.vehicleRow}>
          <Text style={s.vehicleLbl}>🚗 Vehicul:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}
            contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
            {devices.map(d => (
              <TouchableOpacity
                key={d.imei}
                style={[s.chip, selImei === d.imei && s.chipActive]}
                onPress={() => setSelImei(d.imei)}
              >
                <Text style={[s.chipTxt, selImei === d.imei && s.chipTxtActive]}>
                  {d.vehicle?.licensePlate && d.vehicle.licensePlate !== 'Necunoscut'
                    ? d.vehicle.licensePlate
                    : `…${d.imei.slice(-6)}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
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
              ? <View style={s.empty}>
                  <Text style={{ fontSize: 48 }}>🚗</Text>
                  <Text style={s.emptyTxt}>Nicio cursă în această perioadă</Text>
                </View>
              : trips.map(t => <TripCard key={t._id} trip={t} />)
            }
            <View style={{ height: 32 }} />
          </ScrollView>
        )
      }
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────
const s = StyleSheet.create({
  header:        { padding: 20, paddingTop: 52 },
  title:         { color: T.white, fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  headerRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryPills:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  summaryPill:   { backgroundColor: 'rgba(168,85,247,0.15)', color: T.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: '600', overflow: 'hidden' },
  hBtn:          { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  hBtnTxt:       { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  vehicleRow:    { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingVertical: 10, gap: 10 },
  vehicleLbl:    { color: T.muted, fontSize: 12, fontWeight: '600', flexShrink: 0 },
  chip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.bgCard },
  chipActive:    { borderColor: T.primary, backgroundColor: T.primary + '33' },
  chipTxt:       { color: T.muted, fontSize: 13, fontWeight: '600' },
  chipTxtActive: { color: T.accent, fontWeight: '800' },
  dayRow:        { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  dayBtn:        { flex: 1, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: T.border, alignItems: 'center' },
  dayBtnA:       { backgroundColor: T.primary, borderColor: T.primary },
  dayTxt:        { color: T.muted, fontSize: 12 },
  dayTxtA:       { color: '#fff', fontWeight: '700' },
  empty:         { alignItems: 'center', marginTop: 60 },
  emptyTxt:      { color: T.muted, marginTop: 12, fontSize: 14 },
});

const tripS = StyleSheet.create({
  card:     { flexDirection: 'row', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: T.border, overflow: 'hidden', ...SHADOW },
  bar:      { width: 3, borderRadius: 2, marginRight: 12, alignSelf: 'stretch' },
  main:     { flex: 1 },
  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  date:     { color: T.muted, fontSize: 12 },
  km:       { fontWeight: 'bold', fontSize: 18 },
  addrCol:  { flex: 1 },
  addrLabel:{ color: T.muted, fontSize: 10, marginBottom: 2 },
  addr:     { color: T.white, fontSize: 12, fontWeight: '600' },
  pills:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  pill:     { backgroundColor: T.bgCard3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillTxt:  { color: T.muted, fontSize: 11 },
  details:  { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border },
  driver:   { color: T.accent2, fontSize: 12, marginBottom: 4 },
  alert:    { color: T.orange, fontSize: 12, marginBottom: 2 },
  detail:   { color: T.muted2, fontSize: 11, marginBottom: 2 },
});

const mS = StyleSheet.create({
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingTop: 24 },
  title:       { color: T.white, fontSize: 20, fontWeight: '800' },
  sub:         { color: T.muted, fontSize: 13, marginTop: 2 },
  closeBtn:    { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  infoBar:     { marginHorizontal: 16, marginBottom: 8, backgroundColor: 'rgba(168,85,247,0.12)', borderRadius: 10, padding: 10 },
  infoTxt:     { color: T.accent, fontSize: 12, fontWeight: '600' },
  secRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  secRowActive:{ backgroundColor: 'rgba(124,58,237,0.18)', borderColor: 'rgba(124,58,237,0.5)' },
  secIcon:     { fontSize: 26, width: 36, textAlign: 'center' },
  secText:     { flex: 1 },
  secLabel:    { color: T.white, fontSize: 15, fontWeight: '700' },
  secDesc:     { color: T.muted, fontSize: 12, marginTop: 2 },
  toggle:      { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  toggleOn:    { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  selectedHint:{ color: T.muted, fontSize: 12, textAlign: 'center', marginTop: 8 },
  footer:      { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 36, backgroundColor: 'rgba(14,4,40,0.95)' },
  genBtn:      { borderRadius: 24, overflow: 'hidden' },
  genBtnGrad:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  genTxt:      { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});
