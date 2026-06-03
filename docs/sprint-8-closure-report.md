# Relatório Sprint 8 — Central de Compromissos Recorrentes

Data: 2026-06-03  
Tag: `sprint-8-stable`

---

## Sprint 8 Status

```
CONCLUÍDA
```

---

## Entregas

| Área | Entrega |
|------|---------|
| **Read model** | `MonthlyCommitment` DTO + `MonthlyCommitmentsService` |
| **Helpers** | `commitment-projection.helpers.ts` (projeção recorrências, parcela passivo, dedup) |
| **API** | `GET /api/commitments/monthly?month=YYYY-MM` |
| **UI** | `/dashboard/commitments` — cards, tabela, filtros |
| **Executivo** | `ExecutiveCommitmentsCard` integrado |
| **Advisor** | Seção `## Compromissos do mês` (`compromissos_recorrentes`) |
| **Sidebar** | Item "Compromissos Recorrentes" |

---

## Fontes de dados

1. **Recorrências** — todas ocorrências do mês (semanal, quinzenal, mensal, bimestral, etc.)
2. **Parcelamentos** — `InstallmentReadModelService.getFutureCommitments`
3. **Passivos** — parcela mensal estimada (saldo ÷ meses até quitação); omitidos se já houver recorrência vinculada
4. **Consórcios** — `buildConsortiumParcelDates` + `computeParcelValue`
5. **CREDIT_CARD** — faturas agregadas por cartão + vencimento
6. **RECEIVABLE** — contas a receber com `expectedDate` no mês
7. **Transações agendadas** — futuras sem fatura/parcela/financiamento duplicado

---

## Deduplicação mínima segura

**Regra:** remover itens com mesma chave `(descrição normalizada + data + valor em centavos)`.

**Prioridade de inserção:** RECURRENCE/LIABILITY recorrente → INSTALLMENT → RECEIVABLE → CREDIT_CARD → CONSORTIUM → LIABILITY estimado.

**Limitação conhecida:** não elimina fatura consolidada vs parcela individual quando descrição/valor divergem.

---

## Endpoints

| Método | Rota | Auth |
|--------|------|------|
| GET | `/api/commitments/monthly?month=YYYY-MM` | Sessão (`session.user.id`) |

---

## Cobertura de testes

| Arquivo | Testes |
|---------|--------|
| `monthly-commitments.service.test.ts` | 11 |
| `commitment-projection.helpers.test.ts` | 4 |
| `route.test.ts` (API) | 3 |
| `financial-data-aggregator.commitments.test.ts` | 1 |
| **Total Sprint 8** | **19** |

Suite completa: **240/240** (2026-06-03).

---

## Validação técnica

| Comando | Resultado |
|---------|-----------|
| `npx prisma validate` | OK |
| `npx prisma generate` | OK |
| `npx prisma migrate status` | DB offline (Docker não disponível) — schema válido, sem migrations novas |
| `npx tsc --noEmit` | OK (0 erros) |
| `npm test -- --run` | **240/240 passed** |

---

## Riscos conhecidos

1. **Passivos sem recorrência** — parcela estimada por saldo ÷ meses restantes (aproximação).
2. **Deduplicação** — não cobre todos os casos fatura vs parcela.
3. **migrate status** — requer Docker/Postgres para confirmação em ambiente local.

---

## Sprint 7.5 — fechamento formal

| Item | Status |
|------|--------|
| Commit | `17adc80` |
| Tag | `sprint-7.5-stable` |
| Remote | `origin` → `https://github.com/mlisboa17/Vorcaro.git` |
