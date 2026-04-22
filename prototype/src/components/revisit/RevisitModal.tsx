import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import StepIndicator from '../ui/StepIndicator'
import ForceInput, { MIN_RESPONSE_CHARS } from '../ui/ForceInput'
import PhotoGrid from '../ui/PhotoGrid'
import type { EventCategory, MemoryEvent } from '../../types'

const STEP_LABELS = ['Recall', 'Photos', 'Reflect']
const STEPS = ['cue', 'photos', 'writeback'] as const

const CATEGORY_META: Record<EventCategory, { label: string; color: string; background: string }> = {
  travel: {
    label: 'Travel',
    color: 'var(--travel-accent)',
    background: 'var(--travel-soft)',
  },
  social: {
    label: 'Social',
    color: 'var(--social-accent)',
    background: 'var(--social-soft)',
  },
  milestone: {
    label: 'Milestone',
    color: 'var(--milestone-accent)',
    background: 'var(--milestone-soft)',
  },
  daily: {
    label: 'Daily',
    color: 'var(--daily-accent)',
    background: 'var(--daily-soft)',
  },
}

const STEP_COPY = {
  cue: {
    eyebrow: 'Begin with recall',
    title: 'Start with what returns before the photos do.',
    body: 'Take a quiet pass through the memory first. Capture the details that surface without visual prompts.',
  },
  photos: {
    eyebrow: 'Open the album',
    title: 'Let the images fill in the edges of the moment.',
    body: 'The photo set unfolds gradually, like a contact sheet laid out on a desk.',
  },
  writeback: {
    eyebrow: 'Leave a note',
    title: 'Turn the remembered fragments into a short reflection.',
    body: 'Write what stands out now, or what this memory means when you look back on it.',
  },
}

export default function RevisitModal() {
  const { events, activeEventId, closeEvent, submitReflection } = useStore()
  const event = events.find((e) => e.id === activeEventId)

  const [step, setStep] = useState(0)
  const [cueAnswers, setCueAnswers] = useState<string[]>(['', ''])
  const [cantRecall, setCantRecall] = useState<boolean[]>([false, false])
  const [writeback, setWriteback] = useState('')
  const [wbCantRecall, setWbCantRecall] = useState(false)

  const reset = useCallback((currentEvent?: MemoryEvent) => {
    const cueDefaults = currentEvent ? currentEvent.cues.map((_, index) => currentEvent.note?.cueResponses[index] ?? '') : ['', '']

    setStep(0)
    setCueAnswers(cueDefaults)
    setCantRecall(currentEvent ? currentEvent.cues.map(() => false) : [false, false])
    setWriteback(currentEvent?.note?.writeback ?? '')
    setWbCantRecall(false)
  }, [])

  useEffect(() => {
    if (!event) return
    reset(event)
  }, [event, reset])

  if (!event) return null

  const handleClose = useCallback(() => {
    reset()
    closeEvent()
  }, [reset, closeEvent])

  const currentStepType = STEPS[step]
  const currentCopy = STEP_COPY[currentStepType]
  const categoryMeta = CATEGORY_META[event.category]

  const canProceed = (() => {
    if (currentStepType === 'cue')
      return event.cues.every((_, i) =>
        (cueAnswers[i]?.trim().length ?? 0) >= MIN_RESPONSE_CHARS || cantRecall[i])
    if (currentStepType === 'photos') return true
    return writeback.trim().length >= MIN_RESPONSE_CHARS || wbCantRecall
  })()

  const eventDate = useMemo(
    () =>
      new Date(event.dateStart).toLocaleDateString('en', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [event.dateStart],
  )

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
    } else {
      submitReflection(event.id, {
        cueResponses: cueAnswers.map((answer) => answer.trim()),
        writeback: writeback.trim(),
        createdAt: new Date().toISOString(),
      })
      reset()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(75, 56, 38, 0.22)' }} />

      <div
        className="relative z-10 max-h-[92vh] w-full max-w-[1040px] overflow-hidden rounded-[34px] border"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 34px 74px rgba(79, 56, 37, 0.18)',
        }}
      >
        <div className="grid max-h-[92vh] min-h-[620px] md:grid-cols-[320px_minmax(0,1fr)]">
          <aside
            className="relative border-b px-6 py-6 md:border-b-0 md:border-r md:px-8 md:py-8"
            style={{
              background: 'linear-gradient(180deg, #FBF4EA 0%, #F4E8D8 100%)',
              borderColor: 'rgba(218, 201, 182, 0.7)',
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full text-xl"
              style={{
                color: 'var(--text-secondary)',
                background: 'rgba(255, 250, 243, 0.75)',
                border: '1px solid rgba(218, 201, 182, 0.8)',
              }}
            >
              ×
            </button>

            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]"
              style={{
                background: 'rgba(255, 250, 243, 0.72)',
                color: 'var(--amber)',
                border: '1px solid rgba(218, 201, 182, 0.75)',
              }}
            >
              Memory Note
            </div>

            <div className="mt-6 overflow-hidden rounded-[30px] border" style={{ borderColor: 'rgba(218, 201, 182, 0.8)' }}>
              <div className="flex aspect-[4/3] items-center justify-center text-[86px]" style={{ background: 'rgba(255, 250, 243, 0.72)' }}>
                {event.coverEmoji}
              </div>
            </div>

            <div className="mt-6">
              <h2
                className="text-[30px] leading-none"
                style={{ fontFamily: "'Lora', serif", color: 'var(--text-primary)' }}
              >
                {event.title}
              </h2>
              <p className="mt-3 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                {eventDate}
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3 md:grid-cols-1">
              <InfoCard label="Category" value={categoryMeta.label} tone={categoryMeta} />
              <InfoCard label="Photos" value={String(event.photos.length).padStart(2, '0')} />
              <InfoCard label="Status" value={event.revisited ? 'Recorded' : 'Fresh'} />
            </div>

            <p className="mt-6 text-[14px] leading-7" style={{ color: 'var(--text-secondary)' }}>
              Open with recall, let the photo strip arrive second, then leave one short
              note behind. The flow stays focused on a single memory at a time.
            </p>
          </aside>

          <section className="flex min-h-0 flex-col" style={{ background: 'var(--bg-elevated)' }}>
            <div className="border-b px-6 py-6 md:px-8" style={{ borderColor: 'rgba(218, 201, 182, 0.68)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--amber)' }}>
                {currentCopy.eyebrow}
              </p>
              <h3
                className="mt-3 text-[30px] leading-tight"
                style={{ fontFamily: "'Lora', serif", color: 'var(--text-primary)' }}
              >
                {currentCopy.title}
              </h3>
              <p className="mt-3 max-w-2xl text-[15px] leading-7" style={{ color: 'var(--text-secondary)' }}>
                {currentCopy.body}
              </p>

              <div className="mt-6">
                <StepIndicator total={STEPS.length} current={step} labels={STEP_LABELS} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-8">
              {currentStepType === 'cue' && (
                <div className="space-y-5">
                  {event.cues.map((cue, index) => (
                    <section
                      key={cue.id}
                      className="rounded-[30px] border p-5 md:p-6"
                      style={{
                        background: 'var(--bg-surface)',
                        borderColor: 'var(--border)',
                        boxShadow: '0 18px 34px rgba(94, 69, 45, 0.06)',
                      }}
                    >
                      <div className="mb-5 flex items-start gap-4">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
                          style={{
                            background: 'var(--amber-light)',
                            color: 'var(--amber)',
                          }}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        <div>
                          <p className="text-[18px] leading-7" style={{ color: 'var(--text-primary)' }}>
                            {cue.text}
                          </p>
                          <p className="mt-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                            Capture the first detail that surfaces, even if it feels small.
                          </p>
                        </div>
                      </div>

                      <ForceInput
                        value={cueAnswers[index] ?? ''}
                        cantRecall={cantRecall[index] ?? false}
                        onChange={(value) => setCueAnswers((previous) => {
                          const next = [...previous]
                          next[index] = value
                          return next
                        })}
                        onCantRecall={() => setCantRecall((previous) => {
                          const next = [...previous]
                          next[index] = !next[index]
                          return next
                        })}
                      />
                    </section>
                  ))}
                </div>
              )}

              {currentStepType === 'photos' && (
                <div className="space-y-4">
                  <div
                    className="rounded-[26px] border px-5 py-4"
                    style={{
                      background: 'rgba(255, 250, 243, 0.72)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <p className="text-[13px] leading-7" style={{ color: 'var(--text-secondary)' }}>
                      Three representative photos open one by one. Let them sharpen the memory
                      without rushing you past it.
                    </p>
                  </div>
                  <PhotoGrid photos={event.photos} animate />
                </div>
              )}

              {currentStepType === 'writeback' && (
                <section
                  className="rounded-[30px] border p-5 md:p-6"
                  style={{
                    background: 'var(--bg-surface)',
                    borderColor: 'var(--border)',
                    boxShadow: '0 18px 34px rgba(94, 69, 45, 0.06)',
                  }}
                >
                  <p className="mb-5 text-[15px] leading-7" style={{ color: 'var(--text-secondary)' }}>
                    What stands out now? What tone, detail, or feeling would you keep with this
                    moment if you wrote it into an album margin?
                  </p>
                  <ForceInput
                    placeholder="Write a short reflection for this memory…"
                    value={writeback}
                    cantRecall={wbCantRecall}
                    onChange={setWriteback}
                    onCantRecall={() => setWbCantRecall((value) => !value)}
                  />
                </section>
              )}
            </div>

            <div
              className="flex items-center justify-between gap-4 border-t px-6 py-5 md:px-8"
              style={{ borderColor: 'rgba(218, 201, 182, 0.68)' }}
            >
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                className={['rounded-full px-4 py-2 text-[13px] font-medium transition-opacity', step === 0 ? 'invisible' : ''].join(' ')}
                style={{
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed}
                className="rounded-full px-5 py-3 text-[14px] font-semibold transition-all"
                style={
                  canProceed
                    ? {
                        background: 'var(--text-primary)',
                        color: '#FFF8F0',
                        boxShadow: '0 16px 30px rgba(60, 42, 30, 0.18)',
                      }
                    : {
                        background: 'rgba(60, 42, 30, 0.08)',
                        color: 'var(--text-muted)',
                        cursor: 'not-allowed',
                      }
                }
              >
                {step < STEPS.length - 1 ? 'Continue' : 'Save reflection'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function InfoCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: { color: string; background: string }
}) {
  return (
    <div
      className="rounded-[22px] border px-4 py-4"
      style={{
        background: tone?.background ?? 'rgba(255, 250, 243, 0.72)',
        borderColor: 'rgba(218, 201, 182, 0.72)',
      }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p
        className="mt-2 text-[20px] leading-none"
        style={{
          fontFamily: "'Lora', serif",
          color: tone?.color ?? 'var(--text-primary)',
        }}
      >
        {value}
      </p>
    </div>
  )
}
