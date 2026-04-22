import type { MemoryEvent, EventCategory } from '../types'

interface ClusterCenter {
  x: number
  y: number
}

const CATEGORY_ANCHORS: Record<EventCategory, ClusterCenter> = {
  travel:    { x: 220,  y: 220 },
  social:    { x: 860,  y: 180 },
  milestone: { x: 530,  y: 620 },
  daily:     { x: 1110, y: 420 },
}

const NODE_WIDTH = 142
const NODE_HEIGHT = 182
const H_SPACING = 164

export function createSeedPositions(
  events: MemoryEvent[],
): Record<string, { x: number; y: number }> {
  const byCategory = new Map<EventCategory, MemoryEvent[]>()

  for (const evt of events) {
    const list = byCategory.get(evt.category) ?? []
    list.push(evt)
    byCategory.set(evt.category, list)
  }

  const positions: Record<string, { x: number; y: number }> = {}

  for (const [category, evts] of byCategory.entries()) {
    const center = CATEGORY_ANCHORS[category]
    const sorted = [...evts].sort(
      (a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime(),
    )
    const totalWidth = (sorted.length - 1) * H_SPACING
    const startX = center.x - totalWidth / 2

    sorted.forEach((evt, i) => {
      const yOffset = i % 2 === 0 ? -18 : 34
      positions[evt.id] = {
        x: startX + i * H_SPACING - NODE_WIDTH / 2,
        y: center.y + yOffset - NODE_HEIGHT / 2,
      }
    })
  }

  return positions
}

export { CATEGORY_ANCHORS, NODE_WIDTH, NODE_HEIGHT }
