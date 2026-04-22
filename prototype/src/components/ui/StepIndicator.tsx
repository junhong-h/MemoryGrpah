interface StepIndicatorProps {
  total: number
  current: number
  labels: string[]
}

export default function StepIndicator({ total, current, labels }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-1">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex min-w-[128px] flex-1 items-center gap-3">
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-semibold transition-all"
              style={{
                background:
                  i < current
                    ? 'var(--amber)'
                    : i === current
                    ? 'var(--amber-light)'
                    : 'rgba(60, 42, 30, 0.06)',
                color:
                  i < current
                    ? '#FFF8F0'
                    : i === current
                    ? 'var(--amber)'
                    : 'var(--text-muted)',
                border:
                  i === current ? '1px solid rgba(191, 128, 58, 0.22)' : '1px solid transparent',
                boxShadow:
                  i === current ? '0 12px 24px rgba(191, 128, 58, 0.16)' : 'none',
              }}
            >
              {i < current ? '✓' : i + 1}
            </div>

            <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: i === current ? 'var(--amber)' : 'var(--text-muted)' }}>
              {labels[i]}
            </span>
          </div>

          {i < total - 1 && (
            <div
              className="mb-6 h-px flex-1 transition-all"
              style={{
                background: i < current ? 'var(--amber)' : 'rgba(60, 42, 30, 0.08)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
