import type { DailyCountPoint } from "./audience-types";
import {
  enumerateIsoDates,
  isCalendarDate,
  isCount,
  parseDateWindow,
} from "./filters";

export const DELETION_REASON_CODES = [
  "found_someone",
  "just_trying",
  "no_match",
  "privacy_security",
  "taking_break",
  "poor_experience",
  "other",
] as const;

export type DeletionReasonCode = (typeof DELETION_REASON_CODES)[number];

export const DELETION_REASON_LABELS: Record<DeletionReasonCode, string> = {
  found_someone: "Found someone in real life",
  just_trying: "Was just trying the product",
  no_match: "Couldn't find a match",
  privacy_security: "Concerned about privacy / security",
  taking_break: "Taking a break / need time away",
  poor_experience: "Not enough quality matches",
  other: "Other",
};

export const DELETION_REASON_SHORT_LABELS: Record<DeletionReasonCode, string> =
  {
    found_someone: "Found someone",
    just_trying: "Just trying",
    no_match: "No match",
    privacy_security: "Privacy / security",
    taking_break: "Taking a break",
    poor_experience: "Poor experience",
    other: "Other",
  };

export type DeletionReasonCounts = Record<DeletionReasonCode, number>;

export type BlocksDeletionsTotals = {
  blocks: number;
  deletions: number;
  reasons: DeletionReasonCounts;
};

export type DailyDeletionReasonsPoint = {
  date: string;
} & DeletionReasonCounts;

export type BlocksDeletionsInsights = {
  totals: BlocksDeletionsTotals;
  blocksPerDay: DailyCountPoint[];
  deletionReasonsPerDay: DailyDeletionReasonsPoint[];
};

export function emptyReasonCounts(): DeletionReasonCounts {
  return {
    found_someone: 0,
    just_trying: 0,
    no_match: 0,
    privacy_security: 0,
    taking_break: 0,
    poor_experience: 0,
    other: 0,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readReasonCounts(raw: unknown): DeletionReasonCounts | null {
  if (!isPlainObject(raw)) return null;
  const counts = emptyReasonCounts();
  for (const code of DELETION_REASON_CODES) {
    const value = raw[code];
    if (value === undefined) continue;
    if (!isCount(value)) return null;
    counts[code] = value;
  }
  return counts;
}

function readTotals(raw: unknown): BlocksDeletionsTotals | null {
  if (!isPlainObject(raw)) return null;
  if (!isCount(raw.blocks) || !isCount(raw.deletions)) return null;
  const reasons = readReasonCounts(raw.reasons);
  if (!reasons) return null;
  return {
    blocks: raw.blocks,
    deletions: raw.deletions,
    reasons,
  };
}

function readBlocksPerDay(
  raw: unknown,
  dates: string[] | null,
): DailyCountPoint[] | null {
  if (!Array.isArray(raw)) return null;
  const byDate = new Map<string, number>();

  for (const entry of raw) {
    if (!isPlainObject(entry)) return null;
    if (typeof entry.date !== "string" || !isCalendarDate(entry.date)) {
      return null;
    }
    if (!isCount(entry.count)) return null;
    byDate.set(entry.date, (byDate.get(entry.date) ?? 0) + entry.count);
  }

  if (dates) {
    return dates.map((date) => ({
      date,
      count: byDate.get(date) ?? 0,
    }));
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

function readDeletionReasonsPerDay(
  raw: unknown,
  dates: string[] | null,
): DailyDeletionReasonsPoint[] | null {
  if (!Array.isArray(raw)) return null;
  const byDate = new Map<string, DeletionReasonCounts>();

  for (const entry of raw) {
    if (!isPlainObject(entry)) return null;
    if (typeof entry.date !== "string" || !isCalendarDate(entry.date)) {
      return null;
    }
    const row = readReasonCounts(entry);
    if (!row) return null;

    const prev = byDate.get(entry.date);
    if (prev) {
      for (const code of DELETION_REASON_CODES) {
        prev[code] += row[code];
      }
    } else {
      byDate.set(entry.date, row);
    }
  }

  if (dates) {
    return dates.map((date) => ({
      date,
      ...(byDate.get(date) ?? emptyReasonCounts()),
    }));
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));
}

/**
 * Validates and strips any non-whitelisted fields from the blocks & deletions
 * payload. Small counts (< 5) remain visible because every field is an
 * anonymous count with no user, email, or free-text detail link.
 */
export function parseBlocksDeletionsResponse(
  body: unknown,
  query?: string,
): BlocksDeletionsInsights | null {
  if (!isPlainObject(body)) return null;

  const totals = readTotals(body.totals);
  if (!totals) return null;

  let dates: string[] | null = null;
  if (query) {
    const window = parseDateWindow(new URLSearchParams(query));
    if (window.ok) {
      dates = enumerateIsoDates(window.from, window.to);
    }
  }

  const blocksPerDay = readBlocksPerDay(body.blocksPerDay, dates);
  const deletionReasonsPerDay = readDeletionReasonsPerDay(
    body.deletionReasonsPerDay,
    dates,
  );
  if (!blocksPerDay || !deletionReasonsPerDay) return null;

  return {
    totals,
    blocksPerDay,
    deletionReasonsPerDay,
  };
}
