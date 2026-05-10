import { create } from 'zustand'
import type { EventCategory, LayerFilter, MemoryEvent } from '../types'
import rawData from '../data/mock-data.json'

interface ReflectionPayload {
  cueResponses: string[]
  writeback: string
}

interface TrailStep {
  eventId: string
  openedAt: number
}

interface AppState {
  events: MemoryEvent[]
  activeEventId: string | null
  activeLayer: LayerFilter
  hoveredEventId: string | null
  trail: TrailStep[]
  pinnedEventIds: string[]
  categoryFocus: EventCategory | null
  showPinCompare: boolean

  openEvent: (id: string) => void
  closeEvent: () => void
  setHoveredEvent: (id: string | null) => void
  setLayer: (layer: LayerFilter) => void
  saveReflection: (eventId: string, payload: ReflectionPayload) => void
  recordRelatedJump: (fromEventId: string, toEventId: string) => void
  togglePin: (eventId: string) => void
  clearPins: () => void
  openPinCompare: () => void
  closePinCompare: () => void
  setCategoryFocus: (category: EventCategory | null) => void
  resetTrail: () => void
}

export const useStore = create<AppState>((set) => ({
  events: rawData.events as MemoryEvent[],
  activeEventId: null,
  activeLayer: 'all',
  hoveredEventId: null,
  trail: [],
  pinnedEventIds: [],
  categoryFocus: null,
  showPinCompare: false,

  openEvent: (id) =>
    set((state) => {
      const last = state.trail[state.trail.length - 1]
      const nextTrail = last?.eventId === id
        ? state.trail
        : [...state.trail, { eventId: id, openedAt: Date.now() }]
      return { activeEventId: id, trail: nextTrail }
    }),

  closeEvent: () => set({ activeEventId: null }),

  resetTrail: () => set({ trail: [] }),

  setHoveredEvent: (id) => set({ hoveredEventId: id }),
  setLayer: (layer) => set({ activeLayer: layer }),

  saveReflection: (eventId, payload) =>
    set((state) => ({
      events: state.events.map((event) =>
        event.id === eventId
          ? {
              ...event,
              revisited: true,
              note: {
                cueResponses: payload.cueResponses,
                writeback: payload.writeback,
                createdAt: new Date().toISOString(),
                jumpedToEventIds: event.note?.jumpedToEventIds ?? [],
              },
            }
          : event,
      ),
    })),

  recordRelatedJump: (fromEventId, toEventId) =>
    set((state) => {
      const last = state.trail[state.trail.length - 1]
      const nextTrail = last?.eventId === toEventId
        ? state.trail
        : [...state.trail, { eventId: toEventId, openedAt: Date.now() }]
      return {
        activeEventId: toEventId,
        trail: nextTrail,
        events: state.events.map((event) => {
          if (event.id !== fromEventId || !event.note) return event
          const previous = event.note.jumpedToEventIds ?? []
          if (previous.includes(toEventId)) return event
          return {
            ...event,
            note: {
              ...event.note,
              jumpedToEventIds: [...previous, toEventId],
            },
          }
        }),
      }
    }),

  togglePin: (eventId) =>
    set((state) => {
      const exists = state.pinnedEventIds.includes(eventId)
      return {
        pinnedEventIds: exists
          ? state.pinnedEventIds.filter((id) => id !== eventId)
          : [...state.pinnedEventIds, eventId].slice(-4),
      }
    }),

  clearPins: () => set({ pinnedEventIds: [], showPinCompare: false }),

  openPinCompare: () => set({ showPinCompare: true }),
  closePinCompare: () => set({ showPinCompare: false }),

  setCategoryFocus: (category) =>
    set((state) => ({
      categoryFocus: state.categoryFocus === category ? null : category,
    })),
}))
