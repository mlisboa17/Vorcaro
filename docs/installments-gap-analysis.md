# Gap Analysis — Central de Parcelamentos

## O que já existe?

| Capacidade | Onde | Maturidade |
|------------|------|------------|
| Criar compra parcelada (N lançamentos) | `CreditCardTransactionBuilderService` + `create-transaction` | Produção |
| Campos de grupo e número da parcela | `Transaction` (dupla nomenclatura EN/PT) | Produção |
| Vencimento por fatura de cartão | `dataVencimentoFatura`, cashflow `FATURA` | Produção |
| Detecção `N/M` em importação | `extractInstallments()` no pipeline | Parcial |
| Exibição parcela na tabela de extrato | `transaction-table.tsx` | Parcial |
| Consórcio parcelas | `Consortium` | Domínio separado |
| Financiamento parcelas | `PatrimonyLiability` + transações | Domínio separado |

---

## O que falta?

| Item | Descrição |
|------|-----------|
| **Central unificada** | Módulo/agregador que liste *planos* de parcelamento, não só linhas soltas |
| **API dedicada** | `GET /api/installments` (planos, resumo, filtros por cartão/categoria) |
| **UI `/dashboard/installments`** | Visão única solicitada na Sprint 7 |
| **Deduplicação** | Regras import vs manual vs inbox |
| **Advisor context** | Bloco determinístico de parcelamentos |
| **KPIs executivos** | Parcelado total, restante, comprometimento |
| **Integração metas** | Margem livre descontando parcelas futuras |
| **Modelo canônico** | Unificar `numeroParcela` vs `currentInstallment` |
| **Entidade opcional** | `InstallmentPlan` / `InstallmentSchedule` (decisão Sprint 7) |

---

## O que precisa ser criado? (Sprint 7 — escopo provável)

1. `src/modules/installments/` (nome sugerido)
   - `InstallmentAggregationService` — agrupa por `installmentGroup` / `idGrupoParcelamento`
   - `InstallmentSummaryService` — totais pagos, restantes, comprometimento
2. Rotas REST (auth + ownership)
3. Página dashboard + componentes
4. Extensões em:
   - `CashflowProjectionService` (eventos por parcela ou plano)
   - `FinancialDataAggregatorService`
   - `ExecutiveDashboardService` / DTO
5. Testes: agregação, ownership, dedupe, projeção

---

## O que pode ser reaproveitado?

| Ativo | Reuso |
|-------|--------|
| `Transaction` + índices | Fonte de verdade sem migration inicial (read model) |
| `CreditCardTransactionBuilderService` | Continua gerando parcelas na criação |
| `extractInstallments` | Normalização na importação |
| `CashflowProjectionService` | Padrão de timeline/eventos |
| `FinancialPlanningService` | Padrão de serviços em camadas |
| Padrão API `session.user.id` | Multitenancy |
| Testes Vitest + Zod DTOs | Template de qualidade |

---

## Estratégia recomendada (sem codar agora)

**Fase 1 — Read model:** agregar `Transaction` existente em planos por grupo.  
**Fase 2 — Integrações:** cashflow, advisor, executivo.  
**Fase 3 — UI + dedupe import.**  
**Fase 4 (opcional):** migration `InstallmentPlan` se read model for insuficiente.
