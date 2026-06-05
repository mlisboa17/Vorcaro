# Vorcaro Finance Control

Controle financeiro pessoal e patrimonial com **caixa de entrada inteligente**, lançamentos, recorrências, patrimônio, passivos, consórcios, fluxo de caixa projetado e dashboard executivo.

Repositório: [github.com/mlisboa17/Vorcaro](https://github.com/mlisboa17/Vorcaro)

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| App | [Next.js 15](https://nextjs.org/) (App Router) + React 19 |
| Linguagem | TypeScript (strict) |
| ORM / DB | [Prisma](https://www.prisma.io/) + PostgreSQL 16 |
| Auth | [Auth.js](https://authjs.dev/) (NextAuth v5) |
| Filas | BullMQ + Redis |
| IA (NLP / PDF) | Google Gemini |
| Testes | Vitest |
| UI | Tailwind CSS |

Arquitetura modular: **Domain → Application → Infrastructure → Web** (ports & adapters).

Documentação técnica consolidada: pasta [`docs/`](docs/) (inventários, arquitetura, APIs, banco, IA, handoff Sprint 6).

---

## Estado atual do projeto

| Sprint | Entrega | Status |
|--------|---------|--------|
| **4.5** | Rebaseline Prisma (`init_clean_schema`), migrations legadas arquivadas | Concluída |
| **4.6** | Inventário e rastreabilidade de migrations perdidas | Concluída |
| **4.7** | Integração Telegram (webhook, `/connect`, ingestão na Caixa) | Concluída |
| **5** | IA Financeira multi-provider (Groq → Gemini → OpenRouter), `/dashboard/advisor` | Concluída |
| **5.5** | Consolidação documental, inventários técnicos, handoff | Concluída |
| **6** | Planejamento Financeiro Inteligente (4 camadas: meta, estratégia, viabilidade, recomendação) | Concluída |
| **6.5** | Fechamento técnico + preparação Sprint 7 (Central de Parcelamentos) | Concluída |
| **7** | Central de Parcelamentos (read model + integrações) | Concluída |
| **7.5** | Contas a Receber e Reembolsos (ativo, cobrança, integrações) | Concluída |
| **8** | Central de Compromissos Recorrentes (read model mensal) | Concluída |
| **9** | Alertas Financeiros Inteligentes (motor persistido + dashboard) | Concluída |
| **9.5** | Consultor Financeiro Inteligente (ações, score, detectores) | Concluída |
| **10** | Central de Notificações Inteligentes (Dashboard, Telegram, digest) | Concluída |
| **10.5** | Identidade Vorcaro (tons, templates, anti-repetição) | Concluída |
| **11** | Vorcaro Conversacional (chat LOGOS + Telegram) | Concluída |
| **11.1** | Vorcaro Intent Engine e Tool Calling | Concluída |
| **12** | Memória Financeira Longitudinal | Concluída |
| **13** | Execução Assistida do Vorcaro (Assist → Confirm → Execute) | Concluída |
| **14** | Follow-up Inteligente e Pendências Ativas | Concluída |
| **14.5** | Homologação operacional (checklist + relatório) | Concluída |
| **14.6** | Estabilização pós-homologação (intent, Telegram, cache, senha) | Concluída |
| **14.7** | Homologação funcional E2E + hotfix Inbox 404 | Concluída |
| **14.8** | UX menu, hub Vorcaro, performance navegação, categorias base | Concluída |
| **14.9** | Auditoria inteligente de categorias (Vorcaro, API, dashboard) | Concluída |
| **14.9.3** | Humanização consultiva da auditoria (Health Score, top 5, memória de preferências) | Concluída |
| **14.9.2** | Auto-correção conversacional (context lock, critic, humanização) | Concluída |

Detalhes por módulo: [`docs/project-state.md`](docs/project-state.md).  
Sprint 14.9: [`docs/sprint-14.9-category-taxonomy-audit.md`](docs/sprint-14.9-category-taxonomy-audit.md).  
Sprint 14.9.3: [`docs/sprint-14.9.3-humanized-category-audit.md`](docs/sprint-14.9.3-humanized-category-audit.md).  
Sprint 14.9.2: [`docs/sprint-14.9.2-conversation-self-correction.md`](docs/sprint-14.9.2-conversation-self-correction.md).  
Sprint 13: [`docs/sprint-13-assisted-execution.md`](docs/sprint-13-assisted-execution.md).  
Sprint 11: [`docs/sprint-11-vorcaro-conversacional.md`](docs/sprint-11-vorcaro-conversacional.md).  
Fechamento Sprint 10: [`docs/sprint-10-closure-report.md`](docs/sprint-10-closure-report.md).  
Fechamento Sprint 9: [`docs/sprint-9-closure-report.md`](docs/sprint-9-closure-report.md).  
Sprint 9.5: [`docs/sprint-9.5-consultor-financeiro-inteligente.md`](docs/sprint-9.5-consultor-financeiro-inteligente.md).  
Fechamento Sprint 8: [`docs/sprint-8-closure-report.md`](docs/sprint-8-closure-report.md).  
Fechamento Sprint 7.5: [`docs/sprint-7.5-closure-report.md`](docs/sprint-7.5-closure-report.md).

---

## Módulos principais

- **Caixa Financeira (Inbox)** — ingestão por texto, voz, importação OFX/CSV/PDF
- **Extrato & Lançamentos** — CRUD, estorno, edição em massa
- **Cadastros** — categorias, contas, cartões, formas de pagamento
- **Lançamentos recorrentes** — geração e alocações padrão
- **Patrimônio** — ativos, passivos e movimentações patrimoniais
- **Consórcios** — parcelas, contemplação e vínculo com ativos
- **Fluxo de caixa futuro** — projeção com recorrências e consórcios
- **Dashboard executivo** — visão consolidada, orçamento e alertas
- **Planejamento financeiro** — metas, estratégia, viabilidade e recomendações
- **Central de Parcelamentos** — visão agregada de compras parceladas (read model)
- **Contas a Receber** — compras para terceiros, cobrança parcial/total e ativo no patrimônio
- **Compromissos Recorrentes** — visão mensal de saídas comprometidas, entradas previstas e vencimentos
- **IA Financeira (Advisor)** — perguntas com contexto agregado do banco
- **Cérebro & Automações** — regras e padrões de aprendizado (em evolução)

---

## Pré-requisitos

- **Node.js** 20+
- **npm** 10+
- **Docker** (PostgreSQL e Redis via `docker-compose`)

---

## Configuração rápida

### 1. Clonar e instalar

```bash
git clone https://github.com/mlisboa17/Vorcaro.git
cd Vorcaro
npm install
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env
```

Ajuste pelo menos:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Postgres — com `docker compose` use porta **5433** (ver abaixo) |
| `REDIS_URL` | Redis — com `docker compose` use porta **6380** |
| `AUTH_SECRET` | Segredo Auth.js (`openssl rand -base64 32`) |
| `AUTH_DEV_PASSWORD` | Senha do usuário de desenvolvimento |
| `GEMINI_API_KEY` | Opcional para NLP/PDF avançado |

Exemplo alinhado ao `docker-compose.yml` deste projeto:

```env
DATABASE_URL="postgresql://logos:logos_dev@localhost:5433/logos_financeiro?schema=public"
REDIS_URL="redis://localhost:6380"
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Infraestrutura local

```bash
npm run docker:up
```

| Serviço | Container | Porta no host |
|---------|-----------|---------------|
| PostgreSQL | `logos-postgres` | **5433** |
| Redis | `logos-redis` | **6380** |

### 4. Banco de dados

Baseline única após Sprint 4.6 (`init_clean_schema`):

```bash
npx prisma migrate deploy
npx prisma db seed
```

Desenvolvimento (cria/aplica migrations interativamente):

```bash
npm run db:migrate
npm run db:seed
```

### 5. Subir a aplicação

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000). Se a porta 3000 estiver ocupada, o Next.js pode usar **3001**.

**Login de desenvolvimento (seed):** `dev@logos.local` — senha definida em `AUTH_DEV_PASSWORD` (padrão no `.env.example`: `dev123`).

**Navegação (Sprint 14.8):** menu em blocos via `src/lib/navigation/dashboard-nav.ts`; hub Vorcaro em `/dashboard/vorcaro`. Categorias padrão via `seedCategoryTaxonomyForUser` (taxonomia em `src/lib/categories/vorcaro-category-taxonomy.ts`).

---

## Ambiente local com `dev:all`

Um único comando sobe Docker (Postgres + Redis), gera o Prisma Client se necessário, Next.js, worker da inbox, ngrok e registra o webhook do Telegram (sem expor tokens nos logs):

```bash
npm run dev:all
```

**Pré-requisitos:** Docker Desktop em execução, `TELEGRAM_BOT_TOKEN` e `TELEGRAM_WEBHOOK_SECRET` no `.env`, [ngrok](https://ngrok.com/download) no `PATH` (para o túnel público).

O script **não encerra** processos que já estejam rodando nas portas **3000**, **5433**, **6380** ou **4040** — apenas informa `OK — já em execução`.

Em pastas sincronizadas pelo **OneDrive**, há pausas curtas (~2,5s) entre etapas para o sync de arquivos (Prisma, `.next`, etc.). Ajuste no `.env`: `DEV_ONEDRIVE_PAUSE_MS=4000` ou desative com `DEV_ONEDRIVE_PAUSE_MS=0`.

O `dev:all` **apaga a pasta `.next` automaticamente** em caminhos OneDrive (evita erro `EINVAL readlink` e localhost que não abre). Para pular: `DEV_SKIP_CLEAN_NEXT=1`. Limpeza manual: `npm run dev:clean` e depois `npm run dev`.

Quando o ngrok reiniciar e a URL pública mudar, re-registre o webhook:

```bash
npm run telegram:webhook
# ou com URL explícita:
npm run telegram:webhook -- https://seu-tunnel.ngrok-free.dev
```

---

## Scripts úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev:all` | Ambiente local completo (Docker, Next, worker, ngrok, webhook) |
| `npm run telegram:webhook` | Re-registra webhook Telegram (usa ngrok em `localhost:4040`) |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run test` | Testes (Vitest) |
| `npm run db:studio` | Prisma Studio |
| `npm run docker:down` | Parar containers |
| `npm run worker:inbox` | Worker BullMQ da caixa |
| `npm run test:foundation` | Validação de fundação (script) |

---

## Migrations (Prisma)

- **Ativa:** `prisma/migrations/20260602152611_init_clean_schema/` — origem oficial do schema atual.
- **Arquivada:** `prisma/migrations_archived_legacy/` — histórico legado (P3015/P3009 resolvidos por rebaseline).
- **Inventário:** `docs/migrations-legacy-inventory.md` — checksums e rastreabilidade pré-reset.

Em ambiente novo:

```bash
npx prisma migrate status   # deve: 1 migration, schema up to date
npx prisma validate
npx prisma generate
```

Não use `prisma db push --accept-data-loss` como fluxo principal em ambientes compartilhados.

---

## Testes e qualidade

```bash
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm test -- --run
```

---

## Estrutura do projeto (resumo)

```
prisma/           # schema, migrations, seed
src/app/          # rotas Next.js (API + dashboard)
src/components/   # UI por domínio
src/modules/      # regras de negócio (DDD leve)
src/lib/          # adapters, parsers, helpers
docs/             # documentação técnica (ver docs/project-state.md)
backups/          # dumps locais (ignorado no Git)
```

---

## AI Providers (Sprint 5)

Pipeline de fallback no **Financial Advisor** (`/dashboard/advisor`):

**Groq (primário)** → **Gemini** → **OpenRouter** → erro controlado

| Variável | Uso |
|----------|-----|
| `GROQ_API_KEY` / `GROQ_MODEL` | Provedor primário |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Fallback |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | Fallback (padrão `openrouter/auto`) |

- `POST /api/advisor/ask` — pergunta livre (auth; `userId` só da sessão)
- `GET /api/advisor/insights` — regras estáticas + texto IA

A IA **não inventa dados**: se faltar contexto, retorna: *"Não encontrei dados suficientes para responder com segurança."*

---

## Planejamento financeiro (Sprint 6)

Metas orientadas a objetivos com **quatro camadas obrigatórias**: Meta → Estratégia → Viabilidade → Recomendação.

| Recurso | Caminho |
|---------|---------|
| Dashboard | `/dashboard/planning` |
| API REST | `GET/POST /api/planning/goals`, `PATCH/DELETE /api/planning/goals/[id]` |
| Motor | `src/modules/financial-planning` |
| Serviços | `FinancialGoalStrategyService`, `FinancialGoalViabilityService`, `FinancialGoalPrioritizationService`, `FinancialGoalRecommendationService`, `FinancialPlanningService` |
| Export Telegram | `getFinancialGoalsForUser(userId)` em `src/lib/api/financial-planning.ts` |

- Valores em `Decimal` (Prisma); `userId` **somente** da sessão Auth.js.
- Viabilidade: risco `LOW` / `MEDIUM` / `HIGH` · indicadores 🟢 Viável · 🟡 Atenção · 🔴 Risco alto / Atrasada.
- Priorização: emergência → dívidas com juros → curto prazo → patrimonial → aposentadoria → custom.
- Advisor injeta metas com tom conversacional e explicabilidade (fluxo, patrimônio, passivos).
- Dashboard executivo: metas ativas, progresso global, mais próxima, mais atrasada, maior valor.

---

## Telegram (Sprint 4.7)

1. Configure `TELEGRAM_BOT_TOKEN` e `TELEGRAM_WEBHOOK_SECRET` no `.env`.
2. Abra **Cadastros → Integrações** (`/dashboard/settings/integrations`) e gere um código.
3. No Telegram, envie: `/connect SEUCODIGO`
4. Envie texto, áudio ou foto — itens entram na Caixa Financeira.

**Webhook:** `POST /api/telegram/webhook`  
**Dev local:** use `npm run dev:all` (recomendado) ou [ngrok](https://ngrok.com/) manualmente — o Telegram não acessa `localhost`.

```bash
npm run dev:all
# após reiniciar o ngrok:
npm run telegram:webhook
```

Rota legada (somente `?token=`): `/api/webhooks/telegram`.

---

## Contas a Receber (Sprint 7.5)

Compras feitas para terceiros viram **ativo** (direito a receber), não despesa pessoal definitiva.

| Recurso | Caminho |
|---------|---------|
| Dashboard | `/dashboard/receivables` |
| API REST | `GET/POST /api/receivables`, `POST /api/receivables/from-transaction`, `POST /api/receivables/[id]?action=collect\|cancel` |
| Motor | `src/modules/receivables` |
| Metadata transação | `src/lib/financial/receivable-transaction-metadata.ts` |
| Integrações | Patrimônio (`contasAReceber`), cashflow (`RECEIVABLE`), advisor, inbox (hint), Telegram (sugestão) |

- Status: `OPEN` → `PARTIALLY_RECEIVED` → `RECEIVED` (ou `CANCELLED`).
- Cobrança gera transação `INCOME` e atualiza saldo da conta escolhida.
- `userId` **somente** da sessão Auth.js.

---

## Compromissos Recorrentes (Sprint 8)

Visão mensal consolidada: quanto já está comprometido, o que vence, entradas previstas e origens que mais pesam.

| Recurso | Caminho |
|---------|---------|
| Dashboard | `/dashboard/commitments` |
| API REST | `GET /api/commitments/monthly?month=YYYY-MM` |
| Motor | `src/modules/commitments` |
| Factory | `buildMonthlyCommitmentsUseCases()` em `src/lib/api/monthly-commitments.ts` |

Fontes (read model, sem duplicar cashflow): recorrências, parcelamentos, passivos, consórcios, faturas de cartão, contas a receber, transações agendadas.

---

## Alertas Financeiros (Sprint 9)

Motor proativo com persistência, idempotência (`fingerprint`) e auto-resolução quando a condição deixa de existir.

| Recurso | Caminho |
|---------|---------|
| Dashboard | `/dashboard/alerts` |
| APIs | `GET /api/alerts`, `GET /api/alerts/summary`, `PATCH /api/alerts/[id]`, `POST /api/alerts/bulk-patch` |
| Cron | `npm run alerts:engine` ou `POST /api/cron/financial-alerts` (`CRON_SECRET`) |
| Motor | `src/modules/financial-alerts` |

Regras: pagamento próximo (7d), recebível atrasado, risco cartão (>30% renda), alto comprometimento (>80%), meta em risco, reembolso atrasado (>15d), fluxo negativo (15d).

## Consultor Financeiro Inteligente (Sprint 9.5)

Motor determinístico que gera ações, riscos, score de saúde (0–100) e top 3 economias. A IA **só recomenda** ações já geradas pelo backend.

| Recurso | Caminho |
|---------|---------|
| IA Financeira | `/dashboard/advisor` |
| API consulta | `GET /api/advisor/consultation` |
| Insights estendidos | `GET /api/advisor/insights` |

Detectores: assinaturas duplicadas, gastos invisíveis, raio-X de gastos (delivery, streaming, taxas…).

### Operação local / produção

1. Subir banco: `docker compose up -d`
2. Aplicar schema: `npx prisma migrate deploy`
3. Configurar `CRON_SECRET` no `.env` (copiar de `.env.example`; gerar com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
4. Rodar motor manualmente: `npm run alerts:engine`
5. Agendar diário (`0 6 * * *`): mesmo comando ou `POST /api/cron/financial-alerts` com `Authorization: Bearer <CRON_SECRET>`
6. Checagens: `npx tsx scripts/check-alerts-db.ts`, `npx tsx scripts/validate-alerts-api.ts`

---

## Roadmap próximo

- Integração do Advisor no Telegram (reuso de `FinancialAdvisorService.ask`)
- Evolução da Inbox Intelligence (confirmação assistida de reembolsos)

---

## Licença

Projeto privado (`"private": true` no `package.json`). Uso conforme política do mantenedor.
