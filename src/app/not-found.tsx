import Link from 'next/link'
import { ArrowLeft, Compass } from 'lucide-react'

export default function NotFound() {
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
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center',
          padding: '36px 28px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(214, 254, 81, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
          }}
        >
          <Compass size={24} color="var(--color-acid-lime, #d6fe51)" />
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--color-paper)' }}>
          404 — Page Not Found
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-fog)', lineHeight: 1.5, margin: '0 0 24px 0' }}>
          The page or record you are looking for does not exist or has been relocated.
        </p>

        <Link href="/admin" className="btn btn-primary" style={{ display: 'inline-flex', gap: '6px' }}>
          <ArrowLeft size={14} /> Return to Dashboard
        </Link>
      </div>
    </div>
  )
}
