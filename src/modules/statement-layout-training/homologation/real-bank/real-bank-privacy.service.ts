const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const CNPJ_PATTERN = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const ACCOUNT_PATTERN = /\b(ag[eê]ncia|conta|ag\.?|cc\.?)\s*[:\s]*[\d\-Xx./]+/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

export function maskSensitiveText(text: string): string {
  return text
    .replace(CPF_PATTERN, "***.***.***-**")
    .replace(CNPJ_PATTERN, "**.***.***/****-**")
    .replace(EMAIL_PATTERN, "***@***.***")
    .replace(ACCOUNT_PATTERN, (match) => match.replace(/[\d\-Xx./]+/g, "****"));
}

export function maskFileName(fileName: string): string {
  return fileName.replace(CPF_PATTERN, "anon").replace(CNPJ_PATTERN, "anon");
}
