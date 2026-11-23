'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { loginAsDemo } from '../actions'
import { Shield, Wrench, Eye, EyeOff, Check } from 'lucide-react'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError('')
    setErrors({})

    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach(issue => {
        fieldErrors[issue.path[0] as string] = issue.message
      })
      setErrors(fieldErrors)
      return
    }

    setLoading(true)

    // Check if explicit mock test account entered without configured Supabase
    const lowerEmail = email.toLowerCase()
    if (lowerEmail === 'admin@test.com') {
      await loginAsDemo('admin')
      return
    }

    if (lowerEmail === 'engineer@test.com') {
      await loginAsDemo('engineer')
      return
    }

    try {
      // Clear any legacy demo session cookie when performing real Supabase login
      document.cookie = 'boiler_demo_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
      const supabase = createClient()
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setServerError(error.message)
        setLoading(false)
        return
      }

      if (authData?.user) {
        const userRole = authData.user.user_metadata?.role || authData.user.app_metadata?.role
        if (userRole === 'inactive' || authData.user.user_metadata?.status === 'deleted') {
          await supabase.auth.signOut()
          setServerError('This account has been deactivated or removed.')
          setLoading(false)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .maybeSingle()

        if (profile?.role === 'inactive') {
          await supabase.auth.signOut()
          setServerError('This account has been deactivated or removed.')
          setLoading(false)
          return
        }

        if (userRole === 'engineer' || profile?.role === 'engineer') {
          const { data: engineerRecord } = await supabase
            .from('engineers')
            .select('id')
            .eq('profile_id', authData.user.id)
            .maybeSingle()

          if (!engineerRecord) {
            await supabase.auth.signOut()
            setServerError('This engineer account has been removed by an administrator.')
            setLoading(false)
            return
          }
        }
      }

      router.push('/')
      router.refresh()
    } catch (err: any) {
      setServerError(err?.message || 'Login failed. Please check your credentials.')
      setLoading(false)
    }
  }

  const handleQuickDemo = async (role: 'admin' | 'engineer') => {
    setDemoLoading(role)
    await loginAsDemo(role)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {serverError && (
        <div
          style={{
            background: 'rgba(235,87,87,0.08)',
            border: '1px solid rgba(235,87,87,0.22)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '13px',
            color: 'var(--color-coral-red)',
          }}
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Email Field */}
        <div className="auth-input-group">
          <label
            htmlFor="email"
            style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-fog)' }}
          >
            Email
          </label>
          <div className="auth-input-wrapper">
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@test.com or name@yourboiler.co.uk"
              autoComplete="email"
            />
          </div>
          {errors.email && (
            <span style={{ fontSize: '11px', color: 'var(--color-coral-red)', marginTop: '2px' }}>
              {errors.email}
            </span>
          )}
        </div>

        {/* Password Field */}
        <div className="auth-input-group">
          <label
            htmlFor="password"
            style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-fog)' }}
          >
            Password
          </label>
          <div className="auth-input-wrapper">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="auth-input-icon-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <span style={{ fontSize: '11px', color: 'var(--color-coral-red)', marginTop: '2px' }}>
              {errors.password}
            </span>
          )}
        </div>

        {/* Checkbox Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            userSelect: 'none',
            marginTop: '2px',
          }}
          onClick={() => setRememberMe(!rememberMe)}
        >
          <div
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '4px',
              background: rememberMe ? 'var(--color-paper)' : 'rgba(255, 255, 255, 0.05)',
              border: rememberMe ? '1px solid var(--color-paper)' : '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            {rememberMe && <Check size={13} color="#08090a" strokeWidth={3} />}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-mist)' }}>
            I agree to the <span style={{ textDecoration: 'underline', color: 'var(--color-paper)' }}>Terms &amp; Conditions</span>
          </span>
        </div>

        {/* Sign In Button */}
        <button
          id="login-submit"
          type="submit"
          className="auth-submit-btn"
          disabled={loading || !!demoLoading}
        >
          {loading ? (
            <>
              <span className="spinner" style={{ width: '14px', height: '14px', borderTopColor: '#08090a' }} />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </div>
  )
}
