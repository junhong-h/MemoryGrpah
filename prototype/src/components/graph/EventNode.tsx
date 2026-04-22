import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { MemoryEvent, EventCategory } from '../../types'

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

interface EventNodeProps {
  data: MemoryEvent & { isActive: boolean }
}

function EventNode({ data }: EventNodeProps) {
  const meta = CATEGORY_META[data.category]
  const photoPreview = data.photos[0]?.url ?? data.coverEmoji

  return (
    <div
      className={['memory-photo-node', 'memory-photo-node__drag', 'nopan', data.revisited ? 'is-recorded' : '', data.isActive ? 'is-active' : ''].join(' ')}
      style={{
        borderColor: data.isActive ? meta.accent : 'rgba(220, 207, 192, 0.78)',
      }}
    >
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
        <div className="pointer-events-none flex h-full items-center justify-center text-[72px]">
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

      <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 0, height: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0, width: 0, height: 0 }} />
    </div>
  )
}

export default memo(EventNode)
