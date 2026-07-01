/**
 * ─────────────────────────────────────────────────────
 *  DTCScreen — Coduri DTC Active + Istoric
 *  Fetch din /api/diagnostics/:imei/dtc
 *  Severity badge + descrieri RO/EN + cauze AR159
 * ─────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient }   from 'expo-linear-gradient';
import { Ionicons }         from '@expo/vector-icons';
import { API_BASE_URL }     from '../config';
import { useAuth }          from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, SHADOW }        from '../theme';

const SEV_CONFIG = {
  HIGH:   { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  icon: 'warning',           label: 'CRITIC'  },
  MEDIUM: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'alert-circle',       label: 'MEDIU'   },
  LOW:    { color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: 'information-circle', label: 'SCĂZUT'  },
};

// ─── Card DTC individual ──────────────────────────────────────
function DTCCard({ dtc, onResolve }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEV_CONFIG[dtc.severity] || SEV_CONFIG.LOW;

  return (
    <View style={[dc.card, { borderLeftColor: cfg.color }]}>
      {/* Header */}
      <TouchableOpacity
        style={dc.header}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.75}
      >
        <View style={[dc.sevBadge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={14} color={cfg.color} />
          <Text style={[dc.sevText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <Text style={dc.code}>{dtc.code}</Text>
        <View style={{ flex: 1 }} />
        <Text style={dc.occCount}>×{dtc.occurrenceCount}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(255,255,255,0.35)" />
      </TouchableOpacity>

      {/* Descriere scurta */}
      <Text style={dc.descRo} numberOfLines={expanded ? 0 : 2}>
        {dtc.description_ro}
      </Text>

      {/* Detalii expandate */}
      {expanded && (
        <View style={dc.expanded}>
          <Text style={dc.engLabel}>EN: <Text style={dc.engText}>{dtc.description_en}</Text></Text>

          {dtc.vehicleContext?.engine_rpm != null && (
            <View style={dc.contextRow}>
              <Text style={dc.ctxLabel}>Context la detecție:</Text>
              <Text style={dc.ctxVal}>
                {dtc.vehicleContext.engine_rpm} RPM · {dtc.vehicleContext.speed_kmh ?? '—'} km/h · {dtc.vehicleContext.coolant_temp_c ?? '—'}°C
              </Text>
            </View>
          )}

          <Text style={dc.causesTitle}>Cauze posibile (AR 159 JTDM):</Text>
          {(dtc.causes || []).map((c, i) => (
            <View key={i} style={dc.causeRow}>
              <Text style={dc.causeBullet}>›</Text>
              <Text style={dc.causeText}>{c}</Text>
            </View>
          ))}

          <Text style={dc.firstSeen}>
            Primul aviz: {new Date(dtc.firstSeenAt).toLocaleString('ro-RO')}
          </Text>

          <TouchableOpacity style={dc.resolveBtn} onPress={() => onResolve(dtc._id)}>
            <Ionicons name="checkmark-circle-outline" size={16} color={T.green} />
            <Text style={dc.resolveTxt}>Marchează ca Rezolvat</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
export default function DTCScreen({ route }) {
  const { top }     = useSafeAreaInsets();
  const { token }   = useAuth();
  const imei        = route?.params?.imei;
  const diagTopPad  = top + 38 + 20;
  const [dtcs, setDtcs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL'); // ALL | HIGH | MEDIUM | LOW

  const fetchDTCs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/diagnostics/${imei}/dtc`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setDtcs(json.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [imei, token]);

  useEffect(() => { fetchDTCs(); }, [fetchDTCs]);

  const handleResolve = async (dtcEventId) => {
    try {
      await fetch(`${API_BASE_URL}/diagnostics/${imei}/dtc/${dtcEventId}/resolve`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ resolvedBy: 'user' }),
      });
      fetchDTCs(true);
    } catch {}
  };

  const filtered = filter === 'ALL' ? dtcs : dtcs.filter(d => d.severity === filter);
  const counts   = { HIGH: dtcs.filter(d => d.severity === 'HIGH').length, MEDIUM: dtcs.filter(d => d.severity === 'MEDIUM').length, LOW: dtcs.filter(d => d.severity === 'LOW').length };

  return (
    <LinearGradient colors={['#07010F', '#0F0328']} style={ds.container}>

      {/* Summary bar — cu paddingTop dinamic sub toggle */}
      <View style={[ds.summary, { paddingTop: diagTopPad }]}>
        {[['HIGH', '#EF4444'], ['MEDIUM', '#F59E0B'], ['LOW', '#10B981']].map(([sev, col]) => (
          <TouchableOpacity key={sev} style={[ds.sumBadge, filter === sev && { borderColor: col }]}
            onPress={() => setFilter(f => f === sev ? 'ALL' : sev)}>
            <Text style={[ds.sumCount, { color: col }]}>{counts[sev]}</Text>
            <Text style={ds.sumLabel}>{SEV_CONFIG[sev].label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[ds.sumBadge, filter === 'ALL' && { borderColor: T.accent }]}
          onPress={() => setFilter('ALL')}>
          <Text style={[ds.sumCount, { color: T.accent }]}>{dtcs.length}</Text>
          <Text style={ds.sumLabel}>TOTAL</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={T.accent} style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={ds.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDTCs(true); }} tintColor={T.accent} />}
        >
          {filtered.length === 0 ? (
            <View style={ds.empty}>
              <Ionicons name="checkmark-circle" size={48} color={T.green} />
              <Text style={ds.emptyText}>
                {dtcs.length === 0 ? 'Niciun cod DTC activ' : 'Niciun cod în filtrul selectat'}
              </Text>
            </View>
          ) : (
            filtered.map(dtc => (
              <DTCCard key={dtc._id} dtc={dtc} onResolve={handleResolve} />
            ))
          )}
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const dc = StyleSheet.create({
  card:       { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderLeftWidth: 3 },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sevBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sevText:    { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  code:       { color: '#FFFFFF', fontSize: 16, fontWeight: '800', fontFamily: 'monospace' },
  occCount:   { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginRight: 4 },
  descRo:     { color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 19 },
  expanded:   { marginTop: 12, gap: 8 },
  engLabel:   { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  engText:    { color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' },
  contextRow: { gap: 2 },
  ctxLabel:   { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  ctxVal:     { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  causesTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', marginTop: 4 },
  causeRow:   { flexDirection: 'row', gap: 6 },
  causeBullet: { color: '#F59E0B', fontWeight: '700', fontSize: 14 },
  causeText:  { color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 18, flex: 1 },
  firstSeen:  { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4 },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 10, padding: 10, marginTop: 6, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' },
  resolveTxt: { color: '#10B981', fontWeight: '600', fontSize: 13 },
});

const ds = StyleSheet.create({
  container: { flex: 1 },
  summary:   { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  sumBadge:  { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  sumCount:  { fontSize: 18, fontWeight: '800' },
  sumLabel:  { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  scroll:    { paddingHorizontal: 16, paddingBottom: 32 },
  empty:     { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: 'rgba(255,255,255,0.45)', fontSize: 15 },
});
