export default function EngineerLoading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px', margin: '0 auto' }}>
      {/* Top Profile Card Skeleton */}
      <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div className="skeleton-box" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <div className="skeleton-box" style={{ width: '140px', height: '16px' }} />
          <div className="skeleton-box" style={{ width: '180px', height: '12px' }} />
        </div>
      </div>

      {/* Today's Jobs Skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="skeleton-box" style={{ width: '120px', height: '16px' }} />
        {[1, 2, 3].map(i => (
          <div key={i} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="skeleton-box" style={{ width: '100px', height: '14px' }} />
              <div className="skeleton-box" style={{ width: '60px', height: '18px', borderRadius: '99px' }} />
            </div>
            <div className="skeleton-box" style={{ width: '220px', height: '16px' }} />
            <div className="skeleton-box" style={{ width: '160px', height: '12px' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
