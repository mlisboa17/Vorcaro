# Sprint 15.1.1 — Metadados de partes do documento

## Diretriz arquitetural

Informações de contraparte extraídas por OCR são **metadados do documento**, não campos estruturais de lançamento.

```text
FinancialDocument
  └─ extractedJson.parties   (FinancialPartiesMetadata)
       ↓
FinancialDocumentSuggestion
  └─ metadata.parties
       ↓
Revisão humana
       ↓
Transaction (sem payer/receiver)
```

## Tipo

```ts
type FinancialPartiesMetadata = {
  payerName?: string;
  payerDocument?: string;
  payerBank?: string;
  payerAgency?: string;
  payerAccount?: string;

  receiverName?: string;
  receiverDocument?: string;
  receiverBank?: string;
  receiverAgency?: string;
  receiverAccount?: string;

  pixKey?: string;
  transactionIdentifier?: string;
};
```

Implementação: `src/modules/financial-documents/domain/types/financial-parties-metadata.types.ts`

## Parser

`FinancialDocumentParserService` detecta rótulos PIX e TED/DOC:

- Pagador / Quem pagou / Origem / Debitado de
- Recebedor / Favorecido / Destinatário / Creditado para
- Banco origem/destino, agência e conta quando disponíveis

## Aprendizado

O motor de classificação e `FinancialDocumentLearningService` utilizam:

- `pixKey`
- `payerDocument` / `receiverDocument`
- `payerName` / `receiverName`

para melhorar sugestões futuras **sem alterar lançamentos existentes**.

## Preparação multiempresa (futuro — não implementado)

```text
FinancialDocument
  ↓ Metadata OCR (parties)
  ↓ Suggestion
  ↓ Transaction

(Futuro)

Transaction
  ↓ Counterparty
  ↓ Supplier / Customer / Company
```

Quando multiempresa for implementada, `FinancialPartiesMetadata` será mapeado para entidades `Counterparty`, `Supplier`, `Customer` e `Company`, mantendo o OCR desacoplado do modelo contábil principal.

## Proibido

- `Transaction.payerName`
- `Transaction.receiverName`
- Campos equivalentes em `Installment`, `Receivable`, `Cashflow`, `AccountTransaction`
