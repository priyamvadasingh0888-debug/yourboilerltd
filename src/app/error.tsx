'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log client-side error digest
    console.error('Application error occurred:', error)
  }, [error])

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--surface-canvas, #0b0b0b)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: 'var(--color-paper, #ffffff)',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          padding: '36px 28px',
          background: 'var(--color-carbon, #191919)',
          borderRadius: 'var(--radius-xl, 12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(235, 87, 87, 0.12)',
            border: '1px solid rgba(235, 87, 87, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
          }}
        >
          <AlertTriangle size={24} color="var(--color-coral-red, #eb5757)" />
        </div>

        <h1
          style={{
            fontSize: '20px',
            fontWeight: 700,
            marginBottom: '8px',
            color: 'var(--color-paper, #ffffff)',
          }}
        >
          Something went wrong
        </h1>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--color-fog, #868f97)',
            lineHeight: 1.5,
            marginBottom: '24px',
          }}
        >
          An unexpected error occurred while loading this view. You can attempt to reload the component or return to the main dashboard.
        </p>

        {error.digest && (
          <div
            style={{
              padding: '6px 12px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '6px',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '11px',
              color: 'var(--color-fey-graphite, #868f97)',
              marginBottom: '20px',
              display: 'inline-block',
            }}
          >
            Ref: {error.digest}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => reset()}
            className="btn btn-primary"
            style={{ gap: '6px' }}
          >
            <RotateCcw size={14} /> Try Again
          </button>
          <Link href="/admin" className="btn btn-secondary" style={{ gap: '6px' }}>
            <Home size={14} /> Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
