// auth.js — Gestion connexion Google OAuth

let currentUser = null;
let tokenClient = null;
let accessToken = null;
let tokenExpiresAt = 0; // timestamp ms

// Chargé par Google Identity Services (GIS)
function initGoogle() {
  google.accounts.id.initialize({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    callback: handleCredential,
    auto_select: false,
  });

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    callback: (resp) => {
      if (resp.error) { console.error(resp); return; }
      accessToken = resp.access_token;
      // Les tokens Google durent 3600s, on renouvelle à 3400s pour avoir de la marge
      tokenExpiresAt = Date.now() + 3400 * 1000;
    },
  });

  // Vérifier si déjà connecté (session stockée)
  const saved = sessionStorage.getItem("user");
  if (saved) {
    currentUser = JSON.parse(saved);
    showApp();
    // Demander silencieusement le token d'écriture au chargement
    tokenClient.requestAccessToken({ prompt: "" });
  }

  document.getElementById("btn-signin").addEventListener("click", () => {
    google.accounts.id.prompt();
  });
}

async function handleCredential(response) {
  const payload = parseJwt(response.credential);
  const email = payload.email;
  const name = payload.name;
  const picture = payload.picture;

  const agentData = await findAgent(email);
  if (!agentData) {
    alert("Accès refusé : " + email + " n'est pas dans la liste des agents. Contacte le planificateur.");
    return;
  }

  currentUser = {
    email, name, picture,
    agentIdx: agentData.idx,
    agentName: agentData.name,
    isSoff: agentData.soff,
    isCond: agentData.cond,
    isAdmin: agentData.admin,
  };

  sessionStorage.setItem("user", JSON.stringify(currentUser));
  tokenClient.requestAccessToken({ prompt: "none" });
  showApp();
}

// Garantit un token valide avant toute écriture — appelé par sheets.js
async function ensureAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt) return; // encore valide
  return new Promise((resolve) => {
    const origCallback = tokenClient.callback;
    tokenClient.callback = (resp) => {
      if (resp.error) { console.error(resp); resolve(); return; }
      accessToken = resp.access_token;
      tokenExpiresAt = Date.now() + 3400 * 1000;
      tokenClient.callback = origCallback;
      resolve();
    };
    tokenClient.requestAccessToken({ prompt: "" });
  });
}

function showApp() {
  document.getElementById("auth-screen").style.display = "none";
  const app = document.getElementById("app");
  app.classList.add("visible");

  const initials = (currentUser.agentName || currentUser.name)
    .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  document.getElementById("user-initials").textContent = initials;
  document.getElementById("user-name-short").textContent =
    currentUser.agentName || currentUser.name.split(" ")[0];

  initApp();
}

function signOut() {
  google.accounts.id.disableAutoSelect();
  sessionStorage.removeItem("user");
  currentUser = null;
  accessToken = null;
  tokenExpiresAt = 0;
  document.getElementById("app").classList.remove("visible");
  document.getElementById("auth-screen").style.display = "";
}

function parseJwt(token) {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64));
}

(function loadGoogleScripts() {
  const gsi = document.createElement("script");
  gsi.src = "https://accounts.google.com/gsi/client";
  gsi.onload = initGoogle;
  gsi.async = true;
  document.head.appendChild(gsi);
})();