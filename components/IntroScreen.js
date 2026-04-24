/**
 * IntroScreen — 2 secunde splash cu video + text "FLEET"
 */
import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

const { width: W, height: H } = Dimensions.get('window');

export default function IntroScreen({ onDone }) {
  // Animații
  const logoOpacity   = useRef(new Animated.Value(0)).current;
  const logoScale     = useRef(new Animated.Value(0.6)).current;
  const subOpacity    = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Logo apare cu scale-up
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1, duration: 600, useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1, speed: 8, bounciness: 6, useNativeDriver: true,
      }),
    ]).start(() => {
      // 2. Subtitlu apare
      Animated.timing(subOpacity, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }).start(() => {
        // 3. Așteptăm puțin, apoi fade-out tot ecranul
        setTimeout(() => {
          Animated.timing(screenOpacity, {
            toValue: 0, duration: 500, useNativeDriver: true,
          }).start(() => onDone());
        }, 900);
      });
    });
  }, []);

  return (
    <Animated.View style={[s.container, { opacity: screenOpacity }]}>
      {/* Video full-screen */}
      <Video
        source={require('../assets/bg-car.mp4')}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted
        shouldPlay
      />

      {/* Overlay întunecat */}
      <View style={s.overlay} />

      {/* Logo centrat */}
      <Animated.View style={[s.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        {/* Linie decorativă stânga */}
        <View style={s.line} />

        <View style={s.textWrap}>
          <Text style={s.fleet}>FLEET</Text>
          <Animated.Text style={[s.sub, { opacity: subOpacity }]}>
            TELEMETRY
          </Animated.Text>
        </View>

        {/* Linie decorativă dreapta */}
        <View style={s.line} />
      </Animated.View>

      {/* Glow spot sub text */}
      <Animated.View style={[s.glow, { opacity: logoOpacity }]} />

      {/* Universitatea jos */}
      <Animated.Text style={[s.footer, { opacity: subOpacity }]}>
        Universitatea Politehnica Timișoara
      </Animated.Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 1, 15, 0.72)',
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           18,
  },
  line: {
    width:           48,
    height:          1.5,
    backgroundColor: '#FF5E00',
    opacity:         0.8,
  },
  textWrap: {
    alignItems: 'center',
  },
  fleet: {
    fontSize:      64,
    fontWeight:    '900',
    color:         '#FFFFFF',
    letterSpacing: 14,
    textShadowColor:  '#FF5E00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  sub: {
    fontSize:      13,
    fontWeight:    '600',
    color:         '#FF5E00',
    letterSpacing: 8,
    marginTop:     4,
  },
  glow: {
    position:        'absolute',
    width:           280,
    height:          80,
    borderRadius:    140,
    backgroundColor: '#FF5E00',
    opacity:         0.12,
    top:             H / 2 + 30,
  },
  footer: {
    position:      'absolute',
    bottom:        48,
    color:         'rgba(255,255,255,0.4)',
    fontSize:      11,
    letterSpacing: 2,
    fontWeight:    '500',
  },
});
