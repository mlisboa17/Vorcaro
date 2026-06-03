# Inventário de APIs — Vorcaro Finance Control

Convenções:

- **Auth:** Obrigatório = sessão Auth.js (`session.user.id`), exceto onde indicado.
- **Multitenancy:** `userId` nunca é aceito no body/query para escopo de dados.

Total de **operações HTTP documentadas: 61** (rotas únicas; métodos listados separadamente).

---

## Auth

### `GET|POST` — `/api/auth/[...nextauth]`

**Descrição:** Handlers Auth.js (login, callback, sessão).  
**Auth:** Público / fluxo OAuth.

---

## Advisor (IA Financeira)

### `POST` — `/api/advisor/ask`

**Descrição:** Pergunta livre ao consultor financeiro; agrega contexto Prisma + fallback de provedores IA.  
**Auth:** Obrigatório.  
**Body:** `{ question: string }` — **sem** `userId`.

### `GET` — `/api/advisor/insights`

**Descrição:** Insights estáticos e texto gerado por IA a partir do contexto do usuário.  
**Auth:** Obrigatório.

---

## Cashflow

### `GET` — `/api/cashflow/projection`

**Descrição:** Projeção de saldo (7–365 dias), eventos e alertas.  
**Auth:** Obrigatório.

---

## Compromissos Recorrentes (Sprint 8)

### `GET` — `/api/commitments/monthly`

**Descrição:** Read model mensal de compromissos (saídas, entradas, vencidos, por origem).  
**Auth:** Obrigatório.  
**Query:** `month=YYYY-MM` (opcional; padrão mês corrente).  
**Resposta:** `{ month, totalOutflows, totalInflows, netCommitment, commitmentsCount, overdueCount, next7DaysCount, byOrigin, items }`.

---

## Configuração (Cadastros)

### `GET` — `/api/config/contas`

**Descrição:** Lista contas financeiras do usuário.  
**Auth:** Obrigatório.

### `POST` — `/api/config/contas`

**Descrição:** Cria conta financeira.  
**Auth:** Obrigatório.

### `PATCH` — `/api/config/contas/[id]`

**Descrição:** Atualiza conta.  
**Auth:** Obrigatório.

### `DELETE` — `/api/config/contas/[id]`

**Descrição:** Desativa/remove conta (conforme use case).  
**Auth:** Obrigatório.

### `GET` — `/api/config/cartoes`

**Descrição:** Lista cartões.  
**Auth:** Obrigatório.

### `POST` — `/api/config/cartoes`

**Descrição:** Cria cartão.  
**Auth:** Obrigatório.

### `PATCH` — `/api/config/cartoes/[id]`

**Descrição:** Atualiza cartão.  
**Auth:** Obrigatório.

### `DELETE` — `/api/config/cartoes/[id]`

**Descrição:** Remove/desativa cartão.  
**Auth:** Obrigatório.

### `GET` — `/api/config/categorias`

**Descrição:** Lista categorias.  
**Auth:** Obrigatório.

### `POST` — `/api/config/categorias`

**Descrição:** Cria categoria.  
**Auth:** Obrigatório.

### `PATCH` — `/api/config/categorias/[id]`

**Descrição:** Atualiza categoria.  
**Auth:** Obrigatório.

### `DELETE` — `/api/config/categorias/[id]`

**Descrição:** Remove categoria.  
**Auth:** Obrigatório.

### `GET` — `/api/config/formas-pagamento`

**Descrição:** Lista formas de pagamento.  
**Auth:** Obrigatório.

### `POST` — `/api/config/formas-pagamento`

**Descrição:** Cria forma de pagamento.  
**Auth:** Obrigatório.

### `PATCH` — `/api/config/formas-pagamento/[id]`

**Descrição:** Atualiza forma de pagamento.  
**Auth:** Obrigatório.

### `DELETE` — `/api/config/formas-pagamento/[id]`

**Descrição:** Remove forma de pagamento.  
**Auth:** Obrigatório.

### `GET` — `/api/config/lancamentos-recorrentes`

**Descrição:** Lista recorrências.  
**Auth:** Obrigatório.

### `POST` — `/api/config/lancamentos-recorrentes`

**Descrição:** Cria recorrência.  
**Auth:** Obrigatório.

### `PATCH` — `/api/config/lancamentos-recorrentes/[id]`

**Descrição:** Atualiza recorrência.  
**Auth:** Obrigatório.

### `DELETE` — `/api/config/lancamentos-recorrentes/[id]`

**Descrição:** Remove/desativa recorrência.  
**Auth:** Obrigatório.

---

## Consórcios

### `GET` — `/api/consortiums`

**Descrição:** Lista consórcios do usuário.  
**Auth:** Obrigatório.

### `POST` — `/api/consortiums`

**Descrição:** Cria consórcio.  
**Auth:** Obrigatório.

### `PATCH` — `/api/consortiums/[id]`

**Descrição:** Atualiza consórcio.  
**Auth:** Obrigatório.

### `DELETE` — `/api/consortiums/[id]`

**Descrição:** Remove consórcio.  
**Auth:** Obrigatório.

---

## Dashboard executivo

### `GET` — `/api/executive-dashboard`

**Descrição:** Payload consolidado (caixa, mês, orçamento, patrimônio, consórcios, alertas, planejamento quando habilitado).  
**Auth:** Obrigatório.

---

## Catálogo / legado

### `GET` — `/api/finance/catalog`

**Descrição:** Catálogo financeiro auxiliar.  
**Auth:** Obrigatório.

### `GET` — `/api/financial-accounts`

**Descrição:** Lista contas (rota legada).  
**Auth:** Obrigatório.

### `POST` — `/api/financial-accounts`

**Descrição:** Cria conta (rota legada).  
**Auth:** Obrigatório.

### `GET` — `/api/cards`

**Descrição:** Lista cartões (rota legada).  
**Auth:** Obrigatório.

### `POST` — `/api/cards`

**Descrição:** Cria cartão (rota legada).  
**Auth:** Obrigatório.

### `PUT` — `/api/cards`

**Descrição:** Atualização em lote de cartões (legado).  
**Auth:** Obrigatório.

### `GET` — `/api/payment-methods`

**Descrição:** Formas de pagamento (legado).  
**Auth:** Obrigatório.

### `POST` — `/api/payment-methods`

**Descrição:** Cria forma de pagamento (legado).  
**Auth:** Obrigatório.

---

## Inbox (Caixa Financeira)

### `GET` — `/api/inbox`

**Descrição:** Lista itens da caixa (filtros por status).  
**Auth:** Obrigatório.

### `POST` — `/api/inbox`

**Descrição:** Ingere novo item (texto/mídia).  
**Auth:** Obrigatório.

### `GET` — `/api/inbox/[id]`

**Descrição:** Detalhe de um item.  
**Auth:** Obrigatório.

### `POST` — `/api/inbox/[id]/confirm`

**Descrição:** Confirma item e cria transação(ões).  
**Auth:** Obrigatório.

### `POST` — `/api/inbox/bulk-update`

**Descrição:** Atualização em lote de itens.  
**Auth:** Obrigatório.

### `POST` — `/api/inbox/import`

**Descrição:** Upload de arquivo para importação.  
**Auth:** Obrigatório.

### `POST` — `/api/inbox/import/preview`

**Descrição:** Preview de linhas importadas.  
**Auth:** Obrigatório.

### `POST` — `/api/inbox/import/confirm`

**Descrição:** Confirma importação em lote.  
**Auth:** Obrigatório.

---

## Aprendizado / regras

### `GET` — `/api/rules`

**Descrição:** Lista regras do usuário.  
**Auth:** Obrigatório.

### `POST` — `/api/rules`

**Descrição:** Cria regra.  
**Auth:** Obrigatório.

### `DELETE` — `/api/rules/[id]`

**Descrição:** Remove regra.  
**Auth:** Obrigatório.

### `DELETE` — `/api/learning-patterns/[id]`

**Descrição:** Remove padrão de aprendizado.  
**Auth:** Obrigatório.

---

## Patrimônio

### `GET` — `/api/patrimony/assets`

**Descrição:** Lista ativos.  
**Auth:** Obrigatório.

### `POST` — `/api/patrimony/assets`

**Descrição:** Cria ativo.  
**Auth:** Obrigatório.

### `PATCH` — `/api/patrimony/assets/[id]`

**Descrição:** Atualiza ativo.  
**Auth:** Obrigatório.

### `DELETE` — `/api/patrimony/assets/[id]`

**Descrição:** Remove ativo.  
**Auth:** Obrigatório.

### `GET` — `/api/patrimony/liabilities`

**Descrição:** Lista passivos.  
**Auth:** Obrigatório.

### `POST` — `/api/patrimony/liabilities`

**Descrição:** Cria passivo.  
**Auth:** Obrigatório.

### `PATCH` — `/api/patrimony/liabilities/[id]`

**Descrição:** Atualiza passivo.  
**Auth:** Obrigatório.

### `DELETE` — `/api/patrimony/liabilities/[id]`

**Descrição:** Remove passivo.  
**Auth:** Obrigatório.

### `GET` — `/api/patrimony/summary`

**Descrição:** Resumo patrimonial (ativos, passivos, PL).  
**Auth:** Obrigatório.

### `POST` — `/api/patrimony/transactions/valuation`

**Descrição:** Movimentação de valorização de ativo.  
**Auth:** Obrigatório.

### `POST` — `/api/patrimony/transactions/investment`

**Descrição:** Aporte/resgate em investimento.  
**Auth:** Obrigatório.

### `POST` — `/api/patrimony/transactions/financing-payment`

**Descrição:** Pagamento/amortização de financiamento.  
**Auth:** Obrigatório.

### `POST` — `/api/patrimony/transactions/consortium-parcel`

**Descrição:** Parcela de consórcio.  
**Auth:** Obrigatório.

### `POST` — `/api/patrimony/transactions/consortium-contemplation`

**Descrição:** Contemplação de consórcio.  
**Auth:** Obrigatório.

---

## Planejamento (Sprint 6 — escopo)

### `GET` — `/api/planning/goals`

**Descrição:** Lista metas com projeção, resumo e recomendações.  
**Auth:** Obrigatório.

### `POST` — `/api/planning/goals`

**Descrição:** Cria meta financeira.  
**Auth:** Obrigatório.

### `PATCH` — `/api/planning/goals/[id]`

**Descrição:** Atualiza meta.  
**Auth:** Obrigatório.

### `DELETE` — `/api/planning/goals/[id]`

**Descrição:** Cancela meta (soft: status `CANCELLED`).  
**Auth:** Obrigatório.

---

## Parcelamentos (Sprint 7 — Fase 1 Read Model)

### `GET` — `/api/installments`

**Descrição:** Lista grupos de parcelamento (`InstallmentGroupDto[]`) agregados de `Transaction`.  
**Auth:** Obrigatório (`session.user.id`).  
**Migration:** Nenhuma nesta fase.

### `GET` — `/api/installments/[groupId]`

**Descrição:** Detalhe do grupo: resumo + parcelas ordenadas por `numeroParcela` com status `PAID` | `OPEN` | `OVERDUE`.  
**Auth:** Obrigatório (`decodeURIComponent` no `groupId`).  
**403:** Grupo pertence a outro usuário.  
**404:** Grupo inexistente ou sem parcelas válidas.

**Resposta executiva (via `GET /api/executive-dashboard`):** campo `installments` com snapshot agregado.

---

## Transações

### `GET` — `/api/transactions`

**Descrição:** Lista transações (filtros/paginação).  
**Auth:** Obrigatório.

### `POST` — `/api/transactions`

**Descrição:** Cria transação.  
**Auth:** Obrigatório.

### `GET` — `/api/transactions/ids`

**Descrição:** IDs para seleção em massa.  
**Auth:** Obrigatório.

### `PATCH` — `/api/transactions/[id]`

**Descrição:** Atualização parcial.  
**Auth:** Obrigatório.

### `PUT` — `/api/transactions/[id]`

**Descrição:** Atualização completa.  
**Auth:** Obrigatório.

### `DELETE` — `/api/transactions/[id]`

**Descrição:** Estorno/remoção conforme regra.  
**Auth:** Obrigatório.

### `PATCH` — `/api/transactions/bulk-update`

**Descrição:** Edição em massa.  
**Auth:** Obrigatório.

### `POST` — `/api/transactions/bulk-delete`

**Descrição:** Exclusão em massa.  
**Auth:** Obrigatório.

### `POST` — `/api/transactions/recurring/process`

**Descrição:** Processa recorrências vencidas.  
**Auth:** Obrigatório.

---

## Telegram

### `POST` — `/api/telegram/webhook`

**Descrição:** Webhook oficial do Bot API.  
**Auth:** Header `X-Telegram-Bot-Api-Secret-Token` = `TELEGRAM_WEBHOOK_SECRET`.

### `GET` — `/api/telegram/integration`

**Descrição:** Status da integração Telegram do usuário.  
**Auth:** Obrigatório.

### `POST` — `/api/telegram/integration`

**Descrição:** Gera código `/connect`.  
**Auth:** Obrigatório.

### `DELETE` — `/api/telegram/integration`

**Descrição:** Desvincula Telegram.  
**Auth:** Obrigatório.

### `POST` — `/api/webhooks/telegram`

**Descrição:** Rota legada (delega ao webhook; auth por `?token=`).  
**Auth:** Token na query.

---

## Índice por método

| Método | Quantidade |
|--------|------------|
| GET | 18 |
| POST | 28 |
| PATCH | 9 |
| PUT | 2 |
| DELETE | 11 |
| **Total** | **58** |
