'use client'

import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import { createMockClient } from './mock-client'

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return false
  if (
    url.includes('your-project.supabase.co') ||
    url.includes('placeholder.supabase.co') ||
    url.includes('your-supabase-url') ||
    key.includes('your-anon-key') ||
    key.includes('placeholder')
  ) {
    return false
  }
  return true
}

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url || !url.startsWith('http')) {
    return 'https://placeholder.supabase.co'
  }
  return url
}

function getAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
}

export function createClient() {
  if (!isSupabaseConfigured()) {
    return createMockClient()
  }

  return createBrowserClient<Database>(
    getSupabaseUrl(),
    getAnonKey()
  )
}

