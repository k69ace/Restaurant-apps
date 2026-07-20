import { describe, expect, it } from "vitest";
import { escapeCsvCell, parseCsv, toCsv } from "./csv";

describe("escapeCsvCell — formula injection defense", () => {
  const dangerousPrefixes = ["=", "+", "-", "@", "\t", "\r"];

  it.each(dangerousPrefixes)("neutralizes a cell starting with %s", (prefix) => {
    const payload = `${prefix}cmd|'/c calc'!A1`;
    const result = escapeCsvCell(payload);
    // The dangerous leading character must not be the first character of
    // the raw (unquoted-content) value once opened in a spreadsheet — it's
    // prefixed with a literal single quote instead.
    expect(result.replace(/^"|"$/g, "")).toMatch(/^'/);
    expect(result).toContain(payload.replace(/"/g, '""'));
  });

  it("leaves a normal cell untouched", () => {
    expect(escapeCsvCell("Walnut Street")).toBe("Walnut Street");
  });

  it("quotes a cell containing a comma without needing formula escaping", () => {
    expect(escapeCsvCell("Smith, John")).toBe('"Smith, John"');
  });

  it("escapes embedded double quotes", () => {
    expect(escapeCsvCell('He said "hi"')).toBe('"He said ""hi"""');
  });
});

describe("toCsv", () => {
  it("produces a well-formed CSV with CRLF line endings", () => {
    const csv = toCsv(
      ["Name", "Sales"],
      [
        ["Lunch", 1000],
        ["Dinner", 2000],
      ],
    );
    expect(csv).toBe("Name,Sales\r\nLunch,1000\r\nDinner,2000\r\n");
  });

  it("neutralizes formula-injection payloads in exported rows", () => {
    const csv = toCsv(["Note"], [["=SUM(A1:A10)"]]);
    expect(csv).toContain("\"'=SUM(A1:A10)\"");
  });

  it("renders null/undefined cells as empty strings", () => {
    const csv = toCsv(["A", "B"], [[null, undefined]]);
    expect(csv).toBe("A,B\r\n,\r\n");
  });
});

describe("parseCsv", () => {
  it("normal case: parses simple rows", () => {
    const rows = parseCsv("date,sales\n2026-01-01,1000\n2026-01-02,1200\n");
    expect(rows).toEqual([
      ["date", "sales"],
      ["2026-01-01", "1000"],
      ["2026-01-02", "1200"],
    ]);
  });

  it("handles quoted fields containing commas and newlines", () => {
    const rows = parseCsv('name,note\n"Smith, John","Line one\nLine two"\n');
    expect(rows).toEqual([
      ["name", "note"],
      ["Smith, John", "Line one\nLine two"],
    ]);
  });

  it("handles escaped double quotes inside quoted fields", () => {
    const rows = parseCsv('note\n"He said ""hi"""\n');
    expect(rows).toEqual([["note"], ['He said "hi"']]);
  });

  it("handles a final row with no trailing newline", () => {
    const rows = parseCsv("a,b\n1,2");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("empty input produces no rows", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("round-trips a CSV produced by toCsv, including formula-escaped cells", () => {
    const csv = toCsv(["Note", "Amount"], [["=2+2", 5], ["normal", -3]]);
    const parsed = parseCsv(csv);
    expect(parsed[0]).toEqual(["Note", "Amount"]);
    expect(parsed[1][0]).toBe("'=2+2"); // literal leading quote preserved as data
    // -3 also starts with a dangerous leading char ("-") by design (a
    // negative number is otherwise indistinguishable from a formula
    // fragment to a spreadsheet's auto-parsing) — it round-trips as text.
    expect(parsed[2]).toEqual(["normal", "'-3"]);
  });
});
