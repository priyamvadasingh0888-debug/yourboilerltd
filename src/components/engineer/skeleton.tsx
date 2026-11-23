'use client'

export function JobCardSkeleton() {
  return (
    <div
      style={{
        background: '#f8f9fb',
        borderRadius: '18px',
        padding: '16px',
        border: '1px solid rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#e5e7eb',
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div
              style={{
                width: '130px',
                height: '14px',
                borderRadius: '6px',
                background: '#e5e7eb',
                animation: 'pulse 1.5s infinite ease-in-out',
              }}
            />
            <div
              style={{
                width: '80px',
                height: '10px',
                borderRadius: '4px',
                background: '#f3f4f6',
                animation: 'pulse 1.5s infinite ease-in-out',
              }}
            />
          </div>
        </div>
        <div
          style={{
            width: '64px',
            height: '22px',
            borderRadius: '99px',
            background: '#e5e7eb',
            animation: 'pulse 1.5s infinite ease-in-out',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
        <div
          style={{
            width: '75%',
            height: '12px',
            borderRadius: '4px',
            background: '#f3f4f6',
            animation: 'pulse 1.5s infinite ease-in-out',
          }}
        />
        <div
          style={{
            width: '50%',
            height: '12px',
            borderRadius: '4px',
            background: '#f3f4f6',
            animation: 'pulse 1.5s infinite ease-in-out',
          }}
        />
      </div>
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div
      style={{
        minWidth: '220px',
        height: '110px',
        borderRadius: '20px',
        background: '#ffffff',
        padding: '16px',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ width: '90px', height: '12px', borderRadius: '4px', background: '#e5e7eb', animation: 'pulse 1.5s infinite ease-in-out' }} />
      <div style={{ width: '60px', height: '28px', borderRadius: '6px', background: '#e5e7eb', animation: 'pulse 1.5s infinite ease-in-out' }} />
      <div style={{ width: '120px', height: '10px', borderRadius: '4px', background: '#f3f4f6', animation: 'pulse 1.5s infinite ease-in-out' }} />
    </div>
  )
}
