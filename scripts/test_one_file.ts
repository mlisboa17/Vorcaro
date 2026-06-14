import path from "path";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

import { parseImportFile } from "../src/lib/inbox/financial-import-pipeline";
import { TransactionExtractorService } from "../src/modules/ai/services/transaction-extractor.service";
import { CounterpartyMatcherService } from "../src/modules/integrations/services/counterparty-matcher.service";
import { prisma as db } from "../src/lib/prisma";

async function runSingleTest() {
  const filePath = path.join(process.cwd(), "real_test_files", "ExtratoContaCorrente_BancoBrasil_PJ.ofx");
  const buffer = fs.readFileSync(filePath);
  
  console.log("1. Parsing OFX...");
  const parsedLines = await parseImportFile({
    buffer,
    extension: "ofx",
    fileName: "ExtratoContaCorrente_BancoBrasil_PJ.ofx"
  });
  
  console.log(`- Lançamentos extraídos do extrato: ${parsedLines.length}`);
  
  // Pegar uma linha interessante (ex: PIX)
  const pixLine = parsedLines.find(l => l.description?.toUpperCase().includes("PIX")) || parsedLines[0];
  
  console.log("\n2. Mandando Lançamento Bruto pro Gemini:");
  console.log(pixLine.rawContent);
  
  const extractorService = new TransactionExtractorService();
  const matcherService = new CounterpartyMatcherService();
  
  const extractedItem = await extractorService.extract(pixLine.rawContent);
  console.log("\n3. Resposta Estruturada do AI:");
  console.log(JSON.stringify(extractedItem, null, 2));
  
  const realUser = await db.user.findFirst();
  const userId = realUser?.id || "user-test";
  
  if (extractedItem.destination) {
    console.log("\n4. Acionando Motor de Matching (Destino)...");
    const matchResult = await matcherService.match(userId, extractedItem.destination as any);
    console.log(JSON.stringify(matchResult, null, 2));
  } else if (extractedItem.origin) {
    console.log("\n4. Acionando Motor de Matching (Origem)...");
    const matchResult = await matcherService.match(userId, extractedItem.origin as any);
    console.log(JSON.stringify(matchResult, null, 2));
  } else {
    console.log("\n❌ O AI não identificou contraparte neste lançamento.");
  }
}

runSingleTest().catch(console.error);
