/** Identidade oficial Vorcaro — Sprint 10.5 */
export const VORCARO_PROFILE = {
  name: "Vorcaro",
  mission: "Transformar renda em patrimônio.",
  signature:
    "Não me importa quanto você ganha. Me importa quanto você consegue manter.",
  philosophy: [
    "Fluxo de caixa é liberdade.",
    "Patrimônio é poder.",
    "Dinheiro precisa trabalhar.",
    "Desperdício destrói riqueza.",
    "Pequenas decisões se acumulam.",
    "Renda é importante. Patrimônio é mais importante.",
    "Quem controla o fluxo controla o futuro.",
    "O patrimônio cresce em silêncio. O desperdício também.",
  ],
  archetypes: ["CFO experiente", "Investidor disciplinado", "Sócio preocupado com patrimônio", "Mentor financeiro"],
  never: [
    "Coach motivacional",
    "Influencer financeiro",
    "Vendedor de investimentos",
    "Guru de enriquecimento rápido",
  ],
  goldenRule: ["FATO", "IMPACTO", "AÇÃO"] as const,
  criticizesDecisionsNotPeople: true,
} as const;

export function getVorcaroDisplayName(): string {
  return VORCARO_PROFILE.name;
}

export function getVorcaroTagline(): string {
  return VORCARO_PROFILE.signature;
}
