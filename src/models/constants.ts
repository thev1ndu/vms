export const TASK_CATEGORIES = [
  'logistics',
  'ushering',
  'media',
  'registration',
  'hospitality',
  'cleanup',
] as const;
export type TaskCategoryTag = (typeof TASK_CATEGORIES)[number];

export type TaskMode = 'on-site' | 'off-site'; // task joining mode
export type TaskStatus = 'draft' | 'open' | 'closed'; // admin lifecycle

export const LEVEL_MAX = 10;
