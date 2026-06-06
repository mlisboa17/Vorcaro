# Sprint 15.1.2 — Extratos bancários e parcelamentos de fatura

## Objetivo

Melhorar a captura inteligente para extratos bancários (especialmente Bradesco) e faturas de cartão com compras parceladas, sempre com **revisão humana obrigatória**.

## Extrato bancário Bradesco

Parser dedicado: `src/lib/inbox/bradesco-bank-statement-parser.ts`

Detecta colunas:

- Data, Histórico, Documento, Débito, Crédito, Saldo

Gera `ExtractedBankStatementTransaction[]` com direção INCOME/EXPENSE.

## Revisão em tabela

Em `/dashboard/import/review`, documentos com múltiplos lançamentos exibem tabela com:

- seleção por linha
- data, descrição, valor, tipo, confiança

Confirmação via `POST /api/import/documents/:id/lines` — **nunca** cria todos os lançamentos automaticamente.

## Fatura parcelada

Parser: `card-invoice-installment-parser.service.ts`

Tipo `ExtractedInstallmentPurchase` com parcela atual, total, valor e fingerprint anti-duplicidade.

UI pergunta:

> Deseja criar as próximas parcelas como compromissos futuros?

Ao confirmar, cria transações futuras (3/6 … N/6) vinculadas ao documento, refletindo em compromissos e fluxo de caixa previsto.

## Telegram

Faturas com parcelamento geram mensagem orientando revisão em `/dashboard/import/review` — sem criação inline de compromissos.

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/import/documents/:id/lines` | Linhas do extrato/fatura para revisão |
| POST | `/api/import/documents/:id/lines` | Confirma linhas selecionadas + parcelas futuras |

## Guardrails

- Nenhum lançamento automático sem confirmação
- Nenhuma parcela futura sem checkbox explícito
- Cross-tenant → 404
- Fingerprint evita duplicidade na reimportação

## Testes

`src/modules/financial-documents/__tests__/financial-document-bank-statement-installments.test.ts`
