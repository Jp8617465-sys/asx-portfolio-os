/**
 * Event Bus for Cross-Feature Communication
 *
 * Provides a pub/sub mechanism for features to communicate without
 * direct dependencies. Useful for real-time updates and state sync.
 */
import { create } from 'zustand';

export type EventType =
  | 'signal:updated'
  | 'signal:changed'
  | 'portfolio:changed'
  | 'alert:triggered'
  | 'model:drift_detected'
  | 'price:updated';

export interface BusEvent {
  type: EventType;
  payload: unknown;
  timestamp: Date;
  source?: string;
}

interface EventBusState {
  events: BusEvent[];
  lastEvent: BusEvent | null;
  emit: (type: EventType, payload: unknown, source?: string) => void;
  clear: () => void;
  getEventsByType: (type: EventType) => BusEvent[];
}

export const useEventBus = create<EventBusState>((set, get) => ({
  events: [],
  lastEvent: null,
  emit: (type: EventType, payload: unknown, source?: string): void => {
    const event: BusEvent = { type, payload, timestamp: new Date(), source };
    set((state) => ({
      events: [...state.events.slice(-99), event],
      lastEvent: event,
    }));
  },
  clear: (): void => set({ events: [], lastEvent: null }),
  getEventsByType: (type: EventType): BusEvent[] => {
    return get().events.filter((e) => e.type === type);
  },
}));

/** Convenience emitters for common events */
export const eventEmitters = {
  signalUpdated: (ticker: string, signal: string): void =>
    useEventBus.getState().emit('signal:updated', { ticker, signal }),
  portfolioChanged: (portfolioId: string): void =>
    useEventBus.getState().emit('portfolio:changed', { portfolioId }),
  alertTriggered: (alertId: string, message: string): void =>
    useEventBus.getState().emit('alert:triggered', { alertId, message }),
  modelDriftDetected: (modelId: string, driftScore: number): void =>
    useEventBus.getState().emit('model:drift_detected', { modelId, driftScore }),
  priceUpdated: (ticker: string, price: number): void =>
    useEventBus.getState().emit('price:updated', { ticker, price }),
};
