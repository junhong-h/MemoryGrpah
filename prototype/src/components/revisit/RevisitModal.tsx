import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import PhotoGrid from '../ui/PhotoGrid'
import { pickThreePhotos, maxReshuffleSteps } from '../../utils/photoPick'
import type { EventCategory, MemoryEvent, RelatedEvent } from '../../types'

const BRAND = 'Folio'

const CATEGORY_META: Record<EventCategory, { label: string; color: string; background: string }> = {
  travel: { label: 'Travel', color: 'var(--travel-accent)', background: 'var(--travel-soft)' },
  social: { label: 'Social', color: 'var(--social-accent)', background: 'var(--social-soft)' },
  milestone: { label: 'Milestone', color: 'var(--milestone-accent)', background: 'var(--milestone-soft)' },
  daily: { label: 'Daily', color: 'var(--daily-accent)', background: 'var(--daily-soft)' },
}

type Stage = 'cue' | 'reveal' | 'writeback' | 'card' | 'connect'

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

  const reset = useCallback(() => {
    setStage('cue')
    setCueResponse('')
    setWriteback('')
    setReshuffleStep(0)
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
                reshuffleStep={reshuffleStep}
                onReshuffle={() => setReshuffleStep((s) => s + 1)}
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
                onJump={(toId) => {
                  recordRelatedJump(event.id, toId)
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

  return (
    <div className="flex flex-col gap-7">
      <div
        className="rounded-[28px] border p-7 md:p-9"
        style={{
          background: 'linear-gradient(180deg, #FBF4EA 0%, #F4E8D8 100%)',
          borderColor: 'rgba(218, 201, 182, 0.7)',
        }}
      >
        <p
          className="text-[24px] leading-9 md:text-[28px] md:leading-[42px]"
          style={{ fontFamily: "'Lora', serif", color: 'var(--text-primary)' }}
        >
          {cueWords.map((word, i) => (
            <span
              key={`${cue}-${i}`}
              className="memory-cue-word"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              {word}
            </span>
          ))}
        </p>
      </div>

      <textarea
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Just let it surface…"
        className="w-full resize-none rounded-[24px] border bg-transparent px-5 py-4 text-[15px] leading-7 outline-none transition-colors"
        style={{
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
          minHeight: 152,
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
  reshuffleStep,
  onReshuffle,
  onContinue,
  onBack,
}: {
  event: MemoryEvent
  reshuffleStep: number
  onReshuffle: () => void
  onContinue: () => void
  onBack: () => void
}) {
  const selected = useMemo(
    () => pickThreePhotos(event.photos, reshuffleStep),
    [event.photos, reshuffleStep],
  )
  const canReshuffle = maxReshuffleSteps(event.photos) > 1

  return (
    <div className="flex flex-col gap-6">
      <p
        className="text-[15px] leading-7"
        style={{ fontFamily: "'Lora', serif", color: 'var(--text-secondary)', fontStyle: 'italic' }}
      >
        Three from this day —
      </p>

      <PhotoGrid key={reshuffleStep} photos={selected} animate />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full px-4 py-2 text-[13px] font-medium"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Back
          </button>
          {canReshuffle ? (
            <button
              type="button"
              onClick={onReshuffle}
              className="rounded-full px-4 py-2 text-[13px] font-medium"
              style={{
                color: 'var(--amber)',
                border: '1px solid rgba(191, 128, 58, 0.4)',
                background: 'rgba(246, 228, 205, 0.6)',
              }}
            >
              Other moments
            </button>
          ) : null}
        </div>

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
  const photoStrip = useMemo(() => pickThreePhotos(event.photos, 0), [event.photos])
  const canSave = value.trim().length > 0

  return (
    <div className="flex flex-col gap-6">
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
            Earlier you said — “{cueResponse.trim()}”
          </p>
        </div>
      ) : null}

      <p
        className="text-[22px] leading-9 md:text-[24px]"
        style={{ fontFamily: "'Lora', serif", color: 'var(--text-primary)' }}
      >
        Anything you want to keep from this?
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
  const photos = useMemo(
    () => pickThreePhotos(event.photos, reshuffleStep),
    [event.photos, reshuffleStep],
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

  return (
    <div className="flex flex-col items-center gap-6 py-4">
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
                ['--drop-delay' as string]: `${idx * 220}ms`,
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

function ConnectStage({
  event,
  allEvents,
  onJump,
  onClose,
}: {
  event: MemoryEvent
  allEvents: MemoryEvent[]
  onJump: (toId: string) => void
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
                onClick={() => onJump(target.id)}
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
