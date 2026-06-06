# Inventário de layouts bancários — Sprint 15.2.2

Catálogo de layouts para homologação com **PDFs reais**. Massa sintética bootstrap em `tests/fixtures/bank-statements/real/`; substituir por PDFs internos anonimizados conforme avança a homologação.

**Não commitar PDFs com dados de clientes.** Use sidecar `.meta.json` ao lado de cada arquivo.

## Legenda

| Campo | Valores |
|-------|---------|
| **Canal** | Web · Android · iPhone (IOS) · Scanned · Unknown |
| **Tipo** | Extrato · PIX · TED · DOC · Fatura |
| **Status** | Não homologado · Parcial · Homologado |
| **Meta taxa** | ≥ 90% por banco/perfil · ≥ 95% global para encerrar 15.2.2 |

## Catálogo P1 — Extrato conta corrente

| Banco | Perfil | Canal | Tipo | PDF protegido? | OCR? | Status | Taxa | Observações |
|-------|--------|-------|------|----------------|------|--------|------|-------------|
| Banco do Brasil | PF | Web | Extrato | Não | Não | Parcial | — | Fixture sintético; aguardando PDF real |
| Banco do Brasil | PJ | Web | Extrato | Não | Não | Parcial | — | Parser `bb-pj-parser` |
| Bradesco | PF | Web | Extrato | Não | Não | Parcial | — | Colunas Bradesco |
| Bradesco | PJ | Web | Extrato | Não | Não | Parcial | — | Layout empresarial |
| Itaú | PF | Web | Extrato | Não | Não | Parcial | — | Linha data + valor |
| Itaú | PJ | Web | Extrato | Não | Não | Parcial | — | |
| Santander | PF | Web | Extrato | Não | Não | Parcial | — | |
| Santander | PJ | Web | Extrato | Não | Não | Parcial | — | |
| Banco Inter | PF | Web | Extrato | Não | Não | Parcial | — | |
| Banco Inter | PJ | Web | Extrato | Não | Não | Parcial | — | Requer marcador empresarial |
| Sicredi | PF | Web | Extrato | Não | Não | Parcial | — | Cooperado PF |
| Sicredi | PJ | Web | Extrato | Não | Não | Parcial | — | Cooperado PJ |
| Sicoob | PF | Web | Extrato | Não | Não | Parcial | — | |
| Sicoob | PJ | Web | Extrato | Não | Não | Parcial | — | |
| C6 Bank | PF | Web | Extrato | Não | Não | Parcial | — | Parser single-bank |
| C6 Bank | PJ | Web | Extrato | Não | Não | Parcial | — | |
| PagBank | PF | Android | Extrato | Não | Não | Parcial | — | Export app Android |
| PagBank | PJ | Web | Extrato | Não | Não | Parcial | — | Canal internet |

## Catálogo P2 — Comprovantes e faturas (amostras)

| Banco | Perfil | Canal | Tipo | PDF protegido? | OCR? | Status | Taxa | Observações |
|-------|--------|-------|------|----------------|------|--------|------|-------------|
| Bradesco | PF | iPhone | PIX | Não | Não | Não homologado | — | `_samples/pix/` |
| Bradesco | PF | Scanned | Extrato | Não | Sim | Não homologado | — | `_samples/ocr/` |
| Genérico | — | Scanned | PIX (foto) | Não | Sim | Não homologado | — | Foto comprovante |
| Bradesco | PJ | Web | Extrato 100/300/1000 lin | Não | Não | Parcial | — | Stress test performance |

## BankLayoutSource

Registrado automaticamente no relatório 15.2.2:

```typescript
type BankLayoutSource = "WEB" | "ANDROID" | "IOS" | "SCANNED" | "UNKNOWN";
```

Detecção heurística em `bank-layout-source.detector.ts`; sidecar `.meta.json` pode fixar a fonte.

## Sidecar `.meta.json`

Exemplo ao lado de `extrato-pf.pdf`:

```json
{
  "source": "WEB",
  "documentType": "EXTRATO",
  "passwordProtected": false,
  "pdfPassword": null,
  "homologationStatus": "NAO_HOMOLOGADO",
  "notes": "PDF real interno — jun/2026"
}
```

## Como atualizar

1. Colocar PDF (ou `.txt` derivado) em `tests/fixtures/bank-statements/real/{banco}/{pf|pj}/`.
2. Adicionar `.meta.json` com canal, tipo e senha se protegido.
3. Bootstrap inicial: `npx tsx scripts/bootstrap-sprint-15.2.2-fixtures.ts`
4. Homologação: `npx tsx scripts/sprint-15.2.2-real-pdf-homologation.ts`
5. Atualizar taxas nesta tabela e em `docs/sprint-15.2.2-real-pdf-homologation-report.md`.

## Critério de encerramento 15.2.2

- 50+ PDFs reais homologados
- 95% sucesso médio
- 0 bugs críticos
- Telegram validado
- PDF protegido validado

Só então: Sprint 15.3 (OFX/CSV) e Sprint 15.4 (Conciliação).

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
