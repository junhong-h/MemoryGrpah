import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { MemoryEvent, EventCategory } from '../../types'
import { getNodeScale } from '../../utils/layout'
import { useStore } from '../../store/useStore'

const CATEGORY_META: Record<
  EventCategory,
  { accent: string; soft: string; cover: string }
> = {
  travel: {
    accent: 'var(--travel-accent)',
    soft: 'var(--travel-soft)',
    cover: 'linear-gradient(160deg, #EDF6FA 0%, #E2EDF2 100%)',
  },
  social: {
    accent: 'var(--social-accent)',
    soft: 'var(--social-soft)',
    cover: 'linear-gradient(160deg, #F4EEFB 0%, #ECE1F6 100%)',
  },
  milestone: {
    accent: 'var(--milestone-accent)',
    soft: 'var(--milestone-soft)',
    cover: 'linear-gradient(160deg, #FBF0E3 0%, #F5E4D0 100%)',
  },
  daily: {
    accent: 'var(--daily-accent)',
    soft: 'var(--daily-soft)',
    cover: 'linear-gradient(160deg, #EFF6EF 0%, #E0ECE0 100%)',
  },
}

const VISIBLE_PHOTO_THRESHOLD = 6

interface EventNodeProps {
  data: MemoryEvent
}

function EventNode({ data }: EventNodeProps) {
  const isActive = useStore((s) => s.activeEventId === data.id)
  const isHovered = useStore((s) => s.hoveredEventId === data.id)
  const categoryFocus = useStore((s) => s.categoryFocus)
  const isPinned = useStore((s) => s.pinnedEventIds.includes(data.id))
  const togglePin = useStore((s) => s.togglePin)

  const meta = CATEGORY_META[data.category]
  const photoCount = data.photos.length
  const photoPreview = data.photos[0]?.url ?? data.coverEmoji
  const showMeta = isHovered && !isActive
  const scale = getNodeScale(photoCount)
  const emojiSize = Math.round(58 * scale)
  const overflow = Math.max(0, photoCount - VISIBLE_PHOTO_THRESHOLD)
  const hasReflection = !!data.note
  const isOutOfFocus = categoryFocus !== null && categoryFocus !== data.category

  return (
    <div
      className={[
        'memory-photo-node',
        'memory-photo-node__drag',
        'nopan',
        data.revisited ? 'is-recorded' : '',
        isActive ? 'is-active' : '',
        showMeta ? 'shows-meta' : '',
        isOutOfFocus ? 'is-out-of-focus' : '',
        isPinned ? 'is-pinned' : '',
      ].join(' ')}
      style={{
        borderColor: isActive ? meta.accent : 'rgba(220, 207, 192, 0.78)',
      }}
    >
      {showMeta ? (
        <div className="memory-photo-node__meta">
          <span className="memory-photo-node__meta-title">{data.title}</span>
          <span className="memory-photo-node__meta-date">
            {formatMetaDate(data.dateStart, data.dateEnd)} · {photoCount} photos
          </span>
        </div>
      ) : null}

      <div
        className="relative h-full w-full overflow-hidden rounded-[26px]"
        style={{
          background: meta.cover,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.72)',
        }}
      >
        <div className="memory-photo-grain pointer-events-none" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(circle at top, rgba(255,255,255,0.55), transparent 42%)',
          }}
        />
        <div
          className="pointer-events-none flex h-full items-center justify-center"
          style={{ fontSize: `${emojiSize}px`, lineHeight: 1 }}
        >
          {photoPreview}
        </div>
        <div
          className="pointer-events-none absolute right-3 top-3 h-2.5 w-2.5 rounded-full"
          style={{
            background: data.revisited ? meta.accent : 'rgba(60, 42, 30, 0.14)',
            boxShadow: data.revisited ? `0 0 0 6px ${meta.soft}` : 'none',
          }}
        />
      </div>

      {overflow > 0 ? (
        <span className="memory-photo-node__count">+{overflow}</span>
      ) : null}
      {hasReflection ? (
        <span className="memory-photo-node__trace" title="Reflection saved">
          ✎
        </span>
      ) : null}

      {(isHovered || isPinned) && !isActive ? (
        <button
          type="button"
          className={['memory-photo-node__pin', isPinned ? 'is-pinned' : ''].join(' ')}
          onClick={(e) => {
            e.stopPropagation()
            togglePin(data.id)
          }}
          onMouseDown={(e) => e.stopPropagation()}
          title={isPinned ? 'Unpin' : 'Pin to compare'}
        >
          {isPinned ? '✓' : '◎'}
        </button>
      ) : null}

      <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 0, height: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0, width: 0, height: 0 }} />
    </div>
  )
}

export default memo(EventNode)

function formatMetaDate(dateStart: string, dateEnd?: string) {
  const formatter = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  })

  const start = new Date(`${dateStart}T12:00:00`)

  if (!dateEnd) {
    return formatter.format(start)
  }

  const end = new Date(`${dateEnd}T12:00:00`)
  return `${formatter.format(start)} – ${formatter.format(end)}`
}
