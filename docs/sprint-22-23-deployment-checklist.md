# Deploy Checklist — Sprint 22 + 23

## ✅ Testes & Validação

- [x] TypeScript sem erros: `npx tsc --noEmit`
- [x] Testes unitários passando: 12 + 4 + 10 = 26 testes
- [x] E2E tests validam fluxos completos
- [x] Cron endpoints protegidos por CRON_SECRET
- [ ] Testar crons manualmente (após deploy)

## 📦 Banco de Dados

### Novo Modelo Adicionado
- **ExtractSchedulePreference** — Armazena frequência e dias de agendamento do usuário
  ```prisma
  model ExtractSchedulePreference {
    id        String   @id @default(cuid())
    userId    String   @unique
    frequency String   @default("WEEKLY") // WEEKLY | MONTHLY
    dayOfWeek Int?     // 0-6 (segunda=1)
    dayOfMonth Int?    // 1-31
    isActive  Boolean  @default(true)
    ...
  }
  ```

### Steps de Deploy
1. **Gerar migration** (local):
   ```bash
   npx prisma migrate dev --name add_extract_schedule_preference
   ```

2. **Regenrerar Prisma client**:
   ```bash
   npx prisma generate
   ```

3. **Validar schema**:
   ```bash
   npx prisma validate
   ```

4. **Deploy no Vercel**:
   - Merge para `main`
   - Vercel roda `npm run build` (inclui Prisma)
   - Se houver `prisma.migrations/`, Vercel auto-roda `prisma migrate deploy`
   - Confirmar que migration rodou com sucesso

## 🔐 Variáveis de Ambiente (Vercel)

Obrigatórias para crons funcionarem:
- `CRON_SECRET` — Token para proteger endpoints `/api/cron/*`
- `DATABASE_URL` — Connection string PostgreSQL
- `DIRECT_URL` — Direct connection (sem pool) para migrations
- `TELEGRAM_BOT_TOKEN` — Token do bot Telegram
- Existentes: CLERK_SECRET_KEY, etc.

**Verificar**:
```bash
vercel env pull # Download env vars da Vercel
```

## 📅 Agendamentos de Crons (vercel.json)

| Cron | Horário | Frequência | Descrição |
|------|---------|-----------|-----------|
| `/due-invoice-alerts` | 06:00 UTC (3h BRT) | Diária | Faturas vencendo próximos 3 dias |
| `/scheduled-extracts` | 12:00 UTC (9h BRT) | Diária | Envia extratos agendados (seg/1º mês) |
| `/automated-reports` | 08:00 UTC (5h BRT) | Diária | Relatórios semanal/mensal |
| `/spending-anomalies` | 19:00 UTC (16h BRT) | Diária | Detecta gastos anormais |
| `/weekly-summary` | 00:00 seg UTC | Semanal | Resumo semanal (Sprint 19) |

**Testar após deploy**:
```bash
# Trigger manual do cron (via Vercel CLI)
vercel run dev
# Ou chamar a rota diretamente:
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://seu-app.vercel.app/api/cron/due-invoice-alerts
```

## 🔌 Dependências Novas

Nenhuma lib externa adicionada neste sprint. Usa:
- `@prisma/client` (já existia)
- `@clerk/nextjs` (já existia)
- Vitest (já existia para testes)

## 📊 Observabilidade

### Logs Importantes
- `[DueInvoiceNotification]` — Faturas detectadas
- `[ScheduledExtract]` — Extratos enviados
- `[AutomatedReport]` — Relatórios gerados
- `[SpendingAnomaly]` — Anomalias detectadas

### Métricas para Monitorar
- Taxa de sucesso de notificações
- Tempo de execução dos crons
- Erros de conexão com Telegram
- Sucesso de agendamento de extratos

## 🚀 Procedimento de Deploy

### Pré-Deploy (Local)
```bash
# 1. Criar migration
npm run prisma:migrate:dev -- --name add_extract_schedule_preference

# 2. Regenerar client
npm run prisma:generate

# 3. Validar schema
npm run prisma:validate

# 4. Rodar testes
npm test

# 5. Build local
npm run build

# 6. Verificar tsc
npx tsc --noEmit
```

### Deploy (Vercel)
```bash
# 1. Push para main
git push origin main

# 2. Vercel detecta e inicia build automaticamente
# 3. Aguardar conclusão do build
# 4. Verificar logs: "Prisma schema loaded" e migration deployed

# 5. Teste manual dos crons
vercel env pull
npx ts-node scripts/test-crons.ts
```

### Pós-Deploy (Verificação)
- [ ] Crons disparando conforme horário
- [ ] Notificações chegando via Telegram
- [ ] Logs sem erros
- [ ] Banco de dados migrado com sucesso
- [ ] ExtractSchedulePreference tabela criada
- [ ] Usuários conseguem usar `/extratos`

## 🔄 Rollback (se necessário)

Se algo der errado:
```bash
# Revert da migration no banco
vercel env pull
npm run prisma:migrate:resolve -- --rolled-back add_extract_schedule_preference

# ou manualmente no BD (cuidado!)
# DROP TABLE "ExtractSchedulePreference";

# Revert do código
git revert <commit-hash>
git push origin main
```

## 📝 Documentação para Time

- [ ] Atualizar README com novos comandos (`/extratos`)
- [ ] Documentar fluxo de insights e anomalias
- [ ] Briefing sobre crons adicionados
- [ ] Orientar sobre monitoramento

## ✨ Benefícios Pós-Deploy

✅ **Para usuários:**
- Notificações proativas de faturas vencendo
- Agendamento automático de extratos personalizados
- Relatórios inteligentes com insights
- Alertas de gastos anormais em tempo real

✅ **Para negócio:**
- Engagement aumentado via Telegram
- Retenção melhorada (notificações úteis)
- Diferenciação (insights + anomalias)
- Base de dados enriquecida (histórico de padrões)

---

**Status**: Pronto para deploy ✅
**Data estimada**: Hoje (após validação)
**Risk**: Baixo (apenas novo modelo DB, crons isolados)
