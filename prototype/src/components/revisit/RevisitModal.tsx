import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import PhotoCarousel from '../ui/PhotoCarousel'
import { pickThreePhotos } from '../../utils/photoPick'
import type { EventCategory, MemoryEvent, RelatedEvent } from '../../types'

const BRAND = 'Folio'

const CATEGORY_META: Record<EventCategory, { label: string; color: string; background: string }> = {
  travel: { label: 'Travel', color: 'var(--travel-accent)', background: 'var(--travel-soft)' },
  social: { label: 'Social', color: 'var(--social-accent)', background: 'var(--social-soft)' },
  milestone: { label: 'Milestone', color: 'var(--milestone-accent)', background: 'var(--milestone-soft)' },
  daily: { label: 'Daily', color: 'var(--daily-accent)', background: 'var(--daily-soft)' },
}

type Stage = 'cue' | 'reveal' | 'writeback' | 'card' | 'connect' | 'compare'

export default function RevisitModal() {
  const events = useStore((s) => s.events)
  const activeEventId = useStore((s) => s.activeEventId)
  const closeEvent = useStore((s) => s.closeEvent)
  const saveReflection = useStore((s) => s.saveReflection)
  const recordRelatedJump = useStore((s) => s.recordRelatedJump)

  const event = events.find((e) => e.id === activeEventId)

  const [stage, setStage] = useState<Stage>('cue')
  const [cueResponse, setCueResponse] = useState('')
  const [writeback, setWriteback] = useState('')
  const [reshuffleStep, setReshuffleStep] = useState(0)
  const [compareTargetId, setCompareTargetId] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStage('cue')
    setCueResponse('')
    setWriteback('')
    setReshuffleStep(0)
    setCompareTargetId(null)
  }, [])

  useEffect(() => {
    if (!event) return
    reset()
  }, [event?.id, reset])

  if (!event) return null

  const handleClose = () => {
    reset()
    closeEvent()
  }

  const isCardStage = stage === 'card'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 memory-replay-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div
        className="absolute inset-0 backdrop-blur-sm memory-replay-backdrop"
        style={{ background: isCardStage ? 'rgba(56, 38, 24, 0.62)' : 'rgba(75, 56, 38, 0.22)' }}
      />

      <div
        className={[
          'relative z-10 w-full overflow-hidden rounded-[34px] border memory-replay-shell',
          isCardStage ? 'max-w-[640px]' : 'max-w-[860px]',
        ].join(' ')}
        style={{
          maxHeight: '94vh',
          background: isCardStage ? 'transparent' : 'rgba(255, 250, 244, 0.98)',
          borderColor: isCardStage ? 'transparent' : 'rgba(218, 201, 182, 0.9)',
          boxShadow: isCardStage ? 'none' : '0 34px 74px rgba(79, 56, 37, 0.20)',
        }}
      >
        {!isCardStage ? (
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full text-xl"
            style={{
              color: 'var(--text-secondary)',
              background: 'rgba(255, 252, 246, 0.86)',
              border: '1px solid rgba(218, 201, 182, 0.8)',
            }}
          >
            ×
          </button>
        ) : null}

        <div className="flex max-h-[94vh] flex-col">
          {!isCardStage ? <TrailBreadcrumb /> : null}
          {!isCardStage ? <ModalHeader event={event} /> : null}

          <div
            className={[
              isCardStage ? 'px-4 py-6' : 'px-7 pb-8 pt-4 md:px-10',
              'flex-1 overflow-y-auto',
            ].join(' ')}
          >
            {stage === 'cue' && (
              <CueStage
                event={event}
                value={cueResponse}
                onChange={setCueResponse}
                onContinue={() => setStage('reveal')}
              />
            )}

            {stage === 'reveal' && (
              <RevealStage
                event={event}
                cueResponse={cueResponse}
                onContinue={() => setStage('writeback')}
                onBack={() => setStage('cue')}
              />
            )}

            {stage === 'writeback' && (
              <WritebackStage
                event={event}
                cueResponse={cueResponse}
                value={writeback}
                onChange={setWriteback}
                onSave={() => {
                  saveReflection(event.id, {
                    cueResponses: cueResponse.trim() ? [cueResponse] : [],
                    writeback,
                  })
                  setStage('card')
                }}
                onBack={() => setStage('reveal')}
              />
            )}

            {stage === 'card' && (
              <ReflectionCard
                event={event}
                writeback={writeback}
                reshuffleStep={reshuffleStep}
                onContinue={() => setStage('connect')}
                onClose={handleClose}
              />
            )}

            {stage === 'connect' && (
              <ConnectStage
                event={event}
                allEvents={events}
                onSelect={(toId) => {
                  setCompareTargetId(toId)
                  setStage('compare')
                }}
                onClose={handleClose}
              />
            )}

            {stage === 'compare' && compareTargetId && (
              <CompareStage
                fromEvent={event}
                toEvent={events.find((e) => e.id === compareTargetId) ?? event}
                relation={
                  event.relatedEvents.find((r) => r.eventId === compareTargetId) ?? null
                }
                onProceed={() => {
                  recordRelatedJump(event.id, compareTargetId)
                }}
                onBack={() => {
                  setCompareTargetId(null)
                  setStage('connect')
                }}
                onClose={handleClose}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TrailBreadcrumb() {
  const trail = useStore((s) => s.trail)
  const events = useStore((s) => s.events)

  if (trail.length < 2) return null

  const before = trail.slice(0, -1)
  const current = trail[trail.length - 1]
  const currentEvent = events.find((e) => e.id === current.eventId)

  return (
    <div className="memory-trail">
      <span style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: 10 }}>
        Trail
      </span>
      {before.map((step, i) => {
        const ev = events.find((e) => e.id === step.eventId)
        if (!ev) return null
        return (
          <Fragment key={`${step.eventId}-${step.openedAt}-${i}`}>
            <span className="memory-trail__step">
              <span className="memory-trail__icon">{ev.coverEmoji}</span>
              <span className="memory-trail__title">{ev.title}</span>
            </span>
            <span className="memory-trail__arrow">→</span>
          </Fragment>
        )
      })}
      <span className="memory-trail__current">
        <span className="memory-trail__icon">{currentEvent?.coverEmoji ?? '·'}</span>
        <span className="memory-trail__title">you're here</span>
      </span>
    </div>
  )
}

function ModalHeader({ event }: { event: MemoryEvent }) {
  const categoryMeta = CATEGORY_META[event.category]
  const dateLabel = useMemo(
    () =>
      new Date(`${event.dateStart}T12:00:00`).toLocaleDateString('en', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [event.dateStart],
  )

  const reunion = useMemo(() => {
    if (event.note?.createdAt) {
      const last = new Date(event.note.createdAt)
      const now = new Date()
      const days = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
      if (days < 1) return 'Just revisited'
      if (days < 7) return `Last revisited ${days} day${days > 1 ? 's' : ''} ago`
      const weeks = Math.floor(days / 7)
      return `Last revisited ${weeks} week${weeks > 1 ? 's' : ''} ago`
    }
    return "First time you've come back"
  }, [event.note?.createdAt])

  return (
    <header
      className="flex flex-col gap-3 border-b px-7 pb-5 pt-7 md:px-10"
      style={{ borderColor: 'rgba(218, 201, 182, 0.6)' }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium"
          style={{ color: categoryMeta.color, background: categoryMeta.background, border: '1px solid rgba(218, 201, 182, 0.6)' }}
        >
          {categoryMeta.label}
        </span>
        <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {dateLabel} · {event.photos.length} photos
        </span>
        <span
          className="text-[12px] italic"
          style={{ fontFamily: "'Lora', serif", color: 'var(--amber)' }}
        >
          {reunion}
        </span>
      </div>

      <h2
        className="text-[26px] leading-tight md:text-[30px]"
        style={{ fontFamily: "'Lora', serif", color: 'var(--text-primary)' }}
      >
        {event.title}
      </h2>
    </header>
  )
}

function CueStage({
  event,
  value,
  onChange,
  onContinue,
}: {
  event: MemoryEvent
  value: string
  onChange: (v: string) => void
  onContinue: () => void
}) {
  const cue = event.cues[0]?.text ?? 'What returns first when you think about this?'
  const cueWords = useMemo(() => cue.split(/\s+/).filter(Boolean), [cue])
  const coverPhoto = event.photos[0]?.url ?? event.coverEmoji
  const categoryMeta = CATEGORY_META[event.category]

  return (
    <div className="flex flex-col gap-6">
      <div
        className="memory-cue-cover"
        style={{
          ['--cue-cover-tint' as string]: categoryMeta.background,
        }}
      >
        <span className="memory-cue-cover__media">{coverPhoto}</span>
        <div className="memory-cue-cover__veil" />
      </div>

      <div>
        <p
          className="text-[22px] leading-9 md:text-[26px] md:leading-[40px]"
          style={{ fontFamily: "'Lora', serif", color: 'var(--text-primary)' }}
        >
          {cueWords.map((word, i) => (
            <span
              key={`${cue}-${i}`}
              className="memory-cue-word"
              style={{ animationDelay: `${i * 160}ms` }}
            >
              {word}
            </span>
          ))}
        </p>
      </div>

      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Just let it surface…"
        className="w-full resize-none rounded-[24px] border bg-transparent px-5 py-4 text-[15px] leading-7 outline-none transition-colors"
        style={{
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
          minHeight: 132,
        }}
      />

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full px-6 py-3 text-[14px] font-medium transition-all"
          style={{
            background: 'var(--text-primary)',
            color: '#FFF8F0',
            boxShadow: '0 14px 26px rgba(60, 42, 30, 0.18)',
          }}
        >
          Open
        </button>
      </div>
    </div>
  )
}

function RevealStage({
  event,
  cueResponse,
  onContinue,
  onBack,
}: {
  event: MemoryEvent
  cueResponse: string
  onContinue: () => void
  onBack: () => void
}) {
  return (
    <div className="flex flex-col gap-5">
      {cueResponse.trim() ? (
        <p
          className="text-[14px] leading-6"
          style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', color: 'var(--text-secondary)' }}
        >
          “{cueResponse.trim()}” — and then it surfaces.
        </p>
      ) : (
        <p
          className="text-[14px] leading-6"
          style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', color: 'var(--text-muted)' }}
        >
          The day surfaces, one frame at a time —
        </p>
      )}

      <PhotoCarousel photos={event.photos} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full px-4 py-2 text-[13px] font-medium"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          Back
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="rounded-full px-6 py-3 text-[14px] font-medium"
          style={{
            background: 'var(--text-primary)',
            color: '#FFF8F0',
            boxShadow: '0 14px 26px rgba(60, 42, 30, 0.18)',
          }}
        >
          Write something
        </button>
      </div>
    </div>
  )
}

function WritebackStage({
  event,
  cueResponse,
  value,
  onChange,
  onSave,
  onBack,
}: {
  event: MemoryEvent
  cueResponse: string
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onBack: () => void
}) {
  const allEvents = useStore((s) => s.events)
  const photoStrip = useMemo(() => pickThreePhotos(event.photos, 0), [event.photos])
  const canSave = value.trim().length > 0

  const previousNote = event.note
  const previousJumps = useMemo(() => {
    if (!previousNote?.jumpedToEventIds) return []
    return previousNote.jumpedToEventIds
      .map((id) => allEvents.find((e) => e.id === id))
      .filter((e): e is MemoryEvent => !!e)
  }, [previousNote, allEvents])

  const timeSince = useMemo(() => {
    if (!previousNote?.createdAt) return ''
    const last = new Date(previousNote.createdAt)
    const now = new Date()
    const days = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
    if (days < 1) return 'just now'
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
    const weeks = Math.floor(days / 7)
    if (weeks < 8) return `${weeks} week${weeks > 1 ? 's' : ''} ago`
    const months = Math.floor(days / 30)
    return `${months} month${months > 1 ? 's' : ''} ago`
  }, [previousNote?.createdAt])

  const hasHistory = !!(previousNote && previousNote.writeback)

  return (
    <div className="flex flex-col gap-6">
      {hasHistory ? (
        <div className="memory-history-block">
          <p className="memory-history-block__header">What you left here before</p>

          <div className="memory-history-block__row">
            <span className="memory-history-block__meta">{timeSince}, you wrote</span>
            <p className="memory-history-block__quote">“{previousNote!.writeback}”</p>
          </div>

          {previousJumps.length > 0 ? (
            <div className="memory-history-block__row">
              <span className="memory-history-block__meta">and you walked to</span>
              <div className="memory-history-block__jumps">
                {previousJumps.map((j) => (
                  <span key={j.id} className="memory-history-block__jump-chip">
                    <span>{j.coverEmoji}</span>
                    <span>{j.title}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {photoStrip.map((photo) => (
          <span
            key={photo.id}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-[24px]"
            style={{
              background: 'linear-gradient(160deg, #F7EFE4 0%, #EEDFCF 100%)',
              border: '1px solid rgba(218, 201, 182, 0.7)',
            }}
          >
            {photo.url}
          </span>
        ))}
      </div>

      {cueResponse.trim() ? (
        <div
          className="border-l-2 pl-4 py-1"
          style={{ borderColor: 'rgba(191, 128, 58, 0.5)' }}
        >
          <p
            className="text-[14px] leading-7"
            style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', color: 'var(--text-secondary)' }}
          >
            A moment ago you said — “{cueResponse.trim()}”
          </p>
        </div>
      ) : null}

      <p
        className="text-[22px] leading-9 md:text-[24px]"
        style={{ fontFamily: "'Lora', serif", color: 'var(--text-primary)' }}
      >
        {hasHistory ? 'And now — anything new to keep?' : 'Anything you want to keep from this?'}
      </p>

      <textarea
        rows={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="A sentence is enough. Anything that surfaces."
        className="w-full resize-none rounded-[24px] border bg-transparent px-5 py-4 text-[15px] leading-7 outline-none"
        style={{
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
          minHeight: 168,
        }}
      />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full px-4 py-2 text-[13px] font-medium"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="rounded-full px-6 py-3 text-[14px] font-medium"
          style={{
            background: canSave ? 'var(--text-primary)' : 'rgba(60, 42, 30, 0.18)',
            color: '#FFF8F0',
            cursor: canSave ? 'pointer' : 'not-allowed',
            boxShadow: canSave ? '0 14px 26px rgba(60, 42, 30, 0.18)' : 'none',
          }}
        >
          Keep this
        </button>
      </div>
    </div>
  )
}

function ReflectionCard({
  event,
  writeback,
  reshuffleStep,
  onContinue,
  onClose,
}: {
  event: MemoryEvent
  writeback: string
  reshuffleStep: number
  onContinue: () => void
  onClose: () => void
}) {
  const allEvents = useStore((s) => s.events)
  const photos = useMemo(
    () => pickThreePhotos(event.photos, reshuffleStep),
    [event.photos, reshuffleStep],
  )

  const ghosts = useMemo(
    () =>
      event.relatedEvents
        .slice(0, 2)
        .map((rel) => allEvents.find((e) => e.id === rel.eventId))
        .filter((e): e is MemoryEvent => !!e),
    [event.relatedEvents, allEvents],
  )
  const dateLabel = useMemo(
    () =>
      new Date(`${event.dateStart}T12:00:00`).toLocaleDateString('en', {
        month: 'long',
        year: 'numeric',
      }),
    [event.dateStart],
  )

  const stackOffsets = [
    { x: -110, y: -8, rotate: -9 },
    { x: 0, y: 4, rotate: 1.5 },
    { x: 110, y: -4, rotate: 8 },
  ]

  const ghostPositions = [
    { x: '-220%', y: '-160%', rot: -14 },
    { x: '120%', y: '160%', rot: 12 },
  ]

  return (
    <div className="relative flex flex-col items-center gap-6 py-4">
      {ghosts.map((g, i) => {
        const pos = ghostPositions[i] ?? ghostPositions[0]
        return (
          <div
            key={g.id}
            className="memory-card-ghost"
            style={{
              ['--ghost-base' as string]: `translate(${pos.x}, ${pos.y}) rotate(${pos.rot}deg)`,
              animationDelay: `${2400 + i * 600}ms`,
            }}
          >
            <div className="memory-card-ghost__frame">
              <span className="memory-card-ghost__photo">
                {g.photos[0]?.url ?? g.coverEmoji}
              </span>
            </div>
            <p className="memory-card-ghost__caption">{g.title}</p>
          </div>
        )
      })}

      <div className="memory-card-stack relative h-[260px] w-full max-w-[500px]">
        {photos.map((photo, idx) => {
          const offset = stackOffsets[idx] ?? stackOffsets[1]
          return (
            <div
              key={photo.id}
              className="absolute left-1/2 top-1/2 memory-card-polaroid"
              style={{
                ['--stack-x' as string]: `${offset.x}px`,
                ['--stack-y' as string]: `${offset.y}px`,
                ['--stack-rot' as string]: `${offset.rotate}deg`,
                ['--drop-delay' as string]: `${idx * 340}ms`,
                zIndex: idx + 1,
              }}
            >
              <div className="memory-card-polaroid__frame">
                <span className="memory-card-polaroid__photo">{photo.url}</span>
              </div>
              {photo.caption ? (
                <p className="memory-card-polaroid__caption">{photo.caption}</p>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="w-full max-w-[480px] rounded-[28px] border bg-white/95 px-7 py-7 text-center backdrop-blur-md"
        style={{ borderColor: 'rgba(218, 201, 182, 0.7)', boxShadow: '0 28px 60px rgba(60, 42, 30, 0.22)' }}
      >
        <p
          className="text-[10px] font-medium tracking-[0.32em]"
          style={{ color: 'var(--text-muted)', textTransform: 'uppercase' }}
        >
          {dateLabel}
        </p>
        <h3
          className="mt-3 text-[22px] leading-snug"
          style={{ fontFamily: "'Lora', serif", color: 'var(--text-primary)' }}
        >
          {event.title}
        </h3>
        <p
          className="mt-5 text-[16px] leading-8"
          style={{ fontFamily: "'Lora', serif", color: 'var(--text-primary)', fontStyle: 'italic' }}
        >
          “{writeback.trim()}”
        </p>
        <p
          className="mt-6 text-[10px] font-medium tracking-[0.28em]"
          style={{ color: 'var(--text-muted)', textTransform: 'uppercase' }}
        >
          from your {BRAND}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-5 py-3 text-[13px] font-medium"
          style={{ color: '#fff8f0', background: 'rgba(60, 42, 30, 0.6)', backdropFilter: 'blur(6px)' }}
        >
          Done
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full px-5 py-3 text-[13px] font-medium"
          style={{
            background: '#fff8f0',
            color: 'var(--text-primary)',
            boxShadow: '0 14px 26px rgba(60, 42, 30, 0.22)',
          }}
        >
          See connections →
        </button>
      </div>
    </div>
  )
}

function CompareStage({
  fromEvent,
  toEvent,
  relation,
  onProceed,
  onBack,
  onClose,
}: {
  fromEvent: MemoryEvent
  toEvent: MemoryEvent
  relation: RelatedEvent | null
  onProceed: () => void
  onBack: () => void
  onClose: () => void
}) {
  const fromPhotos = useMemo(() => pickThreePhotos(fromEvent.photos, 0), [fromEvent.photos])
  const toPhotos = useMemo(() => pickThreePhotos(toEvent.photos, 0), [toEvent.photos])

  return (
    <div className="flex flex-col gap-6">
      <p
        className="text-[15px] leading-7"
        style={{ fontFamily: "'Lora', serif", color: 'var(--text-secondary)', fontStyle: 'italic' }}
      >
        Two moments, side by side —
      </p>

      <div className="grid items-stretch gap-3 md:grid-cols-[1fr_140px_1fr]">
        <ComparePanel event={fromEvent} photos={fromPhotos} reflection={fromEvent.note?.writeback ?? null} />

        <div className="hidden flex-col items-center justify-center gap-2 md:flex">
          <div className="memory-compare-rope" />
          {relation ? <span className="memory-compare-chip">{relation.reason}</span> : null}
          <div className="memory-compare-rope" />
        </div>

        <ComparePanel event={toEvent} photos={toPhotos} reflection={null} />
      </div>

      {relation ? (
        <p
          className="text-center text-[12px] md:hidden"
          style={{ color: 'var(--amber)' }}
        >
          {relation.reason}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full px-4 py-2 text-[13px] font-medium"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          Back
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-[13px] font-medium"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Stay with this
          </button>
          <button
            type="button"
            onClick={onProceed}
            className="rounded-full px-6 py-3 text-[14px] font-medium"
            style={{
              background: 'var(--text-primary)',
              color: '#FFF8F0',
              boxShadow: '0 14px 26px rgba(60, 42, 30, 0.18)',
            }}
          >
            Reflect on this →
          </button>
        </div>
      </div>
    </div>
  )
}

function ComparePanel({
  event,
  photos,
  reflection,
}: {
  event: MemoryEvent
  photos: { id: string; url: string }[]
  reflection: string | null
}) {
  const categoryMeta = CATEGORY_META[event.category]
  const dateLabel = useMemo(
    () =>
      new Date(`${event.dateStart}T12:00:00`).toLocaleDateString('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    [event.dateStart],
  )

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
        className="mt-3 text-[18px] leading-snug"
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

      {reflection ? (
        <p
          className="mt-4 text-[14px] leading-7"
          style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', color: 'var(--text-secondary)' }}
        >
          “{reflection}”
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

function ConnectStage({
  event,
  allEvents,
  onSelect,
  onClose,
}: {
  event: MemoryEvent
  allEvents: MemoryEvent[]
  onSelect: (toId: string) => void
  onClose: () => void
}) {
  const candidates = useMemo(() => {
    return event.relatedEvents
      .map((rel) => {
        const target = allEvents.find((e) => e.id === rel.eventId)
        if (!target) return null
        return { rel, target }
      })
      .filter((x): x is { rel: RelatedEvent; target: MemoryEvent } => x !== null)
      .slice(0, 3)
  }, [event, allEvents])

  return (
    <div className="flex flex-col gap-6">
      <p
        className="text-[22px] leading-9"
        style={{ fontFamily: "'Lora', serif", color: 'var(--text-primary)' }}
      >
        These felt nearby.
      </p>

      {candidates.length === 0 ? (
        <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
          Nothing surfaced this time.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {candidates.map(({ rel, target }) => {
            const targetCategory = CATEGORY_META[target.category]

            return (
              <button
                key={rel.eventId}
                type="button"
                onClick={() => onSelect(target.id)}
                className="group flex items-stretch gap-4 rounded-[24px] border p-4 text-left transition-all hover:-translate-y-1"
                style={{
                  background: 'var(--bg-elevated)',
                  borderColor: 'var(--border)',
                  boxShadow: '0 14px 26px rgba(94, 69, 45, 0.08)',
                }}
              >
                <div
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-[40px]"
                  style={{
                    background: 'linear-gradient(160deg, #F7EFE4 0%, #EEDFCF 100%)',
                    border: '1px solid rgba(218, 201, 182, 0.7)',
                  }}
                >
                  {target.photos[0]?.url ?? target.coverEmoji}
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <span
                    className="inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ color: targetCategory.color, background: targetCategory.background }}
                  >
                    {rel.reason}
                  </span>
                  <p
                    className="text-[16px] leading-snug"
                    style={{ fontFamily: "'Lora', serif", color: 'var(--text-primary)' }}
                  >
                    {target.title}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-end pt-2">
        <button
          type="button"
          onClick={onClose}
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
  )
}
