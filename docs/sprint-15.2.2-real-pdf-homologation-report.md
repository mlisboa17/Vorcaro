# Sprint 15.2.2 — Homologação com PDFs Reais

Gerado em: 2026-06-06T04:23:05.496Z

## Resumo

- **Fixtures avaliados:** 18
- **PDFs reais (.pdf):** 0 (meta encerramento: 50+)
- **Taxa global:** 100% (18/18) — meta ≥ 95%
- **Pronto para Sprint 15.3/15.4:** Não

## PDF Success Rate por banco/perfil

| Banco | Perfil | Fixtures | Sucesso | Taxa | Meta |
|-------|--------|----------|---------|------|------|
| bb | PF | 1 | 1 | 100% | ✅ ≥90% |
| bb | PJ | 1 | 1 | 100% | ✅ ≥90% |
| bradesco | PF | 1 | 1 | 100% | ✅ ≥90% |
| bradesco | PJ | 1 | 1 | 100% | ✅ ≥90% |
| c6 | PF | 1 | 1 | 100% | ✅ ≥90% |
| c6 | PJ | 1 | 1 | 100% | ✅ ≥90% |
| inter | PF | 1 | 1 | 100% | ✅ ≥90% |
| inter | PJ | 1 | 1 | 100% | ✅ ≥90% |
| itau | PF | 1 | 1 | 100% | ✅ ≥90% |
| itau | PJ | 1 | 1 | 100% | ✅ ≥90% |
| pagbank | PF | 1 | 1 | 100% | ✅ ≥90% |
| pagbank | PJ | 1 | 1 | 100% | ✅ ≥90% |
| santander | PF | 1 | 1 | 100% | ✅ ≥90% |
| santander | PJ | 1 | 1 | 100% | ✅ ≥90% |
| sicoob | PF | 1 | 1 | 100% | ✅ ≥90% |
| sicoob | PJ | 1 | 1 | 100% | ✅ ≥90% |
| sicredi | PF | 1 | 1 | 100% | ✅ ≥90% |
| sicredi | PJ | 1 | 1 | 100% | ✅ ≥90% |

## Falhas identificadas

_Nenhuma falha registrada._

## Detalhes por fixture

- ✅ `bb/pf/extrato-mensal-pf.txt` — bb/PF — EXTRATO — fonte WEB — 4 tx — conf 87% — OCR: não — 0ms
- ✅ `bb/pj/extrato-empresarial-pj.txt` — bb/PJ — EXTRATO — fonte WEB — 4 tx — conf 87% — OCR: não — 0ms
- ✅ `bradesco/pf/extrato-pf.txt` — bradesco/PF — EXTRATO — fonte WEB — 3 tx — conf 98% — OCR: não — 0ms
- ✅ `bradesco/pj/extrato-empresarial-pj.txt` — bradesco/PJ — EXTRATO — fonte WEB — 3 tx — conf 98% — OCR: não — 0ms
- ✅ `c6/pf/extrato-pf.txt` — c6/PF — EXTRATO — fonte WEB — 5 tx — conf 81% — OCR: não — 0ms
- ✅ `c6/pj/extrato-pj.txt` — c6/PJ — EXTRATO — fonte WEB — 5 tx — conf 72% — OCR: não — 0ms
- ✅ `inter/pf/extrato-pf.txt` — inter/PF — EXTRATO — fonte WEB — 4 tx — conf 87% — OCR: não — 0ms
- ✅ `inter/pj/extrato-empresas-pj.txt` — inter/PJ — EXTRATO — fonte WEB — 4 tx — conf 87% — OCR: não — 0ms
- ✅ `itau/pf/extrato-pf.txt` — itau/PF — EXTRATO — fonte WEB — 4 tx — conf 87% — OCR: não — 0ms
- ✅ `itau/pj/extrato-pj.txt` — itau/PJ — EXTRATO — fonte WEB — 4 tx — conf 87% — OCR: não — 0ms
- ✅ `pagbank/pf/extrato-pf.txt` — pagbank/PF — EXTRATO — fonte ANDROID — 4 tx — conf 87% — OCR: não — 0ms
- ✅ `pagbank/pj/extrato-pj.txt` — pagbank/PJ — EXTRATO — fonte WEB — 3 tx — conf 84% — OCR: não — 0ms
- ✅ `santander/pf/extrato-pf.txt` — santander/PF — EXTRATO — fonte WEB — 4 tx — conf 87% — OCR: não — 0ms
- ✅ `santander/pj/extrato-pj.txt` — santander/PJ — EXTRATO — fonte WEB — 4 tx — conf 87% — OCR: não — 0ms
- ✅ `sicoob/pf/extrato-pf.txt` — sicoob/PF — EXTRATO — fonte WEB — 4 tx — conf 87% — OCR: não — 0ms
- ✅ `sicoob/pj/extrato-pj.txt` — sicoob/PJ — EXTRATO — fonte WEB — 5 tx — conf 81% — OCR: não — 0ms
- ✅ `sicredi/pf/extrato-pf.txt` — sicredi/PF — EXTRATO — fonte WEB — 4 tx — conf 87% — OCR: não — 0ms
- ✅ `sicredi/pj/extrato-pj.txt` — sicredi/PJ — EXTRATO — fonte WEB — 5 tx — conf 81% — OCR: não — 0ms

## Critério para encerrar 15.2.2

⏳ 50+ PDFs reais homologados (0/50)
✅ 95% de sucesso médio (100%)
⏳ 0 bugs críticos — validação manual
⏳ Telegram validado (PIX, extrato, fatura, PDF protegido)
⏳ PDF protegido validado (PASSWORD_REQUIRED, reprocessamento)

Só avançar para **Sprint 15.3 OFX/CSV** e **Sprint 15.4 Conciliação Bancária** quando todos os critérios acima estiverem ✅.

## Ações corretivas sugeridas

- Manter massa real atualizada em `tests/fixtures/bank-statements/real/`.

## OCR Benchmark

| Cenário | Arquivo | Tempo (ms) | Texto | OCR? | Fallback | Conf |
|---------|---------|------------|-------|------|----------|------|
| NATIVE_PDF | _samples/installments/parcelas-fatura.txt | 0 | 147 chars | não | não | 92 |
| NATIVE_PDF | _samples/large/extrato-100-linhas.txt | 0 | 6287 chars | não | não | 95 |
| NATIVE_PDF | _samples/large/extrato-1000-linhas.txt | 0 | 63855 chars | não | não | 95 |
| NATIVE_PDF | _samples/large/extrato-300-linhas.txt | 0 | 18943 chars | não | não | 95 |
| SCANNED | _samples/ocr/extrato-scanned.txt | 0 | 69 chars | sim | sim | 30 |
| PHOTO_RECEIPT | _samples/ocr/foto-comprovante.txt | 0 | 46 chars | sim | sim | 49 |
| PIX_PRINT | _samples/pix/comprovante-pix-ios.txt | 0 | 133 chars | não | não | 49 |

## Checklists manuais (Etapas 7–9)

### PDF protegido
- [ ] Senha correta → importação OK
- [ ] Senha incorreta → `PDF_PASSWORD_REQUIRED` / senha inválida
- [ ] Troca de senha + reprocessamento sem perder histórico

### Extratos grandes
- [ ] 100 linhas — tabela, performance, lote
- [ ] 300 linhas — tabela, performance, lote
- [ ] 1000 linhas — tabela, performance, lote

### Telegram
- [ ] PIX — ack imediato, resumo, link review
- [ ] Extrato — ack, resumo batch, review obrigatório
- [ ] Fatura — parcelas, review
- [ ] PDF protegido — solicita senha, reprocessa

---

## Etapa 1 — Inventário de PDFs

## Inventário automático de fixtures

Atualizado em: 2026-06-06T04:23:05.458Z

- **Total arquivos:** 25
- **PDFs reais (.pdf):** 0
- **Texto derivado (.txt):** 25

| Arquivo | Banco | Perfil | Tipo | Páginas | Protegido? | OCR? | Canal | Status | Observações |
|---------|-------|--------|------|---------|------------|------|-------|--------|-------------|
| `_samples/installments/parcelas-fatura.txt` | bradesco | PF | txt | 1 | Não | Não | WEB | PARCIAL | Bootstrap sintético — aguardando PDF real |
| `_samples/large/extrato-100-linhas.txt` | bradesco | PJ | txt | 1 | Não | Não | WEB | PARCIAL | Stress test 100 linhas |
| `_samples/large/extrato-1000-linhas.txt` | bradesco | PJ | txt | 1 | Não | Não | WEB | PARCIAL | Stress test 1000 linhas |
| `_samples/large/extrato-300-linhas.txt` | bradesco | PJ | txt | 1 | Não | Não | WEB | PARCIAL | Stress test 300 linhas |
| `_samples/ocr/extrato-scanned.txt` | bradesco | PF | txt | 1 | Não | Sim | SCANNED | NAO_HOMOLOGADO | Bootstrap sintético — aguardando PDF real |
| `_samples/ocr/foto-comprovante.txt` | unknown | UNKNOWN | txt | 1 | Não | Sim | SCANNED | NAO_HOMOLOGADO | Bootstrap sintético — aguardando PDF real |
| `_samples/pix/comprovante-pix-ios.txt` | bradesco | PF | txt | 1 | Não | Não | IOS | NAO_HOMOLOGADO | Bootstrap sintético — aguardando PDF real |
| `bb/pf/extrato-mensal-pf.txt` | bb | PF | txt | 1 | Não | Não | WEB | PARCIAL | Fixture sintético anonimizado — substituir por PDF real interno |
| `bb/pj/extrato-empresarial-pj.txt` | bb | PJ | txt | 1 | Não | Não | WEB | PARCIAL | Fixture sintético anonimizado — substituir por PDF real interno |
| `bradesco/pf/extrato-pf.txt` | bradesco | PF | txt | 1 | Não | Não | WEB | PARCIAL | Fixture sintético anonimizado — substituir por PDF real interno |
| `bradesco/pj/extrato-empresarial-pj.txt` | bradesco | PJ | txt | 1 | Não | Não | WEB | PARCIAL | Fixture sintético anonimizado — substituir por PDF real interno |
| `c6/pf/extrato-pf.txt` | c6 | PF | txt | 1 | Não | Não | WEB | PARCIAL | Fixture sintético anonimizado — substituir por PDF real interno |
| `c6/pj/extrato-pj.txt` | c6 | PJ | txt | 1 | Não | Não | WEB | PARCIAL | Fixture sintético anonimizado — substituir por PDF real interno |
| `inter/pf/extrato-pf.txt` | inter | PF | txt | 1 | Não | Não | WEB | PARCIAL | Fixture sintético anonimizado — substituir por PDF real interno |
| `inter/pj/extrato-empresas-pj.txt` | inter | PJ | txt | 1 | Não | Não | WEB | PARCIAL | Fixture sintético anonimizado — substituir por PDF real interno |
| `itau/pf/extrato-pf.txt` | itau | PF | txt | 1 | Não | Não | WEB | PARCIAL | Fixture sintético anonimizado — substituir por PDF real interno |
| `itau/pj/extrato-pj.txt` | itau | PJ | txt | 1 | Não | Não | WEB | PARCIAL | Fixture sintético anonimizado — substituir por PDF real interno |
| `pagbank/pf/extrato-pf.txt` | pagbank | PF | txt | 1 | Não | Não | ANDROID | PARCIAL | Fixture sintético anonimizado — substituir por PDF real interno |
| `pagbank/pj/extrato-pj.txt` | pagbank | PJ | txt | 1 | Não | Não | WEB | PARCIAL | Fixture sintético anonimizado — substituir por PDF real interno |
| `santander/pf/extrato-pf.txt` | santander | PF | txt | 1 | Não | Não | WEB | PARCIAL | Fixture sintético anonimizado — substituir por PDF real interno |
| `santander/pj/extrato-pj.txt` | santander | PJ | txt | 1 | Não | Não | WEB | PARCIAL | Fixture sintético anonimizado — substituir por PDF real interno |
| `sicoob/pf/extrato-pf.txt` | sicoob | PF | txt | 1 | Não | Não | WEB | PARCIAL | Fixture sintético anonimizado — substituir por PDF real interno |
| `sicoob/pj/extrato-pj.txt` | sicoob | PJ | txt | 1 | Não | Não | WEB | PARCIAL | Fixture sintético anonimizado — substituir por PDF real interno |
| `sicredi/pf/extrato-pf.txt` | sicredi | PF | txt | 1 | Não | Não | WEB | PARCIAL | Fixture sintético anonimizado — substituir por PDF real interno |
| `sicredi/pj/extrato-pj.txt` | sicredi | PJ | txt | 1 | Não | Não | WEB | PARCIAL | Fixture sintético anonimizado — substituir por PDF real interno |


## Etapa 4 — Parcelamentos

| Padrão | Parcela atual | Total | OK |
|--------|---------------|-------|-----|
| 2/12 | 2 | 12 | ✅ |
| 3/10 | 3 | 10 | ✅ |
| 4/24 | 4 | 24 | ✅ |
| 5/24 | 5 | 24 | ✅ |

- **Revisão obrigatória:** Sim
- **Compras detectadas:** 1
- **Compromissos automáticos:** Não (confirmação humana obrigatória)

## Etapa 8 — Extratos grandes (benchmark)

| Linhas | Tempo parse (ms) | Transações | Δ heap (MB) |
|--------|------------------|------------|-------------|
| 100 | 1 | 100 | 0 |
| 300 | 2 | 300 | 1 |
| 1000 | 5 | 1000 | -2 |

## Etapas 5–7 — Validação automatizada (testes Vitest)

Executar localmente:

```bash
npm test -- --run src/lib/parsers/__tests__/pdf-parser.test.ts
npm test -- --run src/modules/financial-documents/__tests__/financial-document-reimport-hotfix.test.ts
npm test -- --run src/modules/financial-documents/__tests__/financial-document-bank-statement-installments.test.ts
npm test -- --run src/modules/financial-documents/__tests__/financial-document-review-hardening.test.ts
```

| Área | Suite | Escopo |
|------|-------|--------|
| PDF protegido | `pdf-parser.test.ts` | PASSWORD_REQUIRED, senha inválida |
| Reprocessamento | `financial-document-reimport-hotfix.test.ts` | REJECTED, FAILED, sem duplicar |
| Telegram | `financial-document-review-hardening.test.ts` | Resumo, link review, baixa confiança |
| Parcelamentos | `financial-document-bank-statement-installments.test.ts` | Detecção + confirmação humana |

## Veredicto Sprint 15.2.2

| Critério | Status |
|----------|--------|
| 50+ PDFs reais | ❌ (0/50) |
| Sucesso médio ≥ 95% | ✅ (100%) |
| Parcelamentos 2/12–5/24 | ✅ |
| Extratos grandes benchmark | ✅ |
| Telegram homologado | ⏳ Validar manualmente / testes unitários |
| PDF protegido homologado | ⏳ Validar manualmente / testes unitários |
| 0 bugs críticos | ⏳ Nenhuma falha parser na massa atual |

**Sprint encerrada:** NÃO

> ⚠️ **Nenhum PDF real (.pdf) encontrado** em `tests/fixtures/bank-statements/real/`. Copie PDFs anonimizados para `{banco}/{pf|pj}/` com sidecar `.meta.json` e reexecute este script.