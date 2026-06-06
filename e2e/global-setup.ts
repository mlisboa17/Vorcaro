import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export default async function globalSetup() {
  const jsonPath = join(process.cwd(), "scripts", "statement-layout-training-homologation-results.json");
  const mdPath = join(process.cwd(), "docs", "statement-layout-training-homologation-report.md");

  if (!existsSync(jsonPath) || !existsSync(mdPath)) {
    console.log("[e2e] Gerando relatório de homologação…");
    execSync("npm run homolog:layout-training", { stdio: "inherit", cwd: process.cwd() });
  }
}
