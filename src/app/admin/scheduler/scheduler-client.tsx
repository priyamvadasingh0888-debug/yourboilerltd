'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  format, parseISO, addDays, subDays, addWeeks, subWeeks,
  isSameDay, startOfWeek, isToday, setHours, setMinutes
} from 'date-fns'
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock,
  MapPin, AlertTriangle, User, Briefcase, Plus, Check,
  X, Phone, ExternalLink, HardHat, GripVertical, Search,
  AlertCircle, ShieldAlert, Sparkles, Filter
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { reassignJobSchedule, assignEngineer } from '@/app/admin/jobs/actions'
import {
  JOB_TYPE_LABELS, STATUS_LABELS, PRIORITY_LABELS,
  type JobType, type JobStatus, type Priority
} from '@/types/database'

interface Props {
  engineers: any[]
  jobs: any[]
  unassignedJobs: any[]
  currentWeekStart: string
  selectedDateParam?: string
}

interface ConflictInfo {
  hasConflict: boolean
  reasons: string[]
  isOverlapping: boolean
  isOffDuty: boolean
  isGasSafeExpired: boolean
}

function getJobConflicts(job: any, allJobs: any[], allEngineers: any[]): ConflictInfo {
  const reasons: string[] = []
  if (!job.engineer_id) {
    return { hasConflict: false, reasons, isOverlapping: false, isOffDuty: false, isGasSafeExpired: false }
  }

  const assignedEng = allEngineers.find(e => e.id === job.engineer_id)

  // 1. Off duty check
  const isOffDuty = assignedEng?.availability_status === 'off_duty'
  if (isOffDuty) {
    reasons.push(`${assignedEng?.profile?.full_name || 'Engineer'} is marked OFF DUTY`)
  }

  // 2. Gas Safe check for gas-critical jobs
  let isGasSafeExpired = false
  const gasJobTypes = ['gas_safety_check', 'annual_service', 'boiler_repair', 'boiler_installation']
  if (gasJobTypes.includes(job.job_type) && assignedEng?.gas_safe_expiry) {
    const expiry = new Date(assignedEng.gas_safe_expiry).getTime()
    const jobTime = job.scheduled_start ? new Date(job.scheduled_start).getTime() : Date.now()
    if (expiry < jobTime) {
      isGasSafeExpired = true
      reasons.push(`Gas Safe expired on ${assignedEng.gas_safe_expiry}`)
    }
  }

  // 3. Time overlap check
  let isOverlapping = false
  if (job.scheduled_start) {
    const start = new Date(job.scheduled_start).getTime()
    const end = start + (job.duration_minutes || 60) * 60000

    const overlappingJob = allJobs.find(other => {
      if (other.id === job.id || other.engineer_id !== job.engineer_id || !other.scheduled_start) return false
      const oStart = new Date(other.scheduled_start).getTime()
      const oEnd = oStart + (other.duration_minutes || 60) * 60000
      return (start < oEnd && end > oStart)
    })

    if (overlappingJob) {
      isOverlapping = true
      reasons.push(`Overlaps with ${overlappingJob.job_number} (${overlappingJob.customer?.name || 'Customer'})`)
    }
  }

  return {
    hasConflict: reasons.length > 0,
    reasons,
    isOverlapping,
    isOffDuty,
    isGasSafeExpired
  }
}

export function SchedulerClient({
  engineers,
  jobs: initialJobs,
  unassignedJobs: initialUnassigned,
  currentWeekStart,
  selectedDateParam,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Synced local state with optimistic update support
  const [jobs, setJobs] = useState(initialJobs)
  const [unassigned, setUnassigned] = useState(initialUnassigned)

  useEffect(() => {
    setJobs(initialJobs)
  }, [initialJobs])

  useEffect(() => {
    setUnassigned(initialUnassigned)
  }, [initialUnassigned])

  // Views & active selection
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (selectedDateParam) {
      const parsed = parseISO(selectedDateParam)
      if (!isNaN(parsed.getTime())) return parsed
    }
    return new Date()
  })

  const [selectedJob, setSelectedJob] = useState<any | null>(null)
  const [showUnassignedDrawer, setShowUnassignedDrawer] = useState(false)
  const [unassignedSearch, setUnassignedSearch] = useState('')
  const [showConflictDetails, setShowConflictDetails] = useState(false)

  // Drag and drop state
  const [draggedJob, setDraggedJob] = useState<any | null>(null)
  const [dragOverCell, setDragOverCell] = useState<string | null>(null)
  const [isDragOverUnassigned, setIsDragOverUnassigned] = useState(false)

  // Assignment Modal
  interface AssignmentFormState {
    job: any
    engineerId: string
    date: string // YYYY-MM-DD
    time: string // HH:mm
    duration: number
  }
  const [assignmentModal, setAssignmentModal] = useState<AssignmentFormState | null>(null)

  const weekStartDate = parseISO(currentWeekStart)
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i))

  // Realtime Supabase change listener
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('scheduler-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        () => {
          startTransition(() => {
            router.refresh()
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  // Calculate conflict counts across currently active jobs
  const conflictsList = useMemo(() => {
    return jobs
      .map(job => ({ job, conflict: getJobConflicts(job, jobs, engineers) }))
      .filter(item => item.conflict.hasConflict)
  }, [jobs, engineers])

  // Date Navigation
  const navigate = (direction: 'prev' | 'next' | 'today') => {
    if (viewMode === 'week') {
      let target: Date
      if (direction === 'today') {
        target = startOfWeek(new Date(), { weekStartsOn: 1 })
      } else if (direction === 'prev') {
        target = subWeeks(weekStartDate, 1)
      } else {
        target = addWeeks(weekStartDate, 1)
      }
      router.push(`/admin/scheduler?date=${format(target, 'yyyy-MM-dd')}`)
    } else {
      let target: Date
      if (direction === 'today') {
        target = new Date()
      } else if (direction === 'prev') {
        target = subDays(selectedDate, 1)
      } else {
        target = addDays(selectedDate, 1)
      }
      setSelectedDate(target)
      router.push(`/admin/scheduler?date=${format(target, 'yyyy-MM-dd')}`)
    }
  }

  // Switch to Day View on specific day header click
  const handleDayHeaderClick = (day: Date) => {
    setSelectedDate(day)
    setViewMode('day')
  }

  // Drag & Drop Handler onto an engineer's day slot
  const handleDropOnSlot = async (jobToMove: any, targetEngineerId: string, targetDay: Date, targetHour = 9, targetMinute = 0) => {
    if (!jobToMove) return

    let targetDate = new Date(targetDay)
    if (jobToMove.scheduled_start) {
      const orig = parseISO(jobToMove.scheduled_start)
      targetDate = setHours(targetDate, orig.getHours())
      targetDate = setMinutes(targetDate, orig.getMinutes())
    } else {
      targetDate = setHours(targetDate, targetHour)
      targetDate = setMinutes(targetDate, targetMinute)
    }

    const scheduledIso = targetDate.toISOString()
    const isFromUnassigned = !jobToMove.engineer_id

    // Optimistic UI update
    const updatedJob = {
      ...jobToMove,
      engineer_id: targetEngineerId,
      scheduled_start: scheduledIso,
      engineer: engineers.find(e => e.id === targetEngineerId) || jobToMove.engineer
    }

    if (isFromUnassigned) {
      setUnassigned(prev => prev.filter(j => j.id !== jobToMove.id))
      setJobs(prev => [...prev.filter(j => j.id !== jobToMove.id), updatedJob])
    } else {
      setJobs(prev => prev.map(j => j.id === jobToMove.id ? updatedJob : j))
    }

    setDraggedJob(null)
    setDragOverCell(null)

    // Persist via server action
    const res = await reassignJobSchedule(jobToMove.id, targetEngineerId, scheduledIso, jobToMove.duration_minutes || 60)
    if (res?.error) {
      alert(`Assignment failed: ${res.error}`)
      startTransition(() => router.refresh())
    } else {
      startTransition(() => router.refresh())
    }
  }

  // Drag & Drop Handler onto Unassigned Queue
  const handleDropOnUnassigned = async (jobToUnassign: any) => {
    if (!jobToUnassign || !jobToUnassign.engineer_id) return

    const unassignedJob = {
      ...jobToUnassign,
      engineer_id: null,
      scheduled_start: null,
      engineer: null,
    }

    // Optimistic UI update
    setJobs(prev => prev.filter(j => j.id !== jobToUnassign.id))
    setUnassigned(prev => [unassignedJob, ...prev.filter(j => j.id !== jobToUnassign.id)])
    setIsDragOverUnassigned(false)
    setDraggedJob(null)

    const res = await reassignJobSchedule(jobToUnassign.id, null, null)
    if (res?.error) {
      alert(`Unassign failed: ${res.error}`)
      startTransition(() => router.refresh())
    } else {
      startTransition(() => router.refresh())
    }
  }

  // Modal open helper
  const openAssignmentModal = (job: any, defaultEngineerId?: string) => {
    const jobDate = job.scheduled_start ? parseISO(job.scheduled_start) : selectedDate
    setAssignmentModal({
      job,
      engineerId: defaultEngineerId || job.engineer_id || engineers[0]?.id || '',
      date: format(jobDate, 'yyyy-MM-dd'),
      time: job.scheduled_start ? format(parseISO(job.scheduled_start), 'HH:mm') : '09:00',
      duration: job.duration_minutes || 60,
    })
  }

  // Modal submit
  const handleModalConfirm = async () => {
    if (!assignmentModal) return
    const { job, engineerId, date, time, duration } = assignmentModal
    if (!engineerId || !date) return

    const [hours, mins] = time.split(':').map(Number)
    const scheduledDateTime = setMinutes(setHours(parseISO(date), hours || 9), mins || 0)
    const scheduledIso = scheduledDateTime.toISOString()

    const isFromUnassigned = !job.engineer_id
    const updatedJob = {
      ...job,
      engineer_id: engineerId,
      scheduled_start: scheduledIso,
      duration_minutes: duration,
      engineer: engineers.find(e => e.id === engineerId) || job.engineer
    }

    // Optimistic
    if (isFromUnassigned) {
      setUnassigned(prev => prev.filter(j => j.id !== job.id))
      setJobs(prev => [...prev.filter(j => j.id !== job.id), updatedJob])
    } else {
      setJobs(prev => prev.map(j => j.id === job.id ? updatedJob : j))
    }

    setAssignmentModal(null)
    setSelectedJob(null)

    const res = await reassignJobSchedule(job.id, engineerId, scheduledIso, duration)
    if (res?.error) {
      alert(`Assignment failed: ${res.error}`)
      startTransition(() => router.refresh())
    } else {
      startTransition(() => router.refresh())
    }
  }

  // Filtered unassigned jobs
  const filteredUnassigned = unassigned.filter(job => {
    if (!unassignedSearch) return true
    const q = unassignedSearch.toLowerCase()
    return (
      job.job_number?.toLowerCase().includes(q) ||
      job.customer?.name?.toLowerCase().includes(q) ||
      job.property?.address_line1?.toLowerCase().includes(q) ||
      job.property?.postcode?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="page-content" style={{ maxWidth: '100%', padding: '20px 24px' }}>
      {/* ─── MOBILE HEADER (Minimal, App-like) ─── */}
      <div className="mobile-only" style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title" style={{ fontSize: '20px', margin: 0 }}>Schedule</h1>
            <p className="page-subtitle" style={{ fontSize: '12px', margin: '2px 0 0 0' }}>
              {format(selectedDate, 'EEEE, d MMMM')}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                const today = new Date()
                setSelectedDate(today)
                router.push(`/admin/scheduler?date=${format(today, 'yyyy-MM-dd')}`)
              }}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '5px 10px',
                borderRadius: '8px',
                background: 'var(--surface-card)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'var(--color-paper)',
                cursor: 'pointer',
              }}
            >
              Today
            </button>
            {unassigned.length > 0 && (
              <button
                type="button"
                onClick={() => setShowUnassignedDrawer(true)}
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '5px 10px',
                  borderRadius: '8px',
                  background: 'rgba(214, 254, 81, 0.1)',
                  border: '1px solid rgba(214, 254, 81, 0.25)',
                  color: 'var(--color-acid-lime)',
                  cursor: 'pointer',
                }}
              >
                {unassigned.length} Unassigned
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── DESKTOP HEADER & CONTROLS ─── */}
      <div className="desktop-only" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="page-title" style={{ margin: 0 }}>Scheduler & Dispatch</h1>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(214, 254, 81, 0.1)',
                  color: 'var(--color-acid-lime)',
                  border: '1px solid rgba(214, 254, 81, 0.2)'
                }}
              >
                DRAG & DROP ACTIVE
              </span>
            </div>
            <p className="page-subtitle" style={{ margin: '4px 0 0 0' }}>
              {viewMode === 'week'
                ? `Week of ${format(weekStartDate, 'dd MMMM yyyy')}`
                : `Day View: ${format(selectedDate, 'EEEE, dd MMMM yyyy')}`}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Unassigned Queue Toggle */}
            <button
              onClick={() => setShowUnassignedDrawer(!showUnassignedDrawer)}
              className="btn btn-secondary"
              style={{
                position: 'relative',
                borderColor: showUnassignedDrawer ? 'var(--color-acid-lime)' : 'var(--border-subtle)',
                background: showUnassignedDrawer ? 'rgba(228, 242, 34, 0.06)' : undefined
              }}
            >
              <Briefcase size={15} style={{ color: showUnassignedDrawer ? 'var(--color-acid-lime)' : undefined }} />
              <span>Unassigned Queue</span>
              {unassigned.length > 0 && (
                <span
                  style={{
                    background: 'var(--color-acid-lime)',
                    color: '#08090a',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    marginLeft: '4px'
                  }}
                >
                  {unassigned.length}
                </span>
              )}
            </button>

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', background: 'var(--color-void)', borderRadius: 'var(--radius-md)', padding: '2px', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setViewMode('week')}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: viewMode === 'week' ? 'var(--color-iron)' : 'transparent',
                  color: viewMode === 'week' ? 'var(--color-paper)' : 'var(--color-fog)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Week View
              </button>
              <button
                onClick={() => setViewMode('day')}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: viewMode === 'day' ? 'var(--color-iron)' : 'transparent',
                  color: viewMode === 'day' ? 'var(--color-paper)' : 'var(--color-fog)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Day View
              </button>
            </div>

            {/* Date Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => navigate('prev')}
                className="btn btn-secondary"
                style={{ padding: '6px 10px' }}
                title={viewMode === 'week' ? 'Previous Week' : 'Previous Day'}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => navigate('today')}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px', fontWeight: 600 }}
              >
                Today
              </button>
              <button
                onClick={() => navigate('next')}
                className="btn btn-secondary"
                style={{ padding: '6px 10px' }}
                title={viewMode === 'week' ? 'Next Week' : 'Next Day'}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conflicts Banner Alert */}
      {conflictsList.length > 0 && (
        <>
          {/* Mobile Minimal Alert */}
          <div className="mobile-only" style={{ marginBottom: '14px' }}>
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '12px',
                padding: '9px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#fbbf24' }}>
                  {conflictsList.length} Schedule Conflict{conflictsList.length > 1 ? 's' : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowConflictDetails(!showConflictDetails)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: 'var(--color-paper)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '3px 8px',
                  borderRadius: '6px',
                }}
              >
                {showConflictDetails ? 'Hide' : 'Review'}
              </button>
            </div>

            {showConflictDetails && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.06)',
                  border: '1px solid rgba(245, 158, 11, 0.15)',
                  borderRadius: '12px',
                  padding: '12px',
                  marginTop: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {conflictsList.map(c => (
                  <div key={c.job.id} style={{ fontSize: '12px', lineHeight: 1.35 }}>
                    <strong style={{ color: 'var(--color-paper)' }}>{c.job.job_number}</strong>
                    {c.job.customer?.name && ` (${c.job.customer.name})`}:
                    <div style={{ color: '#fcd34d', marginTop: '2px' }}>
                      {c.conflict.reasons.join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Clear Structured Alert */}
          <div
            className="desktop-only"
            style={{
              background: '#16171a',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '3px solid #f59e0b',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 18px',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontWeight: 700, fontSize: '14px' }}>
                <AlertTriangle size={16} />
                <span>{conflictsList.length} Scheduling Conflict{conflictsList.length > 1 ? 's' : ''} Require Attention</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Action Required
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              {conflictsList.map(c => (
                <div key={c.job.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-paper)', fontFamily: 'var(--font-mono)' }}>
                    {c.job.job_number}
                  </span>
                  <span style={{ color: 'var(--color-mist)' }}>
                    {c.job.customer?.name ? `(${c.job.customer.name})` : ''}
                  </span>
                  <span style={{ color: '#fde68a' }}>
                    → {c.conflict.reasons.join(' · ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ─── MOBILE PHONE AGENDA VIEW (Minimal, Fast, No Clutter) ─── */}
      <div className="mobile-only" style={{ marginBottom: '24px' }}>
        {/* Horizontal Day Selector Strip */}
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
          {daysOfWeek.map((day) => {
            const isSel = isSameDay(day, selectedDate)
            const dayJobCount = jobs.filter((j) => j.scheduled_start && isSameDay(parseISO(j.scheduled_start), day)).length

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelectedDate(day)}
                style={{
                  flex: '0 0 62px',
                  padding: '10px 4px',
                  borderRadius: '14px',
                  border: isSel ? '1px solid var(--color-acid-lime)' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSel ? 'var(--color-acid-lime)' : 'var(--surface-card)',
                  color: isSel ? '#0b0b0b' : 'var(--color-paper)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  boxShadow: isSel ? '0 2px 8px rgba(214, 254, 81, 0.25)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 600, color: isSel ? '#0b0b0b' : 'var(--color-fog)' }}>
                  {format(day, 'EEE')}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px' }}>
                  {format(day, 'd')}
                </span>
                {dayJobCount > 0 && (
                  <span
                    style={{
                      marginTop: '4px',
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '99px',
                      background: isSel ? '#0b0b0b' : 'rgba(255, 255, 255, 0.1)',
                      color: isSel ? 'var(--color-acid-lime)' : 'var(--color-paper)',
                    }}
                  >
                    {dayJobCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Selected Day Agenda Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0 12px 0' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-paper)' }}>
            {format(selectedDate, 'EEEE, d MMMM')}
          </span>
          {unassigned.length > 0 && (
            <button
              type="button"
              onClick={() => setShowUnassignedDrawer(true)}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--color-acid-lime)',
                background: 'rgba(214, 254, 81, 0.1)',
                border: '1px solid rgba(214, 254, 81, 0.2)',
                padding: '4px 10px',
                borderRadius: '99px',
                cursor: 'pointer',
              }}
            >
              {unassigned.length} Unassigned
            </button>
          )}
        </div>

        {/* Selected Day Job Cards List - Evenly Spaced Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(() => {
            const dayJobs = jobs.filter((j) => j.scheduled_start && isSameDay(parseISO(j.scheduled_start), selectedDate))
            if (dayJobs.length === 0) {
              return (
                <div
                  style={{
                    padding: '36px 16px',
                    textAlign: 'center',
                    background: 'var(--surface-card)',
                    borderRadius: '16px',
                    color: 'var(--color-fog)',
                    fontSize: '13px',
                  }}
                >
                  No appointments scheduled for this day
                </div>
              )
            }

            return dayJobs.map((job) => {
              const eng = engineers.find((e) => e.id === job.engineer_id)
              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '16px',
                    borderRadius: '16px',
                    background: 'var(--surface-card)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                    transition: 'transform 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: 'var(--color-paper)',
                        }}
                      >
                        {job.time_slot && job.time_slot !== 'custom'
                          ? (job.time_slot === 'morning' ? 'Morning' : job.time_slot === 'afternoon' ? 'Afternoon' : 'Evening')
                          : (job.scheduled_start ? format(parseISO(job.scheduled_start), 'HH:mm') : '09:00')
                        }
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-paper)' }}>
                        {job.job_number}
                      </span>
                    </div>

                    <span className={`badge badge-${job.status}`}>
                      {STATUS_LABELS[job.status as keyof typeof STATUS_LABELS] || job.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--color-mist)' }}>
                    {job.customer?.name}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-fog)' }}>
                    <span>
                      {job.property?.address_line1}, <strong>{job.property?.postcode}</strong>
                    </span>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${job.property?.address_line1}, ${job.property?.postcode}`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        color: 'var(--color-acid-lime)',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      Google Maps ↗
                    </a>
                  </div>

                  {eng && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-fog)', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: eng.schedule_colour }} />
                      <span>{eng.profile?.full_name}</span>
                    </div>
                  )}
                </div>
              )
            })
          })()}
        </div>
      </div>

      {/* Main Scheduler Area */}
      <div className="desktop-only" style={{ display: 'flex', gap: '20px', position: 'relative', alignItems: 'flex-start' }}>
        {/* The Grid / Day View Container */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {viewMode === 'week' ? (
            /* ========================================================
               WEEK VIEW: Rows = Engineers, Columns = 7 Days
               ======================================================== */
            <div
              style={{
                overflowX: 'auto',
                background: 'var(--color-charcoal)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xl)',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '200px repeat(7, minmax(180px, 1fr))',
                  minWidth: '1200px',
                }}
              >
                {/* Top-Left Corner Header */}
                <div
                  style={{
                    padding: '12px 16px',
                    background: 'var(--color-lead)',
                    borderBottom: '1px solid var(--border-subtle)',
                    borderRight: '1px solid var(--border-subtle)',
                    fontWeight: 700,
                    fontSize: '12px',
                    color: 'var(--color-fog)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    position: 'sticky',
                    left: 0,
                    zIndex: 20,
                  }}
                >
                  Gas Safe Engineers ({engineers.length})
                </div>

                {/* Day Column Headers */}
                {daysOfWeek.map((day, idx) => {
                  const today = isToday(day)
                  return (
                    <div
                      key={idx}
                      onClick={() => handleDayHeaderClick(day)}
                      title="Click to view detailed day schedule"
                      style={{
                        padding: '10px 12px',
                        background: today ? 'rgba(2, 184, 204, 0.08)' : 'var(--color-lead)',
                        borderBottom: '1px solid var(--border-subtle)',
                        borderRight: idx < 6 ? '1px solid var(--border-subtle)' : 'none',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      className="hover:bg-[rgba(255,255,255,0.04)]"
                    >
                      <div style={{ fontSize: '11px', fontWeight: 600, color: today ? 'var(--color-brand)' : 'var(--color-fog)', textTransform: 'uppercase' }}>
                        {format(day, 'EEE')}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: today ? 800 : 600, color: today ? 'var(--color-brand)' : 'var(--color-paper)' }}>
                        {format(day, 'd MMM')}
                      </div>
                    </div>
                  )
                })}

                {/* Engineer Rows */}
                {engineers.map(eng => {
                  const color = eng.schedule_colour || '#6366f1'
                  const isOffDuty = eng.availability_status === 'off_duty'

                  return (
                    <div key={eng.id} style={{ display: 'contents' }}>
                      {/* Sticky Engineer Label Column */}
                      <div
                        style={{
                          padding: '14px 16px',
                          background: 'var(--color-obsidian)',
                          borderBottom: '1px solid var(--border-subtle)',
                          borderRight: '1px solid var(--border-subtle)',
                          position: 'sticky',
                          left: 0,
                          zIndex: 10,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: color,
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-paper)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {eng.profile?.full_name || 'Engineer'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                              background:
                                eng.availability_status === 'available'
                                  ? 'rgba(39, 166, 68, 0.2)'
                                  : eng.availability_status === 'on_job'
                                  ? 'rgba(251, 191, 36, 0.2)'
                                  : 'rgba(235, 87, 87, 0.2)',
                              color:
                                eng.availability_status === 'available'
                                  ? '#27a644'
                                  : eng.availability_status === 'on_job'
                                  ? '#fbbf24'
                                  : '#eb5757',
                            }}
                          >
                            {eng.availability_status === 'available' ? 'Available' : eng.availability_status === 'on_job' ? 'On Job' : 'Off Duty'}
                          </span>

                          <span style={{ fontSize: '11px', color: 'var(--color-fog)', fontFamily: 'var(--font-mono)' }}>
                            {eng.gas_safe_number}
                          </span>
                        </div>
                      </div>

                      {/* Day Cells for this Engineer */}
                      {daysOfWeek.map((day, dIdx) => {
                        const cellId = `${eng.id}_${dIdx}`
                        const isTarget = dragOverCell === cellId
                        const isDayToday = isToday(day)

                        const dayJobs = jobs.filter(
                          j => j.engineer_id === eng.id && j.scheduled_start && isSameDay(parseISO(j.scheduled_start), day)
                        )

                        return (
                          <div
                            key={dIdx}
                            onDragOver={e => {
                              e.preventDefault()
                              e.dataTransfer.dropEffect = 'move'
                              if (dragOverCell !== cellId) setDragOverCell(cellId)
                            }}
                            onDragLeave={() => {
                              if (dragOverCell === cellId) setDragOverCell(null)
                            }}
                            onDrop={e => {
                              e.preventDefault()
                              handleDropOnSlot(draggedJob, eng.id, day)
                            }}
                            style={{
                              padding: '8px',
                              minHeight: '120px',
                              background: isTarget
                                ? 'rgba(228, 242, 34, 0.08)'
                                : isDayToday
                                ? 'rgba(2, 184, 204, 0.02)'
                                : 'transparent',
                              borderBottom: '1px solid var(--border-subtle)',
                              borderRight: dIdx < 6 ? '1px solid var(--border-subtle)' : 'none',
                              outline: isTarget ? '2px dashed var(--color-acid-lime)' : 'none',
                              outlineOffset: '-2px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            {dayJobs.map(job => {
                              const conflictInfo = getJobConflicts(job, jobs, engineers)

                              return (
                                <div
                                  key={job.id}
                                  draggable={true}
                                  onDragStart={e => {
                                    e.dataTransfer.setData('text/plain', job.id)
                                    setDraggedJob(job)
                                  }}
                                  onDragEnd={() => {
                                    setDraggedJob(null)
                                    setDragOverCell(null)
                                  }}
                                  onClick={() => setSelectedJob(job)}
                                  style={{
                                    background: 'var(--color-lead)',
                                    borderLeft: `3px solid ${conflictInfo.hasConflict ? '#f87171' : color}`,
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '8px 10px',
                                    cursor: 'grab',
                                    position: 'relative',
                                    border: conflictInfo.hasConflict
                                      ? '1px solid rgba(248, 113, 113, 0.6)'
                                      : '1px solid var(--border-subtle)',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                  }}
                                  className="hover:scale-[1.01] active:cursor-grabbing"
                                >
                                  {/* Job Header */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginBottom: '3px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <GripVertical size={12} style={{ color: 'var(--color-ash)', cursor: 'grab' }} />
                                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-paper)' }}>
                                        {job.job_number}
                                      </span>
                                    </div>

                                    {conflictInfo.hasConflict && (
                                      <span
                                        title={`Conflict: ${conflictInfo.reasons.join(', ')}`}
                                        style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '2px' }}
                                      >
                                        <AlertTriangle size={13} />
                                      </span>
                                    )}
                                  </div>

                                  {/* Customer & Type */}
                                  <div style={{ fontSize: '12px', color: 'var(--color-mist)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {job.customer?.name}
                                  </div>

                                  {/* Time & Postcode */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: 'var(--color-fog)' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      <Clock size={11} />
                                      {job.scheduled_start ? format(parseISO(job.scheduled_start), 'HH:mm') : ''} ({job.duration_minutes || 60}m)
                                    </span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-paper)' }}>
                                      {job.property?.postcode}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* ========================================================
               DAY VIEW: Detailed Columns Per Engineer with Timelines
               ======================================================== */
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-paper)' }}>
                    {format(selectedDate, 'EEEE, dd MMMM yyyy')}
                  </span>
                  {isToday(selectedDate) && (
                    <span className="badge badge-in_progress" style={{ fontSize: '10px' }}>TODAY</span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label htmlFor="day-picker" style={{ fontSize: '12px', color: 'var(--color-fog)' }}>Jump to date:</label>
                  <input
                    id="day-picker"
                    type="date"
                    value={format(selectedDate, 'yyyy-MM-dd')}
                    onChange={e => {
                      if (e.target.value) {
                        const newD = parseISO(e.target.value)
                        setSelectedDate(newD)
                        router.push(`/admin/scheduler?date=${e.target.value}`)
                      }
                    }}
                    className="input"
                    style={{ width: '160px', padding: '4px 8px', fontSize: '12px' }}
                  />
                </div>
              </div>

              {/* Day View Grid of Engineers */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${engineers.length}, minmax(260px, 1fr))`, gap: '16px', overflowX: 'auto' }}>
                {engineers.map(eng => {
                  const dayJobs = jobs.filter(
                    j => j.engineer_id === eng.id && j.scheduled_start && isSameDay(parseISO(j.scheduled_start), selectedDate)
                  )
                  const cellId = `day_${eng.id}`
                  const isTarget = dragOverCell === cellId

                  return (
                    <div
                      key={eng.id}
                      onDragOver={e => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                        if (dragOverCell !== cellId) setDragOverCell(cellId)
                      }}
                      onDragLeave={() => {
                        if (dragOverCell === cellId) setDragOverCell(null)
                      }}
                      onDrop={e => {
                        e.preventDefault()
                        handleDropOnSlot(draggedJob, eng.id, selectedDate)
                      }}
                      style={{
                        background: isTarget ? 'rgba(228, 242, 34, 0.05)' : 'var(--color-lead)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        border: isTarget ? '2px dashed var(--color-acid-lime)' : '1px solid var(--border-subtle)',
                        minHeight: '380px',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {/* Engineer Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: eng.schedule_colour || '#6366f1' }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-paper)' }}>
                            {eng.profile?.full_name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-fog)' }}>
                            Gas Safe: {eng.gas_safe_number}
                          </div>
                        </div>
                        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--color-mist)', fontWeight: 600 }}>
                          {dayJobs.length} job{dayJobs.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Day Jobs List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                        {dayJobs.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--color-fog)', fontSize: '12px' }}>
                            No scheduled jobs. Drop a job card here to schedule.
                          </div>
                        ) : (
                          dayJobs.map(job => {
                            const conflictInfo = getJobConflicts(job, jobs, engineers)

                            return (
                              <div
                                key={job.id}
                                draggable={true}
                                onDragStart={e => {
                                  e.dataTransfer.setData('text/plain', job.id)
                                  setDraggedJob(job)
                                }}
                                onDragEnd={() => {
                                  setDraggedJob(null)
                                  setDragOverCell(null)
                                }}
                                onClick={() => setSelectedJob(job)}
                                style={{
                                  padding: '12px',
                                  background: 'var(--color-charcoal)',
                                  borderRadius: 'var(--radius-md)',
                                  border: conflictInfo.hasConflict ? '1px solid #f87171' : '1px solid var(--border-subtle)',
                                  borderLeft: `4px solid ${conflictInfo.hasConflict ? '#f87171' : (eng.schedule_colour || 'var(--color-brand)')}`,
                                  cursor: 'grab',
                                }}
                                className="hover:scale-[1.01]"
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '12px', color: 'var(--color-paper)' }}>
                                    {job.job_number}
                                  </span>
                                  <span style={{ fontSize: '11px', color: 'var(--color-brand)', fontWeight: 600 }}>
                                    {job.scheduled_start ? format(parseISO(job.scheduled_start), 'HH:mm') : ''} ({job.duration_minutes || 60}m)
                                  </span>
                                </div>

                                {conflictInfo.hasConflict && (
                                  <div style={{ fontSize: '11px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                                    <AlertTriangle size={12} />
                                    <span>{conflictInfo.reasons.join('; ')}</span>
                                  </div>
                                )}

                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-mist)' }}>
                                  {job.customer?.name}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--color-fog)', marginTop: '2px' }}>
                                  {job.property?.address_line1}, {job.property?.postcode}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px' }}>
                                  <span className={`badge badge-${job.priority}`}>
                                    {job.priority?.toUpperCase()}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openAssignmentModal(job, eng.id)
                                    }}
                                    className="btn btn-secondary"
                                    style={{ padding: '2px 8px', fontSize: '11px' }}
                                  >
                                    Reassign
                                  </button>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Unassigned Jobs Drawer */}
        {showUnassignedDrawer && (
          <div
            onDragOver={e => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              setIsDragOverUnassigned(true)
            }}
            onDragLeave={() => setIsDragOverUnassigned(false)}
            onDrop={e => {
              e.preventDefault()
              handleDropOnUnassigned(draggedJob)
            }}
            style={{
              width: '340px',
              flexShrink: 0,
              background: 'var(--color-lead)',
              border: isDragOverUnassigned ? '2px dashed var(--color-acid-lime)' : '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 160px)',
              overflowY: 'auto',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            }}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={16} style={{ color: 'var(--color-acid-lime)' }} />
                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-paper)' }}>
                  Unassigned Queue ({unassigned.length})
                </span>
              </div>
              <button
                onClick={() => setShowUnassignedDrawer(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-fog)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--color-fog)', margin: '0 0 12px 0' }}>
              Drag cards directly onto an engineer's day slot on the scheduler grid, or click <em>Assign</em>.
            </p>

            {/* Quick Search */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-fog)' }} />
              <input
                type="text"
                placeholder="Filter queue..."
                value={unassignedSearch}
                onChange={e => setUnassignedSearch(e.target.value)}
                className="input"
                style={{ paddingLeft: '30px', fontSize: '12px', padding: '6px 10px 6px 30px' }}
              />
            </div>

            {/* Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredUnassigned.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--color-fog)', fontSize: '12px' }}>
                  {unassignedSearch ? 'No jobs match your filter' : 'No unassigned jobs! All jobs dispatched.'}
                </div>
              ) : (
                filteredUnassigned.map(job => (
                  <div
                    key={job.id}
                    draggable={true}
                    onDragStart={e => {
                      e.dataTransfer.setData('text/plain', job.id)
                      setDraggedJob(job)
                    }}
                    onDragEnd={() => {
                      setDraggedJob(null)
                    }}
                    style={{
                      background: 'var(--color-charcoal)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      cursor: 'grab',
                    }}
                    className="hover:scale-[1.01] active:cursor-grabbing"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <GripVertical size={13} style={{ color: 'var(--color-ash)' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '12px', color: 'var(--color-paper)' }}>
                          {job.job_number}
                        </span>
                      </div>
                      <span className={`badge badge-${job.priority}`}>
                        {PRIORITY_LABELS[job.priority as Priority] ?? job.priority}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-mist)' }}>
                      {job.customer?.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-fog)', marginBottom: '8px' }}>
                      {job.property?.address_line1}, {job.property?.postcode}
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--color-ash)', marginBottom: '10px', lineHeight: 1.4 }}>
                      {job.description}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => openAssignmentModal(job)}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '5px 10px', fontSize: '12px', justifyContent: 'center' }}
                      >
                        Assign Engineer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Job Quick Preview Modal */}
      {selectedJob && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="card"
            style={{ width: '500px', maxWidth: '100%', padding: '24px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-acid-lime)', textTransform: 'uppercase', fontWeight: 600 }}>
                  {JOB_TYPE_LABELS[selectedJob.job_type as JobType] ?? selectedJob.job_type}
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-paper)', margin: '4px 0 0' }}>
                  {selectedJob.job_number}
                </h2>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-fog)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Conflict Callout in Preview */}
            {(() => {
              const conf = getJobConflicts(selectedJob, jobs, engineers)
              if (!conf.hasConflict) return null
              return (
                <div style={{ background: '#1c1917', border: '1px solid rgba(245, 158, 11, 0.25)', borderLeft: '3px solid #f59e0b', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#fef3c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />
                  <div><strong style={{ color: '#fbbf24' }}>Scheduling Alert:</strong> {conf.reasons.join('; ')}</div>
                </div>
              )
            })()}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--color-paper)' }}>
                <User size={15} style={{ color: 'var(--color-fog)' }} />
                <span>{selectedJob.customer?.name}</span>
                {selectedJob.customer?.phone && (
                  <a href={`tel:${selectedJob.customer.phone}`} style={{ color: 'var(--color-acid-lime)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
                    <Phone size={12} /> Call
                  </a>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '13px', color: 'var(--color-mist)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <MapPin size={15} style={{ color: 'var(--color-fog)', marginTop: '2px', flexShrink: 0 }} />
                  <span>
                    {selectedJob.property?.address_line1}, {selectedJob.property?.postcode}
                  </span>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${selectedJob.property?.address_line1}, ${selectedJob.property?.postcode}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: 'var(--color-acid-lime)',
                    textDecoration: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  Google Maps ↗
                </a>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-mist)' }}>
                <Clock size={15} style={{ color: 'var(--color-fog)' }} />
                <span>
                  {selectedJob.scheduled_start ? format(parseISO(selectedJob.scheduled_start), 'dd MMM yyyy, HH:mm') : 'Unscheduled'} ({selectedJob.duration_minutes || 60} mins)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-mist)' }}>
                <HardHat size={15} style={{ color: 'var(--color-fog)' }} />
                <span>Assigned: {selectedJob.engineer?.profile?.full_name || 'None'}</span>
              </div>

              {selectedJob.description && (
                <div style={{ background: 'var(--color-charcoal)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--color-mist)', marginTop: '4px' }}>
                  {selectedJob.description}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <button
                onClick={() => {
                  const jobToReassign = selectedJob
                  setSelectedJob(null)
                  openAssignmentModal(jobToReassign, jobToReassign.engineer_id)
                }}
                className="btn btn-secondary"
              >
                Reassign / Reschedule
              </button>
              <Link href={`/admin/jobs/${selectedJob.id}`} className="btn btn-primary">
                Full Job View <ExternalLink size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Assignment / Reschedule Modal with Date & Time Pickers */}
      {assignmentModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px',
          }}
          onClick={() => setAssignmentModal(null)}
        >
          <div
            className="card"
            style={{ width: '460px', maxWidth: '100%', padding: '24px' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-paper)', marginBottom: '4px' }}>
              Assign Job {assignmentModal.job.job_number}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-fog)', marginBottom: '16px' }}>
              Select an available Gas Safe engineer and set the dispatch time slot.
            </p>

            {/* Engineer Selection */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Assign To Engineer *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {engineers.map(eng => {
                  const isSelected = assignmentModal.engineerId === eng.id
                  const isOffDuty = eng.availability_status === 'off_duty'

                  return (
                    <button
                      key={eng.id}
                      type="button"
                      onClick={() => setAssignmentModal({ ...assignmentModal, engineerId: eng.id })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: isSelected ? 'rgba(228, 242, 34, 0.08)' : 'var(--color-charcoal)',
                        border: isSelected ? '1px solid var(--color-acid-lime)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-paper)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: eng.schedule_colour || '#6366f1' }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{eng.profile?.full_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-fog)' }}>Gas Safe: {eng.gas_safe_number}</div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          textTransform: 'capitalize',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: isOffDuty ? 'rgba(235, 87, 87, 0.2)' : 'rgba(39, 166, 68, 0.2)',
                          color: isOffDuty ? '#f87171' : '#27a644',
                          fontWeight: 600
                        }}
                      >
                        {eng.availability_status}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date & Time Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="modal-date">Scheduled Date *</label>
                <input
                  id="modal-date"
                  type="date"
                  className="input"
                  value={assignmentModal.date}
                  onChange={e => setAssignmentModal({ ...assignmentModal, date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="modal-time">Start Time *</label>
                <input
                  id="modal-time"
                  type="time"
                  className="input"
                  value={assignmentModal.time}
                  onChange={e => setAssignmentModal({ ...assignmentModal, time: e.target.value })}
                />
              </div>
            </div>

            {/* Duration */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" htmlFor="modal-duration">Estimated Duration (minutes)</label>
              <input
                id="modal-duration"
                type="number"
                step="15"
                min="15"
                max="480"
                className="input"
                value={assignmentModal.duration}
                onChange={e => setAssignmentModal({ ...assignmentModal, duration: Number(e.target.value) || 60 })}
              />
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => setAssignmentModal(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!assignmentModal.engineerId || isPending}
                onClick={handleModalConfirm}
                className="btn btn-primary"
              >
                {isPending ? 'Confirming...' : 'Dispatch & Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
