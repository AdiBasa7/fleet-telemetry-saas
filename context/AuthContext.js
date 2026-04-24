import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config';

const ACCESS_TOKEN_KEY  = 'fleet_access_token';
const REFRESH_TOKEN_KEY = 'fleet_refresh_token';
// Reîmprospătăm access token-ul cu 60s înainte să expire (TTL = 15min = 900s)
const REFRESH_BEFORE_EXPIRY_MS = 60 * 1000;
const ACCESS_TOKEN_TTL_MS      = 15 * 60 * 1000;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null); // access token curent
  const [loading, setLoading] = useState(true);
  const refreshTimerRef       = useRef(null);

  // ── Programăm auto-refresh cu 60s înainte de expirare ──
  const scheduleRefresh = (currentRefreshToken) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(
      () => doRefresh(currentRefreshToken),
      ACCESS_TOKEN_TTL_MS - REFRESH_BEFORE_EXPIRY_MS
    );
  };

  const doRefresh = async (currentRefreshToken) => {
    try {
      const rt = currentRefreshToken || await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!rt) { await clearSession(); return; }

      const res  = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refreshToken: rt }),
      });
      const json = await res.json();

      if (json.success) {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY,  json.accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, json.refreshToken);
        setToken(json.accessToken);
        scheduleRefresh(json.refreshToken);
      } else {
        await clearSession();
      }
    } catch {
      // Eroare de rețea — păstrăm sesiunea, vom încerca la următoarea acțiune
      if (__DEV__) console.warn('Auto-refresh eșuat (rețea)');
    }
  };

  const clearSession = async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});
    setToken(null);
    setUser(null);
  };

  // ── La startup: validăm access token sau facem refresh ─
  useEffect(() => {
    (async () => {
      try {
        const storedAccess  = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        const storedRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

        if (storedAccess) {
          // Verificăm că access token-ul e încă valid pe backend
          const res  = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${storedAccess}` },
          });
          const json = await res.json();

          if (json.success) {
            setToken(storedAccess);
            setUser(json.user);
            scheduleRefresh(storedRefresh);
          } else if (storedRefresh) {
            // Access token expirat — facem refresh imediat
            await doRefresh(storedRefresh);
            // Dacă refresh reușit, token și user sunt setate în doRefresh
            const newAccess = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
            if (newAccess) {
              const res2  = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${newAccess}` },
              });
              const json2 = await res2.json();
              if (json2.success) { setToken(newAccess); setUser(json2.user); }
            }
          } else {
            await clearSession();
          }
        }
      } catch {
        if (__DEV__) console.warn('Verificare token startup eșuată');
      } finally {
        setLoading(false);
      }
    })();

    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  }, []);

  // ── Login: salvează ambele token-uri ──────────────────
  const login = async (accessToken, refreshToken, userData) => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY,  accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    setToken(accessToken);
    setUser(userData);
    scheduleRefresh(refreshToken);
  };

  // ── Logout: invalidează pe server + șterge local ─────
  const logout = async () => {
    try {
      const storedAccess = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (storedAccess) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${storedAccess}` },
        }).catch(() => {});
      }
    } finally {
      await clearSession();
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth trebuie folosit în interiorul AuthProvider');
  return context;
}
