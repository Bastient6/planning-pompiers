import React, { useEffect } from 'react';

export function AuthScreen({ authReady }: { authReady: boolean }) {
  return (
    <div className="auth-screen">
      <div className="auth-bg-grid" />
      <div className="auth-card">
        <div className="auth-emblem">
          <img src="/Logo-SP-Mireval 1.jpg" />
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
