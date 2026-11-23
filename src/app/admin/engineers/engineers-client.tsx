'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  ShieldCheck,
  ShieldAlert,
  Phone,
  UserCheck,
  Clock,
  Briefcase,
  ChevronRight,
  X,
  CheckCircle2,
  MapPin,
  Calendar,
  Trash2,
} from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import {
  JOB_TYPE_LABELS,
  type JobType,
  type AvailabilityStatus,
} from '@/types/database'
import { useUniversalSearch } from '@/hooks/use-universal-search'
import { SearchInput, Highlight, NoResults } from '@/components/ui/search-input'
import { assignEngineer } from '@/app/admin/jobs/actions'
import { deleteEngineer } from './actions'
import { ConfirmModal } from '@/components/ui/confirm-modal'

export interface EngineerWithProfileRow {
  id: string
  profile_id?: string
  gas_safe_number: string | null
  gas_safe_expiry: string | null
  phone: string | null
  specialties: string[]
  availability_status: AvailabilityStatus
  schedule_colour: string
  category?: 'in_house' | 'subcontractor' | null
  qualifications?: string[] | null
  license_number?: string | null
  created_at?: string
  updated_at?: string
  profile?: {
    full_name: string | null
    email: string | null
    phone: string | null
  } | null
}

export function EngineersClient({
  engineers,
  unassignedJobs = [],
}: {
  engineers: EngineerWithProfileRow[]
  unassignedJobs?: any[]
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<
    'all' | 'available' | 'on_job' | 'off_duty' | 'expiring_gas' | 'in_house' | 'subcontractor'
  >('all')

  const [assignModalEngineer, setAssignModalEngineer] = useState<EngineerWithProfileRow | null>(null)
  const [unassignedList, setUnassignedList] = useState<any[]>(unassignedJobs)
  const [isAssigning, setIsAssigning] = useState<string | null>(null)
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EngineerWithProfileRow | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleDeleteEngineer = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await deleteEngineer(deleteTarget.id)
      if (res?.error) {
        alert(res.error)
      } else {
        setDeleteTarget(null)
        router.refresh()
      }
    } catch {
      alert('Failed to delete engineer')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleAssignJob = async (jobId: string, engineerId: string, jobNumber: string) => {
    setIsAssigning(jobId)
    setAssignSuccess(null)
    try {
      const res = await assignEngineer(jobId, engineerId)
      if (res?.error) {
        alert(`Failed to assign: ${res.error}`)
      } else {
        setUnassignedList(prev => prev.filter(j => j.id !== jobId))
        setAssignSuccess(`Job ${jobNumber} successfully assigned!`)
        router.refresh()
      }
    } catch {
      alert('An unexpected error occurred while assigning the job')
    } finally {
      setIsAssigning(null)
    }
  }

  const now = useMemo(() => new Date(), [])

  const stats = useMemo(() => {
    let available = 0
    let onJob = 0
    let offDuty = 0
    let gasAlerts = 0
    let inHouse = 0
    let subcontractors = 0

    engineers.forEach(eng => {
      if (eng.availability_status === 'available') available++
      if (eng.availability_status === 'on_job') onJob++
      if (eng.availability_status === 'off_duty') offDuty++
      if (eng.category === 'subcontractor') subcontractors++
      else inHouse++

      if (eng.gas_safe_expiry) {
        const exp = parseISO(eng.gas_safe_expiry)
        const isExp = exp < now
        const days = differenceInDays(exp, now)
        if (isExp || (days >= 0 && days <= 60)) {
          gasAlerts++
        }
      }
    })

    return { total: engineers.length, available, onJob, offDuty, gasAlerts, inHouse, subcontractors }
  }, [engineers, now])

  const filterPredicate = useCallback(
    (eng: EngineerWithProfileRow) => {
      const gasExpiry = eng.gas_safe_expiry ? parseISO(eng.gas_safe_expiry) : null
      const isExpired = gasExpiry ? gasExpiry < now : false
      const daysUntilExpiry = gasExpiry ? differenceInDays(gasExpiry, now) : null
      const isExpiringSoon =
        gasExpiry && !isExpired && daysUntilExpiry !== null && daysUntilExpiry <= 60

      if (filter === 'available' && eng.availability_status !== 'available') return false
      if (filter === 'on_job' && eng.availability_status !== 'on_job') return false
      if (filter === 'off_duty' && eng.availability_status !== 'off_duty') return false
      if (filter === 'expiring_gas' && !isExpired && !isExpiringSoon) return false
      if (filter === 'in_house' && eng.category === 'subcontractor') return false
      if (filter === 'subcontractor' && eng.category !== 'subcontractor') return false
      return true
    },
    [filter, now],
  )

  const {
    query,
    setQuery,
    results,
    isSearching,
    hasQuery,
    noResults,
    resultCount,
  } = useUniversalSearch<EngineerWithProfileRow>({
    items: engineers,
    fields: [
      { accessor: e => e.profile?.full_name || '', weight: 2.5 },
      { accessor: e => e.profile?.email || '', weight: 2.0 },
      { accessor: e => e.gas_safe_number || '', weight: 2.2 },
      { accessor: e => e.phone || e.profile?.phone || '', weight: 1.8 },
      {
        accessor: e =>
          (e.specialties || [])
            .map(s => `${JOB_TYPE_LABELS[s as JobType] || s} ${s}`)
            .join(' '),
        weight: 1.2,
      },
      { accessor: e => e.availability_status || '', weight: 0.8 },
      { accessor: e => e.id || '', weight: 0.8 },
    ],
    debounceMs: 200,
    filterPredicate,
  })

  const filteredEngineers = results.map(r => r.item)

  const getStatusBadge = (status: AvailabilityStatus) => {
    switch (status) {
      case 'available':
        return (
          <span className="badge badge-available">
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'currentColor',
                display: 'inline-block',
                marginRight: '5px',
              }}
            />
            Available
          </span>
        )
      case 'on_job':
        return (
          <span className="badge badge-on_job">
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'currentColor',
                display: 'inline-block',
                marginRight: '5px',
              }}
            />
            On Job
          </span>
        )
      case 'off_duty':
        return (
          <span className="badge badge-off_duty">
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'currentColor',
                display: 'inline-block',
                marginRight: '5px',
              }}
            />
            Off Duty
          </span>
        )
      default:
        return <span className="badge">{status}</span>
    }
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Engineers</h1>
          <p className="page-subtitle">
            {engineers.length} field engineers registered
          </p>
        </div>
        <Link href="/admin/engineers/new" className="btn btn-primary">
          <Plus size={14} /> Add Engineer
        </Link>
      </div>

      {/* Metrics Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--spacing-3)',
          marginBottom: 'var(--spacing-5)',
        }}
      >
        <div className="card" style={{ padding: '14px 16px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-fog)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '4px',
            }}
          >
            Total Field Staff
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--color-paper)',
            }}
          >
            {stats.total}
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-fog)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <UserCheck size={12} style={{ color: 'var(--color-pulse-green)' }} />
            Available Now
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--color-pulse-green)',
            }}
          >
            {stats.available}
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-fog)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Clock size={12} style={{ color: '#6366f1' }} />
            On Job
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#818cf8',
            }}
          >
            {stats.onJob}
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-fog)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldAlert
              size={12}
              style={{
                color:
                  stats.gasAlerts > 0
                    ? 'var(--color-coral-red)'
                    : 'var(--color-fog)',
              }}
            />
            Gas Safe Alerts
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color:
                stats.gasAlerts > 0
                  ? 'var(--color-coral-red)'
                  : 'var(--color-paper)',
            }}
          >
            {stats.gasAlerts}
          </div>
        </div>
      </div>

      {/* Universal Search Input */}
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search by engineer name, email, gas safe number, or specialty…"
        isSearching={isSearching}
        resultCount={resultCount}
        hasQuery={hasQuery}
        style={{ marginBottom: '12px' }}
      />

      {/* Filter Chips */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '12px',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {(
          [
            { id: 'all', label: `All (${engineers.length})` },
            { id: 'in_house', label: `In-House (${stats.inHouse})` },
            { id: 'subcontractor', label: `Subcontractors (${stats.subcontractors})` },
            { id: 'available', label: `Available (${stats.available})` },
            { id: 'on_job', label: `On Job (${stats.onJob})` },
            { id: 'off_duty', label: `Off Duty (${stats.offDuty})` },
            {
              id: 'expiring_gas',
              label: `Gas Safe Due/Expired (${stats.gasAlerts})`,
            },
          ] as const
        ).map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`btn ${filter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '99px', whiteSpace: 'nowrap' }}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Desktop Engineers Table */}
      <div className="desktop-only table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Engineer</th>
              <th>Status</th>
              <th>Gas Safe Registration</th>
              <th>Contact</th>
              <th>Specialties</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {noResults ? (
              <tr>
                <td colSpan={6}>
                  <NoResults query={query} entityName="engineers" />
                </td>
              </tr>
            ) : filteredEngineers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    textAlign: 'center',
                    padding: '48px',
                    color: 'var(--color-fog)',
                  }}
                >
                  No engineers found matching your search and filter criteria.
                </td>
              </tr>
            ) : (
              filteredEngineers.map(eng => {
                const gasExpiry = eng.gas_safe_expiry
                  ? parseISO(eng.gas_safe_expiry)
                  : null
                const isExpired = gasExpiry ? gasExpiry < now : false
                const daysUntilExpiry = gasExpiry
                  ? differenceInDays(gasExpiry, now)
                  : null
                const isExpiringSoon =
                  gasExpiry &&
                  !isExpired &&
                  daysUntilExpiry !== null &&
                  daysUntilExpiry <= 60

                const displayName = eng.profile?.full_name || 'Unnamed Engineer'
                const displayEmail = eng.profile?.email || '—'
                const displayPhone = eng.phone || eng.profile?.phone || '—'

                return (
                  <tr key={eng.id}>
                    {/* Engineer profile with colour badge */}
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: eng.schedule_colour || '#6366f1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#ffffff',
                            flexShrink: 0,
                          }}
                        >
                          {displayName[0]?.toUpperCase() ?? 'E'}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Link
                              href={`/admin/engineers/${eng.id}`}
                              style={{
                                fontWeight: 600,
                                color: 'var(--color-paper)',
                                textDecoration: 'none',
                              }}
                            >
                              <Highlight text={displayName} query={query} />
                            </Link>
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 600,
                                background: eng.category === 'subcontractor' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                                color: eng.category === 'subcontractor' ? '#fbbf24' : '#a5b4fc',
                                border: eng.category === 'subcontractor' ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
                              }}
                            >
                              {eng.category === 'subcontractor' ? 'Subcontractor' : 'In-House'}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--color-fog)',
                              marginTop: '2px',
                            }}
                          >
                            <Highlight text={displayEmail} query={query} />
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status badge */}
                    <td>{getStatusBadge(eng.availability_status)}</td>

                    {/* Gas Safe status */}
                    <td>
                      {eng.gas_safe_number ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          {isExpired ? (
                            <ShieldAlert
                              size={16}
                              style={{
                                color: 'var(--color-coral-red)',
                                flexShrink: 0,
                              }}
                            />
                          ) : isExpiringSoon ? (
                            <ShieldAlert
                              size={16}
                              style={{ color: '#fbbf24', flexShrink: 0 }}
                            />
                          ) : (
                            <ShieldCheck
                              size={16}
                              style={{
                                color: 'var(--color-pulse-green)',
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <div>
                            <div
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '13px',
                                fontWeight: 600,
                                color: 'var(--color-paper)',
                              }}
                            >
                              <Highlight text={eng.gas_safe_number} query={query} />
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: isExpired
                                  ? 'var(--color-coral-red)'
                                  : isExpiringSoon
                                    ? '#fbbf24'
                                    : 'var(--color-fog)',
                              }}
                            >
                              {gasExpiry
                                ? isExpired
                                  ? `Expired ${format(gasExpiry, 'dd/MM/yyyy')}`
                                  : isExpiringSoon
                                    ? `Expires in ${daysUntilExpiry}d`
                                    : `Valid to ${format(gasExpiry, 'dd/MM/yyyy')}`
                                : 'No expiry date'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: '12px',
                            color: 'var(--color-ash)',
                          }}
                        >
                          Not registered
                        </span>
                      )}
                    </td>

                    {/* Contact */}
                    <td>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-paper)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {displayPhone !== '—' ? (
                          <a
                            href={`tel:${displayPhone}`}
                            style={{
                              color: 'var(--color-mist)',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <Phone size={11} style={{ color: 'var(--color-fog)' }} />
                            <Highlight text={displayPhone} query={query} />
                          </a>
                        ) : (
                          '—'
                        )}
                      </div>
                    </td>

                    {/* Specialties */}
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          gap: '4px',
                          flexWrap: 'wrap',
                          maxWidth: '260px',
                        }}
                      >
                        {eng.specialties?.length > 0 ? (
                          eng.specialties.slice(0, 3).map(s => (
                            <span
                              key={s}
                              className="badge"
                              style={{
                                fontSize: '11px',
                                padding: '2px 7px',
                                background: 'rgba(255,255,255,0.06)',
                                color: 'var(--color-fog)',
                              }}
                            >
                              <Highlight text={JOB_TYPE_LABELS[s as JobType] ?? s.replace(/_/g, ' ')} query={query} />
                            </span>
                          ))
                        ) : (
                          <span
                            style={{
                              fontSize: '12px',
                              color: 'var(--color-ash)',
                            }}
                          >
                            General
                          </span>
                        )}
                        {eng.specialties?.length > 3 && (
                          <span
                            className="badge"
                            style={{
                              fontSize: '10px',
                              padding: '2px 5px',
                              background: 'rgba(255,255,255,0.06)',
                              color: 'var(--color-fog)',
                            }}
                          >
                            +{eng.specialties.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setAssignModalEngineer(eng)
                            setAssignSuccess(null)
                          }}
                          className="btn btn-secondary"
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px',
                            gap: '4px',
                          }}
                          title="Assign existing job to engineer"
                        >
                          <Briefcase size={12} /> Assign
                        </button>
                        <Link
                          href={`/admin/engineers/${eng.id}`}
                          className="btn btn-ghost"
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px',
                            gap: '4px',
                          }}
                        >
                          View <ChevronRight size={12} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(eng)}
                          className="btn btn-ghost"
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            color: 'var(--color-coral-red)',
                          }}
                          title="Delete engineer"
                          aria-label={`Delete ${eng.profile?.full_name || 'engineer'}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List (Minimal, Native Phone App View) */}
      <div className="mobile-only-flex" style={{ flexDirection: 'column', gap: '10px' }}>
        {noResults ? (
          <NoResults query={query} entityName="engineers" />
        ) : filteredEngineers.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', background: 'var(--surface-card)', borderRadius: '14px', color: 'var(--color-fog)', fontSize: '13px' }}>
            No engineers found
          </div>
        ) : (
          filteredEngineers.map(eng => {
            const displayName = eng.profile?.full_name || 'Unnamed Engineer'
            const displayPhone = eng.phone || eng.profile?.phone || ''

            return (
              <Link
                key={eng.id}
                href={`/admin/engineers/${eng.id}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: 'var(--surface-card)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  textDecoration: 'none',
                  color: 'inherit',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: eng.schedule_colour || '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {displayName[0]?.toUpperCase() ?? 'E'}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-paper)' }}>
                      <Highlight text={displayName} query={query} />
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        background: eng.category === 'subcontractor' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                        color: eng.category === 'subcontractor' ? '#fbbf24' : '#a5b4fc',
                        border: eng.category === 'subcontractor' ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
                      }}
                    >
                      {eng.category === 'subcontractor' ? 'Sub' : 'In-House'}
                    </span>
                  </div>
                  {getStatusBadge(eng.availability_status)}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--color-fog)' }}>
                  {eng.gas_safe_number ? (
                    <span>Gas Safe: <strong style={{ color: 'var(--color-paper)' }}><Highlight text={eng.gas_safe_number} query={query} /></strong></span>
                  ) : (
                    <span>No Gas Safe registration</span>
                  )}
                  {displayPhone && (
                    <span style={{ marginLeft: '8px' }}>· <Highlight text={displayPhone} query={query} /></span>
                  )}
                </div>

                {eng.specialties?.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {eng.specialties.slice(0, 3).map(s => (
                      <span key={s} className="badge" style={{ fontSize: '10px', padding: '1px 6px' }}>
                        <Highlight text={JOB_TYPE_LABELS[s as JobType] ?? s.replace(/_/g, ' ')} query={query} />
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            )
          })
        )}
      </div>

      {/* ── Assign Job Modal ── */}
      {assignModalEngineer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setAssignModalEngineer(null)}
        >
          <div
            className="card"
            style={{
              width: '560px',
              maxWidth: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              gap: '16px',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-paper)' }}>
                  Assign Job to {assignModalEngineer.profile?.full_name || 'Engineer'}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-fog)', marginTop: '2px' }}>
                  Select an unassigned job from the queue to dispatch to this engineer.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setAssignModalEngineer(null)}
                style={{ padding: '6px' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Success alert */}
            {assignSuccess && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  background: 'rgba(39, 166, 68, 0.15)',
                  border: '1px solid rgba(39, 166, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-pulse-green)',
                  fontSize: '13px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{assignSuccess}</span>
              </div>
            )}

            {/* Unassigned Jobs List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '180px', maxHeight: '420px' }}>
              {unassignedList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--color-fog)' }}>
                  <Briefcase size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p style={{ fontWeight: 600, color: 'var(--color-paper)', marginBottom: '4px' }}>
                    No unassigned jobs currently in queue
                  </p>
                  <p style={{ fontSize: '13px', marginBottom: '16px' }}>
                    All current jobs have already been dispatched to engineers.
                  </p>
                  <Link
                    href={`/admin/jobs/new?engineer_id=${assignModalEngineer.id}`}
                    className="btn btn-primary"
                    onClick={() => setAssignModalEngineer(null)}
                  >
                    <Plus size={14} /> Create New Job for {assignModalEngineer.profile?.full_name || 'Engineer'}
                  </Link>
                </div>
              ) : (
                unassignedList.map(job => (
                  <div
                    key={job.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: 'var(--color-charcoal)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13px', color: 'var(--color-paper)' }}>
                          {job.job_number}
                        </span>
                        <span className="badge" style={{ fontSize: '10px' }}>
                          {JOB_TYPE_LABELS[job.job_type as JobType] ?? job.job_type}
                        </span>
                        <span className={`badge badge-${job.priority || 'medium'}`} style={{ fontSize: '10px' }}>
                          {job.priority}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--color-paper)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {job.customer?.name || 'Customer'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-fog)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <MapPin size={11} /> {job.property?.address_line1}, {job.property?.postcode}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isAssigning === job.id}
                      onClick={() => handleAssignJob(job.id, assignModalEngineer.id, job.job_number)}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '12px', flexShrink: 0 }}
                    >
                      {isAssigning === job.id ? 'Assigning...' : 'Assign'}
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
              <Link
                href={`/admin/jobs/new?engineer_id=${assignModalEngineer.id}`}
                className="btn btn-ghost"
                style={{ fontSize: '13px' }}
                onClick={() => setAssignModalEngineer(null)}
              >
                <Plus size={14} /> Create a new job instead
              </Link>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAssignModalEngineer(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteEngineer}
          title="Delete Engineer"
          message={`Are you sure you want to delete ${deleteTarget.profile?.full_name || 'this engineer'}? This will unassign any active jobs and permanently remove their operative account.`}
          confirmText="Confirm Delete"
          loading={deleteLoading}
        />
      )}
    </div>
  )
}
