# Sprint 5.9 — Relatório QA GO/NO-GO

**Data:** 2026-06-02  
**Ambiente:** `dev@logos.local` · Postgres `5433` · Redis `6380`  
**Escopo:** Homologação funcional pré-Sprint 6 (sem alteração de regras de negócio)

---

## Pré-requisitos de segurança

| Item | Resultado |
|------|-----------|
| `AUTH_SECRET` regenerado | OK (32 bytes base64) |
| `.env` no `.gitignore` | OK (`git check-ignore -v .env`) |
| `.env` rastreado pelo Git | Não |
| `npm run dev` | Não estava em execução; auditoria via serviços Prisma/API direta (reinício necessário apenas ao testar UI manualmente) |

---

## Etapa 1 — Advisor IA (`/dashboard/advisor`)

Motor: `FinancialAdvisorService` + `Groq` (primário). Dados seed validados no banco.

**Ground truth (Prisma):**

| Métrica | Valor |
|---------|-------|
| Σ Ativos | R$ 788.000,00 |
| Σ Passivos | R$ 502.000,00 |
| **Patrimônio líquido** | **R$ 286.000,00** |
| Quitação financiamentos | R$ 502.000,00 |
| Investimento (tipo INVESTMENT) | R$ 58.000,00 |

| Cenário | Pergunta | Provider & Modelo | Latência | Status |
| :--- | :--- | :--- | ---: | :--- |
| A | Qual meu patrimônio líquido? | groq / llama-3.3-70b-versatile | 1604 ms | **Pass** |
| B | Quanto falta para quitar meus financiamentos? | groq / llama-3.3-70b-versatile | 1625 ms | **Pass** |
| C | Meu fluxo de caixa ficará negativo? | groq / llama-3.3-70b-versatile | 1462 ms | **Pass** |
| D | Quanto tenho investido? | groq / llama-3.3-70b-versatile | 1149 ms | **Pass** |

**Evidência:** respostas citam valores coerentes com seed (788k ativos, 502k passivos, CDB 58k). Confiança `HIGH` em todos os cenários.

---

## Etapa 2 — Telegram (webhook & inbox)

Simulação de ingestão (`IngestInboxItemUseCase` + mappers Telegram), sem chamada real ao Bot API.

| Payload | Tipo | Canal | Status pós-ingest | Tempo | Status QA |
| :--- | :--- | :--- | :--- | ---: | :--- |
| "Abasteci R$ 250" | Texto | `TELEGRAM` | `PENDING` | 49 ms | **Pass** (ingest) |
| Imagem JPEG mínima | Foto | `TELEGRAM_IMAGE` | `PENDING` | 12 ms | **Pass** (ingest) / **Parcial** (E2E) |
| Nota de voz simulada | Áudio | `TELEGRAM_VOICE` | `PENDING` | 8 ms | **Pass** (ingest) |

**Ressalvas:**

| Severidade | Achado |
|------------|--------|
| **MÉDIO** | Status `NEEDS_CONFIRMATION` em foto **não validado** em campo (exige `ProcessInboxItemUseCase` + worker BullMQ). |
| **MÉDIO** | Especificação cita Whisper; implementação usa **Gemini** para transcrição (`ProcessTelegramUpdateService`). |
| **BAIXO** | E2E completo com webhook Telegram real não executado (requer túnel + chat vinculado). |

Testes automatizados Telegram: `webhook-auth`, `connect-command`, `generate-connect-code` — **OK**.

---

## Etapa 3 — Importação OFX & PDF

| Arquivo | Tipo | Itens detectados | Duplicados | Erro | Status |
| :--- | :--- | ---: | ---: | :--- | :--- |
| `extrato.ofx` | OFX | 2 | 0 | — | **Pass** |
| `fatura_aberta.pdf` | PDF (texto simulado pós-extração) | 4 linhas | 0 | NENHUM | **Pass** |
| `fatura_bloq.pdf` | PDF protegido | — | — | Live: parse genérico | **Parcial** |

**PDF senha:** teste live com buffer inválido retornou erro genérico; teste unitário `pdf-parser.test.ts` confirma `PDF_PASSWORD_REQUIRED` com mock pdf.js — **Pass (regressão)**.

---

## Etapa 4 — Patrimônio líquido & fluxo futuro

### Equação patrimonial

$$\text{PL} = 788.000 - 502.000 = 286.000 \quad \checkmark$$

`PatrimonyUnitOfWork.getSummary()` — **equationOk: true**

### Cashflow (`CashflowProjectionService`)

| Horizonte | Saldo projetado | Alertas | Aritmética |
| :--- | ---: | :--- | :--- |
| 7 dias | R$ 3.450,00 | `CONCENTRACAO_DESPESAS` | Ok |
| 30 dias | R$ 2.044,30 | `CONCENTRACAO_DESPESAS` | Ok |
| 90 dias | R$ 5.952,90 | `CONCENTRACAO_DESPESAS` | Ok |
| 365 dias | R$ 9.191,60 | `CONCENTRACAO_DESPESAS` | Ok |

Saldo atual contas seed: R$ 0,00. Alertas `CAIXA_NEGATIVO` e `EXCESSO_COMPROMISSOS` não dispararam neste dataset (comportamento esperado). Cobertura em `cashflow-projection.service.test.ts`.

---

## Etapa 5 — Regressão técnica

```text
npx prisma validate     ✅
npx prisma generate     ✅
npx tsc --noEmit        ✅
npm test -- --run       ✅ 90 testes (26 arquivos)
```

Log bruto: `scripts/qa-sprint-59-output.json`

---

## Consolidado de falhas

| ID | Severidade | Área | Descrição |
|----|------------|------|-----------|
| F1 | MÉDIO | Telegram | Foto não validada até `NEEDS_CONFIRMATION` sem worker ativo |
| F2 | MÉDIO | Telegram | Transcrição via Gemini, não Whisper (gap doc vs spec QA) |
| F3 | BAIXO | Telegram | Webhook E2E real não testado (depende túnel) |
| F4 | BAIXO | PDF | Erro `PDF_PASSWORD_REQUIRED` não reproduzido live; coberto por teste unitário |

**Críticos:** 0 · **Altos:** 0 · **Médios:** 2 · **Baixos:** 2

---

## 📢 DECISÃO FINAL

### **GO** para iniciar/continuar a Sprint 6

**Fundamentação:**

- Motores determinísticos (patrimônio, cashflow, import OFX, parsers) **consistentes** com seed e testes.
- Advisor IA **coerente** com banco em 4/4 cenários, fallback Groq operacional.
- Esteira de regressão **100% verde** (90 testes).
- Nenhum defeito **CRÍTICO** ou **ALTO** bloqueante.

**Condições recomendadas (não bloqueiam GO):**

1. Subir `npm run worker:inbox` ao homologar Telegram foto/voz em produção.
2. Registrar webhook Telegram via túnel antes de go-live Telegram.
3. Tratar F4 com fixture PDF protegido real em QA futuro (opcional).

---

*Gerado por `scripts/qa-sprint-59-audit.mts` · evidências em `scripts/qa-sprint-59-output.json`*
