# Sprint 17.1 — Onboarding no Telegram: cadastro de conta

> Parte do Sprint 17 (Onboarding guiado). Objetivo: usuário novo (sem conta
> financeira) é guiado a cadastrar a 1ª conta antes de lançar. Reusa Redis
> pending + interceptor + humanização do Sprint 16.

## O que já existe

- **Criar conta**: `CreateFinancialAccountUseCase.execute({ userId, name, type })`
  (`AccountType`: CHECKING, SAVINGS, CASH, ...).
- **Estado conversacional**: padrão Redis (`telegram:edit_pending`, `telegram:catpick`).
- **Interceptor de texto**: `handlePendingCognitiveEdit` (molde para interceptar a
  próxima mensagem).
- **Respostas humanizadas**: `humanized-replies.ts`.
- **Categorias já semeadas** no signup — falta só conta + forma de pagamento.

## Delta (17.1)

Detectar "sem conta" e guiar o cadastro da 1ª conta por chat.

## Fluxo no Telegram (curto, botões, tokens mínimos)

```
(usuário conectado, 0 contas, envia /start ou uma despesa)
Bot: 👋 Bem-vindo ao Vorcaro! Pra começar, cadastre sua 1ª conta.
     [➕ Cadastrar conta]

Toca ➕
Bot: 🏦 Qual o nome da conta? (ex.: Conta Corrente, Carteira)   ← 1 linha
User: Nubank
Bot: ✅ Conta "Nubank" criada! Agora só falta a forma de pagamento.
     [➕ Cadastrar forma de pagamento]      ← 17.2 ativa isso
```

- Tipo da conta é **inferido** do nome (carteira/dinheiro → CASH; senão CHECKING)
  para não pedir um passo extra. Refinar com seleção por botão fica p/ depois.
- `cancelar` aborta. Estado no Redis com TTL 300s (timeout → orienta reenviar).

## Arquitetura (arquivos)

- **Novo** `src/lib/telegram/onboarding.ts` (puro/testável):
  - `needsOnboarding(accountsCount, paymentsCount)` → boolean.
  - `validateAccountName(text)` → `{ ok; name? ; reason? }` (min 2, não-comando, não "cancelar").
  - `inferAccountType(name)` → `AccountType`.
  - builders de mensagem/teclado (`buildWelcomeKeyboard`, `buildPaymentStepKeyboard`).
  - callback parsers (`onb_account`, `onb_payment`).
- `process-telegram-update.service.ts`:
  - Gatilho após a checagem de conexão (temos `connection.userId`): se
    `needsOnboarding` e sem onboarding em progresso → envia welcome, `return`.
  - Callback `onb_account` → grava `telegram:onboard:<chatId>` = `{ step:"account_name", messageId }`, prompt.
  - Interceptor de texto (irmão do `handlePendingCognitiveEdit`): se step
    `account_name` → valida → cria conta → confirma + botão de forma de pagamento.

## Testes (17.1)

Unitários das funções puras (mesma estratégia do 16.x — Redis/Telegram não são
unit-testáveis):
- `needsOnboarding`: 0/0 → true; tem conta → false.
- `validateAccountName`: nome válido; vazio/curto; "cancelar"; comando "/algo".
- `inferAccountType`: "Carteira"/"Dinheiro" → CASH; "Nubank"/"Conta" → CHECKING.
- Estado/timeout: o interceptor sem estado no Redis não faz nada (retorna null) —
  coberto pela lógica de leitura (TTL expirado = get retorna null = ignora).

## Loop 17

- **17.1** — cadastro de conta (este doc).
- **17.2** — cadastro de forma de pagamento (reusa tudo).
- **17.3** — confirmação "pronto pra lançar" + testes de ponta a ponta.
