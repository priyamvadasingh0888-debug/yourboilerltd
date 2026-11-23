'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/** Fetches new-inquiry count client-side so the layout renders instantly. */
export function useInquiryCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new')
      .then(({ count: c }: { count: number | null }) => setCount(c ?? 0))
  }, [])

  return count
}
