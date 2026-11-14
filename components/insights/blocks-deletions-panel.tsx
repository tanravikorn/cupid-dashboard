"use client";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { parseBlocksDeletionsResponse } from "@/lib/insights/blocks-deletions";
import {
  countActiveProfileFilters,
  type InsightsFilters,
} from "@/lib/insights/filters";
import { useInsightsQuery } from "@/lib/insights/use-insights-query";
import { BlocksDeletionsChartsSection } from "./blocks-deletions/blocks-deletions-charts-section";
import { BlocksDeletionsKpiSection } from "./blocks-deletions/blocks-deletions-kpi-section";
import { computeBlocksDeletionsSummary } from "./blocks-deletions/blocks-deletions-summary";

type BlocksDeletionsPanelProps = {
  filters: InsightsFilters;
  useDevMock?: boolean;
  onLoadingChange?: (loading: boolean) => void;
};

export function BlocksDeletionsPanel({
  filters,
  useDevMock = false,
  onLoadingChange,
}: BlocksDeletionsPanelProps) {
  const mockParam =
    useDevMock && process.env.NODE_ENV !== "production" ? "&mock=1" : "";
  const dateQuery = new URLSearchParams({
    from: filters.from,
    to: filters.to,
  }).toString();
  const url = `/api/insights/blocks-deletions?${dateQuery}${mockParam}`;
  const ignoredProfileFilters = countActiveProfileFilters(filters);

  const {
    data: insights,
    error,
    loading,
  } = useInsightsQuery(
    url,
    parseBlocksDeletionsResponse,
    { subject: "Blocks & deletions insights" },
    onLoadingChange,
  );

  if (error) {
    return (
      <div
        className="rounded-xl border border-destructive/30 bg-card p-5 text-sm text-destructive"
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (loading || !insights) {
    return (
      <div className="space-y-4" aria-busy="true">
        <DateOnlyNoticeBanner ignoredProfileFilters={ignoredProfileFilters} />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((slot) => (
            <div
              key={slot}
              className="h-28 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      </div>
    );
  }

  const summary = computeBlocksDeletionsSummary(insights);

  return (
    <div className="space-y-6">
      <DateOnlyNoticeBanner ignoredProfileFilters={ignoredProfileFilters} />
      <BlocksDeletionsKpiSection insights={insights} summary={summary} />
      <BlocksDeletionsChartsSection insights={insights} summary={summary} />
    </div>
  );
}

function DateOnlyNoticeBanner({
  ignoredProfileFilters,
}: {
  ignoredProfileFilters: number;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-pink-100 bg-pink-50/50 px-4 py-2.5 text-xs text-slate-600"
      role="status"
    >
      <div className="flex items-start gap-2 sm:items-center">
        <Info
          className="mt-0.5 size-4 shrink-0 text-[#fb7185] sm:mt-0"
          aria-hidden="true"
        />
        <span>
          Date range only — profile filters do not apply to blocks or deletion
          reasons (deletion feedback has no user_id). Counts under 5 stay
          visible because every figure is an anonymous count.
        </span>
      </div>
      {ignoredProfileFilters > 0 ? (
        <Badge variant="soft" className="shrink-0">
          {ignoredProfileFilters} active profile{" "}
          {ignoredProfileFilters === 1 ? "filter" : "filters"} ignored
        </Badge>
      ) : null}
    </div>
  );
}
