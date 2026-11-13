import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Info,
  Pencil,
  Play,
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
  makeSessionCompletionId,
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
      'border-[#39ff14] bg-[#39ff14]/20 text-[#39ff14] box-glow-green',
  },
  {
    id: 'medium',
    label: 'Medium',
    activeClass:
      'border-[#ffe600] bg-[#ffe600]/20 text-[#ffe600] box-glow-yellow',
  },
  {
    id: 'hard',
    label: 'Hard',
    activeClass:
      'border-[#ff2d95] bg-[#ff2d95]/20 text-[#ff2d95] box-glow-pink',
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
  isSubmittedLocked: boolean;
  onRequestEdit: () => void;
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
  isSubmittedLocked,
  onRequestEdit,
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
    if (isSubmittedLocked) {
      onRequestEdit();
    }
    if (activeSetIndex === idx) {
      setActiveSetIndex(null);
      return;
    }
    setActiveSetIndex(idx);
    setDraft(computeDefaultsForSet(idx));
  };

  const handleStartExercise = () => {
    if (isSubmittedLocked) {
      onRequestEdit();
    }
    const targetIdx = firstPendingIndex ?? 0;
    setActiveSetIndex(targetIdx);
    setDraft(computeDefaultsForSet(targetIdx));
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
    if (isSubmittedLocked) {
      onRequestEdit();
    }
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
      className={`pixel-card p-3.5 transition-colors ${
        allCompleted ? 'pixel-card-done' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="pixel-label border border-[#ffe600]/40 bg-[#ffe600]/10 px-1.5 py-0.5 text-[#ffe600]">
              {resolved.def.orderLabel}
            </span>
            {resolved.def.supersetTag && (
              <span className="pixel-label border border-[#8b5cf6]/40 bg-[#8b5cf6]/10 px-1.5 py-0.5 text-[#8b5cf6]">
                {resolved.def.supersetTag}
              </span>
            )}
            <span className="font-[VT323] text-sm text-[#5a6a78]">
              {resolved.targetText}
            </span>
            {resolved.isDeload && (
              <span className="pixel-label border border-[#ffe600] bg-[#ffe600]/20 px-1.5 py-0.5 text-[#ffe600]">
                DELOAD -1 set
              </span>
            )}
          </div>

          <h3 className="mt-1 font-[VT323] text-xl font-bold leading-snug text-[#c0f0ff]">
            {resolved.name}
          </h3>
          <p className="font-[VT323] text-sm text-[#5a6a78]">{resolved.def.summary}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={`border-2 px-2 py-0.5 font-[VT323] text-sm font-bold tabular-nums ${
              allCompleted
                ? 'border-[#39ff14] bg-[#39ff14]/15 text-[#39ff14] box-glow-green'
                : 'border-[#2a2a40] bg-[#111118] text-[#c0f0ff]'
            }`}
            style={{ boxShadow: '2px 2px 0 0 rgba(0,0,0,0.6)' }}
          >
            {completedCount}/{resolved.setsCount}
          </span>
          <button
            type="button"
            onClick={() => setShowCue((s) => !s)}
            aria-label="Toggle biomechanical form cue"
            className={`flex h-8 w-8 items-center justify-center border-2 transition-colors ${
              showCue
                ? 'border-[#00f0ff] bg-[#00f0ff]/15 text-[#00f0ff] box-glow-cyan'
                : 'border-[#2a2a40] bg-[#111118] text-[#5a6a78]'
            }`}
            style={{ boxShadow: '2px 2px 0 0 rgba(0,0,0,0.6)' }}
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Previous week comparison */}
      {week > 1 && prevSummary && (
        <div className="mt-2 inline-flex items-center gap-1.5 border border-[#2a2a40] bg-[#111118] px-2 py-0.5 font-[VT323] text-xs text-[#c0f0ff]">
          <span className="text-[#5a6a78]">W{week - 1}:</span>
          <span className="font-bold text-[#00f0ff] tabular-nums">{prevSummary}</span>
          {prevFeeling && (
            <span
              className={`capitalize font-semibold ${
                prevFeeling === 'easy'
                  ? 'text-[#39ff14]'
                  : prevFeeling === 'medium'
                  ? 'text-[#ffe600]'
                  : 'text-[#ff2d95]'
              }`}
            >
              • {prevFeeling}
            </span>
          )}
        </div>
      )}

      {/* Expandable PDF Form Cue */}
      {showCue && (
        <div className="animate-panel mt-2.5 border-2 border-[#ffe600]/40 bg-[#ffe600]/5 p-2 font-[VT323] text-sm leading-relaxed text-[#c0f0ff]">
          {resolved.cue}
        </div>
      )}

      {/* Set Category Header + Start / Edit Action + Chips */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="pixel-label text-[#5a6a78]">
            Sets
          </span>

          {!isSubmittedLocked && activeSetIndex === null && (
            firstPendingIndex !== null ? (
              <button
                type="button"
                onClick={handleStartExercise}
                className="pixel-btn-solid flex items-center gap-1 px-2.5 py-1"
              >
                <Play className="h-3 w-3 fill-current" />
                {completedCount === 0
                  ? 'Start'
                  : `Start ${resolved.setLabels[firstPendingIndex]}`}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartExercise}
                className="pixel-btn flex items-center gap-1 px-2.5 py-1 text-[#c0f0ff]"
              >
                <Pencil className="h-3 w-3" />
                Edit Sets
              </button>
            )
          )}

          {isSubmittedLocked && (
            <button
              type="button"
              onClick={handleStartExercise}
              className="pixel-btn flex items-center gap-1 px-2.5 py-1 text-[#c0f0ff]"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {resolved.setLabels.map((label, idx) => {
            const log = logsByIndex.get(idx);
            const isDone = Boolean(log?.completed);
            const isActive = activeSetIndex === idx && !isSubmittedLocked;
            const summary = log ? formatCompactSetSummary(log, resolved.weightSpec) : '';

            return (
              <button
                key={label}
                type="button"
                onClick={() => openSet(idx)}
                className={`flex min-h-[34px] items-center gap-1 border-2 px-2.5 py-1 font-[VT323] text-sm font-semibold transition-all duration-100 active:scale-95 ${
                  isActive
                    ? 'border-[#00f0ff] bg-[#00f0ff]/20 text-[#00f0ff] box-glow-cyan'
                    : isDone
                    ? 'border-[#39ff14]/60 bg-[#39ff14]/15 text-[#39ff14]'
                    : 'border-[#2a2a40] bg-[#111118] text-[#c0f0ff]'
                }`}
                style={{ boxShadow: '2px 2px 0 0 rgba(0,0,0,0.6)' }}
              >
                {isDone && <Check className="h-3.5 w-3.5 text-[#39ff14]" />}
                <span>{label}</span>
                {isDone && summary && (
                  <span className="font-bold tabular-nums text-[#39ff14]">
                    • {summary}
                  </span>
                )}
                {!isDone && firstPendingIndex === idx && !isActive && (
                  <ChevronDown className="h-3 w-3 text-[#ffe600]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inline Slider Logger for active set */}
      {!isSubmittedLocked && activeSetIndex !== null && (
        <div className="animate-panel mt-3 space-y-3 border-2 border-[#00f0ff]/50 bg-[#0e0e16] p-3 box-glow-cyan">
          <div className="flex items-center justify-between">
            <span className="pixel-label text-[#00f0ff] glow-cyan">
              Logging {resolved.setLabels[activeSetIndex]}
            </span>
            <div className="flex items-center gap-2">
              {logsByIndex.get(activeSetIndex)?.completed && (
                <button
                  type="button"
                  onClick={() => handleClearSet(activeSetIndex)}
                  className="pixel-btn flex items-center gap-1 border-[#2a2a40] px-2 py-1 text-[8px] text-[#5a6a78]"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveSetIndex(null)}
                aria-label="Collapse set logger"
                className="flex h-7 w-7 items-center justify-center border border-[#2a2a40] bg-[#111118] text-[#5a6a78] hover:text-[#00f0ff]"
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
              className="pixel-btn-solid flex h-11 flex-1 items-center justify-center gap-2 text-xs"
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
                className="pixel-btn flex h-11 items-center gap-1.5 px-3 text-[9px]"
              >
                <Timer className="h-4 w-4 text-[#00f0ff]" />
                {resolved.def.restSeconds}s
              </button>
            )}
          </div>
        </div>
      )}

      {/* Effort / Feeling Selector: Easy | Medium | Hard */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t-2 border-[#2a2a40] pt-2.5">
        <span className="pixel-label text-[#5a6a78]">
          Feeling
        </span>
        <div className="inline-flex border-2 border-[#2a2a40] bg-[#0a0a0f] p-0.5">
          {FEELING_OPTIONS.map((opt) => {
            const active = currentFeeling === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectFeeling(opt.id)}
                className={`border px-2.5 py-1 font-[VT323] text-sm font-semibold transition-all duration-100 active:scale-95 ${
                  active
                    ? opt.activeClass
                    : 'border-transparent text-[#5a6a78] hover:text-[#c0f0ff]'
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
  const [isEditingSubmitted, setIsEditingSubmitted] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const todayKey = getTodayDateKey();
  const [draftDateKey, setDraftDateKey] = useState<string>(
    preferredDateKey || todayKey
  );

  useEffect(() => {
    setDraftDateKey(preferredDateKey || getTodayDateKey());
    setIsEditingSubmitted(false);
    setShowIncompleteModal(false);
  }, [preferredDateKey, week, dayId]);

  const dayDef = useMemo(
    () => WORKOUT_DAYS.find((d) => d.id === dayId) ?? WORKOUT_DAYS[0],
    [dayId]
  );

  const sessionDateId = makeSessionDateId(week, dayId);
  const sessionCompletionId = makeSessionCompletionId(week, dayId);
  const sessionDateRecord = useLiveQuery(
    () => db.sessionDates.get(sessionDateId),
    [sessionDateId]
  );
  const completionRecord = useLiveQuery(
    () => db.sessionCompletions.get(sessionCompletionId),
    [sessionCompletionId]
  );
  const weekSessionDates =
    useLiveQuery(
      () => db.sessionDates.filter((s) => s.week === week).toArray(),
      [week]
    ) ?? [];
  const weekCompletions =
    useLiveQuery(
      () => db.sessionCompletions.where('week').equals(week).toArray(),
      [week]
    ) ?? [];

  const isSubmittedLocked = Boolean(completionRecord) && !isEditingSubmitted;

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
      <div className="pixel-card p-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onChangeWeek(Math.max(1, week - 1))}
            disabled={week <= 1}
            aria-label="Previous week"
            className="flex h-9 w-9 items-center justify-center border-2 border-[#2a2a40] bg-[#111118] text-[#c0f0ff] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-35"
            style={{ boxShadow: '2px 2px 0 0 rgba(0,0,0,0.7)' }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowWeekPicker((v) => !v)}
            className="flex flex-1 flex-col items-center justify-center py-1 active:bg-[#1a1a28]"
          >
            <div className="flex items-center gap-2">
              <span className="pixel-heading text-xs text-[#c0f0ff]">
                Week {week} <span className="text-[#5a6a78]">/ 16</span>
              </span>
              {deload && (
                <span className="pixel-label border border-[#ffe600] bg-[#ffe600]/20 px-1.5 py-0.5 text-[#ffe600]">
                  Deload
                </span>
              )}
              <ChevronDown
                className={`h-3.5 w-3.5 text-[#5a6a78] transition-transform ${
                  showWeekPicker ? 'rotate-180' : ''
                }`}
              />
            </div>
            <span className="font-[VT323] text-sm text-[#5a6a78]">
              {week <= 8 ? 'Block 1 (W1–8)' : 'Block 2 (W9–16)'} •{' '}
              {ATHLETE_PROFILE.targetRir}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onChangeWeek(Math.min(16, week + 1))}
            disabled={week >= 16}
            aria-label="Next week"
            className="flex h-9 w-9 items-center justify-center border-2 border-[#2a2a40] bg-[#111118] text-[#c0f0ff] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-35"
            style={{ boxShadow: '2px 2px 0 0 rgba(0,0,0,0.7)' }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Inline 16-week grid picker */}
        {showWeekPicker && (
          <div className="animate-panel mt-3 grid grid-cols-8 gap-1 border-t-2 border-[#2a2a40] pt-3">
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
                  className={`border py-1 font-[VT323] text-sm font-bold tabular-nums transition-colors ${
                    isSelected
                      ? 'border-[#00f0ff] bg-[#00f0ff] text-[#0a0a0f] box-glow-cyan'
                      : isDl
                      ? 'border-[#ffe600]/60 bg-[#ffe600]/15 text-[#ffe600]'
                      : 'border-[#2a2a40] bg-[#111118] text-[#c0f0ff]'
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
            const daySubmitted = weekCompletions.some((c) => c.dayId === d.id);
            const dayFinished = daySubmitted || (dayDone >= dayTotal && dayTotal > 0);
            const matchedDate = weekSessionDates.find(
              (s) => s.dayId === d.id
            )?.dateKey;
            const splitName = d.shortTitle.split('•')[1]?.trim() ?? '';

            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onChangeDayId(d.id)}
                className={`flex flex-col items-center border-2 px-1 py-1.5 text-center transition-all active:scale-95 ${
                  active
                    ? 'border-[#00f0ff] bg-[#00f0ff]/15 text-[#00f0ff] box-glow-cyan'
                    : dayFinished
                    ? 'border-[#39ff14]/50 bg-[#39ff14]/10 text-[#39ff14]'
                    : 'border-[#2a2a40] bg-[#111118] text-[#5a6a78]'
                }`}
                style={{ boxShadow: '2px 2px 0 0 rgba(0,0,0,0.6)' }}
              >
                <span className="flex items-center gap-0.5 pixel-label text-[8px]">
                  {d.dayName}
                  {daySubmitted && <Check className="h-3 w-3 text-[#39ff14]" />}
                </span>
                <span className="mt-0.5 font-[VT323] text-xs leading-tight opacity-85">
                  {splitName}
                </span>
                <span className="mt-0.5 font-[VT323] text-xs tabular-nums opacity-80">
                  {matchedDate
                    ? formatShortDayMonth(matchedDate)
                    : `${dayDone}/${dayTotal}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Matched Gym Date Selector Bar */}
        <div className="mt-2.5 flex items-center justify-between gap-2 border-2 border-[#2a2a40] bg-[#0a0a0f] px-2.5 py-1.5">
          <div className="min-w-0">
            <div className="pixel-label text-[8px] text-[#5a6a78]">
              {sessionDateRecord ? 'Gym Date' : 'Gym Date (Auto)'}
            </div>
            <div className="truncate font-[VT323] text-sm font-bold text-[#c0f0ff]">
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
              className="border-2 border-[#2a2a40] bg-[#111118] px-2 py-0.5 font-[VT323] text-xs font-semibold text-[#00f0ff]"
            />
            <button
              type="button"
              onClick={onOpenCalendar}
              aria-label="Open Calendar"
              className="flex h-7 w-7 items-center justify-center border-2 border-[#2a2a40] bg-[#111118] text-[#00f0ff] active:bg-[#1a1a28]"
            >
              <CalendarDays className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Day Header & Session Status */}
      <div className="pixel-card p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-[VT323] text-xl font-bold text-[#c0f0ff]">
              {dayDef.shortTitle} — {dayDef.title}
            </h2>
            <p className="font-[VT323] text-sm text-[#5a6a78]">
              {dayDef.focus}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAutoStartRest((v) => !v)}
            className={`pixel-btn flex shrink-0 items-center gap-1 px-2 py-1 text-[8px] ${
              autoStartRest
                ? 'border-[#00f0ff] text-[#00f0ff]'
                : 'border-[#2a2a40] text-[#5a6a78]'
            }`}
          >
            <Timer className="h-3 w-3" />
            Rest {autoStartRest ? 'Auto' : 'Off'}
          </button>
        </div>

        <div className="mt-2.5 flex items-center gap-2.5">
          <div className="h-2 flex-1 overflow-hidden border border-[#2a2a40] bg-[#0a0a0f]">
            <div
              className="h-full bg-[#00f0ff] transition-all duration-300"
              style={{
                width: `${
                  totalSetsInDay > 0
                    ? Math.round((completedSetsInDay / totalSetsInDay) * 100)
                    : 0
                }%`,
                boxShadow: '0 0 8px rgba(0,240,255,0.4)',
              }}
            />
          </div>
          <span className="shrink-0 font-[VT323] text-sm font-bold tabular-nums text-[#00f0ff]">
            {completedSetsInDay}/{totalSetsInDay} sets
          </span>
        </div>
      </div>

      {/* Deload Banner */}
      {deload && (
        <div className="pixel-card flex items-center gap-2 border-[#ffe600] bg-[#ffe600]/10 p-2.5 text-xs text-[#ffe600] box-glow-yellow">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#ffe600]" />
          <span className="font-[VT323] text-sm">
            <strong className="text-[#ffe600]">W{week} Deload:</strong> -15% weight, -1 set.
          </span>
        </div>
      )}

      {/* Day-Specific Rule Banner */}
      {dayDef.ruleTitle && dayDef.ruleText && (
        <div className="pixel-card border-[#ff8c00] bg-[#ff8c00]/10 p-2.5 font-[VT323] text-sm leading-relaxed text-[#c0f0ff]">
          <span className="font-extrabold uppercase tracking-wide text-[#ff8c00]">
            {dayDef.ruleTitle}:{' '}
          </span>
          {dayDef.ruleText}
        </div>
      )}

      {/* Submitted Status Top Banner */}
      {isSubmittedLocked && (
        <div className="animate-panel pixel-card flex items-center justify-between gap-2 border-[#39ff14] bg-[#39ff14]/10 p-2.5 text-xs box-glow-green">
          <div className="flex items-center gap-2 text-[#39ff14]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#39ff14]" />
            <div className="font-[VT323] text-base">
              <span className="font-bold">Day {dayId} Submitted</span>
              <span className="text-[#39ff14]/80">
                {' '}• {completedSetsInDay}/{totalSetsInDay} sets
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingSubmitted(true)}
            className="pixel-btn flex items-center gap-1 border-[#39ff14] px-2.5 py-1 text-[#39ff14]"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
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
              isSubmittedLocked={isSubmittedLocked}
              onRequestEdit={() => setIsEditingSubmitted(true)}
              onStartTimer={onStartTimer}
              onEnsureSessionDate={ensureSessionDate}
            />
          );
        })}
      </div>

      {/* Finish Day / Submitted Footer */}
      <div className="pt-1">
        {!isSubmittedLocked ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                const incomplete = resolvedExercises
                  .map((r) => ({
                    id: r.def.id,
                    orderLabel: r.def.orderLabel,
                    name: r.name,
                    done: weekLogs.filter(
                      (l) => l.exerciseId === r.def.id && l.completed
                    ).length,
                    total: r.setsCount,
                  }))
                  .filter((item) => item.done < item.total);

                if (incomplete.length > 0) {
                  setShowIncompleteModal(true);
                } else {
                  ensureSessionDate().then(() =>
                    db.sessionCompletions
                      .put({
                        id: sessionCompletionId,
                        week,
                        dayId,
                        submittedAt: Date.now(),
                      })
                      .then(() => setIsEditingSubmitted(false))
                  );
                }
              }}
              className="pixel-btn-solid flex h-12 w-full items-center justify-center gap-2 text-xs"
            >
              <CheckCircle2 className="h-5 w-5 stroke-[2.4]" />
              {completionRecord ? `Save & Finish Day ${dayId}` : `Finish Day ${dayId}`}
            </button>

            {completionRecord && isEditingSubmitted && (
              <button
                type="button"
                onClick={() => setIsEditingSubmitted(false)}
                className="pixel-btn flex h-10 w-full items-center justify-center text-[9px] text-[#c0f0ff]"
              >
                Done Editing
              </button>
            )}
          </div>
        ) : (
          <div className="pixel-card border-[#39ff14] bg-[#39ff14]/10 p-3.5 text-center box-glow-green">
            <div className="flex items-center justify-center gap-1.5 font-[VT323] text-lg font-bold text-[#39ff14]">
              <CheckCircle2 className="h-4 w-4" />
              Day {dayId} Workout Submitted
            </div>
            <p className="mt-0.5 font-[VT323] text-sm text-[#5a6a78]">
              {completedSetsInDay}/{totalSetsInDay} sets • {formatReadableDate(effectiveDateKey)}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditingSubmitted(true)}
                className="pixel-btn flex h-10 flex-1 items-center justify-center gap-1.5 text-[9px] text-[#00f0ff]"
              >
                <Pencil className="h-3.5 w-3.5 text-[#00f0ff]" />
                Edit Workout
              </button>
              <button
                type="button"
                onClick={() => {
                  db.sessionCompletions.delete(sessionCompletionId);
                  setIsEditingSubmitted(false);
                }}
                className="pixel-btn flex h-10 items-center justify-center gap-1.5 border-[#2a2a40] px-3 text-[9px] text-[#5a6a78]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Unsubmit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Incomplete Workout Pop-Up Modal */}
      {showIncompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="animate-panel pixel-card w-full max-w-sm border-[#ff2d95] p-4 box-glow-pink">
            <div className="flex items-center gap-2 text-[#ff2d95]">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h3 className="pixel-heading text-xs text-[#ff2d95]">
                Workout Incomplete
              </h3>
            </div>
            <p className="mt-1.5 font-[VT323] text-base text-[#5a6a78]">
              You didn&apos;t finish all sets for this day:
            </p>

            <div className="mt-3 max-h-52 space-y-1.5 overflow-y-auto border-2 border-[#2a2a40] bg-[#0a0a0f] p-2.5">
              {resolvedExercises
                .map((r) => ({
                  id: r.def.id,
                  orderLabel: r.def.orderLabel,
                  name: r.name,
                  done: weekLogs.filter(
                    (l) => l.exerciseId === r.def.id && l.completed
                  ).length,
                  total: r.setsCount,
                }))
                .filter((item) => item.done < item.total)
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 font-[VT323] text-sm"
                  >
                    <span className="truncate text-[#c0f0ff]">
                      <span className="font-bold text-[#ffe600]">
                        {item.orderLabel}
                      </span>{' '}
                      {item.name}
                    </span>
                    <span className="shrink-0 font-bold tabular-nums text-[#ff2d95]">
                      {item.done}/{item.total}
                    </span>
                  </div>
                ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowIncompleteModal(false)}
                className="pixel-btn h-11 text-[9px] text-[#c0f0ff]"
              >
                Keep Going
              </button>
              <button
                type="button"
                onClick={async () => {
                  await ensureSessionDate();
                  await db.sessionCompletions.put({
                    id: sessionCompletionId,
                    week,
                    dayId,
                    submittedAt: Date.now(),
                  });
                  setIsEditingSubmitted(false);
                  setShowIncompleteModal(false);
                }}
                className="pixel-btn-solid h-11 text-[9px]"
              >
                Finish Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
