import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Info,
  RotateCcw,
  Timer,
} from 'lucide-react';
import {
  ATHLETE_PROFILE,
  WORKOUT_DAYS,
  isDeloadWeek,
  resolveExerciseForWeek,
  type Feeling,
  type ResolvedExercise,
} from '../data/programData';
import {
  db,
  formatCompactSetSummary,
  formatReadableDate,
  formatShortDayMonth,
  getTodayDateKey,
  makeFeelingId,
  makeSessionDateId,
  makeSetId,
  type ExerciseFeeling,
  type SetLog,
} from '../db';
import { SliderInput } from './SliderInput';

interface WorkoutViewProps {
  week: number;
  dayId: number;
  preferredDateKey?: string;
  onChangeWeek: (w: number) => void;
  onChangeDayId: (d: number) => void;
  onStartTimer: (label: string, seconds: number) => void;
  onOpenCalendar: () => void;
}

const FEELING_OPTIONS: {
  id: Feeling;
  label: string;
  activeClass: string;
}[] = [
  {
    id: 'easy',
    label: 'Easy',
    activeClass:
      'border-emerald-500/80 bg-emerald-500/20 text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]',
  },
  {
    id: 'medium',
    label: 'Medium',
    activeClass:
      'border-amber-500/80 bg-amber-500/20 text-amber-300 shadow-[0_0_0_1px_rgba(245,158,11,0.25)]',
  },
  {
    id: 'hard',
    label: 'Hard',
    activeClass:
      'border-rose-500/80 bg-rose-500/20 text-rose-300 shadow-[0_0_0_1px_rgba(244,63,94,0.25)]',
  },
];

function snapToStep(value: number, step: number, min: number, max: number): number {
  const snapped = Math.round(value / step) * step;
  const decimals = step.toString().includes('.')
    ? step.toString().split('.')[1].length
    : 0;
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(snapped * factor) / factor;
  return Math.min(max, Math.max(min, rounded));
}

interface ExerciseCardProps {
  week: number;
  dayId: number;
  resolved: ResolvedExercise;
  currentLogs: SetLog[];
  prevLogs: SetLog[];
  currentFeeling?: Feeling;
  prevFeeling?: Feeling;
  autoStartRest: boolean;
  onStartTimer: (label: string, seconds: number) => void;
  onEnsureSessionDate: () => Promise<void>;
}

function ExerciseCard({
  week,
  dayId,
  resolved,
  currentLogs,
  prevLogs,
  currentFeeling,
  prevFeeling,
  autoStartRest,
  onStartTimer,
  onEnsureSessionDate,
}: ExerciseCardProps) {
  const [showCue, setShowCue] = useState(false);

  const logsByIndex = useMemo(() => {
    const map = new Map<number, SetLog>();
    currentLogs.forEach((l) => map.set(l.setIndex, l));
    return map;
  }, [currentLogs]);

  const completedCount = useMemo(
    () =>
      resolved.setLabels.filter((_, idx) => logsByIndex.get(idx)?.completed).length,
    [resolved.setLabels, logsByIndex]
  );
  const allCompleted = completedCount === resolved.setsCount;

  // Find first uncompleted set index; null if all completed
  const firstPendingIndex = useMemo(() => {
    for (let i = 0; i < resolved.setsCount; i++) {
      if (!logsByIndex.get(i)?.completed) return i;
    }
    return null;
  }, [resolved.setsCount, logsByIndex]);

  const [activeSetIndex, setActiveSetIndex] = useState<number | null>(null);

  // Reset active set selection when week or day changes
  useEffect(() => {
    setActiveSetIndex(null);
  }, [week, dayId]);

  // Compute initial draft values for the currently active set
  const computeDefaultsForSet = (setIdx: number) => {
    const existing = logsByIndex.get(setIdx);
    if (existing) {
      return {
        weight: existing.weight ?? resolved.weightSpec?.defaultVal ?? 0,
        reps: existing.reps ?? resolved.repsSpec?.defaultVal ?? 0,
        durationSec: existing.durationSec ?? resolved.durationSpec?.defaultVal ?? 0,
        distanceM: existing.distanceM ?? resolved.distanceSpec?.defaultVal ?? 0,
      };
    }

    // Check earlier completed set in current session
    for (let j = setIdx - 1; j >= 0; j--) {
      const prevInSession = logsByIndex.get(j);
      if (prevInSession && prevInSession.completed) {
        return {
          weight: prevInSession.weight ?? resolved.weightSpec?.defaultVal ?? 0,
          reps: prevInSession.reps ?? resolved.repsSpec?.defaultVal ?? 0,
          durationSec:
            prevInSession.durationSec ?? resolved.durationSpec?.defaultVal ?? 0,
          distanceM:
            prevInSession.distanceM ?? resolved.distanceSpec?.defaultVal ?? 0,
        };
      }
    }

    // Check previous week's set (exact index, or fallback to set 0)
    const prevWeekSet =
      prevLogs.find((l) => l.setIndex === setIdx && l.completed) ??
      prevLogs.find((l) => l.completed);

    if (prevWeekSet) {
      let weightVal = prevWeekSet.weight ?? resolved.weightSpec?.defaultVal ?? 0;
      if (resolved.isDeload && resolved.weightSpec && weightVal > 0) {
        // PDF Deload rule: reduce weights by 15%
        weightVal = snapToStep(
          weightVal * 0.85,
          resolved.weightSpec.step,
          resolved.weightSpec.min,
          resolved.weightSpec.max
        );
      } else if (resolved.weightSpec) {
        weightVal = snapToStep(
          weightVal,
          resolved.weightSpec.step,
          resolved.weightSpec.min,
          resolved.weightSpec.max
        );
      }

      return {
        weight: weightVal,
        reps: resolved.repsSpec
          ? snapToStep(
              prevWeekSet.reps ?? resolved.repsSpec.defaultVal,
              resolved.repsSpec.step,
              resolved.repsSpec.min,
              resolved.repsSpec.max
            )
          : 0,
        durationSec: resolved.durationSpec
          ? snapToStep(
              prevWeekSet.durationSec ?? resolved.durationSpec.defaultVal,
              resolved.durationSpec.step,
              resolved.durationSpec.min,
              resolved.durationSpec.max
            )
          : 0,
        distanceM: resolved.distanceSpec
          ? snapToStep(
              prevWeekSet.distanceM ?? resolved.distanceSpec.defaultVal,
              resolved.distanceSpec.step,
              resolved.distanceSpec.min,
              resolved.distanceSpec.max
            )
          : 0,
      };
    }

    return {
      weight: resolved.weightSpec?.defaultVal ?? 0,
      reps: resolved.repsSpec?.defaultVal ?? 0,
      durationSec: resolved.durationSpec?.defaultVal ?? 0,
      distanceM: resolved.distanceSpec?.defaultVal ?? 0,
    };
  };

  const [draft, setDraft] = useState(() => computeDefaultsForSet(0));

  const openSet = (idx: number) => {
    if (activeSetIndex === idx) {
      setActiveSetIndex(null);
      return;
    }
    setActiveSetIndex(idx);
    setDraft(computeDefaultsForSet(idx));
  };

  const handleLogSet = async () => {
    if (activeSetIndex === null) return;
    const setLabel = resolved.setLabels[activeSetIndex];

    const record: SetLog = {
      id: makeSetId(week, dayId, resolved.def.id, activeSetIndex),
      week,
      dayId,
      exerciseId: resolved.def.id,
      setIndex: activeSetIndex,
      setLabel,
      completed: true,
      updatedAt: Date.now(),
      ...(resolved.weightSpec ? { weight: draft.weight } : {}),
      ...(resolved.repsSpec ? { reps: draft.reps } : {}),
      ...(resolved.durationSpec ? { durationSec: draft.durationSec } : {}),
      ...(resolved.distanceSpec ? { distanceM: draft.distanceM } : {}),
    };

    await db.setLogs.put(record);
    await onEnsureSessionDate();

    if (autoStartRest && resolved.def.restSeconds > 0) {
      onStartTimer(`${resolved.name} Rest`, resolved.def.restSeconds);
    }

    // Advance to next pending set automatically, or close if all done
    let nextIdx: number | null = null;
    for (let i = activeSetIndex + 1; i < resolved.setsCount; i++) {
      if (!logsByIndex.get(i)?.completed) {
        nextIdx = i;
        break;
      }
    }
    if (nextIdx === null) {
      for (let i = 0; i < activeSetIndex; i++) {
        if (!logsByIndex.get(i)?.completed) {
          nextIdx = i;
          break;
        }
      }
    }

    if (nextIdx !== null) {
      setActiveSetIndex(nextIdx);
      setDraft({
        weight: draft.weight,
        reps: draft.reps,
        durationSec: draft.durationSec,
        distanceM: draft.distanceM,
      });
    } else {
      setActiveSetIndex(null);
    }
  };

  const handleClearSet = async (setIdx: number) => {
    await db.setLogs.delete(makeSetId(week, dayId, resolved.def.id, setIdx));
    setActiveSetIndex(setIdx);
  };

  const handleSelectFeeling = async (feeling: Feeling) => {
    const id = makeFeelingId(week, dayId, resolved.def.id);
    if (currentFeeling === feeling) {
      await db.exerciseFeelings.delete(id);
    } else {
      const entry: ExerciseFeeling = {
        id,
        week,
        dayId,
        exerciseId: resolved.def.id,
        feeling,
        updatedAt: Date.now(),
      };
      await db.exerciseFeelings.put(entry);
    }
  };

  // Previous week summary string
  const prevSummary = useMemo(() => {
    const completed = prevLogs.filter((l) => l.completed);
    if (completed.length === 0) return null;
    const best = completed[0];
    return formatCompactSetSummary(best, resolved.weightSpec);
  }, [prevLogs, resolved.weightSpec]);

  const targetRange = resolved.def.targetRepRange;
  const hitTopReps =
    targetRange && resolved.repsSpec && draft.reps >= targetRange[1];

  return (
    <div
      className={`rounded-2xl border p-3.5 transition-colors ${
        allCompleted
          ? 'border-emerald-500/35 bg-zinc-900/70'
          : 'border-zinc-800 bg-zinc-900/90'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-bold text-amber-400">
              {resolved.def.orderLabel}
            </span>
            {resolved.def.supersetTag && (
              <span className="rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                {resolved.def.supersetTag}
              </span>
            )}
            <span className="text-xs font-medium text-zinc-400">
              {resolved.targetText}
            </span>
            {resolved.isDeload && (
              <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                DELOAD -1 set
              </span>
            )}
          </div>

          <h3 className="mt-1 text-base font-bold leading-snug text-zinc-100">
            {resolved.name}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-400">{resolved.def.summary}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={`rounded-lg px-2 py-1 text-xs font-bold tabular-nums ${
              allCompleted
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            {completedCount}/{resolved.setsCount}
          </span>
          <button
            type="button"
            onClick={() => setShowCue((s) => !s)}
            aria-label="Toggle biomechanical form cue"
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
              showCue
                ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                : 'border-zinc-800 bg-zinc-950/60 text-zinc-400'
            }`}
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Previous week comparison */}
      {week > 1 && prevSummary && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/75 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
          <span className="text-zinc-400">W{week - 1}:</span>
          <span className="font-bold tabular-nums">{prevSummary}</span>
          {prevFeeling && (
            <span
              className={`capitalize font-semibold ${
                prevFeeling === 'easy'
                  ? 'text-emerald-300'
                  : prevFeeling === 'medium'
                  ? 'text-amber-300'
                  : 'text-rose-300'
              }`}
            >
              • {prevFeeling}
            </span>
          )}
        </div>
      )}

      {/* Expandable PDF Form Cue */}
      {showCue && (
        <div className="animate-panel mt-2.5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-2.5 py-2 text-xs leading-relaxed text-zinc-200">
          {resolved.cue}
        </div>
      )}

      {/* Set Chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {resolved.setLabels.map((label, idx) => {
          const log = logsByIndex.get(idx);
          const isDone = Boolean(log?.completed);
          const isActive = activeSetIndex === idx;
          const summary = log ? formatCompactSetSummary(log, resolved.weightSpec) : '';

          return (
            <button
              key={label}
              type="button"
              onClick={() => openSet(idx)}
              className={`flex min-h-[34px] items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'border-amber-400 bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/50'
                  : isDone
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                  : 'border-zinc-800 bg-zinc-950/70 text-zinc-300'
              }`}
            >
              {isDone && <Check className="h-3.5 w-3.5 text-emerald-400" />}
              <span>{label}</span>
              {isDone && summary && (
                <span className="font-bold tabular-nums text-emerald-300">
                  • {summary}
                </span>
              )}
              {!isDone && firstPendingIndex === idx && !isActive && (
                <ChevronDown className="h-3 w-3 text-amber-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Inline Slider Logger for active set */}
      {activeSetIndex !== null && (
        <div className="animate-panel mt-3 space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/90 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Logging {resolved.setLabels[activeSetIndex]}
            </span>
            <div className="flex items-center gap-2">
              {logsByIndex.get(activeSetIndex)?.completed && (
                <button
                  type="button"
                  onClick={() => handleClearSet(activeSetIndex)}
                  className="flex items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-400 active:bg-zinc-800"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveSetIndex(null)}
                aria-label="Collapse set logger"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
          </div>

          {resolved.weightSpec && (
            <SliderInput
              label="Weight"
              subLabel={resolved.isDeload ? '(Deload -15%)' : undefined}
              value={draft.weight}
              spec={resolved.weightSpec}
              onChange={(weight) => setDraft((d) => ({ ...d, weight }))}
            />
          )}

          {resolved.repsSpec && (
            <SliderInput
              label="Reps"
              subLabel={
                targetRange
                  ? `Target ${
                      targetRange[0] === targetRange[1]
                        ? targetRange[0]
                        : `${targetRange[0]}–${targetRange[1]}`
                    }${resolved.def.targetRepsNote ? ` ${resolved.def.targetRepsNote}` : ''}`
                  : resolved.def.targetRepsNote
              }
              value={draft.reps}
              spec={resolved.repsSpec}
              highlightGood={Boolean(hitTopReps)}
              onChange={(reps) => setDraft((d) => ({ ...d, reps }))}
            />
          )}

          {resolved.durationSpec && (
            <SliderInput
              label="Duration"
              value={draft.durationSec}
              spec={resolved.durationSpec}
              onChange={(durationSec) => setDraft((d) => ({ ...d, durationSec }))}
            />
          )}

          {resolved.distanceSpec && (
            <SliderInput
              label="Distance"
              value={draft.distanceM}
              spec={resolved.distanceSpec}
              onChange={(distanceM) => setDraft((d) => ({ ...d, distanceM }))}
            />
          )}

          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleLogSet}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 text-sm font-bold text-zinc-950 shadow-lg active:scale-[0.99] active:bg-amber-400"
            >
              <Check className="h-4 w-4 stroke-[2.5]" />
              {logsByIndex.get(activeSetIndex)?.completed
                ? `Update ${resolved.setLabels[activeSetIndex]}`
                : `Log ${resolved.setLabels[activeSetIndex]}`}
            </button>
            {resolved.def.restSeconds > 0 && (
              <button
                type="button"
                onClick={() =>
                  onStartTimer(`${resolved.name} Rest`, resolved.def.restSeconds)
                }
                aria-label="Start rest timer"
                className="flex h-11 items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-xs font-semibold text-zinc-200 active:bg-zinc-800"
              >
                <Timer className="h-4 w-4 text-amber-400" />
                {resolved.def.restSeconds}s
              </button>
            )}
          </div>
        </div>
      )}

      {/* Effort / Feeling Selector: Easy | Medium | Hard */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-800/70 pt-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Feeling
        </span>
        <div className="inline-flex rounded-xl border border-zinc-800/90 bg-zinc-950/80 p-0.5">
          {FEELING_OPTIONS.map((opt) => {
            const active = currentFeeling === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectFeeling(opt.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                  active
                    ? opt.activeClass
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function WorkoutView({
  week,
  dayId,
  preferredDateKey,
  onChangeWeek,
  onChangeDayId,
  onStartTimer,
  onOpenCalendar,
}: WorkoutViewProps) {
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [autoStartRest, setAutoStartRest] = useState(true);
  const todayKey = getTodayDateKey();
  const [draftDateKey, setDraftDateKey] = useState<string>(
    preferredDateKey || todayKey
  );

  useEffect(() => {
    setDraftDateKey(preferredDateKey || getTodayDateKey());
  }, [preferredDateKey, week, dayId]);

  const dayDef = useMemo(
    () => WORKOUT_DAYS.find((d) => d.id === dayId) ?? WORKOUT_DAYS[0],
    [dayId]
  );

  const sessionDateId = makeSessionDateId(week, dayId);
  const sessionDateRecord = useLiveQuery(
    () => db.sessionDates.get(sessionDateId),
    [sessionDateId]
  );
  const weekSessionDates =
    useLiveQuery(
      () => db.sessionDates.filter((s) => s.week === week).toArray(),
      [week]
    ) ?? [];

  const effectiveDateKey = sessionDateRecord?.dateKey ?? draftDateKey;

  const handleSetSessionDate = async (nextDateKey: string) => {
    if (!nextDateKey) return;
    setDraftDateKey(nextDateKey);
    await db.sessionDates.put({
      id: sessionDateId,
      week,
      dayId,
      dateKey: nextDateKey,
      updatedAt: Date.now(),
    });
  };

  const ensureSessionDate = async () => {
    if (!sessionDateRecord) {
      await db.sessionDates.put({
        id: sessionDateId,
        week,
        dayId,
        dateKey: effectiveDateKey,
        updatedAt: Date.now(),
      });
    }
  };

  // Live queries from Dexie
  const weekLogs =
    useLiveQuery(
      () => db.setLogs.where('[week+dayId]').equals([week, dayId]).toArray(),
      [week, dayId]
    ) ?? [];

  const prevWeekLogs =
    useLiveQuery(
      () =>
        week > 1
          ? db.setLogs.where('[week+dayId]').equals([week - 1, dayId]).toArray()
          : Promise.resolve([] as SetLog[]),
      [week, dayId]
    ) ?? [];

  const weekFeelings =
    useLiveQuery(
      () =>
        db.exerciseFeelings
          .where('[week+dayId]')
          .equals([week, dayId])
          .toArray(),
      [week, dayId]
    ) ?? [];

  const prevWeekFeelings =
    useLiveQuery(
      () =>
        week > 1
          ? db.exerciseFeelings
              .where('[week+dayId]')
              .equals([week - 1, dayId])
              .toArray()
          : Promise.resolve([] as ExerciseFeeling[]),
      [week, dayId]
    ) ?? [];

  const allWeekLogsForProgress =
    useLiveQuery(
      () => db.setLogs.where('week').equals(week).toArray(),
      [week]
    ) ?? [];

  const resolvedExercises = useMemo(
    () => dayDef.exercises.map((ex) => resolveExerciseForWeek(ex, week)),
    [dayDef, week]
  );

  const totalSetsInDay = useMemo(
    () => resolvedExercises.reduce((acc, r) => acc + r.setsCount, 0),
    [resolvedExercises]
  );

  const completedSetsInDay = useMemo(
    () => weekLogs.filter((l) => l.completed).length,
    [weekLogs]
  );

  const deload = isDeloadWeek(week);

  return (
    <div className="space-y-3.5 pb-4">
      {/* Week & Auto-Rest Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onChangeWeek(Math.max(1, week - 1))}
            disabled={week <= 1}
            aria-label="Previous week"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-200 active:bg-zinc-800 disabled:opacity-35"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowWeekPicker((v) => !v)}
            className="flex flex-1 flex-col items-center justify-center rounded-xl py-1 active:bg-zinc-800/50"
          >
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-zinc-100">
                Week {week} <span className="text-zinc-500">/ 16</span>
              </span>
              {deload && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                  Deload
                </span>
              )}
              <ChevronDown
                className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${
                  showWeekPicker ? 'rotate-180' : ''
                }`}
              />
            </div>
            <span className="text-[11px] font-medium text-zinc-400">
              {week <= 8 ? 'Block 1 (Weeks 1–8)' : 'Block 2 (Weeks 9–16)'} •{' '}
              {ATHLETE_PROFILE.targetRir}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onChangeWeek(Math.min(16, week + 1))}
            disabled={week >= 16}
            aria-label="Next week"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-200 active:bg-zinc-800 disabled:opacity-35"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Inline 16-week grid picker */}
        {showWeekPicker && (
          <div className="animate-panel mt-3 grid grid-cols-8 gap-1.5 border-t border-zinc-800 pt-3">
            {Array.from({ length: 16 }, (_, i) => i + 1).map((w) => {
              const isSelected = w === week;
              const isDl = isDeloadWeek(w);
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    onChangeWeek(w);
                    setShowWeekPicker(false);
                  }}
                  className={`rounded-lg border py-1.5 text-xs font-bold tabular-nums transition-colors ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500 text-zinc-950'
                      : isDl
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-300'
                  }`}
                >
                  W{w}
                </button>
              );
            })}
          </div>
        )}

        {/* Day Selector Pills */}
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {WORKOUT_DAYS.map((d) => {
            const active = d.id === dayId;
            const dayTotal = d.exercises.reduce(
              (acc, ex) => acc + resolveExerciseForWeek(ex, week).setsCount,
              0
            );
            const dayDone = allWeekLogsForProgress.filter(
              (l) => l.dayId === d.id && l.completed
            ).length;
            const dayFinished = dayDone >= dayTotal && dayTotal > 0;
            const matchedDate = weekSessionDates.find(
              (s) => s.dayId === d.id
            )?.dateKey;
            const splitName = d.shortTitle.split('•')[1]?.trim() ?? '';

            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onChangeDayId(d.id)}
                className={`flex flex-col items-center rounded-xl border px-1.5 py-2 text-center transition-all active:scale-95 ${
                  active
                    ? 'border-amber-500/70 bg-amber-500/15 text-amber-200'
                    : dayFinished
                    ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                    : 'border-zinc-800 bg-zinc-950/70 text-zinc-400'
                }`}
              >
                <span className="text-[11px] font-bold uppercase tracking-wide">
                  {d.dayName}
                </span>
                <span className="mt-0.5 text-[10px] font-medium leading-tight opacity-85">
                  {splitName}
                </span>
                <span className="mt-1 text-[10px] font-bold tabular-nums opacity-80">
                  {matchedDate
                    ? formatShortDayMonth(matchedDate)
                    : `${dayDone}/${dayTotal}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Matched Gym Date Selector Bar */}
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/75 px-2.5 py-1.5">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {sessionDateRecord ? 'Gym Date' : 'Gym Date (Auto)'}
            </div>
            <div className="truncate text-xs font-bold text-zinc-200">
              {formatReadableDate(effectiveDateKey)}
              {effectiveDateKey === todayKey ? ' • Today' : ''}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <input
              type="date"
              value={effectiveDateKey}
              onChange={(e) => handleSetSessionDate(e.target.value)}
              aria-label="Choose gym date"
              className="rounded-lg border border-zinc-700/80 bg-zinc-900 px-2 py-1 text-[11px] font-semibold text-amber-300"
            />
            <button
              type="button"
              onClick={onOpenCalendar}
              aria-label="Open Calendar"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900 text-zinc-300 transition-transform active:scale-95 active:bg-zinc-800"
            >
              <CalendarDays className="h-3.5 w-3.5 text-amber-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Day Header & Session Status */}
      <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 px-3.5 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-zinc-100">
              {dayDef.shortTitle} — {dayDef.title}
            </h2>
            <p className="mt-0.5 text-[11px] font-medium text-zinc-400">
              {dayDef.focus}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAutoStartRest((v) => !v)}
            className={`flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ${
              autoStartRest
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                : 'border-zinc-800 bg-zinc-950 text-zinc-500'
            }`}
          >
            <Timer className="h-3 w-3" />
            Rest {autoStartRest ? 'Auto' : 'Off'}
          </button>
        </div>

        <div className="mt-2 flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300"
              style={{
                width: `${
                  totalSetsInDay > 0
                    ? Math.round((completedSetsInDay / totalSetsInDay) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
          <span className="shrink-0 text-[11px] font-bold tabular-nums text-zinc-300">
            {completedSetsInDay}/{totalSetsInDay} sets
          </span>
        </div>
      </div>

      {/* Deload Banner */}
      {deload && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            <strong className="text-amber-300">W{week} Deload:</strong> -15% weight, -1 set.
          </span>
        </div>
      )}

      {/* Day-Specific Rule Banner */}
      {dayDef.ruleTitle && dayDef.ruleText && (
        <div className="rounded-2xl border border-orange-500/30 bg-orange-950/25 px-3 py-2 text-xs leading-relaxed text-orange-100/90">
          <span className="font-extrabold uppercase tracking-wide text-orange-400">
            {dayDef.ruleTitle}:{' '}
          </span>
          {dayDef.ruleText}
        </div>
      )}

      {/* Exercise Cards */}
      <div className="space-y-3">
        {resolvedExercises.map((resolved) => {
          const currentLogs = weekLogs.filter(
            (l) => l.exerciseId === resolved.def.id
          );
          const prevLogs = prevWeekLogs.filter(
            (l) => l.exerciseId === resolved.def.id
          );
          const currentFeeling = weekFeelings.find(
            (f) => f.exerciseId === resolved.def.id
          )?.feeling;
          const prevFeeling = prevWeekFeelings.find(
            (f) => f.exerciseId === resolved.def.id
          )?.feeling;

          return (
            <ExerciseCard
              key={`${week}-${dayId}-${resolved.def.id}`}
              week={week}
              dayId={dayId}
              resolved={resolved}
              currentLogs={currentLogs}
              prevLogs={prevLogs}
              currentFeeling={currentFeeling}
              prevFeeling={prevFeeling}
              autoStartRest={autoStartRest}
              onStartTimer={onStartTimer}
              onEnsureSessionDate={ensureSessionDate}
            />
          );
        })}
      </div>
    </div>
  );
}

