import { useState } from 'react'
import type { Photo } from '../../types'

interface PhotoGridProps {
  photos: Photo[]
  animate?: boolean
}

const ROTATIONS = [-2.6, 1.8, -1.2, 2.4, -1.8, 1.4]

export default function PhotoGrid({ photos, animate = false }: PhotoGridProps) {
  const [zoomed, setZoomed] = useState<Photo | null>(null)

  return (
    <>
      <div className="grid gap-5 md:grid-cols-3">
        {photos.map((photo, index) => {
          const rotation = ROTATIONS[index % ROTATIONS.length]
          const delay = animate ? index * 560 : 0

          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => setZoomed(photo)}
              className="memory-photo-card rounded-[28px] border p-3 text-left"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border)',
                boxShadow: '0 20px 36px rgba(94, 69, 45, 0.10)',
                ['--reveal-delay' as string]: `${delay}ms`,
                ['--card-rotate' as string]: `${rotation}deg`,
                cursor: 'zoom-in',
              }}
            >
              <div
                className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[22px]"
                style={{
                  background: 'linear-gradient(180deg, #F7EFE4 0%, #EEDFCF 100%)',
                }}
              >
                <span className="text-[72px]">{photo.url}</span>
              </div>

              {photo.caption ? (
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
            </button>
          )
        })}
      </div>

      {zoomed ? <PhotoLightbox photo={zoomed} onClose={() => setZoomed(null)} /> : null}
    </>
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
        className="memory-photo-lightbox relative z-10 w-full max-w-[520px] rounded-[34px] bg-[#fdfaf3] p-6"
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
          <span style={{ fontSize: 200, lineHeight: 1 }}>{photo.url}</span>
        </div>

        {photo.caption ? (
          <p
            className="mt-5 text-center text-[18px] leading-7"
            style={{
              fontFamily: "'Caveat', cursive",
              color: 'var(--text-primary)',
            }}
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
