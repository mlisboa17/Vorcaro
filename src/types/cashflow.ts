export type CashflowEventOrigin =
  | "RECEITA"
  | "DESPESA"
  | "RECORRENCIA"
  | "FATURA"
  | "FINANCIAMENTO"
  | "CONSORCIO"
  | "INSTALLMENT"
  | "RECEIVABLE";

export type CashflowAlertType =
  | "CAIXA_NEGATIVO"
  | "CONCENTRACAO_DESPESAS"
  | "EXCESSO_COMPROMISSOS";

export interface CashflowProjectionEventDto {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  origem: CashflowEventOrigin;
}

export interface CashflowProjectionAlertDto {
  tipo: CashflowAlertType;
  mensagem: string;
  gravidade: "CRITICAL" | "WARNING" | "INFO";
}

export interface CashFlowProjectionDTO {
  saldoAtual: number;
  previsao7Dias: number;
  previsao30Dias: number;
  previsao60Dias: number;
  previsao90Dias: number;
  previsao180Dias: number;
  previsao365Dias: number;
  primeiraDataNegativa: string | null;
  eventos: CashflowProjectionEventDto[];
  alertas: CashflowProjectionAlertDto[];
}

