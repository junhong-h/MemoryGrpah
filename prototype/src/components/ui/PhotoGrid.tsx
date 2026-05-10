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
              opacity: isVisible ? 1 : 0.78,
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
              {isVisible ? (
                <span className="text-[72px]">{photo.url}</span>
              ) : (
                <span
                  className="text-[42px]"
                  style={{ color: 'rgba(160, 137, 115, 0.4)' }}
                >
                  ·
                </span>
              )}
            </div>

            {isVisible && photo.caption ? (
              <p
                className="mt-4 px-2 pb-1 text-[14px] leading-6"
                style={{
                  fontFamily: "'Lora', serif",
                  fontStyle: 'italic',
                  color: 'var(--text-secondary)',
                }}
              >
                {photo.caption}
              </p>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
