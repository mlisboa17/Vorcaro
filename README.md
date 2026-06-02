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

---

## Scripts úteis

| Comando | Descrição |
|---------|-----------|
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
docs/             # documentação técnica
backups/          # dumps locais (ignorado no Git)
```

---

## Telegram (Sprint 4.7)

1. Configure `TELEGRAM_BOT_TOKEN` e `TELEGRAM_WEBHOOK_SECRET` no `.env`.
2. Abra **Cadastros → Integrações** (`/dashboard/settings/integrations`) e gere um código.
3. No Telegram, envie: `/connect SEUCODIGO`
4. Envie texto, áudio ou foto — itens entram na Caixa Financeira.

**Webhook:** `POST /api/telegram/webhook`  
**Dev local:** use [ngrok](https://ngrok.com/) ou [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) — o Telegram não acessa `localhost`.

```bash
ngrok http 3000
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<tunnel>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Rota legada (somente `?token=`): `/api/webhooks/telegram`.

---

## Roadmap próximo

- **Sprint 5** — IA Financeira Vorcaro

---

## Licença

Projeto privado (`"private": true` no `package.json`). Uso conforme política do mantenedor.
