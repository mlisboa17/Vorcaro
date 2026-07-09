import type { ExtractedBankStatement, ExtractedBankStatementTransaction } from "../bank-statement-parser.types";

export class OfxParser {
  /**
   * Parse an OFX string into an ExtractedBankStatement object
   */
  public parse(ofxContent: string): ExtractedBankStatement {
    const warnings: string[] = [];

    // Clean up carriage returns and standardize newlines
    const content = ofxContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    const bankIdMatch = content.match(/<BANKID>([^<]+)/);
    const bankId = bankIdMatch ? bankIdMatch[1].trim() : "UNKNOWN";

    const acctIdMatch = content.match(/<ACCTID>([^<]+)/);
    const acctId = acctIdMatch ? acctIdMatch[1].trim() : undefined;

    const transactions: ExtractedBankStatementTransaction[] = [];

    // Extract all <STMTTRN> blocks
    // Note: OFX 1.0.2 is SGML and may not have closing tags.
    // We split by <STMTTRN> to iterate over transactions
    const stmtBlocks = content.split(/<STMTTRN>/i).slice(1); // skip the header part

    for (const block of stmtBlocks) {
      // Find the end of the transaction block. It either ends with </STMTTRN> or the next tag that logically closes it.
      // For safety, we just look for specific inner tags within the block text before the next </STMTTRN> or next tag.
      const txnBlock = block.split(/<\/STMTTRN>/i)[0];

      const dtPostedMatch = txnBlock.match(/<DTPOSTED>([^<\n]+)/i);
      const trnAmtMatch = txnBlock.match(/<TRNAMT>([^<\n]+)/i);
      const fitIdMatch = txnBlock.match(/<FITID>([^<\n]+)/i);
      const memoMatch = txnBlock.match(/<MEMO>([^<\n]+)/i);

      if (!dtPostedMatch || !trnAmtMatch) {
        warnings.push(`Skipped a transaction block missing DTPOSTED or TRNAMT. Raw: ${txnBlock.slice(0, 50)}...`);
        continue;
      }

      const dtPostedStr = dtPostedMatch[1].trim();
      const trnAmtStr = trnAmtMatch[1].trim();
      const fitId = fitIdMatch ? fitIdMatch[1].trim() : undefined;
      let memo = memoMatch ? memoMatch[1].trim() : "Transação";

      const parsedDate = this.parseOfxDate(dtPostedStr);
      if (!parsedDate) {
        warnings.push(`Invalid DTPOSTED date format: ${dtPostedStr}`);
        continue;
      }

      const amount = parseFloat(trnAmtStr);
      if (isNaN(amount)) {
        warnings.push(`Invalid TRNAMT format: ${trnAmtStr}`);
        continue;
      }

      const direction = amount >= 0 ? "INCOME" : "EXPENSE";

      transactions.push({
        date: parsedDate,
        description: memo,
        amount: Math.abs(amount),
        direction,
        fingerprint: fitId, // We use fingerprint field to hold the FITID mapping for deduplication
        rawLine: txnBlock.replace(/\n/g, " ").trim(),
        confidence: 1.0, // OFX is structured, so confidence is high
        warnings: [],
      });
    }

    return {
      bank: bankId,
      profile: "UNKNOWN",
      account: acctId,
      transactions,
      confidence: 1.0,
      warnings,
    };
  }

  /**
   * Parse OFX Date format: YYYYMMDDHHMMSS.XXX with a trailing timezone tag like "-3:BRT", or YYYYMMDD
   */
  private parseOfxDate(ofxDate: string): string | null {
    try {
      // Basic match for YYYYMMDD
      const regex = /^(\d{4})(\d{2})(\d{2})(?:(\d{2})(\d{2})(\d{2}))?/;
      const match = ofxDate.match(regex);
      if (!match) return null;

      const year = match[1];
      const month = match[2];
      const day = match[3];

      // Time parts are optional
      const hour = match[4] || "12"; // Default to noon if no time provided to avoid timezone shifting to previous day
      const minute = match[5] || "00";
      const second = match[6] || "00";

      // Look for a bracketed timezone offset, e.g. "-3:BRT" or "-03:EST"
      const tzMatch = ofxDate.match(/\[([+-]?\d+)(?::[^\]]+)?\]/);
      let tzOffsetHour = 0;
      if (tzMatch) {
        tzOffsetHour = parseInt(tzMatch[1], 10);
      } else {
        // If no timezone is specified, OFX usually defaults to local time of the bank.
        // We'll assume UTC-3 (BRT) as a safe default for Brazilian banks if omitted,
        // or we could just treat it as UTC. We'll use -3 for now since it's a Brazilian system.
        tzOffsetHour = -3;
      }

      // Construct an ISO date string
      // Format: YYYY-MM-DDTHH:mm:ss±hh:mm
      const tzSign = tzOffsetHour >= 0 ? "+" : "-";
      const tzAbs = Math.abs(tzOffsetHour).toString().padStart(2, "0");
      const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}${tzSign}${tzAbs}:00`;

      // We want to return a normalized ISO string
      const dateObj = new Date(isoString);
      if (isNaN(dateObj.getTime())) return null;

      return dateObj.toISOString(); // Returns UTC string YYYY-MM-DDTHH:mm:ss.sssZ
    } catch {
      return null;
    }
  }
}
