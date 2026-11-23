import { createClient } from '@/lib/supabase/server'
import { RecurringClient } from './recurring-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Recurring Services',
}

export default async function RecurringPage() {
  const supabase = await createClient()

  let templates: any[] = []
  try {
    const { data } = await supabase
      .from('recurring_templates')
      .select('*, customer:customers(name), property:properties(address_line1, postcode)')
      .order('next_due_at', { ascending: true })
    if (data) {
      templates = data
    }
  } catch {
    templates = []
  }

  return (
    <div className="page-content">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Recurring Job Templates</h1>
          <p className="page-subtitle">
            Automate annual boiler servicing, landlord CP12 reminders, and 5-year inspections
          </p>
        </div>
      </div>

      <RecurringClient templates={templates} />
    </div>
  )
}
