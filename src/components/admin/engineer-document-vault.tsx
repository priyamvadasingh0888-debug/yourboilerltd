'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Image as ImageIcon, Upload, Trash2, Calendar, Plus, X, Download } from 'lucide-react'
import { uploadEngineerDocument, deleteEngineerDocument } from '@/app/admin/engineers/actions'

interface DocumentItem {
  id: string
  engineer_id: string
  document_name: string
  file_url: string
  file_type: string
  file_size_bytes: number | null
  expiry_date: string | null
  notes: string | null
  created_at: string
}

interface Props {
  engineerId: string
  initialDocuments?: DocumentItem[]
}

export function EngineerDocumentVault({ engineerId, initialDocuments = [] }: Props) {
  const router = useRouter()
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments)
  const [isUploading, setIsUploading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [docName, setDocName] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [fileType, setFileType] = useState('pdf')
  const [expiryDate, setExpiryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  // Handle document upload or local file base64 attachment
  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setDocName(file.name.replace(/\.[^/.]+$/, ''))
    setFileType(file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'))

    const reader = new FileReader()
    reader.onload = () => {
      setFileUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function handleSaveDocument(e: React.FormEvent) {
    e.preventDefault()
    if (!docName.trim()) {
      setError('Please provide a document title')
      return
    }

    const finalUrl = fileUrl || `https://storage.yourboiler.co.uk/docs/${engineerId}/${encodeURIComponent(docName)}.${fileType.includes('pdf') ? 'pdf' : 'jpg'}`
    setIsUploading(true)
    setError('')

    const res = await uploadEngineerDocument({
      engineerId,
      documentName: docName,
      fileUrl: finalUrl,
      fileType,
      expiryDate: expiryDate || null,
      notes: notes || null,
    })

    setIsUploading(false)

    if (res.error) {
      setError(res.error)
    } else {
      if (res.document) {
        setDocuments(prev => [res.document, ...prev])
      }
      setShowModal(false)
      setDocName('')
      setFileUrl('')
      setExpiryDate('')
      setNotes('')
      router.refresh()
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm('Are you sure you want to remove this document?')) return
    const res = await deleteEngineerDocument(docId, engineerId)
    if (res.success) {
      setDocuments(prev => prev.filter(d => d.id !== docId))
      router.refresh()
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h3
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--color-ash)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: 0,
            }}
          >
            Additional Documents &amp; Accreditations
          </h3>
          <p style={{ fontSize: '11px', color: 'var(--color-fog)', margin: '2px 0 0 0' }}>
            Store insurance policies, Gas Safe certs, photo ID, or qualifications (Any format: PDF, images)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
        >
          <Plus size={13} /> Add File
        </button>
      </div>

      {documents.length === 0 ? (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '12px',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
            color: 'var(--color-fog)',
            fontSize: '12px',
          }}
        >
          <Upload size={20} style={{ margin: '0 auto 6px auto', opacity: 0.5 }} />
          No additional documents uploaded yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {documents.map(doc => {
            const isPdf = doc.file_type.includes('pdf') || doc.document_name.endsWith('.pdf')
            return (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: isPdf ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                      color: isPdf ? '#ef4444' : '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isPdf ? <FileText size={16} /> : <ImageIcon size={16} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-paper)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {doc.document_name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-fog)', marginTop: '2px' }}>
                      {doc.expiry_date ? `Expires: ${doc.expiry_date}` : 'Permanent credential'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {doc.file_url && (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      download={doc.document_name}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '6px' }}
                      title="View / Download"
                    >
                      <Download size={14} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '6px', color: 'var(--color-coral-red)' }}
                    title="Remove Document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upload Document Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#151619',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Attach Document to Profile
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-fog)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {error && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', borderRadius: '8px', fontSize: '12px', marginBottom: '12px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSaveDocument} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Select File (PDF, Image, etc.)</label>
                <input
                  type="file"
                  accept="application/pdf,image/*,.doc,.docx"
                  onChange={handleFileSelected}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--color-paper)',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label className="form-label">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Public Liability Insurance 2026-2027"
                  value={docName}
                  onChange={e => setDocName(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="form-label">Document Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  className="input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="btn btn-primary"
                >
                  {isUploading ? 'Uploading…' : 'Attach File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
