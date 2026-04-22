import { create } from 'zustand'
import type { MemoryEvent, EventNote } from '../types'
import rawData from '../data/mock-data.json'

interface AppState {
  events: MemoryEvent[]
  activeEventId: string | null

  openEvent: (id: string) => void
  closeEvent: () => void
  submitReflection: (eventId: string, note: EventNote) => void
}

export const useStore = create<AppState>((set) => ({
  events: rawData.events as MemoryEvent[],
  activeEventId: null,

  openEvent: (id) => set({ activeEventId: id }),
  closeEvent: () => set({ activeEventId: null }),

  submitReflection: (eventId, note) =>
    set((state) => ({
      events: state.events.map((event) =>
        event.id === eventId ? { ...event, note, revisited: true } : event,
      ),
      activeEventId: null,
    })),
}))
