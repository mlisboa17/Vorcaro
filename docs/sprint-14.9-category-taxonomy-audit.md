# Sprint 14.9 — Auditoria Inteligente de Categorias pelo Vorcaro

## Objetivo

Permitir que o Vorcaro analise a taxonomia financeira do usuário e sugira melhorias em categorias e subcategorias, **sem alterar nada automaticamente**.

## Escopo entregue

| Etapa | Entrega |
|-------|---------|
| 1 | `CategoryTaxonomyAuditService` — analisa Category, UserRule, UserLearningPattern, Transaction |
| 2 | Tipos: `DUPLICATE_CATEGORY`, `DUPLICATE_SUBCATEGORY`, `SUPPLIER_AS_CATEGORY`, `OVERLAPPING_CATEGORY`, `INCONSISTENT_NAMING`, `LOW_USAGE_CATEGORY`, `MERGE_SUGGESTION` |
| 3 | Regras de detecção determinísticas (plural/singular, sobreposição, fornecedores, aliases) |
| 4 | `CategoryAuditFinding` com severidade, confiança e ação sugerida |
| 5 | `GET /api/categories/audit` |
| 6 | Intent Vorcaro `CATEGORY_AUDIT` + tool `category_audit` |
| 7 | Dashboard `/dashboard/categories/audit` + link em Configurações → Categorias |
| 8 | Guardrails: somente leitura e sugestões |
| 9 | Testes unitários |

## Arquivos principais

- `src/modules/categories/domain/types/category-audit.ts`
- `src/modules/categories/domain/services/category-audit-detection.ts`
- `src/modules/categories/application/services/category-taxonomy-audit.service.ts`
- `src/app/api/categories/audit/route.ts`
- `src/modules/vorcaro/intent/application/tools/category-audit-tool.ts`
- `src/components/categories/category-audit-dashboard.tsx`
- `src/app/dashboard/categories/audit/page.tsx`

## API

```http
GET /api/categories/audit
```

Resposta:

```json
{
  "findings": [],
  "summary": { "totalFindings": 0, "high": 0, "medium": 0, "low": 0 },
  "suggestedMerges": [],
  "supplierLikeCategories": [],
  "lowUsageCategories": []
}
```

## Vorcaro (sem LLM)

Perguntas suportadas:

- "Vorcaro, minhas categorias estão boas?"
- "Existem categorias duplicadas?"
- "O que posso melhorar nas categorias?"
- "Tem categorias redundantes?"

Intent: `CATEGORY_AUDIT` → tool `category_audit`.

## Guardrails

**Proibido:** excluir, renomear, fundir categorias; alterar transações ou regras automaticamente.

**Permitido:** sugerir fusão, renomeação, remoção e reorganização — sempre com confirmação humana futura.

## Validação

```bash
npm test -- --run
npx tsc --noEmit
npx prisma validate
```

## Critérios de aceitação

- [x] Detecta categorias duplicadas e fornecedores como categoria
- [x] Sugere fusões sem mutação automática
- [x] API e dashboard funcionais
- [x] Chat Vorcaro responde sobre categorias (determinístico)
- [x] Testes, TypeScript e Prisma válidos
