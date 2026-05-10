import { useCallback, useEffect, useRef, useState } from 'react'
import type { Photo } from '../../types'

interface PhotoCarouselProps {
  photos: Photo[]
}

export default function PhotoCarousel({ photos }: PhotoCarouselProps) {
  const [index, setIndex] = useState(0)
  const [zoomed, setZoomed] = useState<Photo | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const scrollTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(photos.length - 1, next))
      const target = itemRefs.current[clamped]
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
      setIndex(clamped)
    },
    [photos.length],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    let raf = 0
    const handler = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const items = itemRefs.current.filter((el): el is HTMLButtonElement => !!el)
        if (items.length === 0) return
        const center = container.scrollLeft + container.clientWidth / 2
        let bestIdx = 0
        let bestDist = Infinity
        items.forEach((item, i) => {
          const itemCenter = item.offsetLeft + item.clientWidth / 2
          const d = Math.abs(itemCenter - center)
          if (d < bestDist) {
            bestDist = d
            bestIdx = i
          }
        })
        setIndex(bestIdx)
      })
    }

    container.addEventListener('scroll', handler, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      container.removeEventListener('scroll', handler)
    }
  }, [photos.length])

  useEffect(() => {
    if (!zoomed) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomed(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomed])

  return (
    <div className="flex flex-col gap-3">
      <div ref={containerRef} className="memory-carousel">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            ref={(el) => {
              itemRefs.current[i] = el
            }}
            type="button"
            onClick={() => setZoomed(photo)}
            className="memory-carousel-item"
            style={{ ['--rise-delay' as string]: `${i * 280 + 200}ms` }}
          >
            <div className="memory-carousel-item__frame">
              <span className="memory-carousel-item__media">{photo.url}</span>
            </div>
            <p className="memory-carousel-item__caption">
              {photo.caption || ' '}
            </p>
          </button>
        ))}
      </div>

      <div className="memory-carousel-controls">
        <button
          type="button"
          className="memory-carousel-arrow"
          onClick={() => scrollTo(index - 1)}
          disabled={index === 0}
          aria-label="Previous photo"
        >
          ←
        </button>

        <div className="memory-carousel-dots" aria-hidden>
          {photos.map((p, i) => (
            <span
              key={p.id}
              className={['memory-carousel-dot', i === index ? 'is-active' : ''].join(' ')}
            />
          ))}
        </div>

        <button
          type="button"
          className="memory-carousel-arrow"
          onClick={() => scrollTo(index + 1)}
          disabled={index === photos.length - 1}
          aria-label="Next photo"
        >
          →
        </button>
      </div>

      {zoomed ? <PhotoLightbox photo={zoomed} onClose={() => setZoomed(null)} /> : null}
    </div>
  )
}

function PhotoLightbox({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center p-6"
      onClick={onClose}
      style={{ animation: 'replayBackdropIn 220ms ease-out both' }}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(36, 24, 14, 0.78)', backdropFilter: 'blur(6px)' }}
      />

      <div
        className="memory-photo-lightbox relative z-10 w-full max-w-[560px] rounded-[34px] bg-[#fdfaf3] p-6"
        style={{
          boxShadow: '0 34px 64px rgba(60, 42, 30, 0.4)',
          animation: 'lightboxIn 360ms cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex aspect-square items-center justify-center rounded-[22px]"
          style={{ background: 'linear-gradient(180deg, #F7EFE4 0%, #EEDFCF 100%)' }}
        >
          <span style={{ fontSize: 220, lineHeight: 1 }}>{photo.url}</span>
        </div>

        {photo.caption ? (
          <p
            className="mt-5 text-center text-[20px] leading-7"
            style={{ fontFamily: "'Caveat', cursive", color: 'var(--text-primary)' }}
          >
            {photo.caption}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-lg"
          style={{
            background: 'rgba(255, 252, 246, 0.9)',
            color: 'var(--text-secondary)',
            border: '1px solid rgba(218, 201, 182, 0.7)',
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
