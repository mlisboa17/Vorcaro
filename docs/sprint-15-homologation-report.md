# Sprint 15.0 — Relatório de Homologação Operacional

**Data:** 2026-06-05  
**Escopo:** Captura inteligente de transações (Sprint 15)  
**Modo:** Validar · Medir · Registrar evidências (sem alteração de código de produção)

---

## Veredito

| Item | Resultado |
|------|-----------|
| **Status geral** | **HOMOLOGAÇÃO PARCIAL — CONDICIONAL** |
| **Liberação Sprint 15.1 (OCR real)** | **NÃO LIBERADA** nesta rodada |
| **Motivo** | 14 blocos exigem validação manual (PDFs reais, Telegram, mobile, performance visual, regressão UI). Nenhum bug CRÍTICO/ALTO detectado na automação, porém critérios de liberação exigem **todos** os blocos executados. |

---

## Ambiente

| Verificação | Resultado | Evidência |
|-------------|-----------|-----------|
| `docker compose ps` | **PASS** | `logos-postgres` e `logos-redis` — **Up (healthy)** |
| `npx prisma migrate deploy` | **PASS** | Migration `20260610120000_financial_documents_sprint15` aplicada |
| `npx prisma migrate status` | **PASS** | `Database schema is up to date` |
| `npm run dev` | **PASS** | Next.js 15.5.18 em `http://localhost:3000` |
| Regressão automatizada | **PASS** | `npm test -- --run` → **488/488** · `npx tsc --noEmit` → **0 erros** |

**Script de homologação:** `npx tsx scripts/sprint-15-homologation-validation.ts`  
**Resultados JSON:** `scripts/sprint-15-homologation-results.json`  
**Automação:** 21 PASS · 0 FAIL · 14 MANUAL

---

## Resumo por bloco

### BLOCO 0 — Ambiente

- Containers PostgreSQL e Redis saudáveis.
- Schema Sprint 15 aplicado com sucesso.

### BLOCO 1 — Upload de PDFs

| Fluxo | Status | Detalhe |
|-------|--------|---------|
| Upload PNG (pipeline) | **PASS** | `UPLOADED` → `PROCESSING` → `REVIEW_REQUIRED` em ~103 ms |
| PDF Nubank / Inter / fatura / boleto | **MANUAL** | Massa real não disponível no repositório; validar no browser com arquivos operacionais |

**Observação:** Status intermediário `EXTRACTED` **não aparece** no fluxo atual (`UPLOADED` → `PROCESSING` → `REVIEW_REQUIRED` ou `FAILED`). Ver bug BAIXO #3.

### BLOCO 2 — Upload de imagens

| Cenário | OCR | Pipeline | Status |
|---------|-----|----------|--------|
| Buffer com texto ASCII (simula comprovante) | OCR TOTAL | Sem erro 500 | **PASS** |
| Bytes PNG sem texto legível | OCR FALHOU (placeholder) | Não travou; gerou `REVIEW_REQUIRED` | **PASS*** |
| Fotos reais (escura, torta, cortada) | — | — | **MANUAL** |

\* Pipeline estável, porém sugestão com dados vazios deveria preferencialmente ir para `FAILED` — ver bug BAIXO #8.

### BLOCO 3 — Identificação do tipo de documento

| Tipo | method esperado | method obtido | Status |
|------|-----------------|---------------|--------|
| PIX | `PIX` | `PIX` | **PASS** |
| TED/DOC | `TRANSFERENCIA` | `TRANSFERENCIA` | **PASS** |
| Boleto | `BOLETO` | `BOLETO` | **PASS** |
| Fatura/Cartão | `CARTAO_CREDITO` | `CARTAO_CREDITO` | **PASS** |

### BLOCO 4 — Extração de dados

| Documento | Valor | Data | Fornecedor | Chave PIX | Classificação |
|-----------|-------|------|------------|-----------|---------------|
| PIX Nubank simulado | R$ 350,00 | 04/06/2026 | Posto Lisboa | posto.lisboa@email.com | **ALTA precisão** |

Extração validada via parser heurístico + pipeline DB. PDFs/imagens reais: **MANUAL**.

### BLOCO 5 — Sugestão de categoria

| Cenário | Esperado | Automação | Status |
|---------|----------|-----------|--------|
| Posto → Transporte / Combustível | Heurística `posto` | Aprendizado + regras sistema validados no DB | **PARCIAL** |
| Mercado / Farmácia / Assinatura | Taxonomia | Requer massa real + taxonomia seed do usuário | **MANUAL** |

Aprendizado por chave PIX confirmado (`source=learned_pix_key`, confiança 96%).

### BLOCO 6 — Aprendizado contínuo

| Cenário | Resultado | Status |
|---------|-----------|--------|
| 6.0 Registrar decisão (Posto Lisboa → Combustível) | Padrão persistido | **PASS** |
| 6.1 Reutilização automática | `isLearnedPattern=true`, confiança 96 | **PASS** |
| 6.2 Correção (Alimentação → Combustível) | Última decisão prevalece | **PASS** |
| 6.3 Duplicidade upload (mesmo nome + conteúdo) | HTTP 409 / `DUPLICATE` | **PASS** |
| 6.3 Duplicidade semântica (mesmo PIX, arquivos diferentes) | `FAILED` + `DUPLICATE_SEMANTIC` | **PASS** |

### BLOCO 7 — Tela de revisão (`/dashboard/import/review`)

| Fluxo | Serviço/API | UI | Status |
|-------|-------------|-----|--------|
| Aprovar → Transaction | **PASS** | Botão "Aprovar lançamento" presente | **PARCIAL** |
| Rejeitar → `REJECTED` | **PASS** | Botão "Rejeitar" presente | **PARCIAL** |
| Editar categoria/descrição/data | PATCH `/api/import/suggestions/:id` existe | **Sem formulário inline** | **MANUAL / GAP** |

### BLOCO 8 — Histórico (`/dashboard/import/history`)

| Fluxo | API | UI | Status |
|-------|-----|-----|--------|
| Listagem documentos | **PASS** (7 docs no teste) | Lista fileName + status | **PARCIAL** |
| Filtros / paginação | Query `?status=` na API | UI sem filtros dedicados | **MANUAL / GAP** |

### BLOCO 9 — Padrões aprendidos

| Fluxo | API | UI | Status |
|-------|-----|-----|--------|
| Listar padrões PIX/CPF/nome | **PASS** | Exibido em Histórico | **PASS** |
| Excluir padrão | **PASS** | Botão "Remover" | **PASS** |
| Editar padrão | PATCH `/api/import/learning-patterns/:id` | **Não exposto na UI** | **MANUAL / GAP** |

### BLOCO 10 — Telegram

| Esperado | Implementado | Status |
|----------|--------------|--------|
| Ack imediato "Documento recebido / Processando..." | Processamento inline; resposta após OCR | **MANUAL / GAP** |
| Resumo valor/fornecedor/categoria | Implementado em `TelegramFinancialDocumentService` | **MANUAL** |
| Botões Confirmar / Editar / Rejeitar | Callbacks `doc_approve`, `doc_edit`, `doc_reject` | **MANUAL** |

### BLOCO 11 — Segurança (multitenancy)

| Teste | Resultado | Status |
|-------|-----------|--------|
| User B acessa documento de User A | Repositório retorna `null` → API **404** | **PASS** |
| Rotas sem sessão | `GET /api/import/*` → **401** | **PASS** |
| Vazamento cross-tenant | Não observado | **PASS** |

### BLOCO 12 — Mobile

Upload galeria / câmera / compartilhar — **MANUAL** (mesmo componente web responsivo; não testado em dispositivo).

### BLOCO 13 — Performance

| Métrica | Valor (automação) | Status |
|---------|-------------------|--------|
| Tempo médio/documento (1 PNG texto) | ~103 ms | Referência |
| 10 PDFs + 10 imagens simultâneos | — | **MANUAL** |

### BLOCO 14 — Regressão geral

| Área | Automação | UI manual |
|------|-----------|-----------|
| Testes unitários/integração | **488 PASS** | — |
| Dashboard, Caixa, Lançamentos, etc. | Cobertura parcial via testes | **MANUAL** |

---

## Bugs e lacunas registrados

| ID | Severidade | Bloco | Descrição | Evidência |
|----|------------|-------|-----------|-----------|
| 15.0-01 | **MÉDIO** | 7 | UI de revisão não permite editar categoria, descrição ou data antes de aprovar; apenas Aprovar/Rejeitar. API PATCH disponível. | `import-dashboard.tsx` — sem chamada PATCH |
| 15.0-02 | **MÉDIO** | 10 | Telegram não envia ack "Documento recebido / Processando..." antes do processamento. | `telegram-financial-document.service.ts` |
| 15.0-03 | **BAIXO** | 1 | Status `EXTRACTED` definido no enum mas não usado no fluxo. | `financial-document-processing.service.ts` |
| 15.0-04 | **BAIXO** | 2 | OCR de imagem real usa placeholder (texto vazio); previsto para Sprint 15.1. | `basic-financial-ocr.provider.ts` |
| 15.0-05 | **BAIXO** | 6.3 | Fingerprint de upload inclui `fileName`; mesmo conteúdo com nome diferente só bloqueia na duplicidade semântica (pós-OCR). | `document-fingerprint.service.ts` |
| 15.0-06 | **BAIXO** | 8 | Histórico UI sem filtros nem paginação (API suporta `?status=`). | `import-dashboard.tsx` |
| 15.0-07 | **BAIXO** | 9 | Edição de padrão aprendido só via API; UI só remove. | `import-dashboard.tsx` |
| 15.0-08 | **BAIXO** | 2 | Imagem sem texto OCR gera `REVIEW_REQUIRED` com sugestão vazia em vez de `FAILED`. | Resultado script homologação |
| 15.0-09 | **MÉDIO** | 1 | PDF protegido por senha retorna **500** (`PDF_PASSWORD_REQUIRED`) em vez de erro 4xx tratado na UI. | Log dev server: `POST /api/import/documents 500` |

**Bugs CRÍTICOS:** 0  
**Bugs ALTOS:** 0  

### Evidência — sessão manual (dev server)

Durante homologação no browser, as telas de importação compilaram e responderam **200**. Uploads bem-sucedidos retornaram **201**; um PDF com senha disparou **500** (bug 15.0-09).

---

## Critérios de aprovação

### Funcional

- [x] Upload imagem (pipeline) funcionando
- [ ] Upload PDF com massa real — **MANUAL pendente**
- [x] OCR processando (PDF via pdfjs; imagem placeholder/fallback)
- [x] Parser identificando PIX/TED/Boleto/Cartão
- [x] Sugestões geradas no pipeline
- [x] Review aprovar/rejeitar (serviço)
- [x] Histórico listagem (API + UI básica)

### Aprendizado

- [x] Aprendizado persistido
- [x] Aprendizado reutilizado
- [x] Correção de aprendizado funcionando
- [x] Duplicidade bloqueada (upload + semântica)

### Integrações

- [ ] Telegram — **MANUAL pendente**
- [ ] Mobile — **MANUAL pendente**

### Segurança

- [x] Ownership validado
- [x] Cross-tenant retorna 404 (via repositório)
- [x] Sem vazamento observado

### Estabilidade

- [x] Sem bugs CRÍTICOS
- [x] Sem bugs ALTOS
- [ ] Regressão UI completa — **MANUAL pendente**

---

## Critério final de liberação (Sprint 15.1)

| Critério | Atendido |
|----------|----------|
| Todos os blocos executados | **Não** (14 MANUAL) |
| Nenhum bug crítico aberto | **Sim** |
| Nenhum bug alto aberto | **Sim** |
| Pipeline completo validado | **Parcial** (automação + parser; PDFs reais pendentes) |
| Aprendizado contínuo funcionando | **Sim** |
| Telegram validado | **Não** |
| Banco íntegro | **Sim** |
| Regressão inexistente | **Parcial** (488 testes OK; UI manual pendente) |

---

## Próximos passos recomendados

1. Executar checklist manual com massa real (PDFs Nubank/Inter, fatura, boleto, prints PIX).
2. Validar Telegram com bot configurado (`TELEGRAM_BOT_TOKEN`, webhook).
3. Testar mobile (Safari/Chrome Android) nos mesmos fluxos de upload.
4. Stress test: 10 PDFs + 10 imagens e registrar tempos.
5. Decidir se gaps **MÉDIO** (#01 UI edit, #02 Telegram ack) entram na 15.1 ou hotfix pré-OCR.
6. Após blocos MANUAL concluídos, atualizar este relatório e reassinar liberação.

---

## Comandos de reprodução

```bash
docker compose up -d
npx prisma migrate deploy
npm run dev

# Validação automatizada
npx tsx scripts/sprint-15-homologation-validation.ts

# Regressão
npm test -- --run
npx tsc --noEmit
```

---

*Relatório gerado na Sprint 15.0. Nenhum commit/tag/push realizado.*
