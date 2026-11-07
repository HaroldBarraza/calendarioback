export type ConflictLevel = 'HIGH' | 'WARNING';

export interface Conflict {
  level: ConflictLevel;
  reason: string;
  activityId: string;
  activityName: string;
}