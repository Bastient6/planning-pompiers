// sheets.js — Lecture / écriture Google Sheets

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

// ── Lecture ──────────────────────────────────────────────────

async function sheetsGet(range) {
  const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(range)}?key=${CONFIG.API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Sheets GET error: " + r.status);
  const d = await r.json();
  return d.values || [];
}

async function sheetsGetMultiple(ranges) {
  const qs = ranges.map(r => "ranges=" + encodeURIComponent(r)).join("&");
  const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values:batchGet?${qs}&key=${CONFIG.API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Sheets batchGet error: " + r.status);
  const d = await r.json();
  return (d.valueRanges || []).map(vr => vr.values || []);
}

// ── Écriture ─────────────────────────────────────────────────

async function sheetsUpdate(range, values) {
  if (!accessToken) {
    tokenClient.requestAccessToken({ prompt: "" });
    await new Promise(res => setTimeout(res, 1500));
  }
  const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const r = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": "Bearer " + accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error("Sheets PUT error: " + JSON.stringify(err));
  }
  return r.json();
}

async function sheetsBatchUpdate(data) {
  if (!accessToken) {
    tokenClient.requestAccessToken({ prompt: "" });
    await new Promise(res => setTimeout(res, 1500));
  }
  const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values:batchUpdate`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ valueInputOption: "USER_ENTERED", data }),
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error("Sheets batchUpdate error: " + JSON.stringify(err));
  }
  return r.json();
}

// ── Agents ───────────────────────────────────────────────────

let agentsCache = null;

async function loadAgents() {
  if (agentsCache) return agentsCache;
  // Colonne attendue dans l'onglet "Agents" :
  // A=Nom, B=Gmail, C=S/off(OUI/NON), D=Conducteur(OUI/NON), E=Admin(OUI/NON)
  const rows = await sheetsGet(CONFIG.SHEETS.AGENTS + "!A2:E100");
  agentsCache = rows
    .filter(r => r[0] && r[1])
    .map((r, i) => ({
      idx: i,
      name: r[0].trim(),
      email: (r[1] || "").trim().toLowerCase(),
      soff: (r[2] || "").toUpperCase() === "OUI",
      cond: (r[3] || "").toUpperCase() === "OUI",
      admin: (r[4] || "").toUpperCase() === "OUI",
    }));
  return agentsCache;
}

async function findAgent(email) {
  const agents = await loadAgents();
  return agents.find(a => a.email === email.toLowerCase()) || null;
}

// ── Dispos ───────────────────────────────────────────────────
// Structure SAISON 2026 :
// Ligne 5+ = agents, en partant de la ligne HEADER_ROW
// Pour chaque jour : colonne DISPO (M/AM/J/vide) + colonne AFFECT
// Les colonnes alternent : NomAgent | Dispo1 | Affect1 | Dispo2 | Affect2 ...
// On adapte si structure différente — voir CELL_MAP dans app.js

async function loadSaisonData() {
  // Charger les 4 premières lignes (entêtes + équipes) + toutes les lignes agents
  const rows = await sheetsGet(CONFIG.SHEETS.SAISON + "!A1:ZZ200");
  return rows;
}

async function saveDispoCell(sheetRow, sheetCol, value) {
  // sheetRow et sheetCol sont 1-indexés
  const col = colLetter(sheetCol);
  const range = `${CONFIG.SHEETS.SAISON}!${col}${sheetRow}`;
  showSaving(true);
  try {
    await sheetsUpdate(range, [[value]]);
  } finally {
    showSaving(false);
  }
}

async function saveAffectCell(sheetRow, sheetCol, value) {
  const col = colLetter(sheetCol);
  const range = `${CONFIG.SHEETS.SAISON}!${col}${sheetRow}`;
  showSaving(true);
  try {
    await sheetsUpdate(range, [[value]]);
  } finally {
    showSaving(false);
  }
}

// ── Utilitaires ──────────────────────────────────────────────

function colLetter(n) {
  // Convertit numéro de colonne (1-indexé) en lettre(s) Excel
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

function showSaving(visible) {
  const el = document.getElementById("saving");
  if (el) el.classList.toggle("visible", visible);
}

// ── Stats Gestion ─────────────────────────────────────────────

async function loadGestionData() {
  const rows = await sheetsGet(CONFIG.SHEETS.GESTION + "!A1:Z100");
  return rows;
}
