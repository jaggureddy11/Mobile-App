export type ItemType = 'link' | 'reel' | 'text' | 'task' | 'activity';

export type ItemStatus = 'pending' | 'done' | 'let_go';

export type MinuteOption = 1 | 5 | 15 | 30;

export type { SnoozeOption } from './snooze';

export type RemindInterval = 'none' | 'daily' | '1_day' | '2_days' | '1_month';

export interface Collection {
  id: string;
  name: string;
  color?: string | null;
  created_at: string;
  item_count?: number;
}

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  url?: string | null;
  note?: string | null;
  minutes: MinuteOption;
  status: ItemStatus;
  created_at: string; // ISO 8601 UTC string
  done_at?: string | null;
  let_go_at?: string | null;
  resurfaced_at?: string | null;
  snoozed_until?: string | null; // ISO 8601 UTC string
  times_surfaced?: number;
  collection_id?: string | null;
  tags?: string[];
  remind_interval?: RemindInterval | null;
  remind_at?: string | null;
  image_url?: string | null;
  site_name?: string | null;
  normalized_url?: string | null;
  merged_into?: string | null;
}

export interface SurfaceEvent {
  id: string;
  item_id: string;
  shown_at: string; // ISO 8601 UTC string
  chip_minutes: number;
  action?: 'do' | 'later' | 'let_go' | 'skip' | null;
  acted_at?: string | null;
}

export type CreateItemInput = {
  type: ItemType;
  title: string;
  url?: string | null;
  note?: string | null;
  minutes?: MinuteOption;
  snoozed_until?: string | null;
  times_surfaced?: number;
  collection_id?: string | null;
  tags?: string[];
  remind_interval?: RemindInterval | null;
  remind_at?: string | null;
  image_url?: string | null;
  site_name?: string | null;
};

export type NudgeFrequency = 'daily' | 'weekly' | 'never';

export interface UserSettings {
  nudge_frequency: NudgeFrequency;
  nudge_time: string; // e.g., "19:00"
  quiet_hours_start: string; // e.g., "22:00"
  quiet_hours_end: string; // e.g., "08:00"
  onboarding_completed: boolean;
  default_chip?: MinuteOption;
  user_email?: string | null;
  cloud_sync_enabled?: boolean;
  last_synced_at?: string | null;
  sync_endpoint?: string | null;
}

export const DEFAULT_ITEM_MINUTES: Record<ItemType, MinuteOption> = {
  reel: 1,
  text: 1,
  link: 5,
  task: 15,
  activity: 30,
};

export const DEFAULT_SETTINGS: UserSettings = {
  nudge_frequency: 'daily',
  nudge_time: '19:00',
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  onboarding_completed: true,
  default_chip: 5,
  user_email: null,
  cloud_sync_enabled: true,
  last_synced_at: null,
  sync_endpoint: null,
};
