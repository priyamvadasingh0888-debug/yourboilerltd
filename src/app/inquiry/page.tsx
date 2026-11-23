'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Flame, CheckCircle2, ArrowLeft, Send } from 'lucide-react'

export default function PublicInquiryPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    service_type: 'boiler_repair',
    description: '',
    address: '',
    postcode: '',
    preferred_date: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Simulate brief submission
    await new Promise(r => setTimeout(r, 600))
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-void)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: '640px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', background: 'var(--color-brand)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={20} color="#08090a" />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-paper)', letterSpacing: '-0.02em' }}>
                Your Boiler Ltd
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-fog)' }}>
                Gas Safe Heating & Plumbing Engineers
              </div>
            </div>
          </div>
          <Link href="/auth/login" style={{ fontSize: '12px', color: 'var(--color-fog)', textDecoration: 'none' }}>
            Staff Login
          </Link>
        </div>

        {submitted ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <CheckCircle2 size={48} style={{ color: '#27a644', margin: '0 auto 16px auto' }} />
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-paper)', marginBottom: '8px' }}>
              Inquiry Received!
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--color-mist)', maxWidth: '420px', margin: '0 auto 24px auto', lineHeight: 1.5 }}>
              Thank you, <strong>{form.name}</strong>. An office engineer will review your request and contact you at <strong>{form.phone || form.email}</strong> shortly.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSubmitted(false)
                setForm({
                  name: '',
                  phone: '',
                  email: '',
                  service_type: 'boiler_repair',
                  description: '',
                  address: '',
                  postcode: '',
                  preferred_date: '',
                })
              }}
            >
              Submit Another Request
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: '32px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-paper)', margin: '0 0 6px 0' }}>
              Request a Service or Quote
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--color-fog)', margin: '0 0 24px 0' }}>
              Fill in your details below and our team will get in touch to confirm your booking.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="name">Your Full Name *</label>
                <input
                  id="name"
                  required
                  type="text"
                  className="input"
                  placeholder="e.g. John Smith"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="phone">Phone Number *</label>
                  <input
                    id="phone"
                    required
                    type="tel"
                    className="input"
                    placeholder="07700 900123"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    className="input"
                    placeholder="john@example.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="service_type">Service Required</label>
                <select
                  id="service_type"
                  className="select"
                  value={form.service_type}
                  onChange={e => setForm({ ...form, service_type: e.target.value })}
                >
                  <option value="boiler_repair">Boiler Breakdown / Repair</option>
                  <option value="annual_service">Annual Boiler Service</option>
                  <option value="gas_safety_check">Landlord Gas Safety Record (CP12)</option>
                  <option value="boiler_installation">New Boiler Installation Quote</option>
                  <option value="central_heating">Central Heating & Radiators</option>
                  <option value="plumbing">Plumbing Services</option>
                  <option value="emergency_callout">Emergency Callout</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="address">Address Line 1</label>
                  <input
                    id="address"
                    type="text"
                    className="input"
                    placeholder="12 High Street"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="postcode">UK Postcode *</label>
                  <input
                    id="postcode"
                    required
                    type="text"
                    className="input"
                    placeholder="M14 5QW"
                    value={form.postcode}
                    onChange={e => setForm({ ...form, postcode: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="preferred_date">Preferred Date</label>
                <input
                  id="preferred_date"
                  type="date"
                  className="input"
                  value={form.preferred_date}
                  onChange={e => setForm({ ...form, preferred_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="description">Tell us about the issue</label>
                <textarea
                  id="description"
                  rows={3}
                  className="textarea"
                  placeholder="Describe your boiler model, symptoms, error codes, or requirements..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ padding: '12px', fontSize: '14px', fontWeight: 600, justifyContent: 'center', marginTop: '8px' }}
              >
                {loading ? 'Submitting…' : (
                  <>
                    <Send size={15} style={{ marginRight: '8px' }} /> Submit Service Request
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
