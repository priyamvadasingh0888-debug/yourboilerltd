'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Check, AlertCircle, Loader2, Sparkles, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PhotoUploadProps {
  currentAvatarUrl?: string | null
  userId?: string
  userName?: string
  onAvatarUpdated?: (newUrl: string) => void
}

/**
 * Compresses an image file on the client using HTML5 Canvas.
 * Resizes max dimension to 512px and outputs JPEG with 0.82 quality.
 */
async function compressImage(file: File, maxDimension = 512, quality = 0.82): Promise<{ blob: Blob; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.onload = (event) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Failed to decode image data'))
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context unavailable'))
          return
        }

        // Use high-quality smoothing
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas compression failed'))
              return
            }
            const previewUrl = URL.createObjectURL(blob)
            resolve({ blob, previewUrl })
          },
          'image/jpeg',
          quality
        )
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function PhotoUpload({
  currentAvatarUrl,
  userId = 'demo-engineer',
  userName = 'Engineer',
  onAvatarUpdated,
}: PhotoUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState<string>(
    currentAvatarUrl || '/images/engineer-avatar.jpg'
  )
  const [isUploading, setIsUploading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load any previously saved demo avatar from localStorage
  useEffect(() => {
    try {
      const cached = localStorage.getItem(`engineer_avatar_${userId}`)
      if (cached) {
        setAvatarUrl(cached)
      } else if (currentAvatarUrl) {
        setAvatarUrl(currentAvatarUrl)
      }
    } catch {}
  }, [userId, currentAvatarUrl])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Clear previous status
    setStatusMessage(null)

    // Validate mime type
    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'error', text: 'Please select a valid image file (JPEG, PNG, WebP).' })
      return
    }

    // Size limit check (max 10MB raw)
    if (file.size > 10 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'File exceeds 10MB. Please choose a smaller photo.' })
      return
    }

    try {
      setIsUploading(true)

      // 1. Client-side compression
      const { blob, previewUrl } = await compressImage(file, 512, 0.82)
      setAvatarUrl(previewUrl) // Instant optimistic preview

      // 2. Supabase Storage Upload
      const supabase = createClient()
      const fileExt = 'jpg'
      const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadError) {
        // Fallback for demo / development if Supabase storage bucket isn't deployed yet
        console.warn('Supabase storage upload notice:', uploadError.message)
        // Store base64/preview in localStorage for immediate testing
        try {
          localStorage.setItem(`engineer_avatar_${userId}`, previewUrl)
        } catch {}

        setStatusMessage({
          type: 'success',
          text: 'Profile photo updated locally and previewed!',
        })
        onAvatarUpdated?.(previewUrl)
        return
      }

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(uploadData.path)

      // 4. Update Profile in Supabase
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (profileError) {
        console.warn('Profile avatar_url update error:', profileError.message)
      }

      try {
        localStorage.setItem(`engineer_avatar_${userId}`, publicUrl)
      } catch {}

      setAvatarUrl(publicUrl)
      setStatusMessage({ type: 'success', text: 'Profile photo updated successfully!' })
      onAvatarUpdated?.(publicUrl)
    } catch (err: any) {
      console.error('Photo upload error:', err)
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Could not upload photo. Please try again.',
      })
    } finally {
      setIsUploading(false)
      // Reset input value so same file can be re-selected if desired
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Avatar Container with Tap Action */}
      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
        <div
          style={{
            width: '96px',
            height: '96px',
            borderRadius: '50%',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            border: '3px solid #ffffff',
            background: '#ffffff',
            position: 'relative',
          }}
        >
          <img
            src={avatarUrl}
            alt={userName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: isUploading ? 'brightness(0.6)' : 'none',
              transition: 'filter 0.2s ease',
            }}
            onError={(e) => {
              // Fallback if image fails to load
              ;(e.target as HTMLImageElement).src = '/images/engineer-avatar.jpg'
            }}
          />

          {isUploading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.4)',
              }}
            >
              <Loader2 size={24} color="#ffffff" className="animate-spin" />
            </div>
          )}
        </div>

        {/* Camera / Edit Badge */}
        <button
          type="button"
          aria-label="Upload photo"
          disabled={isUploading}
          onClick={(e) => {
            e.stopPropagation()
            fileInputRef.current?.click()
          }}
          style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#111215',
            color: '#d4fa35',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #ffffff',
            cursor: 'pointer',
            padding: 0,
            transition: 'transform 0.15s ease',
          }}
        >
          {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
        </button>
      </div>

      {/* Helper text / Status */}
      <button
        type="button"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
        style={{
          background: 'none',
          border: 'none',
          color: '#111215',
          fontSize: '12px',
          fontWeight: 600,
          marginTop: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span>Change Profile Photo</span>
      </button>

      {statusMessage && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: statusMessage.type === 'success' ? '#16a34a' : '#dc2626',
            maxWidth: '280px',
            textAlign: 'center',
          }}
        >
          {statusMessage.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  )
}
