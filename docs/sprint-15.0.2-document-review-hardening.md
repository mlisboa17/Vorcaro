# Sprint 15.0.2 — Hardening da Captura de Documentos e Aprovação Segura

**Objetivo:** robustez operacional do fluxo de revisão humana — sem OCR real, sem alteração de regras financeiras.

---

## Entregas

### Revisão (`/dashboard/import/review`)

- Painel completo: tipo, valor, data, descrição, fornecedor, favorecido, banco, CPF/CNPJ, chave PIX, categoria/subcategoria, confiança
- OCR expandível (“Mostrar OCR completo”)
- Motivos determinísticos da confiança
- Botões **Aprovar · Editar · Rejeitar**
- Formulário de edição inline (valor, data, descrição, fornecedor, categoria, subcategoria)
- Bloqueio por baixa confiança (`AUTO_APPROVAL_THRESHOLD = 70`) com checkbox de confirmação

### PDF protegido

- Status `PASSWORD_REQUIRED` no enum Prisma
- Detecção via `PdfParseError` no pipeline
- Endpoint `POST /api/import/documents/:id/password` com `{ "password": "..." }`
- UI de senha na página de upload

### Erros OCR específicos

| Código | Mensagem |
|--------|----------|
| `PDF_PASSWORD_REQUIRED` | Documento protegido por senha. |
| `PDF_INVALID_PASSWORD` | Senha inválida para este PDF. |
| `CORRUPT_FILE` | Arquivo inválido ou corrompido. |
| `OCR_EMPTY` / `INSUFFICIENT_EXTRACTION` | Não foi possível extrair informações suficientes. |

Upload retorna **422** com mensagem específica (não 500 genérico).

### Telegram

- Ack imediato: “Documento recebido. Processando…”
- Resumo estruturado (tipo, valor, fornecedor, categoria, confiança)
- Botões: Confirmar · Editar · Rejeitar
- Aprovação bloqueada no Telegram quando confiança &lt; 70 (direciona ao dashboard)

### Histórico (`/dashboard/import/history`)

- Status, confiança, categoria sugerida, categoria final aprovada, aprendizado aplicado

### Auditoria

- Modelo `FinancialDocumentAuditEvent` (EDITED, APPROVED, REJECTED)
- Registro de quem editou/aprovou/rejeitou, campos alterados (antes/depois), timestamp

---

## Arquivos principais

| Área | Caminho |
|------|---------|
| Constantes | `domain/constants/financial-document-review.constants.ts` |
| Confiança | `domain/services/financial-document-confidence.service.ts` |
| Processamento | `application/services/financial-document-processing.service.ts` |
| Senha PDF | `application/services/financial-document-password.service.ts` |
| Auditoria | `application/services/financial-document-audit.service.ts` |
| API senha | `app/api/import/documents/[id]/password/route.ts` |
| UI | `components/financial-documents/import-dashboard.tsx` |
| Migration | `20260611120000_financial_documents_review_hardening_sprint1502` |
| Testes | `__tests__/financial-document-review-hardening.test.ts` |

---

## Validação

```bash
npx prisma migrate deploy
npm test -- --run
npx tsc --noEmit
npx prisma validate
```

**Resultado (2026-06-05):** 497 testes · 0 erros TypeScript · schema válido.

---

## Guardrails mantidos

- Nenhum lançamento automático sem revisão humana
- Aprovação exige interação explícita em baixa confiança
- Cross-tenant continua retornando 404
