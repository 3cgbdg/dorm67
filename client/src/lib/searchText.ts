/**
 * Shared client-side search helpers (header overlay + page filters).
 */

export function normalizeSearchText(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, " ");
}

export function searchTokens(query: string): string[] {
  return normalizeSearchText(query)
    .split(" ")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function haystackIncludesAllTokens(haystack: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const hay = normalizeSearchText(haystack);
  return tokens.every((t) => hay.includes(t));
}

/** Higher score = better match (used for ordering overlay results). */
export function scoreTokenMatch(haystack: string, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const hay = normalizeSearchText(haystack);
  let score = 0;
  for (const raw of tokens) {
    const t = normalizeSearchText(raw);
    if (!t) continue;
    if (hay === t) score += 120;
    else if (hay.startsWith(t)) score += 70;
    else if (hay.includes(` ${t}`) || hay.startsWith(`${t} `)) score += 45;
    else if (hay.includes(t)) score += 28;
  }
  return score;
}
