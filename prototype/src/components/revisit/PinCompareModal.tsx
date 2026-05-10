import { useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { pickThreePhotos } from '../../utils/photoPick'
import type { EventCategory, MemoryEvent } from '../../types'

const CATEGORY_META: Record<EventCategory, { label: string; color: string; background: string }> = {
  travel: { label: 'Travel', color: 'var(--travel-accent)', background: 'var(--travel-soft)' },
  social: { label: 'Social', color: 'var(--social-accent)', background: 'var(--social-soft)' },
  milestone: { label: 'Milestone', color: 'var(--milestone-accent)', background: 'var(--milestone-soft)' },
  daily: { label: 'Daily', color: 'var(--daily-accent)', background: 'var(--daily-soft)' },
}

export default function PinCompareModal() {
  const open = useStore((s) => s.showPinCompare)
  const close = useStore((s) => s.closePinCompare)
  const pinnedIds = useStore((s) => s.pinnedEventIds)
  const events = useStore((s) => s.events)

  const pinnedEvents = useMemo(
    () =>
      pinnedIds
        .map((id) => events.find((e) => e.id === id))
        .filter((e): e is MemoryEvent => !!e),
    [pinnedIds, events],
  )

  if (!open || pinnedEvents.length < 2) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6 memory-replay-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: 'rgba(56, 38, 24, 0.62)' }}
      />

      <div
        className="relative z-10 w-full max-w-[1320px] rounded-[34px] border memory-replay-shell px-8 py-8 md:px-12"
        style={{
          background: 'rgba(255, 250, 244, 0.98)',
          borderColor: 'rgba(218, 201, 182, 0.9)',
          boxShadow: '0 34px 74px rgba(79, 56, 37, 0.22)',
          maxHeight: '94vh',
          overflowY: 'auto',
        }}
      >
        <button
          type="button"
          onClick={close}
          className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full text-xl"
          style={{
            color: 'var(--text-secondary)',
            background: 'rgba(255, 252, 246, 0.86)',
            border: '1px solid rgba(218, 201, 182, 0.8)',
          }}
        >
          ×
        </button>

        <header className="flex flex-col gap-2 pb-6">
          <span
            className="text-[11px] font-medium tracking-[0.24em]"
            style={{ color: 'var(--amber)', textTransform: 'uppercase' }}
          >
            Side by side
          </span>
          <h2
            className="text-[26px] leading-tight md:text-[30px]"
            style={{ fontFamily: "'Lora', serif", color: 'var(--text-primary)' }}
          >
            {pinnedEvents.length} moments you wanted to put next to each other
          </h2>
        </header>

        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${Math.min(pinnedEvents.length, 4)}, minmax(0, 1fr))`,
          }}
        >
          {pinnedEvents.map((ev) => (
            <PinPanel key={ev.id} event={ev} />
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 pt-8">
          <button
            type="button"
            onClick={close}
            className="rounded-full px-5 py-3 text-[14px] font-medium"
            style={{
              background: 'var(--text-primary)',
              color: '#FFF8F0',
              boxShadow: '0 14px 26px rgba(60, 42, 30, 0.18)',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

function PinPanel({ event }: { event: MemoryEvent }) {
  const photos = useMemo(() => pickThreePhotos(event.photos, 0), [event.photos])
  const dateLabel = useMemo(
    () =>
      new Date(`${event.dateStart}T12:00:00`).toLocaleDateString('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    [event.dateStart],
  )
  const categoryMeta = CATEGORY_META[event.category]

  return (
    <div
      className="memory-compare-panel rounded-[24px] border p-5"
      style={{
        background: 'var(--bg-elevated)',
        borderColor: 'var(--border)',
        boxShadow: '0 14px 28px rgba(94, 69, 45, 0.08)',
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ color: categoryMeta.color, background: categoryMeta.background }}
        >
          {categoryMeta.label}
        </span>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {dateLabel}
        </span>
      </div>

      <h3
        className="mt-3 text-[17px] leading-snug"
        style={{ fontFamily: "'Lora', serif", color: 'var(--text-primary)' }}
      >
        {event.title}
      </h3>

      <div className="mt-4 flex gap-2">
        {photos.map((p) => (
          <span
            key={p.id}
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-[26px]"
            style={{
              background: 'linear-gradient(160deg, #F7EFE4 0%, #EEDFCF 100%)',
              border: '1px solid rgba(218, 201, 182, 0.7)',
            }}
          >
            {p.url}
          </span>
        ))}
      </div>

      {event.note?.writeback ? (
        <p
          className="mt-4 text-[13px] leading-6"
          style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', color: 'var(--text-secondary)' }}
        >
          “{event.note.writeback}”
        </p>
      ) : (
        <p
          className="mt-4 text-[12px] leading-6"
          style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}
        >
          Not yet revisited.
        </p>
      )}
    </div>
  )
}
