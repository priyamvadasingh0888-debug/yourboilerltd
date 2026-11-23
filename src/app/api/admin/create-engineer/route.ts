import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { parseDemoCookie, DEMO_COOKIE_NAME } from '@/lib/auth/demo'

export async function POST(request: NextRequest) {
  // Check auth session: only authenticated admins may provision engineers
  const cookieStore = await cookies()
  const demoUser = parseDemoCookie(cookieStore.get(DEMO_COOKIE_NAME)?.value)

  if (demoUser && demoUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  if (isSupabaseConfigured() && !demoUser) {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please sign in' }, { status: 401 })
    }

    const { data: profile } = await authClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 })
    }
  }

  const body = await request.json().catch(() => null)

  if (!body?.name || !body?.email || !body?.password) {
    return NextResponse.json(
      { error: 'name, email, and password are required.' },
      { status: 400 }
    )
  }

  const {
    name,
    email,
    password,
    phone = null,
    gasSafeNumber = null,
    gasSafeExpiry = null,
    licenseNumber = null,
    category = 'in_house',
    qualifications = [],
    specialties = [],
    scheduleColour = '#6366f1',
  } = body as {
    name: string
    email: string
    password: string
    phone?: string | null
    gasSafeNumber?: string | null
    gasSafeExpiry?: string | null
    licenseNumber?: string | null
    category?: 'in_house' | 'subcontractor'
    qualifications?: string[]
    specialties?: string[]
    scheduleColour?: string
  }

  if ((password as string).length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters.' },
      { status: 400 }
    )
  }

  // Demo / unconfigured mode — simulate success
  if (!isSupabaseConfigured() || demoUser) {
    return NextResponse.json({
      ok: true,
      demo: true,
      message: `Demo mode: engineer "${name}" (${email}) would be created in production.`,
    })
  }

  try {
    const supabase = await createServiceClient()

    // 1. Create the Supabase Auth user (email pre-confirmed so they can log in immediately)
    let authData: any = null
    let authError: any = null

    const createRes = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'engineer', full_name: name },
    })

    authData = createRes.data
    authError = createRes.error

    // If account was previously registered (e.g. deleted/orphaned engineer account), clean up and recreate
    if (authError && (authError.message.toLowerCase().includes('already') || authError.status === 422)) {
      const { data: listRes } = await supabase.auth.admin.listUsers()
      const existingUser = listRes?.users?.find(
        (u: any) => u.email?.toLowerCase() === email.toLowerCase()
      )

      if (existingUser) {
        const { data: activeEng } = await supabase
          .from('engineers')
          .select('id')
          .eq('profile_id', existingUser.id)
          .maybeSingle()

        if (!activeEng) {
          // No active engineer record: clean up orphaned records and purge old auth user
          await supabase.from('jobs').update({ created_by: null }).eq('created_by', existingUser.id)
          await supabase.from('job_status_history').update({ changed_by: null }).eq('changed_by', existingUser.id)
          await supabase.from('job_notes').delete().eq('author_id', existingUser.id)
          await supabase.from('notifications').delete().eq('user_id', existingUser.id)
          await supabase.auth.admin.deleteUser(existingUser.id)
          await supabase.from('profiles').delete().eq('id', existingUser.id)

          // Recreate cleanly
          const retryRes = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: 'engineer', full_name: name },
          })
          authData = retryRes.data
          authError = retryRes.error
        }
      }
    }

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'User creation failed.' }, { status: 500 })
    }

    // 2. Upsert profile row with full details
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: name,
      email,
      role: 'engineer',
      phone: phone ?? null,
    })

    if (profileError) {
      console.warn('Profile upsert warning:', profileError.message)
    }

    // 3. Upsert engineer row with all details (in case handle_new_user trigger already created empty shell)
    const { error: engError } = await supabase.from('engineers').upsert(
      {
        profile_id: userId,
        availability_status: 'available',
        schedule_colour: scheduleColour,
        gas_safe_number: gasSafeNumber ?? null,
        gas_safe_expiry: gasSafeExpiry ?? null,
        license_number: licenseNumber ?? gasSafeNumber ?? null,
        category,
        qualifications,
        specialties,
        phone: phone ?? null,
      },
      { onConflict: 'profile_id' }
    )

    if (engError) {
      console.error('Engineer upsert error:', engError.message)
      return NextResponse.json({ error: engError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, userId })
  } catch (err: any) {
    console.error('create-engineer error:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Internal server error.' },
      { status: 500 }
    )
  }
}
