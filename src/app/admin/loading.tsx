export default function AdminLoading() {
  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      {/* Header Skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="skeleton-box" style={{ width: '180px', height: '28px' }} />
          <div className="skeleton-box" style={{ width: '280px', height: '14px' }} />
        </div>
        <div className="skeleton-box" style={{ width: '110px', height: '36px', borderRadius: 'var(--radius-md)' }} />
      </div>

      {/* Metric Cards Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="skeleton-box" style={{ width: '80px', height: '12px' }} />
            <div className="skeleton-box" style={{ width: '120px', height: '28px' }} />
            <div className="skeleton-box" style={{ width: '100%', height: '10px' }} />
          </div>
        ))}
      </div>

      {/* Main Table/Content Skeleton */}
      <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="skeleton-box" style={{ width: '160px', height: '18px' }} />
          <div className="skeleton-box" style={{ width: '220px', height: '32px' }} />
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="skeleton-box" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="skeleton-box" style={{ width: '140px', height: '14px' }} />
                <div className="skeleton-box" style={{ width: '200px', height: '11px' }} />
              </div>
            </div>
            <div className="skeleton-box" style={{ width: '70px', height: '22px', borderRadius: '99px' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
