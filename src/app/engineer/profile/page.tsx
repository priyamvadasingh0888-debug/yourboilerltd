'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Mail,
  Phone,
  Home,
  LogOut,
  Check,
  Edit3
} from 'lucide-react'
import { differenceInDays, parseISO, format } from 'date-fns'
import { GasSafeCreditCard } from '@/components/engineer/gas-safe-credit-card'
import { PhotoUpload } from '@/components/engineer/photo-upload'
import { ChangePassword } from '@/components/engineer/change-password'
import { createClient } from '@/lib/supabase/client'

export default function EngineerProfilePage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string>('')
  const [engineerName, setEngineerName] = useState('Engineer')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [depot, setDepot] = useState('Unit 4, Regent Industrial Park, Manchester M14 5QW')
  const [gasSafeNumber, setGasSafeNumber] = useState('GS198745')
  const [expiryDate, setExpiryDate] = useState<Date>(() => parseISO('2027-06-30'))
  const [qualifications, setQualifications] = useState<string[]>([
    'CCN1: Core Gas Safety',
    'CENWAT: Boilers & Water Heaters',
    'CKR1: Domestic Cookers',
    'HTR1: Space Heaters & Fires',
    'CPA1: Combustion Analysis',
    'MET1: Gas Meters',
  ])
  const [isEditingInfo, setIsEditingInfo] = useState(false)
  const [editSuccess, setEditSuccess] = useState(false)
  const [loading, setLoading] = useState(true)

  const daysRemaining = differenceInDays(expiryDate, new Date())

  useEffect(() => {
    async function loadEngineerData() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          setUserId(user.id)
          setEmail(user.email || '')

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profile) {
            setEngineerName(profile.full_name || 'Engineer')
            if (profile.phone) setPhone(profile.phone)
            if (profile.email) setEmail(profile.email)
          }

          const { data: eng } = await supabase
            .from('engineers')
            .select('*')
            .eq('profile_id', user.id)
            .single()

          if (eng) {
            if (eng.gas_safe_number) setGasSafeNumber(eng.gas_safe_number)
            if (eng.gas_safe_expiry) setExpiryDate(parseISO(eng.gas_safe_expiry))
            if (eng.phone) setPhone(eng.phone)
            if (eng.qualifications && eng.qualifications.length > 0) {
              setQualifications(eng.qualifications)
            }
          }
        }
      } catch (err) {
        console.error('Error loading engineer profile:', err)
      } finally {
        setLoading(false)
      }
    }

    loadEngineerData()
  }, [])

  const handleSignOut = async () => {
    document.cookie = 'boiler_demo_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {}
    router.push('/auth/login')
    router.refresh()
  }

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({
            full_name: engineerName,
            phone,
          })
          .eq('id', user.id)

        await supabase
          .from('engineers')
          .update({
            phone,
          })
          .eq('profile_id', user.id)
      }
      setIsEditingInfo(false)
      setEditSuccess(true)
      setTimeout(() => setEditSuccess(false), 2500)
    } catch (err) {
      console.error('Failed to update details:', err)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      {/* Top Title */}
      <div style={{ textAlign: 'center', marginBottom: '2px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#111215', margin: 0 }}>
          Profile &amp; Credentials
        </h1>
        <p style={{ fontSize: '12px', color: '#747b86', margin: '4px 0 0 0' }}>
          Gas Safe operative settings &amp; authentication
        </p>
      </div>

      {/* Avatar Header with Compression & Storage Upload */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <PhotoUpload
          userId={userId || 'current-user'}
          userName={engineerName}
          currentAvatarUrl="/images/engineer-avatar.jpg"
        />

        <div style={{ fontSize: '19px', fontWeight: 800, color: '#111215', marginTop: '10px', letterSpacing: '-0.02em' }}>
          {engineerName}
        </div>
        <div style={{ fontSize: '12px', color: '#747b86', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Gas Safe Registered Operative</span>
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#747b86' }} />
          <span style={{ color: '#16a34a', fontWeight: 600 }}>Active</span>
        </div>
      </div>

      {/* ─── OFFICIAL GAS SAFE DIGITAL CARD ──────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', padding: '0 4px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#111215' }}>
            Official Gas Safe ID Card
          </div>
          <span style={{ fontSize: '11px', color: '#747b86' }}>Tap card to flip</span>
        </div>

        <GasSafeCreditCard
          engineerName={engineerName}
          licenceNumber={gasSafeNumber}
          expiryDate={format(expiryDate, 'MM/yy')}
          showControls={true}
        />
      </div>

      {/* ─── PERSONAL INFO (Editable) ────────────────────────── */}
      <div className="neo-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111215', margin: 0 }}>
            Personal Details
          </h2>
          <button
            type="button"
            onClick={() => setIsEditingInfo(!isEditingInfo)}
            style={{
              background: '#f0f2f5',
              border: 'none',
              borderRadius: '99px',
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#111215',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Edit3 size={12} /> {isEditingInfo ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editSuccess && (
          <div style={{ marginBottom: '12px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.12)', color: '#16a34a', fontSize: '12px', fontWeight: 600 }}>
            Details updated successfully
          </div>
        )}

        {isEditingInfo ? (
          <form onSubmit={handleSaveInfo} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#52525b', display: 'block', marginBottom: '4px' }}>Full Name</label>
              <input
                type="text"
                value={engineerName}
                onChange={(e) => setEngineerName(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#52525b', display: 'block', marginBottom: '4px' }}>Email</label>
              <input
                type="email"
                value={email}
                disabled
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '13px', background: '#f8f9fb', color: '#747b86', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#52525b', display: 'block', marginBottom: '4px' }}>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07700 900000"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#52525b', display: 'block', marginBottom: '4px' }}>Base Depot</label>
              <input
                type="text"
                value={depot}
                onChange={(e) => setDepot(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
            <button type="submit" className="neo-btn-black" style={{ padding: '11px', marginTop: '4px' }}>
              Save Details
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ color: '#747b86', marginTop: '2px' }}><User size={16} /></div>
              <div>
                <div style={{ fontSize: '11px', color: '#9aa1ad', fontWeight: 500 }}>Name</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111215', marginTop: '1px' }}>{engineerName}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ color: '#747b86', marginTop: '2px' }}><Mail size={16} /></div>
              <div>
                <div style={{ fontSize: '11px', color: '#9aa1ad', fontWeight: 500 }}>E-mail</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111215', marginTop: '1px' }}>{email || 'Not configured'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ color: '#747b86', marginTop: '2px' }}><Phone size={16} /></div>
              <div>
                <div style={{ fontSize: '11px', color: '#9aa1ad', fontWeight: 500 }}>Phone number</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111215', marginTop: '1px' }}>{phone || 'Not configured'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ color: '#747b86', marginTop: '2px' }}><Home size={16} /></div>
              <div>
                <div style={{ fontSize: '11px', color: '#9aa1ad', fontWeight: 500 }}>Operating Depot &amp; Base</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111215', marginTop: '1px' }}>{depot}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── PASSWORD CHANGE COMPONENT (supabase.auth.updateUser) ─── */}
      <ChangePassword userEmail={email} />

      {/* ─── REGISTRATION & COMPLIANCE INFO ───────────────────── */}
      <div className="neo-card" style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111215', margin: '0 0 14px 0' }}>
          Registration Status
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#747b86' }}>Gas Safe Number:</span>
            <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#111215' }}>
              {gasSafeNumber}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#747b86' }}>Expiry Date:</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111215' }}>
              {format(expiryDate, 'dd MMM yyyy')} ({daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'})
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#747b86' }}>Status:</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: daysRemaining > 0 ? '#16a34a' : '#dc2626',
                background: daysRemaining > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                padding: '3px 8px',
                borderRadius: '99px',
              }}
            >
              ● {daysRemaining > 0 ? 'VALID & LICENSED' : 'EXPIRED'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── QUALIFIED COMPETENCIES ──────────────────────────── */}
      <div className="neo-card" style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111215', margin: '0 0 12px 0' }}>
          Certified Competencies
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {qualifications.map((item, idx) => (
            <span
              key={idx}
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#111215',
                background: '#f3f4f7',
                padding: '6px 12px',
                borderRadius: '99px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Check size={12} color="#16a34a" strokeWidth={3} /> {item}
            </span>
          ))}
        </div>
      </div>

      {/* ─── ACCOUNT ACTIONS ─────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
        <button
          type="button"
          onClick={handleSignOut}
          className="neo-btn-outline"
          style={{
            width: '100%',
            padding: '12px',
            minHeight: '48px',
            color: '#dc2626',
            borderColor: 'rgba(220, 38, 38, 0.2)',
            boxSizing: 'border-box',
          }}
        >
          <LogOut size={15} /> Sign Out of Operative App
        </button>
      </div>
    </div>
  )
}
