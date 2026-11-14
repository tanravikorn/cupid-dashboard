import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { GET as getBlocksDeletionsInsights } from "../app/api/insights/blocks-deletions/route";
import {
  computeBlocksDeletionsSummary,
  sumDailyReasons,
} from "../components/insights/blocks-deletions/blocks-deletions-summary";
import {
  DELETION_REASON_CODES,
  parseBlocksDeletionsResponse,
} from "../lib/insights/blocks-deletions";
import {
  countActiveProfileFilters,
  defaultInsightsFilters,
  parseDateRangeQuery,
} from "../lib/insights/filters";
import { buildMockBlocksDeletions } from "../lib/insights/mock-blocks-deletions";
import {
  createStaffSession,
  getStaffConfig,
  STAFF_SESSION_COOKIE,
} from "../lib/server/staff-auth";

const testSecret =
  "test-only-staff-session-key-with-at-least-sixty-four-bytes-123456789";

function makeValidPayload(overrides: Record<string, unknown> = {}) {
  return {
    totals: {
      blocks: 3,
      deletions: 6,
      reasons: {
        found_someone: 2,
        just_trying: 1,
        no_match: 1,
        privacy_security: 0,
        taking_break: 1,
        poor_experience: 0,
        other: 1,
      },
    },
    blocksPerDay: [
      { date: "2026-11-02", count: 1 },
      { date: "2026-11-01", count: 2 },
    ],
    deletionReasonsPerDay: [
      {
        date: "2026-11-02",
        found_someone: 1,
        just_trying: 1,
        no_match: 0,
        privacy_security: 0,
        taking_break: 0,
        poor_experience: 0,
        other: 1,
      },
      {
        date: "2026-11-01",
        found_someone: 1,
        just_trying: 0,
        no_match: 1,
        privacy_security: 0,
        taking_break: 1,
        poor_experience: 0,
        other: 0,
      },
    ],
    ...overrides,
  };
}

test("parseDateRangeQuery forwards only from/to and rejects invalid ranges", () => {
  const parsed = parseDateRangeQuery(
    new URLSearchParams({
      from: " 2026-11-01 ",
      to: " 2026-11-14 ",
      faculty: "engineering",
      year: "2",
      gender: "female",
      relationshipGoal: "long-term-partner",
      onboarded: "onboarded",
      paused: "active",
      interest: "food-coffee",
      blocked_email: "student@student.chula.ac.th",
      blocker_id: "u-1",
      detail: "private reason text",
    }),
  );

  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.query, "from=2026-11-01&to=2026-11-14");

  assert.equal(
    parseDateRangeQuery(
      new URLSearchParams({ from: "2026-11-05", to: "2026-11-05" }),
    ).ok,
    true,
  );
  assert.equal(
    parseDateRangeQuery(
      new URLSearchParams({ from: "2026-01-01", to: "2027-01-01" }),
    ).ok,
    true,
  );
  assert.equal(
    parseDateRangeQuery(
      new URLSearchParams({ from: "2026-01-01", to: "2027-01-02" }),
    ).ok,
    false,
  );
  assert.equal(
    parseDateRangeQuery(
      new URLSearchParams({ from: "2026-11-14", to: "2026-11-01" }),
    ).ok,
    false,
  );
  assert.equal(
    parseDateRangeQuery(
      new URLSearchParams({ from: "2026-02-29", to: "2026-11-01" }),
    ).ok,
    false,
  );
  assert.equal(
    parseDateRangeQuery(new URLSearchParams({ from: "2026-11-01" })).ok,
    false,
  );
});

test("countActiveProfileFilters counts active profile filters on both URLSearchParams and object", () => {
  const filters = defaultInsightsFilters("2026-11-14");
  assert.equal(countActiveProfileFilters(filters), 0);

  filters.faculty = "engineering";
  filters.gender = "female";
  filters.interest = "food-coffee";
  assert.equal(countActiveProfileFilters(filters), 3);

  const params = new URLSearchParams({
    from: "2026-11-01",
    to: "2026-11-14",
    faculty: "arts",
    paused: "paused",
  });
  assert.equal(countActiveProfileFilters(params), 2);
});

test("parseBlocksDeletionsResponse preserves <5 counts, fills date window, and defaults missing codes", () => {
  const parsed = parseBlocksDeletionsResponse(
    {
      totals: {
        blocks: 3,
        deletions: 4,
        reasons: {
          found_someone: 2,
          other: 2,
        },
      },
      blocksPerDay: [{ date: "2026-11-02", count: 3 }],
      deletionReasonsPerDay: [
        { date: "2026-11-01", found_someone: 2 },
        { date: "2026-11-03", other: 2 },
      ],
    },
    "from=2026-11-01&to=2026-11-03",
  );

  assert.ok(parsed);
  assert.equal(parsed.totals.blocks, 3);
  assert.equal(parsed.totals.deletions, 4);
  assert.deepEqual(parsed.totals.reasons, {
    found_someone: 2,
    just_trying: 0,
    no_match: 0,
    privacy_security: 0,
    taking_break: 0,
    poor_experience: 0,
    other: 2,
  });
  assert.deepEqual(parsed.blocksPerDay, [
    { date: "2026-11-01", count: 0 },
    { date: "2026-11-02", count: 3 },
    { date: "2026-11-03", count: 0 },
  ]);
  assert.deepEqual(parsed.deletionReasonsPerDay, [
    {
      date: "2026-11-01",
      found_someone: 2,
      just_trying: 0,
      no_match: 0,
      privacy_security: 0,
      taking_break: 0,
      poor_experience: 0,
      other: 0,
    },
    {
      date: "2026-11-02",
      found_someone: 0,
      just_trying: 0,
      no_match: 0,
      privacy_security: 0,
      taking_break: 0,
      poor_experience: 0,
      other: 0,
    },
    {
      date: "2026-11-03",
      found_someone: 0,
      just_trying: 0,
      no_match: 0,
      privacy_security: 0,
      taking_break: 0,
      poor_experience: 0,
      other: 2,
    },
  ]);

  // Empty arrays across a date range still render zero-filled daily points.
  const zeroRange = parseBlocksDeletionsResponse(
    {
      totals: { blocks: 0, deletions: 0, reasons: {} },
      blocksPerDay: [],
      deletionReasonsPerDay: [],
    },
    "from=2026-11-01&to=2026-11-02",
  );
  assert.ok(zeroRange);
  assert.equal(zeroRange.blocksPerDay.length, 2);
  assert.equal(zeroRange.deletionReasonsPerDay.length, 2);

  // Without query (client-side validation), sorts rows ascending and keeps <5 counts.
  const clientParsed = parseBlocksDeletionsResponse(makeValidPayload());
  assert.ok(clientParsed);
  assert.equal(clientParsed.blocksPerDay[0].date, "2026-11-01");
  assert.equal(clientParsed.blocksPerDay[1].date, "2026-11-02");
});

test("parseBlocksDeletionsResponse strips PII/detail fields and rejects invalid shapes", () => {
  const dirty = makeValidPayload({
    blocked_email: "blocked@student.chula.ac.th",
    blocker_id: "user-abc",
    detail: "free-text user complaint",
    totals: {
      blocks: 2,
      deletions: 3,
      blocker_id: "user-xyz",
      reasons: {
        found_someone: 2,
        other: 1,
        detail: "nested complaint",
        user_id: "user-999",
      },
    },
    blocksPerDay: [
      {
        date: "2026-11-01",
        count: 2,
        blocked_email: "victim@student.chula.ac.th",
        blocker_id: "blocker-1",
      },
    ],
    deletionReasonsPerDay: [
      {
        date: "2026-11-01",
        found_someone: 2,
        other: 1,
        detail: "should never leak",
        id: "feedback-uuid",
      },
    ],
  });

  const sanitized = parseBlocksDeletionsResponse(dirty);
  assert.ok(sanitized);
  const json = JSON.stringify(sanitized);
  for (const forbidden of [
    "blocked_email",
    "blocker_id",
    "detail",
    "user_id",
    "victim",
    "blocked@",
    "complaint",
    "feedback-uuid",
  ]) {
    assert.equal(json.includes(forbidden), false, `Found leaked ${forbidden}`);
  }

  // Merges duplicate date rows cleanly.
  const merged = parseBlocksDeletionsResponse(
    makeValidPayload({
      blocksPerDay: [
        { date: "2026-11-01", count: 1 },
        { date: "2026-11-01", count: 2 },
      ],
      deletionReasonsPerDay: [
        { date: "2026-11-01", found_someone: 1, other: 1 },
        { date: "2026-11-01", found_someone: 2, no_match: 1 },
      ],
    }),
  );
  assert.ok(merged);
  assert.deepEqual(merged.blocksPerDay, [{ date: "2026-11-01", count: 3 }]);
  assert.equal(merged.deletionReasonsPerDay[0].found_someone, 3);
  assert.equal(merged.deletionReasonsPerDay[0].no_match, 1);
  assert.equal(merged.deletionReasonsPerDay[0].other, 1);

  // Rejects invalid shapes and bad counts.
  assert.equal(parseBlocksDeletionsResponse(null), null);
  assert.equal(parseBlocksDeletionsResponse([]), null);
  assert.equal(
    parseBlocksDeletionsResponse(makeValidPayload({ totals: null })),
    null,
  );
  assert.equal(
    parseBlocksDeletionsResponse(
      makeValidPayload({
        totals: { blocks: -1, deletions: 0, reasons: {} },
      }),
    ),
    null,
  );
  assert.equal(
    parseBlocksDeletionsResponse(
      makeValidPayload({
        totals: { blocks: 1, deletions: 1, reasons: { found_someone: 1.5 } },
      }),
    ),
    null,
  );
  assert.equal(
    parseBlocksDeletionsResponse(
      makeValidPayload({
        totals: { blocks: 1, deletions: 1, reasons: { found_someone: null } },
      }),
    ),
    null,
  );
  assert.equal(
    parseBlocksDeletionsResponse(
      makeValidPayload({
        blocksPerDay: [{ date: "2026-02-29", count: 1 }],
      }),
    ),
    null,
  );
  assert.equal(
    parseBlocksDeletionsResponse(
      makeValidPayload({
        deletionReasonsPerDay: [{ date: "2026-11-01", other: "2" }],
      }),
    ),
    null,
  );
});

async function withStaffSession(
  url: string,
  run: (request: NextRequest) => Promise<void>,
  apiUrl = "http://cupid-backend.test",
) {
  const keys = [
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
    "STAFF_EMAILS",
    "STAFF_SESSION_SECRET",
    "CUPID_API_URL",
  ];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  Object.assign(process.env, {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: "test-web-client",
    STAFF_EMAILS: "staff@example.com",
    STAFF_SESSION_SECRET: testSecret,
    CUPID_API_URL: apiUrl,
  });
  try {
    const token = await createStaffSession(
      { email: "staff@example.com", subject: "test-user" },
      getStaffConfig(),
    );
    await run(
      new NextRequest(url, {
        headers: { Cookie: `${STAFF_SESSION_COOKIE}=${token}` },
      }),
    );
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of previous) {
      if (value === undefined) Reflect.deleteProperty(process.env, key);
      else process.env[key] = value;
    }
  }
}

test("GET /api/insights/blocks-deletions enforces auth, strips profile filters, and keeps <5 counts", async () => {
  const unauthed = await getBlocksDeletionsInsights(
    new NextRequest(
      "http://localhost:8082/api/insights/blocks-deletions?from=2026-11-01&to=2026-11-14",
    ),
  );
  assert.equal(unauthed.status, 401);

  await withStaffSession(
    "http://localhost:8082/api/insights/blocks-deletions?from=2026-11-14&to=2026-11-01",
    async (request) => {
      const response = await getBlocksDeletionsInsights(request);
      assert.equal(response.status, 400);
    },
  );

  await withStaffSession(
    "http://localhost:8082/api/insights/blocks-deletions?from=2026-11-01&to=2026-11-02&faculty=engineering&year=2&gender=female&blocked_email=x@y.z&detail=abc",
    async (request) => {
      globalThis.fetch = async (input, init) => {
        assert.equal(
          String(input),
          "http://cupid-backend.test/api/insights/blocks-deletions?from=2026-11-01&to=2026-11-02",
        );
        assert.equal(init?.redirect, "error");
        return new Response(
          JSON.stringify(
            makeValidPayload({
              blocked_email: "hidden@student.chula.ac.th",
              detail: "hidden free text",
            }),
          ),
        );
      };
      const response = await getBlocksDeletionsInsights(request);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.totals.blocks, 3);
      assert.equal(body.totals.deletions, 6);
      assert.equal(body.totals.reasons.just_trying, 1);
      assert.equal(body.blocked_email, undefined);
      assert.equal(body.detail, undefined);
    },
    "http://cupid-backend.test/api",
  );

  await withStaffSession(
    "http://localhost:8082/api/insights/blocks-deletions?from=2026-11-01&to=2026-11-02",
    async (request) => {
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            totals: { blocks: -1, deletions: 0, reasons: {} },
            blocksPerDay: [],
            deletionReasonsPerDay: [],
          }),
        );
      const response = await getBlocksDeletionsInsights(request);
      assert.equal(response.status, 502);
    },
  );
});

test("dev mock blocks & deletions ignores profile filters and is blocked in production", async () => {
  const env = process.env as Record<string, string | undefined>;
  const prevNodeEnv = env.NODE_ENV;
  try {
    env.NODE_ENV = "production";
    assert.equal(
      buildMockBlocksDeletions("from=2026-11-01&to=2026-11-14"),
      null,
    );

    await withStaffSession(
      "http://localhost:8082/api/insights/blocks-deletions?from=2026-11-01&to=2026-11-14&mock=1",
      async (request) => {
        const response = await getBlocksDeletionsInsights(request);
        assert.equal(response.status, 503);
      },
      "",
    );

    env.NODE_ENV = "test";
    await withStaffSession(
      "http://localhost:8082/api/insights/blocks-deletions?from=2026-11-01&to=2026-11-14&mock=1",
      async (request) => {
        const response = await getBlocksDeletionsInsights(request);
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.blocksPerDay.length, 14);
        assert.equal(body.deletionReasonsPerDay.length, 14);
        assert.ok(body.totals.blocks > 0);
        assert.ok(body.totals.deletions > 0);
      },
      "",
    );

    const unfiltered = buildMockBlocksDeletions("from=2026-11-01&to=2026-11-14");
    const withProfileFilters = buildMockBlocksDeletions(
      "from=2026-11-01&to=2026-11-14&faculty=engineering&year=2&gender=female",
    );
    assert.ok(unfiltered);
    assert.deepEqual(unfiltered, withProfileFilters);

    const thirtyDays = buildMockBlocksDeletions("from=2026-10-16&to=2026-11-14");
    assert.ok(thirtyDays);
    assert.equal(thirtyDays.blocksPerDay.length, 30);
    assert.equal(thirtyDays.deletionReasonsPerDay.length, 30);

    const reasonTotal = DELETION_REASON_CODES.reduce(
      (sum, code) => sum + thirtyDays.totals.reasons[code],
      0,
    );
    assert.equal(reasonTotal, thirtyDays.totals.deletions);
  } finally {
    env.NODE_ENV = prevNodeEnv;
  }
});

test("computeBlocksDeletionsSummary aggregates daily deletions, peak day, and ranked reasons", () => {
  const parsed = parseBlocksDeletionsResponse(
    makeValidPayload({
      totals: {
        blocks: 3,
        deletions: 5,
        reasons: {
          found_someone: 2,
          just_trying: 0,
          no_match: 2,
          privacy_security: 0,
          taking_break: 1,
          poor_experience: 0,
          other: 0,
        },
      },
    }),
  );
  assert.ok(parsed);

  const summary = computeBlocksDeletionsSummary(parsed);
  assert.equal(summary.hasBlockActivity, true);
  assert.equal(summary.hasDeletionActivity, true);
  assert.equal(summary.blocksAvg, 1.5);
  assert.equal(summary.deletionsAvg, 2.5);
  assert.deepEqual(summary.peakBlockDay, { date: "2026-11-01", count: 2 });
  // Equal top counts preserve canonical DELETION_REASON_CODES order.
  assert.deepEqual(summary.topReason, { code: "found_someone", count: 2 });
  assert.deepEqual(
    summary.rankedReasons.map((item) => [item.key, item.count]),
    [
      ["found_someone", 2],
      ["no_match", 2],
      ["taking_break", 1],
      ["just_trying", 0],
      ["privacy_security", 0],
      ["poor_experience", 0],
      ["other", 0],
    ],
  );
  assert.deepEqual(summary.dailyDeletions, [
    { date: "2026-11-01", count: 3 },
    { date: "2026-11-02", count: 3 },
  ]);
  assert.equal(sumDailyReasons(parsed.deletionReasonsPerDay[0]), 3);

  const empty = parseBlocksDeletionsResponse({
    totals: { blocks: 0, deletions: 0, reasons: {} },
    blocksPerDay: [],
    deletionReasonsPerDay: [],
  });
  assert.ok(empty);
  const emptySummary = computeBlocksDeletionsSummary(empty);
  assert.equal(emptySummary.hasBlockActivity, false);
  assert.equal(emptySummary.hasDeletionActivity, false);
  assert.equal(emptySummary.blocksAvg, null);
  assert.equal(emptySummary.deletionsAvg, null);
  assert.equal(emptySummary.peakBlockDay, null);
  assert.equal(emptySummary.topReason, null);
});
