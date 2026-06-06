import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatInventoryMarkdown,
  mergeInventoryIntoDoc,
  scanBankPdfInventory,
} from "../src/lib/bank-parsers/homologation/bank-pdf-inventory.runner";

const FIXTURES_ROOT = join(process.cwd(), "tests", "fixtures", "bank-statements", "real");
const INVENTORY_DOC = join(process.cwd(), "docs", "bank-layout-inventory.md");

async function main() {
  const generatedAt = new Date().toISOString();
  const rows = await scanBankPdfInventory(FIXTURES_ROOT);
  const section = formatInventoryMarkdown(rows, generatedAt);
  const existing = readFileSync(INVENTORY_DOC, "utf8");
  writeFileSync(INVENTORY_DOC, mergeInventoryIntoDoc(existing, section), "utf8");

  const pdfCount = rows.filter((r) => r.fileType === "pdf").length;
  console.log(JSON.stringify({ total: rows.length, pdfs: pdfCount, updated: INVENTORY_DOC }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
