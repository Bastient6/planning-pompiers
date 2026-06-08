import React, { useState } from 'react';
import type { AppData } from '../hooks/useAppData';
import { offsetToDate, todayOffset, weekStart, getEquipe, equipeColor, affectClass, DISPO_LABELS, MAX_OFFSET } from '../lib/dateUtils';
import { WeekNav, EquipeBadge } from './UI';

interface Props { data: AppData; }

export function SemaineTab({ data }: Props) {
  const [wStart, setWStart] = useState(() => weekStart(todayOffset()));
  const { agents, cells, gardes } = data;

  const days: { offset: number; date: Date }[] = [];
  for (let i = 0; i < 7; i++) {
    const o = wStart + i;
    if (o > MAX_OFFSET) break;
    days.push({ offset: o, date: offsetToDate(o) });
  }

  const activeAgents = agents.filter(a =>
    days.some(({ offset }) => {
      const c = cells[offset]?.[a.idx];
      return c && (c.dispo || c.affect);
    })
  );

  return (
    <div className="tab-content">
      <WeekNav wStart={wStart} maxOffset={MAX_OFFSET} onShift={delta =>
        setWStart(Math.max(0, Math.min(MAX_OFFSET, wStart + delta)))
      } />

      {activeAgents.length === 0 ? (
        <div className="card"><div className="empty-state">Aucune disponibilité saisie cette semaine</div></div>
      ) : (
        <div className="card card-flush">
          <div className="week-scroll">
            <table className="week-table">
              <thead>
                <tr>
                  <th className="wt-agent-col">Agent</th>
                  {days.map(({ offset, date }) => {
                    const eq = getEquipe(offset, gardes);
                    return (
                      <th key={offset}>
                        <span className="wt-day-name">{date.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                        <span className="wt-day-num">{date.getDate()}</span>
                        <EquipeBadge label={eq} />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {activeAgents.map(a => (
                  <tr key={a.idx}>
                    <td className="wt-agent-cell">
                      <span>{a.name}</span>
                      <div className="wt-badges">
                        {a.soff && <span className="badge-sm badge-soff">S/off</span>}
                        {a.cond && <span className="badge-sm badge-cond">Cond.</span>}
                      </div>
                    </td>
                    {days.map(({ offset }) => {
                      const cell = cells[offset]?.[a.idx];
                      if (!cell?.dispo) return <td key={offset} className="wt-empty">—</td>;
                      if (cell.affect) return (
                        <td key={offset}>
                          <span className={`cell-chip ${affectClass(cell.affect)}`}>{cell.affect}</span>
                        </td>
                      );
                      const dispoCls: Record<string, string> = { J: 'cell-j', M: 'cell-m', AM: 'cell-am' };
                      return (
                        <td key={offset}>
                          <span className={`cell-chip ${dispoCls[cell.dispo] ?? ''}`}>
                            {DISPO_LABELS[cell.dispo] ?? cell.dispo}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
