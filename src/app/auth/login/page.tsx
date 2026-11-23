import type { Metadata } from 'next'
import LoginForm from './login-form'

export const metadata: Metadata = {
  title: 'Sign In | Your Boiler Ltd',
  description: 'Operations Terminal and Field Service Management for Your Boiler Ltd.',
}

export default function LoginPage() {
  return (
    <main className="auth-page-wrapper">
      <div className="auth-split-card">
        {/* Left Visual Panel */}
        <div
          className="auth-visual-panel"
          style={{ backgroundImage: `url('/images/auth-hero.jpg')` }}
        >
          <div className="auth-visual-overlay" />

          <div className="auth-visual-content" style={{ justifyContent: 'flex-end' }}>
            {/* Balanced atmospheric caption & carousel indicator */}
            <div style={{ maxWidth: '330px' }}>
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: 600,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.3,
                  marginBottom: '8px',
                }}
              >
                Precision Heating,<br />Built on Reliability
              </h2>
              <p
                style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  lineHeight: 1.45,
                  marginBottom: '18px',
                }}
              >
                Smart field operations and certified gas engineering.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '26px', height: '3px', borderRadius: '99px', background: 'rgba(255, 255, 255, 0.95)' }} />
                <div style={{ width: '6px', height: '3px', borderRadius: '99px', background: 'rgba(255, 255, 255, 0.3)' }} />
                <div style={{ width: '6px', height: '3px', borderRadius: '99px', background: 'rgba(255, 255, 255, 0.3)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="auth-form-panel">
          <div style={{ marginBottom: '22px' }}>
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 600,
                color: 'var(--color-paper)',
                letterSpacing: '-0.025em',
                marginBottom: '6px',
              }}
            >
              Sign in to your account
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--color-fog)' }}>
              Enter your credentials or choose a quick demo profile below
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </main>
  )
}
