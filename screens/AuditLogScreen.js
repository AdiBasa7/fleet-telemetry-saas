/**
 * ─────────────────────────────────────────────────────
 *  AuditLogScreen — Jurnal de activitate
 * ─────────────────────────────────────────────────────
 *  Afișează toate acțiunile efectuate de utilizator:
 *  creare/ștergere șoferi, modificare vehicule,
 *  geofence, mentenanță, killswitch, login.
 *
 *  Funcționalități:
 *  - Filtrare după tip entitate (chipuri)
 *  - Paginare infinită (load more)
 *  - Pull-to-refresh
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { T, SHADOW } from '../theme';

// ── Configurare vizuală per entitate ─────────────────
const ENTITY_CONFIG = {
  Auth:        { icon: 'person-circle-outline', color: T.accent,  label: 'Auth'       },
  Driver:      { icon: 'person-outline',        color: T.green,   label: 'Șofer'      },
  Vehicle:     { icon: 'car-outline',           color: T.primary, label: 'Vehicul'    },
  Geofence:    { icon: 'location-outline',      color: T.gold,    label: 'Geofence'   },
  Maintenance: { icon: 'construct-outline',     color: T.orange,  label: 'Mentenanță' },
};

// ── Configurare vizuală per acțiune ──────────────────
const ACTION_CONFIG = {
  LOGIN:            { label: 'Autentificare',      color: T.green  },
  REGISTER:         { label: 'Înregistrare cont',  color: T.accent },
  CREATE:           { label: 'Adăugat',            color: T.green  },
  UPDATE:           { label: 'Modificat',          color: T.gold   },
  DELETE:           { label: 'Șters',              color: T.red    },
  KILLSWITCH_ON:    { label: 'Kill switch ON',     color: T.red    },
  KILLSWITCH_OFF:   { label: 'Kill switch OFF',    color: T.green  },
  MAINTENANCE_DONE: { label: 'Rezolvat',           color: T.green  },
};

const FILTERS = [
  { key: null,          label: 'Toate'      },
  { key: 'Driver',      label: 'Șoferi'     },
  { key: 'Vehicle',     label: 'Vehicule'   },
  { key: 'Geofence',    label: 'Geofence'   },
  { key: 'Maintenance', label: 'Mentenanță' },
  { key: 'Auth',        label: 'Auth'       },
];

function formatDate(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AuditItem({ item }) {
  const entity = ENTITY_CONFIG[item.entity] || { icon: 'ellipse-outline', color: T.muted, label: item.entity };
  const action = ACTION_CONFIG[item.action] || { label: item.action, color: T.muted };

  return (
    <View style={s.item}>
      <View style={[s.iconWrap, { backgroundColor: entity.color + '20' }]}>
        <Ionicons name={entity.icon} size={20} color={entity.color} />
      </View>
      <View style={s.itemBody}>
        <View style={s.itemHeader}>
          <Text style={[s.actionBadge, { color: action.color, borderColor: action.color + '50' }]}>
            {action.label}
          </Text>
          <Text style={s.entityLabel}>{entity.label}</Text>
        </View>
        {!!item.entityLabel && (
          <Text style={s.resourceLabel} numberOfLines={1}>{item.entityLabel}</Text>
        )}
        <Text style={s.timestamp}>{formatDate(item.createdAt)}</Text>
      </View>
    </View>
  );
}

function FilterChip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[s.chip, active && s.chipActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AuditLogScreen() {
  const { token } = useAuth();
  const [entries, setEntries]     = useState([]);
  const [filter, setFilter]       = useState(null);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotal]    = useState(1);
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefresh]  = useState(false);
  const [loadingMore, setLoadMore]= useState(false);

  const fetchEntries = useCallback(async (pageNum = 1, entityFilter = filter, replace = true) => {
    if (replace) setLoading(true);
    else setLoadMore(true);
    try {
      const params = new URLSearchParams({ page: pageNum, limit: 30 });
      if (entityFilter) params.append('entity', entityFilter);

      const res  = await fetch(`${API_BASE_URL}/audit?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setEntries(prev => replace ? json.data : [...prev, ...json.data]);
      setTotal(json.pages);
      setPage(pageNum);
    } catch (err) {
      if (__DEV__) console.error('AuditLog fetch:', err.message);
    } finally {
      setLoading(false);
      setLoadMore(false);
      setRefresh(false);
    }
  }, [token, filter]);

  useEffect(() => { fetchEntries(1, filter, true); }, [filter]);

  const onRefresh = () => {
    setRefresh(true);
    fetchEntries(1, filter, true);
  };

  const onLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    fetchEntries(page + 1, filter, false);
  };

  const onFilter = (key) => {
    if (key === filter) return;
    setFilter(key);
  };

  return (
    <View style={s.container}>
      {/* Header gradient */}
      <LinearGradient colors={T.grad} style={s.header}>
        <Ionicons name="shield-checkmark-outline" size={22} color={T.white} />
        <Text style={s.headerTitle}>Jurnal de activitate</Text>
      </LinearGradient>

      {/* Filtre */}
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <FilterChip
            key={String(f.key)}
            label={f.label}
            active={filter === f.key}
            onPress={() => onFilter(f.key)}
          />
        ))}
      </View>

      {/* Listă */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={T.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item._id}
          renderItem={({ item }) => <AuditItem item={item} />}
          contentContainerStyle={entries.length === 0 ? s.emptyContainer : s.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />
          }
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Ionicons name="document-text-outline" size={48} color={T.muted} />
              <Text style={s.emptyText}>Nicio activitate înregistrată</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={T.primary} style={{ margin: 16 }} /> : null
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: T.bg },

  header: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
    paddingHorizontal: 20,
    paddingVertical:   16,
  },
  headerTitle: { color: T.white, fontSize: 17, fontWeight: '700' },

  filterRow: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            8,
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical:    6,
    borderRadius:      20,
    borderWidth:        1,
    borderColor:       T.muted2,
    backgroundColor:   T.bgCard,
  },
  chipActive:     { backgroundColor: T.primary, borderColor: T.primary },
  chipText:       { color: T.muted,  fontSize: 13 },
  chipTextActive: { color: T.white,  fontSize: 13, fontWeight: '600' },

  listContent:    { padding: 12, gap: 8 },
  emptyContainer: { flex: 1 },

  item: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    backgroundColor: T.bgCard,
    borderRadius:   14,
    padding:        14,
    gap:            12,
    ...SHADOW,
  },
  iconWrap: {
    width: 40, height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems:     'center',
  },
  itemBody:   { flex: 1 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },

  actionBadge: {
    fontSize:    12,
    fontWeight:  '600',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical:   2,
  },
  entityLabel:   { color: T.muted, fontSize: 12 },
  resourceLabel: { color: T.white, fontSize: 14, fontWeight: '500', marginBottom: 4 },
  timestamp:     { color: T.muted, fontSize: 11 },

  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 80 },
  emptyText:    { color: T.muted, fontSize: 15 },
});
