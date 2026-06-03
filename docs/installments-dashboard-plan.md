# Plano Dashboard — Central de Parcelamentos (Sprint 7)

---

## UI principal (nova)

**Rota sugerida:** `/dashboard/installments`  
**Sidebar:** "Parcelamentos" ou "Central de Parcelamentos"

### Layout

1. **Cards resumo (topo)**
2. **Filtros:** cartão, categoria, status (ativo/quitado), período
3. **Lista/tabela de planos** com drill-down nas parcelas

---

## Indicadores (cards)

| Indicador | Definição | Fonte |
|-----------|-----------|-------|
| **Parcelado total** | Soma `amount` de todas as parcelas (planos ativos) | Agregação por grupo |
| **Parcelas restantes** | Contagem de parcelas com vencimento futuro | Transações futuras |
| **Comprometimento futuro (30d)** | Soma valores com vencimento ≤ 30 dias | Alinhado ao cashflow |
| **Comprometimento futuro (90d)** | Idem 90 dias | Cashflow |
| **Já pago** | Parcelas com data ≤ hoje | Transações |

---

## Indicadores por dimensão

### Por cartão

- Tabela: cartão | planos ativos | restante | próximo vencimento
- Gráfico opcional: barras por bandeira

### Por categoria

- Agrupar primeira parcela do plano (ou maioria) por `categoryId`
- Útil para advisor e orçamento

---

## Dashboard executivo (extensão)

Adicionar ao DTO `executive-dashboard` (futuro):

```typescript
installments: {
  parceladoTotal: number;
  parcelasRestantes: number;
  comprometimento30Dias: number;
  maiorPlano: { nome: string; restante: number } | null;
}
```

**Card compacto** no grid existente (ao lado de Planejamento), link para `/dashboard/installments`.

---

## Planejamento financeiro (extensão futura)

- Na viabilidade da meta, subtrair `comprometimento30Dias` da margem livre antes de calcular risco.
- Documentar na Sprint 7 implementação; depende da central estar estável.

---

## UX / indicadores visuais

| Estado | Visual |
|--------|--------|
| Em dia | 🟢 |
| Vence este mês | 🟡 |
| Atrasado / risco alto comprometimento | 🔴 |

---

## APIs necessárias (Sprint 7)

- `GET /api/installments/summary`
- `GET /api/installments/plans?cardId=&status=`
- Opcional: `GET /api/installments/plans/[groupId]`

Todas com auth; sem `userId` no body.
