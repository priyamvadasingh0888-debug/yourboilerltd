'use client'

import { AlertTriangle, X } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
  isDestructive?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  loading = false,
  isDestructive = true,
}: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!loading) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-container"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '440px' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: isDestructive ? 'rgba(235, 87, 87, 0.12)' : 'rgba(251, 191, 36, 0.12)',
              border: `1px solid ${isDestructive ? 'rgba(235, 87, 87, 0.25)' : 'rgba(251, 191, 36, 0.25)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle
              size={18}
              color={isDestructive ? 'var(--color-coral-red)' : '#fbbf24'}
              strokeWidth={2.2}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--color-paper)',
                margin: '0 0 4px 0',
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--color-fog)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {message}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ padding: '4px', minHeight: 'auto', minWidth: 'auto', color: 'var(--color-fog)' }}
            onClick={() => {
              if (!loading) onClose()
            }}
            disabled={loading}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            marginTop: '20px',
            paddingTop: '14px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${isDestructive ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
