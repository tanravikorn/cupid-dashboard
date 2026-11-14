import type { NextRequest } from "next/server";
import {
  audienceInsightsQuery,
  hasSingleOnboardingFilter,
  readAudienceInsights,
} from "@/lib/insights/audience";
import { buildDevMockAudienceInsights } from "@/lib/insights/mock-audience";
import { proxyInsightsRequest } from "@/lib/server/insights-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyInsightsRequest({
    request,
    upstreamPath: "/insights/users",
    logPrefix: "audience-insights",
    subjectLabel: "Audience insights",
    parseQuery: audienceInsightsQuery,
    parseResponse: (body, query) =>
      readAudienceInsights(body, {
        singleOnboardingFilter: hasSingleOnboardingFilter(query),
      }),
    devMock: buildDevMockAudienceInsights,
  });
}
