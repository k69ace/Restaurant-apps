"use client";

import { useState } from "react";
import { CsvLaborImportAdapter, ALL_COLUMNS } from "@/lib/integrations/labor-import/csv";
import type { LaborImportParseResult } from "@/lib/integrations/labor-import/types";
import { importLaborEntries } from "@/app/actions/laborImport";

const adapter = new CsvLaborImportAdapter();

export function ImportCsvClient({
  organizationId,
  locationId,
}: {
  organizationId: string;
  locationId: string;
}) {
  const [parseResult, setParseResult] = useState<LaborImportParseResult | null>(null);
  const [commitResult, setCommitResult] = useState<{ committed: number; errors: { sourceRow: number; message: string }[] } | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  async function handleFile(file: File) {
    const text = await file.text();
    setCommitResult(null);
    setParseResult(adapter.parse(text));
  }

  async function handleCommit() {
    if (!parseResult || parseResult.rows.length === 0) return;
    setIsCommitting(true);
    const result = await importLaborEntries(organizationId, locationId, parseResult.rows);
    setIsCommitting(false);
    setCommitResult(result);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border p-4 text-sm">
        <p className="mb-2 font-semibold">Column mapping template</p>
        <p className="mb-2 text-muted">
          The header row must include these column names (order doesn&apos;t matter, extra columns
          are ignored). Rows are saved as drafts — review them on Daily Entry before marking final.
        </p>
        <code className="block overflow-x-auto rounded bg-accent-soft p-2 text-xs">
          {ALL_COLUMNS.join(",")}
        </code>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="text-sm"
        />
      </div>

      {parseResult && (
        <div className="rounded-xl border border-border p-4">
          <p className="mb-2 text-sm">
            <strong>{parseResult.rows.length}</strong> row(s) parsed successfully.{" "}
            {parseResult.errors.length > 0 && (
              <strong className="text-danger">{parseResult.errors.length} row(s) with errors.</strong>
            )}
          </p>

          {parseResult.errors.length > 0 && (
            <ul className="mb-3 list-inside list-disc text-sm text-danger">
              {parseResult.errors.map((e, i) => (
                <li key={i}>
                  Row {e.sourceRow}: {e.message}
                </li>
              ))}
            </ul>
          )}

          {parseResult.rows.length > 0 && (
            <button
              type="button"
              onClick={handleCommit}
              disabled={isCommitting}
              className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-background disabled:opacity-60"
            >
              {isCommitting ? "Importing…" : `Import ${parseResult.rows.length} row(s) as drafts`}
            </button>
          )}
        </div>
      )}

      {commitResult && (
        <div className="rounded-xl border border-border p-4 text-sm">
          <p>
            <strong>{commitResult.committed}</strong> row(s) imported.
          </p>
          {commitResult.errors.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-danger">
              {commitResult.errors.map((e, i) => (
                <li key={i}>
                  Row {e.sourceRow}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
