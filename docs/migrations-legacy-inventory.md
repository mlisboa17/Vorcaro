# Inventário legado — Prisma migrations (pré-Sprint 4.6)

**Data do arquivamento:** 2026-06-02  
**Motivo:** 9 migrations sem `migration.sql`, P3015/P3009, drift e histórico inconsistente.  
**Decisão:** rebaseline a partir de `schema.prisma` atual; pasta original em `prisma/migrations_archived_legacy/`.

**Backup pré-reset:** `backups/dev_reset_before_clean_migrations.sql`

---

## Migrations perdidas (sem arquivo local)

| Migration | Checksum (SHA-256) | `applied_steps_count` | Status no banco (pré-reset) |
|-----------|-------------------|------------------------|-----------------------------|
| `20260531120000_inbox_import_dedup` | `9c733b92f0f8b2ee393a6beb4178610f5151b547bf3aaf74f666465004d360f8` | 1 | Aplicada (`finished_at` preenchido) |
| `20260531140000_category_hierarchy` | `c0d0240ec74f0ae34e9b111c772194ccab5e0072b79e2917c0369747ca67af6e` | 1 | Aplicada |
| `20260531160000_add_recurring_and_subcategories` | `be0b34236e06a4b2371ee8b3d4476f58ba97833f19cef2ca0a2bf659f201d22f` | 1 | Aplicada |
| `20260531180000_evolve_credit_card_and_cash_logic` | `cf2b17c0896e19b9049d96efd76798bc0136c66ee6abe65ef7151c4adde95c26` | 1 | Aplicada |
| `20260531190000_card_hierarchy` | `72c9a9e7fdfe4c36212296b881a67998720a3ea1b2a10f5526742ab5a79569c3` | 1 | Aplicada |
| `20260531200000_add_patrimony_models` | `8634cb3cf7d64939a393e9699c8e9a6f34a565261f97403b57d25718437ad82b` | 0 | Aplicada (após rollback de tentativa com `AssetType` duplicado) |
| `20260531210000_transaction_allocations` | `f65150da9beb95f2c20aa4e163348d65cf9951eb99eb9374c07ca9465a31f03c` | 0 | Aplicada |
| `20260531220000_add_monthly_budget` | `b14725a1f93d37bd4fcd4fc1e0deabe437d9d2934d232b9068f5b60cbe58b241` | 0 | Aplicada |
| `20260531230000_inbox_dismissed` | `00456bb708cd4ff4432226e16bc82ef16f4b0ef731c4380123f90543899fbc3f` | 0 | Aplicada |

---

## Demais entradas em `_prisma_migrations` (pré-reset)

| Migration | Checksum | Steps | Status |
|-----------|----------|-------|--------|
| `20260530120000_consolidate_financial_core` | `8c809816d4488afc96b1236a602fc34736c1ef415758dca48849ce74d03149df` | 0 | Aplicada |
| `20260531240000_recurring_transactions` | `fdcc88af5dfeb8842b69f052e853781d8ac4036fcc2c1d3fb599d074adfd58cd` | 0 | Falhou depois resolve (`FrequenciaRecorrencia` já existia) |
| `20260602120000_consortium_module` | `e1ccc2221a53600cd3cf0ab8c03ac0c9ccd284de22f791e03ba38a0dec2b7656` | 0 | Aplicada (`migrate resolve`) |

Migrations com SQL local mas **não** registradas antes do reset:  
`20260531250000_liability_links`, `20260531260000_recurring_default_allocations`, `20260601210000_patrimony_module`.

---

## Observações

- Os 9 arquivos `migration.sql` **nunca foram commitados** no Git; recuperação por checksum exigiria fonte externa.
- Drift incluía tabelas legadas (`Asset`, `Liability`, `Consorcio`, etc.) e enums com valores PT+EN.
- Após Sprint 4.6, a origem oficial passa a ser `prisma/migrations/*_init_clean_schema/`.
