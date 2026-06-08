import React from 'react';
import type { Tab } from '../lib/types';

interface NavItem {
  id: Tab;
  label: string;
  adminOnly?: boolean;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'planning',
    label: 'Planning',
    adminOnly: true,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  },
  {
    id: 'semaine',
    label: 'Semaine',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    id: 'equite',
    label: 'Équité',
    adminOnly: true,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>,
  },
  {
    id: 'dispos',
    label: 'Mes dispos',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
];

interface Props {
  tab: Tab;
  isAdmin: boolean;
  onTabChange: (t: Tab) => void;
}

export function Sidebar({ tab, isAdmin, onTabChange }: Props) {
  const visible = NAV_ITEMS.filter(i => !i.adminOnly || isAdmin);
  return (
    <nav className="sidebar">
      <div className="sidebar-section-label">Navigation</div>
      {visible.map(item => (
        <button
          key={item.id}
          className={`nav-item ${tab === item.id ? 'active' : ''}`}
          onClick={() => onTabChange(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
          {tab === item.id && <span className="nav-active-dot" />}
        </button>
      ))}
    </nav>
  );
}

export function BottomNav({ tab, isAdmin, onTabChange }: Props) {
  const visible = NAV_ITEMS.filter(i => !i.adminOnly || isAdmin);
  return (
    <nav className="bottom-nav">
      {visible.map(item => (
        <button
          key={item.id}
          className={`bottom-nav-item ${tab === item.id ? 'active' : ''}`}
          onClick={() => onTabChange(item.id)}
        >
          <span className="bnav-icon">{item.icon}</span>
          <span className="bnav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
