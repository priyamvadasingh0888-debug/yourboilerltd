'use client'

import { useState, useEffect } from 'react'
import { Flame, Download, X, Share, PlusSquare, Check, Smartphone } from 'lucide-react'

// Shared state via custom event so any button on the page can trigger the install guide
const TRIGGER_INSTALL_EVENT = 'boiler_trigger_pwa_install'

export function triggerPwaInstall() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TRIGGER_INSTALL_EVENT))
  }
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<{
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  } | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS] = useState(() => {
    if (typeof window === 'undefined') return false
    return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
  })
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [installed, setInstalled] = useState(() => {
    if (typeof window === 'undefined') return false
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    )
  })

  useEffect(() => {
    // 1. Register service worker if available
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(err => console.log('SW registration note:', err))
    }

    // 2. Check if already installed / running standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true

    if (isStandalone) {
      setInstalled(true)
      return
    }

    // 3. Handle native Chrome/Edge/Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as unknown as {
        prompt: () => Promise<void>
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
      })
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Show prompt on load if not standalone (gives option whenever engineer visits)
    const timer = setTimeout(() => {
      if (!isStandalone) {
        setShowPrompt(true)
      }
    }, 600)

    // Listen for custom trigger from any button
    const handleCustomTrigger = () => {
      handleInstallClick()
    }
    window.addEventListener(TRIGGER_INSTALL_EVENT, handleCustomTrigger)

    // Listen for app installed event
    const handleAppInstalled = () => {
      setInstalled(true)
      setShowPrompt(false)
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener(TRIGGER_INSTALL_EVENT, handleCustomTrigger)
      window.removeEventListener('appinstalled', handleAppInstalled)
      clearTimeout(timer)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setInstalled(true)
        setShowPrompt(false)
      }
      setDeferredPrompt(null)
    } else if (isIOS) {
      setShowIOSGuide(true)
    } else {
      setShowIOSGuide(true)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
  }

  if (installed) return null

  return (
    <>
      {/* Floating PWA Install Banner */}
      {showPrompt && (
        <div
          style={{
            position: 'fixed',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 24px)',
            maxWidth: '460px',
            background: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.08)',
            padding: '14px 16px',
            zIndex: 99,
            animation: 'slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* App Icon */}
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '11px',
                background: '#d4fa35',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              }}
            >
              <Flame size={22} color="#111215" />
            </div>

            {/* Text Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111215' }}>
                Install Engineer App
              </div>
              <div style={{ fontSize: '11px', color: '#747b86', marginTop: '1px', lineHeight: 1.3 }}>
                Instant field access, offline certs &amp; live socket jobs
              </div>
            </div>

            {/* Install & Dismiss Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={handleInstallClick}
                style={{
                  background: '#111215',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '99px',
                  padding: '7px 14px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                }}
              >
                <Download size={13} /> Install
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                style={{
                  background: '#f3f4f7',
                  border: 'none',
                  borderRadius: '50%',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#747b86',
                }}
                aria-label="Dismiss install prompt"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step-by-Step Installation Modal */}
      {showIOSGuide && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              background: '#ffffff',
              borderRadius: '26px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              marginBottom: '10px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#d4fa35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Flame size={16} color="#111215" />
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#111215' }}>
                  Install Engineer PWA
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                style={{ background: '#f3f4f7', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={15} color="#747b86" />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#52525b', lineHeight: 1.4, margin: '0 0 16px 0' }}>
              Install the app to your phone for full-screen mode, instant offline access, and field dispatch:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8f9fb', padding: '12px 14px', borderRadius: '14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                  <Share size={16} color="#007aff" />
                </div>
                <div style={{ fontSize: '13px', color: '#111215' }}>
                  1. Tap the <strong>Share</strong> button (or browser menu ⋮)
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8f9fb', padding: '12px 14px', borderRadius: '14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                  <PlusSquare size={16} color="#111215" />
                </div>
                <div style={{ fontSize: '13px', color: '#111215' }}>
                  2. Select <strong>&ldquo;Add to Home Screen&rdquo;</strong> or <strong>&ldquo;Install App&rdquo;</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8f9fb', padding: '12px 14px', borderRadius: '14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                  <Check size={16} color="#16a34a" strokeWidth={3} />
                </div>
                <div style={{ fontSize: '13px', color: '#111215' }}>
                  3. Tap <strong>Add</strong> to launch from your home screen
                </div>
              </div>
            </div>

            <button
              type="button"
              className="neo-btn-black"
              style={{ width: '100%', marginTop: '18px' }}
              onClick={() => setShowIOSGuide(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Compact pill button that can be embedded anywhere (e.g. Header, Profile)
 */
export function InstallPwaHeaderButton() {
  const [isStandalone, setIsStandalone] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
      setIsStandalone(standalone)
    }
  }, [])

  if (isStandalone) return null

  return (
    <button
      type="button"
      onClick={triggerPwaInstall}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '5px 10px',
        borderRadius: '99px',
        background: '#111215',
        color: '#d4fa35',
        border: '1px solid #111215',
        fontSize: '11px',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
      }}
    >
      <Download size={12} /> Install App
    </button>
  )
}
