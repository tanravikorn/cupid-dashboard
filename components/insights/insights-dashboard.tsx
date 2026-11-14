"use client";

import { useEffect, useState } from "react";
import { DailyDeckInsightsPanel } from "@/components/daily-deck-insights";
import { Button } from "@/components/ui/button";
import {
  defaultInsightsFilters,
  type InsightsFilters,
} from "@/lib/insights/filters";
import { AudiencePanel } from "./audience-panel";
import { BlocksDeletionsPanel } from "./blocks-deletions-panel";
import { EngagementPanel } from "./engagement-panel";
import { GlobalFilterBar } from "./global-filter-bar";

type DashboardTab =
  | "audience"
  | "daily-decks"
  | "engagement"
  | "blocks-deletions";

const isDev = process.env.NODE_ENV !== "production";

export function InsightsDashboard() {
  const [filters, setFilters] = useState<InsightsFilters | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("audience");
  const [visitedDailyDecks, setVisitedDailyDecks] = useState(false);
  const [visitedEngagement, setVisitedEngagement] = useState(false);
  const [visitedBlocksDeletions, setVisitedBlocksDeletions] = useState(false);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [decksLoading, setDecksLoading] = useState(false);
  const [engagementLoading, setEngagementLoading] = useState(false);
  const [blocksDeletionsLoading, setBlocksDeletionsLoading] = useState(false);
  const [useDevMock, setUseDevMock] = useState(false);

  useEffect(() => {
    setFilters(defaultInsightsFilters());
  }, []);

  if (!filters) {
    return <p className="mt-6 text-sm text-muted-foreground">Loading insights…</p>;
  }

  return (
    <div className="mt-6 space-y-6">
      <GlobalFilterBar
        filters={filters}
        loading={
          audienceLoading ||
          decksLoading ||
          engagementLoading ||
          blocksDeletionsLoading
        }
        onApply={setFilters}
        showDevMockToggle={isDev && activeTab !== "daily-decks"}
        useDevMock={useDevMock}
        onToggleDevMock={setUseDevMock}
      />

      <div
        className="inline-flex flex-wrap rounded-2xl border border-pink-100/90 bg-white p-1 shadow-[0_4px_12px_-2px_rgba(244,114,182,0.06)]"
        role="tablist"
        aria-label="Insight sections"
      >
        <Button
          type="button"
          role="tab"
          aria-selected={activeTab === "audience"}
          variant={activeTab === "audience" ? "gradient" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("audience")}
        >
          Who is on the product
        </Button>
        <Button
          type="button"
          role="tab"
          aria-selected={activeTab === "daily-decks"}
          variant={activeTab === "daily-decks" ? "gradient" : "ghost"}
          size="sm"
          onClick={() => {
            setActiveTab("daily-decks");
            setVisitedDailyDecks(true);
          }}
        >
          Daily decks
        </Button>
        <Button
          type="button"
          role="tab"
          aria-selected={activeTab === "engagement"}
          variant={activeTab === "engagement" ? "gradient" : "ghost"}
          size="sm"
          onClick={() => {
            setActiveTab("engagement");
            setVisitedEngagement(true);
          }}
        >
          Engagement
        </Button>
        <Button
          type="button"
          role="tab"
          aria-selected={activeTab === "blocks-deletions"}
          variant={activeTab === "blocks-deletions" ? "gradient" : "ghost"}
          size="sm"
          onClick={() => {
            setActiveTab("blocks-deletions");
            setVisitedBlocksDeletions(true);
          }}
        >
          Blocks &amp; deletions
        </Button>
      </div>

      <div role="tabpanel" hidden={activeTab !== "audience"}>
        <AudiencePanel
          filters={filters}
          useDevMock={useDevMock}
          onLoadingChange={setAudienceLoading}
        />
      </div>
      {visitedDailyDecks ? (
        <div role="tabpanel" hidden={activeTab !== "daily-decks"}>
          <DailyDeckInsightsPanel
            filters={filters}
            onLoadingChange={setDecksLoading}
          />
        </div>
      ) : null}
      {visitedEngagement ? (
        <div role="tabpanel" hidden={activeTab !== "engagement"}>
          <EngagementPanel
            filters={filters}
            useDevMock={useDevMock}
            onLoadingChange={setEngagementLoading}
          />
        </div>
      ) : null}
      {visitedBlocksDeletions ? (
        <div role="tabpanel" hidden={activeTab !== "blocks-deletions"}>
          <BlocksDeletionsPanel
            filters={filters}
            useDevMock={useDevMock}
            onLoadingChange={setBlocksDeletionsLoading}
          />
        </div>
      ) : null}
    </div>
  );
}
