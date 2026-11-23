'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateInquiryStatus(id: string, status: 'new' | 'in_review' | 'rejected' | 'converted') {
  const supabase = await createClient()
  await supabase
    .from('inquiries')
    .update({ status })
    .eq('id', id)

  revalidatePath('/admin/inquiries')
  return { success: true }
}

export async function deleteInquiry(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('inquiries').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/inquiries')
  return { success: true }
}
