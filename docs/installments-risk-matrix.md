# Matriz de riscos — Central de Parcelamentos

Classificação: **CRÍTICO** | **ALTO** | **MÉDIO** | **BAIXO**

---

| Risco | Descrição | Prob. | Impacto | Classificação | Mitigação (Sprint 7) |
|-------|-----------|-------|---------|---------------|------------------------|
| **Duplicidade import + manual** | Mesma compra confirmada no inbox e reimportada no OFX/PDF | Alta | Alto | **CRÍTICO** | Hash por `FITID` + grupo + valor + data; flag duplicata na UI |
| **Duplicidade parcelas no cashflow** | Mesma parcela como `FATURA` e `PARCELA` | Média | Alto | **ALTO** | Regra única de emissão de eventos (ver `installments-cashflow-plan.md`) |
| **Identificação incorreta N/M** | `extractInstallments` falha em descrições atípicas | Alta | Médio | **ALTO** | Revisão humana na importação; confidence na preview |
| **Parcelas OFX** | Extrato traz parcela única sem grupo; descrição sem `3/12` | Alta | Médio | **ALTO** | Heurística + matching por valor/data com plano existente |
| **Parcelas PDF fatura** | Linhas da fatura vs compra parcelada (visões diferentes) | Média | Alto | **ALTO** | Separar fluxo "fatura fechada" vs "plano de compra" |
| **Parcelas manuais** | Usuário cria 1x sem grupo depois importa | Média | Médio | **MÉDIO** | Wizard obrigatório de parcelas no create; merge sugerido |
| **Nomenclatura dupla** | `numeroParcela` vs `currentInstallment` dessincronizados | Média | Médio | **MÉDIO** | Mapper canônico na central |
| **Impacto fluxo futuro** | Subestimar/overestimar comprometimento | Média | Alto | **ALTO** | Testes de regressão cashflow; golden files |
| **Advisor inventa parcelas** | LLM chuta quantidades | Baixa | Alto | **ALTO** | Só markdown determinístico; LOW se sem dados |
| **Consórcio vs cartão** | Usuário confunde parcelas | Média | Baixo | **BAIXO** | Labels claros na UI e no advisor |
| **Financiamento vs parcela cartão** | `liabilityId` misturado | Baixa | Médio | **MÉDIO** | Filtro `origem` na central |
| **Multitenancy** | Vazamento de grupo entre usuários | Baixa | Crítico | **CRÍTICO** | Sempre `userId` da sessão; testes ownership |
| **Performance** | Agregação N+1 em milhares de txs | Média | Médio | **MÉDIO** | Query agrupada SQL; índice em `installmentGroup` |

---

## Priorização de mitigação

1. CRÍTICO: dedupe + ownership  
2. ALTO: cashflow sem dupla contagem + advisor determinístico + OFX/PDF  
3. MÉDIO: normalização campos + financiamento vs cartão  
4. BAIXO: copy UX consórcio  

---

## Critérios de aceite de risco (go-live Sprint 7)

- [ ] Zero planos com parcelas duplicadas no mesmo vencimento (teste automatizado)
- [ ] Cashflow 30d bate com soma manual de parcelas futuras (amostra seed)
- [ ] Advisor nunca retorna contagem de parcelas sem bloco `parcelamentos` no contexto
