import { promises as fs } from "fs";
import * as path from "path";
import { OfxParser } from "../src/lib/bank-parsers/ofx/ofx-parser";

async function run() {
  console.log("=== Testing OFX Parser ===");
  const filePath = path.join(process.cwd(), "scripts", "mocks", "extrato.ofx");

  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    console.log("File loaded. Content length:", fileContent.length);

    const parser = new OfxParser();
    
    console.time("Parsing OFX");
    const result = parser.parse(fileContent);
    console.timeEnd("Parsing OFX");

    console.log("\n=== Parsing Result ===");
    console.log(`Bank: ${result.bank}`);
    console.log(`Account: ${result.account}`);
    console.log(`Confidence: ${result.confidence}`);
    console.log(`Warnings: ${result.warnings.join(", ")}`);
    console.log(`Transactions Found: ${result.transactions.length}`);

    result.transactions.forEach((t, i) => {
      console.log(`\n--- Transaction ${i + 1} ---`);
      console.log(`Date: ${t.date}`);
      console.log(`Amount: R$ ${t.amount} (${t.direction})`);
      console.log(`Memo: ${t.description}`);
      console.log(`FITID (Fingerprint): ${t.fingerprint}`);
    });

  } catch (error) {
    console.error("Test failed:", error);
  }
}

run();
