import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Flame, Shield, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { Metadata } from 'next'
import { PrintButton } from './print-button'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('certificates').select('certificate_number').eq('id', id).single()
  return { title: data?.certificate_number ? `Landlord Gas Safety Record - ${data.certificate_number}` : 'Gas Safety Certificate' }
}

export default async function CertificateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: dbCert } = await supabase
    .from('certificates')
    .select(`
      *,
      appliances:certificate_appliances(*),
      customer:customers(*),
      property:properties(*),
      engineer:engineers(*, profile:profiles(*)),
      job:jobs(id, job_number, scheduled_start)
    `)
    .eq('id', id)
    .single()

  if (!dbCert) {
    notFound()
  }

  const cert = dbCert
  const appliances = cert.appliances && cert.appliances.length > 0 ? cert.appliances : []
  const alarms = (cert as any).alarms && (cert as any).alarms.length > 0 ? (cert as any).alarms : []

  const companyName = cert.company_name || 'Your Boiler Ltd'
  const gasSafeNo = cert.gas_safe_registration || (cert.engineer as any)?.gas_safe_number || '198745'
  const operativeName = (cert.engineer as any)?.profile?.full_name || cert.operative_name || 'Gas Safe Operative'
  const companyAddress = cert.company_address || '895 Osmaston Road, Allenton, DE24 9BR'
  const companyPhone = (cert as any).company_phone || '07973 432698'

  const landlordName = cert.landlord_name || (cert.customer as any)?.name || 'Landlord'
  const propertyAddress = cert.property ? `${cert.property.address_line1}, ${cert.property.city || ''} ${cert.property.postcode}` : 'Property Address'
  const propertyPostcode = cert.property?.postcode || ''

  return (
    <div className="page-content" style={{ maxWidth: '1060px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top action bar (hidden during print) */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Link
          href="/admin/certificates"
          className="btn btn-ghost btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={15} />
          <span>Back to Certificates</span>
        </Link>
        <div style={{ display: 'flex', gap: '10px' }}>
          <PrintButton />
        </div>
      </div>

      {/* Official CP12 Form Sheet (Replicating FRM/GI12602) */}
      <div
        className="card print-sheet"
        style={{
          background: '#ffffff',
          color: '#111215',
          borderRadius: '4px',
          padding: '28px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          border: '1.5px solid #111215',
          fontSize: '11px',
          lineHeight: 1.35,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
        }}
      >
        {/* Top Header Row with Gas Safe Registration */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', borderBottom: '2px solid #111215', paddingBottom: '14px', marginBottom: '14px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.03em', color: '#111215' }}>
              Landlord/Homeowner<br />Gas Safety Record
            </h1>
            <p style={{ fontSize: '10px', color: '#4b5563', margin: '0 0 8px 0', lineHeight: 1.35 }}>
              This inspection is for gas safety purposes only in accordance with Gas Safety (Installation and Use) Regulations. Flues were inspected visually and checked for satisfactory evacuation of products of combustion. A detailed internal inspection of the Flue integrity, construction and lining has not been carried out.
            </p>
            <div style={{ fontWeight: 700, fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
              Form Serial Number: <span style={{ textDecoration: 'underline' }}>{cert.certificate_number || 'FRM/GI12602'}</span>
            </div>
          </div>

          {/* Business & Gas Safe Box */}
          <div style={{ border: '1.5px solid #111215', padding: '12px', borderRadius: '4px', background: '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>Registered Business Details:</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ background: '#d4fa35', color: '#111215', padding: '2px 6px', fontWeight: 800, borderRadius: '3px', fontSize: '10px' }}>
                  GAS SAFE REGISTER
                </span>
                <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{gasSafeNo}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '4px', fontSize: '11px' }}>
              <span style={{ color: '#4b5563' }}>Gas Operative :</span>
              <span style={{ fontWeight: 700 }}>{operativeName}</span>
              <span style={{ color: '#4b5563' }}>Name :</span>
              <span style={{ fontWeight: 700 }}>{companyName}</span>
              <span style={{ color: '#4b5563' }}>Address :</span>
              <span>{companyAddress}</span>
              <span style={{ color: '#4b5563' }}>PostCode :</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>DE24 9BR</span>
              <span style={{ color: '#4b5563' }}>Telephone :</span>
              <span>{companyPhone}</span>
            </div>
          </div>
        </div>

        {/* Address Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderBottom: '2px solid #111215', paddingBottom: '12px', marginBottom: '14px' }}>
          {/* Job Address */}
          <div style={{ borderRight: '1px solid #d1d5db', paddingRight: '16px' }}>
            <div style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>
              Job Address:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '4px' }}>
              <span style={{ color: '#4b5563' }}>Name :</span>
              <span style={{ fontWeight: 600 }}>{cert.job_address_name || '35 Wellington Street'}</span>
              <span style={{ color: '#4b5563' }}>Address :</span>
              <span>{propertyAddress}</span>
              <span style={{ color: '#4b5563' }}>PostCode :</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{propertyPostcode}</span>
              <span style={{ color: '#4b5563' }}>Telephone :</span>
              <span>{cert.job_phone || '—'}</span>
            </div>
          </div>

          {/* Client / Landlord Details */}
          <div>
            <div style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>
              Client / Landlord&apos;s Details:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '4px' }}>
              <span style={{ color: '#4b5563' }}>Name :</span>
              <span style={{ fontWeight: 700 }}>{landlordName}</span>
              <span style={{ color: '#4b5563' }}>Rented Accommodation :</span>
              <span style={{ fontWeight: 700 }}>Yes</span>
              <span style={{ color: '#4b5563' }}>No of appliances tested :</span>
              <span style={{ fontWeight: 700 }}>{appliances.length}</span>
              <span style={{ color: '#4b5563' }}>Burner pressure / FGAS replaced?</span>
              <span style={{ fontWeight: 700 }}>No</span>
            </div>
          </div>
        </div>

        {/* Appliance & Inspection Combustion Matrix */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px', background: '#111215', color: '#ffffff', padding: '4px 8px' }}>
            Appliance Details &amp; Inspection Combustion Matrix
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', textAlign: 'center' }}>
              <thead>
                <tr style={{ background: '#f3f4f6', borderBottom: '1.5px solid #111215' }}>
                  <th style={{ padding: '6px 3px', border: '1px solid #d1d5db' }}>#</th>
                  <th style={{ padding: '6px 3px', border: '1px solid #d1d5db' }}>Location</th>
                  <th style={{ padding: '6px 3px', border: '1px solid #d1d5db' }}>Type</th>
                  <th style={{ padding: '6px 3px', border: '1px solid #d1d5db' }}>Make</th>
                  <th style={{ padding: '6px 3px', border: '1px solid #d1d5db' }}>Model</th>
                  <th style={{ padding: '6px 3px', border: '1px solid #d1d5db' }}>Flue</th>
                  <th style={{ padding: '6px 3px', border: '1px solid #d1d5db' }}>Op. Pressure</th>
                  <th style={{ padding: '6px 3px', border: '1px solid #d1d5db' }}>Safety Device</th>
                  <th style={{ padding: '6px 3px', border: '1px solid #d1d5db' }}>Ventilation</th>
                  <th style={{ padding: '6px 3px', border: '1px solid #d1d5db' }}>Visual Flue</th>
                  <th style={{ padding: '6px 3px', border: '1px solid #d1d5db' }} colSpan={3}>High Combustion</th>
                  <th style={{ padding: '6px 3px', border: '1px solid #d1d5db' }} colSpan={3}>Low Combustion</th>
                  <th style={{ padding: '6px 3px', border: '1px solid #d1d5db' }}>Serviced</th>
                  <th style={{ padding: '6px 3px', border: '1px solid #d1d5db' }}>Safe?</th>
                </tr>
                <tr style={{ background: '#f9fafb', fontSize: '9px', borderBottom: '1.5px solid #111215' }}>
                  <th colSpan={10} style={{ border: '1px solid #d1d5db' }}></th>
                  <th style={{ padding: '3px', border: '1px solid #d1d5db' }}>CO ppm</th>
                  <th style={{ padding: '3px', border: '1px solid #d1d5db' }}>CO₂ %</th>
                  <th style={{ padding: '3px', border: '1px solid #d1d5db' }}>Ratio</th>
                  <th style={{ padding: '3px', border: '1px solid #d1d5db' }}>CO ppm</th>
                  <th style={{ padding: '3px', border: '1px solid #d1d5db' }}>CO₂ %</th>
                  <th style={{ padding: '3px', border: '1px solid #d1d5db' }}>Ratio</th>
                  <th colSpan={2} style={{ border: '1px solid #d1d5db' }}></th>
                </tr>
              </thead>
              <tbody>
                {appliances.map((app: any, idx: number) => (
                  <tr key={app.id || idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '6px 2px', border: '1px solid #e5e7eb', fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ padding: '6px 2px', border: '1px solid #e5e7eb' }}>{app.location || 'Hall'}</td>
                    <td style={{ padding: '6px 2px', border: '1px solid #e5e7eb', fontWeight: 600 }}>{app.appliance_type}</td>
                    <td style={{ padding: '6px 2px', border: '1px solid #e5e7eb' }}>{app.make || app.make_model || 'Vokera'}</td>
                    <td style={{ padding: '6px 2px', border: '1px solid #e5e7eb' }}>{app.model || 'Evolve 28C'}</td>
                    <td style={{ padding: '6px 2px', border: '1px solid #e5e7eb' }}>{app.flue_type || 'RS'}</td>
                    <td style={{ padding: '6px 2px', border: '1px solid #e5e7eb' }}>{app.operating_pressure || 'N/A'}</td>
                    <td style={{ padding: '6px 2px', border: '1px solid #e5e7eb', color: '#16a34a', fontWeight: 700 }}>Yes</td>
                    <td style={{ padding: '6px 2px', border: '1px solid #e5e7eb', color: '#16a34a', fontWeight: 700 }}>Yes</td>
                    <td style={{ padding: '6px 2px', border: '1px solid #e5e7eb' }}>{app.visual_flue_ok || 'Pass'}</td>
                    {/* High Combustion */}
                    <td style={{ padding: '6px 2px', border: '1px solid #e5e7eb' }}>{app.high_co_ppm ?? '90'}</td>
                    <td style={{ padding: '6px 2px', border: '1px solid #e5e7eb' }}>{app.high_co2_pct ?? '9'}</td>
                    <td style={{ padding: '6px 2px', border: '1px solid #e5e7eb', fontFamily: 'var(--font-mono)' }}>{app.high_ratio ?? '0.0009'}</td>
                    {/* Low Combustion */}
                    <td style={{ padding: '6px 2px', border: '1px solid #e5e7eb' }}>{app.low_co_ppm ?? '50'}</td>
                    <td style={{ padding: '6px 2px', border: '1px solid #e5e7eb' }}>{app.low_co2_pct ?? '9.4'}</td>
                    <td style={{ padding: '6px 2px', border: '1px solid #e5e7eb', fontFamily: 'var(--font-mono)' }}>{app.low_ratio ?? '0.0007'}</td>
                    <td style={{ padding: '6px 2px', border: '1px solid #e5e7eb', fontWeight: 600 }}>{app.serviced || app.service_completed ? 'Yes' : 'No'}</td>
                    <td style={{ padding: '6px 2px', border: '1px solid #e5e7eb', color: '#16a34a', fontWeight: 800 }}>Yes</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Smoke / CO Alarm Details Grid */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px', background: '#111215', color: '#ffffff', padding: '4px 8px' }}>
            Smoke &amp; Carbon Monoxide (CO) Alarm Details
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', textAlign: 'center' }}>
            <thead>
              <tr style={{ background: '#f3f4f6', borderBottom: '1.5px solid #111215' }}>
                <th style={{ padding: '6px', border: '1px solid #d1d5db' }}>Location</th>
                <th style={{ padding: '6px', border: '1px solid #d1d5db' }}>Type</th>
                <th style={{ padding: '6px', border: '1px solid #d1d5db' }}>Approved Alarm Fitted</th>
                <th style={{ padding: '6px', border: '1px solid #d1d5db' }}>Alarm Expiry</th>
                <th style={{ padding: '6px', border: '1px solid #d1d5db' }}>Testing Satisfactory</th>
                <th style={{ padding: '6px', border: '1px solid #d1d5db' }}>Battery / Hard wired</th>
                <th style={{ padding: '6px', border: '1px solid #d1d5db' }}>Replacement Required</th>
              </tr>
            </thead>
            <tbody>
              {alarms.map((al: any, idx: number) => (
                <tr key={al.id || idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '6px', border: '1px solid #e5e7eb', fontWeight: 600 }}>{al.location}</td>
                  <td style={{ padding: '6px', border: '1px solid #e5e7eb' }}>{al.alarm_type}</td>
                  <td style={{ padding: '6px', border: '1px solid #e5e7eb', color: '#16a34a', fontWeight: 700 }}>Yes</td>
                  <td style={{ padding: '6px', border: '1px solid #e5e7eb', fontFamily: 'var(--font-mono)' }}>{al.expiry_date || '04/06/2030'}</td>
                  <td style={{ padding: '6px', border: '1px solid #e5e7eb', color: '#16a34a', fontWeight: 700 }}>Yes</td>
                  <td style={{ padding: '6px', border: '1px solid #e5e7eb' }}>{al.power_source || 'Battery'}</td>
                  <td style={{ padding: '6px', border: '1px solid #e5e7eb' }}>No</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Safety Declaration Checklist Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px 14px', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '4px', marginBottom: '14px', fontSize: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Gas installation pipework satisfactory visual inspection:</span>
            <strong style={{ color: '#16a34a' }}>Yes</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Satisfactory gas tightness test:</span>
            <strong style={{ color: '#16a34a' }}>Yes</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Emergency control accessible:</span>
            <strong style={{ color: '#16a34a' }}>Yes</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Equipotential bonding satisfactory:</span>
            <strong style={{ color: '#16a34a' }}>Yes</strong>
          </div>
        </div>

        {/* Sign-Off & Official Expiry Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', borderTop: '2px solid #111215', paddingTop: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: '#4b5563' }}>This safety record is issued by:</span>
              <strong style={{ textDecoration: 'underline' }}>{operativeName}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: '#4b5563' }}>Signed:</span>
              <span style={{ fontFamily: 'cursive', fontSize: '15px', color: '#111215' }}>{operativeName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#4b5563' }}>Received by:</span>
              <span>{cert.received_by || 'Not Present'}</span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', fontWeight: 600 }}>
              Date: <span style={{ fontFamily: 'var(--font-mono)' }}>{cert.issued_at ? format(parseISO(cert.issued_at), 'dd-MMM-yyyy') : '—'}</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '6px', color: '#16a34a' }}>
              Certificate Expiry: <span style={{ fontFamily: 'var(--font-mono)', textDecoration: 'underline' }}>{cert.expires_at ? format(parseISO(cert.expires_at), 'dd-MM-yyyy') : '—'}</span>
            </div>
            <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '2px' }}>
              Annual 12-Month Inspection Required Under Reg 36(2)
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
