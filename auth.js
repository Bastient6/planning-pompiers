// auth.js — Gestion connexion Google OAuth

let currentUser  = null;
let tokenClient  = null;
let accessToken  = null;
let tokenExpiresAt = 0;

function initGoogle() {
  google.accounts.id.initialize({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    callback:  handleCredential,
    auto_select: false,
  });

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    scope:     "https://www.googleapis.com/auth/spreadsheets",
    callback:  onTokenResponse,
  });

  const saved = sessionStorage.getItem("user");
  if (saved) {
    currentUser = JSON.parse(saved);
    // Tenter un refresh silencieux du token (sans popup)
    // Si ça échoue (pas de session Google active), on reste en lecture seule
    // et on demandera le token au premier write via ensureAccessToken()
    silentTokenRefresh();
    showApp();
  }

  document.getElementById("btn-signin").addEventListener("click", () => {
    google.accounts.id.prompt();
  });
}

function onTokenResponse(resp) {
  if (resp.error) {
    // "interaction_required" = normal quand pas de session active, pas une erreur fatale
    if (resp.error !== "interaction_required") console.error("Token error:", resp.error);
    accessToken    = null;
    tokenExpiresAt = 0;
    return;
  }
  accessToken    = resp.access_token;
  tokenExpiresAt = Date.now() + 3400 * 1000;
}

function silentTokenRefresh() {
  try {
    // prompt: "none" = refresh silencieux, échoue sans popup si pas de session
    tokenClient.requestAccessToken({ prompt: "none" });
  } catch (e) {
    // Ignore — le token sera demandé au premier write
  }
}

// Appelé avant chaque écriture Sheets
// Si le token est expiré/absent : tente d'abord silencieux, puis popup si nécessaire
async function ensureAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt) return; // encore valide

  return new Promise((resolve) => {
    // Remplacer temporairement le callback pour capturer la réponse
    const prevCallback = tokenClient.callback;
    tokenClient.callback = (resp) => {
      tokenClient.callback = prevCallback;
      onTokenResponse(resp);
      resolve();
    };
    // prompt: "none" d'abord — si la session Google est active ça marche sans popup
    // Si ça échoue avec interaction_required, on réessaie avec prompt vide (popup discrète)
    tokenClient.requestAccessToken({ prompt: "none" });

    // Fallback : si toujours pas de token après 2s, demander avec popup
    setTimeout(() => {
      if (!accessToken) {
        tokenClient.callback = (resp) => {
          tokenClient.callback = prevCallback;
          onTokenResponse(resp);
          resolve();
        };
        tokenClient.requestAccessToken({ prompt: "" });
      }
    }, 2000);
  });
}

async function handleCredential(response) {
  const payload = parseJwt(response.credential);
  const agentData = await findAgent(payload.email);
  if (!agentData) {
    alert("Accès refusé : " + payload.email + " n'est pas dans la liste des agents.");
    return;
  }

  currentUser = {
    email:     payload.email,
    name:      payload.name,
    picture:   payload.picture,
    agentIdx:  agentData.idx,
    agentName: agentData.name,
    isSoff:    agentData.soff,
    isCond:    agentData.cond,
    isAdmin:   agentData.admin,
  };

  sessionStorage.setItem("user", JSON.stringify(currentUser));

  // Après connexion fraîche : le token est disponible immédiatement sans popup
  await new Promise((resolve) => {
    const prev = tokenClient.callback;
    tokenClient.callback = (resp) => {
      tokenClient.callback = prev;
      onTokenResponse(resp);
      resolve();
    };
    tokenClient.requestAccessToken({ prompt: "none" });
  });

  showApp();
}

function showApp() {
  document.getElementById("auth-screen").style.display = "none";
  document.getElementById("app").classList.add("visible");

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
  currentUser    = null;
  accessToken    = null;
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
  gsi.src   = "https://accounts.google.com/gsi/client";
  gsi.onload = initGoogle;
  gsi.async  = true;
  document.head.appendChild(gsi);
})();