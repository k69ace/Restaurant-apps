import { describe, expect, it } from "vitest";
import { validateLaborEntryInput, type LaborEntryFormValues } from "./laborEntry";

const validDraft: LaborEntryFormValues = {
  netSales: 5000,
  guestCount: 200,
  scheduledHours: 100,
  actualHours: 95,
  regularLaborDollars: 1200,
  overtimeHours: 0,
  overtimeDollars: 0,
  fohLaborDollars: 700,
  bohLaborDollars: 400,
  managementLaborDollars: 100,
};

describe("validateLaborEntryInput", () => {
  it("normal case: valid draft has no errors or warnings", () => {
    const result = validateLaborEntryInput(validDraft, { requireCompleteness: false });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("blocks negative hours", () => {
    const result = validateLaborEntryInput(
      { ...validDraft, actualHours: -5 },
      { requireCompleteness: false },
    );
    expect(result.errors).toContain("Actual hours can't be negative.");
  });

  it("blocks negative dollars", () => {
    const result = validateLaborEntryInput(
      { ...validDraft, regularLaborDollars: -10 },
      { requireCompleteness: false },
    );
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("warns (does not block) on guestCount 0 with nonzero sales", () => {
    const result = validateLaborEntryInput(
      { ...validDraft, guestCount: 0, netSales: 500 },
      { requireCompleteness: false },
    );
    expect(result.errors).toEqual([]);
    expect(result.warnings.length).toBe(1);
  });

  it("does not warn when guestCount 0 and netSales 0 (a genuinely closed daypart)", () => {
    const result = validateLaborEntryInput(
      { ...validDraft, guestCount: 0, netSales: 0 },
      { requireCompleteness: false },
    );
    expect(result.warnings).toEqual([]);
  });

  it("missing-field case: draft save allows missing required-for-final fields", () => {
    const result = validateLaborEntryInput(
      { ...validDraft, actualHours: null, regularLaborDollars: null },
      { requireCompleteness: false },
    );
    expect(result.errors).toEqual([]);
  });

  it("missing-field case: final save blocks on missing required fields", () => {
    const result = validateLaborEntryInput(
      { ...validDraft, actualHours: null, regularLaborDollars: null },
      { requireCompleteness: true },
    );
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("Actual hours");
    expect(result.errors[0]).toContain("Regular labor $");
  });

  it("final save succeeds when every required field is present", () => {
    const result = validateLaborEntryInput(validDraft, { requireCompleteness: true });
    expect(result.errors).toEqual([]);
  });
});
