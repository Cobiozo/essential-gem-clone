export type ChallengeTaskType =
  | "button_click"
  | "link_visit"
  | "file_download"
  | "video_watch"
  | "resource_view"
  | "training_lesson"
  | "manual_confirm"
  | "external_action";

export type ChallengeParticipantStatus = "active" | "paused" | "completed" | "abandoned";
export type ChallengeCompletionStatus = "pending" | "verified" | "rejected";
export type ChallengeVerificationMode = "auto" | "manual_admin";

export interface ChallengeSettings {
  id: boolean;
  title: string;
  subtitle: string | null;
  terms_html: string;
  instructions_html: string;
  banner_url: string | null;
  accent_color: string;
  duration_days: number;
  excluded_weekdays: number[];
  excluded_dates: string[];
  ranking_visible_to_participants: boolean;
  szybki_start_module_id: string | null;
  is_enabled: boolean;
}

export interface ChallengeParticipant {
  id: string;
  user_id: string;
  start_date: string;
  accepted_terms_at: string;
  current_day: number;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  status: ChallengeParticipantStatus;
  completion_date: string | null;
  excluded_dates: string[];
}

export interface ChallengeTask {
  id: string;
  day_number: number;
  title: string;
  description: string;
  task_type: ChallengeTaskType;
  target_ref: Record<string, unknown>;
  points: number;
  required_to_advance: boolean;
  verification_mode: ChallengeVerificationMode;
  is_active: boolean;
  sort_order: number;
}
