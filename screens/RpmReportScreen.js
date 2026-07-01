/**
 * ─────────────────────────────────────────────────────
 *  RpmReportScreen — Raport Turații Motor
 *  · Selector date personalizat (zi/lună/an)
 *  · Histogramă nativă react-native-chart-kit
 *  · Export PDF via expo-print + expo-sharing
 * ─────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions,
  ActivityIndicator, TouchableOpacity, Animated, Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart }       from 'react-native-chart-kit';
import { Ionicons }       from '@expo/vector-icons';
import * as Print         from 'expo-print';
import * as Sharing       from 'expo-sharing';
import { API_BASE_URL }   from '../config';
import { useAuth }        from '../context/AuthContext';
import { useNavigation }  from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, SHADOW }      from '../theme';

const { width: W } = Dimensions.get('window');
const CHART_W      = W - 48;

// ─────────────────────────────────────────────────────
//  DATE MOCK — înlocuiește cu fetch real (vezi loadData)
// ─────────────────────────────────────────────────────
const MOCK_DATA = {
  totalMinutes: 120,
  tripCount: 8,
  classes: [
    { label: 'Clasa 0', desc: '0 – 500 RPM',    minutes: 10, percent: 8  },
    { label: 'Clasa 1', desc: '500 – 1000 RPM',  minutes: 18, percent: 15 },
    { label: 'Clasa 2', desc: '1000 – 1500 RPM', minutes: 22, percent: 18 },
    { label: 'Clasa 3', desc: '1500 – 2000 RPM', minutes: 45, percent: 38 },
    { label: 'Clasa 4', desc: '2000 – 2500 RPM', minutes: 20, percent: 17 },
    { label: 'Clasa 5', desc: '2500+ RPM',        minutes:  5, percent: 4  },
  ],
};

// ─────────────────────────────────────────────────────
//  Constante & utilitare
// ─────────────────────────────────────────────────────
const MONTHS_RO = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
                     'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function dateToIso(d) {
  const yy = d.year;
  const mm = String(d.month + 1).padStart(2, '0');
  const dd = String(d.day).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function dateLabel(d) {
  return `${String(d.day).padStart(2, '0')} ${MONTHS_RO[d.month]} ${d.year}`;
}

function formatDuration(totalMin) {
  if (!totalMin) return '0 min';
  const h   = Math.floor(totalMin / 60);
  const min = Math.round(totalMin % 60);
  return h > 0 ? `${h}h ${min}min` : `${min} min`;
}

function todayParts() {
  const n = new Date();
  return { day: n.getDate(), month: n.getMonth(), year: n.getFullYear() };
}

function firstOfMonthParts() {
  const n = new Date();
  return { day: 1, month: n.getMonth(), year: n.getFullYear() };
}

// ─────────────────────────────────────────────────────
//  DatePickerModal — spinner cu stepper-uri zi/lună/an
// ─────────────────────────────────────────────────────
function DatePickerModal({ visible, title, initial, onConfirm, onCancel }) {
  const [d, setD] = useState(initial);

  useEffect(() => { if (visible) setD(initial); }, [visible]);

  const adjust = (field, delta) => {
    setD(prev => {
      let { day, month, year } = prev;
      if (field === 'year')  year  = clamp(year  + delta, 2020, 2030);
      if (field === 'month') { month = (month + delta + 12) % 12; }
      if (field === 'day')   day   = clamp(day   + delta, 1, daysInMonth(year, month));
      day = clamp(day, 1, daysInMonth(year, month));
      return { day, month, year };
    });
  };

  function Spinner({ field, display }) {
    return (
      <View style={pk.spinnerCol}>
        <TouchableOpacity style={pk.arrow} onPress={() => adjust(field, 1)}>
          <Ionicons name="chevron-up" size={20} color={T.accent} />
        </TouchableOpacity>
        <View style={pk.valueBox}>
          <Text style={pk.valueTxt}>{display}</Text>
        </View>
        <TouchableOpacity style={pk.arrow} onPress={() => adjust(field, -1)}>
          <Ionicons name="chevron-down" size={20} color={T.accent} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={pk.overlay}>
        <View style={pk.sheet}>
          <LinearGradient colors={['#1C0D40', '#110626']} style={pk.sheetInner}>
            <Text style={pk.title}>{title}</Text>

            <View style={pk.spinnersRow}>
              <Spinner field="day"   display={String(d.day).padStart(2, '0')} />
              <View style={pk.sep} />
              <Spinner field="month" display={MONTHS_FULL[d.month]} />
              <View style={pk.sep} />
              <Spinner field="year"  display={String(d.year)} />
            </View>

            <View style={pk.preview}>
              <Text style={pk.previewTxt}>{dateLabel(d)}</Text>
            </View>

            <View style={pk.btnRow}>
              <TouchableOpacity style={pk.btnCancel} onPress={onCancel}>
                <Text style={pk.btnCancelTxt}>Anulează</Text>
              </TouchableOpacity>
              <TouchableOpacity style={pk.btnConfirm} onPress={() => onConfirm(d)}>
                <LinearGradient colors={T.grad} style={pk.btnGrad}>
                  <Text style={pk.btnConfirmTxt}>Confirmă</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────
//  VehiclePickerModal — alege mașina din flotă
// ─────────────────────────────────────────────────────
function VehiclePickerModal({ visible, devices, selectedImei, onSelect, onCancel }) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onCancel}>
      <View style={vp.overlay}>
        <View style={vp.sheet}>
          <LinearGradient colors={['#1C0D40', '#110626']} style={vp.inner}>
            <View style={vp.handle} />
            <Text style={vp.title}>Selectează vehiculul</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {devices.map(d => {
                const plate   = d.vehicle?.licensePlate || d.imei;
                const model   = [d.vehicle?.make, d.vehicle?.model].filter(v => v && v !== 'Necunoscut').join(' ') || 'Necunoscut';
                const active  = d.imei === selectedImei;
                return (
                  <TouchableOpacity
                    key={d.imei}
                    style={[vp.row, active && vp.rowActive]}
                    onPress={() => onSelect(d)}
                    activeOpacity={0.75}
                  >
                    <View style={[vp.iconBox, { backgroundColor: active ? T.primary + '33' : 'rgba(123,47,190,0.1)' }]}>
                      <Text style={{ fontSize: 20 }}>🚗</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[vp.plate, active && { color: T.accent }]}>{plate}</Text>
                      <Text style={vp.model}>{model}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={20} color={T.accent} />}
                    {d.isConnected && (
                      <View style={vp.onlineDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={vp.cancelBtn} onPress={onCancel}>
              <Text style={vp.cancelTxt}>Anulează</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────
//  LegendRow animat
// ─────────────────────────────────────────────────────
function LegendRow({ label, desc, minutes, percent, isMax, delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, delay, duration: 320, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }] }}>
      <View style={[legS.row, isMax && legS.rowMax]}>
        <View style={[legS.dot, { backgroundColor: isMax ? T.accent : T.primaryDark }]} />
        <View style={legS.info}>
          <Text style={legS.label}>{label}</Text>
          <Text style={legS.desc}>{desc}</Text>
        </View>
        <View style={legS.right}>
          <Text style={[legS.minutes, isMax && { color: T.accent }]}>{minutes} min</Text>
          <Text style={legS.percent}>{percent}%</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────
//  Ecran principal
// ─────────────────────────────────────────────────────
export default function RpmReportScreen({ route }) {
  const navigation = useNavigation();
  const { top }    = useSafeAreaInsets();
  const { token }  = useAuth();
  const params = route?.params || {};

  // Vehicul selectat (iniția din params dacă vine din TripsScreen)
  const [selImei,  setSelImei]  = useState(params.imei  || null);
  const [selPlate, setSelPlate] = useState(params.plate || null);

  // Lista flotei + modal selector
  const [devices,      setDevices]      = useState([]);
  const [showVehicles, setShowVehicles] = useState(false);

  // Date selectate
  const [startD, setStartD] = useState(firstOfMonthParts());
  const [endD,   setEndD]   = useState(todayParts());

  // Picker modal state
  const [pickerFor,   setPickerFor]   = useState(null);
  const [pickerDraft, setPickerDraft] = useState(null);

  // Date raport
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [exporting, setExporting] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // Fetch lista flotei
  useEffect(() => {
    fetch(`${API_BASE_URL}/devices`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setDevices(j.data);
          // Dacă nu avem vehicul selectat, alegem primul din flotă
          if (!selImei && j.data.length > 0) {
            setSelImei(j.data[0].imei);
            setSelPlate(j.data[0].vehicle?.licensePlate || j.data[0].imei);
          }
        }
      })
      .catch(() => {});
  }, [token]);

  // ── Fetch raport ──────────────────────────────────────
  // TODO: conectare backend
  // Endpoint: GET /devices/{imei}/trips/rpm-report?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
  // Răspuns: { success, classes:[{label,desc,minutes,percent}], totalMinutes, tripCount }
  // Când backend-ul este gata:
  //   1. Șterge blocul "MOCK" de mai jos
  //   2. Decomentează blocul "REAL" de sub el
  const loadData = useCallback(async () => {
    if (!selImei) { Alert.alert('Atenție', 'Selectează mai întâi un vehicul.'); return; }
    setLoading(true);
    setData(null);
    try {
      const resp = await fetch(
        `${API_BASE_URL}/devices/${selImei}/trips/rpm-report` +
        `?startDate=${dateToIso(startD)}&endDate=${dateToIso(endD)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await resp.json();
      if (!json.success) throw new Error(json.error || 'Eroare server');
      setData(json);
    } catch (e) {
      Alert.alert('Eroare', e.message);
    } finally {
      setLoading(false);
    }
  }, [startD, endD, selImei, token]);

  // ── Export PDF ────────────────────────────────────────
  const exportPDF = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const plate    = selPlate || selImei || '—';
      const maxMin   = Math.max(...data.classes.map(c => c.minutes), 1);
      const totalH   = Math.floor(data.totalMinutes / 60);
      const totalMin = Math.round(data.totalMinutes % 60);

      // SVG bar chart — fiabil în PDF
      const BAR_W   = 60;
      const BAR_GAP = 18;
      const CHART_H = 200;
      const SVG_W   = data.classes.length * (BAR_W + BAR_GAP) + BAR_GAP;

      const svgBars = data.classes.map((c, i) => {
        const barH  = Math.round((c.minutes / maxMin) * (CHART_H - 40));
        const x     = BAR_GAP + i * (BAR_W + BAR_GAP);
        const y     = CHART_H - 30 - barH;
        // Culoare gradată: clasele mai mici = violet, mai mari = roșu
        const ratio = i / (data.classes.length - 1);
        const r     = Math.round(123 + ratio * (248 - 123));
        const g     = Math.round(47  + ratio * (113 - 47));
        const b     = Math.round(190 + ratio * (113 - 190));
        const color = `rgb(${r},${g},${b})`;
        return `
          <rect x="${x}" y="${y}" width="${BAR_W}" height="${barH}"
                rx="6" fill="${color}" opacity="0.9"/>
          <text x="${x + BAR_W / 2}" y="${y - 6}" text-anchor="middle"
                font-size="11" fill="#c084fc" font-weight="bold">${c.minutes}</text>
          <text x="${x + BAR_W / 2}" y="${CHART_H - 10}" text-anchor="middle"
                font-size="10" fill="#888">C${i}</text>`;
      }).join('');

      const legendRows = data.classes.map((c, i) => `
        <tr style="background:${i % 2 === 0 ? '#f9f6ff' : '#ffffff'}">
          <td style="padding:8px 12px;font-weight:700;color:#1a0b3e;">${c.label}</td>
          <td style="padding:8px 12px;color:#555;">${c.desc}</td>
          <td style="padding:8px 12px;font-weight:700;color:#7b2fbe;text-align:right;">${c.minutes} min</td>
          <td style="padding:8px 12px;color:#888;text-align:right;">${c.percent}%</td>
          <td style="padding:8px 12px;width:160px;">
            <div style="background:#ede9fe;border-radius:4px;overflow:hidden;height:16px;">
              <div style="width:${Math.round((c.minutes / maxMin) * 100)}%;background:linear-gradient(90deg,#7b2fbe,#a855f7);height:16px;border-radius:4px;min-width:2px;"></div>
            </div>
          </td>
        </tr>`).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; background: #fff; color: #111; padding: 28px; }
          .header { background: linear-gradient(135deg,#1a0b3e,#5b1f8a); border-radius: 14px;
                    padding: 24px 28px; color: #fff; margin-bottom: 24px; }
          .badge  { display: inline-block; background: rgba(168,85,247,0.25); border: 1px solid rgba(168,85,247,0.5);
                    border-radius: 20px; padding: 3px 12px; font-size: 11px; letter-spacing: 1px;
                    color: #c084fc; font-weight: 800; margin-bottom: 10px; }
          .plate  { font-size: 28px; font-weight: 900; letter-spacing: 3px; margin-bottom: 10px; }
          .meta   { display: flex; gap: 20px; flex-wrap: wrap; }
          .meta span { font-size: 12px; color: rgba(192,132,252,0.8); }
          .section-title { color: #7b2fbe; font-size: 15px; font-weight: 700;
                           margin: 20px 0 10px; border-left: 4px solid #a855f7;
                           padding-left: 10px; }
          .summary { display: flex; gap: 14px; margin-bottom: 20px; }
          .scard  { background: #f3e8ff; border-radius: 10px; padding: 12px 18px; flex: 1; text-align: center; }
          .scard .val { font-size: 20px; font-weight: 800; color: #7b2fbe; display: block; }
          .scard .lbl { font-size: 11px; color: #888; display: block; margin-top: 2px; }
          table   { width: 100%; border-collapse: collapse; font-size: 13px; }
          th      { background: #1a0b3e; color: #c084fc; padding: 8px 12px; text-align: left;
                    font-size: 11px; letter-spacing: 0.5px; }
          .footer { margin-top: 32px; text-align: center; color: #aaa; font-size: 11px; }
          svg     { display: block; margin: 0 auto; }
        </style></head><body>

        <div class="header">
          <div class="badge">📊 RAPORT TURAȚII MOTOR</div>
          <div class="plate">${plate || '—'}</div>
          <div class="meta">
            <span>📅 ${dateLabel(startD)} – ${dateLabel(endD)}</span>
            <span>🏁 ${data.tripCount || 0} curse analizate</span>
            <span>⏱ ${totalH}h ${totalMin}min timp motor</span>
          </div>
        </div>

        <div class="summary">
          <div class="scard"><span class="val">${totalH}h ${totalMin}min</span><span class="lbl">Timp total motor</span></div>
          <div class="scard"><span class="val">${data.tripCount || 0}</span><span class="lbl">Curse analizate</span></div>
          <div class="scard"><span class="val">${data.classes.reduce((s, c) => s + c.minutes, 0)} min</span><span class="lbl">Total minute date</span></div>
        </div>

        <div class="section-title">Histogramă distribuție RPM</div>
        <svg width="${SVG_W}" height="${CHART_H}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${SVG_W}" height="${CHART_H}" fill="#faf5ff" rx="8"/>
          ${svgBars}
        </svg>

        <div class="section-title">Detaliu clase turații</div>
        <table>
          <tr>
            <th>Clasă</th><th>Interval RPM</th>
            <th style="text-align:right">Minute</th>
            <th style="text-align:right">Procent</th>
            <th>Distribuție</th>
          </tr>
          ${legendRows}
        </table>

        <p class="footer">
          Fleet Telemetry · Universitatea Politehnica Timișoara · Generat: ${new Date().toLocaleString('ro-RO')}
        </p>
        </body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Raport RPM · ${plate || imei}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (e) {
      Alert.alert('Eroare export', e.message);
    } finally {
      setExporting(false);
    }
  };

  // ── Derivate grafic ───────────────────────────────────
  const chartLabels = data ? data.classes.map(c => c.label.replace('Clasa ', 'C')) : [];
  const chartValues = data ? data.classes.map(c => c.minutes || 0)                 : [];
  const maxMinutes  = data ? Math.max(...chartValues, 1)                            : 1;
  const maxIdx      = data ? chartValues.indexOf(maxMinutes)                        : -1;

  const CHART_CONFIG = {
    backgroundGradientFrom: T.bgCard,
    backgroundGradientTo:   T.bgCard2,
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity:   0,
    color:      (opacity = 1) => `rgba(168, 85, 247, ${opacity})`,
    labelColor: ()            => 'rgba(192,132,252,0.75)',
    barPercentage: 0.65,
    decimalPlaces: 0,
    propsForBackgroundLines: { stroke: 'transparent' },
    propsForLabels:          { fontSize: 11, fontWeight: '600' },
  };

  // ── Render ────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Modal selector vehicul */}
      <VehiclePickerModal
        visible={showVehicles}
        devices={devices}
        selectedImei={selImei}
        onSelect={d => {
          setSelImei(d.imei);
          setSelPlate(d.vehicle?.licensePlate || d.imei);
          setShowVehicles(false);
          setData(null);
        }}
        onCancel={() => setShowVehicles(false)}
      />

      {/* Modal selector date */}
      <DatePickerModal
        visible={!!pickerFor}
        title={pickerFor === 'start' ? 'Data de început' : 'Data de sfârșit'}
        initial={pickerDraft || startD}
        onConfirm={v => {
          if (pickerFor === 'start') setStartD(v);
          else                       setEndD(v);
          setPickerFor(null);
          setData(null);
        }}
        onCancel={() => setPickerFor(null)}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Header vehicul ── */}
        <Animated.View style={{ opacity: headerAnim }}>
          <LinearGradient colors={['#0E0428', '#1C0D40', T.bg]} style={[s.header, { paddingTop: top + 52 }]}>
            <View style={s.circle1} /><View style={s.circle2} />
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Ionicons name="chevron-back" size={26} color={T.white} />
            </TouchableOpacity>
            <View style={s.headerInner}>
              <View style={s.headerBadge}>
                <Text style={s.headerBadgeTxt}>📊 RAPORT TURAȚII</Text>
              </View>

              {/* Buton selector mașină */}
              <TouchableOpacity
                style={s.vehicleSelector}
                onPress={() => setShowVehicles(true)}
                activeOpacity={0.8}
              >
                <Text style={s.headerPlate}>{selPlate || '— —'}</Text>
                <View style={s.changeBadge}>
                  <Ionicons name="swap-horizontal" size={14} color={T.accent} />
                  <Text style={s.changeTxt}>schimbă</Text>
                </View>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Selector interval date ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Interval analiză</Text>

          <View style={s.dateRow}>
            {/* Buton De la */}
            <TouchableOpacity
              style={s.datePill}
              onPress={() => { setPickerDraft(startD); setPickerFor('start'); }}
              activeOpacity={0.75}
            >
              <Ionicons name="calendar-outline" size={14} color={T.accent} />
              <View style={{ marginLeft: 8 }}>
                <Text style={s.datePillLabel}>De la</Text>
                <Text style={s.datePillValue}>{dateLabel(startD)}</Text>
              </View>
              <Ionicons name="chevron-down" size={14} color={T.muted} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            <View style={s.dateArrow}>
              <Ionicons name="arrow-forward" size={16} color={T.muted} />
            </View>

            {/* Buton Până la */}
            <TouchableOpacity
              style={s.datePill}
              onPress={() => { setPickerDraft(endD); setPickerFor('end'); }}
              activeOpacity={0.75}
            >
              <Ionicons name="calendar-outline" size={14} color={T.accent} />
              <View style={{ marginLeft: 8 }}>
                <Text style={s.datePillLabel}>Până la</Text>
                <Text style={s.datePillValue}>{dateLabel(endD)}</Text>
              </View>
              <Ionicons name="chevron-down" size={14} color={T.muted} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>

          {/* Buton Generează */}
          <TouchableOpacity
            style={[s.generateBtn, loading && { opacity: 0.6 }]}
            onPress={loadData}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient colors={T.grad} style={s.generateGrad}>
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="bar-chart" size={16} color="#fff" />}
              <Text style={s.generateTxt}>
                {loading ? 'Se generează...' : 'Generează Raport'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Conținut raport (apare după generare) ── */}
        {data && (
          <>
            {/* Grafic */}
            <View style={s.card}>
              <View style={s.cardTitleRow}>
                <Text style={s.cardTitle}>Distribuție turații (min / clasă)</Text>
                {/* Buton PDF */}
                <TouchableOpacity
                  style={[s.pdfBtn, exporting && { opacity: 0.6 }]}
                  onPress={exportPDF}
                  disabled={exporting}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={['#5B1F8A', '#7B2FBE']} style={s.pdfGrad}>
                    {exporting
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Ionicons name="download-outline" size={14} color="#fff" />}
                    <Text style={s.pdfTxt}>{exporting ? '...' : 'PDF'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <Text style={s.cardSub}>
                {dateLabel(startD)} – {dateLabel(endD)} · {data.tripCount || 0} curse
              </Text>

              <View style={s.chartWrap}>
                <BarChart
                  data={{ labels: chartLabels, datasets: [{ data: chartValues }] }}
                  width={CHART_W - 16}
                  height={210}
                  chartConfig={CHART_CONFIG}
                  style={s.chart}
                  showValuesOnTopOfBars
                  withInnerLines={false}
                  fromZero
                  flatColor
                />
              </View>
            </View>

            {/* Sumar 3 carduri */}
            <View style={s.summaryRow}>
              <LinearGradient colors={[T.bgCard2, T.bgCard3]} style={s.summaryCard}>
                <Text style={s.summaryVal}>{formatDuration(data.totalMinutes)}</Text>
                <Text style={s.summaryLbl}>Timp motor</Text>
              </LinearGradient>
              <LinearGradient colors={[T.bgCard2, T.bgCard3]} style={s.summaryCard}>
                <Text style={[s.summaryVal, { color: T.accent }]}>{data.tripCount || 0}</Text>
                <Text style={s.summaryLbl}>Curse</Text>
              </LinearGradient>
              <LinearGradient colors={[T.bgCard2, T.bgCard3]} style={s.summaryCard}>
                <Text style={[s.summaryVal, { color: T.green }]}>{data.classes.length}</Text>
                <Text style={s.summaryLbl}>Clase RPM</Text>
              </LinearGradient>
            </View>

            {/* Legendă */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Legendă clase turații</Text>
              {data.classes.map((cls, i) => (
                <LegendRow
                  key={cls.label}
                  label={cls.label}
                  desc={cls.desc}
                  minutes={cls.minutes}
                  percent={cls.percent}
                  isMax={i === maxIdx}
                  delay={i * 55}
                />
              ))}
            </View>

            {/* Insight clasă dominantă */}
            {maxIdx >= 0 && (
              <View style={[s.card, { marginTop: 14 }]}>
                <View style={s.insightRow}>
                  <Text style={{ fontSize: 22, marginTop: 2 }}>💡</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.insightTitle}>Clasă dominantă</Text>
                    <Text style={s.insightBody}>
                      Vehiculul a petrecut cel mai mult timp în{' '}
                      <Text style={{ color: T.accent, fontWeight: '700' }}>
                        {data.classes[maxIdx]?.label}
                      </Text>{' '}
                      ({data.classes[maxIdx]?.desc}) — {data.classes[maxIdx]?.minutes} min
                      ({data.classes[maxIdx]?.percent}% din total).
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* Placeholder înainte de generare */}
        {!data && !loading && (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>📊</Text>
            <Text style={s.emptyTxt}>Selectează intervalul și apasă{'\n'}"Generează Raport"</Text>
          </View>
        )}

        <Text style={s.footer}>
          Fleet Telemetry · Universitatea Politehnica Timișoara · {new Date().getFullYear()}
        </Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────
//  Stiluri ecran
// ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll:  { paddingBottom: 20 },

  // Header
  header: {
    paddingBottom: 32, paddingHorizontal: 24,
    overflow: 'hidden', position: 'relative',
  },
  backBtn: { marginBottom: 8 },
  circle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: T.accent, opacity: 0.06, top: -50, right: -40,
  },
  circle2: {
    position: 'absolute', width: 90, height: 90, borderRadius: 45,
    backgroundColor: T.primary, opacity: 0.08, top: 20, right: 80,
  },
  headerInner:    { position: 'relative', zIndex: 1 },
  headerBadge:    {
    alignSelf: 'flex-start', backgroundColor: 'rgba(168,85,247,0.15)',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.35)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 10,
  },
  headerBadgeTxt: { color: T.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  headerPlate:    { color: T.white, fontSize: 30, fontWeight: '900', letterSpacing: 2 },
  vehicleSelector: { marginTop: 4 },
  changeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  changeTxt: { color: T.accent, fontSize: 11, fontWeight: '700' },

  // Card
  card: {
    backgroundColor: 'rgba(25, 12, 55, 0.55)',
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.15)',
    ...SHADOW,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardTitle:    { color: T.white, fontSize: 14, fontWeight: '700', flex: 1 },
  cardSub:      { color: T.muted, fontSize: 11, marginBottom: 14 },

  // Selector date
  dateRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 14 },
  datePill:      {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(123,47,190,0.12)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.25)',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  datePillLabel: { color: T.muted, fontSize: 10, marginBottom: 2 },
  datePillValue: { color: T.white, fontSize: 12, fontWeight: '700' },
  dateArrow:     { paddingHorizontal: 4 },

  // Buton generează
  generateBtn:  { borderRadius: 14, overflow: 'hidden' },
  generateGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13,
  },
  generateTxt:  { color: T.white, fontSize: 14, fontWeight: '700' },

  // PDF
  pdfBtn:  { borderRadius: 10, overflow: 'hidden' },
  pdfGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  pdfTxt:  { color: T.white, fontSize: 12, fontWeight: '700' },

  // Grafic
  chartWrap: { borderRadius: 14, overflow: 'hidden' },
  chart:     { borderRadius: 14 },

  // Sumar
  summaryRow:  { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, gap: 10 },
  summaryCard: {
    flex: 1, borderRadius: 16, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.15)', ...SHADOW,
  },
  summaryVal:  { color: T.white, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  summaryLbl:  { color: T.muted, fontSize: 10, textAlign: 'center' },

  // Insight
  insightRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  insightTitle: { color: T.accent2, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  insightBody:  { color: T.muted, fontSize: 13, lineHeight: 20 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon:  { fontSize: 48, marginBottom: 14 },
  emptyTxt:   { color: T.muted, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  footer: {
    color: T.muted2, fontSize: 11, textAlign: 'center', marginTop: 24, marginHorizontal: 16,
  },
});

// ─────────────────────────────────────────────────────
//  Stiluri legendă
// ─────────────────────────────────────────────────────
const legS = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: 'rgba(123,47,190,0.1)',
  },
  rowMax: {
    backgroundColor: 'rgba(168,85,247,0.08)',
    borderRadius: 10, marginHorizontal: -8, paddingHorizontal: 12,
  },
  dot:     { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  info:    { flex: 1 },
  label:   { color: T.white, fontSize: 13, fontWeight: '700' },
  desc:    { color: T.muted, fontSize: 11, marginTop: 1 },
  right:   { alignItems: 'flex-end' },
  minutes: { color: T.white, fontSize: 15, fontWeight: '800' },
  percent: { color: T.muted, fontSize: 11, marginTop: 1 },
});

// ─────────────────────────────────────────────────────
//  Stiluri vehicle picker modal
// ─────────────────────────────────────────────────────
const vp = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet:  { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', ...SHADOW },
  inner:  { paddingHorizontal: 20, paddingBottom: 36, paddingTop: 16 },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', marginBottom: 16,
  },
  title:  { color: T.white, fontSize: 16, fontWeight: '800', marginBottom: 16, textAlign: 'center' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 14, marginBottom: 6,
    backgroundColor: 'rgba(123,47,190,0.08)',
    borderWidth: 1, borderColor: 'transparent',
  },
  rowActive: {
    borderColor: 'rgba(168,85,247,0.4)',
    backgroundColor: 'rgba(168,85,247,0.12)',
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  plate:   { color: T.white, fontSize: 15, fontWeight: '800' },
  model:   { color: T.muted, fontSize: 12, marginTop: 2 },
  onlineDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: T.green, marginLeft: 4,
  },
  cancelBtn: {
    marginTop: 12, paddingVertical: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: T.border,
    alignItems: 'center',
  },
  cancelTxt: { color: T.muted, fontWeight: '700', fontSize: 14 },
});

// ─────────────────────────────────────────────────────
//  Stiluri date picker modal
// ─────────────────────────────────────────────────────
const pk = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 24,
  },
  sheet:      { width: '100%', borderRadius: 24, overflow: 'hidden', ...SHADOW },
  sheetInner: { padding: 24 },
  title:      { color: T.white, fontSize: 16, fontWeight: '800', marginBottom: 24, textAlign: 'center' },

  spinnersRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spinnerCol:  { flex: 1, alignItems: 'center', gap: 6 },
  sep:         { width: 1, height: 80, backgroundColor: T.border, marginHorizontal: 8 },

  arrow:    {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(168,85,247,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  valueBox: {
    backgroundColor: 'rgba(123,47,190,0.2)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
    minWidth: 80, alignItems: 'center',
  },
  valueTxt: { color: T.white, fontSize: 14, fontWeight: '800', textAlign: 'center' },

  preview: {
    marginTop: 20, alignItems: 'center',
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderRadius: 12, paddingVertical: 10,
  },
  previewTxt: { color: T.accent, fontSize: 15, fontWeight: '700' },

  btnRow:       { flexDirection: 'row', gap: 12, marginTop: 20 },
  btnCancel:    {
    flex: 1, paddingVertical: 13, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: T.border,
    alignItems: 'center',
  },
  btnCancelTxt: { color: T.muted, fontWeight: '700', fontSize: 14 },
  btnConfirm:   { flex: 1, borderRadius: 14, overflow: 'hidden' },
  btnGrad:      { paddingVertical: 13, alignItems: 'center' },
  btnConfirmTxt:{ color: T.white, fontWeight: '800', fontSize: 14 },
});
