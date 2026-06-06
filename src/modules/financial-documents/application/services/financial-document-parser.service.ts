import { parseFinancialDocumentText } from "../../domain/services/financial-document-parser.service";

export class FinancialDocumentParserService {
  parseText(text: string) {
    return parseFinancialDocumentText(text);
  }
}
