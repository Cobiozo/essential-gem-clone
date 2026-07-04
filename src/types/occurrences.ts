/**
 * Types for multi-occurrence events
 * An event can have multiple occurrences (dates/times) - all sharing the same link, title, etc.
 */

export interface EventOccurrence {
  date: string;          // "2026-01-20" (YYYY-MM-DD)
  time: string;          // "10:00" (HH:MM)
  duration_minutes: number;
  zoom_link?: string | null;  // Optional per-occurrence Zoom link; empty/null = use event's main link
  /**
   * Metadata identifying WHERE the zoom_link came from.
   * - undefined / 'main': use the event's main link (zoom_link should be null)
   * - 'custom': admin typed a custom URL for this occurrence
   * - { leader_user_id, link_id }: picked from a leader's zoom link library
   */
  zoom_link_source?: 'main' | 'custom' | { leader_user_id: string; link_id: string } | null;
}

export interface ExpandedOccurrence extends EventOccurrence {
  index: number;              // Index in the occurrences array
  start_datetime: Date;       // Calculated start datetime
  end_datetime: Date;         // Calculated end datetime
  is_past: boolean;           // Whether this occurrence has ended
}

// Utility type for event with expanded occurrence info
export interface EventOccurrenceInfo {
  is_multi_occurrence: boolean;
  current_occurrence_index: number | null;
  next_occurrence: ExpandedOccurrence | null;
  all_future_occurrences: ExpandedOccurrence[];
  total_occurrences: number;
}
