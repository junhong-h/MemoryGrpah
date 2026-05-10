import { create } from 'zustand'
import type { LayerFilter, MemoryEvent } from '../types'
import rawData from '../data/mock-data.json'

interface ReflectionPayload {
  cueResponses: string[]
  writeback: string
}

interface AppState {
  events: MemoryEvent[]
  activeEventId: string | null
  activeLayer: LayerFilter
  hoveredEventId: string | null

  openEvent: (id: string) => void
  closeEvent: () => void
  setHoveredEvent: (id: string | null) => void
  setLayer: (layer: LayerFilter) => void
  saveReflection: (eventId: string, payload: ReflectionPayload) => void
  recordRelatedJump: (fromEventId: string, toEventId: string) => void
}

export const useStore = create<AppState>((set) => ({
  events: rawData.events as MemoryEvent[],
  activeEventId: null,
  activeLayer: 'all',
  hoveredEventId: null,

  openEvent: (id) => set({ activeEventId: id }),
  closeEvent: () => set({ activeEventId: null }),
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
    set((state) => ({
      activeEventId: toEventId,
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
    })),
}))
