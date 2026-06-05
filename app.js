// app.js — Logique principale de l'application

// ── Constantes ───────────────────────────────────────────────

const TYPES_GARDE = ["GRR Journée", "GRR Matin", "GRR Après-midi", "AST Journée", "AST Matin", "VPF", "GFF", "Cond. CDG"];
const EQUIPE_SEQ = ["E1", "E2", "E3", "E4"];
const EQUIPE_LABELS = { E1: "Garde 1", E2: "Garde 2", E3: "Garde 3", E4: "Garde 4" };
const SAISON_START = new Date(CONFIG.SAISON_START);
const SAISON_END = new Date(CONFIG.SAISON_END);
const TODAY = new Date();

// ── État global ──────────────────────────────────────────────

let state = {
  tab: "planning",
  dayOffset: daysBetween(SAISON_START, clampDate(TODAY)),
  agents: [],
  // Structure plate des données sheet : [dayOffset][agentIdx] = { dispo, affect, sheetRow, dispoCol, affectCol }
  cells: {},
  // Stats calculées par agent
  stats: {},
  // Pour la modal
  modalAgent: null,
  modalType: null,
};

// ── Init ─────────────────────────────────────────────────────

async function initApp() {
  try {
    state.agents = await loadAgents();
    await refreshData();
    renderCurrentTab();
  } catch (e) {
    showError("Erreur de chargement : " + e.message);
  }
}

async function refreshData() {
  const rows = await loadSaisonData();
  parseSheetData(rows);
  computeStats();
}

// ── Parsing du Sheet ─────────────────────────────────────────
// On détecte la structure en cherchant les noms d'agents en colonne A
// et les dates en ligne 1

function parseSheetData(rows) {
  state.cells = {};
  if (!rows || rows.length < 3) return;

  // Ligne 1 = dates (format attendu : "01/07/2026" ou "1 juil" ou numéro Excel)
  // Ligne 2 = équipe de garde
  // Ligne 3 = en-têtes (Dispo / Affectation / ...)
  // Ligne 4+ = agents

  const headerRow = rows[0] || [];
  const agentStartRow = 3; // 0-indexé → ligne 4 dans Sheet

  // Construire un map date → colonne index pour chaque "bloc jour"
  // Chaque jour occupe 2 colonnes : Dispo (col pair) + Affectation (col impair)
  // Colonne 0 = Nom agent → jours commencent col 1

  const dayColMap = {}; // dayOffset → { dispoCol, affectCol } (1-indexés pour Sheets API)
  for (let c = 1; c < headerRow.length; c += 2) {
    const raw = headerRow[c];
    if (!raw) continue;
    const d = parseSheetDate(raw);
    if (!d) continue;
    const offset = daysBetween(SAISON_START, d);
    if (offset >= 0 && offset <= 92) {
      dayColMap[offset] = { dispoCol: c + 1, affectCol: c + 2 }; // 1-indexé
    }
  }

  // Construire un map nom agent → index dans state.agents
  const agentRowMap = {}; // agentIdx → sheetRow (1-indexé)
  for (let r = agentStartRow; r < rows.length; r++) {
    const rowName = (rows[r][0] || "").trim().toLowerCase();
    if (!rowName) continue;
    const agent = state.agents.find(a => a.name.toLowerCase() === rowName);
    if (agent) agentRowMap[agent.idx] = r + 1; // 1-indexé pour Sheets API
  }

  // Remplir state.cells
  for (const [offsetStr, cols] of Object.entries(dayColMap)) {
    const offset = parseInt(offsetStr);
    state.cells[offset] = {};
    for (const agent of state.agents) {
      const sheetRow = agentRowMap[agent.idx];
      if (!sheetRow) continue;
      const dataRow = rows[sheetRow - 1] || [];
      state.cells[offset][agent.idx] = {
        dispo: (dataRow[cols.dispoCol - 1] || "").trim(),
        affect: (dataRow[cols.affectCol - 1] || "").trim(),
        sheetRow,
        dispoCol: cols.dispoCol,
        affectCol: cols.affectCol,
      };
    }
  }
}

function parseSheetDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // Format JJ/MM/AAAA
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return new Date(+m1[3], +m1[2] - 1, +m1[1]);
  // Format AAAA-MM-JJ
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) return new Date(+m2[1], +m2[2] - 1, +m2[3]);
  // Numéro de série Excel (nombre de jours depuis 30/12/1899)
  const n = parseFloat(s);
  if (!isNaN(n) && n > 40000) {
    const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  return null;
}

// ── Stats équité ──────────────────────────────────────────────

function computeStats() {
  const todayOffset = daysBetween(SAISON_START, clampDate(TODAY));
  state.stats = {};

  for (const agent of state.agents) {
    let gardes = 0, dispos = 0;
    for (let o = 0; o <= todayOffset; o++) {
      const cell = (state.cells[o] || {})[agent.idx];
      if (!cell) continue;
      if (cell.dispo) dispos++;
      if (cell.affect && (cell.affect.startsWith("GRR") || cell.affect.startsWith("AST"))) gardes++;
    }
    state.stats[agent.idx] = { gardes, dispos, rate: dispos > 0 ? gardes / dispos : 0 };
  }
}

// ── Navigation ────────────────────────────────────────────────

function showTab(tab, btn) {
  state.tab = tab;
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderCurrentTab();
}

function renderCurrentTab() {
  const content = document.getElementById("content");
  content.innerHTML = "";
  if (state.tab === "planning") renderPlanning(content);
  else if (state.tab === "semaine") renderSemaine(content);
  else if (state.tab === "equite") renderEquite(content);
  else if (state.tab === "dispos") renderDispos(content);
}

// ── Tab Planning ──────────────────────────────────────────────

function renderPlanning(el) {
  const maxOffset = daysBetween(SAISON_START, SAISON_END);
  const d = offsetToDate(state.dayOffset);
  const eq = getEquipe(state.dayOffset);
  const dayLabel = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const dayCells = state.cells[state.dayOffset] || {};
  const available = state.agents
    .map(a => ({ ...a, cell: dayCells[a.idx] || null, stats: state.stats[a.idx] || { gardes: 0, dispos: 0, rate: 0 } }))
    .filter(a => a.cell && a.cell.dispo)
    .sort((a, b) => a.stats.rate - b.stats.rate);

  const maxRate = Math.max(...state.agents.map(a => (state.stats[a.idx] || {}).rate || 0), 0.01);

  el.innerHTML = `
    <div class="day-nav">
      <button onclick="prevDay()" ${state.dayOffset <= 0 ? "disabled" : ""}>‹</button>
      <div class="day-label">${capitalize(dayLabel)}</div>
      <button onclick="nextDay()" ${state.dayOffset >= maxOffset ? "disabled" : ""}>›</button>
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-size:13px;font-weight:600">Disponibles</span>
        <span class="eq-badge eq-${eq}">${EQUIPE_LABELS[eq]}</span>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">Du moins chargé → au plus chargé</div>
      ${available.length === 0
        ? `<div style="text-align:center;padding:20px;color:var(--text-muted)">Aucun agent disponible ce jour</div>`
        : available.map(a => agentRow(a, maxRate, state.dayOffset)).join("")
      }
    </div>`;
}

function agentRow(a, maxRate, dayOffset) {
  const pct = Math.round(a.stats.rate * 100);
  const fillW = Math.round((a.stats.rate / maxRate) * 100);
  const fillClass = a.stats.rate < 0.3 ? "fill-low" : a.stats.rate < 0.55 ? "fill-mid" : "fill-high";
  const dispoLabel = { J: "Journée", M: "Matin", AM: "Après-midi" }[a.cell.dispo] || a.cell.dispo;
  const affect = a.cell.affect;

  // Seuls admin ou planificateur peuvent affecter (ou l'agent lui-même pour ses dispos)
  const canAffect = currentUser && (currentUser.isAdmin || true); // TODO: restreindre si besoin

  return `<div class="agent-row">
    <div class="agent-name">
      <span>${a.name}</span>
      ${a.soff ? `<span class="badge-sm soff">S/off</span>` : ""}
      ${a.cond ? `<span class="badge-sm cond">Cond.</span>` : ""}
      <span style="font-size:11px;color:var(--text-muted)">${dispoLabel}</span>
    </div>
    <div class="eq-bar-wrap">
      <div class="eq-bar"><div class="eq-fill ${fillClass}" style="width:${fillW}%"></div></div>
      <span class="eq-pct">${pct}%</span>
    </div>
    ${affect
      ? `<span class="btn-done">${affect}</span>`
      : canAffect
        ? `<button class="btn-affect" onclick="openModal(${a.idx}, '${a.name}', '${a.cell.dispo}', ${dayOffset})">Affecter</button>`
        : `<span style="font-size:11px;color:var(--text-muted)">—</span>`
    }
  </div>`;
}

function prevDay() { state.dayOffset = Math.max(0, state.dayOffset - 1); renderCurrentTab(); }
function nextDay() { state.dayOffset = Math.min(daysBetween(SAISON_START, SAISON_END), state.dayOffset + 1); renderCurrentTab(); }

// ── Tab Semaine ───────────────────────────────────────────────

function renderSemaine(el) {
  const startOffset = state.dayOffset;
  const days = [];
  for (let i = 0; i < 7; i++) {
    const o = startOffset + i;
    if (o > daysBetween(SAISON_START, SAISON_END)) break;
    days.push({ offset: o, date: offsetToDate(o) });
  }

  const thead = `<tr>
    <th>Agent</th>
    ${days.map(({ date, offset }) => {
      const eq = getEquipe(offset);
      const label = date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
      return `<th>${label}<br><span class="eq-badge eq-${eq}" style="font-size:9px">${EQUIPE_LABELS[eq]}</span></th>`;
    }).join("")}
  </tr>`;

  const tbody = state.agents.map(a => {
    const badges = (a.soff ? `<span class="badge-sm soff">S/off</span>` : "") +
                   (a.cond ? `<span class="badge-sm cond">Cond.</span>` : "");
    const cells = days.map(({ offset }) => {
      const cell = (state.cells[offset] || {})[a.idx];
      if (!cell || !cell.dispo) return `<td>—</td>`;
      if (cell.affect) return `<td><span class="cell-af">${cell.affect.split(" ")[0]}</span></td>`;
      const cls = { J: "cell-j", M: "cell-m", AM: "cell-am" }[cell.dispo] || "";
      return `<td><span class="${cls}">${cell.dispo}</span></td>`;
    }).join("");
    return `<tr><td>${a.name} ${badges}</td>${cells}</tr>`;
  }).join("");

  el.innerHTML = `
    <div class="card">
      <div class="card-title">Semaine — à partir du ${offsetToDate(state.dayOffset).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</div>
      <div class="week-scroll"><table class="week-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>
    </div>`;
}

// ── Tab Équité ────────────────────────────────────────────────

function renderEquite(el) {
  const sorted = [...state.agents]
    .map(a => ({ ...a, s: state.stats[a.idx] || { gardes: 0, dispos: 0, rate: 0 } }))
    .sort((a, b) => a.s.rate - b.s.rate);

  const totalGardes = sorted.reduce((s, a) => s + a.s.gardes, 0);
  const avgRate = sorted.length > 0 ? sorted.reduce((s, a) => s + a.s.rate, 0) / sorted.length : 0;
  const maxRate = Math.max(...sorted.map(a => a.s.rate), 0.01);

  el.innerHTML = `
    <div class="stats-row">
      <div class="stat-box"><div class="stat-val">${state.agents.length}</div><div class="stat-lbl">Agents</div></div>
      <div class="stat-box"><div class="stat-val">${totalGardes}</div><div class="stat-lbl">Gardes</div></div>
      <div class="stat-box"><div class="stat-val">${Math.round(avgRate * 100)}%</div><div class="stat-lbl">Taux moyen</div></div>
    </div>
    <div class="card">
      <div class="card-title">Équité gardes / dispos</div>
      ${sorted.map((a, rank) => {
        const pct = Math.round(a.s.rate * 100);
        const fillW = Math.round((a.s.rate / maxRate) * 100);
        const fillClass = a.s.rate < avgRate * 0.8 ? "fill-low" : a.s.rate < avgRate * 1.2 ? "fill-mid" : "fill-high";
        const color = a.s.rate < avgRate * 0.8 ? "var(--teal)" : a.s.rate < avgRate * 1.2 ? "#BA7517" : "var(--red)";
        return `<div style="display:grid;grid-template-columns:24px 1fr auto 100px auto;gap:8px;align-items:center;padding:7px 4px;border-bottom:0.5px solid var(--border)">
          <span style="font-size:11px;color:var(--text-muted);text-align:center">${rank + 1}</span>
          <div class="agent-name">
            <span>${a.name}</span>
            ${a.soff ? `<span class="badge-sm soff">S/off</span>` : ""}
            ${a.cond ? `<span class="badge-sm cond">Cond.</span>` : ""}
          </div>
          <span style="font-size:11px;color:var(--text-muted)">${a.s.gardes}G / ${a.s.dispos}D</span>
          <div class="eq-bar" style="width:100px"><div class="eq-fill ${fillClass}" style="width:${fillW}%"></div></div>
          <span style="font-size:13px;font-weight:600;min-width:32px;color:${color}">${pct}%</span>
        </div>`;
      }).join("")}
    </div>`;
}

// ── Tab Mes dispos ────────────────────────────────────────────

function renderDispos(el) {
  if (!currentUser) { el.innerHTML = `<div class="loader">Non connecté</div>`; return; }

  const agent = state.agents.find(a => a.idx === currentUser.agentIdx);
  if (!agent) { el.innerHTML = `<div class="error-msg">Agent introuvable. Vérifie que ton Gmail est bien enregistré.</div>`; return; }

  const days = [];
  for (let o = state.dayOffset; o < state.dayOffset + 14 && o <= daysBetween(SAISON_START, SAISON_END); o++) {
    days.push({ offset: o, date: offsetToDate(o) });
  }

  const badges = (agent.soff ? `<span class="badge-sm soff">S/off</span>` : "") +
                 (agent.cond ? `<span class="badge-sm cond">Cond.</span>` : "");

  el.innerHTML = `
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
        <div class="avatar-initials">${agent.name.slice(0,2).toUpperCase()}</div>
        <div><div style="font-weight:600">${agent.name}</div><div style="font-size:11px;margin-top:2px">${badges}</div></div>
      </div>
      <div class="card-title">Mes disponibilités — 14 prochains jours</div>
      ${days.map(({ offset, date }) => {
        const eq = getEquipe(offset);
        const cell = (state.cells[offset] || {})[agent.idx] || {};
        const dispo = cell.dispo || "";
        const affect = cell.affect || "";
        const label = date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
        return `<div class="dispo-row">
          <div class="dispo-day">${capitalize(label)}</div>
          <span class="eq-badge eq-${eq}" style="font-size:10px">${EQUIPE_LABELS[eq]}</span>
          <select class="dispo-select" onchange="updateDispo(${offset}, ${agent.idx}, this.value)">
            <option value="" ${!dispo ? "selected" : ""}>Indispo</option>
            <option value="J" ${dispo === "J" ? "selected" : ""}>Journée</option>
            <option value="M" ${dispo === "M" ? "selected" : ""}>Matin</option>
            <option value="AM" ${dispo === "AM" ? "selected" : ""}>Après-midi</option>
          </select>
          ${affect ? `<span class="dispo-affect">${affect}</span>` : ""}
        </div>`;
      }).join("")}
    </div>`;
}

async function updateDispo(offset, agentIdx, value) {
  const cell = (state.cells[offset] || {})[agentIdx];
  if (!cell) return;
  cell.dispo = value;
  try {
    await saveDispoCell(cell.sheetRow, cell.dispoCol, value);
    computeStats();
  } catch (e) {
    showError("Erreur d'enregistrement : " + e.message);
  }
}

// ── Modal affectation ─────────────────────────────────────────

function openModal(agentIdx, name, dispo, dayOffset) {
  state.modalAgent = { agentIdx, name, dispo, dayOffset };
  state.modalType = null;
  const agent = state.agents.find(a => a.idx === agentIdx);
  const s = state.stats[agentIdx] || { gardes: 0, dispos: 0, rate: 0 };

  document.getElementById("m-title").textContent = "Affecter " + name;
  document.getElementById("m-sub").textContent =
    `Dispo : ${{ J: "Journée", M: "Matin", AM: "Après-midi" }[dispo] || dispo} — taux garde : ${Math.round(s.rate * 100)}%`;

  document.getElementById("m-types").innerHTML = TYPES_GARDE.map(t =>
    `<button class="type-btn" onclick="selectType(this,'${t}')">${t}</button>`
  ).join("");

  document.getElementById("m-confirm").disabled = true;
  document.getElementById("modal").classList.add("open");
}

function selectType(btn, type) {
  document.querySelectorAll(".type-btn").forEach(b => b.classList.remove("sel"));
  btn.classList.add("sel");
  state.modalType = type;
  document.getElementById("m-confirm").disabled = false;
}

async function confirmAffect() {
  if (!state.modalAgent || !state.modalType) return;
  const { agentIdx, dayOffset } = state.modalAgent;
  const cell = (state.cells[dayOffset] || {})[agentIdx];
  if (!cell) { closeModal(); return; }

  cell.affect = state.modalType;
  closeModal();

  try {
    await saveAffectCell(cell.sheetRow, cell.affectCol, state.modalType);
    computeStats();
    renderCurrentTab();
  } catch (e) {
    showError("Erreur d'enregistrement : " + e.message);
  }
}

function closeModal() {
  document.getElementById("modal").classList.remove("open");
  state.modalAgent = null;
  state.modalType = null;
}

// ── Helpers ───────────────────────────────────────────────────

function getEquipe(offset) {
  const startIdx = EQUIPE_SEQ.indexOf(CONFIG.EQUIPE_START);
  return EQUIPE_SEQ[(startIdx + offset) % 4];
}

function offsetToDate(offset) {
  const d = new Date(SAISON_START);
  d.setDate(d.getDate() + offset);
  return d;
}

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

function clampDate(d) {
  if (d < SAISON_START) return new Date(SAISON_START);
  if (d > SAISON_END) return new Date(SAISON_END);
  return d;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function showError(msg) {
  const content = document.getElementById("content");
  const div = document.createElement("div");
  div.className = "error-msg";
  div.textContent = msg;
  content.prepend(div);
  setTimeout(() => div.remove(), 6000);
}
