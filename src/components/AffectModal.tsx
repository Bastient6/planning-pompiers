import React, { useState, useEffect } from 'react';
import { TYPES_GARDE } from '../lib/dateUtils';

interface Props {
  open: boolean;
  agentName: string;
  dispo: string;
  rate: number;
  currentAffect?: string;
  onConfirm: (type: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

const DISPO_LABELS: Record<string, string> = { J: 'Journée', M: 'Matin', AM: 'Après-midi' };

export function AffectModal({ open, agentName, dispo, rate, currentAffect, onConfirm, onDelete, onClose }: Props) {
  const [selected, setSelected] = useState(currentAffect || '');

  useEffect(() => {
    setSelected(currentAffect || '');
  }, [currentAffect, open]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-drag-handle" />
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {currentAffect ? 'Modifier affectation' : `Affecter ${agentName}`}
            </h2>
            <p className="modal-sub">
              Dispo : {DISPO_LABELS[dispo] ?? dispo} · Taux : {Math.round(rate * 100)}%
            </p>
          </div>
          {currentAffect && (
            <button className="modal-delete-btn" onClick={onDelete} title="Supprimer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          )}
        </div>
        <div className="type-grid">
          {TYPES_GARDE.map(t => (
            <button
              key={t}
              className={`type-btn ${selected === t ? 'selected' : ''}`}
              onClick={() => setSelected(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button
            className="btn-confirm"
            disabled={!selected}
            onClick={() => selected && onConfirm(selected)}
          >
            Confirmer
          </button>
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}
