# Sprint 15 — Captura Inteligente de Transações e Aprendizado PIX/TED

## Objetivo

Upload de PDFs/imagens (web e Telegram) → OCR → parser → classificação → sugestão → **revisão humana** → lançamento → aprendizado.

Nenhum lançamento é criado automaticamente antes da confirmação do usuário.

## Modelos Prisma

- `FinancialDocument` — arquivo, fingerprint, status, texto/json extraído
- `FinancialDocumentSuggestion` — sugestão de lançamento com confiança
- `FinancialDocumentLearningPattern` — pixKey, documentNumber, normalizedName → categoria

Enums: `FinancialDocumentStatus`, `TransactionMethod`, `FinancialDocumentSuggestionStatus`

Migration: `20260610120000_financial_documents_sprint15`

## Módulo

`src/modules/financial-documents/`

| Serviço | Responsabilidade |
|---------|------------------|
| `FinancialDocumentUploadService` | MIME, tamanho, fingerprint upload |
| `FinancialDocumentOcrService` | Abstração OCR |
| `FinancialDocumentParserService` | Heurísticas PIX/TED/Boleto/Cartão |
| `FinancialDocumentClassificationService` | Aprendizado → regras → taxonomia |
| `FinancialDocumentSuggestionService` | Aprovar / editar / rejeitar |
| `FinancialDocumentLearningService` | Padrões após confirmação |
| `FinancialDocumentProcessingService` | Pipeline completo |
| `TelegramFinancialDocumentService` | Ingestão Telegram |

OCR: `BasicFinancialOcrProvider` (PDF via pdfjs; imagens mockáveis)

## APIs

| Método | Rota |
|--------|------|
| POST/GET | `/api/import/documents` |
| GET | `/api/import/documents/:id` |
| POST | `/api/import/documents/:id/process` |
| GET | `/api/import/suggestions` |
| PATCH | `/api/import/suggestions/:id` |
| POST | `/api/import/suggestions/:id/approve` |
| POST | `/api/import/suggestions/:id/reject` |
| GET | `/api/import/learning-patterns` |
| PATCH/DELETE | `/api/import/learning-patterns/:id` |

Todas exigem sessão; ownership via `userId`.

## UI

- `/dashboard/import` — upload drag & drop
- `/dashboard/import/review` — fila de revisão
- `/dashboard/import/history` — documentos + padrões aprendidos

## Vorcaro

Intents: `IMPORT_DOCUMENT`, `REVIEW_DOCUMENT`  
Tools: `import_document`, `review_document`

## Telegram

Documentos/imagens → processamento → resumo + botões Confirmar / Editar / Rejeitar  
Callbacks: `doc_approve:`, `doc_reject:`, `doc_edit:`

## Guardrails

- Sem lançamento automático no upload/processamento
- Aprovação explícita (`approve`) cria `Transaction`
- Limite 10MB, MIME validado
- Cross-tenant → 404

## Status

Concluída — 2026-06-05.
