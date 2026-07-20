"use server";

import { createClient } from "@/lib/supabase/server";
import { getLaborSummary, type FlaggedItem, type PeriodMetricsInput } from "@/lib/ai/laborSummary";
import type { Json } from "@/lib/supabase/types";

export interface CachedLaborSummary {
  summary: string;
  flaggedItems: FlaggedItem[];
  source: "ai" | "rules";
}

/** Cached per (org, location, date range) so repeated views of the same
 * period don't re-trigger an AI call — required by the task brief. */
export async function getPeriodSummaryCached(
  organizationId: string,
  locationId: string,
  periodStart: string,
  periodEnd: string,
  metrics: PeriodMetricsInput,
): Promise<CachedLaborSummary> {
  const supabase = await createClient();

  const { data: cached } = await supabase
    .from("period_summaries")
    .select("summary_text, flagged_items, source")
    .eq("organization_id", organizationId)
    .eq("location_id", locationId)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .maybeSingle();

  if (cached) {
    return {
      summary: cached.summary_text,
      flaggedItems: cached.flagged_items as unknown as FlaggedItem[],
      source: cached.source as "ai" | "rules",
    };
  }

  const result = await getLaborSummary(metrics);

  // Best-effort cache write — a race with a concurrent request just means
  // the unique constraint rejects the second insert, which is fine; the
  // freshly-computed result is still returned to this caller either way.
  await supabase.from("period_summaries").insert({
    organization_id: organizationId,
    location_id: locationId,
    period_start: periodStart,
    period_end: periodEnd,
    source: result.source,
    summary_text: result.summary,
    flagged_items: result.flaggedItems as unknown as Json,
  });

  return result;
}
