/**
 * VariantThemeContext — merge tema de bază cu override-urile variantei.
 *
 * Înlocuiește importul direct din theme.js:
 *   ÎNAINTE: import { T } from '../theme';
 *   DUPĂ:    import { useTheme } from '../context/VariantThemeContext';
 *            const T = useTheme();
 */

import { createContext, useContext, useMemo } from 'react';
import { T as BASE_THEME, GRAD_HEADER as BASE_GRAD_HEADER, SHADOW as BASE_SHADOW } from '../theme';
import V from '../variants';

const VariantThemeContext = createContext(null);

export function VariantThemeProvider({ children }) {
  const value = useMemo(() => {
    const theme = { ...BASE_THEME, ...V.theme };
    const gradHeader = V.theme?.grad ?? BASE_GRAD_HEADER;
    const shadow = {
      ...BASE_SHADOW,
      shadowColor: V.theme?.primary ?? BASE_SHADOW.shadowColor,
    };
    return { theme, gradHeader, shadow };
  }, []);

  return (
    <VariantThemeContext.Provider value={value}>
      {children}
    </VariantThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(VariantThemeContext);
  if (!ctx) throw new Error('useTheme must be inside VariantThemeProvider');
  return ctx.theme;
}

export function useGradHeader() {
  const ctx = useContext(VariantThemeContext);
  if (!ctx) throw new Error('useGradHeader must be inside VariantThemeProvider');
  return ctx.gradHeader;
}

export function useShadow() {
  const ctx = useContext(VariantThemeContext);
  if (!ctx) throw new Error('useShadow must be inside VariantThemeProvider');
  return ctx.shadow;
}
