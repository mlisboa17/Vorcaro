# Preparação — Sprint 6: Planejamento Financeiro Inteligente

Documento de handoff (Sprint 5.5). Define escopo, reuso e entregáveis **sem alterar código nesta etapa**.

---

## Objetivo da Sprint 6

Permitir que o usuário defina **metas financeiras** com projeção determinística (prazo, aporte necessário, viabilidade no fluxo de caixa), recomendações estáticas e integração com o Advisor e o dashboard executivo.

---

## O que já existe (base técnica)

| Componente | Local | Uso na Sprint 6 |
|------------|-------|-----------------|
| **CashflowProjectionService** | `src/modules/cashflow` | Cenário C — viabilidade de caixa |
| **FinancialAdvisorService** | `src/modules/financial-advisor` | Contexto conversacional com metas |
| **FinancialDataAggregatorService** | idem | Injetar metas no markdown |
| **Dashboard Executivo** | `src/modules/executive-dashboard` + `/dashboard` | Bloco compacto de planejamento |
| **Patrimônio / Passivos** | `src/modules/patrimony` | Recomendação `DEBT_SETTLEMENT` |
| **Consórcios** | `src/modules/consortium` | Contexto patrimonial (indireto) |
| **Transações** | `src/modules/transactions` | Média de despesas para reserva de emergência |
| **Multitenancy Auth.js** | todas as rotas | `session.user.id` exclusivo |
| **Decimal Prisma** | schema | Valores monetários das metas |

---

## O que será reutilizado

1. **Fluxo de caixa** — `buildCashflowProjectionService(prisma).execute(userId)` para margem mensal e alertas.
2. **Advisor** — agregador + prompt conversacional; metas como nova fonte `metas_planejamento`.
3. **Dashboard executivo** — estender DTO com snapshot `planning` (metas ativas, mais próxima, mais atrasada).
4. **Padrão de API** — rotas finas + Zod em `src/types` + factory em `src/lib/api`.
5. **UI** — Tailwind alinhado a `settings`, `advisor`, `executive-dashboard` (sem shadcn obrigatório).

---

## O que será criado

### Prisma

- Modelo **`FinancialGoal`**
- Enums: `FinancialGoalType`, `GoalPriority`, `GoalStatus`
- Migration dedicada (sem `db push` em produção)

### Motor (`src/modules/financial-planning`)

| Serviço | Responsabilidade |
|---------|------------------|
| **FinancialGoalProjectionService** | Cenário A: aporte → meses/data; B: data → aporte; C: viabilidade + `statusVisual` |
| **FinancialGoalRecommendationService** | Reserva 6× despesas; passivos com juros → HIGH |
| **FinancialPlanningService** | CRUD, listagem com projeção, resumo executivo |

### APIs

- `GET/POST /api/planning/goals`
- `PATCH/DELETE /api/planning/goals/[id]`

### UI

- `/dashboard/planning` — cards analíticos, tabela com progresso, indicadores No ritmo / Atenção / Atrasada
- Sidebar: item Planejamento
- Card no dashboard executivo

### Integração

- Export **`getFinancialGoalsForUser(userId)`** para Telegram futuro
- Testes em `src/modules/financial-planning/__tests__/`

---

## Equações determinísticas (referência)

**Cenário A (aporte informado):**

- `mesesRestantes = ceil((valorObjetivo - valorAtual) / aporteMensal)`
- `dataEstimada = hoje + mesesRestantes`

**Cenário B (data informada):**

- `meses = diferença em meses entre hoje e dataObjetivo`
- `aporteNecessario = (valorObjetivo - valorAtual) / meses`

**Cenário C (viabilidade):**

- Comparar aporte planejado com margem derivada da projeção de caixa (ex.: delta 30 dias).
- `statusVisual`: `ATRASADA` | `ATENCAO` | `NO_RITMO`

Cálculos internos em **centavos inteiros**; persistência em `Decimal`.

---

## Critérios de aceite

- [ ] Nenhum endpoint aceita `userId` do frontend
- [ ] Projeção não inventa dados fora do Prisma + cashflow
- [ ] Testes: meses, aporte, ownership, fluxo insuficiente
- [ ] `npx prisma validate && npx tsc --noEmit && npm test -- --run` verdes
- [ ] README e CHANGELOG atualizados na entrega da Sprint 6

---

## Dependências entre tarefas (ordem sugerida)

1. Schema + migration  
2. Projection + recommendation services  
3. Planning service + APIs  
4. UI planning + card executivo  
5. Advisor context + export Telegram  
6. Testes + documentação Sprint 6  

---

## Referências

- Especificação original: prompt Sprint 6 no backlog do projeto
- Inventário atual: `docs/project-state.md`, `docs/api-inventory.md`, `docs/database-inventory.md`
