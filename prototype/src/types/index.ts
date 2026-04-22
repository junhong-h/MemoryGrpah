export type EventCategory = 'travel' | 'social' | 'milestone' | 'daily'

export interface Photo {
  id: string
  url: string          // mock: emoji or placeholder URL
  caption?: string
}

export interface CueQuestion {
  id: string
  text: string
}

export interface RelatedEvent {
  eventId: string
  reason: string       // preserved in mock data; not rendered in the current demo flow
  similarity: number   // 0–1
}

export interface EventNote {
  cueResponses: string[]   // one per cue question
  writeback: string
  createdAt: string
}

export interface MemoryEvent {
  id: string
  title: string
  dateStart: string          // ISO date
  dateEnd?: string
  category: EventCategory
  coverEmoji: string
  photos: Photo[]
  cues: CueQuestion[]
  relatedEvents: RelatedEvent[]
  note?: EventNote
  revisited: boolean
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: 'time' | 'semantic'   // time = dashed gray, semantic = solid amber
}
