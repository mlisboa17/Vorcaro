export interface FieldConfidence {
  value: unknown;
  score: number;
  source: "ocr" | "llm" | "rule" | "pattern" | "instrument" | "user";
}

export interface ExtractionConfidence {
  overall: number;
  fields: Record<string, FieldConfidence>;
}
