import crypto from "crypto";

export type ParsedInstallmentMarker = {
  numeroParcela: number;
  totalParcelas: number;
  raw: string;
  index: number;
};

export type InstallmentStructuralParseResult = {
  descricaoBase: string;
  numeroParcela: number;
  totalParcelas: number;
  hadInstallmentMarker: boolean;
};

const MAX_TOTAL_PARCELAS = 60;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function splitCamelCase(value: string): string {
  return value
    .replace(/([a-záéíóúãõâêôç])([A-ZÁÉÍÓÚÃÕÂÊÔÇ])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-záéíóúãõâêôç])/g, "$1 $2");
}

function isValidInstallmentPair(installment: number, total: number): boolean {
  return (
    Number.isFinite(installment) &&
    Number.isFinite(total) &&
    installment >= 1 &&
    total >= 1 &&
    installment <= total &&
    total <= MAX_TOTAL_PARCELAS
  );
}

/** Localiza marcadores `01/02`, `C05/05`, `OneHeal01/02`, `MARKETI01/12`. */
export function findInstallmentMarkers(text: string): ParsedInstallmentMarker[] {
  const candidates: ParsedInstallmentMarker[] = [];
  const slashPattern = /[Cc](\d{1,2})\/(\d{1,2})|(?<![Cc])(\d{1,2})\/(\d{1,2})/g;
  let match: RegExpExecArray | null;

  while ((match = slashPattern.exec(text)) !== null) {
    const withPrefix = match[1] != null && match[2] != null;
    const numeroParcela = Number(withPrefix ? match[1] : match[3]);
    const totalParcelas = Number(withPrefix ? match[2] : match[4]);
    if (!isValidInstallmentPair(numeroParcela, totalParcelas)) continue;

    candidates.push({
      raw: match[0],
      numeroParcela,
      totalParcelas,
      index: match.index,
    });
  }

  const gluedPattern = /([A-Za-zÀ-ÿ][\wÀ-ÿ]*?)(\d{1,2})\/(\d{1,2})(?!\d)/g;
  while ((match = gluedPattern.exec(text)) !== null) {
    const numeroParcela = Number(match[2]);
    const totalParcelas = Number(match[3]);
    if (!isValidInstallmentPair(numeroParcela, totalParcelas)) continue;

    const raw = `${match[2]}/${match[3]}`;
    const index = match.index + match[1]!.length;
    if (candidates.some((c) => c.index === index && c.raw === raw)) continue;

    candidates.push({ raw, numeroParcela, totalParcelas, index });
  }

  return candidates
    .filter((candidate) => {
      if (/^\d{1,2}\/\d{1,2}$/.test(candidate.raw)) {
        const prev = text[candidate.index - 1];
        if (prev === "C" || prev === "c") {
          return false;
        }
      }
      return true;
    })
    .sort((left, right) => left.index - right.index);
}

function purchaseDatePrefixLength(text: string): number {
  return text.match(/^(\d{2}\/\d{2})(?:\/\d{4})?\s+/)?.[0]?.length ?? 0;
}

export function pickInstallmentMarker(
  text: string,
  options?: { ignorePrefixLength?: number },
): ParsedInstallmentMarker | null {
  const ignoreBefore = options?.ignorePrefixLength ?? purchaseDatePrefixLength(text);
  const candidates = findInstallmentMarkers(text).filter((c) => c.index >= ignoreBefore);
  if (candidates.length === 0) return null;
  return candidates[candidates.length - 1] ?? null;
}

export function parseInstallmentStructure(description: string): InstallmentStructuralParseResult {
  const normalized = normalizeWhitespace(description);
  if (!normalized) {
    return {
      descricaoBase: "",
      numeroParcela: 1,
      totalParcelas: 1,
      hadInstallmentMarker: false,
    };
  }

  const marker = pickInstallmentMarker(normalized);
  if (!marker) {
    return {
      descricaoBase: normalizeWhitespace(splitCamelCase(normalized)),
      numeroParcela: 1,
      totalParcelas: 1,
      hadInstallmentMarker: false,
    };
  }

  const before = normalized.slice(0, marker.index).trim();
  const after = normalized.slice(marker.index + marker.raw.length).trim();
  const descricaoBase = normalizeWhitespace(`${before} ${after}`.trim());

  return {
    descricaoBase: descricaoBase || normalized,
    numeroParcela: marker.numeroParcela,
    totalParcelas: marker.totalParcelas,
    hadInstallmentMarker: true,
  };
}

export function normalizeInstallmentBaseDescription(description: string): string {
  return parseInstallmentStructure(description).descricaoBase;
}

export type InstallmentGroupKeyInput = {
  userId: string;
  cardId: string | null;
  descricaoBase: string;
  valorParcela: number;
  totalParcelas: number;
  primeiraParcelaAproximada: string;
};

/** Grupo determinístico — mesma compra parcelada gera o mesmo id. */
export function buildStableInstallmentGroupId(input: InstallmentGroupKeyInput): string {
  const payload = JSON.stringify({
    userId: input.userId,
    cardId: input.cardId ?? "",
    descricaoBase: normalizeInstallmentBaseDescription(input.descricaoBase).toLowerCase(),
    valorParcela: Number(input.valorParcela.toFixed(2)),
    totalParcelas: input.totalParcelas,
    primeiraParcela: input.primeiraParcelaAproximada,
  });

  const hash = crypto.createHash("sha256").update(payload).digest("hex").slice(0, 24);
  return `ig_${hash}`;
}

export type InstallmentDedupKeyInput = {
  cardId: string | null;
  descricaoBase: string;
  numeroParcela: number;
  totalParcelas: number;
  valor: number;
  date: string;
};

export function buildInstallmentDedupKey(input: InstallmentDedupKeyInput): string {
  const raw = JSON.stringify({
    cardId: input.cardId ?? "",
    descricaoBase: normalizeInstallmentBaseDescription(input.descricaoBase).toLowerCase(),
    numeroParcela: input.numeroParcela,
    totalParcelas: input.totalParcelas,
    valor: Number(input.valor.toFixed(2)),
    date: input.date,
  });

  return crypto.createHash("sha256").update(raw).digest("hex");
}
