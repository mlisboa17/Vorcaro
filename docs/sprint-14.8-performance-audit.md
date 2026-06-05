# Sprint 14.8 — Auditoria de Performance de Navegação

**Data:** 2026-06-04  
**Escopo:** diagnóstico antes de otimizações seguras (sem refatoração arquitetural)

---

## Metodologia

- Revisão estática de componentes client (`sidebar`, dashboards Vorcaro, executive dashboard)
- Homologação Sprint 14.7 (`scripts/sprint-14.7-manual-homologation.ts`) — tempos de API
- Smoke Playwright — 7 rotas dashboard, 0 erros HTTP 5xx em `/api/*`

---

## Principais APIs por tela

| Tela | APIs no mount | Observação |
|------|---------------|------------|
| `/dashboard` | `executive-dashboard`, `cashflow/projection` | 2 fetches paralelos — OK |
| `/dashboard/vorcaro/timeline` | `timeline`, `evolution`, `achievements` | 3 fetches paralelos — aceitável; cache 5 min no servidor |
| `/dashboard/vorcaro/chat` | `preferences`, `conversations`, `conversations/:id` | até 3 requests na abertura |
| Sidebar (global) | `notifications/summary` | 1× por sessão (useEffect vazio) |
| `/dashboard/inbox` | catálogo + fila inbox | variável por uso |

---

## Gargalos identificados

### 1. Prefetch agressivo do Next.js Link (MÉDIO — corrigido)

**Problema:** links do menu lateral com `prefetch` padrão disparam compilação/fetch de rotas ao hover, aumentando carga percebida na navegação.

**Correção Sprint 14.8:** `prefetch={false}` nos links do sidebar e cards do hub Vorcaro.

### 2. Compilação lenta no OneDrive (ALTO — ambiente)

**Problema:** primeira navegação após `npm run dev` leva 25–55s por compilação webpack (evidência homologação 14.7).

**Mitigação existente:** `dev:all` limpa `.next`; `DEV_SKIP_CLEAN_NEXT=1` para pular.

**Limitação:** não corrigível só com código — depende do host de arquivos.

### 3. Timeline — 3 endpoints no cliente (BAIXO)

**Problema:** `vorcaro-timeline-dashboard` chama 3 APIs separadas.

**Decisão:** manter — cache server-side de 5 min já reduz recomputação; unificar API seria mudança de contrato.

### 4. Chat Vorcaro — cadeia de requests (BAIXO)

**Problema:** carrega preferências + lista + última conversa em sequência.

**Decisão:** manter nesta sprint; loading state já presente.

---

## N+1 / Prisma

| Área | Resultado |
|------|-----------|
| Executive dashboard API | agregações em serviços dedicados — sem N+1 óbvio nas rotas auditadas |
| Timeline refresh | cache `FinancialMemoryQueryService` — 1 `runForUser` / 5 min |
| Navegação entre menus | sem recomputação de timeline fora de `/dashboard/vorcaro/timeline` |

---

## Requests duplicadas

- **Notifications badge:** 1 fetch por mount do sidebar — não duplica entre rotas (layout persiste sidebar).
- **Executive dashboard:** fetch apenas na página `/dashboard`, não no layout global.

---

## Melhoria percebida esperada (14.8)

| Ação | Impacto |
|------|---------|
| Menu com 16 itens vs ~19 | menos scroll e decisão visual |
| Hub Vorcaro | menos itens no menu; submódulos sob demanda |
| `prefetch={false}` | menos trabalho em background ao mover mouse no menu |

---

## Próximos passos (fora do escopo 14.8)

- Endpoint agregado opcional para timeline (1 round-trip)
- Medição formal com Lighthouse/Web Vitals no browser
- `stale-while-revalidate` no cliente para chat preferences
