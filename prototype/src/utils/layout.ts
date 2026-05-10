import type { EventCategory, GraphEdge, MemoryEvent } from '../types'

interface LaneDefinition {
  y: number
  tint: string
}

export interface TemporalBounds {
  start: number
  end: number
  minDate: number
  maxDate: number
}

export interface TimelineMarker {
  id: string
  label: string
  x: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const DOMAIN_PADDING_DAYS = 24

const TIMELINE_FRAME = {
  startX: 180,
  endX: 1540,
  topY: 104,
  bottomY: 928,
}

const GRAPH_EXTENT = {
  minX: -80,
  maxX: 1680,
  minY: -100,
  maxY: 1080,
}

const CATEGORY_LANES: Record<EventCategory, LaneDefinition> = {
  travel:    { y: 232, tint: 'var(--travel-soft)' },
  social:    { y: 430, tint: 'var(--social-soft)' },
  milestone: { y: 664, tint: 'var(--milestone-soft)' },
  daily:     { y: 862, tint: 'var(--daily-soft)' },
}

const NODE_WIDTH = 142
const NODE_HEIGHT = 182

const NODE_SIZE_TIERS = [
  { maxCount: 3, scale: 0.86 },
  { maxCount: 5, scale: 1.0 },
  { maxCount: 7, scale: 1.16 },
  { maxCount: Infinity, scale: 1.34 },
]

export function getNodeScale(photoCount: number) {
  const tier = NODE_SIZE_TIERS.find((t) => photoCount <= t.maxCount) ?? NODE_SIZE_TIERS[NODE_SIZE_TIERS.length - 1]
  return tier.scale
}

export function getNodeSize(photoCount: number) {
  const scale = getNodeScale(photoCount)
  return {
    width: Math.round(NODE_WIDTH * scale),
    height: Math.round(NODE_HEIGHT * scale),
  }
}

const LANE_OFFSETS = [-42, 26, -70, 54, -12, 38]

export function createSeedPositions(
  events: MemoryEvent[],
): Record<string, { x: number; y: number }> {
  const bounds = getTemporalBounds(events)
  const laneCounts = new Map<EventCategory, number>()
  const sorted = [...events].sort(
    (a, b) => parseEventDate(a.dateStart) - parseEventDate(b.dateStart),
  )

  return sorted.reduce<Record<string, { x: number; y: number }>>((positions, event, index) => {
    const laneIndex = laneCounts.get(event.category) ?? 0
    laneCounts.set(event.category, laneIndex + 1)

    const x = getTimelineX(event.dateStart, bounds)
    const lane = CATEGORY_LANES[event.category]
    const yOffset = LANE_OFFSETS[laneIndex % LANE_OFFSETS.length] + (index % 2 === 0 ? -10 : 10)

    positions[event.id] = {
      x: x - NODE_WIDTH / 2,
      y: lane.y + yOffset - NODE_HEIGHT / 2,
    }

    return positions
  }, {})
}

export function createTemporalEdges(events: MemoryEvent[]): GraphEdge[] {
  const sorted = [...events].sort(
    (a, b) => parseEventDate(a.dateStart) - parseEventDate(b.dateStart),
  )

  return sorted.slice(0, -1).map((event, index) => ({
    id: `e_time_${event.id}_${sorted[index + 1].id}`,
    source: event.id,
    target: sorted[index + 1].id,
    type: 'time' as const,
  }))
}

export function getTemporalBounds(events: MemoryEvent[]): TemporalBounds {
  if (events.length === 0) {
    return {
      start: 0,
      end: 1,
      minDate: 0,
      maxDate: 1,
    }
  }

  const timestamps = events.map((event) => parseEventDate(event.dateStart))
  const minDate = Math.min(...timestamps)
  const maxDate = Math.max(...timestamps)

  return {
    minDate,
    maxDate,
    start: minDate - DOMAIN_PADDING_DAYS * DAY_MS,
    end: maxDate + DOMAIN_PADDING_DAYS * DAY_MS,
  }
}

export function getTimelineX(dateStart: string, bounds: TemporalBounds) {
  const domain = Math.max(bounds.end - bounds.start, 1)
  const ratio = (parseEventDate(dateStart) - bounds.start) / domain

  return TIMELINE_FRAME.startX + clamp(ratio, 0, 1) * (TIMELINE_FRAME.endX - TIMELINE_FRAME.startX)
}

export function buildTimelineMarkers(events: MemoryEvent[]): TimelineMarker[] {
  if (events.length === 0) return []

  const bounds = getTemporalBounds(events)
  const firstMarker = getSeasonStart(new Date(bounds.minDate))
  const markers: TimelineMarker[] = []

  for (let cursor = firstMarker; cursor.getTime() <= bounds.maxDate; cursor = addSeason(cursor)) {
    markers.push({
      id: `marker-${cursor.toISOString()}`,
      label: formatSeasonLabel(cursor),
      x: getTimelineX(cursor.toISOString().slice(0, 10), bounds),
    })
  }

  return markers
}

function parseEventDate(dateStart: string) {
  return new Date(`${dateStart}T12:00:00`).getTime()
}

function getSeasonStart(date: Date) {
  const year = date.getFullYear()
  const month = date.getMonth()

  if (month >= 11) return new Date(year, 11, 1)
  if (month >= 8) return new Date(year, 8, 1)
  if (month >= 5) return new Date(year, 5, 1)
  if (month >= 2) return new Date(year, 2, 1)

  return new Date(year - 1, 11, 1)
}

function addSeason(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 3, 1)
}

function formatSeasonLabel(date: Date) {
  const month = date.getMonth()
  const year = String(date.getFullYear()).slice(-2)

  if (month === 11) return `Winter '${year}`
  if (month === 2) return `Spring '${year}`
  if (month === 5) return `Summer '${year}`

  return `Autumn '${year}`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export { CATEGORY_LANES, GRAPH_EXTENT, NODE_WIDTH, NODE_HEIGHT, TIMELINE_FRAME }
