export type ItemType = 'link' | 'reel' | 'text' | 'task' | 'activity';

export type ItemStatus = 'pending' | 'done' | 'let_go';

export type MinuteOption = 1 | 5 | 15 | 30;

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  url?: string | null;
  note?: string | null;
  minutes: MinuteOption;
  status: ItemStatus;
  created_at: string; // ISO 8601 string
  done_at?: string | null;
  let_go_at?: string | null;
  resurfaced_at?: string | null;
}

export type CreateItemInput = {
  type: ItemType;
  title: string;
  url?: string | null;
  note?: string | null;
  minutes?: MinuteOption;
};

export type NudgeFrequency = 'daily' | 'weekly' | 'never';

export interface UserSettings {
  nudge_frequency: NudgeFrequency;
  nudge_time: string; // e.g., "19:00"
  quiet_hours_start: string; // e.g., "22:00"
  quiet_hours_end: string; // e.g., "08:00"
  onboarding_completed: boolean;
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
};
