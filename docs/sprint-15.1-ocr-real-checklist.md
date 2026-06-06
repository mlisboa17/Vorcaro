# Sprint 15.1 — Checklist Manual OCR Real (PaddleOCR)

Complementa testes automatizados. Marque após validação humana.

**Pré-requisitos**

```bash
docker compose up -d ocr
# aguardar healthcheck (~2 min na primeira build)
curl http://localhost:8008/health

# .env
OCR_PROVIDER=paddle
OCR_SERVICE_URL=http://localhost:8008

npm run dev:all
```

---

## Imagens

- [ ] Print PIX Nubank
- [ ] Print PIX Itaú
- [ ] Print PIX Banco do Brasil
- [ ] Foto de comprovante
- [ ] Foto torta (rotação)
- [ ] Foto escura

**Critério:** texto legível na revisão; sem `JFIF`/`PNG`/`WEBP` no OCR expandido.

---

## PDFs

- [ ] PDF com texto nativo (extrato digital)
- [ ] PDF escaneado (imagem por página)
- [ ] PDF protegido por senha → `PASSWORD_REQUIRED` → informar senha → reprocessar

---

## Telegram

- [ ] Enviar imagem
- [ ] Enviar PDF
- [ ] Receber ack imediato (“Documento recebido…”)
- [ ] Receber resumo OCR estruturado
- [ ] Confirmar quando confiança ≥ 70 e dados completos
- [ ] Bloqueio quando confiança &lt; 70 (editar no dashboard)

---

## Fallback

- [ ] Parar container OCR (`docker stop logos-ocr`) → upload não quebra (fallback basic)
- [ ] Reiniciar OCR → texto real volta

---

## Observabilidade

Verificar logs do Next.js:

```text
ocr_provider_used
ocr_elapsed_ms
ocr_confidence
ocr_fallback_used
```

---

## Regressão

- [ ] Revisão humana ainda obrigatória
- [ ] Nenhum lançamento automático
- [ ] Aprendizado contínuo intacto
