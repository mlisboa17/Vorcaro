import "dotenv/config";
import { GeminiAiService } from "../src/modules/financial-inbox/infrastructure/services/gemini-ai.service";

async function main() {
  const svc = new GeminiAiService();
  const result = await svc.extract("gastei 50 reais no mercado hoje");
  console.log(
    JSON.stringify(
      {
        type: result.data.type,
        amount: result.data.amount,
        provider: result.metadata.provider,
        ms: result.metadata.processingMs,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("Gemini test failed:", err);
  process.exit(1);
});
