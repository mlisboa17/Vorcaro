# Homologação — Treinamento de Extratos

Gerado em: 2026-06-06T06:00:21.907Z
Usuário de teste: `layout-homolog-1780725621714`
Fixtures: `C:\Users\mlisb\OneDrive\ProjetosAntigravy\Acessor30052026_Chat\tests\fixtures\statement-layout-training`

## Resumo

| Métrica | Valor |
|---------|-------|
| Cenários | 6 |
| Aprovados | 6 |
| Reprovados | 0 |
| Pronto para produção | Sim |

## C1 — Primeiro extrato de banco desconhecido

**Status:** ✅ PASS

| Campo | Valor |
|-------|-------|
| Banco testado | Novo Banco |
| Arquivo | `novobanco-extrato-v1.csv` |
| Similaridade | 0.0% (LOW) |
| Lançamentos encontrados | 10 |
| Reconhecidos | 0 |
| Precisam revisar | 10 |
| Ignorados | 0 |
| Modelo | created |
| Modelo ID | cmq1y23gm0001os6kdr5zszg3 |
| Versão | 1 |
| Layout | Novo Banco · CSV · v1 |
| Correções aplicadas | 0 |

**Checks:**
- ✅ Cria modelo novo: modelId=cmq1y23gm0001os6kdr5zszg3
- ✅ Marca NEEDS_REVIEW: 10 linha(s) precisam revisar
- ✅ Preserva rawContent: todas as linhas têm rawContent
- ✅ Não descarta silenciosamente: total=10, parsed=10
- ✅ Prévia possível antes de gravar: métricas de prévia calculadas

## C2 — Segundo extrato do mesmo banco/layout

**Status:** ✅ PASS

| Campo | Valor |
|-------|-------|
| Banco testado | Novo Banco |
| Arquivo | `novobanco-extrato-v2-similar.csv` |
| Similaridade | 100.0% (HIGH) |
| Lançamentos encontrados | 9 |
| Reconhecidos | 0 |
| Precisam revisar | 9 |
| Ignorados | 0 |
| Modelo | reused |
| Modelo ID | cmq1y23gm0001os6kdr5zszg3 |
| Versão | 1 |
| Layout | Novo Banco · CSV · v1 |
| Correções aplicadas | 0 |

**Checks:**
- ✅ Reutiliza modelo: modelId=cmq1y23gm0001os6kdr5zszg3
- ✅ Similaridade aumentou: 0% → 100%
- ✅ Menos ou igual NEEDS_REVIEW vs 1º import: v1=10, v2=9, tier=HIGH
- ✅ Tier HIGH ou MEDIUM: HIGH

## C3 — Extrato parecido, mas não idêntico

**Status:** ✅ PASS

| Campo | Valor |
|-------|-------|
| Banco testado | Novo Banco |
| Arquivo | `novobanco-extrato-v3-layout-diferente.csv` |
| Similaridade | 70.9% (MEDIUM) |
| Lançamentos encontrados | 10 |
| Reconhecidos | 0 |
| Precisam revisar | 10 |
| Ignorados | 0 |
| Modelo | approximate |
| Modelo ID | cmq1y23gm0001os6kdr5zszg3 |
| Versão | 1 |
| Layout | Novo Banco · CSV · v1 |
| Correções aplicadas | 0 |

**Checks:**
- ✅ Busca modelo aproximado: modelId=cmq1y23gm0001os6kdr5zszg3
- ✅ Não começa do zero: similaridade=70.9%
- ✅ Marca revisão se MEDIUM: needsReview=10

## C3b — Nova versão quando layout difere após correções

**Status:** ✅ PASS

| Campo | Valor |
|-------|-------|
| Banco testado | Novo Banco |
| Arquivo | `novobanco-extrato-v3-layout-diferente.csv` |
| Similaridade | 70.9% (MEDIUM) |
| Lançamentos encontrados | 10 |
| Reconhecidos | 0 |
| Precisam revisar | 10 |
| Ignorados | 0 |
| Modelo | forked |
| Modelo ID | cmq1y23hq0006os6kgyi91cur |
| Versão | 2 |
| Layout | Novo Banco · CSV · v2 |
| Correções aplicadas | 3 |

**Checks:**
- ✅ Cria nova versão se layout diferente: versão fork detectada

## C4 — Correções do usuário

**Status:** ✅ PASS

| Campo | Valor |
|-------|-------|
| Banco testado | Novo Banco |
| Arquivo | `novobanco-extrato-v1.csv` |
| Similaridade | 70.9% (HIGH) |
| Lançamentos encontrados | 10 |
| Reconhecidos | 0 |
| Precisam revisar | 10 |
| Ignorados | 0 |
| Modelo | reused |
| Modelo ID | cmq1y23gm0001os6kdr5zszg3 |
| Versão | 1 |
| Layout | Novo Banco · CSV · v1 |
| Correções aplicadas | 1 |

**Checks:**
- ✅ Salva BankStatementLayoutCorrection: correções=4
- ✅ Atualiza accuracyRate: 0% → 50%
- ✅ Não zera modelo com 1 correção: status=ACTIVE
- ✅ Exemplos corrigidos incrementados: examples=1

## C6 — Importação final com prévia e confirmação

**Status:** ✅ PASS

| Campo | Valor |
|-------|-------|
| Banco testado | Novo Banco |
| Arquivo | `novobanco-extrato-v2-similar.csv` |
| Similaridade | 100.0% (HIGH) |
| Lançamentos encontrados | 9 |
| Reconhecidos | 0 |
| Precisam revisar | 9 |
| Ignorados | 0 |
| Modelo | reused |
| Modelo ID | cmq1y23gm0001os6kdr5zszg3 |
| Versão | 1 |
| Layout | Novo Banco · CSV · v1 |
| Correções aplicadas | 1 |

**Checks:**
- ✅ Prévia obrigatória (métricas antes de gravar): total=9
- ✅ Nenhuma linha descartada silenciosamente: parsed=9, trained=9
- ✅ Linhas incertas com rawContent: NEEDS_REVIEW preserva linha original
- ✅ layoutModelId disponível para confirmação: modelId=cmq1y23gm0001os6kdr5zszg3
- ✅ Confirmação persiste correções: learnFromCorrections executado pós-prévia

## Validação da tela / API
- ✅ Listagem retorna modelos: 2 modelo(s)
- ✅ Exibe versão: version presente
- ✅ Exibe taxa de acerto: max accuracy=50%
- ✅ Exibe último uso: lastUsedAt preenchido
- ✅ Desativar modelo: status=INACTIVE
- ✅ Excluir modelo: deleted fork id=cmq1y23hq0006os6kgyi91cur

## Validação do fluxo de importação
- ✅ Prévia obrigatória (métricas antes de gravar): total=9
- ✅ Nenhuma linha descartada silenciosamente: parsed=9, trained=9
- ✅ Linhas incertas com rawContent: NEEDS_REVIEW preserva linha original
- ✅ layoutModelId disponível para confirmação: modelId=cmq1y23gm0001os6kdr5zszg3
- ✅ Confirmação persiste correções: learnFromCorrections executado pós-prévia
