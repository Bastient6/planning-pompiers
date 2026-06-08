import { CONFIG } from './config';

export const SAISON_START = new Date(CONFIG.SAISON_START);
export const SAISON_END   = new Date(CONFIG.SAISON_END);
export const MAX_OFFSET   = daysBetween(SAISON_START, SAISON_END);

const EQUIPE_SEQ    = ['E1', 'E2', 'E3', 'E4'] as const;
const EQUIPE_LABELS: Record<string, string> = { E1: 'Garde 1', E2: 'Garde 2', E3: 'Garde 3', E4: 'Garde 4' };

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function clampDate(d: Date): Date {
  if (d < SAISON_START) return new Date(SAISON_START);
  if (d > SAISON_END)   return new Date(SAISON_END);
  return d;
}

export function offsetToDate(offset: number): Date {
  const d = new Date(SAISON_START);
  d.setDate(d.getDate() + offset);
  return d;
}

export function todayOffset(): number {
  return daysBetween(SAISON_START, clampDate(new Date()));
}

/** Offset du lundi de la semaine contenant `offset` */
export function weekStart(offset: number): number {
  const d = offsetToDate(offset);
  const dow = (d.getDay() + 6) % 7; // lundi = 0
  return Math.max(0, offset - dow);
}

export function weekRangeLabel(wStart: number): string {
  const d1 = offsetToDate(wStart);
  const d2 = offsetToDate(Math.min(wStart + 6, MAX_OFFSET));
  const fmt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${d1.toLocaleDateString('fr-FR', fmt)} – ${d2.toLocaleDateString('fr-FR', fmt)}`;
}

export function getEquipe(offset: number, gardes: Record<number, string>): string {
  if (gardes[offset]) return gardes[offset];
  const startIdx = EQUIPE_SEQ.indexOf(CONFIG.EQUIPE_START as typeof EQUIPE_SEQ[number]);
  return EQUIPE_SEQ[(startIdx + offset) % 4];
}

export function equipeColor(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('1')) return 'eq-E1';
  if (l.includes('2')) return 'eq-E2';
  if (l.includes('3')) return 'eq-E3';
  if (l.includes('4')) return 'eq-E4';
  return 'eq-E1';
}

export function affectClass(affect: string): string {
  if (!affect) return '';
  const a = affect.toUpperCase();
  if (a.startsWith('GRR'))                        return 'af-grr';
  if (a.startsWith('AST') || a.startsWith('GIFF')) return 'af-ast';
  if (a.startsWith('VPF'))                        return 'af-vpf';
  if (a.includes('COND') || a.includes('CDG'))    return 'af-cond';
  return 'af-other';
}

export const DISPO_LABELS: Record<string, string> = { J: 'Journée', M: 'Matin', AM: 'Après-midi' };

export const TYPES_GARDE = [
  'GRR Journée', 'GRR Matin', 'GRR Après-midi',
  'AST Journée', 'AST Matin',
  'VPF', 'GFF', 'Cond. CDG',
];

export function colLetter(n: number): string {
  let s = '';
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function parseSheetDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return new Date(+m1[3], +m1[2] - 1, +m1[1]);
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) return new Date(+m2[1], +m2[2] - 1, +m2[3]);
  const num = parseFloat(s);
  if (!isNaN(num) && num > 40_000) {
    const d = new Date(Date.UTC(1899, 11, 30) + num * 86_400_000);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  return null;
}

export { EQUIPE_LABELS };
