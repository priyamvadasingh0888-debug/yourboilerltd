'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  MapPin,
  Clock,
  Phone,
  Play,
  CheckCircle2,
  ArrowRight,
  Flame,
  Check,
  Plus,
  Navigation,
  ShieldCheck,
  X,
  ChevronRight,
  Wrench,
  Sparkles,
  Sun,
  Moon,
  Zap,
  BellRing,
  CalendarDays,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { BottomSheet } from '@/components/engineer/bottom-sheet'
import { PullToRefresh } from '@/components/engineer/pull-to-refresh'
import { useRealtimeJobs } from '@/hooks/use-realtime-jobs'
import { InstallPwaHeaderButton } from '@/components/engineer/pwa-install-prompt'
import { convertReminderToJobAction } from '@/app/admin/recurring/actions'
import { saveEngineerJobProgress } from '@/app/admin/jobs/actions'
import type { ScheduleTimeSlot, JobType } from '@/types/database'

interface Props {
  initialJobs: any[]
  initialReminders?: any[]
  engineerId?: string | null
  engineerName?: string
}

export function EngineerDashboardClient({ initialJobs, initialReminders = [], engineerId, engineerName }: Props) {
  const router = useRouter()
  const {
    jobs,
    setJobs,
    newJobAlert,
    clearAlert,
    isConnected,
  } = useRealtimeJobs({ initialJobs, engineerId: engineerId ?? undefined })

  const [availability, setAvailability] = useState<'available' | 'on_job' | 'off_duty'>('available')

  // Slide-up sheet state for job inspection
  const [selectedJob, setSelectedJob] = useState<any | null>(null)
  const [isJobSheetOpen, setIsJobSheetOpen] = useState(false)

  // Quick Action FAB Sheet state
  const [isFabSheetOpen, setIsFabSheetOpen] = useState(false)

  // Add Part bottom sheet state
  const [isAddPartOpen, setIsAddPartOpen] = useState(false)
  const [newPartName, setNewPartName] = useState('')
  const [newPartQty, setNewPartQty] = useState(1)
  const [newPartCost, setNewPartCost] = useState('')
  const [jobParts, setJobParts] = useState<Record<string, Array<{ name: string; qty: number; cost: number }>>>({})

  // Periodic Service Reminders & Renewals State (Loaded from live database)
  const [reminders, setReminders] = useState<any[]>(initialReminders)

  const [selectedReminder, setSelectedReminder] = useState<any | null>(null)
  const [isReminderSheetOpen, setIsReminderSheetOpen] = useState(false)
  const [reminderSlot, setReminderSlot] = useState<ScheduleTimeSlot>('morning')
  const [reminderBookingLoading, setReminderBookingLoading] = useState(false)
  const [reminderSuccess, setReminderSuccess] = useState<string | null>(null)

  const handleBookPotentialJob = async () => {
    if (!selectedReminder) return
    setReminderBookingLoading(true)
    const res = await convertReminderToJobAction({
      customerId: selectedReminder.customer_id,
      propertyId: selectedReminder.property_id,
      jobType: selectedReminder.service_type as JobType,
      timeSlot: reminderSlot,
    })
    setReminderBookingLoading(false)

    if (res.error) {
      alert(`Could not convert to job: ${res.error}`)
    } else {
      setReminderSuccess(`Dispatched for ${reminderSlot.toUpperCase()} slot!`)
      // Add the new job to local state immediately so it appears on dashboard
      setJobs(prev => [
        {
          id: res.jobId,
          job_number: res.jobNumber,
          status: 'scheduled',
          job_type: selectedReminder.service_type,
          description: `${selectedReminder.service_label} (${reminderSlot.toUpperCase()} slot)`,
          scheduled_start: new Date().toISOString(),
          customer: { name: selectedReminder.customer_name },
          property: { address_line1: selectedReminder.property_address, postcode: selectedReminder.postcode },
        },
        ...prev,
      ])
      // Remove reminder from list
      setReminders(prev => prev.filter(r => r.id !== selectedReminder.id))
      setTimeout(() => {
        setIsReminderSheetOpen(false)
        setSelectedReminder(null)
        setReminderSuccess(null)
      }, 1000)
    }
  }

  const inProgressCount = jobs.filter((j) => j.status === 'in_progress').length
  const completedCount = jobs.filter((j) => j.status === 'completed').length
  const pendingJobs = jobs.filter((j) => j.status !== 'completed')
  const nextJob = pendingJobs.find((j) => j.status === 'in_progress') || pendingJobs[0] || jobs[0]

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
    setIsJobSheetOpen(true)
  }

  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPartName.trim()) return
    const key = selectedJob?.id || 'default'
    const current = jobParts[key] || []
    setJobParts({
      ...jobParts,
      [key]: [...current, { name: newPartName, qty: Number(newPartQty) || 1, cost: parseFloat(newPartCost) || 0 }],
    })
    setNewPartName('')
    setNewPartQty(1)
    setNewPartCost('')
    setIsAddPartOpen(false)
  }

  return (
    <PullToRefresh>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* ─── REALTIME JOB ASSIGNMENT ALERT BANNER ───────────────── */}
        {newJobAlert && (
          <div
            style={{
              background: '#111215',
              color: '#ffffff',
              borderRadius: '20px',
              padding: '14px 16px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
              border: '2px solid #d4fa35',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#d4fa35',
                  color: '#111215',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Zap size={15} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                  New Job Assigned!
                </div>
                <div style={{ fontSize: '11px', color: '#9aa1ad' }}>
                  {newJobAlert.job_number} · {newJobAlert.customer_name || newJobAlert.job_type}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  const targetJob = jobs.find((j) => j.id === newJobAlert.id)
                  if (targetJob) handleOpenJob(targetJob)
                  clearAlert()
                }}
                className="neo-btn-lime"
                style={{ padding: '6px 12px', fontSize: '11px' }}
              >
                View
              </button>
              <button
                type="button"
                onClick={clearAlert}
                style={{ background: 'none', border: 'none', color: '#9aa1ad', cursor: 'pointer', padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ─── COMPACT GREETING HEADER ──────────────────────────── */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 2px 0 2px',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', color: '#747b86', fontWeight: 500 }}>
              {format(new Date(), 'EEEE, d MMMM')}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#111215', letterSpacing: '-0.02em', marginTop: '1px' }}>
              Hi, {engineerName || 'Mike'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Live Socket Status Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                borderRadius: '99px',
                background: '#ffffff',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                fontSize: '11px',
                fontWeight: 600,
                color: isConnected ? '#16a34a' : '#747b86',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: isConnected ? '#16a34a' : '#94a3b8',
                  boxShadow: isConnected ? '0 0 0 2px rgba(34, 197, 94, 0.25)' : 'none',
                }}
              />
              {isConnected ? 'Live' : 'Standby'}
            </div>

            <InstallPwaHeaderButton />
          </div>
        </header>

        {/* ─── TODAY'S WORKLOAD: CENTERED HERO CARD ──────────────── */}
        <div
          className="neo-card"
          style={{
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            background: '#ffffff',
            boxShadow: '0 4px 20px -2px rgba(18, 19, 22, 0.05)',
          }}
        >
          {/* Top Pill / Status */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '99px',
              background: availability === 'available' ? 'rgba(34, 197, 94, 0.12)' : availability === 'on_job' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0, 0, 0, 0.05)',
              color: availability === 'available' ? '#16a34a' : availability === 'on_job' ? '#d97706' : '#52525b',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: availability === 'available' ? '#16a34a' : availability === 'on_job' ? '#f59e0b' : '#94a3b8',
              }}
            />
            {availability === 'available' ? 'Available for Dispatch' : availability === 'on_job' ? 'Currently on Job' : 'Off Duty'}
          </div>

          <div style={{ fontSize: '13px', color: '#747b86', fontWeight: 600 }}>
            Today&apos;s Field Workload
          </div>

          {/* Large Centered Counter */}
          <div
            style={{
              fontSize: '48px',
              fontWeight: 800,
              color: '#111215',
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              marginTop: '4px',
            }}
          >
            {jobs.length}
          </div>

          {/* Breakdown Subtitle */}
          <div
            style={{
              fontSize: '12px',
              color: '#747b86',
              fontWeight: 500,
              marginTop: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ color: '#16a34a', fontWeight: 600 }}>{completedCount} done</span>
            <span>·</span>
            <span style={{ color: inProgressCount > 0 ? '#111215' : '#747b86', fontWeight: 600 }}>
              {inProgressCount} in progress
            </span>
            <span>·</span>
            <span>{Math.max(0, jobs.length - completedCount - inProgressCount)} scheduled</span>
          </div>

          {/* Centered Segmented Availability Control */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '6px',
              width: '100%',
              maxWidth: '340px',
              marginTop: '18px',
              padding: '4px',
              background: '#f3f4f7',
              borderRadius: '99px',
            }}
          >
            {(
              [
                { id: 'available', label: 'Available' },
                { id: 'on_job', label: 'On Job' },
                { id: 'off_duty', label: 'Off Duty' },
              ] as const
            ).map((s) => {
              const active = availability === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setAvailability(s.id)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '99px',
                    border: 'none',
                    cursor: 'pointer',
                    background: active ? '#111215' : 'transparent',
                    color: active ? '#ffffff' : '#747b86',
                    boxShadow: active ? '0 2px 8px rgba(0, 0, 0, 0.12)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ─── NEXT APPOINTMENT / ROUTE HERO BANNER ─────────────── */}
        {nextJob && (
          <div
            className="neo-card"
            style={{
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: nextJob.status === 'in_progress' ? '#111215' : '#ffffff',
              color: nextJob.status === 'in_progress' ? '#ffffff' : '#111215',
              border: nextJob.status === 'in_progress' ? '1px solid #111215' : '1px solid rgba(0, 0, 0, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: nextJob.status === 'in_progress' ? '#d4fa35' : '#747b86',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {nextJob.status === 'in_progress' ? '● CURRENT ACTIVE JOB' : 'NEXT APPOINTMENT'}
                </span>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: nextJob.status === 'in_progress' ? '#d4fa35' : '#111215',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {nextJob.scheduled_start ? format(parseISO(nextJob.scheduled_start), 'HH:mm') : '09:30'}
              </span>
            </div>

            <div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  lineHeight: 1.3,
                  color: nextJob.status === 'in_progress' ? '#ffffff' : '#111215',
                }}
              >
                {nextJob.property?.address_line1 || 'Manchester, UK'}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  marginTop: '2px',
                  color: nextJob.status === 'in_progress' ? '#9aa1ad' : '#747b86',
                }}
              >
                <strong>{nextJob.property?.postcode}</strong> · {nextJob.customer?.name || 'Customer'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  nextJob.property?.address_line1
                    ? `${nextJob.property.address_line1}, ${nextJob.property.postcode}`
                    : 'Manchester, UK'
                )}`}
                target="_blank"
                rel="noreferrer"
                className={nextJob.status === 'in_progress' ? 'neo-btn-lime' : 'neo-btn-black'}
                style={{ flex: 1, padding: '10px 14px', fontSize: '12px' }}
              >
                Google Maps
              </a>

              <button
                type="button"
                onClick={() => handleOpenJob(nextJob)}
                className="neo-btn-outline"
                style={{
                  padding: '10px 14px',
                  fontSize: '12px',
                  background: nextJob.status === 'in_progress' ? '#222329' : '#f8f9fb',
                  color: nextJob.status === 'in_progress' ? '#ffffff' : '#111215',
                  borderColor: nextJob.status === 'in_progress' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                }}
              >
                Details
              </button>
            </div>
          </div>
        )}

        {/* ─── ACTION ITEMS: NEXT FEW JOBS (Clean Cards, No Overlap) ─── */}
        <div className="neo-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111215', margin: 0 }}>
                Next Actions
              </h2>
              <div style={{ fontSize: '12px', color: '#747b86', marginTop: '1px' }}>
                Tap row to inspect details or start work
              </div>
            </div>

            <Link
              href="/engineer/jobs"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#111215',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              All ({jobs.length}) <ChevronRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {jobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#747b86', fontSize: '13px' }}>
                <CheckCircle2 size={32} color="#16a34a" style={{ margin: '0 auto 10px auto' }} />
                <div style={{ fontWeight: 600, color: '#111215' }}>No active assignments</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  New jobs dispatched by office will appear here immediately via live socket.
                </div>
              </div>
            ) : (
              jobs.slice(0, 4).map((job) => {
                const isCompleted = job.status === 'completed'
                const isInProgress = job.status === 'in_progress'

                return (
                  <div
                    key={job.id}
                    onClick={() => handleOpenJob(job)}
                    style={{
                      background: isInProgress ? '#ffffff' : '#f8f9fb',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      border: isInProgress ? '1.5px solid #111215' : '1px solid rgba(0, 0, 0, 0.05)',
                      boxShadow: isInProgress ? '0 4px 16px rgba(0, 0, 0, 0.07)' : undefined,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      transition: 'transform 0.1s ease',
                    }}
                  >
                    {/* Top Row: Title on Left, Badge on Right with GUARANTEED spacing */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: isInProgress ? '#111215' : '#ffffff',
                            color: isInProgress ? '#d4fa35' : '#747b86',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '1px',
                            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.04)',
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
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#747b86',
                              fontFamily: 'var(--font-mono)',
                              marginTop: '2px',
                            }}
                          >
                            {job.job_number}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge: NEVER wraps, never overlaps, ample padding */}
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
                            boxShadow: isInProgress ? '0 2px 6px rgba(0, 0, 0, 0.15)' : 'none',
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

                    {/* Bottom Row: Address and Time */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#52525b',
                        paddingTop: '6px',
                        borderTop: '1px solid rgba(0, 0, 0, 0.04)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                          minWidth: 0,
                          paddingRight: '8px',
                        }}
                      >
                        <MapPin size={13} color="#747b86" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {job.property?.address_line1 || 'Address'}, <strong>{job.property?.postcode}</strong>
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          color: '#747b86',
                          flexShrink: 0,
                        }}
                      >
                        <Clock size={12} />
                        <span>
                          {job.scheduled_start ? format(parseISO(job.scheduled_start), 'HH:mm') : '09:30'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ─── QUICK SHORTCUT TO CP12 / CERTIFICATES ─────────────── */}
        <div
          className="neo-card"
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: '#f0f2f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={20} color="#111215" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111215' }}>
                Landlord Gas Safety (CP12)
              </div>
              <div style={{ fontSize: '11px', color: '#747b86' }}>
                Issue instant digital certificate
              </div>
            </div>
          </div>

          <Link
            href="/admin/certificates"
            className="neo-btn-outline"
            style={{ padding: '8px 14px', fontSize: '11px' }}
          >
            Create CP12
          </Link>
        </div>

        {/* ─── PERIODIC INSPECTIONS & SERVICE REMINDERS (+ Potential Job) ─── */}
        <div
          className="neo-card"
          style={{
            padding: '18px 20px',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'rgba(212, 250, 53, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#111215',
                }}
              >
                <Zap size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111215', margin: 0 }}>
                  Service Reminders ({reminders.length})
                </h3>
                <div style={{ fontSize: '11px', color: '#747b86' }}>
                  Periodic renewals · Convert to job
                </div>
              </div>
            </div>

            <Link
              href="/admin/recurring"
              style={{ fontSize: '11px', color: '#111215', fontWeight: 600, textDecoration: 'none' }}
            >
              Manage →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {reminders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 12px', color: '#747b86', fontSize: '12px' }}>
                No pending compliance reminders
              </div>
            ) : (
              reminders.map(rem => (
              <div
                key={rem.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: '#f8f9fb',
                  border: rem.is_overdue ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#111215', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rem.customer_name}
                    </span>
                    {rem.is_overdue ? (
                      <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#dc2626' }}>
                        OVERDUE
                      </span>
                    ) : (
                      <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: '#e5e7eb', color: '#4b5563' }}>
                        {rem.interval}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#52525b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {rem.service_label} · {rem.property_address}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedReminder(rem)
                    setIsReminderSheetOpen(true)
                  }}
                  style={{
                    background: '#111215',
                    color: '#d4fa35',
                    border: 'none',
                    borderRadius: '99px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  + Potential Job
                </button>
              </div>
            )))}
          </div>
        </div>

        {/* ─── FLOATING ACTION BUTTON (FAB) ──────────────────────── */}
        <button
          type="button"
          onClick={() => setIsFabSheetOpen(true)}
          aria-label="Quick Actions Menu"
          style={{
            position: 'fixed',
            bottom: 'calc(76px + env(safe-area-inset-bottom, 16px))',
            right: '20px',
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: '#d4fa35',
            color: '#111215',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
            border: '2px solid #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 50,
            transition: 'transform 0.15s ease',
          }}
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>

        {/* ─── SLIDE-UP BOTTOM SHEET: CONVERT REMINDER TO JOB (+ Potential Job) ─── */}
        <BottomSheet
          isOpen={isReminderSheetOpen}
          onClose={() => setIsReminderSheetOpen(false)}
          title="Schedule Potential Job"
          subtitle={selectedReminder?.service_label || 'Periodic Inspection Renewal'}
        >
          {selectedReminder && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f8f9fb', padding: '12px', borderRadius: '12px', fontSize: '12px' }}>
                <div style={{ fontWeight: 700, color: '#111215' }}>{selectedReminder.customer_name}</div>
                <div style={{ color: '#52525b', marginTop: '2px' }}>{selectedReminder.property_address}, {selectedReminder.postcode}</div>
                <div style={{ color: '#747b86', marginTop: '4px' }}>Renewal Cycle: <strong>{selectedReminder.interval}</strong> · Due: {selectedReminder.due_date}</div>
              </div>

              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111215' }}>
                Select Dispatch Arrival Window:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setReminderSlot('morning')}
                  style={{
                    padding: '10px 4px',
                    borderRadius: '12px',
                    border: reminderSlot === 'morning' ? '2px solid #111215' : '1px solid rgba(0,0,0,0.08)',
                    background: reminderSlot === 'morning' ? '#111215' : '#ffffff',
                    color: reminderSlot === 'morning' ? '#d4fa35' : '#111215',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <Sun size={16} style={{ margin: '0 auto 4px auto' }} />
                  <div style={{ fontSize: '12px', fontWeight: 700 }}>Morning</div>
                  <div style={{ fontSize: '10px', opacity: 0.7 }}>08:00–12:00</div>
                </button>

                <button
                  type="button"
                  onClick={() => setReminderSlot('afternoon')}
                  style={{
                    padding: '10px 4px',
                    borderRadius: '12px',
                    border: reminderSlot === 'afternoon' ? '2px solid #111215' : '1px solid rgba(0,0,0,0.08)',
                    background: reminderSlot === 'afternoon' ? '#111215' : '#ffffff',
                    color: reminderSlot === 'afternoon' ? '#d4fa35' : '#111215',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <Clock size={16} style={{ margin: '0 auto 4px auto' }} />
                  <div style={{ fontSize: '12px', fontWeight: 700 }}>Afternoon</div>
                  <div style={{ fontSize: '10px', opacity: 0.7 }}>12:00–16:00</div>
                </button>

                <button
                  type="button"
                  onClick={() => setReminderSlot('evening')}
                  style={{
                    padding: '10px 4px',
                    borderRadius: '12px',
                    border: reminderSlot === 'evening' ? '2px solid #111215' : '1px solid rgba(0,0,0,0.08)',
                    background: reminderSlot === 'evening' ? '#111215' : '#ffffff',
                    color: reminderSlot === 'evening' ? '#d4fa35' : '#111215',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <Moon size={16} style={{ margin: '0 auto 4px auto' }} />
                  <div style={{ fontSize: '12px', fontWeight: 700 }}>Evening</div>
                  <div style={{ fontSize: '10px', opacity: 0.7 }}>16:00–20:00</div>
                </button>
              </div>

              {reminderSuccess && (
                <div style={{ padding: '8px 12px', background: 'rgba(34, 197, 94, 0.12)', color: '#16a34a', borderRadius: '8px', fontSize: '12px', fontWeight: 600, textAlign: 'center' }}>
                  {reminderSuccess}
                </div>
              )}

              <button
                type="button"
                className="neo-btn-black"
                onClick={handleBookPotentialJob}
                disabled={reminderBookingLoading}
                style={{ width: '100%', marginTop: '6px', minHeight: '46px', fontSize: '13px' }}
              >
                {reminderBookingLoading ? 'Creating Dispatch…' : `Confirm ${reminderSlot.toUpperCase()} Dispatch Slot`}
              </button>
            </div>
          )}
        </BottomSheet>

        {/* ─── SLIDE-UP BOTTOM SHEET: JOB DETAILS ─────────────────── */}
        <BottomSheet
          isOpen={isJobSheetOpen}
          onClose={() => setIsJobSheetOpen(false)}
          title={selectedJob?.job_number || 'Job Details'}
          subtitle={selectedJob?.description || selectedJob?.job_type?.replace(/_/g, ' ')}
        >
          {selectedJob && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Status Header & Controls */}
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
                  <div style={{ fontSize: '11px', color: '#747b86' }}>Current Status</div>
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

              {/* Location & Map Button */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#747b86', textTransform: 'uppercase' }}>
                  Site Address
                </span>
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
                        {selectedJob.property?.address_line1 || 'Property Address'}
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
              </div>

              {/* Customer Contact */}
              {selectedJob.customer && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#747b86', textTransform: 'uppercase' }}>
                    Customer Contact
                  </span>
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
                        {selectedJob.customer.phone || 'No phone recorded'}
                      </div>
                    </div>

                    {selectedJob.customer.phone && (
                      <a
                        href={`tel:${selectedJob.customer.phone}`}
                        className="neo-btn-lime"
                        style={{ padding: '8px 14px', fontSize: '11px' }}
                      >
                        <Phone size={12} /> Call Customer
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Parts Recorded */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#747b86', textTransform: 'uppercase' }}>
                    Parts Used
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddPartOpen(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#111215',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={13} /> Add Part
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(jobParts[selectedJob.id] || jobParts.default || []).map((part, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: '#f8f9fb',
                        fontSize: '12px',
                      }}
                    >
                      <span>{part.name} (x{part.qty})</span>
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        £{(part.cost * part.qty).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons in Sheet */}
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
                  <ShieldCheck size={14} /> Issue CP12
                </Link>
              </div>
            </div>
          )}
        </BottomSheet>

        {/* ─── SLIDE-UP BOTTOM SHEET: QUICK ACTIONS (FAB) ─────────── */}
        <BottomSheet
          isOpen={isFabSheetOpen}
          onClose={() => setIsFabSheetOpen(false)}
          title="Quick Actions"
          subtitle="Fast mobile shortcuts for operatives"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '12px' }}>
            {nextJob && (
              <button
                type="button"
                onClick={() => {
                  setIsFabSheetOpen(false)
                  toggleJobStatus(nextJob.id, 'in_progress')
                  handleOpenJob(nextJob)
                }}
                className="neo-btn-black"
                style={{ width: '100%', padding: '14px', justifyContent: 'flex-start', minHeight: '48px' }}
              >
                <Play size={16} /> Start Next Scheduled Job ({nextJob.job_number})
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsFabSheetOpen(false)
                setIsAddPartOpen(true)
              }}
              className="neo-btn-outline"
              style={{ width: '100%', padding: '14px', justifyContent: 'flex-start', minHeight: '48px' }}
            >
              <Wrench size={16} /> Record Parts &amp; Consumables
            </button>

            <Link
              href="/admin/certificates"
              onClick={() => setIsFabSheetOpen(false)}
              className="neo-btn-outline"
              style={{ width: '100%', padding: '14px', justifyContent: 'flex-start', minHeight: '48px' }}
            >
              <ShieldCheck size={16} /> Issue Landlord CP12 Certificate
            </Link>

            <a
              href="tel:07700900001"
              className="neo-btn-outline"
              style={{ width: '100%', padding: '14px', justifyContent: 'flex-start', minHeight: '48px' }}
            >
              <Phone size={16} /> Call Dispatch Office (Direct Line)
            </a>
          </div>
        </BottomSheet>

        {/* ─── SLIDE-UP BOTTOM SHEET: ADD PART FORM ───────────────── */}
        <BottomSheet
          isOpen={isAddPartOpen}
          onClose={() => setIsAddPartOpen(false)}
          title="Add Part / Material"
          subtitle="Record items fitted on this job"
        >
          <form onSubmit={handleAddPart} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#52525b', display: 'block', marginBottom: '4px' }}>
                Part Description
              </label>
              <input
                type="text"
                placeholder="e.g. Worcester Diverter Valve, 15mm Copper Elbow"
                value={newPartName}
                onChange={(e) => setNewPartName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#52525b', display: 'block', marginBottom: '4px' }}>
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  value={newPartQty}
                  onChange={(e) => setNewPartQty(parseInt(e.target.value) || 1)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#52525b', display: 'block', marginBottom: '4px' }}>
                  Unit Cost (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="24.50"
                  value={newPartCost}
                  onChange={(e) => setNewPartCost(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="neo-btn-black"
              style={{ width: '100%', padding: '14px', minHeight: '48px', marginTop: '6px' }}
            >
              Add Part to Job
            </button>
          </form>
        </BottomSheet>
      </div>
    </PullToRefresh>
  )
}
