'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO, differenceInDays } from 'date-fns'
import {
  RefreshCw,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Building2,
  ArrowRight,
  Clock,
  Trash2,
  Mail,
  Zap,
  Flame,
  Shield,
  Sun,
  Moon,
  Check
} from 'lucide-react'
import { deleteRecurringTemplate, triggerAutomatedRemindersAction, convertReminderToJobAction } from './actions'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useUniversalSearch } from '@/hooks/use-universal-search'
import { SearchInput, Highlight, NoResults } from '@/components/ui/search-input'
import type { ScheduleTimeSlot, JobType } from '@/types/database'

interface RecurringItem {
  id: string
  customer_id: string
  property_id: string
  job_type: string
  interval_months: number
  last_completed_at: string | null
  next_due_at: string | null
  notes: string | null
  active: boolean
  customer?: { id?: string; name: string; email?: string | null; phone?: string | null }
  property?: { id?: string; address_line1: string; postcode: string }
}

const JOB_TYPE_LABELS: Record<string, string> = {
  gas_safety_check: 'Boiler Service / CP12 (12 Mo)',
  annual_service: 'Gas Inspection Service (12 Mo)',
  central_heating: 'Fire Alarm System (6 Mo)',
  boiler_repair: 'Electrical Inspection EICR (3/5 Yrs)',
  boiler_installation: 'Boiler Installation',
  plumbing: 'Plumbing Service',
}

export function RecurringClient({ templates }: { templates: RecurringItem[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'overdue' | 'due_soon'>('all')
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const now = useMemo(() => new Date(), [])

  // Automated Email Trigger State
  const [sendingReminders, setSendingReminders] = useState(false)
  const [reminderStatus, setReminderStatus] = useState<string | null>(null)

  // Quick Slot Booking Modal State
  const [selectedForBooking, setSelectedForBooking] = useState<RecurringItem | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<ScheduleTimeSlot>('morning')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null)

  async function handleSendAutomatedReminders() {
    setSendingReminders(true)
    setReminderStatus(null)
    const res = await triggerAutomatedRemindersAction()
    setSendingReminders(false)
    if (res.error) {
      setReminderStatus(`Error: ${res.error}`)
    } else {
      setReminderStatus(res.message || 'Automated reminders sent successfully!')
      setTimeout(() => setReminderStatus(null), 6000)
    }
  }

  async function handleQuickBookSlot() {
    if (!selectedForBooking) return
    setBookingLoading(true)
    const res = await convertReminderToJobAction({
      customerId: selectedForBooking.customer_id,
      propertyId: selectedForBooking.property_id,
      jobType: selectedForBooking.job_type as JobType,
      timeSlot: selectedSlot,
    })
    setBookingLoading(false)
    if (res.error) {
      alert(`Could not create job: ${res.error}`)
    } else {
      setBookingSuccess(`Job ${res.jobNumber} scheduled for ${selectedSlot.toUpperCase()} slot!`)
      setTimeout(() => {
        setBookingSuccess(null)
        setSelectedForBooking(null)
        router.push(`/admin/jobs/${res.jobId}`)
      }, 1000)
    }
  }

  async function handleDelete() {
    if (!itemToDelete) return
    setDeleteLoading(true)
    await deleteRecurringTemplate(itemToDelete)
    setDeleteLoading(false)
    setItemToDelete(null)
    router.refresh()
  }

  const filterPredicate = useCallback(
    (item: RecurringItem) => {
      const nextDate = item.next_due_at ? parseISO(item.next_due_at) : null
      const isOverdue = nextDate ? nextDate < now : false
      const daysUntil = nextDate ? differenceInDays(nextDate, now) : 999
      const isDueSoon = daysUntil <= 30 && daysUntil >= 0

      if (filter === 'overdue' && !isOverdue) return false
      if (filter === 'due_soon' && !isDueSoon) return false
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
  } = useUniversalSearch<RecurringItem>({
    items: templates,
    fields: [
      { accessor: item => item.customer?.name || '', weight: 2.2 },
      { accessor: item => item.property?.address_line1 || '', weight: 2.0 },
      { accessor: item => item.property?.postcode || '', weight: 2.0 },
      { accessor: item => (JOB_TYPE_LABELS[item.job_type] || item.job_type || ''), weight: 1.2 },
      { accessor: item => item.notes || '', weight: 0.8 },
      { accessor: item => item.id || '', weight: 0.8 },
    ],
    debounceMs: 200,
    filterPredicate,
  })

  const filtered = results.map(r => r.item)

  return (
    <div>
      {/* ─── AUTOMATED REMINDERS & SERVICE INTERVALS BANNER ─── */}
      <div
        style={{
          background: '#15161a',
          border: '1px solid var(--color-charcoal-light, #26272b)',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-flex', padding: '4px', borderRadius: '6px', background: '#d4fa35', color: '#111215' }}>
                <Zap size={15} />
              </span>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Automated Service Reminders &amp; Cycles
              </h2>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-fog)', margin: '4px 0 0 0' }}>
              Automated compliance engine. Scans expiries and dispatches customer slot booking links automatically.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSendAutomatedReminders}
              disabled={sendingReminders}
              className="btn btn-primary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                padding: '8px 16px',
              }}
            >
              <Mail size={14} />
              {sendingReminders ? 'Scanning & Dispatching…' : 'Trigger Automated Scan'}
            </button>
          </div>
        </div>

        {/* Feedback message */}
        {reminderStatus && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              background: reminderStatus.startsWith('Error') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              color: reminderStatus.startsWith('Error') ? '#fca5a5' : '#86efac',
              border: reminderStatus.startsWith('Error') ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            {reminderStatus}
          </div>
        )}

        {/* 4 Official Compliance Cycles Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--color-paper)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            Boiler Service (CP12) · <strong>12 Months</strong>
          </span>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--color-paper)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            Gas Inspection · <strong>12 Months</strong>
          </span>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--color-paper)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            Fire Alarm (BS 5839) · <strong>6 Months</strong>
          </span>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--color-paper)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            Electrical (EICR) · <strong>3 or 5 Years</strong>
          </span>
        </div>
      </div>

      {/* Universal Search Box */}
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search recurring templates by customer, property address, postcode…"
        isSearching={isSearching}
        resultCount={resultCount}
        hasQuery={hasQuery}
        style={{ marginBottom: '12px' }}
      />

      {/* Filter Tabs */}
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
        {(['all', 'overdue', 'due_soon'] as const).map(f => {
          const active = filter === f
          return (
            <button
              key={f}
              type="button"
              className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '99px', whiteSpace: 'nowrap' }}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All Schedules' : f === 'overdue' ? 'Overdue' : 'Due Next 30 Days'}
            </button>
          )
        })}
      </div>

      {/* Desktop Table View */}
      <div className="desktop-only table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Client / Account</th>
              <th>Inspected Property</th>
              <th>Service Category</th>
              <th>Interval</th>
              <th>Last Service</th>
              <th>Next Due</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {noResults ? (
              <tr>
                <td colSpan={7}>
                  <NoResults query={query} entityName="recurring service templates" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-fog)' }}>
                  No recurring service templates found.
                </td>
              </tr>
            ) : (
              filtered.map(item => {
                const nextDate = item.next_due_at ? parseISO(item.next_due_at) : null
                const isOverdue = nextDate ? nextDate < now : false
                const daysUntil = nextDate ? differenceInDays(nextDate, now) : null

                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-paper)' }}>
                        <Highlight text={item.customer?.name || 'Customer'} query={query} />
                      </div>
                      {item.customer?.email && (
                        <div style={{ fontSize: '11px', color: 'var(--color-fog)', marginTop: '2px' }}>
                          {item.customer.email}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ color: 'var(--color-paper)' }}>
                        <Highlight text={item.property?.address_line1 || 'Property'} query={query} />
                      </div>
                      <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--color-fog)', marginTop: '2px' }}>
                        <Highlight text={item.property?.postcode || ''} query={query} />
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--color-paper)' }}>
                        <Highlight text={JOB_TYPE_LABELS[item.job_type] || item.job_type} query={query} />
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--color-charcoal)' }}>
                        Every {item.interval_months} mo
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--color-fog)' }}>
                      {item.last_completed_at ? format(parseISO(item.last_completed_at), 'dd MMM yyyy') : 'Never'}
                    </td>
                    <td>
                      {nextDate ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontWeight: isOverdue ? 700 : 500,
                            color: isOverdue ? '#f87171' : (daysUntil !== null && daysUntil <= 30) ? '#fbbf24' : 'var(--color-paper)'
                          }}>
                            {format(nextDate, 'dd MMM yyyy')}
                          </span>
                          {isOverdue && (
                            <span className="badge badge-cancelled" style={{ fontSize: '10px' }}>Overdue</span>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedForBooking(item)}
                          className="btn btn-primary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          + Potential Job
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-coral-red)' }}
                          onClick={() => setItemToDelete(item.id)}
                          title="Delete Schedule"
                        >
                          <Trash2 size={13} />
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

      {/* Mobile Card List */}
      <div className="mobile-only-flex" style={{ flexDirection: 'column', gap: '10px' }}>
        {noResults ? (
          <NoResults query={query} entityName="recurring service templates" />
        ) : filtered.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', background: 'var(--surface-card)', borderRadius: '14px', color: 'var(--color-fog)', fontSize: '13px' }}>
            No recurring service templates found
          </div>
        ) : (
          filtered.map(item => {
            const nextDate = item.next_due_at ? parseISO(item.next_due_at) : null
            const isOverdue = nextDate ? nextDate < now : false
            const daysUntil = nextDate ? differenceInDays(nextDate, now) : null

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: 'var(--surface-card)',
                  border: isOverdue ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.07)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-paper)' }}>
                    <Highlight text={item.customer?.name || 'Customer'} query={query} />
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '99px',
                      background: isOverdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                      color: isOverdue ? '#f87171' : 'var(--color-fog)',
                    }}
                  >
                    Every {item.interval_months} mo
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--color-mist)', fontWeight: 600 }}>
                  <Highlight text={JOB_TYPE_LABELS[item.job_type] || item.job_type} query={query} />
                </div>

                <div style={{ fontSize: '11px', color: 'var(--color-fog)' }}>
                  <Highlight text={item.property?.address_line1 || 'Property'} query={query} />, <strong><Highlight text={item.property?.postcode || ''} query={query} /></strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-fog)', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span>
                    Due: {nextDate ? format(nextDate, 'dd/MM/yyyy') : '—'}
                    {isOverdue && <span style={{ color: '#f87171', marginLeft: '4px', fontWeight: 700 }}>(OVERDUE)</span>}
                    {!isOverdue && daysUntil !== null && daysUntil <= 30 && <span style={{ color: '#fbbf24', marginLeft: '4px' }}>({daysUntil}d)</span>}
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedForBooking(item)}
                    className="btn btn-primary btn-sm"
                    style={{ padding: '5px 12px', fontSize: '11px', fontWeight: 700 }}
                  >
                    + Potential Job
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ─── QUICK SLOT BOOKING MODAL (+ Potential Job) ─── */}
      {selectedForBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setSelectedForBooking(null)}
        >
          <div
            style={{
              background: '#151619',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff', margin: '0 0 6px 0' }}>
              Create Potential Job
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-fog)', margin: '0 0 16px 0' }}>
              Convert this reminder into an active dispatch slot for <strong>{selectedForBooking.customer?.name}</strong>.
            </p>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '12px' }}>
              <div style={{ color: 'var(--color-paper)', fontWeight: 600 }}>
                {selectedForBooking.property?.address_line1}, {selectedForBooking.property?.postcode}
              </div>
              <div style={{ color: 'var(--color-fog)', marginTop: '2px' }}>
                Service: {JOB_TYPE_LABELS[selectedForBooking.job_type] || selectedForBooking.job_type}
              </div>
            </div>

            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-paper)', display: 'block', marginBottom: '8px' }}>
              Select Schedule Arrival Window:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setSelectedSlot('morning')}
                style={{
                  padding: '10px 6px',
                  borderRadius: '10px',
                  border: selectedSlot === 'morning' ? '2px solid #d4fa35' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: selectedSlot === 'morning' ? 'rgba(212, 250, 53, 0.12)' : '#1a1b1f',
                  color: selectedSlot === 'morning' ? '#ffffff' : 'var(--color-fog)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <Sun size={16} style={{ color: selectedSlot === 'morning' ? '#d4fa35' : 'inherit', margin: '0 auto 4px auto' }} />
                <div style={{ fontSize: '12px', fontWeight: 700 }}>Morning</div>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>08:00–12:00</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSlot('afternoon')}
                style={{
                  padding: '10px 6px',
                  borderRadius: '10px',
                  border: selectedSlot === 'afternoon' ? '2px solid #d4fa35' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: selectedSlot === 'afternoon' ? 'rgba(212, 250, 53, 0.12)' : '#1a1b1f',
                  color: selectedSlot === 'afternoon' ? '#ffffff' : 'var(--color-fog)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <Clock size={16} style={{ color: selectedSlot === 'afternoon' ? '#d4fa35' : 'inherit', margin: '0 auto 4px auto' }} />
                <div style={{ fontSize: '12px', fontWeight: 700 }}>Afternoon</div>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>12:00–16:00</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSlot('evening')}
                style={{
                  padding: '10px 6px',
                  borderRadius: '10px',
                  border: selectedSlot === 'evening' ? '2px solid #d4fa35' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: selectedSlot === 'evening' ? 'rgba(212, 250, 53, 0.12)' : '#1a1b1f',
                  color: selectedSlot === 'evening' ? '#ffffff' : 'var(--color-fog)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <Moon size={16} style={{ color: selectedSlot === 'evening' ? '#d4fa35' : 'inherit', margin: '0 auto 4px auto' }} />
                <div style={{ fontSize: '12px', fontWeight: 700 }}>Evening</div>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>16:00–20:00</div>
              </button>
            </div>

            {bookingSuccess && (
              <div style={{ padding: '8px 12px', background: 'rgba(34, 197, 94, 0.15)', color: '#86efac', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', fontSize: '12px', marginBottom: '14px', textAlign: 'center' }}>
                {bookingSuccess}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelectedForBooking(null)}
                disabled={bookingLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleQuickBookSlot}
                disabled={bookingLoading}
                style={{ fontWeight: 700 }}
              >
                {bookingLoading ? 'Scheduling Job…' : `Confirm ${selectedSlot.toUpperCase()} Booking`}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Recurring Schedule"
        message="Are you sure you want to delete this recurring maintenance schedule? Future automated reminder triggers for this property will stop."
        confirmText="Confirm Delete"
        loading={deleteLoading}
      />
    </div>
  )
}
