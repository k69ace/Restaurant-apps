import { describe, expect, it } from "vitest";
import {
  DEFAULT_UNDERSTAFFING_THRESHOLDS,
  aggregateLaborEntries,
  breakEvenSalesForCurrentLaborSpend,
  bohLaborPercent,
  estimatedSavingsAtTarget,
  fohLaborPercent,
  guestsPerLaborHour,
  laborBudgetVariance,
  laborDollarsPerGuest,
  managementLaborPercent,
  overtimePercent,
  productiveLaborPercent,
  roundHalfUp,
  salesPerEmployeeHour,
  salesPerLaborHour,
  scheduledVsActualVarianceDollars,
  scheduledVsActualVarianceHours,
  sumMoney,
  totalLaborDollars,
  totalLaborPercent,
  understaffingRisk,
  type LaborEntryInput,
} from "./labor";

// A typical, fully-populated normal-case entry: $10,000 net sales, 29% labor.
const normalEntry: LaborEntryInput = {
  netSales: 10000,
  guestCount: 400,
  scheduledHours: 210,
  actualHours: 200,
  scheduledLaborDollars: 2900,
  regularLaborDollars: 2400,
  overtimeHours: 5,
  overtimeDollars: 150,
  fohLaborDollars: 1200,
  bohLaborDollars: 1000,
  managementLaborDollars: 350,
};

const zeroSalesEntry: LaborEntryInput = {
  ...normalEntry,
  netSales: 0,
};

const missingOptionalFieldsEntry: LaborEntryInput = {
  netSales: 5000,
  guestCount: undefined,
  scheduledHours: 100,
  actualHours: 95,
  scheduledLaborDollars: undefined,
  regularLaborDollars: 1200,
  overtimeHours: 0,
  overtimeDollars: 0,
  fohLaborDollars: 700,
  bohLaborDollars: 400,
  managementLaborDollars: 100,
};

const target = {
  targetTotalLaborPercent: 0.29,
  includeManagementInProductive: true,
};

describe("roundHalfUp", () => {
  it("rounds ties away from zero at the requested precision", () => {
    expect(roundHalfUp(2.5, 0)).toBe(3);
    expect(roundHalfUp(-2.5, 0)).toBe(-3);
    expect(roundHalfUp(1.005, 2)).toBe(1.01);
    expect(roundHalfUp(29.05, 1)).toBe(29.1);
  });

  it("does not introduce binary floating point artifacts", () => {
    expect(roundHalfUp(0.1 + 0.2, 2)).toBe(0.3);
  });
});

describe("sumMoney", () => {
  it("sums via integer cents to avoid float drift", () => {
    expect(sumMoney(0.1, 0.2)).toBe(0.3);
    expect(sumMoney(2400, 150, 350)).toBe(2900);
  });

  it("treats null/undefined amounts as 0", () => {
    expect(sumMoney(10, null, undefined, 5)).toBe(15);
  });

  it("supports negative amounts (for variance calculations)", () => {
    expect(sumMoney(100, -30)).toBe(70);
  });
});

describe("totalLaborDollars", () => {
  it("normal case: sums regular + overtime + management", () => {
    expect(totalLaborDollars(normalEntry)).toBe(2900);
  });
});

describe("totalLaborPercent", () => {
  it("normal case", () => {
    expect(totalLaborPercent(normalEntry)).toBeCloseTo(0.29, 10);
  });

  it("zero-sales case: returns null, not a division error", () => {
    expect(totalLaborPercent(zeroSalesEntry)).toBeNull();
  });

  it("missing (null) netSales: returns null", () => {
    expect(totalLaborPercent({ ...normalEntry, netSales: null })).toBeNull();
  });
});

describe("productiveLaborPercent", () => {
  it("normal case, management included in productive: equals total %", () => {
    expect(
      productiveLaborPercent(normalEntry, { includeManagementInProductive: true }),
    ).toBeCloseTo(totalLaborPercent(normalEntry)!, 10);
  });

  it("normal case, management excluded from productive", () => {
    const result = productiveLaborPercent(normalEntry, {
      includeManagementInProductive: false,
    });
    expect(result).toBeCloseTo(2550 / 10000, 10);
  });

  it("zero-sales case: returns null", () => {
    expect(
      productiveLaborPercent(zeroSalesEntry, { includeManagementInProductive: false }),
    ).toBeNull();
  });
});

describe("fohLaborPercent / bohLaborPercent / managementLaborPercent", () => {
  it("normal case", () => {
    expect(fohLaborPercent(normalEntry)).toBeCloseTo(0.12, 10);
    expect(bohLaborPercent(normalEntry)).toBeCloseTo(0.1, 10);
    expect(managementLaborPercent(normalEntry)).toBeCloseTo(0.035, 10);
  });

  it("zero-sales case: all return null", () => {
    expect(fohLaborPercent(zeroSalesEntry)).toBeNull();
    expect(bohLaborPercent(zeroSalesEntry)).toBeNull();
    expect(managementLaborPercent(zeroSalesEntry)).toBeNull();
  });

  it("missing-field case: entry with no management labor still computes 0%, not null", () => {
    expect(managementLaborPercent({ ...normalEntry, managementLaborDollars: 0 })).toBe(0);
  });
});

describe("overtimePercent", () => {
  it("normal case", () => {
    expect(overtimePercent(normalEntry)).toBeCloseTo(150 / 2900, 10);
  });

  it("zero total labor dollars: returns null rather than dividing by zero", () => {
    expect(
      overtimePercent({
        ...normalEntry,
        regularLaborDollars: 0,
        overtimeDollars: 0,
        managementLaborDollars: 0,
      }),
    ).toBeNull();
  });

  it("is independent of netSales (still computes at zero sales)", () => {
    expect(overtimePercent(zeroSalesEntry)).toBeCloseTo(150 / 2900, 10);
  });
});

describe("salesPerLaborHour", () => {
  it("normal case: actual basis", () => {
    expect(salesPerLaborHour(normalEntry, "actual")).toBeCloseTo(10000 / 200, 10);
  });

  it("normal case: scheduled basis", () => {
    expect(salesPerLaborHour(normalEntry, "scheduled")).toBeCloseTo(10000 / 210, 10);
  });

  it("zero-hours case: returns null instead of Infinity", () => {
    expect(salesPerLaborHour({ ...normalEntry, actualHours: 0 }, "actual")).toBeNull();
  });

  it("missing netSales: returns null", () => {
    expect(salesPerLaborHour({ ...normalEntry, netSales: null }, "actual")).toBeNull();
  });
});

describe("guestsPerLaborHour", () => {
  it("normal case", () => {
    expect(guestsPerLaborHour(normalEntry, "actual")).toBeCloseTo(400 / 200, 10);
  });

  it("missing guestCount: returns null, never a fabricated 0", () => {
    expect(guestsPerLaborHour(missingOptionalFieldsEntry, "actual")).toBeNull();
  });

  it("zero-hours case: returns null", () => {
    expect(guestsPerLaborHour({ ...normalEntry, actualHours: 0 }, "actual")).toBeNull();
  });
});

describe("laborDollarsPerGuest", () => {
  it("normal case", () => {
    expect(laborDollarsPerGuest(normalEntry)).toBeCloseTo(2900 / 400, 10);
  });

  it("missing guestCount: returns null", () => {
    expect(laborDollarsPerGuest(missingOptionalFieldsEntry)).toBeNull();
  });

  it("zero guestCount: returns null instead of Infinity", () => {
    expect(laborDollarsPerGuest({ ...normalEntry, guestCount: 0 })).toBeNull();
  });
});

describe("salesPerEmployeeHour", () => {
  it("normal case, management hours not supplied: uses full actualHours", () => {
    expect(salesPerEmployeeHour(normalEntry)).toBeCloseTo(10000 / 200, 10);
  });

  it("normal case, management hours supplied: excludes them", () => {
    expect(salesPerEmployeeHour(normalEntry, 20)).toBeCloseTo(10000 / 180, 10);
  });

  it("missing-field case: missing netSales returns null", () => {
    expect(salesPerEmployeeHour({ ...normalEntry, netSales: null })).toBeNull();
  });

  it("effective hours <= 0: returns null", () => {
    expect(salesPerEmployeeHour(normalEntry, 200)).toBeNull();
  });
});

describe("scheduledVsActualVarianceHours", () => {
  it("normal case: actual under scheduled", () => {
    expect(scheduledVsActualVarianceHours(normalEntry)).toBe(-10);
  });

  it("actual over scheduled", () => {
    expect(
      scheduledVsActualVarianceHours({ ...normalEntry, actualHours: 220, scheduledHours: 200 }),
    ).toBe(20);
  });
});

describe("scheduledVsActualVarianceDollars", () => {
  it("normal case", () => {
    expect(scheduledVsActualVarianceDollars(normalEntry)).toBeCloseTo(2900 - 2900, 10);
  });

  it("missing-field case: scheduledLaborDollars not supplied returns null", () => {
    expect(scheduledVsActualVarianceDollars(missingOptionalFieldsEntry)).toBeNull();
  });
});

describe("laborBudgetVariance", () => {
  it("over-target case: actual % above target", () => {
    const overTarget = { ...normalEntry, managementLaborDollars: 500 }; // total $ = 3050, 30.5%
    const variance = laborBudgetVariance(overTarget, target);
    expect(variance).toBeCloseTo(3050 - 0.29 * 10000, 10);
    expect(variance!).toBeGreaterThan(0);
  });

  it("under-target case: actual % below target", () => {
    const underTarget = { ...normalEntry, managementLaborDollars: 100 }; // total $ = 2650, 26.5%
    const variance = laborBudgetVariance(underTarget, target);
    expect(variance).toBeCloseTo(2650 - 0.29 * 10000, 10);
    expect(variance!).toBeLessThan(0);
  });

  it("missing netSales: returns null", () => {
    expect(laborBudgetVariance({ ...normalEntry, netSales: null }, target)).toBeNull();
  });

  it("missing target percent: returns null", () => {
    expect(
      laborBudgetVariance(normalEntry, { targetTotalLaborPercent: null }),
    ).toBeNull();
  });

  it("zero net sales is still computable (target dollars = 0), not null", () => {
    expect(laborBudgetVariance(zeroSalesEntry, target)).toBeCloseTo(2900, 10);
  });
});

describe("estimatedSavingsAtTarget", () => {
  it("over-target case: positive savings, status over_target", () => {
    const overTarget = { ...normalEntry, managementLaborDollars: 500 };
    const result = estimatedSavingsAtTarget(overTarget, target);
    expect(result?.status).toBe("over_target");
    expect(result?.amountDollars).toBeGreaterThan(0);
  });

  it("under-target case: never reports a negative headline number", () => {
    const underTarget = { ...normalEntry, managementLaborDollars: 100 };
    const result = estimatedSavingsAtTarget(underTarget, target);
    expect(result?.status).toBe("at_or_under_target");
    expect(result?.amountDollars).toBeGreaterThanOrEqual(0);
  });

  it("exactly at target: $0, status at_or_under_target", () => {
    const atTarget = { ...normalEntry }; // 2900 / 10000 = 29% = target exactly
    const result = estimatedSavingsAtTarget(atTarget, target);
    expect(result?.status).toBe("at_or_under_target");
    expect(result?.amountDollars).toBe(0);
  });

  it("missing-field case: missing target returns null", () => {
    expect(
      estimatedSavingsAtTarget(normalEntry, { targetTotalLaborPercent: null }),
    ).toBeNull();
  });
});

describe("breakEvenSalesForCurrentLaborSpend", () => {
  it("normal case", () => {
    expect(breakEvenSalesForCurrentLaborSpend(normalEntry, target)).toBeCloseTo(
      2900 / 0.29,
      10,
    );
  });

  it("missing target percent: returns null", () => {
    expect(
      breakEvenSalesForCurrentLaborSpend(normalEntry, { targetTotalLaborPercent: null }),
    ).toBeNull();
  });

  it("zero target percent: returns null instead of Infinity", () => {
    expect(
      breakEvenSalesForCurrentLaborSpend(normalEntry, { targetTotalLaborPercent: 0 }),
    ).toBeNull();
  });
});

describe("understaffingRisk", () => {
  it("flags high guests-per-labor-hour when meaningfully under target", () => {
    const entry: LaborEntryInput = {
      ...normalEntry,
      netSales: 10000,
      guestCount: 900, // 4.5 guests/hour at 200 actual hours, above the 3.5 default
      regularLaborDollars: 2000,
      overtimeDollars: 0,
      managementLaborDollars: 200, // total 2200 = 22%, below 29% target
    };
    const result = understaffingRisk(entry, target);
    expect(result.flagged).toBe(true);
    expect(result.insufficientData).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("flags actual-hours-well-below-scheduled with sales at/above trailing average", () => {
    const entry: LaborEntryInput = {
      ...normalEntry,
      guestCount: 300, // below the guests/hour threshold on its own
      scheduledHours: 220,
      actualHours: 180, // ~18% under scheduled, above the 10% default threshold
      regularLaborDollars: 2000,
      overtimeDollars: 0,
      managementLaborDollars: 200,
    };
    const result = understaffingRisk(entry, target, DEFAULT_UNDERSTAFFING_THRESHOLDS, {
      trailingAverageNetSales: 9500,
    });
    expect(result.flagged).toBe(true);
  });

  it("does not flag low labor % alone with no workload signal", () => {
    const entry: LaborEntryInput = {
      ...normalEntry,
      guestCount: 300,
      scheduledHours: 200,
      actualHours: 198,
      regularLaborDollars: 2000,
      overtimeDollars: 0,
      managementLaborDollars: 200,
    };
    const result = understaffingRisk(entry, target, DEFAULT_UNDERSTAFFING_THRESHOLDS, {
      trailingAverageNetSales: 9500,
    });
    expect(result.flagged).toBe(false);
    expect(result.insufficientData).toBe(false);
  });

  it("does not flag when labor % is at/above target regardless of workload", () => {
    const entry: LaborEntryInput = {
      ...normalEntry,
      guestCount: 900,
      managementLaborDollars: 700, // total 3250 = 32.5%, above target
    };
    const result = understaffingRisk(entry, target);
    expect(result.flagged).toBe(false);
  });

  it("insufficient-data case: zero sales means no percent to evaluate", () => {
    const result = understaffingRisk(zeroSalesEntry, target);
    expect(result.insufficientData).toBe(true);
    expect(result.flagged).toBe(false);
  });

  it("insufficient-data case: missing target percent", () => {
    const result = understaffingRisk(normalEntry, { targetTotalLaborPercent: null });
    expect(result.insufficientData).toBe(true);
  });

  it("zero scheduledHours does not throw and treats hours variance as 0%", () => {
    const entry: LaborEntryInput = {
      ...normalEntry,
      guestCount: undefined, // isolate the scheduledHours branch from the guests/hour reason
      scheduledHours: 0,
      actualHours: 50,
      regularLaborDollars: 2000,
      overtimeDollars: 0,
      managementLaborDollars: 200,
    };
    const result = understaffingRisk(entry, target, DEFAULT_UNDERSTAFFING_THRESHOLDS, {
      trailingAverageNetSales: 9500,
    });
    expect(result.insufficientData).toBe(false);
    expect(result.flagged).toBe(false);
  });
});

describe("aggregateLaborEntries", () => {
  it("normal case: sums money/hours fields across entries", () => {
    const result = aggregateLaborEntries([normalEntry, missingOptionalFieldsEntry]);
    expect(result.netSales).toBeCloseTo(15000, 10);
    expect(result.regularLaborDollars).toBeCloseTo(3600, 10);
    expect(result.scheduledHours).toBe(310);
    expect(result.actualHours).toBe(295);
  });

  it("missing-field case: guestCount is null in the total when any entry omits it", () => {
    const result = aggregateLaborEntries([normalEntry, missingOptionalFieldsEntry]);
    expect(result.guestCount).toBeNull();
  });

  it("normal case: guestCount sums when every entry provides it", () => {
    const result = aggregateLaborEntries([normalEntry, { ...normalEntry, guestCount: 100 }]);
    expect(result.guestCount).toBe(500);
  });

  it("empty list: returns a well-defined zeroed entry, not a crash", () => {
    const result = aggregateLaborEntries([]);
    expect(result.netSales).toBe(0);
    expect(result.scheduledHours).toBe(0);
  });

  it("missing-field case: netSales is null in the total when any entry omits it", () => {
    const result = aggregateLaborEntries([normalEntry, { ...normalEntry, netSales: null }]);
    expect(result.netSales).toBeNull();
  });
});
