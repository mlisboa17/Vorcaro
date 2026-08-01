# 🚀 Vorcaro 2026 - Roadmap Completo
## "O Companheiro Financeiro que Entende Você"

**Data**: 2026-08-01  
**Versão**: 1.0  
**Duração Total**: 24 semanas (6 meses)  
**Time**: 1-2 pessoas (lean)  
**Budget**: $0 APIs pagas (tudo open-source/grátis)

---

## 📊 Visão Geral - 4 Sprints + Growth

```
SPRINT 0 (Semana 1-2)    → Telegram Fixes
SPRINT 1 (Semana 3-6)    → Companheiro Vorcaro (IA Natural)
SPRINT 2 (Semana 7-12)   → App Móvel (MVP)
SPRINT 3 (Semana 13-18)  → Multimodal + Automação
SPRINT 4+ (Semana 19-24) → Scale + Growth
```

---

## 🎯 SPRINT 0: Telegram Fixes (Semana 1-2)
**Foco**: Otimizar canal que já funciona

### ✅ Implementado
- [x] Menu persistente (🏠 Home | 📊 Resumo | 🚨 Alertas | ⚙️ Config)
- [x] Permitir APENAS foto/áudio/texto (sem obrigar caption)
- [x] Deduplicação local ("Já enviaste R$50 em comida há 2 min?")
- [x] Confirmação clara (✅ Registrei! 💰 R$50 🍔 Comida)

### 📈 Resultado Esperado
- **-30% duplicação** reportada
- **+20% satisfação** (UX mais natural)
- **-15% time** em suporte ("Como uso?")

### 📝 Técnico
- 2 arquivos novos (`persistent-menu.ts`, `deduplication.service.ts`)
- 2 arquivos modificados (`telegram-bot.client.ts`, `process-telegram-update.service.ts`)
- 233 linhas de código
- Build: ✅ Validado

---

## 🤖 SPRINT 1: Companheiro Vorcaro (Semana 3-6)
**Foco**: IA conversacional natural (não engessada)

### O Problema Atual
- Bot é engessado: "Digite /home para menu"
- Não entende contexto ("Gastei com meu amigo")
- Não tem personalidade ("Olá usuário 123456")
- Não é proativo ("Você está OK financeiramente")

### A Solução: Companheiro Vorcaro
Uma IA que:
- 🗣️ Conversa naturalmente (como um amigo)
- 🧠 Entende contexto ("+1 pessoa = divide despesa")
- 💭 Tem personalidade (educado, atencioso, funny)
- 🎯 É proativo (avisa problemas antes do usuário perceber)
- 🔄 Adapta ao usuário (formal vs casual)

### 🛠️ Implementação

#### **1. Prompt System (Companheiro Personality)**
```python
SYSTEM_PROMPT = """
Você é Vorcaro, o companheiro financeiro do usuário.

PERSONALIDADE:
- Educado, paciente, atencioso
- Explica sem jargão técnico
- Às vezes usa emojis, mas não exagera
- Aprende sobre o usuário (nome, preferências, humor)

COMPORTAMENTO:
- Entende contexto ("Gastei com meu amigo" = despesa compartilhada?)
- Propõe, nunca impõe ("Quer que eu registre?")
- Celebra wins ("Economia de R$200 este mês! 🎉")
- Avisa problemas gentilmente ("Saldo em risco em 5 dias")

NUNCA:
- Usa linguagem técnica
- Faz perguntas desnecessárias
- Oferece produtos/marketing
"""
```

#### **2. Conversação Multi-Turn**
- Lembrar contexto de conversas anteriores (últimos 5 lançamentos)
- "Você lançou 5x comida esta semana. Pattern novo?" 
- Usuário responde naturalmente ("Sim, meu PC deu ruim")
- Bot entende e categoriza automaticamente

#### **3. Intent Recognition (NLP Local)**
```
Input: "Gastei 150 com meu irmão no uber"
Intentos:
  - Valor: 150
  - Categoria: Transporte
  - Compartilhado: True
  - Pessoas: 2
  
Output: "Registrei R$75 pro seu Uber hoje"
```

#### **4. Proatividade Leve**
```
Segunda 08:00: "Olá! Semana começou. Onde vai o seu dinheiro?"
Quarta 14:00: "Você já lançou 3x comida. Quer revisar?"
Sexta 18:00: "Fim de semana chega. Orçamento OK pra sair?"
Domingo 20:00: "Resumo da semana pronto: -R$200 vs meta"
```

### 📊 Arquitetura
```
User: "Gastei 150 com meu irmão"
  ↓
Telegram Handler
  ↓
Intent Extractor (Local NLP)
  → Tipo: gasto compartilhado
  → Valor: 150
  → Categoria: Transporte
  → Pessoas: 2
  ↓
Context Retriever (últimos 5 lançamentos)
  ↓
Gemini Claude API (Conversação Natural)
  + System Prompt (Companheiro Vorcaro)
  + User message
  + Context (histórico)
  → Resposta natural
  ↓
Store + Confirm
  → Registra R$75 (split)
  → Avisa: "Registrei seu R$75 no Uber com seu irmão"
```

### 🎁 Features Sprint 1
| Feature | Custo | Prioridade |
|---------|-------|-----------|
| Personalidade base | $0 (prompt) | P0 |
| Conversação multi-turn | $0 (Redis) | P0 |
| Intent extraction local | $0 (regex + spaCy) | P0 |
| Contexto (últimos 5) | $0 (query) | P1 |
| Proatividade leve | $0 (cron) | P1 |
| Emojis inteligentes | $0 (lógica) | P2 |

### 📈 Resultado Esperado
- **+50% engagement** (usuários conversam mais)
- **-40% perguntas confusas** (bot entende contexto)
- **+60% satisfação** ("Sente-se como um amigo")

### 📝 Técnico
- Arquivo novo: `vorcaro-companion-prompt.ts`
- Modificar: `process-telegram-update.service.ts` (add intent extraction)
- Integrar: Local NLP (spaCy ou BERT quantizado)
- Usar: Gemini (já têm, grátis com limite)

---

## 📱 SPRINT 2: App Móvel - MVP (Semana 7-12)
**Foco**: Usuário acessar via App (não só web/Telegram)

### O Problema
- Telegram é ótimo, mas não é **app** (usuário quer launcher)
- Web é lento em telefone
- Usuários acham que é só Telegram, não sabem que tem web

### A Solução: App Nativa Rápida
React Native (code sharing com web) + Vorcaro Companion

### 📋 MVP Features
```
TAB 1: Home
├─ Saldo atual
├─ Gasto hoje
├─ Próximo alerta
├─ Botão: "Lançar Transação"
└─ Últimos 3 lançamentos

TAB 2: Lançar
├─ Câmera (foto recibo)
├─ Microfone (áudio: "Gastei 50 em comida")
├─ Teclado (digitar)
├─ Sugerir categoria (última usada)
└─ Confirmar

TAB 3: Chat (Companheiro Vorcaro)
├─ Conversa com bot
├─ Sugestões (botões quick reply)
└─ Context-aware

TAB 4: Alertas
├─ Lista de avisos
├─ Dismiss/Act
└─ Settings

TAB 5: Config
├─ Contas
├─ Categorias
├─ Formas pagamento
└─ Perfil
```

### 🛠️ Tech Stack
- **Framework**: React Native (Expo ou React Native CLI)
- **UI**: React Native Paper (Material Design)
- **State**: Zustand (leve)
- **API**: Same backend (REST/GraphQL)
- **Build**: EAS (Expo) ou Fastlane
- **Stores**: iOS App Store + Google Play

### 📊 Arquitetura App
```
App.tsx (Router)
├─ HomeScreen (TAB 1)
├─ LaunchTransactionScreen (TAB 2)
│  ├─ CameraCapture (foto)
│  ├─ AudioRecorder (voz)
│  ├─ TextInput (teclado)
│  └─ ConfirmTransaction
├─ CompanionChat (TAB 3) ← Companheiro Vorcaro
├─ AlertsScreen (TAB 4)
└─ ConfigScreen (TAB 5)

Services:
├─ TransactionService (create, edit, delete)
├─ CompanionService (chat, intent)
├─ AlertService (fetch, dismiss)
└─ AuthService (token, refresh)
```

### 🎁 Features Sprint 2
| Feature | Custo | Semana |
|---------|-------|--------|
| Setup React Native | $0 | 1 |
| Autenticação (reuse web) | $0 | 1 |
| Home Screen | $0 | 2 |
| Launch Transaction (3 modos) | $0 | 2-3 |
| Companheiro Chat | $0 (reuse Sprint 1) | 3 |
| Alerts Screen | $0 | 3 |
| Config Screen | $0 | 3 |
| Testing + Polish | $0 | 4-6 |
| App Store/Play Store submit | $0 | 5-6 |

### 📈 Resultado Esperado
- **+100% daily active users** (app friction is real)
- **+40% transações via mobile** (convenience)
- **+25% app retention** (push notifications, home screen)

### 📝 Técnico
- Novo repo: `vorcaro-mobile` (ou pasta em mono-repo)
- Compartilhar: `types`, `utils`, `auth logic`
- API calls: Same endpoints
- Build: EAS/Fastlane CI/CD

---

## 🧠 SPRINT 3: Multimodal + Automação (Semana 13-18)
**Foco**: Entrada super fácil + automação proativa

### ✨ Features

#### **Multimodal Melhorado**
- 🎤 Voz contínua (usuário fala, app grava até parar)
- 📷 Múltiplas fotos (nota fiscal com 3 páginas)
- 💬 Texto com NLP melhorado (entender "metade do almoço")
- 📸 Screenshot recognition (receita no chat de amigo)

#### **Automação Proativa**
- 🤖 Gemini Vision (extrair de fotos automaticamente)
- 📊 Padrão detection ("Gasta 2x normal, tudo bem?")
- 🔔 Alertas contextuais ("Saldo negativo em 4 dias se continuar assim")
- 💡 Sugestões ("Estas 5 comidas = R$500. Economia potencial: R$200")

#### **Idempotência++**
- Usuário envia foto 2x = avisa (não cria 2 transações)
- Não duplica mesmo se Telegram faz retry
- Dedup por: valor + categoria + timestamp + device ID

### 🎁 Features Sprint 3
| Feature | Custo | Prioridade |
|---------|-------|-----------|
| Voz contínua | $0 (Gemini) | P0 |
| OCR multi-página | $0 (Gemini Vision) | P0 |
| Padrão detection | $0 (SQL + logic) | P1 |
| Alertas contextuais | $0 (cron + rules) | P1 |
| Screenshot recognition | $0 (Gemini) | P2 |

---

## 📈 SPRINT 4+: Growth & Scale (Semana 19-24+)

### Features
- **Compartilhamento**: Dividir despesa com amigos (via link)
- **Integração Bancária**: Open Finance (cw.gov.br) para auto-import
- **Analytics**: Dashboard pessoal (onde vai o dinheiro?)
- **Exportação**: PDF, Excel, Planilhas Google
- **Webhook**: Integração com other apps
- **Marketplace**: "Receitas" de economia (templates)

---

## 🎯 Métricas Success

### Sprint 0
- [ ] -30% duplicação
- [ ] +20% satisfação
- [ ] 100% uptime Telegram

### Sprint 1 (Companheiro)
- [ ] +50% engagement
- [ ] -40% perguntas confusas
- [ ] +60% satisfação NPS

### Sprint 2 (App)
- [ ] 1000+ downloads (1 mês)
- [ ] +100% DAU
- [ ] +40% transações mobile
- [ ] 4.5+ stars (ambas stores)

### Sprint 3 (Multimodal)
- [ ] -50% tempo/transação
- [ ] +30% fotos vs texto
- [ ] -80% duplicação

---

## 💰 Budget ($0)

| Serviço | Custo | Observação |
|---------|-------|-----------|
| Telegram Bot | $0 | Grátis |
| Gemini API | $0 | Free tier (1000 req/dia) |
| React Native | $0 | Open-source |
| EAS (Expo) | $0 | Free tier |
| App Store | $99/ano | 1x |
| Play Store | $25 | 1x |
| **Total** | **$124/ano** | Negligenciável |

---

## 📅 Timeline Visual

```
Ago    |--Sprint 0 (Telegram)--|
       
Set    |--------Sprint 1 (Companheiro)--------|
       
Out    |--------Sprint 2 (App Mobile)--------|
Nov    
       
Dez    |--------Sprint 3 (Multimodal)--------|
Jan    
       
Fev    |--------Sprint 4+ (Growth)--------|
Mar    
```

---

## 🎯 Next Steps (TODAY)

1. **Validar com usuários**: "Querem app? Querem Companheiro?"
2. **Setup Sprint 1**: Começar Companheiro Vorcaro prototipo
3. **Prototipar App**: Layout + flows (Figma)
4. **Criar backlog**: Detalhar cada sprint em tasks

---

## 📝 Notas

- Sem APIs pagas (Gemini free tier + open-source)
- Lean team (1-2 pessoas)
- MVP-first (ship rápido, iterar)
- Usuário é king (feedback loop rápido)
- Companheiro é diferencial (outras apps não têm)

---

**Vorcaro 2026: O Companheiro Financeiro Que Entende Você** 🚀
