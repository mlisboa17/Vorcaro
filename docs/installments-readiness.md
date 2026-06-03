# Prontidão de dados — Central de Parcelamentos

Inventário do que já existe no schema e no código (Sprint 6.5). **Nenhuma migration nesta etapa.**

---

## Cartões

### Tabelas Prisma

| Modelo | Campos relevantes | Finalidade |
|--------|-------------------|------------|
| `Card` | `closingDay`, `dueDay`, `creditLimit`, `financialAccountId` | Ciclo de fatura |
| `FinancialAccount` | `balance` | Conta liquidante |
| `PaymentMethod` | `type` (`CARTAO`, `CARTAO_CREDITO`, `CREDIT_CARD`, …) | Identificar pagamento cartão |
| `Transaction` | `cardId`, `dataCompra`, `dataVencimentoFatura`, `dataCaixa` | Lançamento e vencimento na fatura |

### Relacionamentos

```
User → Card → Transaction[]
User → FinancialAccount → Card?
Transaction → Card (opcional)
Transaction → Category, PaymentMethod
```

### Serviços

| Serviço | Arquivo |
|---------|---------|
| `CreditCardTransactionBuilderService` | `src/modules/financial/application/services/credit-card-transaction-builder.service.ts` |
| `resolveCardBillingConfig` | `src/modules/transactions/application/services/resolve-card-billing.service.ts` |
| `calculateCreditCardCashDate` | `src/modules/financial/core/calculate-credit-card-cash-date.ts` |

**Comportamento:** compra parcelada gera **N transações** com mesmo `idGrupoParcelamento` / `installmentGroup`, valores fracionados, `numeroParcela` / `totalParcelas`, e `dataVencimentoFatura` por parcela.

---

## Faturas

### Origem dos dados

- **Não existe** tabela `Invoice` / `Fatura`.
- Fatura = agregação lógica de transações com `cardId` + `dataVencimentoFatura` na mesma data de vencimento.

### Importação

| Canal | Parcelas na importação |
|-------|------------------------|
| **PDF fatura** | `linesFromPdfText` + Gemini (linhas); `extractInstallments()` na descrição |
| **OFX extrato** | `parseOfxBankStatement`; parcelas só se descrição tiver padrão `N/M` |
| **CSV** | Idem pipeline `buildPreviewLines` |

### Cashflow

- Evento `origem: "FATURA"` quando `cardId` + `dataVencimentoFatura` futura (`cashflow-projection.service.ts`).

---

## Transações — campos de parcelamento

### Modelo `Transaction` (Prisma)

| Campo | Tipo | Uso |
|-------|------|-----|
| `installments` | `Int` @default(1) | Legado / contagem |
| `installmentGroup` | `String?` | Agrupador (índice `@@index([installmentGroup])`) |
| `currentInstallment` | `Int?` | Parcela atual (API/UI) |
| `totalInstallments` | `Int?` | Total (API/UI) |
| `numeroParcela` | `Int?` | Parcela atual (PT) |
| `totalParcelas` | `Int?` | Total (PT) |
| `idGrupoParcelamento` | `String?` | Grupo PT (espelho de installmentGroup) |

**Nota:** existem **dois conjuntos** de nomes (`currentInstallment` vs `numeroParcela`) — normalização necessária na Sprint 7.

### API / DTO

- `POST/PATCH /api/transactions` — campo `parcelas` no body → mapeado para `installments` e geração de grupo.
- UI: `edit-transaction-modal.tsx`, `transaction-table.tsx` exibe `totalInstallments ?? installments`.

### Inbox / confirmação

- `confirm-and-create-transaction.use-case.ts` — `installments`, `installmentGroup` da extração IA.
- `financial-import-pipeline.ts` — `installment`, `totalInstallments` por linha importada.

### Consórcio (domínio separado)

- `Consortium.parcelasPagas`, `quantidadeParcelas` — **não** são parcelas de cartão; tratar como fronteira na central.

### Financiamento (passivo)

- `Transaction.liabilityId` + cashflow `origem: FINANCIAMENTO` — parcelas de empréstimo, não cartão.

---

## Índices e consultas úteis (já existentes)

```prisma
@@index([installmentGroup])
@@index([userId, date])
@@index([cardId])
```

---

## Lacunas de dados (para Sprint 7)

- Entidade **`InstallmentPlan`** ou view materializada agregada — **não existe**
- Status do plano (`ACTIVE`, `SETTLED`, `CANCELLED`) — **não existe**
- Vínculo explícito importação → grupo — parcial (`importHash` no inbox, não no grupo)
- Tabela de **duplicatas** entre import e manual — **não existe**
