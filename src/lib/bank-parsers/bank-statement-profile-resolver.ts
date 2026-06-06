import type { BankProfile } from "./bank-statement-parser.types";

const PF_MARKERS: RegExp[] = [
  /\bcpf\b/i,
  /\btitular\b/i,
  /nome\s+do\s+cliente/i,
  /pessoa\s+f[ií]sica/i,
  /conta\s+corrente\s+pf/i,
  /cliente\s+pessoa\s+f[ií]sica/i,
];

const PJ_MARKERS: RegExp[] = [
  /\bcnpj\b/i,
  /raz[aã]o\s+social/i,
  /conta\s+empresarial/i,
  /conta\s+pj\b/i,
  /\bempresarial\b/i,
  /cooperado\s+pj/i,
  /extrato\s+empresarial/i,
  /pessoa\s+jur[ií]dica/i,
  /inter\s+empresas/i,
];

const PROFILE_HEADER_LINES = 25;

function profileHeaderText(text: string): string {
  return text.split("\n").slice(0, PROFILE_HEADER_LINES).join("\n");
}

export function countProfileMarkerHits(text: string, markers: RegExp[]): number {
  const header = profileHeaderText(text);
  return markers.reduce((count, marker) => (marker.test(header) ? count + 1 : count), 0);
}

export function hasPjLayoutSignals(text: string): boolean {
  return countProfileMarkerHits(text, PJ_MARKERS) > 0;
}

export function hasPfLayoutSignals(text: string): boolean {
  return countProfileMarkerHits(text, PF_MARKERS) > 0;
}

export function resolveBankProfile(text: string): BankProfile {
  const pjScore = countProfileMarkerHits(text, PJ_MARKERS);
  const pfScore = countProfileMarkerHits(text, PF_MARKERS);

  if (pjScore > pfScore && pjScore >= 1) return "PJ";
  if (pfScore > pjScore && pfScore >= 1) return "PF";
  if (pjScore >= 2) return "PJ";
  if (pfScore >= 2) return "PF";
  return "UNKNOWN";
}

export class BankStatementProfileResolver {
  resolve(text: string): BankProfile {
    return resolveBankProfile(text);
  }
}

export const defaultBankStatementProfileResolver = new BankStatementProfileResolver();
