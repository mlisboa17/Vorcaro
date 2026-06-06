# Nubank PJ

Coloque extratos **anonimizados** nesta pasta. Arquivos reais com dados sensíveis **não devem ser commitados**.

## Slots de formato (opcionais)

| Slot | Nome do arquivo |
|------|-----------------|
| PDF curto | `pdf-curto.pdf` |
| PDF longo | `pdf-longo.pdf` |
| OFX | `extrato.ofx` |
| CSV | `extrato.csv` |
| XLS | `extrato.xls` |
| XLSX | `extrato.xlsx` |

Formatos ausentes são registrados como **não disponível** na homologação — não é erro.

## Homologação

```bash
npm run homolog:real-banks
```
