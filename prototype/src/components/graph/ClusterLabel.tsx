import { memo } from 'react'
import type { EventCategory } from '../../types'

const LABELS: Record<EventCategory, { label: string; color: string; background: string }> = {
  travel: {
    label: 'Travel',
    color: 'var(--travel-accent)',
    background: 'rgba(134, 173, 195, 0.16)',
  },
  social: {
    label: 'Social',
    color: 'var(--social-accent)',
    background: 'rgba(175, 138, 206, 0.16)',
  },
  milestone: {
    label: 'Milestones',
    color: 'var(--milestone-accent)',
    background: 'rgba(210, 154, 89, 0.18)',
  },
  daily: {
    label: 'Daily',
    color: 'var(--daily-accent)',
    background: 'rgba(129, 177, 148, 0.18)',
  },
}

interface ClusterLabelProps {
  data: { category: EventCategory }
}

function ClusterLabel({ data }: ClusterLabelProps) {
  const meta = LABELS[data.category]

  return (
    <div
      className="pointer-events-none select-none rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em]"
      style={{
        background: meta.background,
        color: meta.color,
        border: '1px solid rgba(218, 201, 182, 0.8)',
        boxShadow: '0 12px 24px rgba(118, 88, 61, 0.06)',
      }}
    >
      {meta.label}
    </div>
  )
}

export default memo(ClusterLabel)
