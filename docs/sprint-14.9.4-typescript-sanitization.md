# Sprint 14.9.4 — Saneamento Completo do TypeScript

## Causa raiz

| Campo | Detalhe |
|-------|---------|
| **Arquivo** | `.next/types/app/api/telegram/webhook/route.ts` (linha 12) |
| **Mensagem** | `Property 'handleTelegramWebhook' is incompatible with index signature` — tipo não assignable to `never` |
| **Origem real** | `src/app/api/telegram/webhook/route.ts` exportava `handleTelegramWebhook` além de `POST` |

No **Next.js 15 App Router**, arquivos `route.ts` só podem exportar handlers HTTP (`GET`, `POST`, …) e opções de segmento (`dynamic`, `runtime`, etc.). O gerador de tipos em `.next/types` valida isso via `checkFields<Diff<…>>`.

Ao exportar `handleTelegramWebhook` no mesmo arquivo, o TypeScript inferiu essa função como export “extra” inválido, quebrando a verificação em `.next/types`.

**Não era** cache obsoleto nem bug do Prisma — era violação da convenção de Route Handlers.

---

## Correção aplicada

Extraída a lógica compartilhada para um módulo de biblioteca (fora de `app/api`):

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/telegram/handle-telegram-webhook.ts` | **Novo** — contém `handleTelegramWebhook` |
| `src/app/api/telegram/webhook/route.ts` | Exporta apenas `POST`, delegando ao lib |
| `src/app/api/webhooks/telegram/route.ts` | Import atualizado para `@/lib/telegram/handle-telegram-webhook` |

Comportamento funcional **inalterado**: mesma validação, mesmo fluxo de processamento, mesmas respostas HTTP.

Rebuild limpo executado:

```powershell
Remove-Item -Recurse -Force .next
npm run build
```

---

## Evidências

### `npx tsc --noEmit`

```text
(exit code 0 — nenhum erro)
```

### `npm test -- --run`

```text
Test Files  133 passed (133)
Tests       475 passed (475)
```

### `npx prisma validate`

```text
The schema at prisma\schema.prisma is valid 🚀
```

### `npx prisma generate`

```text
EPERM ao renomear query_engine-windows.dll.node
```

O `prisma generate` falhou por **lock de arquivo no Windows** (processo em execução — ex.: `npm run dev` — mantém a DLL do engine aberta). O schema permanece válido; o client já existente continua funcional. Para regenerar com sucesso, encerre processos que usam Prisma e rode `npx prisma generate` novamente.

### `npm run build`

```text
✓ Compiled successfully
Linting and checking validity of types ... OK
(exit code 0)
```

---

## Arquivos alterados

- `src/lib/telegram/handle-telegram-webhook.ts` (novo)
- `src/app/api/telegram/webhook/route.ts`
- `src/app/api/webhooks/telegram/route.ts`
- `docs/sprint-14.9.4-typescript-sanitization.md` (este documento)
- `CHANGELOG.md`

---

## Pendências restantes

Nenhuma pendência de TypeScript.

Observação operacional (não bloqueante): `npx prisma generate` pode exigir parar o servidor de desenvolvimento no Windows por causa do lock `EPERM` na DLL do query engine.

---

## Status

Concluída — 2026-06-05.
