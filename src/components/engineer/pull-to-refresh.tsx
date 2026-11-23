'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh?: () => Promise<void> | void
  children: React.ReactNode
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const router = useRouter()
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const isPulling = useRef(false)

  const threshold = 65

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY
      isPulling.current = true
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return
    if (window.scrollY > 0) {
      setPullDistance(0)
      isPulling.current = false
      return
    }

    const currentY = e.touches[0].clientY
    const diff = currentY - touchStartY.current

    if (diff > 0) {
      // Apply friction
      const distance = Math.min(diff * 0.45, 90)
      setPullDistance(distance)
    }
  }

  const handleTouchEnd = async () => {
    if (!isPulling.current) return
    isPulling.current = false

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(45)

      try {
        if (onRefresh) {
          await onRefresh()
        } else {
          router.refresh()
          await new Promise((res) => setTimeout(res, 600))
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: 'relative', width: '100%' }}
    >
      {/* Pull Indicator */}
      <div
        style={{
          height: `${pullDistance}px`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: isPulling.current ? 'none' : 'height 0.25s ease',
          opacity: Math.min(pullDistance / 40, 1),
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#111215',
            transform: `rotate(${pullDistance * 4}deg)`,
          }}
        >
          <RefreshCw
            size={16}
            style={{
              animation: isRefreshing ? 'spin 0.75s linear infinite' : 'none',
            }}
          />
        </div>
      </div>

      {children}
    </div>
  )
}
