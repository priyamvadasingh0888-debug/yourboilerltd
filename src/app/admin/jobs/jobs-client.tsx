'use client'

import Link from 'next/link'
import { useState, useMemo, useCallback } from 'react'
import { Plus, Search, X, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import {
  JOB_TYPE_LABELS, STATUS_LABELS,
  type JobStatus
} from '@/types/database'
import { useUniversalSearch, highlightMatch } from '@/hooks/use-universal-search'

interface Props {
  jobs: any[]
  engineers: any[]
  totalCount: number
  pageSize: number
  currentPage: number
  filters: {
    status: string
    priority: string
    jobType: string
    search: string
    engineerId: string
    from: string
    to: string
  }
}

const FILTER_TABS = [
  { id: 'all', label: 'All Jobs' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'completed', label: 'Completed' },
  { id: 'unassigned', label: 'Unassigned' },
]

/* ── Highlight helper ─────────────────────────────────────────────── */
function HL({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text || ''}</>
  const segments = highlightMatch(text, query)
  return (
    <>
      {segments.map((seg, i) =>
        seg.highlighted ? (
          <mark key={i} style={{ background: 'rgba(212, 250, 53, 0.25)', color: 'inherit', borderRadius: '2px', padding: '0 1px' }}>{seg.text}</mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  )
}

export function JobsClient({ jobs, totalCount }: Props) {
  const [activeTab, setActiveTab] = useState('all')

  const tabFilter = useCallback(
    (item: any) => {
      if (activeTab === 'in_progress' && item.status !== 'in_progress') return false
      if (activeTab === 'scheduled' && item.status !== 'scheduled') return false
      if (activeTab === 'completed' && item.status !== 'completed') return false
      if (activeTab === 'unassigned' && item.engineer_id) return false
      return true
    },
    [activeTab],
  )

  const { query, setQuery, results, isSearching, hasQuery, noResults, resultCount } = useUniversalSearch({
    items: jobs,
    fields: [
      { accessor: (j: any) => j.job_number || '', weight: 2 },
      { accessor: (j: any) => j.customer?.name || '', weight: 1.8 },
      { accessor: (j: any) => j.property?.address_line1 || '', weight: 1.5 },
      { accessor: (j: any) => j.property?.postcode || '', weight: 1.5 },
      { accessor: (j: any) => j.description || '', weight: 1 },
      { accessor: (j: any) => JOB_TYPE_LABELS[j.job_type as keyof typeof JOB_TYPE_LABELS] || j.job_type || '', weight: 1 },
      { accessor: (j: any) => j.engineer?.profile?.full_name || '', weight: 1.2 },
      { accessor: (j: any) => j.property?.city || '', weight: 0.8 },
    ],
    debounceMs: 200,
    filterPredicate: tabFilter,
  })

  const filteredJobs = results.map(r => r.item)

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Jobs</h1>
          <p className="page-subtitle">
            {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} listed
          </p>
        </div>
        <div className="mobile-hide">
          <Link href="/admin/jobs/new" className="btn btn-primary">
            <Plus size={14} /> New Job
          </Link>
        </div>
      </div>

      {/* ── Universal Search Bar ────────────────────────────────── */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        {isSearching ? (
          <Loader2 size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-acid-lime)', animation: 'spin 0.8s linear infinite' }} />
        ) : (
          <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-fog)' }} />
        )}
        <input
          type="text"
          placeholder="Search jobs by number, customer, address, postcode, engineer…"
          value={query}
          onChange={e => setQuery(e.target.value)}
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
          }}
        />
        {/* Right side: count + clear */}
        <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {hasQuery && (
            <span style={{ fontSize: '11px', fontWeight: 600, color: resultCount === 0 ? 'var(--color-coral-red)' : 'var(--color-fog)', fontFamily: 'var(--font-mono)' }}>
              {resultCount}
            </span>
          )}
          {hasQuery && (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'var(--color-fog)', cursor: 'pointer', padding: 0 }}
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* App-like Horizontal Filter Chips */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {FILTER_TABS.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '99px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: active ? 'var(--color-acid-lime)' : 'var(--surface-card)',
                color: active ? '#0b0b0b' : 'var(--color-mist)',
                boxShadow: active ? '0 2px 8px rgba(214, 254, 81, 0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ─── DESKTOP TABLE VIEW ─── */}
      <div className="desktop-only table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Job #</th>
              <th>Customer</th>
              <th>Property</th>
              <th>Type</th>
              <th>Engineer</th>
              <th>Scheduled</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {noResults ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--color-fog)' }}>
                  <Search size={28} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-mist)', marginBottom: '6px' }}>No jobs found</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-ash)' }}>
                    No matches for &ldquo;<strong style={{ color: 'var(--color-paper)' }}>{query}</strong>&rdquo;. Try a different term.
                  </div>
                </td>
              </tr>
            ) : filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-ash)', padding: '36px' }}>
                  No jobs found matching criteria
                </td>
              </tr>
            ) : (
              filteredJobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <Link href={`/admin/jobs/${job.id}`} style={{ color: 'var(--color-paper)', fontWeight: 600 }}>
                      <HL text={job.job_number} query={query} />
                    </Link>
                  </td>
                  <td><HL text={job.customer?.name || ''} query={query} /></td>
                  <td>
                    <HL text={job.property?.address_line1 || ''} query={query} />, <strong><HL text={job.property?.postcode || ''} query={query} /></strong>
                  </td>
                  <td style={{ fontSize: '12px' }}>
                    <HL text={JOB_TYPE_LABELS[job.job_type as keyof typeof JOB_TYPE_LABELS] || job.job_type} query={query} />
                  </td>
                  <td>
                    {job.engineer ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div className="engineer-dot" style={{ background: job.engineer.schedule_colour }} />
                        <span style={{ fontSize: '13px' }}><HL text={job.engineer.profile?.full_name || ''} query={query} /></span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-ash)', fontSize: '12px' }}>Unassigned</span>
                    )}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--color-fog)' }}>
                    {job.scheduled_start ? format(parseISO(job.scheduled_start), 'dd/MM/yyyy HH:mm') : '—'}
                  </td>
                  <td>
                    <span className={`badge badge-${job.status}`}>
                      {STATUS_LABELS[job.status as keyof typeof STATUS_LABELS] || job.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── MOBILE CARD VIEW ─── */}
      <div className="mobile-only-flex" style={{ flexDirection: 'column', gap: '10px' }}>
        {noResults ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', background: 'var(--surface-card)', borderRadius: '14px' }}>
            <Search size={24} style={{ margin: '0 auto 10px', opacity: 0.4, color: 'var(--color-fog)' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-mist)' }}>No jobs found</div>
            <div style={{ fontSize: '11px', color: 'var(--color-ash)', marginTop: '4px' }}>
              No matches for &ldquo;{query}&rdquo;
            </div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', background: 'var(--surface-card)', borderRadius: '14px', color: 'var(--color-fog)', fontSize: '13px' }}>
            No jobs found
          </div>
        ) : (
          filteredJobs.map((job) => (
            <Link
              key={job.id}
              href={`/admin/jobs/${job.id}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '14px',
                borderRadius: '14px',
                background: 'var(--surface-card)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-paper)' }}>
                  <HL text={job.job_number} query={query} />
                </span>
                <span className={`badge badge-${job.status}`}>
                  {STATUS_LABELS[job.status as keyof typeof STATUS_LABELS] || job.status}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-mist)', lineHeight: 1.3 }}>
                <div><HL text={job.customer?.name || ''} query={query} /></div>
                <div style={{ fontSize: '11px', color: 'var(--color-fog)', marginTop: '2px' }}>
                  <HL text={job.property?.address_line1 || ''} query={query} />, <strong><HL text={job.property?.postcode || ''} query={query} /></strong>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-fog)', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span>{job.scheduled_start ? format(parseISO(job.scheduled_start), 'dd MMM, HH:mm') : 'Unscheduled'}</span>
                <span>{job.engineer?.profile?.full_name || 'Unassigned'}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
