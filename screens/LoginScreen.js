import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { T } from '../theme';

Dimensions.get('window'); // păstrat pentru compatibilitate viitoare

export default function LoginScreen({ navigation }) {
  const { login }   = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.spring(logoAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.spring(formAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Atenție', 'Completează email-ul și parola.'); return;
    }
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const json = await res.json();
      if (json.success) await login(json.accessToken, json.refreshToken, json.user);
      else Alert.alert('Autentificare eșuată', json.error);
    } catch {
      Alert.alert('Eroare rețea', 'Nu mă pot conecta la server.');
    } finally { setLoading(false); }
  };

  return (
    <LinearGradient colors={[T.bg, '#1A0B3E', T.bg]} style={{ flex: 1 }}>
      {/* Cercuri decorative */}
      <View style={[s.circle, { width: 300, height: 300, top: -100, right: -80, opacity: 0.07 }]} />
      <View style={[s.circle, { width: 180, height: 180, top: 100, left: -60, opacity: 0.05 }]} />
      <View style={[s.circle, { width: 220, height: 220, bottom: -60, right: -40, opacity: 0.06 }]} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <Animated.View style={[s.logoWrap, { opacity: logoAnim, transform: [{ translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] }]}>
            <LinearGradient colors={[T.primary, T.accent]} style={s.logoBg}>
              <Text style={s.logoEmoji}>🛰️</Text>
            </LinearGradient>
            <Text style={s.title}>Fleet Telemetry</Text>
            <Text style={s.subtitle}>Universitatea Politehnica Timișoara</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View style={[{ opacity: formAnim, transform: [{ translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
            <View style={s.form}>
              <Text style={s.label}>Email</Text>
              <TextInput style={s.input} value={email} onChangeText={setEmail}
                placeholder="email@exemplu.com" placeholderTextColor={T.muted}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />

              <Text style={s.label}>Parolă</Text>
              <TextInput style={s.input} value={password} onChangeText={setPassword}
                placeholder="Parola ta" placeholderTextColor={T.muted} secureTextEntry />

              <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
                <LinearGradient colors={T.grad} style={s.btnGrad}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.btnTxt}>Intră în cont</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={s.link} onPress={() => navigation.navigate('Register')}>
                <Text style={s.linkTxt}>Nu ai cont? <Text style={s.linkBold}>Creează unul</Text></Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  scroll:    { flexGrow: 1, justifyContent: 'center', padding: 24 },
  circle:    { position: 'absolute', borderRadius: 999, backgroundColor: T.accent },
  logoWrap:  { alignItems: 'center', marginBottom: 36 },
  logoBg:    { width: 88, height: 88, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: T.primary, shadowOpacity: 0.6, shadowRadius: 20, elevation: 12 },
  logoEmoji: { fontSize: 44 },
  title:     { color: T.white, fontSize: 26, fontWeight: 'bold', letterSpacing: 0.5 },
  subtitle:  { color: T.muted, fontSize: 13, marginTop: 4 },
  form:      { backgroundColor: 'rgba(17,6,38,0.9)', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: T.border },
  label:     { color: T.muted, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 14 },
  input:     { backgroundColor: T.bgCard2, borderRadius: 12, padding: 14, fontSize: 15, color: T.white, borderWidth: 1, borderColor: T.border },
  btn:       { borderRadius: 14, overflow: 'hidden', marginTop: 24 },
  btnGrad:   { padding: 16, alignItems: 'center' },
  btnTxt:    { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  link:      { alignItems: 'center', marginTop: 18 },
  linkTxt:   { color: T.muted, fontSize: 14 },
  linkBold:  { color: T.accent, fontWeight: 'bold' },
});
