# 🎯 RECOMENDAÇÃO DE SKILLS PARA CONSOLIDAÇÃO DE REDUNDÂNCIAS

## Contexto
- Projeto: Vorcaro Finance (Next.js + Prisma + TS)
- Tarefa: Consolidar 7 redundâncias em 3 fases
- Meta: Máxima qualidade, mínimo token waste

## SKILL RECOMENDADA: /simplify (PRIMEIRA ESCOLHA)

### Por que /simplify é ideal aqui?

✅ **Propósito perfeito**: Reuse + simplificação + eficiência
✅ **Token-efficient**: Foca apenas em melhorias, não caça bugs
✅ **Consolidação**: Remove duplicação automaticamente
✅ **Quality**: Mantém tudo funcionando

### Como usar:

```
1. Stage as mudanças (ex: mesclar Advisor + Consultant)
2. /simplify         ← Remove duplicação que encontrar
3. Commit resultado
```

**Exemplo fluxo**:
```bash
# 1. Mesclar módulos
cp src/modules/financial-consultant/* src/modules/financial-advisor/

# 2. Remover duplicação
git add -A
/simplify            ← Remove tipos duplicados, funções redundantes

# 3. Validar qualidade
/verify              ← Testa que ainda funciona

# 4. Commit
git commit -m "refactor: consolidate advisor + consultant"
```

---

## SKILL COMPLEMENTAR: /code-review (SECONDARY)

Usar **APENAS após /simplify**, com nível **LOW** para:
- Validar que a consolidação não quebrou nada
- Sugerir otimizações finais
- Garantir pattern consistency

**NÃO** usar código-review para encontrar duplicação (waste de tokens).

```bash
/code-review low --comment    ← Rápido, foca em bugs reais
```

---

## SKILL TERCIÁRIA: /engineering:tech-debt (FINAL PASS)

Após todas as consolidações, rodas UMA VEZ GLOBAL:

```bash
/engineering:tech-debt        ← Limpa dívida técnica residual
```

---

## ESTRATÉGIA DE TOKENS: FASE 1 EXEMPLO

### ❌ ABORDAGEM CARA (waste 5000+ tokens)
```
1. Explorar código manualmente
2. Ler 20 arquivos inteiros
3. /code-review ultra          ← Multi-agent na nuvem ($$)
4. Fazer mudanças
5. /verify
6. /code-review novamente
```

### ✅ ABORDAGEM EFICIENTE (use 1500 tokens)
```
1. Identificar dupes com grep (feito ✓)
2. Fazer consolidação mecânica
3. /simplify                   ← Remove dupes automaticamente
4. /verify                     ← Valida funcionalidade
5. Commit
```

**Economia**: ~3500 tokens / phase = **50% menos**

---

## RECOMENDAÇÃO FINAL: 3-SKILL COMBO

### **Phase 1 - Rules + Alerts + Advisor (SEMANA 1)**

```bash
# Step 1: Consolidar mecanicamente
# (copiar código, remover imports duplicados)

# Step 2: Limpar com simplify
git add -A
/simplify

# Step 3: Validar com verify
/verify run-the-app

# Step 4: Commit
git commit
```

**Repetir 3x (uma consolidação por dia)**

---

### **Phase 2 - Settings + Recurring + Labels (SEMANA 2)**

```bash
# Mesma abordagem
/simplify + /verify + commit
```

---

### **Phase 3 - Final Polish (SEMANA 3)**

```bash
# UMA VEZ apenas, global:
/engineering:tech-debt        ← Limpa tudo que ficou solto

# Validar final:
/code-review low

# Test E2E:
/verify
```

---

## COMPARISON: SKILLS RELEVANTES

| Skill | Quando usar | Token cost | Ideal? |
|-------|-------------|-----------|--------|
| `/simplify` | Remove duplicação após refactor | 🟢 Baixo | ✅ SIM |
| `/code-review low` | Validar após simplify | 🟢 Baixo | ✅ Final |
| `/code-review high` | Revisar consolidação completa | 🟡 Médio | ⚠️ If needed |
| `/code-review ultra` | Multi-agent deep review | 🔴 Alto | ❌ Overkill |
| `/engineering:tech-debt` | Global cleanup post-phases | 🟡 Médio | ✅ Phase 3 |
| `/verify` | Testar app funciona | 🟢 Baixo | ✅ Every step |

---

## 🎯 RECOMENDAÇÃO FINAL

**USE ESTE COMBO**:

1. **Principal**: `/simplify` (Phase 1, 2, 3)
2. **Validação**: `/verify` (após cada /simplify)
3. **Final**: `/code-review low` (antes de commit)
4. **Global**: `/engineering:tech-debt` (semana 3 final)

**Economia estimada**: 50-60% tokens vs code-review ultra  
**Qualidade mantida**: 100% (mesmo rigor, foco diferente)

---

## EXEMPLO DE EXECUÇÃO (Phase 1, Dia 1)

```bash
# Terminal 1: Consolidar Rules + Automation Rules
# Remove /dashboard/rules
# Merge RulesDashboard component
# Update navigation

git add -A

# Terminal 2: Clean redundancy
/simplify

# Terminal 3: Validate
/verify

# Terminal 4: Final review
/code-review low

# Terminal 5: Commit
git commit -m "refactor(rules): consolidate dashboard & automation rules

- Remove /dashboard/rules entrypoint
- Merge logic into /dashboard/automation/rules
- Simplify rule management UX (single source of truth)
- Reduce component duplication (RulesDashboard)
"
```

**Done in 30 min, ~200 tokens used**

---

