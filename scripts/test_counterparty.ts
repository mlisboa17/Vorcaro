import dotenv from "dotenv";
dotenv.config();

import { TransactionExtractorService } from "../src/modules/ai/services/transaction-extractor.service";
import { CounterpartyMatcherService } from "../src/modules/integrations/services/counterparty-matcher.service";
import { prisma as db } from "../src/lib/prisma";

async function runCounterpartyTest() {
  console.log("=== INICIANDO TESTE DO MOTOR DE CONTRAPARTES ===\n");
  
  const extractor = new TransactionExtractorService();
  const matcher = new CounterpartyMatcherService();
  
  let testUserId = "user-test-counterparty-123";
  const realUser = await db.user.findFirst();
  if (realUser) {
    testUserId = realUser.id;
  } else {
    // Create one if DB is empty
    const newUser = await db.user.create({
      data: {
        email: "test_counterparty@example.com",
        name: "Test User",
      }
    });
    testUserId = newUser.id;
  }

  // 1. Simular um comprovante de transferência do WhatsApp
  const receiptText = `
  COMPROVANTE DE TRANSFERÊNCIA
  Data: 14/06/2026
  Valor: R$ 450,00
  Destinatário: PIX POSTO IPIRANGA LTDA.
  CNPJ/CPF: 12.345.678/0001-99
  Remetente: MARCIO GUSTAVO LISBOA DE LIMA
  Instituição: Banco do Brasil
  `;

  console.log("1. Texto Sujo de Entrada:");
  console.log(receiptText);
  console.log("\n2. Acionando Gemini Extractor (Zod)...");

  try {
    const extracted = await extractor.extract(receiptText);
    console.log("✔ Resultado da Extração:");
    console.log(JSON.stringify(extracted, null, 2));

    if (extracted.destination) {
      console.log("\n3. Acionando Motor de Matching (Destino)...");
      const matchResult = await matcher.match(testUserId, extracted.destination as any);
      console.log("✔ Resultado do Matching:");
      console.log(JSON.stringify(matchResult, null, 2));
      
      console.log("\n4. Segunda Extração - Aprendizado (Variação de Nome)");
      const secondReceipt = `
      PAGAMENTO REALIZADO
      Destino: POSTO IPIRANGA FILIAL
      CNPJ: 12.345.678/0001-99
      Valor: R$ 100,00
      `;
      const extracted2 = await extractor.extract(secondReceipt);
      if (extracted2.destination) {
         console.log("✔ Segunda Extração:");
         console.log(JSON.stringify(extracted2.destination, null, 2));
         const matchResult2 = await matcher.match(testUserId, extracted2.destination as any);
         console.log("✔ Segundo Matching (Deve ter score 100 por CNPJ e criar um novo Alias automaticamente):");
         console.log(JSON.stringify(matchResult2, null, 2));
      }
    } else {
      console.log("❌ O Gemini não extraiu o 'destination'.");
    }

  } catch (err: any) {
    console.error("Erro no teste:", err.message);
  }
}

runCounterpartyTest().catch(console.error);
