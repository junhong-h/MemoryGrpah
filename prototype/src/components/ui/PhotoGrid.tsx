import type { Photo } from '../../types'

interface PhotoGridProps {
  photos: Photo[]
  animate?: boolean
}

const ROTATIONS = [-2.6, 1.8, -1.2, 2.4, -1.8, 1.4]

export default function PhotoGrid({ photos, animate = false }: PhotoGridProps) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {photos.map((photo, index) => {
        const rotation = ROTATIONS[index % ROTATIONS.length]
        const delay = animate ? index * 380 : 0

        return (
          <article
            key={photo.id}
            className="memory-photo-card rounded-[28px] border p-3"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border)',
              boxShadow: '0 20px 36px rgba(94, 69, 45, 0.10)',
              ['--reveal-delay' as string]: `${delay}ms`,
              ['--card-rotate' as string]: `${rotation}deg`,
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
          </article>
        )
      })}
    </div>
  )
}
