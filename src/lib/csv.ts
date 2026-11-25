export const CSV_MAX_BYTES = 2 * 1024 * 1024;
export const CSV_MAX_ROWS = 500;

export interface ParsedCsvRow {
  rowNumber: number;
  raw: Record<string, string>;
  normalized: Record<string, string>;
}

export interface ParsedCsvResult {
  headers: string[];
  rows: ParsedCsvRow[];
  error?: string;
}

export type CsvCellValue = string | number | boolean | null | undefined;

/**
 * Normalizes a CSV header name by trimming, lowercasing, and stripping spaces, underscores, and hyphens.
 */
export function normalizeCsvHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

interface RawCsvRecord {
  rowNumber: number;
  fields: string[];
}

/**
 * Parses RFC 4180 CSV text into structured rows with 1-based line numbers (header = 1, first data row = 2).
 * Strips UTF-8 BOM, supports CRLF/LF/CR, quoted commas/newlines/escaped quotes, skips blank lines,
 * and enforces CSV_MAX_BYTES and CSV_MAX_ROWS.
 */
export function parseCsv(text: string): ParsedCsvResult {
  if (typeof text !== "string") {
    return { headers: [], rows: [], error: "Invalid CSV input." };
  }

  const byteLength = new TextEncoder().encode(text).length;
  if (byteLength > CSV_MAX_BYTES) {
    return {
      headers: [],
      rows: [],
      error: `CSV exceeds the maximum file size of ${Math.floor(CSV_MAX_BYTES / (1024 * 1024))} MB.`,
    };
  }

  const cleanText = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (cleanText.trim().length === 0) {
    return { headers: [], rows: [], error: "CSV file is empty." };
  }

  const records: RawCsvRecord[] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let justClosedQuote = false;
  let currentLine = 1;
  let rowStartLine = 1;

  const pushCurrentRecord = () => {
    currentRow.push(currentField);
    const isBlank = currentRow.every((cell) => cell.trim() === "");
    if (!isBlank) {
      records.push({
        rowNumber: rowStartLine,
        fields: currentRow,
      });
    }
    currentRow = [];
    currentField = "";
    justClosedQuote = false;
  };

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];

    if (inQuotes) {
      if (ch === '"') {
        if (cleanText[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
          justClosedQuote = true;
        }
      } else if (ch === "\r") {
        if (cleanText[i + 1] === "\n") {
          i++;
        }
        currentField += "\n";
        currentLine++;
      } else if (ch === "\n") {
        currentField += "\n";
        currentLine++;
      } else {
        currentField += ch;
      }
      continue;
    }

    if (justClosedQuote) {
      if (ch === ",") {
        currentRow.push(currentField);
        currentField = "";
        justClosedQuote = false;
        continue;
      }
      if (ch === "\r" || ch === "\n") {
        if (ch === "\r" && cleanText[i + 1] === "\n") {
          i++;
        }
        pushCurrentRecord();
        currentLine++;
        rowStartLine = currentLine;
        continue;
      }
      if (ch === " " || ch === "\t") {
        continue;
      }
      return {
        headers: [],
        rows: [],
        error: `Malformed CSV on line ${currentLine}: unexpected character after closing quote.`,
      };
    }

    if (ch === '"' && currentField.length === 0) {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && cleanText[i + 1] === "\n") {
        i++;
      }
      pushCurrentRecord();
      currentLine++;
      rowStartLine = currentLine;
      continue;
    }

    currentField += ch;
  }

  if (inQuotes) {
    return {
      headers: [],
      rows: [],
      error: `Malformed CSV: unclosed quoted field starting on line ${rowStartLine}.`,
    };
  }

  if (currentField.length > 0 || currentRow.length > 0 || justClosedQuote) {
    pushCurrentRecord();
  }

  if (records.length === 0) {
    return { headers: [], rows: [], error: "CSV file is empty." };
  }

  const headers = records[0].fields.map((h) => h.trim());
  if (headers.length === 0 || headers.every((h) => h === "")) {
    return { headers: [], rows: [], error: "CSV header row is empty." };
  }

  const dataRecords = records.slice(1);
  if (dataRecords.length === 0) {
    return {
      headers,
      rows: [],
      error: "CSV contains headers only and no data rows.",
    };
  }

  if (dataRecords.length > CSV_MAX_ROWS) {
    return {
      headers,
      rows: [],
      error: `CSV exceeds maximum limit of ${CSV_MAX_ROWS} rows (found ${dataRecords.length}).`,
    };
  }

  const rows: ParsedCsvRow[] = dataRecords.map((rec) => {
    const raw: Record<string, string> = {};
    const normalized: Record<string, string> = {};

    for (let colIdx = 0; colIdx < headers.length; colIdx++) {
      const header = headers[colIdx];
      if (!header) continue;
      const val = (rec.fields[colIdx] ?? "").trim();
      raw[header] = val;
      const normKey = normalizeCsvHeader(header);
      if (normKey) {
        normalized[normKey] = val;
      }
    }

    return {
      rowNumber: rec.rowNumber,
      raw,
      normalized,
    };
  });

  return { headers, rows };
}

/**
 * Picks the first non-empty field value from a parsed CSV row matching any of the provided header aliases.
 */
export function pickCsvField(row: ParsedCsvRow, aliases: readonly string[]): string {
  for (const alias of aliases) {
    const directVal = row.raw[alias];
    if (directVal !== undefined && directVal.trim() !== "") {
      return directVal.trim();
    }
    const normVal = row.normalized[normalizeCsvHeader(alias)];
    if (normVal !== undefined && normVal.trim() !== "") {
      return normVal.trim();
    }
  }
  return "";
}

/**
 * Neutralizes leading formula-injection triggers (=, @, unsafe +/- formulas, tabs/CR)
 * while preserving numeric negatives (e.g. -120.50) and international phone numbers (e.g. +92 300 1234567).
 */
function neutralizeCsvFormula(value: string): string {
  if (value.length === 0) return value;

  const firstChar = value[0];
  if (firstChar === "\t" || firstChar === "\r") {
    return `'${value}`;
  }

  const trimmedStart = value.trimStart();
  if (trimmedStart.startsWith("=") || trimmedStart.startsWith("@")) {
    return `'${value}`;
  }

  if (trimmedStart.startsWith("+")) {
    const isSafePhoneOrNumber = /^\+\d[\d\s.-]*(?:\(\d+\))?[\d\s.-]*$/.test(trimmedStart.trim());
    return isSafePhoneOrNumber ? value : `'${value}`;
  }

  if (trimmedStart.startsWith("-")) {
    const isSafeNegativeNumber = /^-\d+(?:,\d{3})*(?:\.\d+)?$/.test(trimmedStart.trim());
    return isSafeNegativeNumber ? value : `'${value}`;
  }

  return value;
}

/**
 * Escapes a single CSV cell according to RFC 4180 after neutralizing unsafe formulas.
 */
function escapeCsvCell(rawValue: CsvCellValue): string {
  if (rawValue === null || rawValue === undefined) {
    return "";
  }
  const str = neutralizeCsvFormula(String(rawValue));
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates an RFC 4180 CSV string with formula-injection neutralization.
 */
export function generateCsv(
  headers: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<CsvCellValue> | Record<string, CsvCellValue>>
): string {
  const headerLine = headers.map((h) => escapeCsvCell(h)).join(",");
  const dataLines = rows.map((row) => {
    if (Array.isArray(row)) {
      return headers.map((_, idx) => escapeCsvCell(row[idx])).join(",");
    }
    const record = row as Record<string, CsvCellValue>;
    return headers
      .map((header) => {
        if (header in record) {
          return escapeCsvCell(record[header]);
        }
        const normHeader = normalizeCsvHeader(header);
        const matchedKey = Object.keys(record).find((k) => normalizeCsvHeader(k) === normHeader);
        return escapeCsvCell(matchedKey ? record[matchedKey] : undefined);
      })
      .join(",");
  });

  return [headerLine, ...dataLines].join("\r\n");
}
