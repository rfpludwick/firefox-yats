const WORD_BOUNDARY = /[\s\-_./?#&]/;

export function isWholeWordMatch(query, text, indices) {
  if (!indices.length) return false;

  const start = indices[0];
  const end = indices[indices.length - 1];
  if (end - start + 1 !== indices.length) return false;

  const before = start === 0 || WORD_BOUNDARY.test(text[start - 1]);
  const after = end === text.length - 1 || WORD_BOUNDARY.test(text[end + 1]);
  return (
    before &&
    after &&
    text.slice(start, end + 1).toLowerCase() === query.toLowerCase()
  );
}

export function wholeWordMatchBonus(query, text, indices) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 0;

  if (words.length === 1) {
    return isWholeWordMatch(words[0], text, indices) ? 150 : 0;
  }

  let bonus = 0;
  for (const word of words) {
    const wordMatch = fuzzyScore(word, text);
    if (wordMatch && isWholeWordMatch(word, text, wordMatch.indices)) {
      bonus += 120;
    }
  }
  return bonus;
}

/**
 * Subsequence fuzzy match with scoring.
 * Higher score = better match. Returns null if no match.
 */
export function fuzzyScore(query, text) {
  if (!query) return { score: 0, indices: [] };

  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  let score = 0;
  let prev = -2;
  const indices = [];

  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] !== q[qi]) continue;
    indices.push(i);
    score += 10;
    if (i === prev + 1) score += 25;
    if (i === 0 || WORD_BOUNDARY.test(t[i - 1])) score += 15;
    prev = i;
    qi++;
  }

  if (qi !== q.length) return null;
  score -= Math.max(0, t.length - q.length) * 0.15;
  score += wholeWordMatchBonus(query, text, indices);
  return { score, indices };
}

export function trySplitOrientation(best, left, right, textA, textB, swap) {
  const leftMatch = fuzzyScore(left, textA);
  const rightMatch = fuzzyScore(right, textB);
  if (!leftMatch || !rightMatch) return best;

  const score = leftMatch.score + rightMatch.score + 30;
  if (best && score <= best.score) return best;

  return {
    score,
    indicesA: swap ? rightMatch.indices : leftMatch.indices,
    indicesB: swap ? leftMatch.indices : rightMatch.indices,
  };
}

/**
 * Match query by splitting it across two fields (either order).
 */
export function fuzzySplitScore(query, textA, textB) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;

  const a = textA || "";
  const b = textB || "";
  if (!a || !b) return null;

  let best = null;
  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(" ");
    const right = words.slice(i).join(" ");
    best = trySplitOrientation(best, left, right, a, b, false);
    best = trySplitOrientation(best, left, right, b, a, true);
  }

  return best;
}
