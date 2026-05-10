import { useEffect, useState } from 'react'
import type { Photo } from '../../types'

interface PhotoGridProps {
  photos: Photo[]
  animate?: boolean
  visibleCount?: number
}

const ROTATIONS = [-2.6, 1.8, -1.2, 2.4, -1.8, 1.4]

export default function PhotoGrid({ photos, animate = false, visibleCount }: PhotoGridProps) {
  const [visible, setVisible] = useState<number>(visibleCount ?? (animate ? 0 : photos.length))

  useEffect(() => {
    if (visibleCount != null) {
      setVisible(visibleCount)
      return
    }

    if (!animate) {
      setVisible(photos.length)
      return
    }

    const timers: number[] = []

    setVisible(0)

    photos.forEach((_, index) => {
      const timer = window.setTimeout(() => {
        setVisible((current) => Math.max(current, index + 1))
      }, index * 280)

      timers.push(timer)
    })

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [animate, photos, visibleCount])

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {photos.map((photo, index) => {
        const isVisible = index < visible
        const rotation = ROTATIONS[index % ROTATIONS.length]

      return (
          <article
            key={photo.id}
            className="rounded-[28px] border p-3 transition-all duration-500"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border)',
              boxShadow: '0 20px 36px rgba(94, 69, 45, 0.10)',
              opacity: isVisible ? 1 : 0.94,
              transform: isVisible
                ? `translateY(0px) rotate(${rotation}deg)`
                : 'translateY(12px) scale(0.985)',
            }}
          >
            <div
              className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[22px]"
              style={{
                background: 'linear-gradient(180deg, #F7EFE4 0%, #EEDFCF 100%)',
              }}
            >
              <div
                className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{
                  background: 'rgba(255, 250, 243, 0.85)',
                  color: 'var(--text-secondary)',
                  border: '1px solid rgba(218, 201, 182, 0.7)',
                }}
              >
                Photo {index + 1}
              </div>
              {isVisible ? (
                <span className="text-[72px]">{photo.url}</span>
              ) : (
                <div
                  className="flex h-[74%] w-[74%] flex-col items-center justify-center rounded-[20px] border text-center"
                  style={{
                    borderColor: 'rgba(218, 201, 182, 0.78)',
                    background: 'rgba(255, 248, 239, 0.68)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">
                    Hidden
                  </span>
                  <span className="mt-3 text-[24px] leading-none">···</span>
                </div>
              )}
            </div>

            <div className="px-2 pb-2 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                {isVisible ? 'Caption' : 'Next reveal'}
              </p>
              <p className="mt-2 text-[14px] leading-6" style={{ color: 'var(--text-primary)' }}>
                {isVisible
                  ? photo.caption ?? 'A remembered fragment from this moment.'
                  : 'This frame stays closed until you choose to reveal it.'}
              </p>
            </div>
          </article>
        )
      })}
    </div>
  )
}
