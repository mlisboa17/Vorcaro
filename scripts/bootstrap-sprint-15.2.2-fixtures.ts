/**
 * Copia fixtures sintéticos 15.2.1 para real/ com sidecar .meta.json (bootstrap 15.2.2).
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { generateLargeBankStatement } from "../src/lib/bank-parsers/homologation/large-statement.generator";

const SYNTHETIC_ROOT = join(process.cwd(), "tests", "fixtures", "bank-statements");
const REAL_ROOT = join(SYNTHETIC_ROOT, "real");

const BANKS = ["bb", "bradesco", "itau", "santander", "inter", "sicredi", "sicoob", "c6", "pagbank"];
const PROFILES = ["pf", "pj"] as const;

const C6_PF = `C6 Bank
Extrato bancário — Internet Banking
Titular: MARIA TESTE
CPF: 111.222.333-44
Conta Corrente 88888-8
03/06/2026 PIX RECEBIDO Salario 3.500,00
04/06/2026 COMPRA CARTAO LOJA 120,00
05/06/2026 TED ENVIADA Fornecedor 200,00
`;

const C6_PJ = `C6 Bank
Extrato Empresarial — Internet Banking
Razão Social: EMPRESA C6 LTDA
CNPJ: 11.222.333/0001-44
Conta PJ 77777-7
03/06/2026 PIX RECEBIDO Cliente 5.000,00
04/06/2026 PAGAMENTO FORNECEDOR 1.200,00
`;

const PAGBANK_PF = `PagBank PagSeguro
Extrato de movimentações — App Android
Titular: JOAO TESTE
CPF: 222.333.444-55
03/06/2026 PIX RECEBIDO Venda 250,00
04/06/2026 TRANSFERENCIA ENVIADA 80,00
05/06/2026 PIX ENVIADO Mercado 45,00
`;

const PAGBANK_PJ = `PagBank PagSeguro
Extrato Empresarial — Canal Internet
Razão Social: LOJA PAG LTDA
CNPJ: 22.333.444/0001-55
03/06/2026 PIX RECEBIDO Venda Online 1.800,00
04/06/2026 TARIFA 12,90
`;

function ensureDir(path: string) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function writeMeta(targetDir: string, baseName: string, meta: Record<string, unknown>) {
  writeFileSync(join(targetDir, `${baseName}.meta.json`), JSON.stringify(meta, null, 2), "utf8");
}

function copySyntheticTree() {
  for (const bank of BANKS) {
    const bankDir = join(SYNTHETIC_ROOT, bank);
    if (!existsSync(bankDir)) continue;

    for (const profile of PROFILES) {
      const profileDir = join(bankDir, profile);
      if (!existsSync(profileDir) || !statSync(profileDir).isDirectory()) continue;

      const destDir = join(REAL_ROOT, bank, profile);
      ensureDir(destDir);

      for (const file of readdirSync(profileDir)) {
        if (!/\.txt$/i.test(file)) continue;
        const src = join(profileDir, file);
        const dest = join(destDir, file);
        copyFileSync(src, dest);

        const base = basename(file, ".txt");
        writeMeta(destDir, base, {
          source: "WEB",
          documentType: "EXTRATO",
          passwordProtected: false,
          homologationStatus: "PARCIAL",
          notes: "Fixture sintético anonimizado — substituir por PDF real interno",
        });
      }
    }
  }
}

function writeExtraBankFixtures() {
  const extras: Array<{ bank: string; profile: string; name: string; text: string; source: string }> = [
    { bank: "c6", profile: "pf", name: "extrato-pf", text: C6_PF, source: "WEB" },
    { bank: "c6", profile: "pj", name: "extrato-pj", text: C6_PJ, source: "WEB" },
    { bank: "pagbank", profile: "pf", name: "extrato-pf", text: PAGBANK_PF, source: "ANDROID" },
    { bank: "pagbank", profile: "pj", name: "extrato-pj", text: PAGBANK_PJ, source: "WEB" },
  ];

  for (const item of extras) {
    const destDir = join(REAL_ROOT, item.bank, item.profile);
    ensureDir(destDir);
    const txtPath = join(destDir, `${item.name}.txt`);
    if (!existsSync(txtPath)) {
      writeFileSync(txtPath, item.text.trim() + "\n", "utf8");
    }
    writeMeta(destDir, item.name, {
      source: item.source,
      documentType: "EXTRATO",
      passwordProtected: false,
      homologationStatus: "PARCIAL",
      notes: "Fixture sintético anonimizado — substituir por PDF real interno",
    });
  }
}

function writeSamples() {
  const samplesRoot = join(REAL_ROOT, "_samples");
  const pixDir = join(samplesRoot, "pix");
  const ocrDir = join(samplesRoot, "ocr");
  const largeDir = join(samplesRoot, "large");
  const installmentsDir = join(samplesRoot, "installments");

  for (const dir of [pixDir, ocrDir, largeDir, installmentsDir]) ensureDir(dir);

  const pixText = `
Comprovante PIX
Transferência enviada
Banco Bradesco — App iPhone
Valor R$ 150,00
Destinatário: FORNECEDOR XYZ
Data 04/06/2026 14:32
`.trim();

  writeFileSync(join(pixDir, "comprovante-pix-ios.txt"), pixText + "\n", "utf8");
  writeMeta(pixDir, "comprovante-pix-ios", {
    bankId: "bradesco",
    profile: "PF",
    source: "IOS",
    documentType: "PIX",
    minTransactions: 0,
    homologationStatus: "NAO_HOMOLOGADO",
  });

  const scannedText = "[ocr fallback] Bradesco Extrato escaneado baixa qualidade PIX 100,00";
  writeFileSync(join(ocrDir, "extrato-scanned.txt"), scannedText + "\n", "utf8");
  writeMeta(ocrDir, "extrato-scanned", {
    bankId: "bradesco",
    profile: "PF",
    source: "SCANNED",
    documentType: "EXTRATO",
    homologationStatus: "NAO_HOMOLOGADO",
  });

  const photoText = "[ocr fallback] foto comprovante mercado 89,90";
  writeFileSync(join(ocrDir, "foto-comprovante.txt"), photoText + "\n", "utf8");
  writeMeta(ocrDir, "foto-comprovante", {
    source: "SCANNED",
    documentType: "PIX",
    minTransactions: 0,
    homologationStatus: "NAO_HOMOLOGADO",
  });

  for (const count of [100, 300, 1000]) {
    const text = generateLargeBankStatement(count);
    const name = `extrato-${count}-linhas`;
    writeFileSync(join(largeDir, `${name}.txt`), text + "\n", "utf8");
    writeMeta(largeDir, name, {
      bankId: "bradesco",
      profile: "PJ",
      source: "WEB",
      documentType: "EXTRATO",
      minTransactions: count - 5,
      homologationStatus: "PARCIAL",
      notes: `Stress test ${count} linhas`,
    });
  }

  const installmentLines = [
    "03/06 LOJA ABC C02/12 SAO PAULO 120,00",
    "04/06 MERCADO C03/10 CURITIBA 89,90",
    "05/06 POSTO XYZ 04/24 250,00",
    "06/06 LOJA DEF 05/24 BELO HORIZONTE 199,00",
  ];
  writeFileSync(join(installmentsDir, "parcelas-fatura.txt"), installmentLines.join("\n") + "\n", "utf8");
  writeMeta(installmentsDir, "parcelas-fatura", {
    bankId: "bradesco",
    profile: "PF",
    documentType: "FATURA",
    minTransactions: 0,
    homologationStatus: "PARCIAL",
  });
}

ensureDir(REAL_ROOT);
copySyntheticTree();
writeExtraBankFixtures();
writeSamples();

console.log(`Fixtures real/ prontos em ${relative(process.cwd(), REAL_ROOT)}`);
