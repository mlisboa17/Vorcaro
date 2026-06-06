# Sprint 15.2 — Motor de Importação Bancária Brasileira

## Objetivo

Expandir o pipeline de importação financeira para interpretar extratos e faturas dos principais bancos brasileiros, com revisão humana obrigatória antes de qualquer lançamento.

## Ordem de processamento

1. PDF com texto nativo (pdfjs)
2. Parser específico por banco (`BankStatementParserResolver`)
3. OCR PaddleOCR (fallback quando texto insuficiente)
4. Classificação determinística existente
5. IA apenas para enriquecimento opcional (nunca aprova/cria lançamentos)

## Arquitetura

```
src/lib/bank-parsers/
├── bank-statement-parser.types.ts    # BankStatementParser, ExtractedBankStatement
├── bank-statement-parser.utils.ts    # parsing de linhas, métodos, metadata
├── bank-statement-line-fingerprint.ts
├── create-bank-statement-parser.ts   # factory de parsers por marcadores
├── generic-bank-statement-parser.ts  # fallback heurístico
├── bank-statement-parser-resolver.ts # identificação automática
├── bank-parsers.registry.ts          # registro P1/P2/P3
├── bb-parser.ts
├── bradesco-parser.ts
├── itau-parser.ts                    # + Santander, Nubank, Inter, C6, PagBank, P2/P3
└── __tests__/brazilian-bank-import-engine.test.ts
```

Integração:

- `financial-document-import-analyzer.service.ts` — fatura (prioridade) → extrato via resolver
- `bank-statement-batch.mapper.ts` — fingerprint por linha + tipos de domínio
- `financial-document-lines-confirm.service.ts` — dedup por `lineFingerprint`
- `import-dashboard.tsx` — tabela de revisão com edição inline
- Telegram — mensagem direcionando ao dashboard para lotes

## Bancos suportados

### Prioridade 1 (obrigatório)

| Banco | Parser |
|-------|--------|
| Banco do Brasil | `bb-parser.ts` |
| Bradesco | `bradesco-parser.ts` |
| Itaú | `itau-parser.ts` |
| Santander | `itau-parser.ts` |
| Nubank | `itau-parser.ts` |
| Inter | `itau-parser.ts` |
| C6 Bank | `itau-parser.ts` |
| PagBank | `itau-parser.ts` |

### Prioridade 2 (recomendado)

Caixa, Sicoob, Sicredi, Mercado Pago

### Prioridade 3 (opcional)

BTG Pactual, XP Investimentos

## Fingerprint por linha

```
userId + bank + account + date + amount + normalizedDescription → SHA-256
```

Persistido em `Transaction.metadata.lineFingerprint` na confirmação em lote. Reimportações ignoram linhas já importadas.

## Revisão humana

Em `/dashboard/import/review`, documentos com múltiplas movimentações exibem:

- Seleção por linha
- Data, descrição, valor (editáveis)
- Tipo (débito/crédito), método, confiança, warnings
- Parcelas futuras (checkbox explícito — Sprint 15.1.2)

Nenhuma movimentação vira lançamento sem confirmação explícita.

## Telegram

Extratos com múltiplas movimentações:

```
Identifiquei N movimentações neste documento.
Abra o dashboard para revisar e escolher quais deseja importar.
/dashboard/import/review
```

## Fora do escopo

GED, LOGOS SPACE, Open Finance, WhatsApp, API pública, DRE automática, workflows corporativos.

## Testes

```bash
npm test -- --run src/lib/bank-parsers
npm test -- --run
npx tsc --noEmit
npx prisma validate
```

## Critérios de aceitação

- [x] Banco identificado automaticamente (8 P1)
- [x] Múltiplas movimentações estruturadas
- [x] Débito/crédito e métodos (PIX, TED, boleto, tarifa, cartão)
- [x] Revisão em tabela com seleção e edição
- [x] Fingerprint por linha + dedup na confirmação
- [x] Parcelamentos (15.1.2) com confirmação de compromissos futuros
- [x] Telegram direciona ao dashboard
- [x] Nenhum lançamento automático
