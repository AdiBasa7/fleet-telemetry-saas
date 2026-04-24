import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { T } from '../theme';

export default function RegisterScreen({ navigation }) {
  const { login }   = useAuth();
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirm) {
      Alert.alert('Atenție', 'Completează toate câmpurile.'); return;
    }
    if (password !== confirm) { Alert.alert('Atenție', 'Parolele nu coincid.'); return; }
    if (password.length < 6) { Alert.alert('Atenție', 'Parola trebuie să aibă cel puțin 6 caractere.'); return; }

    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
      });
      const json = await res.json();
      if (json.success) { await login(json.accessToken, json.refreshToken, json.user); Alert.alert('✅ Cont creat!', json.message); }
      else Alert.alert('Eroare', json.error);
    } catch { Alert.alert('Eroare rețea', 'Nu mă pot conecta la server.'); }
    finally { setLoading(false); }
  };

  const fields = [
    { label: 'Nume complet', val: name,     fn: setName,     ph: 'Ion Popescu',       cap: 'words' },
    { label: 'Email',        val: email,    fn: setEmail,    ph: 'email@exemplu.com', kb: 'email-address', cap: 'none' },
    { label: 'Parolă',       val: password, fn: setPassword, ph: 'Minim 6 caractere', secure: true },
    { label: 'Confirmă',     val: confirm,  fn: setConfirm,  ph: 'Repetă parola',     secure: true },
  ];

  return (
    <LinearGradient colors={[T.bg, '#1A0B3E', T.bg]} style={{ flex: 1 }}>
      <View style={[s.circle, { width: 280, height: 280, top: -80, left: -80 }]} />
      <View style={[s.circle, { width: 200, height: 200, bottom: -40, right: -60 }]} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logoWrap}>
            <LinearGradient colors={T.grad} style={s.logoBg}>
              <Text style={s.logoEmoji}>🛰️</Text>
            </LinearGradient>
            <Text style={s.title}>Cont nou</Text>
            <Text style={s.sub}>Fleet Telemetry · UPT</Text>
          </View>

          <View style={s.form}>
            {fields.map(({ label, val, fn, ph, kb, cap, secure }) => (
              <View key={label}>
                <Text style={s.label}>{label}</Text>
                <TextInput
                  style={s.input} value={val} onChangeText={fn}
                  placeholder={ph} placeholderTextColor={T.muted}
                  keyboardType={kb || 'default'} autoCapitalize={cap || 'sentences'}
                  secureTextEntry={!!secure} autoCorrect={false}
                />
              </View>
            ))}

            <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleRegister} disabled={loading}>
              <LinearGradient colors={T.grad} style={s.btnGrad}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Creează contul</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={s.link} onPress={() => navigation.goBack()}>
              <Text style={s.linkTxt}>Ai deja cont? <Text style={s.linkBold}>Autentifică-te</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  scroll:   { flexGrow: 1, justifyContent: 'center', padding: 24 },
  circle:   { position: 'absolute', borderRadius: 999, backgroundColor: T.accent, opacity: 0.06 },
  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logoBg:   { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 14, shadowColor: T.primary, shadowOpacity: 0.6, shadowRadius: 16, elevation: 10 },
  logoEmoji:{ fontSize: 40 },
  title:    { color: T.white, fontSize: 24, fontWeight: 'bold' },
  sub:      { color: T.muted, fontSize: 12, marginTop: 4 },
  form:     { backgroundColor: 'rgba(17,6,38,0.9)', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: T.border },
  label:    { color: T.muted, fontSize: 13, fontWeight: '600', marginBottom: 7, marginTop: 12 },
  input:    { backgroundColor: T.bgCard2, borderRadius: 12, padding: 13, fontSize: 15, color: T.white, borderWidth: 1, borderColor: T.border },
  btn:      { borderRadius: 14, overflow: 'hidden', marginTop: 22 },
  btnGrad:  { padding: 15, alignItems: 'center' },
  btnTxt:   { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  link:     { alignItems: 'center', marginTop: 16 },
  linkTxt:  { color: T.muted, fontSize: 14 },
  linkBold: { color: T.accent, fontWeight: 'bold' },
});
