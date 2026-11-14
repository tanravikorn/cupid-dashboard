import type { NextRequest } from "next/server";
import {
  engagementInsightsQuery,
  readEngagementInsights,
} from "@/lib/insights/engagement";
import { buildDevMockEngagementInsights } from "@/lib/insights/mock-engagement";
import { proxyInsightsRequest } from "@/lib/server/insights-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyInsightsRequest({
    request,
    upstreamPath: "/insights/engagement",
    logPrefix: "engagement-insights",
    subjectLabel: "Engagement insights",
    parseQuery: engagementInsightsQuery,
    parseResponse: readEngagementInsights,
    devMock: buildDevMockEngagementInsights,
  });
}
