/**
 * ─────────────────────────────────────────────────────
 *  MainMenuScreen — Ecran principal simplu
 *  3 carduri mari: Flota mea · Hartă · Contul meu
 * ─────────────────────────────────────────────────────
 */

import { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, SHADOW } from '../theme';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const MENU_ITEMS = [
  {
    id: 'fleet',
    icon: 'car-sport',
    label: 'Flota mea',
    sublabel: 'Mașini, mentenanță, detalii',
    colors: ['#1C0D40', '#2D1260'],
    accentColor: T.accent,
    tabName: 'Flotă',
    borderColor: 'rgba(168,85,247,0.3)',
  },
  {
    id: 'map',
    icon: 'map',
    label: 'Hartă Live',
    sublabel: 'Urmărire în timp real',
    colors: ['#0D2010', '#1A3A20'],
    accentColor: T.green,
    tabName: 'Hartă',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  {
    id: 'account',
    icon: 'person-circle',
    label: 'Contul meu',
    sublabel: 'Setări și profil',
    colors: ['#1A0D30', '#2A1450'],
    accentColor: T.accent2,
    tabName: 'Account',
    borderColor: 'rgba(192,132,252,0.3)',
  },
];

function MenuCard({ item, onPress, index }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, styles.cardWrap]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={item.colors}
          style={[styles.card, { borderColor: item.borderColor }]}
        >
          {/* Icon container cu glow */}
          <View style={[styles.iconBg, { backgroundColor: item.accentColor + '18', borderColor: item.accentColor + '33' }]}>
            <Ionicons name={item.icon} size={36} color={item.accentColor} />
          </View>

          {/* Text */}
          <View style={styles.cardText}>
            <Text style={[styles.cardLabel, { color: item.accentColor }]}>{item.label}</Text>
            <Text style={styles.cardSub}>{item.sublabel}</Text>
          </View>

          {/* Arrow */}
          <View style={[styles.arrow, { backgroundColor: item.accentColor + '18', borderColor: item.accentColor + '33' }]}>
            <Ionicons name="chevron-forward" size={20} color={item.accentColor} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function MainMenuScreen() {
  const navigation  = useNavigation();
  const { user }    = useAuth();
  const { top }     = useSafeAreaInsets();
  // toggle pill = ~38px + 4px paddingTop → lăsăm 16px extra respiro
  const headerPad   = top + 38 + 4 + 16;

  const handlePress = (item) => {
    if (item.id === 'account') {
      navigation.navigate('Flotă', { screen: 'Account' });
    } else {
      navigation.navigate(item.tabName);
    }
  };

  return (
    <LinearGradient colors={[T.bg, '#0F0328']} style={styles.container}>
      {/* Header — paddingTop dinamic sub toggle pill */}
      <LinearGradient colors={['#1A0B3E', '#0E0428']} style={[styles.header, { paddingTop: headerPad }]}>
        <View style={styles.headerBadge}>
          <View style={styles.dot} />
          <Text style={styles.headerBadgeText}>LIVE</Text>
        </View>
        <Text style={styles.title}>Fleet Telemetry</Text>
        <Text style={styles.welcome}>
          Bun venit, {user?.name?.split(' ')[0] || 'utilizator'} 👋
        </Text>
      </LinearGradient>

      {/* Cards */}
      <View style={styles.cards}>
        {MENU_ITEMS.map((item, index) => (
          <MenuCard
            key={item.id}
            item={item}
            index={index}
            onPress={() => handlePress(item)}
          />
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Fleet Telemetry · Universitatea Politehnica Timișoara</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 0,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
    marginBottom: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.green,
  },
  headerBadgeText: {
    color: T.green,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    color: T.white,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  welcome: {
    color: T.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  cards: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    justifyContent: 'center',
    gap: 14,
  },
  cardWrap: {
    width: '100%',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    gap: 16,
    ...SHADOW,
  },
  iconBg: {
    width: 66,
    height: 66,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSub: {
    color: 'rgba(192,132,252,0.5)',
    fontSize: 13,
    fontWeight: '400',
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingBottom: 110,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(192,132,252,0.25)',
    fontSize: 11,
  },
});
