import Dexie, { type Table } from 'dexie';
import type { Feeling, SliderSpec } from './data/programData';

export interface SetLog {
  id: string; // w{week}_d{dayId}_{exerciseId}_s{setIndex}
  week: number;
  dayId: number;
  exerciseId: string;
  setIndex: number;
  setLabel?: string;
  weight?: number;
  reps?: number;
  durationSec?: number;
  distanceM?: number;
  completed: boolean;
  updatedAt: number;
}

export interface ExerciseFeeling {
  id: string; // w{week}_d{dayId}_{exerciseId}
  week: number;
  dayId: number;
  exerciseId: string;
  feeling: Feeling;
  updatedAt: number;
}

export interface WarmupCheck {
  id: string; // {dateKey}_{warmupId}
  dateKey: string;
  warmupId: string;
  completed: boolean;
  updatedAt: number;
}

export interface SessionDate {
  id: string; // w{week}_d{dayId}
  week: number;
  dayId: number;
  dateKey: string; // YYYY-MM-DD
  updatedAt: number;
}

export interface SessionCompletion {
  id: string; // w{week}_d{dayId}
  week: number;
  dayId: number;
  submittedAt: number;
}

export interface AppMeta {
  key: string;
  value: string | number;
}

class AthleteLogbookDB extends Dexie {
  setLogs!: Table<SetLog, string>;
  exerciseFeelings!: Table<ExerciseFeeling, string>;
  warmupChecks!: Table<WarmupCheck, string>;
  sessionDates!: Table<SessionDate, string>;
  sessionCompletions!: Table<SessionCompletion, string>;
  appMeta!: Table<AppMeta, string>;

  constructor() {
    super('AestheticAthleteLogbookDB');
    this.version(1).stores({
      setLogs: 'id, week, [week+dayId], [week+dayId+exerciseId], exerciseId, updatedAt',
      exerciseFeelings: 'id, [week+dayId], [week+dayId+exerciseId], updatedAt',
      warmupChecks: 'id, dateKey',
      appMeta: 'key',
    });
    this.version(2).stores({
      setLogs: 'id, week, [week+dayId], [week+dayId+exerciseId], exerciseId, updatedAt',
      exerciseFeelings: 'id, [week+dayId], [week+dayId+exerciseId], updatedAt',
      warmupChecks: 'id, dateKey',
      sessionDates: 'id, dateKey, [week+dayId]',
      appMeta: 'key',
    });
    this.version(3).stores({
      setLogs: 'id, week, [week+dayId], [week+dayId+exerciseId], exerciseId, updatedAt',
      exerciseFeelings: 'id, [week+dayId], [week+dayId+exerciseId], updatedAt',
      warmupChecks: 'id, dateKey',
      sessionDates: 'id, dateKey, [week+dayId]',
      sessionCompletions: 'id, week, [week+dayId], submittedAt',
      appMeta: 'key',
    });
  }
}

export const db = new AthleteLogbookDB();

export function makeSetId(
  week: number,
  dayId: number,
  exerciseId: string,
  setIndex: number
): string {
  return `w${week}_d${dayId}_${exerciseId}_s${setIndex}`;
}

export function makeFeelingId(
  week: number,
  dayId: number,
  exerciseId: string
): string {
  return `w${week}_d${dayId}_${exerciseId}`;
}

export function makeWarmupId(dateKey: string, warmupId: string): string {
  return `${dateKey}_${warmupId}`;
}

export function makeSessionDateId(week: number, dayId: number): string {
  return `w${week}_d${dayId}`;
}

export function makeSessionCompletionId(week: number, dayId: number): string {
  return `w${week}_d${dayId}`;
}

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKeyLocal(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatReadableDate(dateKey: string): string {
  const dt = parseDateKeyLocal(dateKey);
  return dt.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatLongDate(dateKey: string): string {
  const dt = parseDateKeyLocal(dateKey);
  return dt.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatShortDayMonth(dateKey: string): string {
  const dt = parseDateKeyLocal(dateKey);
  return dt.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

export function formatSliderValue(value: number, spec?: SliderSpec): string {
  if (!spec) return String(value);
  if (value === 0 && spec.zeroLabel) {
    return spec.zeroLabel;
  }
  const prefix = value > 0 && spec.prefix ? spec.prefix : '';
  return `${prefix}${value}${spec.unit === 's' || spec.unit === 'm' ? spec.unit : ` ${spec.unit}`}`;
}

export function formatCompactSetSummary(
  log: SetLog,
  weightSpec?: SliderSpec
): string {
  const parts: string[] = [];
  if (typeof log.weight === 'number') {
    if (log.weight === 0 && weightSpec?.zeroLabel) {
      parts.push(weightSpec.zeroLabel);
    } else {
      const prefix = log.weight > 0 && weightSpec?.prefix ? weightSpec.prefix : '';
      parts.push(`${prefix}${log.weight}`);
    }
  }
  if (typeof log.reps === 'number') {
    if (parts.length > 0) {
      return `${parts[0]}×${log.reps}`;
    }
    return `${log.reps}r`;
  }
  if (typeof log.durationSec === 'number') {
    return `${log.durationSec}s`;
  }
  if (typeof log.distanceM === 'number') {
    if (parts.length > 0) {
      return `${parts[0]}×${log.distanceM}m`;
    }
    return `${log.distanceM}m`;
  }
  return parts.join('') || '✓';
}

export interface ExportPayload {
  app: 'AestheticAthleteLogbook';
  version: 1 | 2 | 3;
  exportedAt: string;
  setLogs: SetLog[];
  exerciseFeelings: ExerciseFeeling[];
  warmupChecks: WarmupCheck[];
  sessionDates?: SessionDate[];
  sessionCompletions?: SessionCompletion[];
  appMeta: AppMeta[];
}

export async function exportAllDataAsJson(): Promise<string> {
  const [
    setLogs,
    exerciseFeelings,
    warmupChecks,
    sessionDates,
    sessionCompletions,
    appMeta,
  ] = await Promise.all([
    db.setLogs.toArray(),
    db.exerciseFeelings.toArray(),
    db.warmupChecks.toArray(),
    db.sessionDates.toArray(),
    db.sessionCompletions.toArray(),
    db.appMeta.toArray(),
  ]);

  const payload: ExportPayload = {
    app: 'AestheticAthleteLogbook',
    version: 3,
    exportedAt: new Date().toISOString(),
    setLogs,
    exerciseFeelings,
    warmupChecks,
    sessionDates,
    sessionCompletions,
    appMeta,
  };

  return JSON.stringify(payload, null, 2);
}

export async function importDataFromJson(
  rawJson: string
): Promise<{ setsImported: number; feelingsImported: number }> {
  const parsed = JSON.parse(rawJson) as Partial<ExportPayload>;
  if (
    !parsed ||
    parsed.app !== 'AestheticAthleteLogbook' ||
    !Array.isArray(parsed.setLogs) ||
    !Array.isArray(parsed.exerciseFeelings)
  ) {
    throw new Error('Invalid Aesthetic Athlete JSON backup file.');
  }

  await db.transaction(
    'rw',
    [
      db.setLogs,
      db.exerciseFeelings,
      db.warmupChecks,
      db.sessionDates,
      db.sessionCompletions,
      db.appMeta,
    ],
    async () => {
      if (parsed.setLogs && parsed.setLogs.length > 0) {
        await db.setLogs.bulkPut(parsed.setLogs);
      }
      if (parsed.exerciseFeelings && parsed.exerciseFeelings.length > 0) {
        await db.exerciseFeelings.bulkPut(parsed.exerciseFeelings);
      }
      if (parsed.warmupChecks && parsed.warmupChecks.length > 0) {
        await db.warmupChecks.bulkPut(parsed.warmupChecks);
      }
      if (parsed.sessionDates && parsed.sessionDates.length > 0) {
        await db.sessionDates.bulkPut(parsed.sessionDates);
      }
      if (parsed.sessionCompletions && parsed.sessionCompletions.length > 0) {
        await db.sessionCompletions.bulkPut(parsed.sessionCompletions);
      }
      if (parsed.appMeta && parsed.appMeta.length > 0) {
        await db.appMeta.bulkPut(parsed.appMeta);
      }
    }
  );

  return {
    setsImported: parsed.setLogs.length,
    feelingsImported: parsed.exerciseFeelings.length,
  };
}
