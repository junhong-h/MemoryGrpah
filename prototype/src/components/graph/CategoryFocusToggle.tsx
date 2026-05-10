import type { EventCategory } from '../../types'
import { useStore } from '../../store/useStore'

const CATEGORIES: { id: EventCategory; label: string; color: string; soft: string }[] = [
  { id: 'travel', label: 'Travel', color: 'var(--travel-accent)', soft: 'var(--travel-soft)' },
  { id: 'social', label: 'Social', color: 'var(--social-accent)', soft: 'var(--social-soft)' },
  { id: 'milestone', label: 'Milestone', color: 'var(--milestone-accent)', soft: 'var(--milestone-soft)' },
]

export default function CategoryFocusToggle() {
  const focus = useStore((s) => s.categoryFocus)
  const setFocus = useStore((s) => s.setCategoryFocus)

  return (
    <div className="memory-category-toggle">
      <span className="memory-category-toggle__hint">focus a thread</span>
      {CATEGORIES.map((cat) => {
        const isActive = focus === cat.id
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => setFocus(cat.id)}
            className={['memory-category-pill', isActive ? 'is-active' : ''].join(' ')}
            style={{
              ['--cat-color' as string]: cat.color,
              ['--cat-soft' as string]: cat.soft,
            }}
          >
            <span className="memory-category-pill__dot" />
            <span>{cat.label}</span>
          </button>
        )
      })}
    </div>
  )
}
