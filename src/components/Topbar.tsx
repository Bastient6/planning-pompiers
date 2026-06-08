import React, { useState } from 'react';
import type { CurrentUser } from '../lib/types';

interface Props {
  user: CurrentUser;
  darkMode: boolean;
  onToggleDark: () => void;
  onSignOut: () => void;
}

export function Topbar({ user, darkMode, onToggleDark, onSignOut }: Props) {
  const initials = (user.agentName || user.name)
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const shortName = (user.agentName || user.name.split(' ')[0]);

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <div className="topbar-logo">
          <img src="/Logo-SP-Mireval 1.jpg" alt="Logo" />
        </div>
        <span className="topbar-title">Planning 2026</span>
      </div>
      <div className="topbar-actions">
        <button
          className="icon-btn"
          onClick={onToggleDark}
          title={darkMode ? 'Mode clair' : 'Mode sombre'}
          aria-label="Toggle theme"
        >
          {darkMode
            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          }
        </button>
        <div className="user-chip">
          <div className="avatar-pill">
            <span className="avatar-initials">{initials}</span>
            <span className="avatar-name">{shortName}</span>
          </div>
          <button className="signout-btn" onClick={onSignOut} title="Se déconnecter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
