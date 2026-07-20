/**
 * Generic, injection-safe CSV encode/decode helpers shared by every export
 * (daily/weekly/period reports) and the CSV import adapter.
 *
 * Formula-injection defense: any cell whose value begins with =, +, -, @,
 * a tab, or a carriage return gets a leading single-quote prefixed before
 * quoting, neutralizing it as a formula in Excel/Sheets/LibreOffice while
 * keeping the visible text intact (a leading `'` is a display-only escape
 * character in spreadsheet apps, not part of the cell's value).
 */

const DANGEROUS_LEADING_CHARS = ["=", "+", "-", "@", "\t", "\r"];

export function escapeCsvCell(value: string): string {
  const needsFormulaEscape = DANGEROUS_LEADING_CHARS.some((c) => value.startsWith(c));
  const safeValue = needsFormulaEscape ? `'${value}` : value;
  const needsQuoting = /[",\n\r]/.test(safeValue) || needsFormulaEscape;
  if (!needsQuoting) return safeValue;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map((h) => escapeCsvCell(h)).join(",")];
  for (const row of rows) {
    lines.push(
      row.map((cell) => escapeCsvCell(cell === null || cell === undefined ? "" : String(cell))).join(","),
    );
  }
  // CRLF per RFC 4180 — also what Excel expects for reliable line breaks.
  return lines.join("\r\n") + "\r\n";
}

/** Minimal RFC-4180-ish CSV parser: handles quoted fields, escaped quotes
 * (""), and commas/newlines inside quotes. Not a full CSV spec
 * implementation, but sufficient for POS/spreadsheet exports. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  // Normalize line endings so \r\n and \r alone behave like \n.
  const input = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  while (i < input.length) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  // Final field/row, if the input didn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}
