# Biblioteca de PDFs reais — Sprint 15.2.2

Estrutura por banco e perfil:

```
real/
  bb/pf          bb/pj
  bradesco/pf    bradesco/pj
  itau/pf        itau/pj
  santander/pf   santander/pj
  inter/pf       inter/pj
  sicredi/pf     sicredi/pj
  sicoob/pf      sicoob/pj
  c6/pf          c6/pj
  pagbank/pf     pagbank/pj
  _samples/      (PIX, OCR, parcelas, extratos grandes — não entram na taxa principal)
```

## Adicionar PDF real

1. Copie o PDF anonimizado para `{banco}/{pf|pj}/nome-descritivo.pdf`
2. Crie `nome-descritivo.meta.json` com canal, tipo e senha se necessário
3. **Não commite PDFs com dados reais de clientes** — preferir massa interna ou CI local

Alternativa para CI: use `.txt` com texto extraído nativamente (pdfjs) + `.meta.json`.

## Bootstrap

```bash
npx tsx scripts/bootstrap-sprint-15.2.2-fixtures.ts
```

Copia fixtures sintéticos 15.2.1 e cria sidecars.

## Homologação

```bash
npx tsx scripts/sprint-15.2.2-real-pdf-homologation.ts
```

Gera `docs/sprint-15.2.2-real-pdf-homologation-report.md`.
