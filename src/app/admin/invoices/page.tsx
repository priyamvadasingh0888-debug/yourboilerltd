import { createClient } from '@/lib/supabase/server'
import { InvoicesClient } from './invoices-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Invoices & Billing',
}

export default async function InvoicesPage() {
  const supabase = await createClient()

  let invoices: any[] = []
  try {
    const { data } = await supabase
      .from('invoices')
      .select('*, customer:customers(name)')
      .order('created_at', { ascending: false })
    if (data) {
      invoices = data
    }
  } catch {
    invoices = []
  }

  const outstandingTotal = invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + (i.total || 0), 0)

  const paidTotal = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (i.total || 0), 0)

  const formatGBP = (amount: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)

  return (
    <div className="page-content">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Invoices & Billing</h1>
          <p className="page-subtitle">
            Manage customer invoicing, track payments, and VAT breakdown
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-label">Outstanding Invoices</div>
          <div className="stat-value" style={{ color: 'var(--color-crimson)' }}>
            {formatGBP(outstandingTotal)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Collected Payments</div>
          <div className="stat-value" style={{ color: '#27a644' }}>
            {formatGBP(paidTotal)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Active Invoices</div>
          <div className="stat-value" style={{ color: 'var(--color-paper)' }}>
            {invoices.length}
          </div>
        </div>
      </div>

      <InvoicesClient invoices={invoices} />
    </div>
  )
}
