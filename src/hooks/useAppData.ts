import { useState, useCallback } from 'react';
import { loadAgents, loadSaisonData, parseSaisonData, saveCellValue } from '../lib/sheets';
import { daysBetween, SAISON_START, todayOffset } from '../lib/dateUtils';
import type { Agent, CellMap, GardeMap, AgentStats } from '../lib/types';

export interface AppData {
  agents:  Agent[];
  cells:   CellMap;
  gardes:  GardeMap;
  stats:   Record<number, AgentStats>;
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

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const agents = await loadAgents();
      const rows   = await loadSaisonData();
      const { cells, gardes } = parseSaisonData(rows, agents);
      const stats  = computeStats(agents, cells);
      setData({ agents, cells, gardes, stats });
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDispo = useCallback(async (offset: number, agentIdx: number, value: string) => {
    if (!data) return;
    const cell = data.cells[offset]?.[agentIdx];
    if (!cell) {
      setSaveError('Cellule introuvable pour ce jour. Vérifie que la feuille est bien formatée.');
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
  }, [data]);

  const updateAffect = useCallback(async (offset: number, agentIdx: number, value: string) => {
    if (!data) return;
    const cell = data.cells[offset]?.[agentIdx];
    if (!cell) {
      setSaveError('Cellule introuvable pour ce jour. Vérifie que la feuille est bien formatée.');
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
  }, [data]);

  return { data, loading, error, saving, saveError, refresh, updateDispo, updateAffect };
}
