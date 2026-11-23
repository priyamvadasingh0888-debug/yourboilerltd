'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  MapPin,
  Clock,
  Phone,
  Search,
  Filter,
  Play,
  CheckCircle2,
  ArrowRight,
  Flame,
  Navigation,
  ShieldCheck,
  ChevronRight,
  ArrowLeft
} from 'lucide-react'
import { format, parseISO, isToday } from 'date-fns'
import { BottomSheet } from '@/components/engineer/bottom-sheet'
import { PullToRefresh } from '@/components/engineer/pull-to-refresh'
import { useRealtimeJobs } from '@/hooks/use-realtime-jobs'
import { saveEngineerJobProgress } from '@/app/admin/jobs/actions'

interface Props {
  initialJobs: any[]
  engineerId?: string | null
}

export function JobsListClient({ initialJobs, engineerId }: Props) {
  const router = useRouter()
  const { jobs, setJobs } = useRealtimeJobs({ initialJobs, engineerId: engineerId ?? undefined })
  const [tab, setTab] = useState<'all' | 'today' | 'active' | 'completed'>('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedJob, setSelectedJob] = useState<any | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Tab filter
      if (tab === 'today') {
        if (!job.scheduled_start) return true
        try {
          if (!isToday(parseISO(job.scheduled_start))) return false
        } catch {
          return true
        }
      } else if (tab === 'active') {
        if (job.status === 'completed' || job.status === 'cancelled') return false
      } else if (tab === 'completed') {
        if (job.status !== 'completed') return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchNum = job.job_number?.toLowerCase().includes(q)
        const matchDesc = job.description?.toLowerCase().includes(q)
        const matchCustomer = job.customer?.name?.toLowerCase().includes(q)
        const matchAddress = job.property?.address_line1?.toLowerCase().includes(q)
        const matchPostcode = job.property?.postcode?.toLowerCase().includes(q)
        if (!matchNum && !matchDesc && !matchCustomer && !matchAddress && !matchPostcode) {
          return false
        }
      }

      return true
    })
  }, [jobs, tab, searchQuery])

  const toggleJobStatus = async (jobId: string, newStatus: 'in_progress' | 'completed') => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j))
    )
    if (selectedJob && selectedJob.id === jobId) {
      setSelectedJob({ ...selectedJob, status: newStatus })
    }

    try {
      await saveEngineerJobProgress(jobId, { status: newStatus })
      router.refresh()
    } catch (err) {
      console.error('Failed to update job status:', err)
    }
  }

  const handleOpenJob = (job: any) => {
    setSelectedJob(job)
    setIsSheetOpen(true)
  }

  return (
    <PullToRefresh>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#111215', margin: 0 }}>
              Operative Workload
            </h1>
            <p style={{ fontSize: '12px', color: '#747b86', margin: '2px 0 0 0' }}>
              {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} listed
            </p>
          </div>

          <Link
            href="/engineer"
            className="neo-btn-outline"
            style={{ padding: '6px 12px', fontSize: '11px' }}
          >
            <ArrowLeft size={12} /> Dashboard
          </Link>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            color="#747b86"
            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search by postcode, job #, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px 12px 40px',
              borderRadius: '99px',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              background: '#ffffff',
              fontSize: '13px',
              color: '#111215',
              outline: 'none',
              boxSizing: 'border-box',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
            }}
          />
        </div>

        {/* Filter Pills */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '2px',
            scrollbarWidth: 'none',
          }}
        >
          {(
            [
              { id: 'today', label: "Today's Jobs" },
              { id: 'active', label: 'In Progress' },
              { id: 'completed', label: 'Completed' },
              { id: 'all', label: 'All Jobs' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: '7px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '99px',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: tab === t.id ? '#111215' : '#ffffff',
                color: tab === t.id ? '#ffffff' : '#747b86',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: tab === t.id ? '#111215' : 'rgba(0, 0, 0, 0.08)',
                boxShadow: tab === t.id ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Jobs List (Compact Tappable Rows, no wide tables!) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredJobs.length === 0 ? (
            <div
              className="neo-card"
              style={{ textAlign: 'center', padding: '40px 16px', color: '#747b86' }}
            >
              <CheckCircle2 size={32} color="#16a34a" style={{ margin: '0 auto 10px auto' }} />
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111215' }}>
                No jobs found
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                {searchQuery ? 'Try clearing your search terms' : 'No jobs in this category'}
              </div>
            </div>
          ) : (
            filteredJobs.map((job) => {
              const isCompleted = job.status === 'completed'
              const isInProgress = job.status === 'in_progress'

              return (
                <div
                  key={job.id}
                  onClick={() => handleOpenJob(job)}
                  className="neo-card"
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    border: isInProgress ? '1.5px solid #111215' : undefined,
                    boxShadow: isInProgress ? '0 4px 16px rgba(0, 0, 0, 0.07)' : undefined,
                  }}
                >
                  {/* Top: Header, Icon, Status */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: isInProgress ? '#111215' : '#f0f2f5',
                          color: isInProgress ? '#d4fa35' : '#747b86',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '1px',
                        }}
                      >
                        <Flame size={15} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#111215',
                            lineHeight: 1.35,
                            wordBreak: 'break-word',
                          }}
                        >
                          {job.description || job.job_type?.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: '11px', color: '#747b86', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                          {job.job_number}
                        </div>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0, paddingTop: '1px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '99px',
                          whiteSpace: 'nowrap',
                          background: isCompleted
                            ? 'rgba(34, 197, 94, 0.12)'
                            : isInProgress
                            ? '#111215'
                            : '#ffffff',
                          color: isCompleted
                            ? '#16a34a'
                            : isInProgress
                            ? '#d4fa35'
                            : '#52525b',
                          border: isCompleted
                            ? '1px solid rgba(34, 197, 94, 0.25)'
                            : isInProgress
                            ? '1px solid #111215'
                            : '1px solid rgba(0, 0, 0, 0.08)',
                        }}
                      >
                        {isInProgress && (
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: '#d4fa35',
                            }}
                          />
                        )}
                        {isCompleted ? 'Done' : isInProgress ? 'In Progress' : 'Scheduled'}
                      </span>
                    </div>
                  </div>

                  {/* Address and Postcode */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#52525b' }}>
                    <MapPin size={13} color="#747b86" style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 500 }}>
                      {job.property?.address_line1 || 'Property'}, <strong>{job.property?.postcode}</strong>
                    </span>
                  </div>

                  {/* Time and Customer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#747b86', borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={12} />
                      <span>{job.scheduled_start ? format(parseISO(job.scheduled_start), 'HH:mm') : '09:30'} · {job.duration_minutes || 60}m</span>
                    </div>

                    <span style={{ fontWeight: 600, color: '#111215' }}>
                      {job.customer?.name || 'Customer'}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Slide-Up Bottom Sheet for Job Detail */}
        <BottomSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          title={selectedJob?.job_number || 'Job Details'}
          subtitle={selectedJob?.description || selectedJob?.job_type?.replace(/_/g, ' ')}
        >
          {selectedJob && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: '#f8f9fb',
                  borderRadius: '14px',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#747b86' }}>Status</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#111215', textTransform: 'capitalize' }}>
                    {selectedJob.status.replace(/_/g, ' ')}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedJob.status !== 'in_progress' && selectedJob.status !== 'completed' && (
                    <button
                      type="button"
                      className="neo-btn-black"
                      style={{ padding: '8px 14px', fontSize: '12px' }}
                      onClick={() => toggleJobStatus(selectedJob.id, 'in_progress')}
                    >
                      <Play size={13} /> Start Work
                    </button>
                  )}
                  {selectedJob.status === 'in_progress' && (
                    <button
                      type="button"
                      className="neo-btn-lime"
                      style={{ padding: '8px 14px', fontSize: '12px' }}
                      onClick={() => toggleJobStatus(selectedJob.id, 'completed')}
                    >
                      <CheckCircle2 size={13} /> Mark Completed
                    </button>
                  )}
                </div>
              </div>

              {/* Address */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#f8f9fb',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <MapPin size={18} color="#747b86" />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111215' }}>
                      {selectedJob.property?.address_line1}
                    </div>
                    <div style={{ fontSize: '11px', color: '#747b86' }}>
                      {selectedJob.property?.postcode} · {selectedJob.property?.city || 'Manchester'}
                    </div>
                  </div>
                </div>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${selectedJob.property?.address_line1}, ${selectedJob.property?.postcode}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="neo-btn-black"
                  style={{ padding: '8px 12px', fontSize: '11px' }}
                >
                  Google Maps
                </a>
              </div>

              {/* Customer */}
              {selectedJob.customer && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '12px',
                    background: '#f8f9fb',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111215' }}>
                      {selectedJob.customer.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#747b86' }}>
                      {selectedJob.customer.phone || 'No phone'}
                    </div>
                  </div>

                  {selectedJob.customer.phone && (
                    <a
                      href={`tel:${selectedJob.customer.phone}`}
                      className="neo-btn-lime"
                      style={{ padding: '8px 14px', fontSize: '11px' }}
                    >
                      <Phone size={12} /> Call
                    </a>
                  )}
                </div>
              )}

              {/* Action Links */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <Link
                  href={`/engineer/jobs/${selectedJob.id}`}
                  className="neo-btn-outline"
                  style={{ flex: 1, padding: '12px', textAlign: 'center', fontSize: '13px' }}
                >
                  Full Job Screen <ArrowRight size={14} />
                </Link>
                <Link
                  href="/admin/certificates"
                  className="neo-btn-black"
                  style={{ flex: 1, padding: '12px', textAlign: 'center', fontSize: '13px' }}
                >
                  <ShieldCheck size={14} /> Create CP12
                </Link>
              </div>
            </div>
          )}
        </BottomSheet>
      </div>
    </PullToRefresh>
  )
}
