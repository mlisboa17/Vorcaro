import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import type { BankFixtureMeta, BankLayoutSource } from "./bank-layout.types";
import {
  detectBankLayoutSource,
  inferRequiresOcr,
} from "./bank-layout-source.detector";
import { isHomologationFixtureFile, loadFixtureContent } from "./bank-fixture-loader";

export type BankPdfInventoryRow = {
  filePath: string;
  bankId: string;
  profile: string;
  fileType: "pdf" | "txt" | "json";
  pageCount: number | null;
  passwordProtected: boolean;
  requiresOcr: boolean;
  source: BankLayoutSource;
  homologationStatus: string;
  notes: string;
};

const BANK_IDS = new Set([
  "bb",
  "bradesco",
  "itau",
  "santander",
  "inter",
  "sicredi",
  "sicoob",
  "c6",
  "pagbank",
]);

function metaPathFor(filePath: string): string {
  return filePath.replace(/\.(txt|pdf|json)$/i, ".meta.json");
}

function loadMetaSidecar(filePath: string): BankFixtureMeta {
  const sidecar = metaPathFor(filePath);
  if (!existsSync(sidecar)) return {};
  try {
    return JSON.parse(readFileSync(sidecar, "utf8")) as BankFixtureMeta;
  } catch {
    return {};
  }
}

function inferBankProfile(filePath: string): { bankId: string; profile: string } {
  const parts = filePath.replace(/\\/g, "/").split("/");
  const bankIdx = parts.findIndex((p) => BANK_IDS.has(p));
  if (bankIdx < 0) return { bankId: "unknown", profile: "UNKNOWN" };
  const profilePart = parts[bankIdx + 1]?.toLowerCase();
  return {
    bankId: parts[bankIdx]!,
    profile: profilePart === "pf" ? "PF" : profilePart === "pj" ? "PJ" : "UNKNOWN",
  };
}

async function getPdfPageCount(filePath: string): Promise<number | null> {
  try {
    const { getDocumentProxy } = await import("unpdf");
    const buffer = readFileSync(filePath);
    const doc = await getDocumentProxy(new Uint8Array(buffer));
    return doc.numPages;
  } catch {
    return null;
  }
}

function walkInventoryFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkInventoryFiles(full, acc);
    } else if (isHomologationFixtureFile(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

export async function scanBankPdfInventory(fixturesRoot: string): Promise<BankPdfInventoryRow[]> {
  const files = walkInventoryFiles(fixturesRoot);
  const rows: BankPdfInventoryRow[] = [];

  for (const filePath of files) {
    const relativePath = relative(fixturesRoot, filePath).replace(/\\/g, "/");
    const meta = loadMetaSidecar(filePath);
    const inferred = inferBankProfile(relativePath);
    const bankId = meta.bankId ?? inferred.bankId;
    const profile = meta.profile ?? inferred.profile;
    const isPdf = /\.pdf$/i.test(filePath);
    const fileType: BankPdfInventoryRow["fileType"] = isPdf
      ? "pdf"
      : /\.json$/i.test(filePath)
        ? "json"
        : "txt";

    let pageCount: number | null = null;
    let text = "";
    let passwordProtected = Boolean(meta.passwordProtected);

    if (isPdf) {
      pageCount = await getPdfPageCount(filePath);
      const loaded = await loadFixtureContent(filePath);
      text = loaded.text;
      passwordProtected = passwordProtected || loaded.passwordRequired;
    } else if (/\.txt$/i.test(filePath)) {
      text = readFileSync(filePath, "utf8");
      pageCount = 1;
    }

    const source = detectBankLayoutSource(text, meta.source);
    const requiresOcr = isPdf
      ? text.trim().length < 80 && !passwordProtected
      : inferRequiresOcr(text, source);

    rows.push({
      filePath: relativePath,
      bankId,
      profile,
      fileType,
      pageCount,
      passwordProtected,
      requiresOcr,
      source,
      homologationStatus: meta.homologationStatus ?? "NAO_HOMOLOGADO",
      notes: meta.notes ?? (fileType === "txt" ? "Bootstrap sintético — aguardando PDF real" : ""),
    });
  }

  return rows.sort((a, b) => a.filePath.localeCompare(b.filePath));
}

export function formatInventoryMarkdown(rows: BankPdfInventoryRow[], generatedAt: string): string {
  const pdfCount = rows.filter((r) => r.fileType === "pdf").length;
  const txtCount = rows.filter((r) => r.fileType === "txt").length;

  const lines = [
    "## Inventário automático de fixtures",
    "",
    `Atualizado em: ${generatedAt}`,
    "",
    `- **Total arquivos:** ${rows.length}`,
    `- **PDFs reais (.pdf):** ${pdfCount}`,
    `- **Texto derivado (.txt):** ${txtCount}`,
    "",
    "| Arquivo | Banco | Perfil | Tipo | Páginas | Protegido? | OCR? | Canal | Status | Observações |",
    "|---------|-------|--------|------|---------|------------|------|-------|--------|-------------|",
    ...rows.map((row) => {
      const pages = row.pageCount ?? "—";
      const prot = row.passwordProtected ? "Sim" : "Não";
      const ocr = row.requiresOcr ? "Sim" : "Não";
      return `| \`${row.filePath}\` | ${row.bankId} | ${row.profile} | ${row.fileType} | ${pages} | ${prot} | ${ocr} | ${row.source} | ${row.homologationStatus} | ${row.notes || "—"} |`;
    }),
    "",
  ];

  return lines.join("\n");
}

export function mergeInventoryIntoDoc(existingDoc: string, inventorySection: string): string {
  const marker = "## Inventário automático de fixtures";
  const idx = existingDoc.indexOf(marker);
  if (idx < 0) {
    return `${existingDoc.trim()}\n\n${inventorySection}`;
  }
  const before = existingDoc.slice(0, idx).trimEnd();
  const afterIdx = existingDoc.indexOf("\n## ", idx + marker.length);
  const after = afterIdx >= 0 ? existingDoc.slice(afterIdx).trimStart() : "";
  return after ? `${before}\n\n${inventorySection}\n${after}` : `${before}\n\n${inventorySection}`;
}
