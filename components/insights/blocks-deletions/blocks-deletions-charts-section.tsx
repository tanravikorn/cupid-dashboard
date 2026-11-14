import { Badge } from "@/components/ui/badge";
import type { DailyCountPoint } from "@/lib/insights/audience-types";
import {
  type BlocksDeletionsInsights,
  type DailyDeletionReasonsPoint,
  DELETION_REASON_CODES,
  DELETION_REASON_LABELS,
  DELETION_REASON_SHORT_LABELS,
} from "@/lib/insights/blocks-deletions";
import { cn } from "@/lib/utils";
import { ChartCard } from "../chart-card";
import { VerticalBarChart } from "../charts/bar-chart";
import { HorizontalBarList } from "../charts/horizontal-bar-list";
import { formatCount } from "../formatters";
import {
  type BlocksDeletionsSummary,
  sumDailyReasons,
} from "./blocks-deletions-summary";

function buildDailyBarProps(
  seriesLabel: string,
  points: DailyCountPoint[],
  countMap: Map<string, number>,
  baseColorClass: string,
  peakColorClass: string,
) {
  return {
    highlightPeak: true,
    categories: points.map((day) => ({
      key: day.date,
      label: day.date,
      shortLabel: day.date.slice(5),
    })),
    series: [
      {
        label: seriesLabel,
        colorClass: baseColorClass,
        getColorClass: (_key: string, isPeak: boolean) =>
          isPeak ? peakColorClass : baseColorClass,
        getValue: (date: string) => countMap.get(date) ?? 0,
      },
    ],
  };
}

export function BlocksDeletionsChartsSection({
  insights,
  summary,
}: {
  insights: BlocksDeletionsInsights;
  summary: BlocksDeletionsSummary;
}) {
  const {
    dailyDeletions,
    blockCountMap,
    deletionCountMap,
    hasBlockActivity,
    hasDeletionActivity,
    rankedReasons,
  } = summary;

  return (
    <section className="grid items-start gap-6 lg:grid-cols-12">
      <ChartCard
        className="lg:col-span-12"
        title="Blocks created per day"
        description="Daily count of blocked_emails rows by created_at (small counts remain visible; blocked addresses and pairs are never returned)."
        empty={!hasBlockActivity}
        emptyMessage="No blocks recorded in the selected date range."
      >
        <VerticalBarChart
          title="Blocks created per day"
          emptyMessage="No blocks recorded in the selected date range."
          {...buildDailyBarProps(
            "Blocks",
            insights.blocksPerDay,
            blockCountMap,
            "bg-[#fb7185]",
            "bg-[#f43f5e] ring-2 ring-pink-300",
          )}
        />
      </ChartCard>

      <ChartCard
        className="lg:col-span-12"
        title="Deletion reasons"
        description="Period counts across all 7 canonical account_deletion_feedback codes (detail free text is never selected)."
        headerAction={
          insights.totals.deletions > 0 ? (
            <Badge variant="soft">
              {formatCount(insights.totals.deletions)} total
            </Badge>
          ) : null
        }
        empty={!hasDeletionActivity}
        emptyMessage="No account deletions recorded in the selected date range."
      >
        <HorizontalBarList
          items={rankedReasons}
          shareDenominator={insights.totals.deletions}
        />
      </ChartCard>

      <ChartCard
        className="lg:col-span-12"
        title="Deletion reasons per day"
        description="Daily account deletions across all 7 stored codes (see daily breakdown table below for counts per code)."
        empty={!hasDeletionActivity}
        emptyMessage="No account deletions recorded in the selected date range."
      >
        <VerticalBarChart
          title="Deletion reasons per day"
          emptyMessage="No account deletions recorded in the selected date range."
          {...buildDailyBarProps(
            "Account deletions",
            dailyDeletions,
            deletionCountMap,
            "bg-[#f472b6]",
            "bg-[#db2777] ring-2 ring-pink-300",
          )}
        />
      </ChartCard>

      {hasDeletionActivity ? (
        <DeletionReasonsDailyTable rows={insights.deletionReasonsPerDay} />
      ) : null}
    </section>
  );
}

function DeletionReasonsDailyTable({
  rows,
}: {
  rows: DailyDeletionReasonsPoint[];
}) {
  return (
    <ChartCard
      className="lg:col-span-12"
      title="Daily deletion reasons breakdown"
      description="Counts per day for each stored deletion reason code."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <caption className="sr-only">
            Daily account deletion counts by reason code
          </caption>
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium whitespace-nowrap">Date</th>
              <th className="px-2 py-2 text-right font-medium">Total</th>
              {DELETION_REASON_CODES.map((code) => (
                <th
                  key={code}
                  className="px-2 py-2 text-right font-medium last:pr-0"
                  title={`${code}: ${DELETION_REASON_LABELS[code]}`}
                >
                  {DELETION_REASON_SHORT_LABELS[code]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 tabular-nums">
            {rows.map((row) => {
              const total = sumDailyReasons(row);
              return (
                <tr key={row.date}>
                  <td className="py-2 pr-3 font-medium whitespace-nowrap">
                    {row.date}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-2 text-right font-bold",
                      total > 0 ? "text-slate-900" : "text-slate-300",
                    )}
                  >
                    {formatCount(total)}
                  </td>
                  {DELETION_REASON_CODES.map((code) => {
                    const count = row[code];
                    return (
                      <td
                        key={code}
                        className={cn(
                          "px-2 py-2 text-right last:pr-0",
                          count > 0
                            ? "font-semibold text-slate-800"
                            : "text-slate-300",
                        )}
                      >
                        {formatCount(count)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
