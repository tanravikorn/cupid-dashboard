import {
  type BlocksDeletionsInsights,
  DELETION_REASON_SHORT_LABELS,
} from "@/lib/insights/blocks-deletions";
import { formatCount, formatDecimal } from "../formatters";
import { KpiCard } from "../kpi-card";
import type { BlocksDeletionsSummary } from "./blocks-deletions-summary";

export function BlocksDeletionsKpiSection({
  insights,
  summary,
}: {
  insights: BlocksDeletionsInsights;
  summary: BlocksDeletionsSummary;
}) {
  const { blocksAvg, deletionsAvg, peakBlockDay, topReason } = summary;

  return (
    <section
      aria-label="Blocks and deletions totals"
      className="grid gap-4 sm:grid-cols-2"
    >
      <KpiCard
        label="Blocks"
        value={formatCount(insights.totals.blocks)}
        badge={
          blocksAvg !== null
            ? { text: `${formatDecimal(blocksAvg)} / day`, tone: "neutral" }
            : null
        }
        subtext="blocked_emails rows created in range (retained if blocked user deletes; removed if blocker deletes)"
        footer={
          peakBlockDay
            ? {
                label: "Peak day:",
                value: `${peakBlockDay.date.slice(5)} (${formatCount(peakBlockDay.count)})`,
                valueClass: "text-[#f43f5e]",
              }
            : null
        }
      />
      <KpiCard
        label="Account deletions"
        value={formatCount(insights.totals.deletions)}
        valueAccentClass="text-[#f43f5e]"
        badge={
          deletionsAvg !== null
            ? { text: `${formatDecimal(deletionsAvg)} / day`, tone: "pink" }
            : null
        }
        subtext="Anonymous account_deletion_feedback rows (no user_id; free-text detail never selected)"
        footer={
          topReason
            ? {
                label: "Top reason:",
                value: `${DELETION_REASON_SHORT_LABELS[topReason.code]} (${formatCount(topReason.count)})`,
              }
            : null
        }
      />
    </section>
  );
}
