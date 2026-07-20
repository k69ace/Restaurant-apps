import Anthropic from "@anthropic-ai/sdk";
import { roundHalfUp } from "@/lib/calculations/labor";

/**
 * Turns pre-computed period metrics into a plain-language management
 * summary. Per the task brief:
 *   - AI is given ONLY already-correct numeric results, never raw entries —
 *     it is never allowed to compute a percentage or dollar figure itself.
 *   - Output is structured (summary + flagged items), certainty language
 *     ("caused", "will") is banned in favor of "may indicate".
 *   - There is always a deterministic, rules-based fallback — the app is
 *     fully useful with AI disabled or failing.
 *   - Cost-conscious model choice: the task brief explicitly calls for this
 *     for a small, templated, non-reasoning-heavy summarization task, so
 *     this uses Haiku 4.5 rather than the default Opus tier.
 */

export interface PeriodMetricsInput {
  locationName: string;
  periodLabel: string; // e.g. "Jul 14 - Jul 20, 2026"
  netSales: number | null;
  laborDollars: number | null;
  laborPercent: number | null;
  targetPercent: number | null;
  splh: number | null;
  otPercent: number | null;
  fohLaborDollars: number;
  bohLaborDollars: number;
  managementLaborDollars: number;
  understaffingFlagCount: number;
  /** Optional: same shape for the prior/comparison period. */
  comparison?: {
    periodLabel: string;
    laborPercent: number | null;
    netSales: number | null;
  };
}

export interface FlaggedItem {
  metric: string;
  value: string;
  note: string;
}

export interface LaborSummaryResult {
  summary: string;
  flaggedItems: FlaggedItem[];
  source: "ai" | "rules";
}

function pct(value: number | null): string {
  return value === null ? "—" : `${roundHalfUp(value * 100, 1)}%`;
}

function dollars(value: number | null): string {
  return value === null ? "—" : `$${roundHalfUp(value, 0).toLocaleString()}`;
}

export function buildRulesBasedSummary(input: PeriodMetricsInput): LaborSummaryResult {
  const sentences: string[] = [];
  const flaggedItems: FlaggedItem[] = [];

  sentences.push(
    `${input.locationName}, ${input.periodLabel}: net sales ${dollars(input.netSales)}, labor ${dollars(input.laborDollars)} (${pct(input.laborPercent)} of sales).`,
  );

  if (input.targetPercent !== null && input.laborPercent !== null) {
    const diffPoints = roundHalfUp((input.laborPercent - input.targetPercent) * 100, 1);
    if (diffPoints > 0) {
      sentences.push(`Labor ran ${diffPoints} points over the ${pct(input.targetPercent)} target.`);
      flaggedItems.push({
        metric: "Total Labor %",
        value: pct(input.laborPercent),
        note: `This may indicate labor ran above target (${pct(input.targetPercent)}) for the period — worth a closer look at scheduling against forecast.`,
      });
    } else if (diffPoints < 0) {
      sentences.push(`Labor ran ${Math.abs(diffPoints)} points under the ${pct(input.targetPercent)} target.`);
    } else {
      sentences.push(`Labor landed right at the ${pct(input.targetPercent)} target.`);
    }
  }

  const largest = [
    { name: "FOH", value: input.fohLaborDollars },
    { name: "BOH", value: input.bohLaborDollars },
    { name: "Management", value: input.managementLaborDollars },
  ].sort((a, b) => b.value - a.value)[0];
  sentences.push(`${largest.name} was the largest labor category at ${dollars(largest.value)}.`);

  if (input.otPercent !== null && input.otPercent > 0.03) {
    sentences.push(`Overtime ran ${pct(input.otPercent)} of total labor dollars.`);
    flaggedItems.push({
      metric: "Overtime %",
      value: pct(input.otPercent),
      note: "This may indicate scheduling gaps or coverage issues driving overtime — worth checking specific shifts.",
    });
  }

  if (input.understaffingFlagCount > 0) {
    sentences.push(
      `${input.understaffingFlagCount} daypart(s) were flagged as a possible understaffing risk for human review.`,
    );
    flaggedItems.push({
      metric: "Understaffing flag",
      value: String(input.understaffingFlagCount),
      note: "One or more dayparts combined below-target labor % with a high-workload signal — this may indicate a scheduling gap, not a certainty.",
    });
  }

  if (input.comparison && input.comparison.laborPercent !== null && input.laborPercent !== null) {
    const vs = roundHalfUp((input.laborPercent - input.comparison.laborPercent) * 100, 1);
    const direction = vs > 0 ? "up" : vs < 0 ? "down" : "flat";
    sentences.push(
      `Labor % was ${direction} ${Math.abs(vs)} points versus ${input.comparison.periodLabel} (${pct(input.comparison.laborPercent)}).`,
    );
  }

  return { summary: sentences.join(" "), flaggedItems, source: "rules" };
}

const SUMMARY_SCHEMA = {
  type: "object" as const,
  properties: {
    summary: {
      type: "string",
      description:
        "2-4 sentence plain-language management summary. Never use 'caused' or 'will' — use 'may indicate' or similar hedged language for any causal claim.",
    },
    flaggedItems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          metric: { type: "string" },
          value: { type: "string" },
          note: {
            type: "string",
            description: "Investigation suggestion. Must use 'may indicate', never assert certainty.",
          },
        },
        required: ["metric", "value", "note"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "flaggedItems"],
  additionalProperties: false,
};

/** Returns null (never throws to the caller) on any failure — missing key,
 * network error, refusal, malformed output — so callers always have a clean
 * fall-through to the rules-based summary. */
export async function generateAiSummary(
  input: PeriodMetricsInput,
): Promise<LaborSummaryResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new Anthropic({ apiKey });

    // Only precomputed, already-correct numeric results are sent — never
    // raw entries, never unrelated locations' data.
    const metricsPayload = {
      location: input.locationName,
      period: input.periodLabel,
      netSales: input.netSales,
      laborDollars: input.laborDollars,
      laborPercent: input.laborPercent,
      targetPercent: input.targetPercent,
      salesPerLaborHour: input.splh,
      overtimePercent: input.otPercent,
      fohLaborDollars: input.fohLaborDollars,
      bohLaborDollars: input.bohLaborDollars,
      managementLaborDollars: input.managementLaborDollars,
      understaffingFlagCount: input.understaffingFlagCount,
      comparisonPeriod: input.comparison ?? null,
    };

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system:
        "You are a labor-analytics assistant for restaurant operators. You are given only pre-computed, already-correct numeric results — never compute or restate a percentage or dollar figure yourself beyond what's provided. Write a short, plain-language management summary. Never claim certainty about causes: never use 'caused' or 'will'; use 'may indicate' or similar hedged language. Output must match the provided JSON schema exactly.",
      messages: [
        {
          role: "user",
          content: `Summarize this restaurant labor period for a manager:\n\n${JSON.stringify(metricsPayload, null, 2)}`,
        },
      ],
      output_config: {
        format: { type: "json_schema", schema: SUMMARY_SCHEMA },
      },
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    const parsed = JSON.parse(textBlock.text) as {
      summary: string;
      flaggedItems: FlaggedItem[];
    };

    return { summary: parsed.summary, flaggedItems: parsed.flaggedItems, source: "ai" };
  } catch {
    // Network error, refusal, malformed JSON, anything else — fall through
    // to the rules-based summary. AI is never required for the app to work.
    return null;
  }
}

export async function getLaborSummary(input: PeriodMetricsInput): Promise<LaborSummaryResult> {
  const aiResult = await generateAiSummary(input);
  return aiResult ?? buildRulesBasedSummary(input);
}
