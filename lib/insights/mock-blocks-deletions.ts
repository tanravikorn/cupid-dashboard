import {
  type BlocksDeletionsInsights,
  DELETION_REASON_CODES,
  type DeletionReasonCode,
  emptyReasonCounts,
} from "./blocks-deletions";
import { enumerateIsoDates } from "./filters";

const BLOCK_DAILY_PATTERN = [2, 0, 1, 3, 1, 0, 4, 2, 1, 0, 3, 2, 1, 2];

const REASON_DAILY_PATTERNS: Record<DeletionReasonCode, readonly number[]> = {
  found_someone: [1, 0, 2, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
  just_trying: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
  no_match: [1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1],
  privacy_security: [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
  taking_break: [0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1],
  poor_experience: [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  other: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
};

export function buildMockBlocksDeletions(
  queryString: string,
): BlocksDeletionsInsights | null {
  if (process.env.NODE_ENV === "production") return null;

  const params = new URLSearchParams(queryString);
  const from = params.get("from") || "2026-11-01";
  const to = params.get("to") || "2026-11-14";
  const dayList = enumerateIsoDates(from, to);

  const blocksPerDay = dayList.map((date, idx) => ({
    date,
    count: BLOCK_DAILY_PATTERN[idx % BLOCK_DAILY_PATTERN.length],
  }));

  const reasons = emptyReasonCounts();
  const deletionReasonsPerDay = dayList.map((date, idx) => {
    const counts = emptyReasonCounts();
    for (const code of DELETION_REASON_CODES) {
      const pattern = REASON_DAILY_PATTERNS[code];
      const count = pattern[idx % pattern.length];
      counts[code] = count;
      reasons[code] += count;
    }
    return { date, ...counts };
  });

  const blocks = blocksPerDay.reduce((sum, day) => sum + day.count, 0);
  const deletions = DELETION_REASON_CODES.reduce(
    (sum, code) => sum + reasons[code],
    0,
  );

  return {
    totals: {
      blocks,
      deletions,
      reasons,
    },
    blocksPerDay,
    deletionReasonsPerDay,
  };
}
