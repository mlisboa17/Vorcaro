# Plano Fluxo de Caixa — Parcelamentos (Sprint 7)

**Arquivo central:** `src/modules/cashflow/application/services/cashflow-projection.service.ts`

---

## Comportamento atual

| Fonte | Como entra na projeção |
|-------|------------------------|
| Transações futuras | `dataCaixa` ou `date`; cartão com `dataVencimentoFatura` → `origem: FATURA` |
| Recorrências | `RECORRENCIA` / `FINANCIAMENTO` |
| Consórcios | `CONSORCIO` (parcelas futuras calculadas) |
| Passivos | Via transações/recorrências com `liabilityId` |

**Parcelas de cartão:** cada parcela já é uma `Transaction` com vencimento na fatura; o cashflow **não** agrupa por plano `3/12`.

**Horizontes expostos:** 7, 30, 60, 90, 180, 365 dias (`previsao*Dias`).

---

## Como parcelamentos devem alimentar horizontes (Sprint 7)

### Opção A — Manter modelo atual (mínimo)

- Nenhuma mudança estrutural: parcelas já estão nas transações.
- Central apenas **valida** totais vs cashflow (auditoria).

### Opção B — Eventos explícitos `PARCELA` (recomendado)

- Para cada parcela futura do plano:
  - `origem: "PARCELA"` (novo enum em `CashflowEventOrigin`)
  - `id: parcela-{transactionId}`
  - `data: dataVencimentoFatura ?? dataCaixa`
- Fatura agregada opcional permanece para visão de cartão.

### Opção C — Dupla contagem (evitar)

- Não emitir `FATURA` e `PARCELA` para o mesmo valor na mesma data.

---

## Algoritmo proposto (Opção B)

```
1. InstallmentAggregationService.listFutureInstallments(userId, until+365d)
2. Para cada parcela futura:
     events.push({ origem: PARCELA, valor, data })
3. Transações cartão sem grupo continuam como FATURA
4. Recalcular saldos por horizonte (função existente)
```

---

## Alertas futuros sugeridos

| Alerta | Condição |
|--------|----------|
| `PARCELAMENTO_CONCENTRADO` | >40% despesas 30d são parcelas |
| `PARCELA_VENCENDO` | parcelas do mês > margem livre |

Integrar em `buildAlerts` junto a `CAIXA_NEGATIVO`, `CONCENTRACAO_DESPESAS`, `EXCESSO_COMPROMISSOS`.

---

## Testes (Sprint 7)

- Parcela 3/12 futura aparece em `previsao90Dias`
- Sem duplicar valor na mesma data (fatura vs parcela)
- Consórcio e parcela cartão coexistem sem somar errado
