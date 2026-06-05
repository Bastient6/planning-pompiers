// auth.js — Gestion connexion Google OAuth

let currentUser = null;
let tokenClient = null;
let accessToken = null;

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
    },
  });

  // Vérifier si déjà connecté (session stockée)
  const saved = sessionStorage.getItem("user");
  if (saved) {
    currentUser = JSON.parse(saved);
    showApp();
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

  // Vérifier que cet email est dans la liste agents du Sheet
  const agentData = await findAgent(email);
  if (!agentData) {
    alert("Accès refusé : " + email + " n'est pas dans la liste des agents. Contacte le planificateur.");
    return;
  }

  currentUser = {
    email,
    name,
    picture,
    agentIdx: agentData.idx,
    agentName: agentData.name,
    isSoff: agentData.soff,
    isCond: agentData.cond,
    isAdmin: agentData.admin,
  };

  sessionStorage.setItem("user", JSON.stringify(currentUser));

  // Demander accès en écriture pour les mises à jour Sheet
  tokenClient.requestAccessToken({ prompt: "none" });

  showApp();
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
  document.getElementById("app").classList.remove("visible");
  document.getElementById("auth-screen").style.display = "";
}

function parseJwt(token) {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64));
}

// Charger les scripts Google dynamiquement
(function loadGoogleScripts() {
  const gsi = document.createElement("script");
  gsi.src = "https://accounts.google.com/gsi/client";
  gsi.onload = initGoogle;
  gsi.async = true;
  document.head.appendChild(gsi);
})();
