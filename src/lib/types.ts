export interface Agent {
  idx: number;
  name: string;
  email: string;
  soff: boolean;
  cond: boolean;
  admin: boolean;
}

export interface CurrentUser {
  email: string;
  name: string;
  picture: string;
  agentIdx: number;
  agentName: string;
  isSoff: boolean;
  isCond: boolean;
  isAdmin: boolean;
}

export interface CellData {
  dispo: string;      // '', 'J', 'M', 'AM'
  affect: string;
  sheetRow: number;
  dispoCol: number;
  affectCol: number;
}

// cells[dayOffset][agentIdx]
export type CellMap = Record<number, Record<number, CellData>>;
export type GardeMap = Record<number, string>;

export interface AgentStats {
  gardes: number;
  dispos: number;
  rate: number;
}

export type Tab = 'planning' | 'semaine' | 'equite' | 'dispos';
