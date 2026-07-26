# Sprint 21 — Relatórios e gráficos

## Auditoria (bloqueio de renderização)

- **Nenhuma lib de gráfico/imagem/PDF instalada.**
- Renderizar imagem de gráfico no serverless da Vercel é pesado/frágil (headless
  browser ou canvas nativo — o `@napi-rs/canvas` já causou dor no Sprint da fatura).
- **Já existe** a tela `/dashboard/insights` com gráficos ricos (web).

## Decisão necessária (renderização do gráfico)

- **(A) Deep-link + CSV (recomendado)**: Telegram envia um resumo textual + botões
  "📊 Ver gráficos" (deep-link `/dashboard/insights`) e "📄 Baixar CSV" (gera CSV
  puro-JS e envia como documento). Zero dependência nova, zero risco serverless,
  sem enviar dados a terceiros. Web já tem os gráficos ricos.
- **(B) QuickChart (imagem via URL externa)**: monta URL do QuickChart.io e envia
  como foto no Telegram. Simples, mas **envia dados financeiros a um serviço
  terceiro** (implicação de privacidade — checar com o dono) + dependência externa.
- **(C) PDF server-side**: pdfkit/jsPDF puro-JS. Mais trabalho, fontes/layout, e
  ainda sem gráfico bonito sem canvas.

## Plano (assumindo A)

### 21.1 — Export CSV
- `buildTransactionsCsv(userId, sinceDays)` → CSV (data, descrição, categoria,
  tipo, valor). Puro-JS, testável.
- Rota `/api/reports/transactions.csv?days=30` (autenticada) e, no Telegram, envio
  como documento via `sendDocument`.

### 21.2 — Relatório textual + deep-links
- Reusa `WeeklySummaryService` (Sprint 19): evolução, top categorias, saldo
  acumulado, em texto curto + botões "📊 Ver gráficos" / "📄 Baixar CSV".

### 21.3 — Testes
- CSV com dados reais (linhas corretas, escape de vírgula/aspas).
- Período vazio → "sem movimentações".
- Botões acionam deep-link/CSV corretos.
- Anti-repetição por TTL no Redis.

## Dependência

Sprint 21 se apoia no `WeeklySummaryService` do Sprint 19 — fazer 19 antes.
