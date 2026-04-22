import { useState } from 'react'

const MIN_RESPONSE_CHARS = 20

interface ForceInputProps {
  placeholder?: string
  value: string
  onChange: (v: string) => void
  onCantRecall: () => void
  cantRecall: boolean
}

export { MIN_RESPONSE_CHARS }

export default function ForceInput({
  placeholder = 'Write what comes back first…',
  value,
  onChange,
  onCantRecall,
  cantRecall,
}: ForceInputProps) {
  const [focused, setFocused] = useState(false)
  const count = value.trim().length
  const sufficient = count >= MIN_RESPONSE_CHARS
  const remaining = Math.max(MIN_RESPONSE_CHARS - count, 0)

  return (
    <div className="space-y-3">
      <div
        className="overflow-hidden rounded-[24px] border"
        style={{
          background: cantRecall ? 'rgba(60, 42, 30, 0.03)' : 'var(--bg-elevated)',
          borderColor: focused ? 'rgba(191, 128, 58, 0.48)' : 'var(--border)',
          boxShadow: focused ? '0 18px 28px rgba(191, 128, 58, 0.14)' : 'none',
        }}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{
            borderColor: 'rgba(218, 201, 182, 0.65)',
            color: 'var(--text-muted)',
          }}
        >
          <span>Response</span>
          <span
            style={{
              color: cantRecall
                ? 'var(--text-secondary)'
                : sufficient
                ? 'var(--amber)'
                : 'var(--text-muted)',
            }}
          >
            {cantRecall ? 'Skipped' : sufficient ? 'Ready' : `${remaining} left`}
          </span>
        </div>

        <textarea
          rows={5}
          disabled={cantRecall}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={cantRecall ? 'Marked as skipped for now' : placeholder}
          className="min-h-[168px] w-full resize-none bg-transparent px-4 py-4 text-[15px] leading-7 outline-none"
          style={{
            color: cantRecall ? 'var(--text-muted)' : 'var(--text-primary)',
          }}
        />
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          onClick={onCantRecall}
          className="text-left text-[12px] font-medium transition-colors"
          style={{ color: cantRecall ? 'var(--amber)' : 'var(--text-secondary)' }}
        >
          {cantRecall ? 'Try this prompt again' : "I can't recall this clearly yet"}
        </button>

        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {cantRecall
            ? 'You can always come back and add more later.'
            : sufficient
            ? `${count} characters captured.`
            : `Write at least ${MIN_RESPONSE_CHARS} characters or skip this prompt.`}
        </p>
      </div>
    </div>
  )
}
