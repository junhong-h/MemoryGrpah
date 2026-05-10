export type EventCategory = 'travel' | 'social' | 'milestone' | 'daily'

export type RelationType = 'time' | 'people' | 'theme'

export type LayerFilter = 'all' | RelationType

export interface Photo {
  id: string
  url: string
  caption?: string
}

export interface CueQuestion {
  id: string
  text: string
}

export interface RelatedEvent {
  eventId: string
  reason: string
  relation: Exclude<RelationType, 'time'>
  similarity: number
}

export interface EventNote {
  cueResponses: string[]
  writeback: string
  createdAt: string
  jumpedToEventIds?: string[]
}

export interface MemoryEvent {
  id: string
  title: string
  dateStart: string
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
  type: RelationType
  reason?: string
}
