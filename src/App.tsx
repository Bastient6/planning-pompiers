import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useAppData } from './hooks/useAppData';
import { AuthScreen } from './components/AuthScreen';
import { Topbar } from './components/Topbar';
import { Sidebar, BottomNav } from './components/Nav';
import { PlanningTab } from './components/PlanningTab';
import { SemaineTab } from './components/SemaineTab';
import { EquiteTab } from './components/EquiteTab';
import { DisposTab } from './components/DisposTab';
import { SavingIndicator, ErrorBanner } from './components/UI';
import type { Tab } from './lib/types';

export default function App() {
  const { user, loading: authLoading, authReady, signOut } = useAuth();
  const { data, loading: dataLoading, error, saving, saveError, refresh, updateDispo, updateAffect } = useAppData();
  const [tab, setTab]           = useState<Tab>('semaine');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === '1');

  // Apply dark mode to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode ? '1' : '0');
  }, [darkMode]);

  // Load data once user is logged in
  useEffect(() => {
    if (user) {
      // Default tab based on role
      if (!user.isAdmin) setTab('semaine');
      refresh();
    }
  }, [user]);

  function handleTabChange(t: Tab) {
    if ((t === 'planning' || t === 'equite') && !user?.isAdmin) return;
    setTab(t);
  }

  if (authLoading && !authReady) {
    return <AuthScreen authReady={false} />;
  }

  if (!user) {
    return <AuthScreen authReady={authReady} />;
  }

  return (
    <div className="app">
      <Topbar
        user={user}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
        onSignOut={signOut}
      />

      <div className="app-body">
        <Sidebar tab={tab} isAdmin={!!user.isAdmin} onTabChange={handleTabChange} />

        <main className="main-content">
          {error && <ErrorBanner message={error} />}
          {saveError && <ErrorBanner message={saveError} />}

          {dataLoading ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <span>Chargement du planning…</span>
            </div>
          ) : !data ? (
            <div className="loading-state">
              <span>En attente des données…</span>
            </div>
          ) : (
            <>
              {tab === 'planning' && user.isAdmin && (
                <PlanningTab data={data} onAffect={updateAffect} />
              )}
              {tab === 'semaine' && (
                <SemaineTab data={data} />
              )}
              {tab === 'equite' && user.isAdmin && (
                <EquiteTab data={data} />
              )}
              {tab === 'dispos' && (
                <DisposTab data={data} user={user} onUpdateDispo={updateDispo} />
              )}
            </>
          )}
        </main>
      </div>

      <BottomNav tab={tab} isAdmin={!!user.isAdmin} onTabChange={handleTabChange} />
      <SavingIndicator visible={saving} />
    </div>
  );
}
