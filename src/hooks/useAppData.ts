import { useState, useCallback, useEffect, useRef } from 'react';
import { loadAgents, loadSaisonData, parseSaisonData, saveCellValue } from '../lib/sheets';
import { todayOffset } from '../lib/dateUtils';
import type { Agent, CellMap, GardeMap, AgentStats } from '../lib/types';

export interface AppData {
  agents: Agent[];
  cells:  CellMap;
  gardes: GardeMap;
  stats:  Record<number, AgentStats>;
}

function computeStats(agents: Agent[], cells: CellMap): Record<number, AgentStats> {
  const today = todayOffset();
  const stats: Record<number, AgentStats> = {};
  for (const agent of agents) {
    let gardes = 0, dispos = 0;
    for (let o = 0; o <= today; o++) {
      const cell = cells[o]?.[agent.idx];
      if (!cell) continue;
      if (cell.dispo) dispos++;
      if (cell.affect && (cell.affect.startsWith('GRR') || cell.affect.startsWith('AST'))) gardes++;
    }
    stats[agent.idx] = { gardes, dispos, rate: dispos > 0 ? gardes / dispos : 0 };
  }
  return stats;
}

export function useAppData() {
  const [data, setData]       = useState<AppData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const dataRef = useRef<AppData | null>(null);
  dataRef.current = data;

  const refresh = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(null); }
    try {
      const agents = await loadAgents();
      const rows   = await loadSaisonData();
      const { cells, gardes } = parseSaisonData(rows, agents);
      const stats  = computeStats(agents, cells);
      const next   = { agents, cells, gardes, stats };
      setData(prev => {
        // Pas de re-render si les cellules n'ont pas changé
        if (prev && JSON.stringify(prev.cells) === JSON.stringify(next.cells)) return prev;
        return next;
      });
    } catch (e: any) {
      if (!silent) setError(e.message || 'Erreur de chargement');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Polling silencieux toutes les 2 minutes
  useEffect(() => {
    const id = setInterval(() => refresh(true), 2 * 60 * 1000);
    return () => clearInterval(id);
  }, [refresh]);

  const updateDispo = useCallback(async (offset: number, agentIdx: number, value: string) => {
    if (!dataRef.current) return;
    const cell = dataRef.current.cells[offset]?.[agentIdx];
    if (!cell) {
      setSaveError('Cellule introuvable pour ce jour.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await saveCellValue(cell.sheetRow, cell.dispoCol, value);
      setData(prev => {
        if (!prev) return prev;
        const newCells = { ...prev.cells, [offset]: { ...prev.cells[offset], [agentIdx]: { ...cell, dispo: value } } };
        return { ...prev, cells: newCells, stats: computeStats(prev.agents, newCells) };
      });
    } catch (e: any) {
      setSaveError(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }, []);

  const updateAffect = useCallback(async (offset: number, agentIdx: number, value: string) => {
    if (!dataRef.current) return;
    const cell = dataRef.current.cells[offset]?.[agentIdx];
    if (!cell) {
      setSaveError('Cellule introuvable pour ce jour.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await saveCellValue(cell.sheetRow, cell.affectCol, value);
      setData(prev => {
        if (!prev) return prev;
        const newCells = { ...prev.cells, [offset]: { ...prev.cells[offset], [agentIdx]: { ...cell, affect: value } } };
        return { ...prev, cells: newCells, stats: computeStats(prev.agents, newCells) };
      });
    } catch (e: any) {
      setSaveError(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }, []);

  return { data, loading, error, saving, saveError, refresh, updateDispo, updateAffect };
}