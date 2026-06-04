import type { VorcaroArchetype, VorcaroTemplateCategory, VorcaroTone } from "./types/vorcaro-personality";

export type VorcaroTemplateEntry = {
  id: string;
  category: VorcaroTemplateCategory;
  archetype: VorcaroArchetype;
  observations: Partial<Record<VorcaroTone, string>>;
};

function tpl(
  category: VorcaroTemplateCategory,
  index: number,
  archetype: VorcaroArchetype,
  observations: Partial<Record<VorcaroTone, string>>,
): VorcaroTemplateEntry {
  return {
    id: `${category.toLowerCase()}-${String(index).padStart(3, "0")}`,
    category,
    archetype,
    observations,
  };
}

/** Biblioteca central de variações — Sprint 10.5 */
export const VORCARO_TEMPLATE_LIBRARY: VorcaroTemplateEntry[] = [
  // DELIVERY (8)
  tpl("DELIVERY", 1, "CFO", {
    PROFESSIONAL: "Esse valor pode ser redirecionado para metas de patrimônio.",
    DIRECT: "Reduza esse gasto. O percentual da renda é alto demais.",
    BALANCED:
      "Existe oportunidade de reduzir esse valor sem comprometer sua qualidade de vida.",
    VORCARO: "Não estou preocupado com a comida. Estou preocupado com o dinheiro que não teve chance de trabalhar para você.",
    IMPACT: "Seu patrimônio assistiu esse dinheiro passar por ele sem sequer acenar.",
    REALITY_AUDITOR: "Você diz que quer construir patrimônio. Seu extrato apresentou uma tese diferente.",
  }),
  tpl("DELIVERY", 2, "AUDITOR", {
    DIRECT: "Delivery recorrente corrói margem. Ajuste ou aceite o custo de oportunidade.",
    VORCARO: "Seu patrimônio observou esse dinheiro sair sem apresentar resistência.",
    IMPACT: "Pelo menos alguém aproveitou. Seu futuro financeiro, não.",
  }),
  tpl("DELIVERY", 3, "INVESTOR", {
    PROFESSIONAL: "Capital alocado em conveniência tem custo de oportunidade mensurável.",
    VORCARO: "Cada pedido é um voto contra o crescimento silencioso do patrimônio.",
    REALITY_AUDITOR: "Os números normalmente vencem a discussão. Hoje não foi exceção.",
  }),
  tpl("DELIVERY", 4, "ANALYST", {
    DIRECT: "Percentual acima do limite saudável para essa categoria.",
    IMPACT: "Conveniência tem preço. O extrato acabou de cobrar a fatura.",
  }),
  tpl("DELIVERY", 5, "PARTNER", {
    PROFESSIONAL: "Como sócio financeiro, sugiro revisar essa decisão recorrente.",
    VORCARO: "Seu eu do futuro agradece quando o presente cozinha — ou economiza.",
  }),
  tpl("DELIVERY", 6, "CFO", {
    DIRECT: "Metade desse valor, investido, compõe patrimônio. Delivery não compõe.",
    REALITY_AUDITOR: "Discurso de disciplina, prática de delivery. Clássico.",
  }),
  tpl("DELIVERY", 7, "AUDITOR", {
    VORCARO: "O patrimônio não julga. Só registra. E hoje registrou mais uma saída.",
    IMPACT: "Renda entra. Patrimônio espera. Delivery não espera.",
  }),
  tpl("DELIVERY", 8, "INVESTOR", {
    PROFESSIONAL: "Revisar esse hábito pode acelerar metas de longo prazo.",
    DIRECT: "Corte pela metade. Número fechado.",
  }),

  // DUPLICATE_STREAMING (8)
  tpl("DUPLICATE_STREAMING", 1, "AUDITOR", {
    VORCARO: "Você encontrou uma forma criativa de pagar duas vezes pela mesma coisa.",
    DIRECT: "Dois pagamentos. Um serviço. Matemática questionável.",
    IMPACT: "O Netflix agradece a confiança.",
    REALITY_AUDITOR: "Assinatura duplicada é imposto voluntário sobre distração.",
  }),
  tpl("DUPLICATE_STREAMING", 2, "CFO", {
    PROFESSIONAL: "Consolidar assinaturas elimina custo duplicado imediato.",
    VORCARO: "Seu dinheiro gostou tanto do streaming que resolveu assinar novamente.",
  }),
  tpl("DUPLICATE_STREAMING", 3, "ANALYST", {
    DIRECT: "Custo duplicado identificado. Cancelar um resolve.",
    IMPACT: "Dois débitos, uma série. Ineficiência pura.",
  }),
  tpl("DUPLICATE_STREAMING", 4, "INVESTOR", {
    VORCARO: "Patrimônio não cresce pagando duas vezes pelo mesmo filme.",
    REALITY_AUDITOR: "Auditoria concluída: você financiou o mesmo entretenimento em dobro.",
  }),
  tpl("DUPLICATE_STREAMING", 5, "PARTNER", {
    PROFESSIONAL: "Revisão de assinaturas é manutenção básica de caixa.",
    DIRECT: "Cancele o duplicado hoje.",
  }),
  tpl("DUPLICATE_STREAMING", 6, "AUDITOR", {
    VORCARO: "Streaming duplicado: luxo invisível com recibo visível.",
    IMPACT: "A plataforma ganhou. Seu patrimônio perdeu. Empate zero para você.",
  }),
  tpl("DUPLICATE_STREAMING", 7, "CFO", {
    DIRECT: "Economia mensal imediata ao eliminar redundância.",
    REALITY_AUDITOR: "Orçamento pediu coerência. Assinaturas pediram desculpas.",
  }),
  tpl("DUPLICATE_STREAMING", 8, "INVESTOR", {
    PROFESSIONAL: "Capital liberado pode ser realocado para construção patrimonial.",
    VORCARO: "Menos uma assinatura, mais um tijolo no patrimônio.",
  }),

  // OVERDUE_RECEIVABLE (8)
  tpl("OVERDUE_RECEIVABLE", 1, "INVESTOR", {
    VORCARO: "Seu dinheiro está trabalhando. Só que para outra pessoa.",
    DIRECT: "Cobrar agora. Capital parado em terceiros.",
    IMPACT: "Detectei capital temporariamente terceirizado.",
    REALITY_AUDITOR: "Recebível atrasado é empréstimo sem juros que você concedeu.",
  }),
  tpl("OVERDUE_RECEIVABLE", 2, "CFO", {
    PROFESSIONAL: "Regularizar recebíveis melhora liquidez e previsibilidade.",
    VORCARO: "Seu recebível continua acreditando que mora na conta de outra pessoa.",
  }),
  tpl("OVERDUE_RECEIVABLE", 3, "PARTNER", {
    DIRECT: "Acione cobrança. Fluxo depende disso.",
    IMPACT: "Patrimônio esperando retorno que não chegou.",
  }),
  tpl("OVERDUE_RECEIVABLE", 4, "AUDITOR", {
    VORCARO: "Ativo financeiro em estado de cativeiro alheio.",
    REALITY_AUDITOR: "Crédito concedido sem contrato. Extrato não mente.",
  }),
  tpl("OVERDUE_RECEIVABLE", 5, "ANALYST", {
    PROFESSIONAL: "Valor pendente impacta saldo disponível e metas.",
    DIRECT: "Registrar cobrança é prioridade operacional.",
  }),
  tpl("OVERDUE_RECEIVABLE", 6, "INVESTOR", {
    VORCARO: "Dinheiro parado fora do seu patrimônio é dinheiro em greve.",
    IMPACT: "Liquidez refém de terceiros.",
  }),
  tpl("OVERDUE_RECEIVABLE", 7, "CFO", {
    DIRECT: "Recuperar esse valor restaura margem mensal.",
    REALITY_AUDITOR: "Sua conta corrente pediu o que é dela.",
  }),
  tpl("OVERDUE_RECEIVABLE", 8, "PARTNER", {
    PROFESSIONAL: "Como sócio, recomendo cobrança formal imediata.",
    VORCARO: "Patrimônio não cresce com crédito informal eterno.",
  }),

  // GOAL_AT_RISK (8)
  tpl("GOAL_AT_RISK", 1, "PARTNER", {
    PROFESSIONAL: "Ajuste aportes ou prazo para manter viabilidade da meta.",
    VORCARO: "A meta continua possível. O calendário está demonstrando mais urgência do que os aportes.",
    IMPACT: "A meta não desistiu. Mas está começando a perder a paciência.",
    REALITY_AUDITOR: "Objetivo declarado e ritmo de aporte divergem. Auditoria confirmou.",
  }),
  tpl("GOAL_AT_RISK", 2, "CFO", {
    DIRECT: "Meta em risco. Aumente aporte ou revise prazo.",
    VORCARO: "Patrimônio não se constrói com boas intenções calendarizadas.",
  }),
  tpl("GOAL_AT_RISK", 3, "INVESTOR", {
    PROFESSIONAL: "Revisão de plano evita abandono da meta.",
    IMPACT: "Cada mês sem aporte adequado é juros compostos perdidos.",
  }),
  tpl("GOAL_AT_RISK", 4, "ANALYST", {
    DIRECT: "Gap entre meta e aporte mensal identificado.",
    REALITY_AUDITOR: "Meta no papel, patrimônio na espera.",
  }),
  tpl("GOAL_AT_RISK", 5, "AUDITOR", {
    VORCARO: "O destino financeiro exige consistência, não só definição.",
    IMPACT: "Risco alto não é drama. É matemática.",
  }),
  tpl("GOAL_AT_RISK", 6, "CFO", {
    PROFESSIONAL: "Realocar recursos pode recuperar trajetória.",
    DIRECT: "Corrija rota esta semana.",
  }),
  tpl("GOAL_AT_RISK", 7, "INVESTOR", {
    VORCARO: "Metas sem aporte são posters motivacionais, não patrimônio.",
    REALITY_AUDITOR: "Disciplina de aporte ausente no período analisado.",
  }),
  tpl("GOAL_AT_RISK", 8, "PARTNER", {
    DIRECT: "Decisão: mais aporte ou meta mais realista.",
    IMPACT: "O futuro financeiro sente cada mês de atraso.",
  }),

  // NEGATIVE_CASHFLOW (8)
  tpl("NEGATIVE_CASHFLOW", 1, "CFO", {
    PROFESSIONAL: "Saldo negativo projetado exige ajuste imediato de despesas ou receitas.",
    VORCARO: "O futuro enviou um aviso. Ele prefere não precisar mandar uma cobrança.",
    IMPACT: "Daqui a alguns dias o saldo fica negativo. Os números já sabem.",
    REALITY_AUDITOR: "Fluxo negativo é carta de demissão antecipada da tranquilidade financeira.",
  }),
  tpl("NEGATIVE_CASHFLOW", 2, "ANALYST", {
    DIRECT: "Caixa negativo em breve. Aja antes da data.",
    VORCARO: "Patrimônio não sobrevive a meses de sangria silenciosa.",
  }),
  tpl("NEGATIVE_CASHFLOW", 3, "AUDITOR", {
    IMPACT: "O calendário não negocia. O saldo também não.",
    REALITY_AUDITOR: "Projeção negativa confirmada. Sem ação, multa emocional garantida.",
  }),
  tpl("NEGATIVE_CASHFLOW", 4, "INVESTOR", {
    PROFESSIONAL: "Preservar liquidez é pré-requisito para investir.",
    DIRECT: "Corte despesas ou antecipe receitas.",
  }),
  tpl("NEGATIVE_CASHFLOW", 5, "PARTNER", {
    VORCARO: "Controlar o fluxo é controlar o futuro. Hoje o fluxo pediu atenção.",
    IMPACT: "Vermelho no horizonte. Ainda dá tempo de desviar.",
  }),
  tpl("NEGATIVE_CASHFLOW", 6, "CFO", {
    DIRECT: "Priorize essencial. Adie o resto.",
    REALITY_AUDITOR: "Orçamento e realidade divergem nos próximos dias.",
  }),
  tpl("NEGATIVE_CASHFLOW", 7, "AUDITOR", {
    VORCARO: "Saldo negativo não é surpresa para quem lê projeções.",
    PROFESSIONAL: "Revisão de compromissos do mês é urgente.",
  }),
  tpl("NEGATIVE_CASHFLOW", 8, "INVESTOR", {
    IMPACT: "Liquidez zero mata oportunidade. Ajuste agora.",
    DIRECT: "Data crítica identificada. Plano de contenção necessário.",
  }),

  // MONEY_LEAK (8)
  tpl("MONEY_LEAK", 1, "AUDITOR", {
    VORCARO: "Pequenos vazamentos afundam grandes navios patrimoniais.",
    DIRECT: "Gastos invisíveis somados. Feche as torneiras.",
    IMPACT: "Dinheiro escorrendo em silêncio. O extrato ouviu.",
  }),
  tpl("MONEY_LEAK", 2, "CFO", {
    PROFESSIONAL: "Consolidar microgastos recorrentes libera margem.",
    REALITY_AUDITOR: "Vazamento detectado. Patrimônio foi o primeiro a sentir.",
  }),
  tpl("MONEY_LEAK", 3, "ANALYST", {
    DIRECT: "Tendência de alta em gastos pequenos. Revisar.",
    VORCARO: "Patrimônio sangra em centavos antes de sangrar em milhares.",
  }),
  tpl("MONEY_LEAK", 4, "INVESTOR", {
    IMPACT: "Cada real vazado é juro composto que nunca nasceu.",
    PROFESSIONAL: "Auditoria de recorrências de baixo valor recomendada.",
  }),
  tpl("MONEY_LEAK", 5, "PARTNER", {
    DIRECT: "Elimine 3 itens recorrentes hoje.",
    VORCARO: "Desperdício também cresce em silêncio.",
  }),
  tpl("MONEY_LEAK", 6, "AUDITOR", {
    REALITY_AUDITOR: "Microtransações, macro impacto. Clássico.",
    IMPACT: "O patrimônio não reclama. Só para de crescer.",
  }),
  tpl("MONEY_LEAK", 7, "CFO", {
    PROFESSIONAL: "Revisão semanal de assinaturas e apps financeiros.",
    DIRECT: "Valor mensal agregado acima do tolerável.",
  }),
  tpl("MONEY_LEAK", 8, "INVESTOR", {
    VORCARO: "Dinheiro que não trabalha está em fuga disfarçada de conveniência.",
    IMPACT: "Fuga silenciosa confirmada nos números.",
  }),

  // HIGH_COMMITMENT (8)
  tpl("HIGH_COMMITMENT", 1, "CFO", {
    PROFESSIONAL: "Comprometimento elevado da renda reduz flexibilidade patrimonial.",
    DIRECT: "Mais de 80% da renda comprometida. Risco alto.",
    VORCARO: "Patrimônio não nasce quando a renda já foi alugada para o mês.",
  }),
  tpl("HIGH_COMMITMENT", 2, "ANALYST", {
    IMPACT: "Pouca margem significa zero resiliência a imprevistos.",
    REALITY_AUDITOR: "Renda capturada por compromissos fixos. Auditoria severa.",
  }),
  tpl("HIGH_COMMITMENT", 3, "INVESTOR", {
    DIRECT: "Renegocie ou corte compromissos antes de investir mais.",
    VORCARO: "Liberdade financeira exige margem. Você está no limite.",
  }),
  tpl("HIGH_COMMITMENT", 4, "PARTNER", {
    PROFESSIONAL: "Revisão de recorrências e parcelas é prioritária.",
    IMPACT: "Um imprevisto derruba quem não tem colchão.",
  }),
  tpl("HIGH_COMMITMENT", 5, "AUDITOR", {
    DIRECT: "Percentual de comprometimento acima do saudável.",
    REALITY_AUDITOR: "Orçamento apertado demais para construir patrimônio.",
  }),
  tpl("HIGH_COMMITMENT", 6, "CFO", {
    VORCARO: "Compromisso alto hoje é patrimônio baixo amanhã.",
    PROFESSIONAL: "Plano de desalavancagem recomendado.",
  }),
  tpl("HIGH_COMMITMENT", 7, "INVESTOR", {
    IMPACT: "Margem estreita mata oportunidade de aporte.",
    DIRECT: "Meta: reduzir comprometimento abaixo de 70%.",
  }),
  tpl("HIGH_COMMITMENT", 8, "AUDITOR", {
    VORCARO: "Sua renda assinou contratos demais antes de assinar metas.",
    REALITY_AUDITOR: "Comprometimento crítico. Ação corretiva necessária.",
  }),

  // EXCESSIVE_INSTALLMENTS (8)
  tpl("EXCESSIVE_INSTALLMENTS", 1, "CFO", {
    PROFESSIONAL: "Múltiplos parcelamentos simultâneos comprimem fluxo futuro.",
    DIRECT: "Parcelas demais. Pare de fragmentar compras.",
    VORCARO: "Patrimônio futuro já foi hipotecado em parcelas do presente.",
  }),
  tpl("EXCESSIVE_INSTALLMENTS", 2, "ANALYST", {
    IMPACT: "Cada parcela é um imposto sobre decisões passadas.",
    REALITY_AUDITOR: "Concentração de parcelas detectada. Risco de asfixia de caixa.",
  }),
  tpl("EXCESSIVE_INSTALLMENTS", 3, "AUDITOR", {
    DIRECT: "Revise planos ativos e evite novos.",
    VORCARO: "O cartão lembra. O patrimônio também.",
  }),
  tpl("EXCESSIVE_INSTALLMENTS", 4, "INVESTOR", {
    PROFESSIONAL: "Quitar ou consolidar reduz custo emocional e financeiro.",
    IMPACT: "Parcelamento excessivo é patrimônio adiado indefinidamente.",
  }),
  tpl("EXCESSIVE_INSTALLMENTS", 5, "PARTNER", {
    VORCARO: "Comprar parcelado demais é vender o futuro a juros emocionais.",
    DIRECT: "Limite novos parcelamentos por 90 dias.",
  }),
  tpl("EXCESSIVE_INSTALLMENTS", 6, "CFO", {
    REALITY_AUDITOR: "Fluxo futuro já comprometido antes de chegar.",
    PROFESSIONAL: "Priorize quitação dos menores saldos.",
  }),
  tpl("EXCESSIVE_INSTALLMENTS", 7, "AUDITOR", {
    IMPACT: "Parcelas sobrepostas = margem zero.",
    VORCARO: "Silenciosamente, o futuro ficou mais caro.",
  }),
  tpl("EXCESSIVE_INSTALLMENTS", 8, "INVESTOR", {
    DIRECT: "Menos parcelas, mais capital livre.",
    REALITY_AUDITOR: "Auditoria: excesso de compromissos parcelados.",
  }),

  // CREDIT_CARD (8)
  tpl("CREDIT_CARD", 1, "CFO", {
    PROFESSIONAL: "Utilização elevada do limite aumenta risco e custo financeiro.",
    DIRECT: "Cartão no limite. Reduza uso imediato.",
    VORCARO: "Crédito rotativo financia hábitos, não patrimônio.",
  }),
  tpl("CREDIT_CARD", 2, "AUDITOR", {
    IMPACT: "Limite estourado é alarme, não detalhe.",
    REALITY_AUDITOR: "Risco de cartão confirmado. Juros compostos contra você.",
  }),
  tpl("CREDIT_CARD", 3, "INVESTOR", {
    DIRECT: "Pague fatura integral. Evite rotativo.",
    VORCARO: "Patrimônio não cresce pagando juros de cartão.",
  }),
  tpl("CREDIT_CARD", 4, "ANALYST", {
    PROFESSIONAL: "Monitorar concentração por cartão evita surpresas.",
    IMPACT: "Cada real de juro é patrimônio que evaporou.",
  }),
  tpl("CREDIT_CARD", 5, "PARTNER", {
    VORCARO: "O cartão é ferramenta. Hoje virou âncora.",
    DIRECT: "Meta: usar débito até normalizar fatura.",
  }),
  tpl("CREDIT_CARD", 6, "CFO", {
    REALITY_AUDITOR: "Limite alto usado demais. Clássico prelúdio de aperto.",
    PROFESSIONAL: "Plano de amortização recomendado.",
  }),
  tpl("CREDIT_CARD", 7, "AUDITOR", {
    IMPACT: "Rotativo é imposto sobre impaciência.",
    DIRECT: "Corte novas compras no cartão crítico.",
  }),
  tpl("CREDIT_CARD", 8, "INVESTOR", {
    VORCARO: "Juros de cartão são anti-investimento garantido.",
    REALITY_AUDITOR: "Extrato e meta patrimonial em rota de colisão.",
  }),

  // FORGOTTEN_SUBSCRIPTION (8)
  tpl("FORGOTTEN_SUBSCRIPTION", 1, "AUDITOR", {
    VORCARO: "Assinatura esquecida: doação mensal involuntária ao esquecimento.",
    DIRECT: "Cancele o que não usa. Hoje.",
    IMPACT: "Dinheiro saindo por inércia, não por decisão.",
  }),
  tpl("FORGOTTEN_SUBSCRIPTION", 2, "CFO", {
    PROFESSIONAL: "Auditoria trimestral de assinaturas evita vazamento.",
    REALITY_AUDITOR: "Serviço cobrando sem valor entregue percebido.",
  }),
  tpl("FORGOTTEN_SUBSCRIPTION", 3, "INVESTOR", {
    VORCARO: "Patrimônio financia apps que você esqueceu que existem.",
    DIRECT: "Revise extrato dos últimos 90 dias.",
  }),
  tpl("FORGOTTEN_SUBSCRIPTION", 4, "ANALYST", {
    IMPACT: "Recorrência fantasma detectada.",
    PROFESSIONAL: "Cancelamento libera caixa imediato.",
  }),
  tpl("FORGOTTEN_SUBSCRIPTION", 5, "PARTNER", {
    DIRECT: "Liste todas assinaturas. Elimine 1+.",
    VORCARO: "Esquecer assinatura é taxa sobre distração.",
  }),
  tpl("FORGOTTEN_SUBSCRIPTION", 6, "AUDITOR", {
    REALITY_AUDITOR: "Cobrança recorrente sem uso comprovado.",
    IMPACT: "Silêncio caro no extrato.",
  }),
  tpl("FORGOTTEN_SUBSCRIPTION", 7, "CFO", {
    PROFESSIONAL: "Manutenção de assinaturas é higiene financeira básica.",
    VORCARO: "Menos uma cobrança automática, mais um real trabalhando.",
  }),
  tpl("FORGOTTEN_SUBSCRIPTION", 8, "INVESTOR", {
    DIRECT: "Economia recorrente permanente ao cancelar.",
    REALITY_AUDITOR: "Assinatura zumbi identificada.",
  }),

  // INVISIBLE_SPENDING (8)
  tpl("INVISIBLE_SPENDING", 1, "AUDITOR", {
    VORCARO: "Gastos invisíveis são patrimônio que nunca chegou a existir.",
    DIRECT: "Some microgastos. O total assusta.",
    IMPACT: "Invisível no dia a dia, visível no fim do mês.",
  }),
  tpl("INVISIBLE_SPENDING", 2, "CFO", {
    PROFESSIONAL: "Categorizar pequenas saídas revela padrões ocultos.",
    REALITY_AUDITOR: "Dispersão de gastos pequenos confirmada.",
  }),
  tpl("INVISIBLE_SPENDING", 3, "ANALYST", {
    DIRECT: "Tendência de microgastos acima da média.",
    VORCARO: "Patrimônio morre em gotas, não só em torrentes.",
  }),
  tpl("INVISIBLE_SPENDING", 4, "INVESTOR", {
    IMPACT: "Centavos repetidos viram milhares por ano.",
    PROFESSIONAL: "Defina teto semanal para gastos diversos.",
  }),
  tpl("INVISIBLE_SPENDING", 5, "PARTNER", {
    VORCARO: "O que você não vê, o patrimônio sente.",
    DIRECT: "Rastreie por 7 dias. Depois corte.",
  }),
  tpl("INVISIBLE_SPENDING", 6, "AUDITOR", {
    REALITY_AUDITOR: "Gastos difusos sem categoria clara. Alerta.",
    IMPACT: "Sumiu do radar, não do saldo.",
  }),
  tpl("INVISIBLE_SPENDING", 7, "CFO", {
    PROFESSIONAL: "Consolidação de categorias 'Outros' recomendada.",
    DIRECT: "Reduza 20% nos próximos 30 dias.",
  }),
  tpl("INVISIBLE_SPENDING", 8, "INVESTOR", {
    VORCARO: "Invisível hoje, ausente no patrimônio amanhã.",
    IMPACT: "Microdecisões, macro consequência.",
  }),

  // IMPULSE_PURCHASE (8)
  tpl("IMPULSE_PURCHASE", 1, "PARTNER", {
    PROFESSIONAL: "Regra de 48h antes de compras não essenciais reduz impulsividade.",
    VORCARO: "Impulso financia emoção. Patrimônio financia disciplina.",
    IMPACT: "Compra impulsiva: patrimônio adiado em um clique.",
  }),
  tpl("IMPULSE_PURCHASE", 2, "CFO", {
    DIRECT: "Pause compras não planejadas por uma semana.",
    REALITY_AUDITOR: "Emoção no extrato, estratégia na espera.",
  }),
  tpl("IMPULSE_PURCHASE", 3, "AUDITOR", {
    VORCARO: "O cartão não julga impulsos. O patrimônio registra.",
    IMPACT: "Decisão rápida, impacto lento.",
  }),
  tpl("IMPULSE_PURCHASE", 4, "INVESTOR", {
    PROFESSIONAL: "Orçamento de lazer fixo contém impulsos.",
    DIRECT: "Estorne ou evite repetir padrão.",
  }),
  tpl("IMPULSE_PURCHASE", 5, "ANALYST", {
    IMPACT: "Picos de gasto discrecional identificados.",
    VORCARO: "Patrimônio não compra o que a emoção escolheu.",
  }),
  tpl("IMPULSE_PURCHASE", 6, "CFO", {
    REALITY_AUDITOR: "Compra sem plano detectada.",
    DIRECT: "Liste últimas 5 compras impulsivas. Corte 2.",
  }),
  tpl("IMPULSE_PURCHASE", 7, "AUDITOR", {
    PROFESSIONAL: "Separar desejo de necessidade protege metas.",
    VORCARO: "Impulso é curto. Patrimônio é longo.",
  }),
  tpl("IMPULSE_PURCHASE", 8, "INVESTOR", {
    IMPACT: "Cada impulso é aporte não realizado.",
    REALITY_AUDITOR: "Disciplina perdeu a rodada. Próxima é sua.",
  }),

  // PATRIMONY (8)
  tpl("PATRIMONY", 1, "INVESTOR", {
    PROFESSIONAL: "Patrimônio cresce com aportes consistentes e custo controlado.",
    VORCARO: "Patrimônio é o que sobra quando a renda para de vazar.",
    IMPACT: "Construir patrimônio é guerra silenciosa contra o desperdício.",
  }),
  tpl("PATRIMONY", 2, "CFO", {
    DIRECT: "Aumente aportes ou reduza saídas. Patrimônio responde.",
    REALITY_AUDITOR: "Ativos crescem quando passivos e hábitos obedecem.",
  }),
  tpl("PATRIMONY", 3, "PARTNER", {
    PROFESSIONAL: "Revisão patrimonial trimestral alinha decisões.",
    VORCARO: "Patrimônio não grita. Só acumula quem escuta.",
  }),
  tpl("PATRIMONY", 4, "ANALYST", {
    DIRECT: "Taxa de crescimento patrimonial abaixo do potencial.",
    IMPACT: "Cada mês sem aporte é mês de patrimônio estagnado.",
  }),
  tpl("PATRIMONY", 5, "AUDITOR", {
    VORCARO: "Patrimônio é scoreboard. Hoje pediu mais pontos.",
    REALITY_AUDITOR: "Renda entrou. Patrimônio questionou onde ficou.",
  }),
  tpl("PATRIMONY", 6, "INVESTOR", {
    PROFESSIONAL: "Diversificação e consistência superam timing.",
    DIRECT: "Defina aporte mínimo mensal e cumpra.",
  }),
  tpl("PATRIMONY", 7, "CFO", {
    IMPACT: "Patrimônio estagnado é oportunidade perdida composta.",
    VORCARO: "Renda sem patrimônio é fluxo sem destino.",
  }),
  tpl("PATRIMONY", 8, "AUDITOR", {
    REALITY_AUDITOR: "Balanco pede coerência entre discurso e aporte.",
    DIRECT: "Meta patrimonial: +1 aporte este mês.",
  }),

  // INVESTMENTS (8)
  tpl("INVESTMENTS", 1, "INVESTOR", {
    PROFESSIONAL: "Investir exige margem de caixa e horizonte definido.",
    VORCARO: "Dinheiro parado espera. Dinheiro investido trabalha.",
    IMPACT: "Oportunidade de retorno começa com disciplina de aporte.",
  }),
  tpl("INVESTMENTS", 2, "CFO", {
    DIRECT: "Só invista após reserva e contas em dia.",
    REALITY_AUDITOR: "Investir sem margem é apostar com corda no pescoço.",
  }),
  tpl("INVESTMENTS", 3, "ANALYST", {
    PROFESSIONAL: "Alocação deve seguir perfil de risco e liquidez.",
    VORCARO: "Patrimônio compounda quando você deixa de interrompê-lo.",
  }),
  tpl("INVESTMENTS", 4, "PARTNER", {
    IMPACT: "Aporte regular supera timing perfeito.",
    DIRECT: "Automatize aporte mensal.",
  }),
  tpl("INVESTMENTS", 5, "AUDITOR", {
    VORCARO: "Investimento não é sorte. É sobra de disciplina.",
    REALITY_AUDITOR: "Fluxo negativo e investimento simultâneo: contradição.",
  }),
  tpl("INVESTMENTS", 6, "INVESTOR", {
    PROFESSIONAL: "Revise carteira e rebalanceie se necessário.",
    DIRECT: "Priorize liquidez antes de risco.",
  }),
  tpl("INVESTMENTS", 7, "CFO", {
    IMPACT: "Juros compostos exigem tempo e consistência.",
    VORCARO: "Cada real investido é soldado do patrimônio.",
  }),
  tpl("INVESTMENTS", 8, "AUDITOR", {
    REALITY_AUDITOR: "Investir sem controle de gastos é encher balde furado.",
    DIRECT: "Corrija vazamentos antes de aumentar aporte.",
  }),

  // GENERAL (8)
  tpl("GENERAL", 1, "PARTNER", {
    PROFESSIONAL: "Revisão financeira periódica mantém decisões alinhadas a objetivos.",
    VORCARO: "Patrimônio é construído em decisões repetidas, não em eventos únicos.",
    DIRECT: "Aja sobre o dado apresentado.",
  }),
  tpl("GENERAL", 2, "CFO", {
    PROFESSIONAL: "Números claros permitem decisões melhores.",
    IMPACT: "Ignorar o dado não muda o dado.",
  }),
  tpl("GENERAL", 3, "INVESTOR", {
    VORCARO: "Renda é combustível. Patrimônio é o destino.",
    REALITY_AUDITOR: "Extrato atualizado. Sua vez de atualizar decisões.",
  }),
  tpl("GENERAL", 4, "ANALYST", {
    DIRECT: "Fato, impacto, ação. Nessa ordem.",
    PROFESSIONAL: "Priorize o que move patrimônio neste mês.",
  }),
  tpl("GENERAL", 5, "AUDITOR", {
    VORCARO: "Decisão registrada. Consequência em processamento.",
    IMPACT: "O futuro financeiro agradece quem age cedo.",
  }),
  tpl("GENERAL", 6, "CFO", {
    DIRECT: "Próximo passo concreto definido abaixo.",
    REALITY_AUDITOR: "Auditoria concluída. Ação recomendada.",
  }),
  tpl("GENERAL", 7, "PARTNER", {
    PROFESSIONAL: "Estou aqui para transformar renda em patrimônio com você.",
    VORCARO: "Essa decisão pode trabalhar a favor ou contra seus objetivos.",
  }),
  tpl("GENERAL", 8, "INVESTOR", {
    IMPACT: "Pequena correção hoje, patrimônio diferente amanhã.",
    DIRECT: "Execute a ação sugerida.",
  }),
];

export function getTemplatesByCategory(category: VorcaroTemplateCategory): VorcaroTemplateEntry[] {
  return VORCARO_TEMPLATE_LIBRARY.filter((t) => t.category === category);
}

export function getTemplateById(id: string): VorcaroTemplateEntry | undefined {
  return VORCARO_TEMPLATE_LIBRARY.find((t) => t.id === id);
}
