'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { InvoiceStatus } from '@/types/database'

export async function updateInvoiceStatus(invoiceId: string, newStatus: InvoiceStatus) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized: Please sign in' }

    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    if (newStatus === 'paid') {
      updatePayload.paid_at = new Date().toISOString()
    } else if (newStatus === 'sent') {
      updatePayload.issue_date = new Date().toISOString().slice(0, 10)
    }

    const { error } = await supabase
      .from('invoices')
      .update(updatePayload)
      .eq('id', invoiceId)

    if (error) {
      logger.error('Failed to update invoice status', { invoiceId, newStatus, error })
      return { error: logger.toUserMessage(error) }
    }

    logger.info('Invoice status updated', { invoiceId, newStatus })
    revalidatePath('/admin/invoices')
    revalidatePath('/admin')
    return { success: true }
  } catch (err) {
    logger.error('Unexpected error in updateInvoiceStatus', { invoiceId }, err)
    return { error: 'An unexpected error occurred while updating invoice' }
  }
}

export async function deleteInvoice(invoiceId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized: Please sign in' }

    // Only draft or cancelled invoices should be removable
    const { data: invoice } = await supabase
      .from('invoices')
      .select('status, invoice_number')
      .eq('id', invoiceId)
      .single()

    if (!invoice) return { error: 'Invoice not found' }

    if (invoice.status === 'paid') {
      return { error: 'Paid invoices cannot be deleted for tax and audit compliance.' }
    }

    const { error } = await supabase.from('invoices').delete().eq('id', invoiceId)
    if (error) {
      logger.error('Failed to delete invoice', { invoiceId, error })
      return { error: logger.toUserMessage(error) }
    }

    logger.info('Invoice deleted', { invoiceId, number: invoice.invoice_number })
    revalidatePath('/admin/invoices')
    revalidatePath('/admin')
    return { success: true }
  } catch (err) {
    logger.error('Unexpected error in deleteInvoice', { invoiceId }, err)
    return { error: 'An unexpected error occurred while deleting invoice' }
  }
}
