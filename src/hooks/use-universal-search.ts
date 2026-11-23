'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'

// ─── Fuzzy scoring engine ────────────────────────────────────────────
// Returns a score > 0 for matches, 0 for no match.
// Scoring tiers:
//   100 = exact match (full string)
//    80 = prefix match (starts with query)
//    60 = word-boundary match (query follows a space / start of word)
//    40 = substring match (appears anywhere)
//    20 = fuzzy match (≤ 1 typo per 4 chars)
//     0 = no match

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Simple Levenshtein ≤ maxDist check (early-exit optimised) */
function withinEditDistance(a: string, b: string, maxDist: number): boolean {
  if (Math.abs(a.length - b.length) > maxDist) return false
  if (a.length === 0) return b.length <= maxDist
  if (b.length === 0) return a.length <= maxDist

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let corner = prev[0]
    prev[0] = i
    let minInRow = prev[0]
    for (let j = 1; j <= b.length; j++) {
      const upper = prev[j]
      prev[j] = a[i - 1] === b[j - 1]
        ? corner
        : 1 + Math.min(corner, prev[j], prev[j - 1])
      corner = upper
      if (prev[j] < minInRow) minInRow = prev[j]
    }
    if (minInRow > maxDist) return false
  }
  return prev[b.length] <= maxDist
}

function scoreField(fieldValue: string, query: string): number {
  const lower = fieldValue.toLowerCase()
  const q = query.toLowerCase()

  // Exact
  if (lower === q) return 100

  // Prefix
  if (lower.startsWith(q)) return 80

  // Word-boundary (e.g. "smi" matches "John Smith")
  const words = lower.split(/[\s,.\-_/]+/)
  for (const word of words) {
    if (word.startsWith(q)) return 60
  }

  // Substring
  if (lower.includes(q)) return 40

  // Fuzzy (normalised, edit distance ≤ 1 per 4 chars of query)
  const nq = normalise(query)
  if (nq.length >= 2) {
    const maxDist = Math.max(1, Math.floor(nq.length / 4))
    const nf = normalise(fieldValue)

    // Slide a window of nq.length over nf and check edit distance
    for (let start = 0; start <= nf.length - nq.length + maxDist && start <= nf.length - 1; start++) {
      const window = nf.slice(start, start + nq.length + maxDist)
      if (withinEditDistance(nq, window, maxDist)) return 20
    }
  }

  return 0
}

// ─── Highlight engine ────────────────────────────────────────────────

export interface HighlightSegment {
  text: string
  highlighted: boolean
}

export function highlightMatch(text: string, query: string): HighlightSegment[] {
  if (!query || !text) return [{ text: text || '', highlighted: false }]

  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  const idx = lower.indexOf(q)

  if (idx === -1) return [{ text, highlighted: false }]

  const segments: HighlightSegment[] = []
  if (idx > 0) segments.push({ text: text.slice(0, idx), highlighted: false })
  segments.push({ text: text.slice(idx, idx + q.length), highlighted: true })
  if (idx + q.length < text.length) segments.push({ text: text.slice(idx + q.length), highlighted: false })
  return segments
}

// ─── Main hook ───────────────────────────────────────────────────────

export interface SearchableField<T> {
  /** Accessor: extract the string value from the item (return '' for nulls) */
  accessor: (item: T) => string
  /** Weight multiplier (default 1). Higher = more important field. */
  weight?: number
}

interface UseUniversalSearchOptions<T> {
  /** The full dataset to search */
  items: T[]
  /** Which fields to search and their weights */
  fields: SearchableField<T>[]
  /** Debounce delay in ms (default 200) */
  debounceMs?: number
  /** Optional additional filter predicate applied AFTER search */
  filterPredicate?: (item: T) => boolean
}

export interface SearchResult<T> {
  item: T
  score: number
  matchedField: string // which field value produced the best score
}

export function useUniversalSearch<T>({
  items,
  fields,
  debounceMs = 200,
  filterPredicate,
}: UseUniversalSearchOptions<T>) {
  const [rawQuery, setRawQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const generationRef = useRef(0)

  // Debounced query setter
  const setQuery = useCallback(
    (value: string) => {
      setRawQuery(value)
      if (value.trim()) setIsSearching(true)

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        generationRef.current += 1
        setDebouncedQuery(value)
        setIsSearching(false)
      }, debounceMs)
    },
    [debounceMs],
  )

  // Clean up timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // Compute results
  const results: SearchResult<T>[] = useMemo(() => {
    const q = debouncedQuery.trim()

    // Apply filter predicate first
    const base = filterPredicate ? items.filter(filterPredicate) : items

    if (!q) {
      // Return all (filtered) items with score 0
      return base.map(item => ({ item, score: 0, matchedField: '' }))
    }

    const scored: SearchResult<T>[] = []

    for (const item of base) {
      let bestScore = 0
      let bestField = ''

      for (const field of fields) {
        const value = field.accessor(item)
        if (!value) continue

        const raw = scoreField(value, q)
        const weighted = raw * (field.weight ?? 1)

        if (weighted > bestScore) {
          bestScore = weighted
          bestField = value
        }
      }

      if (bestScore > 0) {
        scored.push({ item, score: bestScore, matchedField: bestField })
      }
    }

    // Sort by score descending (relevance)
    scored.sort((a, b) => b.score - a.score)

    return scored
  }, [items, fields, debouncedQuery, filterPredicate])

  const hasQuery = rawQuery.trim().length > 0
  const noResults = hasQuery && !isSearching && results.length === 0

  return {
    query: rawQuery,
    setQuery,
    results,
    isSearching,
    hasQuery,
    noResults,
    resultCount: results.length,
  }
}
