export type SettingsTab =
  | "categorias"
  | "contas"
  | "cartoes"
  | "formas"
  | "recorrentes"
  | "orcamentos"
  | "ativos"
  | "passivos"
  | "consorcios"
  | "integracoes";

export const SETTINGS_TABS: { value: SettingsTab; label: string; enabled: boolean }[] = [
  { value: "categorias", label: "Categorias", enabled: true },
  { value: "contas", label: "Contas Financeiras", enabled: true },
  { value: "cartoes", label: "Cartões", enabled: true },
  { value: "formas", label: "Formas de Pagamento", enabled: true },
  { value: "recorrentes", label: "Lançamentos Recorrentes", enabled: true },
  { value: "orcamentos", label: "Orçamentos", enabled: false },
  { value: "ativos", label: "Ativos / Patrimônio", enabled: true },
  { value: "passivos", label: "Passivos / Dívidas", enabled: true },
  { value: "consorcios", label: "Consórcios", enabled: true },
  { value: "integracoes", label: "Integrações", enabled: false },
];

export function isSettingsTab(value: string | null): value is SettingsTab {
  return SETTINGS_TABS.some((tab) => tab.value === value);
}

export type ToastMessage = {
  id: string;
  type: "success" | "error";
  text: string;
};
