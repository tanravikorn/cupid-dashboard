import type { NextRequest } from "next/server";
import { parseBlocksDeletionsResponse } from "@/lib/insights/blocks-deletions";
import { parseDateRangeQuery } from "@/lib/insights/filters";
import { buildMockBlocksDeletions } from "@/lib/insights/mock-blocks-deletions";
import { proxyInsightsRequest } from "@/lib/server/insights-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyInsightsRequest({
    request,
    upstreamPath: "/insights/blocks-deletions",
    logPrefix: "blocks-deletions-insights",
    subjectLabel: "Blocks & deletions insights",
    parseQuery: parseDateRangeQuery,
    parseResponse: parseBlocksDeletionsResponse,
    devMock: buildMockBlocksDeletions,
  });
}
