# Sprint 15.1 — OCR Real Local com PaddleOCR

**Objetivo:** substituir OCR mockado por OCR real local e gratuito, mantendo revisão humana obrigatória.

---

## Arquitetura

```text
LOGOS / Vorcaro
  ↓
FinancialDocumentOcrService (observabilidade)
  ↓
createFinancialOcrProvider()
  ↓
HybridFinancialOcrProvider
  ├── PDF nativo → pdfjs (parsePdf)
  ├── PDF escaneado / imagem → PaddleOcrHttpProvider
  └── fallback → BasicFinancialOcrProvider (serviço offline)
  ↓
ocr-service (FastAPI + PaddleOCR, Docker :8008)
```

---

## Subir o serviço OCR

```bash
# Build + start (primeira vez demora — download de modelos Paddle)
docker compose up -d ocr

# Health
curl http://localhost:8008/health
# {"status":"ok","provider":"paddleocr","lang":"pt"}

# Logs
docker logs -f logos-ocr
```

---

## Configuração LOGOS

`.env`:

```env
OCR_PROVIDER=paddle
OCR_SERVICE_URL=http://localhost:8008
```

| Variável | Valores | Default |
|----------|---------|---------|
| `OCR_PROVIDER` | `paddle` \| (vazio) | basic only |
| `OCR_SERVICE_URL` | URL base | `http://localhost:8008` |

Com `OCR_PROVIDER=paddle`, se o serviço estiver offline o upload **não quebra** — usa fallback basic e segue para `REVIEW_REQUIRED` ou `FAILED` conforme texto extraído.

---

## API do microserviço

```http
POST /ocr
Content-Type: multipart/form-data

file: (binary)
password: (opcional, PDF protegido)
```

Resposta:

```json
{
  "text": "...",
  "confidence": 87,
  "provider": "paddleocr",
  "pages": 1,
  "raw": { "line_count": 12, "elapsed_ms": 450 }
}
```

---

## Pré-processamento (Python)

- Rotação automática (`use_angle_cls` PaddleOCR)
- Grayscale + CLAHE (contraste)
- PDF escaneado: renderização via PyMuPDF 2×

---

## Sanitização (TypeScript)

`ocr-text-sanitizer.ts` remove artefatos `JFIF`, `PNG`, `RIFF`, `WEBP` do texto OCR.

---

## Observabilidade

Logs JSON no Next.js (`scope: financial-document-ocr`):

- `ocr_provider_used`
- `ocr_elapsed_ms`
- `ocr_confidence`
- `ocr_failed`
- `ocr_fallback_used`

---

## Limitações

- PaddleOCR roda em **CPU** no Docker — 2–10 s por imagem típica
- Primeira build Docker ~5–15 min (Paddle + modelos)
- Máximo **10 páginas** por PDF (`OCR_MAX_PAGES`)
- Idioma padrão **pt** (`OCR_LANG`)
- Sem APIs pagas (Google Vision, Azure, AWS Textract)

---

## Trocar provider no futuro

1. Implementar `FinancialOcrProvider` em `infrastructure/ocr/`
2. Registrar em `create-financial-ocr-provider.ts`
3. Adicionar valor em `OCR_PROVIDER` (ex.: `tesseract`, `cloud-x`)
4. Manter `HybridFinancialOcrProvider` para fallback

---

## Arquivos

| Arquivo | Papel |
|---------|-------|
| `services/ocr/main.py` | FastAPI + PaddleOCR |
| `services/ocr/Dockerfile` | Container CPU |
| `paddle-ocr-http.provider.ts` | Cliente HTTP |
| `hybrid-financial-ocr.provider.ts` | PDF nativo + escaneado + fallback |
| `create-financial-ocr-provider.ts` | Factory por env |

---

## Validação

```bash
npm test -- --run src/modules/financial-documents
npx tsc --noEmit
npx prisma validate
```

Checklist manual: [`sprint-15.1-ocr-real-checklist.md`](sprint-15.1-ocr-real-checklist.md)
