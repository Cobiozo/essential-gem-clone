import { useMemo } from 'react';
import { parseISO, isBefore, isAfter, addMinutes, compareAsc } from 'date-fns';
import type { EventOccurrence, ExpandedOccurrence, EventOccurrenceInfo } from '@/types/occurrences';
import type { EventWithRegistration } from '@/types/events';

/**
 * Parse occurrence to get start and end datetime
 */
export const parseOccurrence = (occurrence: EventOccurrence, index: number): ExpandedOccurrence => {
  const [year, month, day] = occurrence.date.split('-').map(Number);
  const [hours, minutes] = occurrence.time.split(':').map(Number);
  
  const start_datetime = new Date(year, month - 1, day, hours, minutes);
  const end_datetime = addMinutes(start_datetime, occurrence.duration_minutes);
  const now = new Date();
  
  return {
    ...occurrence,
    index,
    start_datetime,
    end_datetime,
    is_past: isAfter(now, end_datetime),
  };
};

/**
 * Parse occurrences from DB (can be JSON string or array)
 */
const parseOccurrencesFromDb = (occurrences: unknown): EventOccurrence[] | null => {
  if (!occurrences) return null;
  
  // If already an array, return as-is
  if (Array.isArray(occurrences)) {
    return occurrences.length > 0 ? occurrences : null;
  }
  
  // Try to parse JSON string
  if (typeof occurrences === 'string') {
    try {
      const parsed = JSON.parse(occurrences);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch {
      return null;
    }
  }
  
  return null;
};

/**
 * Check if event has multiple occurrences
 */
export const isMultiOccurrenceEvent = (event: EventWithRegistration): boolean => {
  const parsed = parseOccurrencesFromDb(event.occurrences);
  return parsed !== null && parsed.length > 0;
};

/**
 * Get all occurrences for an event, sorted by date
 */
export const getAllOccurrences = (event: EventWithRegistration): ExpandedOccurrence[] => {
  const parsed = parseOccurrencesFromDb(event.occurrences);
  if (!parsed) return [];
  
  return parsed
    .map((occ, index) => parseOccurrence(occ, index))
    .sort((a, b) => compareAsc(a.start_datetime, b.start_datetime));
};

/**
 * Get only future occurrences (not yet ended)
 */
export const getFutureOccurrences = (event: EventWithRegistration): ExpandedOccurrence[] => {
  return getAllOccurrences(event).filter(occ => !occ.is_past);
};

/**
 * Get the next active occurrence (nearest future)
 */
export const getNextActiveOccurrence = (event: EventWithRegistration): ExpandedOccurrence | null => {
  const futureOccurrences = getFutureOccurrences(event);
  return futureOccurrences[0] || null;
};

/**
 * Check if user can register for a specific occurrence
 * Users can only register for the nearest future occurrence
 */
export const canRegisterForOccurrence = (
  event: EventWithRegistration, 
  occurrenceIndex: number
): boolean => {
  const nextActive = getNextActiveOccurrence(event);
  return nextActive?.index === occurrenceIndex;
};

/**
 * Get occurrence info for an event
 */
export const getEventOccurrenceInfo = (event: EventWithRegistration): EventOccurrenceInfo => {
  const isMulti = isMultiOccurrenceEvent(event);
  const futureOccurrences = getFutureOccurrences(event);
  const nextOccurrence = futureOccurrences[0] || null;
  
  return {
    is_multi_occurrence: isMulti,
    current_occurrence_index: nextOccurrence?.index ?? null,
    next_occurrence: nextOccurrence,
    all_future_occurrences: futureOccurrences,
    total_occurrences: isMulti ? (event.occurrences as unknown as EventOccurrence[]).length : 0,
  };
};

/**
 * Hook to get occurrence info for an event
 */
export const useOccurrences = (event: EventWithRegistration | null) => {
  return useMemo(() => {
    if (!event) {
      return {
        is_multi_occurrence: false,
        current_occurrence_index: null,
        next_occurrence: null,
        all_future_occurrences: [],
        total_occurrences: 0,
      };
    }
    return getEventOccurrenceInfo(event);
  }, [event]);
};

/**
 * Expand multi-occurrence events for calendar display
 * Each occurrence becomes a separate "virtual" event entry
 */
export const expandEventsForCalendar = (events: EventWithRegistration[]): EventWithRegistration[] => {
  const result: EventWithRegistration[] = [];
  
  // Get registration map from global (set by useEvents.fetchEvents)
  const registrationMap = (window as any).__eventRegistrationMap as Map<string, boolean> | undefined;
  
  events.forEach(event => {
    if (isMultiOccurrenceEvent(event)) {
      // Multi-occurrence: expand each future occurrence as separate entry
      const futureOccurrences = getFutureOccurrences(event);
      
      futureOccurrences.forEach(occ => {
        // Check if user is registered for THIS specific occurrence
        const registrationKey = `${event.id}:${occ.index}`;
        const isRegisteredForOccurrence = registrationMap?.get(registrationKey) ?? false;
        
        result.push({
          ...event,
          // Override start/end times with occurrence times
          start_time: occ.start_datetime.toISOString(),
          end_time: occ.end_datetime.toISOString(),
          duration_minutes: occ.duration_minutes,
          // Set per-occurrence registration status
          is_registered: isRegisteredForOccurrence,
          // Add occurrence tracking
          _occurrence_index: occ.index,
          _is_multi_occurrence: true,
        } as EventWithRegistration & { _occurrence_index: number; _is_multi_occurrence: boolean });
      });
    } else {
      // Single occurrence: keep as-is (registration check uses null occurrence_index)
      const registrationKey = `${event.id}:null`;
      const isRegisteredForEvent = registrationMap?.get(registrationKey) ?? event.is_registered ?? false;
      
      result.push({
        ...event,
        is_registered: isRegisteredForEvent,
      });
    }
  });
  
  return result;
};
