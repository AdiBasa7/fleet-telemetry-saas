/**
 * ─────────────────────────────────────────────────────
 *  Configurare aplicație mobilă Fleet Telemetry
 * ─────────────────────────────────────────────────────
 *  După deploy pe Oracle Cloud:
 *  Înlocuiește IP_ORACLE cu IP-ul public al serverului tău.
 *
 *  Înainte de deploy (test local):
 *  Pune IP-ul Mac-ului în rețeaua locală (ex: 172.20.10.3)
 */

export const API_BASE_URL        = 'https://fleet-telemetry-licenta.fly.dev/api';
export const WS_URL              = 'https://fleet-telemetry-licenta.fly.dev';

// Polling fallback (folosit doar dacă WebSocket-ul nu e disponibil)
export const POLLING_INTERVAL_MS = 10000; // 10 secunde
