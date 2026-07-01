import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { T, SHADOW } from '../theme';

function getInitials(name = '') {
  const p = name.trim().split(' ');
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function StatCard({ value, label, color, icon }) {
  return (
    <LinearGradient colors={[T.bgCard2, T.bgCard]} style={s.statCard}>
      <View style={[s.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[s.statVal, { color }]}>{value}</Text>
      <Text style={s.statLbl}>{label}</Text>
    </LinearGradient>
  );
}

function InfoRow({ icon, iconColor, label, value, last }) {
  return (
    <View style={[s.row, !last && s.rowBorder]}>
      <View style={[s.rowIcon, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={s.rowContent}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowValue}>{value ?? '—'}</Text>
      </View>
    </View>
  );
}

export default function AccountScreen() {
  const navigation              = useNavigation();
  const { top }                 = useSafeAreaInsets();
  const { user, token, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.14, duration: 1500, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 1500, useNativeDriver: true }),
    ])).start();
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/devices`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(j => {
        if (j.success) {
          const d = j.data;
          setStats({ total: d.length, active: d.filter(x => x.lastPosition?.ignition === 1).length, online: d.filter(x => x.isConnected).length, blocked: d.filter(x => x.killSwitchActive).length });
        }
      }).catch(() => {});
  }, [token]);

  const handleLogout = () => Alert.alert('Deconectare', 'Ești sigur că vrei să ieși din cont?', [
    { text: 'Anulează', style: 'cancel' },
    { text: 'Da, ieși', style: 'destructive', onPress: logout },
  ]);

  const initials = getInitials(user?.name || '');
  const isOwner  = user?.role === 'owner';
  const roleColor = isOwner ? T.gold : T.accent;
  const roleLabel = isOwner ? 'Proprietar Flotă' : 'Administrator';

  return (
    <LinearGradient colors={[T.bg, '#0F0328']} style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Hero */}
        <LinearGradient colors={['#1A0B3E', '#0E0428']} style={[s.hero, { paddingTop: top + 52 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={26} color={T.white} />
          </TouchableOpacity>
          <View style={[s.decoCircle, { width: 240, height: 240, top: -90, right: -70 }]} />
          <View style={[s.decoCircle, { width: 120, height: 120, top: 30, right: 90, opacity: 0.04 }]} />

          <View style={s.avatarWrap}>
            <Animated.View style={[s.avatarRing, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient colors={T.grad} style={s.avatarRingGrad} />
            </Animated.View>
            <LinearGradient colors={T.grad} style={s.avatar}>
              <Text style={s.avatarTxt}>{initials}</Text>
            </LinearGradient>
          </View>

          <Text style={s.heroName}>{user?.name}</Text>
          <Text style={s.heroEmail}>{user?.email}</Text>
          <View style={[s.roleBadge, { borderColor: roleColor }]}>
            <Ionicons name={isOwner ? 'shield-checkmark' : 'settings'} size={13} color={roleColor} />
            <Text style={[s.roleTxt, { color: roleColor }]}>{roleLabel}</Text>
          </View>
        </LinearGradient>

        {/* Stats */}
        {stats && (
          <View style={s.section}>
            <Text style={s.sectionLbl}>STATISTICI FLOTĂ</Text>
            <View style={s.statsGrid}>
              <StatCard value={stats.total}   label="Total"   color={T.accent}  icon="car" />
              <StatCard value={stats.active}  label="Active"  color={T.green}   icon="flash" />
              <StatCard value={stats.online}  label="Online"  color={T.primaryLight || '#9D50D4'} icon="wifi" />
              <StatCard value={stats.blocked} label="Blocate" color={T.red}     icon="lock-closed" />
            </View>
          </View>
        )}

        {/* Info cont */}
        <View style={s.section}>
          <Text style={s.sectionLbl}>INFORMAȚII CONT</Text>
          <View style={s.card}>
            <InfoRow icon="person-circle-outline"   iconColor={T.accent}   label="Nume complet" value={user?.name} />
            <InfoRow icon="mail-outline"             iconColor={T.primaryLight || '#9D50D4'} label="Email" value={user?.email} />
            <InfoRow icon="shield-checkmark-outline" iconColor={roleColor}  label="Rol"         value={roleLabel} last />
          </View>
        </View>

        {/* Aplicație */}
        <View style={s.section}>
          <Text style={s.sectionLbl}>APLICAȚIE</Text>
          <View style={s.card}>
            <InfoRow icon="phone-portrait-outline" iconColor={T.accent2}  label="Versiune"     value="1.0.0 · Poli Timișoara" />
            <InfoRow icon="server-outline"         iconColor={T.orange}   label="Server IoT"   value="FMC130 · TCP :5027" />
            <InfoRow icon="globe-outline"          iconColor={T.green}    label="Bază de date" value="MongoDB Atlas" last />
          </View>
        </View>

        {/* Logout */}
        <View style={s.section}>
          <TouchableOpacity onPress={handleLogout} activeOpacity={0.85}>
            <LinearGradient colors={['#2D0A0A', '#4A1515']} style={s.logoutBtn}>
              <View style={s.logoutIcon}>
                <Ionicons name="log-out-outline" size={20} color={T.red} />
              </View>
              <Text style={s.logoutTxt}>Deconectare</Text>
              <Ionicons name="chevron-forward" size={18} color={T.red + '88'} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>Fleet Telemetry · Universitatea Politehnica Timișoara · 2025</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  hero:        { alignItems: 'center', paddingBottom: 32, paddingHorizontal: 24, overflow: 'hidden', position: 'relative' },
  backBtn:     { position: 'absolute', top: 16, left: 16 },
  decoCircle:  { position: 'absolute', borderRadius: 999, backgroundColor: T.accent, opacity: 0.07 },
  avatarWrap:  { alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarRing:  { position: 'absolute', width: 104, height: 104, borderRadius: 52 },
  avatarRingGrad: { width: 104, height: 104, borderRadius: 52, opacity: 0.22 },
  avatar:      { width: 86, height: 86, borderRadius: 43, justifyContent: 'center', alignItems: 'center', ...SHADOW },
  avatarTxt:   { fontSize: 30, fontWeight: 'bold', color: '#fff', letterSpacing: 1 },
  heroName:    { color: T.white, fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  heroEmail:   { color: T.muted, fontSize: 13, marginBottom: 14 },
  roleBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  roleTxt:     { fontSize: 13, fontWeight: '700' },

  section:     { paddingHorizontal: 16, paddingTop: 24 },
  sectionLbl:  { fontSize: 11, fontWeight: '700', color: T.muted, letterSpacing: 1.5, marginBottom: 10 },
  statsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard:    { flex: 1, minWidth: '44%', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: T.border, ...SHADOW },
  statIcon:    { borderRadius: 10, padding: 8, marginBottom: 8 },
  statVal:     { fontSize: 26, fontWeight: 'bold' },
  statLbl:     { fontSize: 11, color: T.muted, marginTop: 2 },

  card:        { backgroundColor: T.bgCard, borderRadius: 18, borderWidth: 1, borderColor: T.border, overflow: 'hidden', ...SHADOW },
  row:         { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder:   { borderBottomWidth: 1, borderBottomColor: T.border },
  rowIcon:     { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowContent:  { flex: 1 },
  rowLabel:    { fontSize: 11, color: T.muted, fontWeight: '600', marginBottom: 2 },
  rowValue:    { fontSize: 14, color: T.white, fontWeight: '600' },

  logoutBtn:   { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 16, gap: 14, borderWidth: 1, borderColor: T.red + '33' },
  logoutIcon:  { width: 36, height: 36, borderRadius: 10, backgroundColor: T.red + '18', justifyContent: 'center', alignItems: 'center' },
  logoutTxt:   { flex: 1, color: T.red, fontSize: 16, fontWeight: 'bold' },
  footer:      { textAlign: 'center', color: T.muted2, fontSize: 11, marginTop: 32, paddingHorizontal: 24 },
});
