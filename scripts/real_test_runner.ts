import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();
import { parseImportFile } from "../src/lib/inbox/financial-import-pipeline";
import { TransactionExtractorService } from "../src/modules/ai/services/transaction-extractor.service";
import { CounterpartyMatcherService } from "../src/modules/integrations/services/counterparty-matcher.service";
import { prisma as db } from "../src/lib/prisma";

const TEST_DIR = path.join(process.cwd(), "real_test_files");
const RESULTS_FILE = path.join(process.cwd(), "REAL_TEST_RESULTS.json");
const LOG_FILE = path.join(process.cwd(), "REAL_TEST_LOG.md");

const extractorService = new TransactionExtractorService();
const matcherService = new CounterpartyMatcherService();

function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

async function runTests() {
  if (!fs.existsSync(TEST_DIR)) {
    console.log(`Directory ${TEST_DIR} does not exist.`);
    return;
  }

  const files = fs.readdirSync(TEST_DIR);
  if (files.length === 0) {
    console.log("No files found to test.");
    return;
  }

  const results: any[] = [];
  let logContent = "# REAL TEST LOG\n\n";

  for (const file of files) {
    if (file === ".gitkeep" || file === ".DS_Store") continue;
    
    console.log(`Testing file: ${file}`);
    const filePath = path.join(TEST_DIR, file);
    const ext = getExtension(file);
    const buffer = fs.readFileSync(filePath);

    let fileResult: any = {
      file,
      extension: ext,
      success: false,
      parsedItems: 0,
      errors: []
    };

    try {
      if (["pdf", "ofx", "csv", "xls", "xlsx"].includes(ext)) {
        logContent += `## Testing Document: ${file}\n`;
        const parsedLines = await parseImportFile({
          buffer,
          extension: ext as "ofx" | "csv" | "pdf" | "xls" | "xlsx",
          fileName: file,
        });
        
        fileResult.success = true;
        fileResult.parsedItems = parsedLines.length;
        fileResult.lines = parsedLines;

        logContent += `- **Status**: Success\n`;
        logContent += `- **Items extracted**: ${parsedLines.length}\n`;
        if (parsedLines.length > 0) {
          // Extrai o motor de contrapartes para o PRIMEIRO item
          const sample = parsedLines[0];
          logContent += `- **Sample item**: ${sample.rawContent}\n`;
          
          logContent += `  \n  **[Counterparty Matcher Test]**\n`;
          try {
            const extractedItem = await extractorService.extract(sample.rawContent);
            logContent += `  - **AI Extracted**: ${JSON.stringify(extractedItem)}\n`;
            
            const realUser = await db.user.findFirst();
            const userId = realUser?.id || "user-test";
            
            if (extractedItem.destination) {
              const matchResult = await matcherService.match(userId, extractedItem.destination as any);
              logContent += `  - **Match Result (Destination)**: ${JSON.stringify(matchResult)}\n`;
            } else if (extractedItem.origin) {
              const matchResult = await matcherService.match(userId, extractedItem.origin as any);
              logContent += `  - **Match Result (Origin)**: ${JSON.stringify(matchResult)}\n`;
            } else {
              logContent += `  - **No Origin/Destination extracted**\n`;
            }
          } catch(e: any) {
             logContent += `  - **Matcher Error**: ${e.message}\n`;
          }
          logContent += `\n`;
        }
      } else if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
        logContent += `## Testing Image/OCR: ${file}\n`;
        const extracted = await extractorService.extract(buffer);
        
        fileResult.success = true;
        fileResult.parsedItems = 1;
        fileResult.extraction = extracted;

        logContent += `- **Status**: Success\n`;
        logContent += `- **Extracted Data**: ${JSON.stringify(extracted)}\n\n`;
      } else {
        fileResult.errors.push(`Unsupported extension: ${ext}`);
        logContent += `## Testing Unknown File: ${file}\n- **Error**: Unsupported extension\n\n`;
      }
    } catch (e: any) {
      console.error(`Error processing ${file}:`, e.message);
      fileResult.errors.push(e.message);
      logContent += `## Error on ${file}\n- **Message**: ${e.message}\n\n`;
    }

    results.push(fileResult);
  }

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  fs.writeFileSync(LOG_FILE, logContent);
  console.log("Done! Check REAL_TEST_RESULTS.json and REAL_TEST_LOG.md");
}

runTests().catch(console.error);
