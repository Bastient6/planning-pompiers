import React, { useState } from 'react';
import type { AppData } from '../hooks/useAppData';
import {
  offsetToDate, todayOffset, weekStart, weekRangeLabel,
  getEquipe, affectClass, DISPO_LABELS, capitalize, MAX_OFFSET,
} from '../lib/dateUtils';
import { EquipeBadge, EquityBar, QualifBadges, WeekNav, AffectBadge } from './UI';
import { AffectModal } from './AffectModal';

interface Props {
  data: AppData;
  onAffect: (offset: number, agentIdx: number, value: string) => Promise<void>;
}

interface ModalState {
  open: boolean;
  agentIdx: number;
  agentName: string;
  dispo: string;
  dayOffset: number;
  currentAffect?: string;
}

export function PlanningTab({ data, onAffect }: Props) {
  const [dayOffset, setDayOffset]   = useState(() => todayOffset());
  const [wStart, setWStart]         = useState(() => weekStart(todayOffset()));
  const [modal, setModal]           = useState<ModalState>({ open: false, agentIdx: 0, agentName: '', dispo: '', dayOffset: 0 });

  const { agents, cells, gardes, stats } = data;

  const weekDays: number[] = [];
  for (let i = 0; i < 7; i++) {
    const o = wStart + i;
    if (o <= MAX_OFFSET) weekDays.push(o);
  }

  const dayCells = cells[dayOffset] || {};
  const today    = todayOffset();
  const maxRate  = Math.max(...agents.map(a => stats[a.idx]?.rate ?? 0), 0.01);

  const available = agents
    .map(a => ({ ...a, cell: dayCells[a.idx] ?? null, stat: stats[a.idx] ?? { gardes: 0, dispos: 0, rate: 0 } }))
    .filter(a => a.cell?.dispo)
    .sort((a, b) => a.stat.rate - b.stat.rate);

  function openModal(agentIdx: number, agentName: string, dispo: string, offset: number, currentAffect?: string) {
    setModal({ open: true, agentIdx, agentName, dispo, dayOffset: offset, currentAffect });
  }

  async function handleConfirm(type: string) {
    await onAffect(modal.dayOffset, modal.agentIdx, type);
    setModal(m => ({ ...m, open: false }));
  }

  async function handleDelete() {
    await onAffect(modal.dayOffset, modal.agentIdx, '');
    setModal(m => ({ ...m, open: false }));
  }

  const d        = offsetToDate(dayOffset);
  const eq       = getEquipe(dayOffset, gardes);
  const dayLabel = capitalize(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));

  return (
    <div className="tab-content">
      {/* Week navigator */}
      <WeekNav wStart={wStart} maxOffset={MAX_OFFSET} onShift={delta => {
        const next = Math.max(0, Math.min(MAX_OFFSET, wStart + delta));
        setWStart(next);
        setDayOffset(next);
      }} />

      {/* Mini week calendar */}
      <div className="mini-cal">
        {weekDays.map(o => {
          const dd = offsetToDate(o);
          const hasDispo = Object.values(cells[o] || {}).some(c => c.dispo);
          return (
            <button
              key={o}
              className={`mini-cal-day ${o === dayOffset ? 'selected' : ''} ${o === today ? 'today' : ''}`}
              onClick={() => setDayOffset(o)}
            >
              <span className="mcd-wday">{dd.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
              <span className="mcd-num">{dd.getDate()}</span>
              <span className={`mcd-dot ${hasDispo ? 'has-dot' : ''}`} />
            </button>
          );
        })}
      </div>

      {/* Day header */}
      <div className="day-header">
        <span className="day-header-label">{dayLabel}</span>
        <EquipeBadge label={eq} />
      </div>

      {/* Agent list */}
      <div className="card">
        <div className="card-title">Agents disponibles · du moins chargé au plus chargé</div>
        {available.length === 0 ? (
          <div className="empty-state">Aucun agent disponible ce jour</div>
        ) : available.map(a => (
          <div key={a.idx} className="agent-row">
            <div className="agent-info">
              <span className="agent-name">{a.name}</span>
              <div className="agent-badges">
                <QualifBadges soff={a.soff} cond={a.cond} />
                <span className="dispo-label">{DISPO_LABELS[a.cell!.dispo] ?? a.cell!.dispo}</span>
              </div>
            </div>
            <EquityBar rate={a.stat.rate} maxRate={maxRate} />
            {a.cell?.affect ? (
              <AffectBadge
                affect={a.cell.affect}
                onClick={() => openModal(a.idx, a.name, a.cell!.dispo, dayOffset, a.cell!.affect)}
              />
            ) : (
              <button
                className="btn-assign"
                onClick={() => openModal(a.idx, a.name, a.cell!.dispo, dayOffset)}
              >
                Affecter
              </button>
            )}
          </div>
        ))}
      </div>

      <AffectModal
        open={modal.open}
        agentName={modal.agentName}
        dispo={modal.dispo}
        rate={stats[modal.agentIdx]?.rate ?? 0}
        currentAffect={modal.currentAffect}
        onConfirm={handleConfirm}
        onDelete={handleDelete}
        onClose={() => setModal(m => ({ ...m, open: false }))}
      />
    </div>
  );
}
