/**
 * Respostas curtas e humanizadas para os eventos do fluxo de lançamento no Telegram.
 * Variar as frases evita o tom robótico/repetitivo sem custo de IA nem de DB.
 * (O tom completo do Vorcaro — 6 personalidades — é aplicado no chat/advisor,
 * não nestas micro-confirmações.)
 */
export type HumanReplyEvent =
  | "saved"
  | "savedReview"
  | "discarded"
  | "valueEdited"
  | "localEdited"
  | "categoryEdited"
  | "editCancelled"
  | "notUnderstood";

const REPLIES: Record<HumanReplyEvent, string[]> = {
  saved: [
    "✅ Prontinho, lançamento registrado! 🎉",
    "✅ Feito! Já anotei aqui. 👍",
    "✅ Registrado com sucesso! 🙌",
    "✅ Show, lançamento salvo! ✨",
  ],
  savedReview: [
    "✅ Registrei! Só dá uma conferida no painel quando puder. 👀",
    "✅ Salvo! Recomendo revisar depois no dashboard. 🔍",
  ],
  discarded: [
    "❌ Beleza, descartei esse lançamento.",
    "❌ Ok, joguei fora. Sem problema! 👍",
    "❌ Descartado. Bora pro próximo!",
  ],
  valueEdited: [
    "Beleza, valor atualizado! 💰 Confere aí 👆",
    "Feito, novo valor no lugar! 💰",
    "Valor ajustado! 💰 Deu uma olhada? 👆",
  ],
  localEdited: [
    "Show, local ajustado! 📍 Confere aí 👆",
    "Prontinho, atualizei o local! 📍",
    "Feito, novo local salvo! 📍 👆",
  ],
  categoryEdited: [
    "Categoria ajustada! ✏️ 👍",
    "Feito, troquei a categoria! ✏️",
    "Prontinho, nova categoria no lugar! ✏️",
  ],
  editCancelled: [
    "Ok, edição cancelada. 👍",
    "Beleza, deixei como estava. 👍",
    "Cancelado! Sem stress. 🙂",
  ],
  notUnderstood: [
    'Não entendi 🤔 Envie uma despesa (ex.: "Mercado 50,00") ou me pergunte algo.',
    'Hmm, não peguei essa 🤔 Tenta "Uber 25,90" ou faça uma pergunta.',
  ],
};

/** Escolhe uma variação natural para o evento (aleatória, sem repetição garantida). */
export function pickHumanReply(event: HumanReplyEvent): string {
  const options = REPLIES[event];
  return options[Math.floor(Math.random() * options.length)] ?? options[0];
}
