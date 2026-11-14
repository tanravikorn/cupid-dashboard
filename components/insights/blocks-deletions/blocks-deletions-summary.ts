import {
  type BlocksDeletionsInsights,
  type DailyDeletionReasonsPoint,
  DELETION_REASON_CODES,
  DELETION_REASON_LABELS,
  type DeletionReasonCode,
} from "@/lib/insights/blocks-deletions";

export type BlocksDeletionsSummary = ReturnType<
  typeof computeBlocksDeletionsSummary
>;

export function sumDailyReasons(day: DailyDeletionReasonsPoint): number {
  let total = 0;
  for (const code of DELETION_REASON_CODES) {
    total += day[code];
  }
  return total;
}

export function computeBlocksDeletionsSummary(
  insights: BlocksDeletionsInsights,
) {
  const dailyDeletions = insights.deletionReasonsPerDay.map((day) => ({
    date: day.date,
    count: sumDailyReasons(day),
  }));

  const blockCountMap = new Map(
    insights.blocksPerDay.map((day) => [day.date, day.count]),
  );
  const deletionCountMap = new Map(
    dailyDeletions.map((day) => [day.date, day.count]),
  );

  const hasBlockActivity =
    insights.totals.blocks > 0 ||
    insights.blocksPerDay.some((day) => day.count > 0);
  const hasDeletionActivity =
    insights.totals.deletions > 0 ||
    dailyDeletions.some((day) => day.count > 0);

  const blocksAvg =
    insights.blocksPerDay.length > 0
      ? insights.totals.blocks / insights.blocksPerDay.length
      : null;
  const deletionsAvg =
    dailyDeletions.length > 0
      ? insights.totals.deletions / dailyDeletions.length
      : null;

  let peakBlockDay: { date: string; count: number } | null = null;
  for (const day of insights.blocksPerDay) {
    if (day.count > 0 && (!peakBlockDay || day.count > peakBlockDay.count)) {
      peakBlockDay = day;
    }
  }

  let topReason: { code: DeletionReasonCode; count: number } | null = null;
  for (const code of DELETION_REASON_CODES) {
    const count = insights.totals.reasons[code];
    if (count > 0 && (!topReason || count > topReason.count)) {
      topReason = { code, count };
    }
  }

  const rankedReasons = DELETION_REASON_CODES.map((code, order) => ({
    key: code,
    label: DELETION_REASON_LABELS[code],
    count: insights.totals.reasons[code],
    order,
  }))
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .map(({ key, label, count }) => ({ key, label, count }));

  return {
    dailyDeletions,
    blockCountMap,
    deletionCountMap,
    hasBlockActivity,
    hasDeletionActivity,
    blocksAvg,
    deletionsAvg,
    peakBlockDay,
    topReason,
    rankedReasons,
  };
}
