# Roadmap — Sprints 16+ (Telegram, Onboarding, Home Acionável, IA e Relatórios)

> Consolidação das melhorias planejadas após o Sprint 15.2.x.
> Cada sprint marca o **estado atual** (auditado no código) e o **delta** (o que falta construir).
> Status: ✅ pronto · 🟡 parcial · 🔴 novo.

---

## Sprint 16 — Telegram: edição inline + receitas + humanização ✅ CONCLUÍDO

Objetivo: bot reconhece entradas/saídas corretamente, suporta áudio, é mais humano e permite editar registros (categoria, local, valor) direto no chat.

**Status: fechado.** 16.1 (edição inline + confirmar cria transação), 16.2
(receita por verbos no texto), 16.3 (receita/edição em voz), 16.4 (respostas
humanizadas variadas). Ver `sprint-16.1-*`, `sprint-16.3-*`.

### 16.1 — Edição inline de categoria, local e valor 🟡🔴
- ✅ Já existe: botões inline (`telegram-inline-actions.ts`, `telegram-document-actions.ts`), callback handler (`process-telegram-update.service.ts::executeCallback`), botão "🔄 Alterar" que mostra 3 categorias sugeridas pela IA.
- 🔴 **Falta**: editar **local** (estabelecimento) e **valor** por botão inline — hoje só categoria.
  - Fluxo: botão "✏️ Editar valor" / "📍 Editar local" → bot pede o novo dado → aplica via `PrismaTransactionRepository.updateById` (já existe em `src/app/api/transactions/[id]/route.ts`).
  - Estado de conversa curto no Redis (`telegram:edit_pending:<chatId>`) — padrão já usado para senha de PDF.

### 16.2 — Detecção de receita por verbos 🟡🔴
- ✅ Já existe: Gemini classifica `INCOME` na extração; `detect-receivable-hint.ts` (mas só para "contas a receber", verbos "comprei/gastei para X").
- 🔴 **Falta**: detectar verbos de entrada ("recebi", "ganhei", "depósito", "caiu", "pix recebido") e responder com confirmação dedicada: _"Entrada de R$ 500 registrada como receita de Cliente X"_ + botões de edição.

### 16.3 — Voz: edição pós-transcrição 🟡
- ✅ Já existe: envio de áudio, transcrição via **Gemini** (`transcribeAudio`), roteamento de pergunta casual pro assistente.
- 🔴 **Falta**: após transcrever e registrar, oferecer os mesmos botões de edição (categoria/local/valor).

### 16.4 — Humanização do tom 🟡
- ✅ Já existe: emojis, sistema de "tom do Vorcaro" (Profissional/Direto/Equilibrado/Vorcaro) — subaproveitado no Telegram.
- 🔴 **Falta**: aplicar o tom escolhido pelo usuário nas respostas do bot; mensagens naturais nas confirmações de edição ("Beleza, atualizei a categoria pra Alimentação 👍").

---

## Sprint 17 — Onboarding guiado (redução de abandono) ✅ CONCLUÍDO

**Status: fechado.** 17.1 (cadastro de conta), 17.2 (forma de pagamento), 17.3
(teste E2E ponta-a-ponta: conta → pagamento → 1º lançamento, com cobertura de
cancelamento/timeout/regressão-zero). Ver `sprint-17.1-*`, `sprint-17.2-*`.

- 🔴 **Novo**: novo usuário hoje cai num dashboard vazio e só descobre pelo erro que precisa cadastrar Conta e Forma de Pagamento antes de lançar.
- Fluxo de 3–4 passos no primeiro acesso:
  1. Boas-vindas + o que é o Vorcaro.
  2. Cadastrar 1ª conta financeira (ex.: "Conta Corrente", "Carteira").
  3. Cadastrar 1ª forma de pagamento (ex.: "Débito", "Crédito", "Dinheiro").
  4. (Opcional) Conectar Telegram.
- Detectar "usuário novo": sem contas/formas cadastradas → mostra o wizard; senão, dashboard normal.
- Categorias já são semeadas automaticamente no signup (feito).

---

## Sprint 18 — Home acionável ("o que resolver agora") ✅ CONCLUÍDO

**Status: fechado.** 18.1 (`/home` com pendências: lançamentos a confirmar +
alertas, botões Confirmar/Alertas/Resumo). 18.2 reenquadrado (saldo não é
mantido) para surfaçar o engine `financial-alerts`: `/alertas` mostra digest real
+ botão "marcar como lidos". E2E: 13 casos. Ver `sprint-18-home-acionavel.md`.

- 🟡 A tela `/dashboard` hoje é mais informativa.
- 🔴 **Novo**: bloco de ações no topo puxando dos módulos que já existem:
  - Lançamentos pendentes de confirmação (Caixa Financeira).
  - Faturas/parcelas vencendo nos próximos X dias.
  - Recorrências previstas para a semana.
  - Alertas financeiros ativos.
- Cada item leva direto à tela de ação. Reaproveita dados de inbox, installments, recurring e alerts.

---

## Sprint 19 — Resumo semanal automático via Telegram

- 🟡 Já existe: motor de alertas + entrega Telegram (`notification-telegram-delivery.service.ts`), digests (`/api/cron/notification-digest-*`).
- 🔴 **Falta**: cron semanal (domingo) que monta e envia resumo — "essa semana você gastou R$ X, Y% acima da média em Z categoria" — com opção de corrigir registros direto pela mensagem (reaproveita edição inline do Sprint 16).
- Vercel Cron já é usado no projeto (`vercel.json` / `/api/cron/*`).

---

## Sprint 20 — Qualidade da classificação de IA (aprendizado) ✅ CONCLUÍDO

**Status: fechado.** A correção manual de categoria via botão do Telegram agora
alimenta `InboxLearningService.recordCategoryFeedback` (preferência sempre +
`classification_correction` quando diverge da IA). Fecha o loop reusando a infra
existente; sem migração. Ver `sprint-20-qualidade-ia-aprendizado.md`.

- 🟡 Já existe: `InboxClassificationService` com camadas (regra do usuário → histórico → similaridade → keyword → IA); `UserLearningPattern` grava correções.
- 🔴 **Melhorar**: fechar o loop de aprendizado — toda vez que o usuário corrige uma categoria (no dashboard ou via botão do Telegram), reforçar o `UserLearningPattern` para que a próxima ocorrência do mesmo estabelecimento já venha certa e com confiança alta.
- Métrica: acompanhar taxa de "acerto de primeira" ao longo do tempo (`inbox-intelligence-metrics.service.ts` já existe).

---

## Sprint 21 — Relatórios e gráficos ricos

- 🟡 Já existe: tela de Análises (`/dashboard/insights`) com gráficos e projeção de fluxo de caixa.
- 🔴 **Melhorar**:
  - Comparativo mês-a-mês por categoria (barras).
  - Projeção de fluxo de caixa mais rica (considerando recorrências + parcelas futuras já cadastradas).
  - Exportação (PDF/CSV) de relatório mensal.

---

## Extras (backlog, sem sprint fixo)

- **Gamificação no Telegram**: já existe "achievements" — integrar como mensagens motivacionais quando metas são atingidas.
- **Alertas inteligentes com edição**: notificação de estouro de limite com botão para ajustar valor (reaproveita Sprint 16).
- **Privacidade**: ✅ já garantido — Telegram só guarda `chatId`; todo dado sensível fica no Supabase.

---

## Ordem sugerida de execução

1. **Sprint 16** (Telegram edição/receita/voz) — maior pedido do usuário, base já pronta.
2. **Sprint 17** (Onboarding) — reduz abandono, escopo fechado.
3. **Sprint 18** (Home acionável) — alto valor percebido, reaproveita módulos.
4. **Sprint 19** (Resumo semanal) — engajamento, depende do 16.
5. **Sprint 20** (IA aprendizado) — melhora contínua.
6. **Sprint 21** (Relatórios) — refinamento.
