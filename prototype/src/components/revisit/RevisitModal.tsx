import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import PhotoGrid from '../ui/PhotoGrid'
import ForceInput, { MIN_RESPONSE_CHARS } from '../ui/ForceInput'
import StepIndicator from '../ui/StepIndicator'
import { pickThreePhotos, maxReshuffleSteps } from '../../utils/photoPick'
import type { EventCategory, MemoryEvent, RelatedEvent } from '../../types'

const CATEGORY_META: Record<EventCategory, { label: string; color: string; background: string }> = {
  travel: { label: 'Travel', color: 'var(--travel-accent)', background: 'var(--travel-soft)' },
  social: { label: 'Social', color: 'var(--social-accent)', background: 'var(--social-soft)' },
  milestone: { label: 'Milestone', color: 'var(--milestone-accent)', background: 'var(--milestone-soft)' },
  daily: { label: 'Daily', color: 'var(--daily-accent)', background: 'var(--daily-soft)' },
}

const RELATION_META: Record<'people' | 'theme', { label: string; color: string; background: string }> = {
  people: {
    label: 'People',
    color: 'var(--edge-people)',
    background: 'rgba(158, 116, 199, 0.14)',
  },
  theme: {
    label: 'Theme',
    color: 'var(--edge-theme)',
    background: 'rgba(196, 138, 75, 0.16)',
  },
}

type Stage = 'cue' | 'reveal' | 'writeback' | 'connect'

const STAGE_LABELS = ['Recall', 'Reveal', 'Reflect']

export default function RevisitModal() {
  const events = useStore((s) => s.events)
  const activeEventId = useStore((s) => s.activeEventId)
  const closeEvent = useStore((s) => s.closeEvent)
  const saveReflection = useStore((s) => s.saveReflection)
  const recordRelatedJump = useStore((s) => s.recordRelatedJump)

  const event = events.find((e) => e.id === activeEventId)

  const [stage, setStage] = useState<Stage>('cue')
  const [cueResponse, setCueResponse] = useState('')
  const [cueSkipped, setCueSkipped] = useState(false)
  const [writeback, setWriteback] = useState('')
  const [reshuffleStep, setReshuffleStep] = useState(0)

  const reset = useCallback(() => {
    setStage('cue')
    setCueResponse('')
    setCueSkipped(false)
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 memory-replay-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div
        className="absolute inset-0 backdrop-blur-sm memory-replay-backdrop"
        style={{ background: 'rgba(75, 56, 38, 0.22)' }}
      />

      <div
        className="relative z-10 w-full max-w-[860px] max-h-[94vh] overflow-hidden rounded-[34px] border memory-replay-shell"
        style={{
          background: 'rgba(255, 250, 244, 0.98)',
          borderColor: 'rgba(218, 201, 182, 0.9)',
          boxShadow: '0 34px 74px rgba(79, 56, 37, 0.20)',
        }}
      >
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

        <div className="flex max-h-[94vh] flex-col">
          <ModalHeader event={event} stage={stage} />

          <div className="flex-1 overflow-y-auto px-7 pb-8 pt-4 md:px-10">
            {stage === 'cue' && (
              <CueStage
                event={event}
                value={cueResponse}
                onChange={setCueResponse}
                skipped={cueSkipped}
                onSkipChange={(next) => setCueSkipped(next)}
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
                cueSkipped={cueSkipped}
                value={writeback}
                onChange={setWriteback}
                onSave={() => {
                  saveReflection(event.id, {
                    cueResponses: cueSkipped ? [] : [cueResponse],
                    writeback,
                  })
                  setStage('connect')
                }}
                onBack={() => setStage('reveal')}
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

function ModalHeader({ event, stage }: { event: MemoryEvent; stage: Stage }) {
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

  const stageIndex = stage === 'cue' ? 0 : stage === 'reveal' ? 1 : 2

  return (
    <header
      className="flex flex-col gap-4 border-b px-7 pb-5 pt-7 md:px-10"
      style={{ borderColor: 'rgba(218, 201, 182, 0.7)' }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold"
          style={{ color: categoryMeta.color, background: categoryMeta.background, border: '1px solid rgba(218, 201, 182, 0.7)' }}
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

      {stage !== 'connect' ? (
        <StepIndicator total={3} current={stageIndex} labels={STAGE_LABELS} />
      ) : (
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          Reflection saved — connections nearby
        </p>
      )}
    </header>
  )
}

function CueStage({
  event,
  value,
  onChange,
  skipped,
  onSkipChange,
  onContinue,
}: {
  event: MemoryEvent
  value: string
  onChange: (v: string) => void
  skipped: boolean
  onSkipChange: (v: boolean) => void
  onContinue: () => void
}) {
  const cue = event.cues[0]?.text ?? 'What returns first when you think about this event?'
  const sufficient = value.trim().length >= MIN_RESPONSE_CHARS

  return (
    <div className="flex flex-col gap-7">
      <div
        className="rounded-[28px] border p-6 md:p-8"
        style={{
          background: 'linear-gradient(180deg, #FBF4EA 0%, #F4E8D8 100%)',
          borderColor: 'rgba(218, 201, 182, 0.8)',
        }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.24em]"
          style={{ color: 'var(--amber)' }}
        >
          Before the photos
        </p>
        <p
          className="mt-4 text-[22px] leading-9 md:text-[26px] md:leading-10"
          style={{ fontFamily: "'Lora', serif", color: 'var(--text-primary)' }}
        >
          {cue}
        </p>
        {event.cues[1]?.text ? (
          <p className="mt-4 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            (And quietly, in the back of your mind: {event.cues[1].text})
          </p>
        ) : null}
      </div>

      <ForceInput
        value={value}
        onChange={onChange}
        onCantRecall={() => onSkipChange(!skipped)}
        cantRecall={skipped}
        placeholder="Write what comes back first — names, a smell, a feeling…"
      />

      <div className="flex items-center justify-between">
        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          The cue tries to surface your memory before the photos do.
        </p>
        <button
          type="button"
          onClick={onContinue}
          disabled={!skipped && !sufficient}
          className="rounded-full px-6 py-3 text-[14px] font-semibold transition-all"
          style={{
            background: !skipped && !sufficient ? 'rgba(60, 42, 30, 0.18)' : 'var(--text-primary)',
            color: '#FFF8F0',
            cursor: !skipped && !sufficient ? 'not-allowed' : 'pointer',
            boxShadow: !skipped && !sufficient ? 'none' : '0 14px 26px rgba(60, 42, 30, 0.18)',
          }}
        >
          Reveal photos →
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
      <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
        Three photos — chosen as a beginning, a middle, an end of the day.
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
            ← Back to cue
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
              ↻ Show three different ones
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="rounded-full px-6 py-3 text-[14px] font-semibold"
          style={{
            background: 'var(--text-primary)',
            color: '#FFF8F0',
            boxShadow: '0 14px 26px rgba(60, 42, 30, 0.18)',
          }}
        >
          Write something →
        </button>
      </div>
    </div>
  )
}

function WritebackStage({
  event,
  cueResponse,
  cueSkipped,
  value,
  onChange,
  onSave,
  onBack,
}: {
  event: MemoryEvent
  cueResponse: string
  cueSkipped: boolean
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onBack: () => void
}) {
  const photoStrip = useMemo(() => pickThreePhotos(event.photos, 0), [event.photos])
  const canSave = value.trim().length > 0

  return (
    <div className="flex flex-col gap-6">
      <div
        className="flex flex-wrap items-center gap-3 rounded-[20px] border px-4 py-3"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
      >
        {photoStrip.map((photo) => (
          <span
            key={photo.id}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-[22px]"
            style={{
              background: 'linear-gradient(160deg, #F7EFE4 0%, #EEDFCF 100%)',
              border: '1px solid rgba(218, 201, 182, 0.7)',
            }}
          >
            {photo.url}
          </span>
        ))}
        <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          You just sat with these.
        </span>
      </div>

      {!cueSkipped && cueResponse.trim() ? (
        <div
          className="rounded-[20px] border-l-4 px-4 py-3"
          style={{
            borderColor: 'var(--amber)',
            background: 'rgba(246, 228, 205, 0.5)',
            color: 'var(--text-secondary)',
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--amber)' }}>
            What you wrote before
          </p>
          <p className="mt-2 text-[14px] leading-7">{cueResponse}</p>
        </div>
      ) : null}

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--amber)' }}>
          Now
        </p>
        <p
          className="mt-3 text-[22px] leading-9 md:text-[24px]"
          style={{ fontFamily: "'Lora', serif", color: 'var(--text-primary)' }}
        >
          What stays with you, after seeing them again?
        </p>
      </div>

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
          ← Back to photos
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="rounded-full px-6 py-3 text-[14px] font-semibold"
          style={{
            background: canSave ? 'var(--text-primary)' : 'rgba(60, 42, 30, 0.18)',
            color: '#FFF8F0',
            cursor: canSave ? 'pointer' : 'not-allowed',
            boxShadow: canSave ? '0 14px 26px rgba(60, 42, 30, 0.18)' : 'none',
          }}
        >
          Save reflection →
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
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--amber)' }}>
          What this connects to
        </p>
        <p
          className="mt-3 text-[22px] leading-9"
          style={{ fontFamily: "'Lora', serif", color: 'var(--text-primary)' }}
        >
          Other moments your archive thinks belong nearby.
        </p>
      </div>

      {candidates.length === 0 ? (
        <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
          Nothing surfaced this time. Return to the graph and explore.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {candidates.map(({ rel, target }) => {
            const relMeta = RELATION_META[rel.relation]
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
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]"
                      style={{ color: relMeta.color, background: relMeta.background }}
                    >
                      {relMeta.label}
                    </span>
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ color: targetCategory.color, background: targetCategory.background }}
                    >
                      {targetCategory.label}
                    </span>
                  </div>
                  <p
                    className="text-[16px] leading-snug"
                    style={{ fontFamily: "'Lora', serif", color: 'var(--text-primary)' }}
                  >
                    {target.title}
                  </p>
                  <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {rel.reason}
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
          className="rounded-full px-5 py-3 text-[14px] font-semibold"
          style={{
            background: 'var(--text-primary)',
            color: '#FFF8F0',
            boxShadow: '0 14px 26px rgba(60, 42, 30, 0.18)',
          }}
        >
          Return to graph
        </button>
      </div>
    </div>
  )
}
