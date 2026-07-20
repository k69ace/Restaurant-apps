"use client";

import { toCsv } from "@/lib/csv/csv";

interface ExportCsvButtonProps {
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

/** Renders CSV client-side from data already fetched for the visible table
 * — no extra round trip, and the exported numbers always match what's on
 * screen. Injection-safe via lib/csv/csv.ts's escapeCsvCell. */
export function ExportCsvButton({ filename, headers, rows }: ExportCsvButtonProps) {
  function handleExport() {
    const csv = toCsv(headers, rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="no-print min-h-11 rounded-lg border border-border px-3 text-sm font-medium"
    >
      Export CSV
    </button>
  );
}
