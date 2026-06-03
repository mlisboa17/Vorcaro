# Plano Advisor — Parcelamentos (Sprint 7)

**Escopo:** documentação apenas. Sem alteração em `FinancialAdvisorService`.

---

## Estado atual

| Componente | Comportamento |
|------------|---------------|
| `FinancialAdvisorService.ask` | Agrega contexto via `FinancialDataAggregatorService` |
| `FinancialDataAggregatorService` | Transações recentes (40), consórcios, metas, cashflow — **sem bloco de parcelamentos** |
| `FinancialInsightsService` | Insight de consórcio com parcelas restantes — **não** cartão/compra parcelada |

---

## Perguntas alvo (Sprint 7)

| Pergunta do usuário | Dados necessários (determinísticos) |
|---------------------|-----------------------------------|
| Quantas parcelas faltam? | Por grupo: `totalParcelas - max(numeroParcela das pagas)` ou contagem de txs futuras |
| Quanto já paguei? | Soma `amount` onde `numeroParcela` ≤ parcela atual ou `date` ≤ hoje |
| Quanto ainda devo? | Soma parcelas com `dataCaixa` / `dataVencimentoFatura` > hoje |
| Qual meu comprometimento futuro? | Soma parcelas futuras 30/60/90d (alinhar cashflow) |
| Quais parcelamentos vencem este mês? | Filtro por mês em `dataVencimentoFatura` ou `dataCaixa` |

---

## Plano de integração (futuro)

### 1. Novo serviço de leitura

`InstallmentQueryService.getAdvisorContext(userId)` retorna:

```typescript
{
  totalPlans: number;
  totalRemainingCents: number;
  totalPaidCents: number;
  dueThisMonthCents: number;
  topPlans: Array<{
    description: string;
    cardName?: string;
    paidInstallments: number;
    totalInstallments: number;
    remainingCents: number;
  }>;
}
```

### 2. Agregador

Em `FinancialDataAggregatorService.aggregate`:

- `usedSources.push("parcelamentos")`
- Seção markdown `## Parcelamentos (cartão e compras)`
- Bullets com valores reais (nunca estimativa IA)

### 3. Prompt (`ADVISOR_SYSTEM_PROMPT`)

- Instruir uso do bloco parcelamentos
- Tom: "Das 12 parcelas da compra X, você já pagou 4; restam 8, com cerca de R$ Y comprometidos nos próximos meses."

### 4. Confiança (`dataScore`)

- +2 se houver ≥1 plano ativo com grupo válido
- LOW confidence se usuário perguntar parcelas e bloco vazio

### 5. Insights estáticos (`FinancialInsightsService`)

- Regra: parcelamento com vencimento no mês corrente > X% da margem 30d → WARNING

---

## Restrições

- IA **não** calcula parcelas; só narra dados do serviço de parcelamentos.
- Consórcio e financiamento mantêm blocos separados para evitar confusão.
