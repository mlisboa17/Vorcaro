import type { VorcaroIntent } from "@/modules/vorcaro/intent/domain/types/vorcaro-intent";

const ROBOTIC_HEADER_PATTERN = /\*\*FATO\*\*|\*\*IMPACTO\*\*|\*\*AÇÃO\*\*/gi;
const CONFIDENCE_PATTERN = /confian[cç]a\s*:?\s*\d+\s*%/gi;
const TECHNICAL_ENUM_PATTERN =
  /\b(DUPLICATE_CATEGORY|DUPLICATE_SUBCATEGORY|SUPPLIER_AS_CATEGORY|OVERLAPPING_CATEGORY|INCONSISTENT_NAMING|LOW_USAGE_CATEGORY|MERGE_SUGGESTION)\b/gi;
const BULK_COUNT_PATTERN = /\b\d+\s+(pontos|problemas|achados)\s+encontrados\b/gi;
const SEVERITY_TAG_PATTERN = /\[(Alta|Média|Baixa)\]\s*/gi;
const TECHNICAL_TITLE_PATTERN = /Fornecedor usado como categoria|Subcategoria duplicada/gi;

export type HumanizationResult = {
  text: string;
  applied: boolean;
};

export class VorcaroHumanizationGuard {
  sanitize(text: string, intent?: VorcaroIntent): HumanizationResult {
    let output = text.trim();
    let applied = false;

    const before = output;
    output = output.replace(ROBOTIC_HEADER_PATTERN, "");
    output = output.replace(CONFIDENCE_PATTERN, "");
    output = output.replace(TECHNICAL_ENUM_PATTERN, "");
    output = output.replace(BULK_COUNT_PATTERN, "alguns pontos de melhoria");
    output = output.replace(SEVERITY_TAG_PATTERN, "");
    output = output.replace(
      TECHNICAL_TITLE_PATTERN,
      "Alguns nomes parecem representar empresas ou canais de compra",
    );
    output = output.replace(/\n{3,}/g, "\n\n").trim();

    if (output !== before) {
      applied = true;
    }

    if (intent === "CATEGORY_AUDIT" && ROBOTIC_HEADER_PATTERN.test(before)) {
      applied = true;
    }

    return { text: output, applied };
  }
}
