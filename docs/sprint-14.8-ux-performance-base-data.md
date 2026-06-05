# Sprint 14.8 — UX, Performance e Dados Base

**Data:** 2026-06-04  
**Status:** Concluída

---

## Objetivo

Corrigir três achados da homologação 14.7:

1. Menu lateral extenso e confuso  
2. Navegação lenta percebida  
3. Ausência de categorias/subcategorias padrão completas

---

## Entregas

### ETAPA 1 — Menu lateral reorganizado

Arquivo: `src/lib/navigation/dashboard-nav.ts`

| Bloco | Itens |
|-------|-------|
| Visão Geral | Dashboard, Vorcaro (hub) |
| Financeiro | Caixa, Extrato, Contas a Receber, Parcelamentos |
| Planejamento | Planejamento Financeiro, Fluxo Futuro, Compromissos |
| Inteligência | Alertas, Notificações, Timeline, Pendências |
| Patrimônio | Patrimônio, Consórcios |
| Configurações | Cadastros, Regras & Automações |

Rotas preservadas; apenas agrupamento e rótulos visuais.

### ETAPA 2 — Hub Vorcaro

- Rota: `/dashboard/vorcaro`
- Componente: `src/components/vorcaro/vorcaro-hub-dashboard.tsx`
- Cards: Chat, Ações, Pendências, Timeline/Memória, Insights

### ETAPA 3–4 — Performance

- Relatório: [`docs/sprint-14.8-performance-audit.md`](./sprint-14.8-performance-audit.md)
- Correção: `prefetch={false}` no sidebar e hub Vorcaro
- `exactMatch` no item Vorcaro do menu (evita highlight incorreto em subrotas)

### ETAPA 5–6 — Categorias padrão

- Taxonomia expandida: `src/lib/categories/vorcaro-category-taxonomy.ts`
- Aliases: `src/lib/categories/category-aliases.ts` (compat regras/inbox)
- Seed idempotente: `seedCategoryTaxonomyForUser` em `prisma/seed.ts` e no primeiro login (`src/lib/auth.ts`)
- Regras: `resolveCategoryAlias` em `seed-default-user-rules.ts`

### ETAPA 8 — Testes

- `src/lib/navigation/__tests__/dashboard-nav.test.ts`
- `src/lib/categories/__tests__/category-aliases.test.ts`

---

## Limitações conhecidas

- Compilação lenta em pastas OneDrive (ambiente, não código)
- Chat Vorcaro ainda usa 2–3 requests no mount
- Timeline no menu aponta para `/dashboard/vorcaro/timeline` (rota preservada)

---

## Validação

```bash
npm test -- --run
npx tsc --noEmit
npx prisma validate
npx prisma generate
```

---

## Referências

- [`docs/sprint-14.7-e2e-report.md`](./sprint-14.7-e2e-report.md)
- [`docs/sprint-14.8-performance-audit.md`](./sprint-14.8-performance-audit.md)
