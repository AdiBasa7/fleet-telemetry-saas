/**
 * ─────────────────────────────────────────────────────
 *  DiagnosticsScreen (CanTelemetryScreen)
 *  · Stare curentă vehicul (CAN bus)
 *  · Curse înregistrate cu date CAN și histogramă RPM
 * ─────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Modal,
  TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons }       from '@expo/vector-icons';
import { API_BASE_URL, POLLING_INTERVAL_MS } from '../config';
import { useAuth }        from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, SHADOW }      from '../theme';

// ─── Selector vehicul ─────────────────────────────────────────
function VehiclePickerModal({ visible, devices, selectedImei, onSelect, onCancel }) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onCancel}>
      <View style={vp.overlay}>
        <View style={vp.sheet}>
          <LinearGradient colors={['#0D2010', '#1A3A20']} style={vp.inner}>
            <View style={vp.handle} />
            <Text style={vp.title}>Selectează vehiculul</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {devices.map(d => {
                const plate  = d.vehicle?.licensePlate || d.imei;
                const model  = [d.vehicle?.make, d.vehicle?.model]
                  .filter(v => v && v !== 'Necunoscut').join(' ') || 'Necunoscut';
                const active = d.imei === selectedImei;
                return (
                  <TouchableOpacity
                    key={d.imei}
                    style={[vp.row, active && vp.rowActive]}
                    onPress={() => onSelect(d)}
                    activeOpacity={0.75}
                  >
                    <View style={[vp.iconBox, { backgroundColor: active ? T.green + '33' : 'rgba(16,185,129,0.08)' }]}>
                      <Text style={{ fontSize: 20 }}>🚗</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[vp.plate, active && { color: T.green }]}>{plate}</Text>
                      <Text style={vp.model}>{model}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={22} color={T.green} />}
                    {d.isConnected && <View style={vp.onlineDot} />}
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

// ─── Bara combustibil ─────────────────────────────────────────
function FuelBar({ pct, tankL }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct / 100, duration: 700, useNativeDriver: false }).start();
  }, [pct]);
  const fuelColor = pct < 10 ? T.red : pct < 25 ? T.orange : T.green;
  const liters    = tankL ? ((pct / 100) * tankL).toFixed(1) : null;
  return (
    <View>
      <View style={fb.header}>
        <Text style={fb.label}>Nivel combustibil</Text>
        <Text style={[fb.pct, { color: fuelColor }]}>{pct}%{liters ? `  ·  ${liters} L` : ''}</Text>
      </View>
      <View style={fb.track}>
        <Animated.View style={[fb.fill, {
          backgroundColor: fuelColor,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }]} />
      </View>
      <View style={fb.ticks}>
        {[0, 25, 50, 75, 100].map(t => <Text key={t} style={fb.tick}>{t}%</Text>)}
      </View>
    </View>
  );
}

// ─── Mini gauge temperatură ───────────────────────────────────
function TempGauge({ label, value, maxSafe, icon }) {
  if (value == null) return null;
  const ratio     = Math.min(value / (maxSafe * 1.2), 1);
  const tempColor = value > maxSafe * 1.05 ? T.red : value > maxSafe * 0.95 ? T.orange : T.green;
  return (
    <View style={tg.card}>
      <Text style={tg.icon}>{icon}</Text>
      <Text style={[tg.value, { color: tempColor }]}>{value}°C</Text>
      <Text style={tg.label}>{label}</Text>
      <View style={tg.track}>
        <View style={[tg.fill, { width: `${ratio * 100}%`, backgroundColor: tempColor }]} />
      </View>
      <Text style={[tg.status, { color: tempColor }]}>
        {value > maxSafe * 1.05 ? 'RIDICATĂ' : value > maxSafe * 0.95 ? 'LIMITĂ' : value < 40 ? 'Rece' : 'Normal'}
      </Text>
    </View>
  );
}

// ─── Grid uși ─────────────────────────────────────────────────
function DoorsGrid({ doorFl, doorFr, doorRl, doorRr, trunk, hood }) {
  const Door = ({ label, open, pos }) => (
    <View style={[dg.cell, pos]}>
      <Ionicons name={open ? 'car' : 'car-outline'} size={18} color={open ? T.orange : T.green} />
      <Text style={[dg.label, { color: open ? T.orange : T.muted }]}>{label}</Text>
      <Text style={[dg.status, { color: open ? T.orange : T.green }]}>{open ? 'Deschisă' : 'Închisă'}</Text>
    </View>
  );
  return (
    <View style={dg.wrap}>
      <View style={dg.car}>
        <Door label="F. Stg." open={doorFl === 1} pos={{ top: 0,    left: 0  }} />
        <Door label="F. Dr."  open={doorFr === 1} pos={{ top: 0,    right: 0 }} />
        <View style={dg.body} />
        <Door label="S. Stg." open={doorRl === 1} pos={{ bottom: 0, left: 0  }} />
        <Door label="S. Dr."  open={doorRr === 1} pos={{ bottom: 0, right: 0 }} />
      </View>
      {(trunk != null || hood != null) && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          {trunk != null && (
            <View style={[dg.extra, { flex: 1 }]}>
              <Ionicons name={trunk ? 'lock-open-outline' : 'lock-closed-outline'} size={16} color={trunk ? T.orange : T.green} />
              <Text style={[dg.label, { color: trunk ? T.orange : T.muted }]}>Portbagaj</Text>
              <Text style={[dg.status, { color: trunk ? T.orange : T.green }]}>{trunk ? 'Deschis' : 'Închis'}</Text>
            </View>
          )}
          {hood != null && (
            <View style={[dg.extra, { flex: 1 }]}>
              <Ionicons name={hood ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={16} color={hood ? T.orange : T.green} />
              <Text style={[dg.label, { color: hood ? T.orange : T.muted }]}>Capotă</Text>
              <Text style={[dg.status, { color: hood ? T.orange : T.green }]}>{hood ? 'Deschisă' : 'Închisă'}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Mini RPM Histogram (bara simpla per clasă) ───────────────
function RpmHistogramMini({ histogram }) {
  if (!histogram || histogram.length === 0) return null;
  const max = Math.max(...histogram.map(c => c.percent || 0), 1);
  const COLORS = ['#6b7280','#3b82f6','#10b981','#f59e0b','#f97316','#ef4444','#7c3aed'];
  return (
    <View style={rh.wrap}>
      <Text style={rh.title}>Distribuție turații (RPM)</Text>
      {histogram.map((cls, i) => (
        <View key={i} style={rh.row}>
          <Text style={rh.cls}>{cls.label}</Text>
          <View style={rh.barBg}>
            <View style={[rh.barFill, { width: `${(cls.percent / max) * 100}%`, backgroundColor: COLORS[i] }]} />
          </View>
          <Text style={rh.pct}>{cls.percent?.toFixed(0)}%</Text>
          <Text style={rh.min}>{cls.minutes?.toFixed(0)}min</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Card cursă ───────────────────────────────────────────────
function TripCard({ trip }) {
  const [expanded, setExpanded] = useState(false);
  const cs = trip.canSummary || {};

  const startDt  = new Date(trip.startTime);
  const dateStr  = startDt.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr  = startDt.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  const dur      = trip.durationMin || 0;
  const durStr   = dur >= 60 ? `${Math.floor(dur/60)}h ${dur%60}min` : `${dur}min`;
  const hasRpm   = trip.rpmHistogram?.length > 0;
  const hasCan   = cs.fuelLevelPctStart != null || cs.avgCoolantTempC != null || cs.avgRpm != null;

  return (
    <View style={tc.card}>
      <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
        <View style={tc.header}>
          <View style={tc.iconWrap}>
            <Ionicons name="car-sport-outline" size={22} color={T.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={tc.date}>{dateStr}  {timeStr}</Text>
            <Text style={tc.addr} numberOfLines={1}>
              {trip.startAddress || 'Locație necunoscută'}
            </Text>
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={T.muted2} />
        </View>

        {/* Statistici rapide */}
        <View style={tc.stats}>
          <View style={tc.stat}>
            <Ionicons name="time-outline" size={13} color={T.muted2} />
            <Text style={tc.statVal}>{durStr}</Text>
          </View>
          <View style={tc.stat}>
            <Ionicons name="navigate-outline" size={13} color={T.muted2} />
            <Text style={tc.statVal}>{(trip.distanceKm || 0).toFixed(1)} km</Text>
          </View>
          <View style={tc.stat}>
            <Ionicons name="speedometer-outline" size={13} color={T.muted2} />
            <Text style={tc.statVal}>{trip.maxSpeedKmh || 0} km/h max</Text>
          </View>
          {cs.fuelConsumedPct != null && (
            <View style={tc.stat}>
              <Text style={{ fontSize: 11 }}>⛽</Text>
              <Text style={tc.statVal}>-{cs.fuelConsumedPct}%</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Detalii expandate */}
      {expanded && (
        <View style={tc.detail}>
          {hasCan && (
            <View style={tc.canRow}>
              {cs.fuelLevelPctStart != null && (
                <View style={tc.canCell}>
                  <Text style={tc.canLabel}>Combustibil la start</Text>
                  <Text style={tc.canVal}>{cs.fuelLevelPctStart}%</Text>
                </View>
              )}
              {cs.fuelLevelPctEnd != null && (
                <View style={tc.canCell}>
                  <Text style={tc.canLabel}>Combustibil la final</Text>
                  <Text style={tc.canVal}>{cs.fuelLevelPctEnd}%</Text>
                </View>
              )}
              {cs.avgCoolantTempC != null && (
                <View style={tc.canCell}>
                  <Text style={tc.canLabel}>Temp. medie răcire</Text>
                  <Text style={[tc.canVal, { color: cs.avgCoolantTempC > 100 ? T.red : T.green }]}>
                    {cs.avgCoolantTempC}°C
                  </Text>
                </View>
              )}
              {cs.maxCoolantTempC != null && (
                <View style={tc.canCell}>
                  <Text style={tc.canLabel}>Temp. max răcire</Text>
                  <Text style={[tc.canVal, { color: cs.maxCoolantTempC > 105 ? T.red : T.orange }]}>
                    {cs.maxCoolantTempC}°C
                  </Text>
                </View>
              )}
              {cs.avgRpm != null && (
                <View style={tc.canCell}>
                  <Text style={tc.canLabel}>RPM mediu</Text>
                  <Text style={tc.canVal}>{cs.avgRpm}</Text>
                </View>
              )}
              {cs.maxRpm != null && (
                <View style={tc.canCell}>
                  <Text style={tc.canLabel}>RPM maxim</Text>
                  <Text style={[tc.canVal, { color: cs.maxRpm > 4000 ? T.red : T.orange }]}>
                    {cs.maxRpm}
                  </Text>
                </View>
              )}
              {cs.odometerStartM != null && cs.odometerEndM != null && (
                <View style={tc.canCell}>
                  <Text style={tc.canLabel}>Odometru parcurs</Text>
                  <Text style={tc.canVal}>
                    {((cs.odometerEndM - cs.odometerStartM) / 1000).toFixed(1)} km
                  </Text>
                </View>
              )}
            </View>
          )}

          {hasRpm && <RpmHistogramMini histogram={trip.rpmHistogram} />}

          {trip.endAddress && (
            <View style={tc.addrRow}>
              <Ionicons name="flag-outline" size={13} color={T.muted2} />
              <Text style={tc.addrTxt} numberOfLines={2}>Destinație: {trip.endAddress}</Text>
            </View>
          )}

          {/* Conducere agresivă */}
          {(trip.harshAccelCount + trip.harshBrakingCount + trip.harshCorneringCount > 0) && (
            <View style={tc.eventsRow}>
              {trip.harshAccelCount > 0 && (
                <View style={tc.eventBadge}>
                  <Text style={tc.eventTxt}>🚀 {trip.harshAccelCount} accelerări bruște</Text>
                </View>
              )}
              {trip.harshBrakingCount > 0 && (
                <View style={tc.eventBadge}>
                  <Text style={tc.eventTxt}>🛑 {trip.harshBrakingCount} frânări bruște</Text>
                </View>
              )}
              {trip.harshCorneringCount > 0 && (
                <View style={tc.eventBadge}>
                  <Text style={tc.eventTxt}>↩️ {trip.harshCorneringCount} viraje bruște</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Screen principal ─────────────────────────────────────────
export default function CanTelemetryScreen({ route }) {
  const { top }    = useSafeAreaInsets();
  const diagTopPad = top + 38 + 20;
  const { token }              = useAuth();
  const [devices,  setDevices]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [canData,  setCanData]  = useState(null);
  const [trips,    setTrips]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [picker,   setPicker]   = useState(false);
  const [lastUpd,  setLastUpd]  = useState(null);
  const [section,  setSection]  = useState('state'); // 'state' | 'trips'

  // Fetch dispozitive
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API_BASE_URL}/devices`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json.success && json.data.length > 0) {
          setDevices(json.data);
          setSelected(json.data[0]);
        }
      } catch {}
    })();
  }, []);

  // Fetch stare curentă CAN
  const fetchCan = async (dev = selected) => {
    if (!dev) return;
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/devices/${dev.imei}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        const can = json.data.lastCanData || {};
        setCanData(can);
        if (can.updatedAt) setLastUpd(new Date(can.updatedAt));
        setSelected(prev => ({ ...prev, ...json.data }));
      }
    } catch {}
    finally { setLoading(false); }
  };

  // Fetch curse istorice
  const fetchTrips = async (dev = selected) => {
    if (!dev) return;
    setTripsLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/devices/${dev.imei}/trips?limit=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setTrips(json.data || []);
    } catch {}
    finally { setTripsLoading(false); }
  };

  // Polling + Socket.IO
  useEffect(() => {
    if (!selected) return;
    fetchCan(selected);
    fetchTrips(selected);
    const iv = setInterval(() => fetchCan(selected), POLLING_INTERVAL_MS);

    const prevHandler = global.onDeviceUpdate;
    global.onDeviceUpdate = (data) => {
      if (prevHandler) prevHandler(data);
      if (data.imei === selected.imei && data.can) {
        setCanData(prev => {
          const merged = { ...(prev || {}) };
          Object.entries(data.can).forEach(([k, v]) => { if (v !== null) merged[k] = v; });
          return merged;
        });
        setLastUpd(new Date());
      }
      // Dacă un trip s-a terminat, reîncărcăm lista
      if (data.imei === selected.imei && data.type === 'trip_ended') {
        fetchTrips(selected);
      }
    };

    return () => {
      clearInterval(iv);
      global.onDeviceUpdate = prevHandler;
    };
  }, [selected?.imei]);

  const hasCan = canData && (
    canData.fuel_level_pct != null || canData.odometer_m != null ||
    canData.coolant_temp_c != null || canData.oil_temp_c != null ||
    canData.engine_rpm     != null || canData.can_speed  != null
  );

  const hasDoors = canData && (
    canData.door_fl != null || canData.door_fr != null ||
    canData.door_rl != null || canData.door_rr != null
  );

  const plate     = selected?.vehicle?.licensePlate || selected?.imei || '—';
  const makeModel = [selected?.vehicle?.make, selected?.vehicle?.model]
    .filter(v => v && v !== 'Necunoscut').join(' ') || '';

  return (
    <LinearGradient colors={[T.bg, '#071A0E']} style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Header vehicul ── */}
        <LinearGradient colors={['#0D2010', '#1A3A20']} style={[s.header, { paddingTop: diagTopPad }]}>
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.plate}>{plate}</Text>
              {makeModel ? <Text style={s.makeModel}>{makeModel}</Text> : null}
            </View>
            <TouchableOpacity style={s.changeBtn} onPress={() => setPicker(true)}>
              <Ionicons name="swap-horizontal" size={14} color={T.green} />
              <Text style={s.changeTxt}>schimbă</Text>
            </TouchableOpacity>
          </View>
          <View style={s.statusRow}>
            <View style={[s.dot, { backgroundColor: selected?.isConnected ? T.green : T.red }]} />
            <Text style={[s.statusTxt, { color: selected?.isConnected ? T.green : T.red }]}>
              {selected?.isConnected ? 'Online' : 'Offline'}
            </Text>
            {lastUpd && (
              <Text style={s.updTxt}>· actualizat {lastUpd.toLocaleTimeString('ro-RO')}</Text>
            )}
          </View>
        </LinearGradient>

        {/* ── Tab selector ── */}
        <View style={s.tabs}>
          <TouchableOpacity
            style={[s.tab, section === 'state' && s.tabActive]}
            onPress={() => setSection('state')}
          >
            <Ionicons name="pulse-outline" size={15} color={section === 'state' ? T.green : T.muted} />
            <Text style={[s.tabTxt, section === 'state' && { color: T.green }]}>Stare vehicul</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, section === 'trips' && s.tabActive]}
            onPress={() => { setSection('trips'); fetchTrips(selected); }}
          >
            <Ionicons name="map-outline" size={15} color={section === 'trips' ? T.green : T.muted} />
            <Text style={[s.tabTxt, section === 'trips' && { color: T.green }]}>
              Curse{trips.length > 0 ? ` (${trips.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ════════ TAB: STARE CURENTĂ ════════ */}
        {section === 'state' && (
          <>
            {loading && !hasCan && (
              <View style={s.centered}>
                <ActivityIndicator color={T.green} size="large" />
                <Text style={s.loadTxt}>Se încarcă datele...</Text>
              </View>
            )}

            {!loading && !hasCan && (
              <View style={s.centered}>
                <Text style={{ fontSize: 52 }}>📡</Text>
                <Text style={s.noDataTitle}>Nicio dată CAN disponibilă</Text>
                <Text style={s.noDataSub}>
                  Pornește motorul și asigură-te că LV-CAN200 este conectat.{'\n'}
                  Datele apar automat după primul pachet.
                </Text>
              </View>
            )}

            {hasCan && (
              <>
                {canData.fuel_level_pct != null && (
                  <View style={s.card}>
                    <Text style={s.cardTitle}>⛽ Combustibil</Text>
                    <FuelBar pct={canData.fuel_level_pct} tankL={selected?.tankCapacityL} />
                    {canData.fuel_level_pct < 10 && (
                      <View style={s.alertBanner}>
                        <Text style={s.alertTxt}>⚠️ Combustibil critic — alimentează cât mai curând!</Text>
                      </View>
                    )}
                  </View>
                )}

                {canData.odometer_m != null && (
                  <View style={s.card}>
                    <Text style={s.cardTitle}>🛣️ Odometru total</Text>
                    <Text style={s.bigVal}>
                      {(canData.odometer_m / 1000).toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                    </Text>
                    <Text style={s.bigUnit}>km parcurși</Text>
                  </View>
                )}

                {(canData.coolant_temp_c != null || canData.oil_temp_c != null) && (
                  <View style={s.card}>
                    <Text style={s.cardTitle}>🌡️ Temperaturi motor</Text>
                    <View style={s.gaugeRow}>
                      <TempGauge label="Lichid răcire" value={canData.coolant_temp_c} maxSafe={100} icon="💧" />
                      <TempGauge label="Ulei motor"    value={canData.oil_temp_c}     maxSafe={130} icon="🛢️" />
                    </View>
                    {(canData.coolant_temp_c != null && canData.coolant_temp_c > 105) && (
                      <View style={s.alertBanner}>
                        <Text style={s.alertTxt}>🔴 Supraîncălzire răcire — oprește motorul!</Text>
                      </View>
                    )}
                  </View>
                )}

                {(canData.can_speed != null || canData.engine_rpm != null) && (
                  <View style={s.card}>
                    <Text style={s.cardTitle}>⚙️ Motor</Text>
                    <View style={s.gaugeRow}>
                      {canData.can_speed != null && (
                        <View style={[tg.card, { flex: 1 }]}>
                          <Text style={tg.icon}>🏎️</Text>
                          <Text style={[tg.value, { color: canData.can_speed > 120 ? T.red : canData.can_speed > 80 ? T.orange : T.green }]}>
                            {canData.can_speed}
                          </Text>
                          <Text style={tg.label}>km/h (CAN)</Text>
                        </View>
                      )}
                      {canData.engine_rpm != null && (
                        <View style={[tg.card, { flex: 1 }]}>
                          <Text style={tg.icon}>⚙️</Text>
                          <Text style={[tg.value, { color: canData.engine_rpm > 3000 ? T.red : canData.engine_rpm > 2000 ? T.orange : T.green }]}>
                            {canData.engine_rpm.toLocaleString('ro-RO')}
                          </Text>
                          <Text style={tg.label}>RPM</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {canData.dtc_code != null && canData.dtc_code !== 0 && (
                  <View style={s.card}>
                    <Text style={s.cardTitle}>🔧 Eroare OBD (DTC)</Text>
                    <View style={s.alertBanner}>
                      <Text style={s.alertTxt}>⚠️ Cod DTC activ: {canData.dtc_code}</Text>
                    </View>
                    <Text style={[s.noDataSub, { marginTop: 8 }]}>
                      Conectează un cititor OBD2 pentru detalii complete.
                    </Text>
                  </View>
                )}

                {hasDoors && (
                  <View style={s.card}>
                    <Text style={s.cardTitle}>🚪 Stare uși</Text>
                    <DoorsGrid
                      doorFl={canData.door_fl}
                      doorFr={canData.door_fr}
                      doorRl={canData.door_rl}
                      doorRr={canData.door_rr}
                      trunk={canData.trunk_open}
                      hood={canData.hood_open}
                    />
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* ════════ TAB: CURSE ════════ */}
        {section === 'trips' && (
          <>
            {tripsLoading && (
              <View style={s.centered}>
                <ActivityIndicator color={T.green} size="large" />
                <Text style={s.loadTxt}>Se încarcă cursele...</Text>
              </View>
            )}

            {!tripsLoading && trips.length === 0 && (
              <View style={s.centered}>
                <Text style={{ fontSize: 52 }}>🗺️</Text>
                <Text style={s.noDataTitle}>Nicio cursă înregistrată</Text>
                <Text style={s.noDataSub}>
                  Cursele se înregistrează automat când pornești motorul.{'\n'}
                  Datele RPM se salvează la finalul fiecărei curse pentru raportul de turații.
                </Text>
              </View>
            )}

            {!tripsLoading && trips.length > 0 && (
              <>
                <View style={s.tripsHeader}>
                  <Text style={s.tripsTitle}>
                    {trips.length} {trips.length === 1 ? 'cursă' : 'curse'} înregistrate
                  </Text>
                  <Text style={s.tripsSub}>Ating o cursă pentru detalii și distribuția RPM</Text>
                </View>
                {trips.map(trip => (
                  <TripCard key={trip._id} trip={trip} />
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <VehiclePickerModal
        visible={picker}
        devices={devices}
        selectedImei={selected?.imei}
        onSelect={dev => { setSelected(dev); setCanData(null); setTrips([]); setPicker(false); }}
        onCancel={() => setPicker(false)}
      />
    </LinearGradient>
  );
}

// ── Stiluri principale ────────────────────────────────────────
const s = StyleSheet.create({
  scroll:      { paddingBottom: 20 },
  header:      { padding: 20, paddingTop: 24, paddingBottom: 16 },
  headerRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  plate:       { color: T.white, fontSize: 26, fontWeight: 'bold', letterSpacing: 1 },
  makeModel:   { color: T.muted, fontSize: 13, marginTop: 2 },
  changeBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.green + '22', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: T.green + '44' },
  changeTxt:   { color: T.green, fontSize: 12, fontWeight: '600' },
  statusRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:         { width: 7, height: 7, borderRadius: 4 },
  statusTxt:   { fontSize: 12, fontWeight: '600' },
  updTxt:      { fontSize: 11, color: T.muted2 },

  tabs:        { flexDirection: 'row', margin: 16, marginBottom: 0, gap: 8 },
  tab:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  tabActive:   { backgroundColor: T.green + '18', borderColor: T.green + '44' },
  tabTxt:      { color: T.muted, fontSize: 13, fontWeight: '600' },

  card:        { backgroundColor: 'rgba(13,32,16,0.7)', margin: 16, marginBottom: 0, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', ...SHADOW },
  cardTitle:   { color: T.white, fontSize: 14, fontWeight: 'bold', marginBottom: 14 },
  gaugeRow:    { flexDirection: 'row', gap: 12 },
  bigVal:      { color: T.green, fontSize: 42, fontWeight: 'bold', textAlign: 'center', marginTop: 4 },
  bigUnit:     { color: T.muted, fontSize: 13, textAlign: 'center', marginTop: 2 },
  alertBanner: { backgroundColor: T.red + '22', borderRadius: 10, padding: 10, marginTop: 12, borderWidth: 1, borderColor: T.red + '44' },
  alertTxt:    { color: T.red, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  centered:    { padding: 40, alignItems: 'center' },
  loadTxt:     { color: T.green, marginTop: 12, fontSize: 14 },
  noDataTitle: { color: T.white, fontSize: 17, fontWeight: 'bold', marginTop: 12, textAlign: 'center' },
  noDataSub:   { color: T.muted, fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 20 },

  tripsHeader: { marginHorizontal: 16, marginTop: 16, marginBottom: 4 },
  tripsTitle:  { color: T.white, fontSize: 15, fontWeight: 'bold' },
  tripsSub:    { color: T.muted, fontSize: 12, marginTop: 3 },
});

const fb = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label:  { color: T.muted, fontSize: 13 },
  pct:    { fontSize: 15, fontWeight: 'bold' },
  track:  { height: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden' },
  fill:   { height: 12, borderRadius: 6 },
  ticks:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  tick:   { color: T.muted2, fontSize: 9 },
});

const tg = StyleSheet.create({
  card:   { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  icon:   { fontSize: 22 },
  value:  { fontSize: 28, fontWeight: 'bold' },
  label:  { color: T.muted, fontSize: 12, textAlign: 'center' },
  track:  { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  fill:   { height: 6, borderRadius: 3 },
  status: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});

const dg = StyleSheet.create({
  wrap:  { alignItems: 'center' },
  car:   { width: 220, height: 160, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  body:  { width: 70, height: 100, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' },
  cell:  { position: 'absolute', alignItems: 'center', width: 68 },
  extra: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10 },
  label: { fontSize: 11, marginTop: 3, color: T.muted },
  status:{ fontSize: 10, fontWeight: '600' },
});

const tc = StyleSheet.create({
  card:      { backgroundColor: 'rgba(13,32,16,0.7)', marginHorizontal: 16, marginTop: 10, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(16,185,129,0.15)', overflow: 'hidden', ...SHADOW },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  iconWrap:  { width: 40, height: 40, borderRadius: 12, backgroundColor: T.green + '18', alignItems: 'center', justifyContent: 'center' },
  date:      { color: T.white, fontWeight: '700', fontSize: 14 },
  addr:      { color: T.muted, fontSize: 12, marginTop: 2 },
  stats:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
  stat:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statVal:   { color: T.muted, fontSize: 12 },
  detail:    { borderTopWidth: 1, borderTopColor: 'rgba(16,185,129,0.12)', padding: 14, gap: 12 },
  canRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  canCell:   { minWidth: '45%', flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10 },
  canLabel:  { color: T.muted2, fontSize: 11 },
  canVal:    { color: T.white, fontSize: 18, fontWeight: 'bold', marginTop: 2 },
  addrRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  addrTxt:   { color: T.muted, fontSize: 12, flex: 1 },
  eventsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  eventBadge:{ backgroundColor: T.orange + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: T.orange + '33' },
  eventTxt:  { color: T.orange, fontSize: 11 },
});

const rh = StyleSheet.create({
  wrap:   { gap: 6 },
  title:  { color: T.white, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  row:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cls:    { color: T.muted2, fontSize: 11, width: 52 },
  barBg:  { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' },
  barFill:{ height: 8, borderRadius: 4 },
  pct:    { color: T.white, fontSize: 11, fontWeight: '600', width: 32, textAlign: 'right' },
  min:    { color: T.muted2, fontSize: 10, width: 36, textAlign: 'right' },
});

const vp = StyleSheet.create({
  overlay:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  inner:     { padding: 20, paddingBottom: 36 },
  handle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: T.green + '55', alignSelf: 'center', marginBottom: 16 },
  title:     { color: T.white, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, marginBottom: 8, backgroundColor: 'rgba(16,185,129,0.06)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.1)' },
  rowActive: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: T.green + '55' },
  iconBox:   { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  plate:     { color: T.white, fontWeight: '700', fontSize: 15 },
  model:     { color: T.muted, fontSize: 12, marginTop: 2 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.green },
  cancelBtn: { marginTop: 8, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  cancelTxt: { color: T.muted, fontWeight: '600', fontSize: 15 },
});
