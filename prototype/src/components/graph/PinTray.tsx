import { useStore } from '../../store/useStore'

export default function PinTray() {
  const pinnedIds = useStore((s) => s.pinnedEventIds)
  const events = useStore((s) => s.events)
  const togglePin = useStore((s) => s.togglePin)
  const clearPins = useStore((s) => s.clearPins)
  const openPinCompare = useStore((s) => s.openPinCompare)

  if (pinnedIds.length === 0) return null

  const pinnedEvents = pinnedIds
    .map((id) => events.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => !!e)

  return (
    <div className="memory-pin-tray">
      <span className="memory-pin-tray__hint">Pinned</span>

      <div className="memory-pin-tray__items">
        {pinnedEvents.map((ev) => (
          <button
            key={ev.id}
            type="button"
            className="memory-pin-tray__item"
            onClick={() => togglePin(ev.id)}
            title={`Unpin ${ev.title}`}
          >
            <span>{ev.coverEmoji}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={openPinCompare}
        disabled={pinnedIds.length < 2}
        className="memory-pin-tray__compare"
      >
        Compare {pinnedIds.length}
      </button>

      <button
        type="button"
        onClick={clearPins}
        className="memory-pin-tray__clear"
      >
        Clear
      </button>
    </div>
  )
}
