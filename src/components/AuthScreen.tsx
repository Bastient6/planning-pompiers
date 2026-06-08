import React, { useEffect } from 'react';

export function AuthScreen({ authReady }: { authReady: boolean }) {
  return (
    <div className="auth-screen">
      <div className="auth-bg-grid" />
      <div className="auth-card">
        <div className="auth-emblem">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 4L6 14v10c0 9.94 7.68 19.24 18 21.6C34.32 43.24 42 33.94 42 24V14L24 4z" fill="currentColor" opacity=".15"/>
            <path d="M24 4L6 14v10c0 9.94 7.68 19.24 18 21.6C34.32 43.24 42 33.94 42 24V14L24 4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M24 16v8M24 28v2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 className="auth-title">Planning Gardes 2026</h1>
        <p className="auth-sub">Connecte-toi avec ton compte Google pour accéder au planning des gardes et astreintes.</p>
        <div className="auth-divider" />
        {authReady ? (
          <div id="google-signin-btn" className="google-btn-wrapper" />
        ) : (
          <div className="auth-loading">
            <span className="auth-spinner" />
            Chargement…
          </div>
        )}
      </div>
      <p className="auth-footer">Accès réservé aux agents enregistrés</p>
    </div>
  );
}
