import type { LayerFilter } from '../../types'
import { useStore } from '../../store/useStore'

const LAYERS: { id: LayerFilter; label: string; dotColor?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'time', label: 'Time', dotColor: 'var(--edge-time)' },
  { id: 'people', label: 'People', dotColor: 'var(--edge-people)' },
  { id: 'theme', label: 'Theme', dotColor: 'var(--edge-theme)' },
]

export default function LayerToggle() {
  const activeLayer = useStore((s) => s.activeLayer)
  const setLayer = useStore((s) => s.setLayer)

  return (
    <div className="memory-layer-toggle">
      {LAYERS.map((layer) => {
        const isActive = activeLayer === layer.id
        return (
          <button
            key={layer.id}
            type="button"
            onClick={() => setLayer(layer.id)}
            className={['memory-layer-pill', isActive ? 'is-active' : ''].join(' ')}
          >
            {layer.dotColor ? (
              <span
                className="memory-layer-pill__dot"
                style={{ background: layer.dotColor }}
              />
            ) : null}
            <span>{layer.label}</span>
          </button>
        )
      })}
    </div>
  )
}
