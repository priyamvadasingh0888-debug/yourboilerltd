import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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

function getServiceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'
}

export async function createClient() {
  if (!isSupabaseConfigured()) {
    return createMockClient()
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(
    getSupabaseUrl(),
    getAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export async function createServiceClient() {
  if (!isSupabaseConfigured()) {
    return createMockClient()
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(
    getSupabaseUrl(),
    getServiceKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
