# Sprint 17.2 — Onboarding no Telegram: forma de pagamento

> Parte do Sprint 17. Fecha o ciclo do onboarding: após criar a conta (17.1),
> o usuário cadastra a 1ª forma de pagamento e fica pronto para lançar.

## Reuso (simétrico ao 17.1)

Mesma máquina de estados: Redis `telegram:onboard:<chatId>` (TTL 300s),
interceptor `handleOnboardingText`, funções puras em `onboarding.ts`.

## Fluxo no Telegram

```
(após conta criada em 17.1)
Bot: ✅ Conta Nubank criada! Agora só falta a forma de pagamento.
     [➕ Cadastrar forma de pagamento]

Toca ➕
Bot: 💳 Qual forma de pagamento você mais usa? (ex.: Pix, Cartão, Dinheiro)
User: Pix
Bot: ✅ Forma de pagamento Pix cadastrada! 🎉
     Agora é só mandar seus gastos e receitas — texto, foto ou áudio. Bora! 🚀
```

## Ajustes no código

- `onboarding.ts`: `validatePaymentName`, `inferPaymentType`
  (Pix→PIX, "crédito"→CREDIT_CARD, "débito"→DEBIT_CARD, "cartão" s/ qualificador
  →CREDIT_CARD, dinheiro→CASH, boleto→BOLETO, transferência/TED→BANK_TRANSFER,
  senão OTHER), `ONBOARDING_PAYMENT_PROMPT`.
- `process-telegram-update.service.ts`:
  - callback `onb_payment` → grava step `payment_name`, prompt.
  - `handleOnboardingText` ganha o ramo `payment_name` → valida, cria via
    `CreatePaymentMethodUseCase` (isDefault: true), confirma "pronto pra lançar".

## Cancelamento e timeout

- `cancelar` → limpa estado, mantém a conta já criada.
- TTL 300s → get retorna null → interceptor ignora (usuário refaz com /start).

## Testes (17.2)

- `validatePaymentName`: válido; vazio/curto; cancelar; comando.
- `inferPaymentType`: Pix/crédito/débito/cartão/dinheiro/boleto/transferência/OTHER.
- Cadastro bem-sucedido, cancelamento e timeout: cobertos pela lógica das funções
  puras + o interceptor sem estado retornar null (mesma estratégia do 17.1).

## Próximo

- **17.3** — mensagem final de "tudo pronto" já embutida na confirmação do 17.2;
  resta um teste de fluxo ponta a ponta (conta → pagamento → 1º lançamento) e
  fechamento do Sprint 17.
