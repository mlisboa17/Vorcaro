# Sprint 14.9.3 — Humanização Avançada e Inteligência Consultiva

## Objetivo

Elevar o Vorcaro de assistente técnico a **consultor financeiro conversacional**: explica, orienta e recomenda melhorias em linguagem natural, sem expor códigos internos na conversa padrão.

## Entregas

| Etapa | Entrega |
|-------|---------|
| 1 | `VorcaroConsultativeResponseService` — formato O que encontrei / Por que importa / O que eu faria |
| 2 | Termos técnicos (`DUPLICATE_*`, `severity`, `confidence %`) apenas em dashboard debug |
| 3 | Copy humanizada para duplicatas, fornecedores e baixo uso |
| 4 | `category-audit-exemptions.ts` — anti falsos positivos (investimentos, aluguel/receita, especialização) |
| 5 | `TaxonomyHealthScore` 0–100 + label |
| 6 | Top 5 melhorias priorizadas por impacto, uso e confiança |
| 7 | Proposta estruturada antes de abrir dashboard |
| 8 | Modos `ANALYTICAL`, `CONSULTATIVE` (padrão), `EXECUTIVE` |
| 9 | `CategoryAuditPreferenceMemoryService` — memória de rejeições na sessão |
| 10 | Dashboard `/dashboard/categories/audit` — Health Score, top 5, prioridades humanas |
| 11 | Testes dos 4 casos de aceitação da spec |

## Arquivos principais

- `src/modules/vorcaro/intent/application/services/vorcaro-consultative-response.service.ts`
- `src/modules/vorcaro/intent/application/services/category-audit-preference-memory.service.ts`
- `src/modules/categories/domain/services/category-audit-exemptions.ts`
- `src/modules/categories/domain/services/category-audit-health.ts`
- `src/modules/vorcaro/intent/application/tools/category-audit-tool.ts`
- `src/components/categories/category-audit-dashboard.tsx`

## Regras anti falso positivo

| Par | Resultado |
|-----|-----------|
| Ações, Fundos, Tesouro Direto, Criptoativos (sob Investimentos) | Não duplicado |
| Aluguel vs Aluguel Recebido | Não duplicado (despesa/receita) |
| Seguro vs Seguro Residencial (mesmo pai) | Especialização legítima |
| Uber sob Transporte | Não tratado como fornecedor |
| Uber vs Uber e Aplicativos | Sugestão válida |

## Conversa vs debug

- **Chat Vorcaro**: nota `/100`, top melhorias, proposta consultiva, CTA “Deseja visualizar a proposta?”
- **Dashboard**: Health Score, top 5, impacto esperado, prioridades Alta/Média/Baixa
- **Debug (expansível)**: códigos `DUPLICATE_*`, severity, confidence %

## Validação

```bash
npm test -- --run
npx tsc --noEmit
npx prisma validate
```

## Status

Concluída — 2026-06-04.
