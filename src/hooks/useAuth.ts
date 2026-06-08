import { useState, useEffect, useCallback } from 'react';
import { CONFIG } from '../lib/config';
import { findAgent, setTokenClient, setAccessToken, clearAccessToken, onTokenResponse } from '../lib/sheets';
import type { CurrentUser } from '../lib/types';

declare const google: any;

function parseJwt(token: string) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}

// Récupère le token depuis le fragment URL après redirect OAuth
function extractTokenFromHash(): string | null {
  const hash = window.location.hash;
  if (!hash) return null;
  const params = new URLSearchParams(hash.slice(1));
  const token = params.get('access_token');
  const expiresIn = parseInt(params.get('expires_in') || '3400', 10);
  if (token) {
    setAccessToken(token, expiresIn);
    // Nettoie le hash de l'URL sans recharger la page
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  return token;
}

export function useAuth() {
  const [user, setUser]           = useState<CurrentUser | null>(null);
  const [loading, setLoading]     = useState(true);
  const [authReady, setAuthReady] = useState(false);

  const signOut = useCallback(() => {
    google.accounts.id.disableAutoSelect();
    sessionStorage.removeItem('user');
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
    // Récupère le token si on revient d'un redirect OAuth
    extractTokenFromHash();

    const script = document.createElement('script');
    script.src   = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      const tc = google.accounts.oauth2.initTokenClient({
        client_id:    CONFIG.GOOGLE_CLIENT_ID,
        scope:        'https://www.googleapis.com/auth/spreadsheets',
        callback:     onTokenResponse,
        // redirect_uri pour GitHub Pages — pas de popup, pas de postMessage bloqué
        ux_mode:      'redirect',
        redirect_uri: window.location.origin + window.location.pathname,
      });
      setTokenClient(tc);

      google.accounts.id.initialize({
        client_id:   CONFIG.GOOGLE_CLIENT_ID,
        callback:    handleCredential,
        auto_select: false,
      });

      const saved = sessionStorage.getItem('user');
      if (saved) {
        setUser(JSON.parse(saved) as CurrentUser);
      }

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