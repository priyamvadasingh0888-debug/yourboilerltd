'use client'

import { Search, X, Loader2 } from 'lucide-react'
import { highlightMatch, type HighlightSegment } from '@/hooks/use-universal-search'
import type { CSSProperties } from 'react'

// ─── Search Input Bar ────────────────────────────────────────────────

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  isSearching?: boolean
  resultCount?: number
  hasQuery?: boolean
  style?: CSSProperties
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search across all fields…',
  isSearching = false,
  resultCount,
  hasQuery = false,
  style,
}: SearchInputProps) {
  return (
    <div style={{ position: 'relative', ...style }}>
      {isSearching ? (
        <Loader2
          size={15}
          style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-acid-lime)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      ) : (
        <Search
          size={15}
          style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-fog)',
          }}
        />
      )}

      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '11px 80px 11px 40px',
          borderRadius: '12px',
          background: 'var(--surface-card)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: 'var(--color-paper)',
          fontSize: '13px',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s ease',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(212, 250, 53, 0.4)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)' }}
      />

      {/* Right-side result count + clear */}
      <div
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {hasQuery && resultCount !== undefined && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: resultCount === 0 ? 'var(--color-coral-red)' : 'var(--color-fog)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {resultCount}
          </span>
        )}

        {hasQuery && (
          <button
            type="button"
            onClick={() => onChange('')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: 'var(--color-fog)',
              cursor: 'pointer',
              padding: 0,
            }}
            aria-label="Clear search"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Highlighted Text ────────────────────────────────────────────────

interface HighlightProps {
  text: string
  query: string
  style?: CSSProperties
}

export function Highlight({ text, query, style }: HighlightProps) {
  const segments = highlightMatch(text, query)

  return (
    <span style={style}>
      {segments.map((seg, i) =>
        seg.highlighted ? (
          <mark
            key={i}
            style={{
              background: 'rgba(212, 250, 53, 0.25)',
              color: 'inherit',
              borderRadius: '2px',
              padding: '0 1px',
            }}
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </span>
  )
}

// ─── No Results Message ──────────────────────────────────────────────

interface NoResultsProps {
  query: string
  entityName?: string
}

export function NoResults({ query, entityName = 'results' }: NoResultsProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 20px',
        color: 'var(--color-fog)',
      }}
    >
      <Search size={28} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-mist)', marginBottom: '6px' }}>
        No {entityName} found
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-ash)' }}>
        No matches for &ldquo;<strong style={{ color: 'var(--color-paper)' }}>{query}</strong>&rdquo;.
        Try a different spelling or fewer words.
      </div>
    </div>
  )
}
