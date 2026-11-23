'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Critical global error:', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: '#0b0b0b',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            maxWidth: '460px',
            textAlign: 'center',
            padding: '32px 24px',
            background: '#191919',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(235, 87, 87, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#eb5757',
              fontSize: '20px',
              fontWeight: 'bold',
            }}
          >
            !
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>
            System Encountered an Error
          </h2>
          <p style={{ fontSize: '13px', color: '#868f97', lineHeight: 1.5, margin: '0 0 20px 0' }}>
            A critical application error occurred. Please click below to reload the app.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: '#d6fe51',
              color: '#0b0b0b',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  )
}
