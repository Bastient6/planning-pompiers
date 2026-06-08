import React from 'react';
import type { AppData } from '../hooks/useAppData';
import { QualifBadges } from './UI';

interface Props { data: AppData; }

export function EquiteTab({ data }: Props) {
  const { agents, stats } = data;

  const sorted = [...agents]
    .map(a => ({ ...a, s: stats[a.idx] ?? { gardes: 0, dispos: 0, rate: 0 } }))
    .sort((a, b) => a.s.rate - b.s.rate);

  const totalGardes = sorted.reduce((s, a) => s + a.s.gardes, 0);
  const avgRate     = sorted.length ? sorted.reduce((s, a) => s + a.s.rate, 0) / sorted.length : 0;
  const maxRate     = Math.max(...sorted.map(a => a.s.rate), 0.01);

  return (
    <div className="tab-content">
      {/* Summary stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{agents.length}</div>
          <div className="stat-label">Agents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalGardes}</div>
          <div className="stat-label">Gardes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(avgRate * 100)}%</div>
          <div className="stat-label">Taux moyen</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Équité gardes / dispos</div>
        {sorted.map((a, rank) => {
          const pct   = Math.round(a.s.rate * 100);
          const fillW = Math.round((a.s.rate / maxRate) * 100);
          const cls   = a.s.rate < avgRate * 0.8 ? 'fill-low' : a.s.rate < avgRate * 1.2 ? 'fill-mid' : 'fill-high';
          const pctCls = a.s.rate < avgRate * 0.8 ? 'pct-low' : a.s.rate < avgRate * 1.2 ? 'pct-mid' : 'pct-high';

          return (
            <div key={a.idx} className="equite-row">
              <span className="eq-rank">#{rank + 1}</span>
              <div className="agent-info">
                <span className="agent-name">{a.name}</span>
                <div className="agent-badges">
                  <QualifBadges soff={a.soff} cond={a.cond} />
                </div>
              </div>
              <span className="eq-count">{a.s.gardes}G / {a.s.dispos}D</span>
              <div className="equity-bar">
                <div className={`equity-fill ${cls}`} style={{ width: fillW + '%' }} />
              </div>
              <span className={`eq-pct-val ${pctCls}`}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
