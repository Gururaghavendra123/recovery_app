import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Plus,
  Trash2,
} from 'lucide-react';
import { WORKOUT_DAYS, resolveExerciseForWeek } from '../data/programData';
import {
  db,
  formatLongDate,
  formatShortDayMonth,
  getTodayDateKey,
  makeSessionDateId,
  parseDateKeyLocal,
  type SessionDate,
} from '../db';

interface CalendarViewProps {
  currentWeek: number;
  onOpenSession: (week: number, dayId: number, dateKey: string) => void;
  onOpenWarmup: () => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toDateKey(year: number, monthZeroIdx: number, day: number): string {
  const m = String(monthZeroIdx + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function CalendarView({
  currentWeek,
  onOpenSession,
  onOpenWarmup,
}: CalendarViewProps) {
  const todayKey = getTodayDateKey();
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);

  const initialDate = parseDateKeyLocal(todayKey);
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0..11

  const [assignWeek, setAssignWeek] = useState<number>(currentWeek);
  const [assignDayId, setAssignDayId] = useState<number>(1);

  const allSessionDates =
    useLiveQuery(() => db.sessionDates.toArray(), []) ?? [];
  const allCompletions =
    useLiveQuery(() => db.sessionCompletions.toArray(), []) ?? [];
  const allSetLogs = useLiveQuery(() => db.setLogs.toArray(), []) ?? [];
  const allWarmups = useLiveQuery(() => db.warmupChecks.toArray(), []) ?? [];

  const submittedKeys = useMemo(() => {
    const set = new Set<string>();
    allCompletions.forEach((c) => set.add(`${c.week}_${c.dayId}`));
    return set;
  }, [allCompletions]);

  // Map dateKey -> SessionDate[]
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, SessionDate[]>();
    allSessionDates.forEach((sd) => {
      const list = map.get(sd.dateKey) ?? [];
      list.push(sd);
      map.set(sd.dateKey, list);
    });
    map.forEach((list) =>
      list.sort((a, b) => a.week - b.week || a.dayId - b.dayId)
    );
    return map;
  }, [allSessionDates]);

  // Map "week_dayId" -> SessionDate
  const sessionDateByKey = useMemo(() => {
    const map = new Map<string, SessionDate>();
    allSessionDates.forEach((sd) => map.set(`${sd.week}_${sd.dayId}`, sd));
    return map;
  }, [allSessionDates]);

  // Map "week_dayId" -> { done, total }
  const progressBySession = useMemo(() => {
    const doneMap = new Map<string, number>();
    allSetLogs.forEach((l) => {
      if (!l.completed) return;
      const key = `${l.week}_${l.dayId}`;
      doneMap.set(key, (doneMap.get(key) ?? 0) + 1);
    });
    return doneMap;
  }, [allSetLogs]);

  // Map dateKey -> warmup count
  const warmupCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    allWarmups.forEach((w) => {
      if (!w.completed) return;
      map.set(w.dateKey, (map.get(w.dateKey) ?? 0) + 1);
    });
    return map;
  }, [allWarmups]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    undefined,
    { month: 'long', year: 'numeric' }
  );

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-`;
  const monthWorkoutsCount = allSessionDates.filter((s) =>
    s.dateKey.startsWith(monthPrefix)
  ).length;
  const monthWarmupDaysCount = Array.from(warmupCountByDate.entries()).filter(
    ([dk, count]) => dk.startsWith(monthPrefix) && count > 0
  ).length;

  // Build Monday-first calendar cells
  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // JS getDay(): 0=Sun..6=Sat -> Monday=0..Sunday=6
    const startOffset = (firstDay.getDay() + 6) % 7;

    const cells: ({ day: number; dateKey: string } | null)[] = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, dateKey: toDateKey(viewYear, viewMonth, d) });
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const jumpToToday = () => {
    const t = parseDateKeyLocal(todayKey);
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setSelectedDateKey(todayKey);
  };

  const getTotalSets = (week: number, dayId: number) => {
    const dayDef = WORKOUT_DAYS.find((d) => d.id === dayId);
    if (!dayDef) return 0;
    return dayDef.exercises.reduce(
      (sum, ex) => sum + resolveExerciseForWeek(ex, week).setsCount,
      0
    );
  };

  const handleMatchAndOpen = async () => {
    await db.sessionDates.put({
      id: makeSessionDateId(assignWeek, assignDayId),
      week: assignWeek,
      dayId: assignDayId,
      dateKey: selectedDateKey,
      updatedAt: Date.now(),
    });
    onOpenSession(assignWeek, assignDayId, selectedDateKey);
  };

  const handleMoveSessionDate = async (
    sd: SessionDate,
    nextDateKey: string
  ) => {
    if (!nextDateKey) return;
    await db.sessionDates.put({
      ...sd,
      dateKey: nextDateKey,
      updatedAt: Date.now(),
    });
    setSelectedDateKey(nextDateKey);
    const dt = parseDateKeyLocal(nextDateKey);
    setViewYear(dt.getFullYear());
    setViewMonth(dt.getMonth());
  };

  const handleUnlinkDate = async (sdId: string) => {
    await db.sessionDates.delete(sdId);
  };

  const selectedSessions = sessionsByDate.get(selectedDateKey) ?? [];
  const selectedWarmups = warmupCountByDate.get(selectedDateKey) ?? 0;

  return (
    <div className="space-y-3.5 pb-4">
      {/* Month Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goPrevMonth}
            aria-label="Previous month"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-200 active:bg-zinc-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="text-center">
            <h2 className="text-base font-extrabold text-zinc-100">
              {monthLabel}
            </h2>
            <p className="text-[11px] text-zinc-400">
              {monthWorkoutsCount} workouts • {monthWarmupDaysCount} warm-up
              days
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={jumpToToday}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-[11px] font-bold text-amber-300 active:bg-zinc-800"
            >
              Today
            </button>
            <button
              type="button"
              onClick={goNextMonth}
              aria-label="Next month"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-200 active:bg-zinc-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="py-1">
              {wd}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="h-14 rounded-xl" />;
            }

            const daySessions = sessionsByDate.get(cell.dateKey) ?? [];
            const warmupCount = warmupCountByDate.get(cell.dateKey) ?? 0;
            const isToday = cell.dateKey === todayKey;
            const isSelected = cell.dateKey === selectedDateKey;

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => setSelectedDateKey(cell.dateKey)}
                className={`relative flex h-14 flex-col items-center justify-start rounded-xl border p-1 transition-all active:scale-95 ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400/50'
                    : isToday
                    ? 'border-zinc-600 bg-zinc-800/70'
                    : 'border-zinc-800/70 bg-zinc-950/60 hover:bg-zinc-900'
                }`}
              >
                <div className="flex w-full items-center justify-between px-0.5">
                  <span
                    className={`text-[11px] font-bold tabular-nums ${
                      isSelected
                        ? 'text-amber-300'
                        : isToday
                        ? 'text-zinc-100'
                        : 'text-zinc-400'
                    }`}
                  >
                    {cell.day}
                  </span>
                  {warmupCount > 0 && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                      title="Warm-up logged"
                    />
                  )}
                </div>

                <div className="mt-1 flex w-full flex-col gap-0.5 overflow-hidden">
                  {daySessions.slice(0, 2).map((sd) => {
                    const done =
                      progressBySession.get(`${sd.week}_${sd.dayId}`) ?? 0;
                    const total = getTotalSets(sd.week, sd.dayId);
                    const isSubmitted = submittedKeys.has(`${sd.week}_${sd.dayId}`);
                    const finished = isSubmitted || (total > 0 && done >= total);
                    return (
                      <span
                        key={sd.id}
                        className={`truncate rounded px-1 py-0.5 text-[9px] font-extrabold leading-none tabular-nums ${
                          finished
                            ? 'bg-emerald-500/25 text-emerald-300'
                            : 'bg-amber-500/25 text-amber-300'
                        }`}
                      >
                        W{sd.week}·D{sd.dayId}
                      </span>
                    );
                  })}
                  {daySessions.length > 2 && (
                    <span className="text-[8px] font-bold text-zinc-400">
                      +{daySessions.length - 2}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Details & Session Matcher */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-3.5 space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
              <CalendarCheck2 className="h-3.5 w-3.5" />
              {selectedDateKey === todayKey ? 'Today' : 'Selected Gym Date'}
            </div>
            <h3 className="mt-0.5 text-sm font-extrabold text-zinc-100">
              {formatLongDate(selectedDateKey)}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs">
            <Flame
              className={`h-3.5 w-3.5 ${
                selectedWarmups > 0 ? 'text-emerald-400' : 'text-zinc-600'
              }`}
            />
            <span className="font-semibold text-zinc-300">
              Warm-up: {selectedWarmups}/6
            </span>
            {selectedDateKey === todayKey && (
              <button
                type="button"
                onClick={onOpenWarmup}
                className="ml-1 font-bold text-amber-400 underline"
              >
                Open
              </button>
            )}
          </div>
        </div>

        {/* Matched workouts on selected date */}
        {selectedSessions.length > 0 ? (
          <div className="space-y-2">
            {selectedSessions.map((sd) => {
              const dayDef = WORKOUT_DAYS.find((d) => d.id === sd.dayId);
              const done =
                progressBySession.get(`${sd.week}_${sd.dayId}`) ?? 0;
              const total = getTotalSets(sd.week, sd.dayId);
              const isSubmitted = submittedKeys.has(`${sd.week}_${sd.dayId}`);

              return (
                <div
                  key={sd.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-300">
                        <span>Week {sd.week} • {dayDef?.shortTitle}</span>
                        {isSubmitted && (
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                            Submitted
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-zinc-400">
                        {done}/{total} sets logged
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenSession(sd.week, sd.dayId, sd.dateKey)
                        }
                        className="flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-bold text-zinc-950 active:bg-amber-400"
                      >
                        <Dumbbell className="h-3.5 w-3.5" />
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnlinkDate(sd.id)}
                        aria-label="Unlink date"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-rose-300 active:bg-zinc-800"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-zinc-800/70 pt-2">
                    <span className="text-[11px] text-zinc-500">Move date:</span>
                    <input
                      type="date"
                      value={sd.dateKey}
                      onChange={(e) =>
                        handleMoveSessionDate(sd, e.target.value)
                      }
                      className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs font-semibold text-zinc-200"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-400">
            Rest / off day — no workout matched.
          </div>
        )}

        {/* Match a Workout to Selected Date */}
        <div className="space-y-2.5 border-t border-zinc-800 pt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-zinc-200">
              Match to {formatShortDayMonth(selectedDateKey)}
            </span>
            <select
              value={assignWeek}
              onChange={(e) => setAssignWeek(Number(e.target.value))}
              aria-label="Select week to match"
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-bold text-amber-300"
            >
              {Array.from({ length: 16 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {WORKOUT_DAYS.map((d) => {
              const existing = sessionDateByKey.get(`${assignWeek}_${d.id}`);
              const active = assignDayId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setAssignDayId(d.id)}
                  className={`flex flex-col items-start rounded-xl border px-2.5 py-2 text-left transition-all duration-150 active:scale-95 ${
                    active
                      ? 'border-amber-500/70 bg-amber-500/15 text-amber-200'
                      : 'border-zinc-800 bg-zinc-950/70 text-zinc-300'
                  }`}
                >
                  <span className="text-xs font-bold">{d.shortTitle}</span>
                  <span className="mt-0.5 text-[10px] text-zinc-400">
                    {existing
                      ? formatShortDayMonth(existing.dateKey)
                      : 'Unassigned'}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleMatchAndOpen}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 text-xs font-extrabold text-zinc-950 transition-transform active:scale-[0.99] active:bg-amber-400"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            Match W{assignWeek} • D{assignDayId} & Open
          </button>
        </div>
      </div>
    </div>
  );
}

