export interface DemoUser {
  id: string
  email: string
  role: 'admin' | 'office_staff' | 'engineer'
  full_name: string
}

export const DEMO_USERS: Record<string, DemoUser> = {
  admin: {
    id: 'aaaaaaaa-0000-0000-0000-000000000001',
    email: 'sarah@yourboiler.co.uk',
    role: 'admin',
    full_name: 'Sarah Thompson',
  },
  engineer: {
    id: 'aaaaaaaa-0000-0000-0000-000000000003',
    email: 'mike@yourboiler.co.uk',
    role: 'engineer',
    full_name: 'Mike Evans',
  },
}

export const DEMO_COOKIE_NAME = 'boiler_demo_session'

export function parseDemoCookie(cookieValue?: string | null): DemoUser | null {
  if (!cookieValue) return null
  const trimmed = cookieValue.trim()
  if (trimmed === 'admin' || trimmed === '"admin"') {
    return DEMO_USERS.admin
  }
  if (trimmed === 'engineer' || trimmed === '"engineer"') {
    return DEMO_USERS.engineer
  }
  try {
    const direct = JSON.parse(cookieValue)
    if (direct && direct.role) return direct as DemoUser
  } catch {}
  try {
    const parsed = JSON.parse(decodeURIComponent(cookieValue))
    if (parsed && parsed.role) return parsed as DemoUser
  } catch {}
  return null
}
