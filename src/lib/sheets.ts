import { CONFIG } from './config';
import { colLetter, parseSheetDate, daysBetween, SAISON_START, MAX_OFFSET } from './dateUtils';
import type { Agent, CellMap, GardeMap } from './types';

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

let _accessToken = '';
let _tokenExpiry  = 0;

export function setAccessToken(token: string, expiresIn = 3400) {
  _accessToken = token;
  _tokenExpiry  = Date.now() + expiresIn * 1000;
}
export function clearAccessToken() { _accessToken = ''; _tokenExpiry = 0; }
export function hasAccessToken()   { return !!_accessToken && Date.now() < _tokenExpiry; }

// Plus de tokenClient GIS — l'auth se fait via redirect manuel dans useAuth
export async function ensureAccessToken(): Promise<void> {
  if (hasAccessToken()) return;
  // Importe dynamiquement pour éviter la dépendance circulaire
  const { requestOAuthToken } = await import('../hooks/useAuth');
  requestOAuthToken();
  // La page va être redirigée — cette Promise ne se résout pas
  return new Promise(() => {});
}

async function sheetsGet(range: string): Promise<string[][]> {
  const url = `${BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(range)}?key=${CONFIG.API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Sheets GET error: ' + r.status);
  const d = await r.json();
  return d.values || [];
}

export async function sheetsUpdate(range: string, values: string[][]): Promise<void> {
  await ensureAccessToken();
  const url = `${BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const r = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + _accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error('Sheets PUT error: ' + JSON.stringify(err));
  }
}

let _agentsCache: Agent[] | null = null;

export async function loadAgents(): Promise<Agent[]> {
  if (_agentsCache) return _agentsCache;
  const rows = await sheetsGet(CONFIG.SHEETS.AGENTS + '!A2:E100');
  _agentsCache = rows
    .filter(r => r[0] && r[1])
    .map((r, i) => ({
      idx:   i,
      name:  r[0].trim(),
      email: (r[1] || '').trim().toLowerCase(),
      soff:  (r[2] || '').toUpperCase() === 'OUI',
      cond:  (r[3] || '').toUpperCase() === 'OUI',
      admin: (r[4] || '').toUpperCase() === 'OUI',
    }));
  return _agentsCache;
}

export async function findAgent(email: string): Promise<Agent | null> {
  const agents = await loadAgents();
  return agents.find(a => a.email === email.toLowerCase()) ?? null;
}

export async function loadSaisonData(): Promise<string[][]> {
  return sheetsGet(CONFIG.SHEETS.SAISON + '!A1:ZZ200');
}

export function parseSaisonData(
  rows: string[][],
  agents: Agent[]
): { cells: CellMap; gardes: GardeMap } {
  const cells: CellMap  = {};
  const gardes: GardeMap = {};
  if (!rows || rows.length < 3) return { cells, gardes };

  const headerRow = rows[0] || [];
  const gardeRow  = rows[1] || [];
  const dayColMap: Record<number, { dispoCol: number; affectCol: number }> = {};

  for (let c = 1; c < headerRow.length; c += 2) {
    const d = parseSheetDate(headerRow[c]);
    if (!d) continue;
    const offset = daysBetween(SAISON_START, d);
    if (offset >= 0 && offset <= MAX_OFFSET) {
      dayColMap[offset] = { dispoCol: c + 1, affectCol: c + 2 };
      const gardeVal = (gardeRow[c] || gardeRow[c + 1] || '').trim();
      if (gardeVal) gardes[offset] = gardeVal;
    }
  }

  const agentStartRow = 3;
  const agentRowMap: Record<number, number> = {};
  for (let r = agentStartRow; r < rows.length; r++) {
    const rowName = (rows[r][0] || '').trim().toLowerCase();
    if (!rowName) continue;
    const agent = agents.find(a => a.name.toLowerCase() === rowName);
    if (agent) agentRowMap[agent.idx] = r + 1;
  }

  for (const [offsetStr, cols] of Object.entries(dayColMap)) {
    const offset = Number(offsetStr);
    cells[offset] = {};
    for (const agent of agents) {
      const sheetRow = agentRowMap[agent.idx];
      if (!sheetRow) continue;
      const dataRow = rows[sheetRow - 1] || [];
      cells[offset][agent.idx] = {
        dispo:     (dataRow[cols.dispoCol  - 1] || '').trim(),
        affect:    (dataRow[cols.affectCol - 1] || '').trim(),
        sheetRow,
        dispoCol:  cols.dispoCol,
        affectCol: cols.affectCol,
      };
    }
  }

  return { cells, gardes };
}

export async function saveCellValue(sheetRow: number, sheetCol: number, value: string): Promise<void> {
  const range = `${CONFIG.SHEETS.SAISON}!${colLetter(sheetCol)}${sheetRow}`;
  await sheetsUpdate(range, [[value]]);
}