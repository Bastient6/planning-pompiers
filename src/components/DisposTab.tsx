import React, { useState } from 'react';
import type { AppData } from '../hooks/useAppData';
import type { CurrentUser } from '../lib/types';
import {
  offsetToDate, todayOffset, weekStart, getEquipe, capitalize, MAX_OFFSET,
} from '../lib/dateUtils';
import { EquipeBadge, WeekNav, QualifBadges } from './UI';

interface Props {
  data: AppData;
  user: CurrentUser;
  onUpdateDispo: (offset: number, agentIdx: number, value: string) => Promise<void>;
}

export function DisposTab({ data, user, onUpdateDispo }: Props) {
  const [wStart, setWStart] = useState(() => weekStart(todayOffset()));
  const { agents, cells, gardes } = data;

  const agent = agents.find(a => a.idx === user.agentIdx);
  if (!agent) return (
    <div className="tab-content">
      <div className="error-banner">Agent introuvable. Vérifie que ton Gmail est bien enregistré dans l'onglet Agents.</div>
    </div>
  );

  const today = todayOffset();
  const days: { offset: number; date: Date }[] = [];
  for (let i = 0; i < 7; i++) {
    const o = wStart + i;
    if (o > MAX_OFFSET) break;
    days.push({ offset: o, date: offsetToDate(o) });
  }

  const initials = agent.name.slice(0, 2).toUpperCase();

  return (
    <div className="tab-content">
      {/* Agent card */}
      <div className="card agent-profile-card">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-info">
          <div className="agent-name">{agent.name}</div>
          <div className="agent-badges">
            <QualifBadges soff={agent.soff} cond={agent.cond} />
          </div>
        </div>
      </div>

      <WeekNav wStart={wStart} maxOffset={MAX_OFFSET} onShift={delta =>
        setWStart(Math.max(0, Math.min(MAX_OFFSET, wStart + delta)))
      } />

      <div className="card">
        <div className="card-title">Disponibilités</div>
        {days.map(({ offset, date }) => {
          const eq     = getEquipe(offset, gardes);
          const cell   = cells[offset]?.[agent.idx] ?? {};
          const dispo  = (cell as any).dispo  ?? '';
          const affect = (cell as any).affect ?? '';
          const label  = capitalize(date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }));
          const isToday = offset === today;

          return (
            <div key={offset} className={`dispo-row ${isToday ? 'dispo-today' : ''}`}>
              <div className="dispo-day-info">
                <span className="dispo-day-label">{label}</span>
                <EquipeBadge label={eq} />
              </div>
              <select
                className="dispo-select"
                value={dispo}
                onChange={e => { console.log("[dispo] onChange offset:", offset, "agentIdx:", agent.idx, "value:", e.target.value, "cell:", JSON.stringify(cells[offset]?.[agent.idx])); onUpdateDispo(offset, agent.idx, e.target.value); }}
              >
                <option value="">Indispo</option>
                <option value="J">Journée</option>
                <option value="M">Matin</option>
                <option value="AM">Après-midi</option>
              </select>
              {affect && <span className="dispo-affect-label">{affect}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}