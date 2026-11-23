'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, LayoutDashboard } from 'lucide-react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin layout error:', error)
  }, [error])

  return (
    <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div
        className="card"
        style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          padding: '32px 24px',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'rgba(235, 87, 87, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <AlertTriangle size={20} color="var(--color-coral-red)" />
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--color-paper)' }}>
          Failed to load operations data
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-fog)', lineHeight: 1.5, marginBottom: '20px' }}>
          An error occurred while communicating with the database. Please try reloading this section or return to the overview.
        </p>

        {error.digest && (
          <div
            style={{
              padding: '4px 10px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-fog)',
              marginBottom: '18px',
              display: 'inline-block',
            }}
          >
            Ref: {error.digest}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => reset()}
            className="btn btn-primary"
            style={{ gap: '6px' }}
          >
            <RotateCcw size={14} /> Retry
          </button>
          <Link href="/admin" className="btn btn-secondary" style={{ gap: '6px' }}>
            <LayoutDashboard size={14} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
