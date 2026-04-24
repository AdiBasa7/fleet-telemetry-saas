/**
 * ─────────────────────────────────────────────────────
 *  Tema globală — Violet Politehnica Timișoara
 * ─────────────────────────────────────────────────────
 */

export const T = {
  // Fundaluri
  bg:      '#07010F',   // negru-violet profund
  bgCard:  '#110626',   // card principal
  bgCard2: '#1C0D40',   // card secundar
  bgCard3: '#230F4E',   // card terțiar

  // Violet Poli Timișoara
  primary: '#7B2FBE',   // violet principal
  primaryDark: '#5B1F8A',
  primaryLight:'#9D50D4',

  // Accente
  accent:  '#A855F7',   // violet deschis
  accent2: '#C084FC',   // lavender
  glow:    '#9333EA',   // pentru glow/shadow

  // Gradient principal (folosit pe butoane, headere)
  grad:    ['#5B1F8A', '#9333EA'],
  gradDark:['#07010F', '#1C0D40'],
  gradCard:['#1C0D40', '#110626'],

  // Statuse
  green:   '#10B981',
  greenDim:'rgba(16,185,129,0.15)',
  red:     '#F87171',
  redDim:  'rgba(248,113,113,0.15)',
  orange:  '#FB923C',
  gold:    '#FBBF24',

  // Text
  white:   '#FFFFFF',
  muted:   'rgba(192,132,252,0.5)',
  muted2:  'rgba(192,132,252,0.25)',

  // Borduri
  border:  'rgba(123,47,190,0.2)',
  borderBright:'rgba(168,85,247,0.4)',

  // Tab bar
  tabBg:   '#0C0320',
  tabActive: '#A855F7',
  tabInactive:'rgba(192,132,252,0.35)',
};

// Gradient pentru header
export const GRAD_HEADER = ['#0E0428', '#1C0D40'];

// Shadow violet universal
export const SHADOW = {
  shadowColor: '#7B2FBE',
  shadowOpacity: 0.35,
  shadowRadius: 12,
  elevation: 8,
};
