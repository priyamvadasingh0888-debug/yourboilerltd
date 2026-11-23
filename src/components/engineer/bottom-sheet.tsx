'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: React.ReactNode
  maxHeight?: string
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = '85vh',
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease forwards',
        }}
      />

      {/* Slide-Up Sheet Container */}
      <div
        ref={sheetRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '540px',
          margin: '0 auto',
          maxHeight,
          background: '#ffffff',
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 101,
          animation: 'slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 16px))',
          boxSizing: 'border-box',
        }}
      >
        {/* Grab Handle bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '12px 0 6px 0',
            cursor: 'pointer',
          }}
          onClick={onClose}
        >
          <div
            style={{
              width: '40px',
              height: '5px',
              borderRadius: '99px',
              background: '#e2e5eb',
            }}
          />
        </div>

        {/* Header */}
        {(title || subtitle) && (
          <div
            style={{
              padding: '6px 20px 14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            }}
          >
            <div>
              {title && (
                <div style={{ fontSize: '17px', fontWeight: 700, color: '#111215', letterSpacing: '-0.01em' }}>
                  {title}
                </div>
              )}
              {subtitle && (
                <div style={{ fontSize: '12px', color: '#747b86', marginTop: '2px' }}>
                  {subtitle}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close sheet"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#f0f2f5',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#747b86',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '16px 20px',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
