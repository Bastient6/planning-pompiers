// ============================================================
//  CONFIG.JS — à remplir lors de la mise en place
//  (une seule fois, environ 20 min)
// ============================================================

const CONFIG = {

  // 1. Ton Google Client ID (depuis Google Cloud Console)
  //    Format : "123456789-abc....apps.googleusercontent.com"
  GOOGLE_CLIENT_ID: "353029111083-dqcpeanfmr64clc52sc78228kcceo0qi.apps.googleusercontent.com",

  // 2. L'ID de ton Google Sheet
  //    C'est la partie longue dans l'URL : docs.google.com/spreadsheets/d/[ICI]/edit
  SHEET_ID: "1lo1gFMV4aRBbMW3t9BMIA3Jj-hhkRWn_1SJiIx7vVd8",

  // 3. Ta Google API Key (depuis Google Cloud Console)
  //    Clé publique pour lire le sheet (lecture seule via API)
  API_KEY: "AIzaSyAYXMb40oRnwv2eyrwwHdEV2WpASdgEp98",

  // 4. Noms exacts des onglets dans ton Google Sheet
  SHEETS: {
    AGENTS:   "Agents",       // onglet avec la liste des agents + leurs Gmail
    SAISON:   "SAISON 2026",  // onglet planning saison
    GESTION:  "Gestion 2026"  // onglet gestion/stats
  },

  // 5. Saison
  SAISON_START: "2026-07-01",  // 1er juillet 2026
  SAISON_END:   "2026-09-30",  // 30 septembre 2026

  // 6. Rotation des équipes à partir du 1er juillet
  //    E2 = 1er juillet, puis E3, E4, E1, E2...
  EQUIPE_START: "E2",  // équipe du 1er juillet

  // 7. URL de ton GitHub Pages (sera fournie après déploiement)
  //    Format : "https://ton-pseudo.github.io/planning-pompiers"
  APP_URL: "https://bastient6.github.io/planning",
};
