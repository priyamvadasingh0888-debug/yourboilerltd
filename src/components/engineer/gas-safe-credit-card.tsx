'use client'

import { useState } from 'react'
import { Flame, ShieldCheck, Wifi, RotateCw, Copy, Check, QrCode } from 'lucide-react'

interface Props {
  engineerName?: string
  licenceNumber?: string
  expiryDate?: string
  className?: string
  compact?: boolean
  showControls?: boolean
}

export function GasSafeCreditCard({
  engineerName = 'Mike Evans',
  licenceNumber = '123456',
  expiryDate = '30/06/2026',
  className = '',
  compact = false,
  showControls = true,
}: Props) {
  const [variant, setVariant] = useState<'lime' | 'black'>('lime')
  const [isFlipped, setIsFlipped] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(licenceNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`credit-card-container ${className}`} style={{ width: '100%' }}>
      {/* 3D Flippable License Smart Card */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: compact ? '1.75 / 1' : '1.586 / 1',
          perspective: '1000px',
          cursor: 'pointer',
        }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* ─── FRONT SIDE: OFFICIAL GAS SAFE PHOTO ID LICENSE ─── */}
          <div
            className={`credit-card ${variant === 'lime' ? 'credit-card-lime' : 'credit-card-black'}`}
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              padding: compact ? '16px 18px' : '22px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div className="card-pattern" />
            <div className="card-monogram">GAS SAFE</div>

            {/* Top Bar: Official Register Emblem & Licence Heading */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    background: variant === 'lime' ? '#111215' : 'rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Flame size={17} color={variant === 'lime' ? '#d4fa35' : '#ffffff'} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    YOUR BOILER LTD
                  </div>
                  <div style={{ fontSize: '9px', opacity: 0.75, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    GAS SAFE OPERATIVE ID
                  </div>
                </div>
              </div>

              {/* Official Gas Safe Register Triangle Shield Badge (NOT Mastercard circles!) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: variant === 'lime' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(8px)',
                  border: variant === 'lime' ? '1px solid rgba(0, 0, 0, 0.15)' : '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    background: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Flame size={9} color="#111215" />
                </div>
                <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.05em' }}>
                  GAS SAFE REGISTER
                </span>
              </div>
            </div>

            {/* Middle Section: Photo ID + Smart Chip + License Number */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', zIndex: 2, margin: '6px 0' }}>
              {/* Photo ID Badge on the Card */}
              <div
                style={{
                  width: compact ? '44px' : '52px',
                  height: compact ? '52px' : '62px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: variant === 'lime' ? '2px solid rgba(0, 0, 0, 0.2)' : '2px solid rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
                  flexShrink: 0,
                  position: 'relative',
                  background: '#ffffff',
                }}
              >
                <img
                  src="/images/engineer-avatar.jpg"
                  alt={engineerName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* Smart ID Chip & Numbering */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div className="emv-chip" style={{ width: '36px', height: '26px' }} />
                  <Wifi size={16} style={{ transform: 'rotate(90deg)', opacity: 0.65 }} />
                  <div
                    style={{
                      marginLeft: 'auto',
                      fontSize: '9px',
                      fontWeight: 700,
                      color: variant === 'lime' ? '#111215' : '#4ade80',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ShieldCheck size={12} /> LICENSED
                  </div>
                </div>

                <div style={{ fontSize: '9px', opacity: 0.75, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  REGISTRATION NO.
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: compact ? '17px' : '20px',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    lineHeight: 1.1,
                  }}
                >
                  {licenceNumber}
                </div>
              </div>
            </div>

            {/* Bottom Section: Name, Security No, Expiry */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', zIndex: 2 }}>
              <div>
                <div style={{ fontSize: '8px', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  CERTIFIED GAS OPERATIVE
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                  {engineerName}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '8px', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  EXPIRES
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                  {expiryDate}
                </div>
              </div>
            </div>
          </div>

          {/* ─── BACK SIDE: OFFICIAL COMPETENCIES & VERIFICATION QR ─── */}
          <div
            className={`credit-card ${variant === 'lime' ? 'credit-card-lime' : 'credit-card-black'}`}
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            {/* Top: Official Verification Barcode Strip (NOT Bank Magnetic Tape) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '8px',
                borderBottom: variant === 'lime' ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <div>
                <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  GAS SAFE REGISTER VALIDATION
                </div>
                <div style={{ fontSize: '8px', opacity: 0.7 }}>
                  Card Serial: 9482-1049-ENG · Sector: Domestic
                </div>
              </div>

              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  letterSpacing: '0.15em',
                  opacity: 0.8,
                  fontWeight: 700,
                }}
              >
                ||| | |||| | ||| ||||
              </div>
            </div>

            {/* Middle: Certified Scope of Work (The real categories on a Gas Safe card) */}
            <div style={{ margin: '4px 0' }}>
              <div style={{ fontSize: '8px', fontWeight: 800, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                CERTIFIED WORK CATEGORIES:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', fontSize: '9px', fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={10} color="#16a34a" /> Boilers (CENWAT)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={10} color="#16a34a" /> Pipework (CCN1)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={10} color="#16a34a" /> Gas Safety CP12
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={10} color="#16a34a" /> Combustion (CPA1)
                </div>
              </div>
            </div>

            {/* Signature & Verification QR (No CVV!) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '8px',
                borderTop: variant === 'lime' ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <div>
                <div style={{ fontSize: '8px', opacity: 0.7, textTransform: 'uppercase' }}>OPERATIVE SIGNATURE</div>
                <div
                  style={{
                    fontFamily: 'cursive',
                    fontSize: '15px',
                    fontStyle: 'italic',
                    color: variant === 'lime' ? '#111215' : '#ffffff',
                    marginTop: '2px',
                  }}
                >
                  {engineerName}
                </div>
                <div style={{ fontSize: '8px', opacity: 0.65, marginTop: '2px' }}>
                  Verify: gassaferegister.co.uk · 0800 408 5500
                </div>
              </div>

              <div
                style={{
                  width: '42px',
                  height: '42px',
                  background: '#ffffff',
                  borderRadius: '6px',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  flexShrink: 0,
                }}
                title="Scan to verify license on Gas Safe Register"
              >
                <QrCode size={34} color="#111111" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Controls Row */}
      {showControls && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '12px',
            padding: '0 4px',
          }}
        >
          {/* Card theme toggle buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setVariant('lime')}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#d4fa35',
                border: variant === 'lime' ? '2px solid #111215' : '2px solid transparent',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
              }}
              title="Electric Lime License"
            />
            <button
              type="button"
              onClick={() => setVariant('black')}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#15161a',
                border: variant === 'black' ? '2px solid #d4fa35' : '2px solid #e2e8f0',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
              }}
              title="Obsidian Black License"
            />
            <span style={{ fontSize: '11px', color: '#747b86', marginLeft: '4px' }}>
              {variant === 'lime' ? 'Electric Lime' : 'Obsidian Black'}
            </span>
          </div>

          {/* Flip Card & Copy Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopy}
              className="neo-btn-outline"
              style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '99px' }}
            >
              {copied ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
              {copied ? 'Copied' : `Reg #${licenceNumber}`}
            </button>
            <button
              type="button"
              onClick={() => setIsFlipped(!isFlipped)}
              className="neo-btn-outline"
              style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '99px' }}
            >
              <RotateCw size={12} />
              Flip Card
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
