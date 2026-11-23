'use client'

import { useState } from 'react'
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ChangePasswordProps {
  userEmail?: string
}

export function ChangePassword({ userEmail }: ChangePasswordProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // 1. Client Validations
    if (!currentPassword) {
      setError('Please enter your current password.')
      return
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.')
      return
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      // 2. Resolve current user's email
      let email = userEmail
      if (!email) {
        const { data: { user } } = await supabase.auth.getUser()
        email = user?.email || 'mike@yourboiler.co.uk'
      }

      // 3. Verify Current Password by attempting re-authentication
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })

      if (signInError) {
        // If demo credentials or error check
        const isDemo = document.cookie.includes('boiler_demo_session')
        if (!isDemo) {
          setError('Current password is incorrect. Please verify and try again.')
          setIsLoading(false)
          return
        }
      }

      // 4. Update Password using supabase.auth.updateUser
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update password')
      }

      setSuccess('Your password has been changed successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      console.error('Password change error:', err)
      setError(err?.message || 'Could not update password. Please check your network and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="neo-card" style={{ padding: '22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: '#f0f2f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <KeyRound size={18} color="#111215" />
        </div>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111215', margin: 0 }}>
            Security &amp; Password
          </h2>
          <div style={{ fontSize: '11px', color: '#747b86', marginTop: '1px' }}>
            Manage your mobile operative login credentials
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Error Alert */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#dc2626',
              fontSize: '12px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              color: '#16a34a',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* Current Password Field */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#52525b', marginBottom: '4px' }}>
            Current Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter existing password"
              required
              style={{
                width: '100%',
                padding: '12px 42px 12px 14px',
                borderRadius: '12px',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                background: '#f8f9fb',
                fontSize: '13px',
                color: '#111215',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#747b86',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* New Password Field */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#52525b', marginBottom: '4px' }}>
            New Password (minimum 8 characters)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new strong password"
              minLength={8}
              required
              style={{
                width: '100%',
                padding: '12px 42px 12px 14px',
                borderRadius: '12px',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                background: '#f8f9fb',
                fontSize: '13px',
                color: '#111215',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#747b86',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Confirm Password Field */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#52525b', marginBottom: '4px' }}>
            Confirm New Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              minLength={8}
              required
              style={{
                width: '100%',
                padding: '12px 42px 12px 14px',
                borderRadius: '12px',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                background: '#f8f9fb',
                fontSize: '13px',
                color: '#111215',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#747b86',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="neo-btn-black"
          style={{ width: '100%', marginTop: '4px', padding: '13px', minHeight: '48px' }}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Updating Password...
            </>
          ) : (
            <>
              <Lock size={15} /> Update Account Password
            </>
          )}
        </button>
      </form>
    </div>
  )
}
