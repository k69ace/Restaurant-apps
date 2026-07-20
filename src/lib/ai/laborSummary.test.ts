import { describe, expect, it } from "vitest";
import { buildRulesBasedSummary, type PeriodMetricsInput } from "./laborSummary";

const baseInput: PeriodMetricsInput = {
  locationName: "Walnut Street",
  periodLabel: "Jul 14 - Jul 20",
  netSales: 50000,
  laborDollars: 14500,
  laborPercent: 0.29,
  targetPercent: 0.29,
  splh: 45,
  otPercent: 0.02,
  fohLaborDollars: 6000,
  bohLaborDollars: 6500,
  managementLaborDollars: 2000,
  understaffingFlagCount: 0,
};

describe("buildRulesBasedSummary", () => {
  it("normal case: produces a rules-based summary with no flagged items", () => {
    const result = buildRulesBasedSummary(baseInput);
    expect(result.source).toBe("rules");
    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.flaggedItems).toEqual([]);
  });

  it("flags over-target labor % without asserting certainty", () => {
    const result = buildRulesBasedSummary({ ...baseInput, laborPercent: 0.33 });
    expect(result.flaggedItems.some((f) => f.metric === "Total Labor %")).toBe(true);
    const note = result.flaggedItems.find((f) => f.metric === "Total Labor %")!.note;
    expect(note).toContain("may indicate");
    expect(note).not.toMatch(/\bcaused\b/i);
    expect(note).not.toMatch(/\bwill\b/i);
  });

  it("does not flag labor % when under target", () => {
    const result = buildRulesBasedSummary({ ...baseInput, laborPercent: 0.25 });
    expect(result.flaggedItems.some((f) => f.metric === "Total Labor %")).toBe(false);
    expect(result.summary).toContain("under");
  });

  it("flags high overtime", () => {
    const result = buildRulesBasedSummary({ ...baseInput, otPercent: 0.08 });
    expect(result.flaggedItems.some((f) => f.metric === "Overtime %")).toBe(true);
  });

  it("flags understaffing risk count when present", () => {
    const result = buildRulesBasedSummary({ ...baseInput, understaffingFlagCount: 2 });
    expect(result.flaggedItems.some((f) => f.metric === "Understaffing flag")).toBe(true);
    expect(result.summary).toContain("2 daypart(s)");
  });

  it("missing-field case: null netSales/laborPercent/targetPercent render without throwing", () => {
    const result = buildRulesBasedSummary({
      ...baseInput,
      netSales: null,
      laborDollars: null,
      laborPercent: null,
      targetPercent: null,
      splh: null,
      otPercent: null,
    });
    expect(result.summary).toContain("—");
  });

  it("includes a comparison sentence when a comparison period is provided", () => {
    const result = buildRulesBasedSummary({
      ...baseInput,
      comparison: { periodLabel: "prior week", laborPercent: 0.31, netSales: 48000 },
    });
    expect(result.summary).toContain("prior week");
  });
});
