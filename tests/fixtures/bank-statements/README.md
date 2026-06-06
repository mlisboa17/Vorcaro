# Fixtures de extratos bancários (Sprint 15.2.1)

Coloque PDFs ou arquivos `.txt` com texto extraído nativamente (pdfjs) nesta árvore:

```
{banco}/{pf|pj}/arquivo.txt
```

Bancos homologados: `bb`, `bradesco`, `itau`, `santander`, `caixa`, `sicredi`, `sicoob`, `inter`

**Importante:** não commitar PDFs com dados reais de clientes. Use arquivos anonimizados ou `.txt` derivados de OCR interno.

Executar homologação:

```bash
npx tsx scripts/sprint-15.2.1-bank-parser-homologation.ts
```

Os fixtures `.txt` incluídos são sintéticos baseados em layouts reais anonimizados.
