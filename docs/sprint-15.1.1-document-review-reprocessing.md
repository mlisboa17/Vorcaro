# Sprint 15.1.1 — Revisão e reprocessamento de documentos

## Objetivo

Melhorar revisão humana, rastreabilidade e recuperação de documentos financeiros capturados via OCR, sem criar lançamentos automáticos.

## Metadados de partes

Pagador, recebedor, banco, documento e chave PIX são persistidos apenas em:

- `FinancialDocument.extractedJson.parties`
- `FinancialDocumentSuggestion.metadata.parties`

Nunca em `Transaction` ou entidades financeiras estruturais.

## UI

### `/dashboard/import/review`

- Blocos **Quem pagou** e **Quem recebeu** com nome, documento, banco e chave PIX.
- Valores ausentes exibidos como **Não identificado**.
- Ações por status:
  - `REVIEW_REQUIRED`: Editar, Reprocessar, Rejeitar
  - `FAILED`: Tentar novamente, Editar manualmente, Rejeitar
  - `REJECTED`: Reabrir revisão, Reprocessar, Arquivar
  - `PASSWORD_REQUIRED`: Informar senha, Reprocessar com senha, Rejeitar

### `/dashboard/import/history`

Exibe pagador, recebedor, bancos, documento e chave PIX sem inspecionar JSON.

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/import/documents/:id/reprocess` | Limpa erro, status `PROCESSING`, OCR+parser, atualiza sugestão |
| POST | `/api/import/documents/:id/reopen` | `REJECTED`/`FAILED` → `REVIEW_REQUIRED` |
| POST | `/api/import/documents/:id/archive` | Marca documento rejeitado como arquivado |
| PATCH | `/api/import/documents/:id` | Rejeição operacional (`status: REJECTED`) |

## Auditoria (`FinancialDocumentAuditEvent`)

Novos eventos:

- `REPROCESS_REQUESTED`
- `REPROCESS_SUCCEEDED`
- `REPROCESS_FAILED`
- `REOPENED_AFTER_REJECTION`
- `PASSWORD_SUBMITTED`

## Telegram

Resumo estruturado com pagador/recebedor. Aprovação inline bloqueada quando:

- valor ausente, ou
- pagador e recebedor/chave PIX ausentes, ou
- confiança &lt; 70%

## Guardrails

- Reprocessar **não** cria lançamento
- Documento `APPROVED` **não** pode ser reprocessado
- Cross-tenant → 404
- Auditoria completa em todas as ações

## Testes

`src/modules/financial-documents/__tests__/financial-document-parties-reprocessing.test.ts`
