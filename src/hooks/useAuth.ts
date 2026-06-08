import { useState, useEffect, useCallback } from 'react';
import { CONFIG } from '../lib/config';
import { findAgent, setAccessToken, clearAccessToken } from '../lib/sheets';
import type { CurrentUser } from '../lib/types';

declare const google: any;

function parseJwt(token: string) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}

// Clé sessionStorage pour le token OAuth
const TOKEN_KEY = 'gapi_token';
const TOKEN_EXPIRY_KEY = 'gapi_token_expiry';

export function requestOAuthToken() {
  sessionStorage.setItem('oauth_return', window.location.href);
  const params = new URLSearchParams({
    client_id:     CONFIG.GOOGLE_CLIENT_ID,
    redirect_uri:  window.location.origin + window.location.pathname,
    response_type: 'token',
    scope:         'https://www.googleapis.com/auth/spreadsheets',
    include_granted_scopes: 'true',
  });
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
  console.log('[oauth] redirect_uri:', window.location.origin + window.location.pathname);
  console.log('[oauth] full url:', url);
  window.location.href = url;
}

function loadTokenFromStorage(): boolean {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiry = parseInt(sessionStorage.getItem(TOKEN_EXPIRY_KEY) || '0', 10);
  if (token && Date.now() < expiry) {
    setAccessToken(token, Math.floor((expiry - Date.now()) / 1000));
    return true;
  }
  return false;
}

function extractTokenFromHash(): boolean {
  const hash = window.location.hash;
  if (!hash) return false;
  const params = new URLSearchParams(hash.slice(1));
  const token = params.get('access_token');
  const expiresIn = parseInt(params.get('expires_in') || '3400', 10);
  if (!token) return false;

  const expiry = Date.now() + expiresIn * 1000;
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(expiry));
  setAccessToken(token, expiresIn);

  // Nettoie le hash sans recharger
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return true;
}

export function useAuth() {
  const [user, setUser]           = useState<CurrentUser | null>(null);
  const [loading, setLoading]     = useState(true);
  const [authReady, setAuthReady] = useState(false);

  const signOut = useCallback(() => {
    try { google.accounts.id.disableAutoSelect(); } catch (_) {}
    sessionStorage.removeItem('user');
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
    clearAccessToken();
    setUser(null);
  }, []);

  const handleCredential = useCallback(async (response: any) => {
    const payload = parseJwt(response.credential);
    const agentData = await findAgent(payload.email);
    if (!agentData) {
      alert('Accès refusé : ' + payload.email + " n'est pas dans la liste des agents.");
      return;
    }
    const newUser: CurrentUser = {
      email:     payload.email,
      name:      payload.name,
      picture:   payload.picture,
      agentIdx:  agentData.idx,
      agentName: agentData.name,
      isSoff:    agentData.soff,
      isCond:    agentData.cond,
      isAdmin:   agentData.admin,
    };
    sessionStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
  }, []);

  useEffect(() => {
    // 1. Récupère le token depuis le hash si on revient d'un redirect OAuth
    extractTokenFromHash();
    // 2. Sinon charge depuis sessionStorage
    loadTokenFromStorage();

    const script = document.createElement('script');
    script.src   = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      google.accounts.id.initialize({
        client_id:   CONFIG.GOOGLE_CLIENT_ID,
        callback:    handleCredential,
        auto_select: false,
      });

      const saved = sessionStorage.getItem('user');
      if (saved) setUser(JSON.parse(saved) as CurrentUser);

      setAuthReady(true);
      setLoading(false);

      setTimeout(() => {
        const btnEl = document.getElementById('google-signin-btn');
        if (btnEl) {
          google.accounts.id.renderButton(btnEl, {
            type: 'standard', theme: 'outline', size: 'large',
            text: 'signin_with', locale: 'fr', width: 280,
          });
        }
      }, 50);

      google.accounts.id.prompt();
    };
    document.head.appendChild(script);
  }, [handleCredential]);

  return { user, loading, authReady, signOut };
}