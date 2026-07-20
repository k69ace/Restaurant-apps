import { describe, expect, it } from "vitest";
import { CsvLaborImportAdapter, REQUIRED_COLUMNS } from "./csv";

const HEADER = REQUIRED_COLUMNS.join(",");

function csvWithRows(...rows: string[]): string {
  return [HEADER, ...rows].join("\n");
}

describe("CsvLaborImportAdapter", () => {
  const adapter = new CsvLaborImportAdapter();

  it("normal case: parses a valid row with only required columns", () => {
    const result = adapter.parse(
      csvWithRows("2026-01-05,lunch,1000,50,48,600,2,60,300,300,50"),
    );
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      businessDate: "2026-01-05",
      daypartCode: "lunch",
      netSales: 1000,
      scheduledHours: 50,
      actualHours: 48,
    });
  });

  it("normal case: parses optional columns when present", () => {
    const header = [...REQUIRED_COLUMNS, "guest_count", "gross_sales"].join(",");
    const result = adapter.parse(
      `${header}\n2026-01-05,lunch,1000,50,48,600,2,60,300,300,50,200,1100`,
    );
    expect(result.errors).toEqual([]);
    expect(result.rows[0].guestCount).toBe(200);
    expect(result.rows[0].grossSales).toBe(1100);
  });

  it("empty file: reports a clear error, not a crash", () => {
    const result = adapter.parse("");
    expect(result.rows).toEqual([]);
    expect(result.errors[0].message).toContain("empty");
  });

  it("missing required column in the header: rejected before processing any rows", () => {
    const badHeader = REQUIRED_COLUMNS.filter((c) => c !== "net_sales").join(",");
    const result = adapter.parse(`${badHeader}\n2026-01-05,lunch,50,48,600,2,60,300,300,50`);
    expect(result.rows).toEqual([]);
    expect(result.errors[0].message).toContain("net_sales");
  });

  it("malformed row: non-numeric value is rejected with a clear error, not silently skipped or crashed", () => {
    const result = adapter.parse(csvWithRows("2026-01-05,lunch,not-a-number,50,48,600,2,60,300,300,50"));
    expect(result.rows).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].sourceRow).toBe(2);
    expect(result.errors[0].message).toContain("net_sales");
  });

  it("malformed row: negative value is rejected", () => {
    const result = adapter.parse(csvWithRows("2026-01-05,lunch,-100,50,48,600,2,60,300,300,50"));
    expect(result.rows).toEqual([]);
    expect(result.errors[0].message).toContain("negative");
  });

  it("malformed row: bad date format is rejected", () => {
    const result = adapter.parse(csvWithRows("01/05/2026,lunch,1000,50,48,600,2,60,300,300,50"));
    expect(result.rows).toEqual([]);
    expect(result.errors[0].message).toContain("business_date");
  });

  it("malformed row: missing daypart_code is rejected", () => {
    const result = adapter.parse(csvWithRows("2026-01-05,,1000,50,48,600,2,60,300,300,50"));
    expect(result.rows).toEqual([]);
    expect(result.errors[0].message).toContain("daypart_code");
  });

  it("one bad row among good rows: good rows still import, bad row reported with its own row number", () => {
    const result = adapter.parse(
      csvWithRows(
        "2026-01-05,lunch,1000,50,48,600,2,60,300,300,50",
        "2026-01-06,dinner,bad,60,58,700,1,30,400,350,60",
        "2026-01-07,lunch,1200,52,50,620,0,0,320,300,50",
      ),
    );
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((r) => r.businessDate)).toEqual(["2026-01-05", "2026-01-07"]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].sourceRow).toBe(3);
  });
});
