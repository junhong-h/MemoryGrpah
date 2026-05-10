import { useCallback, useEffect, useRef, useState } from 'react'
import type { Photo } from '../../types'

interface PhotoCarouselProps {
  photos: Photo[]
}

type Mode = 'carousel' | 'grid'

const STAGGER_MS = 460
const RISE_INITIAL_DELAY = 300
// auto-cruise: after the first photo starts rising, the carousel slides
// from left to right at a constant speed. User wheel / touch / pointer
// interrupts it. After reaching the right end, a soft return brings
// the view back to the first photo.
const CRUISE_START_DELAY = RISE_INITIAL_DELAY + 600
const CRUISE_SPEED_PX_PER_SEC = 340
const RETURN_HOLD_MS = 700

export default function PhotoCarousel({ photos }: PhotoCarouselProps) {
  const [mode, setMode] = useState<Mode>('carousel')
  const [index, setIndex] = useState(0)
  const [zoomed, setZoomed] = useState<Photo | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const scrollToIndex = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(photos.length - 1, next))
      const target = itemRefs.current[clamped]
      const container = containerRef.current
      if (target && container) {
        const targetLeft =
          target.offsetLeft + target.clientWidth / 2 - container.clientWidth / 2
        container.scrollTo({
          left: Math.max(0, targetLeft),
          behavior: 'smooth',
        })
      }
      setIndex(clamped)
    },
    [photos.length],
  )

  useEffect(() => {
    if (mode !== 'carousel') return undefined
    const container = containerRef.current
    if (!container) return undefined

    let raf = 0
    let stopped = false
    const timers: number[] = []

    const updateIndexFromScroll = () => {
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
    }

    const cruise = () => {
      let lastTime = performance.now()
      const tick = (now: number) => {
        if (stopped) return
        const dt = (now - lastTime) / 1000
        lastTime = now
        const max = container.scrollWidth - container.clientWidth
        const next = Math.min(max, container.scrollLeft + CRUISE_SPEED_PX_PER_SEC * dt)
        container.scrollLeft = next
        updateIndexFromScroll()
        if (next < max) {
          raf = requestAnimationFrame(tick)
        } else {
          timers.push(
            window.setTimeout(() => {
              if (stopped) return
              container.scrollTo({ left: 0, behavior: 'smooth' })
              setIndex(0)
            }, RETURN_HOLD_MS),
          )
        }
      }
      raf = requestAnimationFrame(tick)
    }

    timers.push(window.setTimeout(cruise, CRUISE_START_DELAY))

    const interrupt = () => {
      stopped = true
      cancelAnimationFrame(raf)
      timers.forEach((t) => window.clearTimeout(t))
    }
    container.addEventListener('wheel', interrupt, { passive: true })
    container.addEventListener('touchstart', interrupt, { passive: true })
    container.addEventListener('pointerdown', interrupt)

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      timers.forEach((t) => window.clearTimeout(t))
      container.removeEventListener('wheel', interrupt)
      container.removeEventListener('touchstart', interrupt)
      container.removeEventListener('pointerdown', interrupt)
    }
  }, [photos, mode])

  useEffect(() => {
    const container = containerRef.current
    if (!container || mode !== 'carousel') return undefined

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
  }, [photos.length, mode])

  useEffect(() => {
    if (!zoomed) return undefined
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomed(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomed])

  return (
    <div className="flex flex-col gap-3">
      <div className="memory-carousel-toolbar">
        <span className="memory-carousel-toolbar__count">
          {mode === 'carousel'
            ? `${index + 1} of ${photos.length}`
            : `${photos.length} photos`}
        </span>
        <button
          type="button"
          className="memory-carousel-toolbar__toggle"
          onClick={() => setMode(mode === 'carousel' ? 'grid' : 'carousel')}
        >
          {mode === 'carousel' ? `See all ${photos.length} →` : '← Back to carousel'}
        </button>
      </div>

      {mode === 'carousel' ? (
        <>
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
                style={{ ['--rise-delay' as string]: `${i * STAGGER_MS + RISE_INITIAL_DELAY}ms` }}
              >
                <div className="memory-carousel-item__frame">
                  <span className="memory-carousel-item__media">{photo.url}</span>
                </div>
                <p className="memory-carousel-item__caption">
                  {photo.caption || ' '}
                </p>
              </button>
            ))}
          </div>

          <div className="memory-carousel-dots-wrap" aria-hidden>
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                aria-label={`Go to photo ${i + 1}`}
                className={['memory-carousel-dot-btn', i === index ? 'is-active' : ''].join(' ')}
                onClick={() => scrollToIndex(i)}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="memory-photo-grid-all">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setZoomed(photo)}
              className="memory-photo-grid-item"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className="memory-photo-grid-item__media">{photo.url}</span>
            </button>
          ))}
        </div>
      )}

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
