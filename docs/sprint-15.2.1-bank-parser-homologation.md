# Sprint 15.2.1 — Homologação de parsers bancários PF/PJ

## Objetivo

Fortalecer o motor da Sprint 15.2 com suporte explícito a **Pessoa Física (PF)** e **Pessoa Jurídica (PJ)**, biblioteca de fixtures e métricas de qualidade — sem novas regras financeiras e sem lançamentos automáticos.

## Entregas

### Perfil PF/PJ

- Tipo `BankProfile`: `PF` | `PJ` | `UNKNOWN`
- `BankStatementProfileResolver` — CPF/titular vs CNPJ/razão social/empresarial
- `ExtractedBankStatement.profile` propagado até `FinancialDocumentBatchReview`

### Parsers por banco (PF + PJ)

| Banco | PF | PJ |
|-------|----|----|
| Banco do Brasil | `bb/bb-pf-parser.ts` | `bb/bb-pj-parser.ts` |
| Bradesco | `bradesco/bradesco-pf-parser.ts` | `bradesco/bradesco-pj-parser.ts` |
| Itaú | `itau/itau-pf-parser.ts` | `itau/itau-pj-parser.ts` |
| Santander | `santander/santander-pf-parser.ts` | `santander/santander-pj-parser.ts` |
| Caixa | `caixa/caixa-pf-parser.ts` | `caixa/caixa-pj-parser.ts` |
| Sicredi | `sicredi/sicredi-pf-parser.ts` | `sicredi/sicredi-pj-parser.ts` |
| Sicoob | `sicoob/sicoob-pf-parser.ts` | `sicoob/sicoob-pj-parser.ts` |
| Inter | `inter/inter-pf-parser.ts` | `inter/inter-pj-parser.ts` (Inter Empresas) |

Factory: `createProfileBankParsers()` — metadata `PF_METADATA` / `PJ_METADATA`.

### Homologação automatizada

```bash
npx tsx scripts/sprint-15.2.1-bank-parser-homologation.ts
npm test -- --run src/lib/bank-parsers/__tests__/bank-profile-homologation.test.ts
```

Fixtures: `tests/fixtures/bank-statements/{banco}/{pf|pj}/*.txt`

## PDF Success Rate (fixtures sintéticos)

| Banco | Perfil | Fixtures | Sucesso | Taxa |
|-------|--------|----------|---------|------|
| bb | PF | 1 | 1 | 100% |
| bb | PJ | 1 | 1 | 100% |
| bradesco | PF | 1 | 1 | 100% |
| bradesco | PJ | 1 | 1 | 100% |
| itau | PF | 1 | 1 | 100% |
| itau | PJ | 1 | 1 | 100% |
| santander | PF | 1 | 1 | 100% |
| santander | PJ | 1 | 1 | 100% |
| caixa | PF | 1 | 1 | 100% |
| caixa | PJ | 1 | 1 | 100% |
| sicredi | PF | 1 | 1 | 100% |
| sicredi | PJ | 1 | 1 | 100% |
| sicoob | PF | 1 | 1 | 100% |
| sicoob | PJ | 1 | 1 | 100% |
| inter | PF | 1 | 1 | 100% |
| inter | PJ | 1 | 1 | 100% |

**Taxa global:** 100% (16/16) — meta ≥ 90% ✅

Relatório gerado: `docs/sprint-15.2.1-homologation-report.generated.md`

## Validações manuais pendentes (checklist operacional)

Executar com PDFs reais internos (não versionados):

- [ ] Extrato mensal / detalhado por banco PF e PJ
- [ ] PIX, TED, DOC, boleto, tarifa, transferência interna
- [ ] Fatura e parcelamento (fluxo 15.1.2)
- [ ] PDF nativo vs escaneado vs foto
- [ ] PDF protegido (`PASSWORD_REQUIRED`, reprocessamento)
- [ ] Extratos 100 / 300 / 1000 linhas (UI + confirmação em lote)
- [ ] Regressão: Dashboard, Timeline, Vorcaro, Telegram, Metas, Fluxo de Caixa

## OCR e PDF nativo

Ordem mantida: **texto nativo → parser PF/PJ → OCR fallback**. Fixtures atuais não exigem OCR.

## Correções realizadas nesta sprint

- Separação PF/PJ no resolver (PJ avaliado antes de PF)
- Metadata distinta: CPF/titular vs CNPJ/razão social
- Inferência de débito/crédito por palavras-chave em linhas simples (Nubank, Inter)
- UI review exibe perfil (`PF` / `PJ`)

## Documentação relacionada

- [`docs/bank-layout-inventory.md`](bank-layout-inventory.md)
- [`docs/sprint-15.2-brazilian-bank-import-engine.md`](sprint-15.2-brazilian-bank-import-engine.md)
