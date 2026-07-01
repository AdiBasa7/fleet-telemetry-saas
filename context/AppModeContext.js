/**
 * AppModeContext — TRACKING ↔ DIAGNOSIS mode switch
 * Similar cu WALLET/EXCHANGE pe Binance: un toggle persistent
 * la nivel de aplicație care schimbă întreg tab bar-ul.
 */

import { createContext, useContext, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

const AppModeContext = createContext(null);

export const APP_MODES = {
  TRACKING:  'TRACKING',
  DIAGNOSIS: 'DIAGNOSIS',
};

const STORAGE_KEY = '@fleet_app_mode';

export function AppModeProvider({ children }) {
  const [mode, setModeState] = useState(APP_MODES.TRACKING);

  const setMode = useCallback(async (newMode) => {
    setModeState(newMode);
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, newMode);
    } catch {}
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === APP_MODES.TRACKING ? APP_MODES.DIAGNOSIS : APP_MODES.TRACKING);
  }, [mode, setMode]);

  return (
    <AppModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error('useAppMode must be used within AppModeProvider');
  return ctx;
}
