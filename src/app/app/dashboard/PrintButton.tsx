"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print min-h-11 rounded-lg border border-border px-4 text-sm font-medium"
    >
      Print manager report
    </button>
  );
}
