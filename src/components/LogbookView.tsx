import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Upload } from 'lucide-react';
import { WORKOUT_DAYS, resolveExerciseForWeek, type Feeling } from '../data/programData';
import {
  db,
  exportAllDataAsJson,
  formatCompactSetSummary,
  formatShortDayMonth,
  getTodayDateKey,
  importDataFromJson,
  type ExerciseFeeling,
  type SessionDate,
  type SetLog,
} from '../db';

interface LogbookViewProps {
  selectedDayId: number;
  onJumpToSession: (week: number, dayId: number) => void;
}

const WEEK_PAIRS = Array.from({ length: 8 }, (_, idx) => ({
  topWeek: idx + 1,
  bottomWeek: idx + 9,
}));

function feelingDotClass(feeling?: Feeling): string {
  if (feeling === 'easy') return 'bg-emerald-400';
  if (feeling === 'medium') return 'bg-amber-400';
  if (feeling === 'hard') return 'bg-rose-400';
  return '';
}

function summarizeWeekExercise(
  logs: SetLog[],
  week: number,
  dayId: number,
  exerciseId: string
): string {
  const day = WORKOUT_DAYS.find((d) => d.id === dayId);
  const ex = day?.exercises.find((e) => e.id === exerciseId);
  if (!ex) return '';

  const matching = logs
    .filter(
      (l) =>
        l.week === week &&
        l.dayId === dayId &&
        l.exerciseId === exerciseId &&
        l.completed
    )
    .sort((a, b) => a.setIndex - b.setIndex);

  if (matching.length === 0) return '';

  const resolved = resolveExerciseForWeek(ex, week);
  // Display heaviest/first representative set
  const topSet = matching.reduce((best, curr) => {
    const bestWt = best.weight ?? 0;
    const currWt = curr.weight ?? 0;
    if (currWt > bestWt) return curr;
    if (currWt === bestWt && (curr.reps ?? 0) > (best.reps ?? 0)) return curr;
    return best;
  }, matching[0]);

  return formatCompactSetSummary(topSet, resolved.weightSpec);
}

export function LogbookView({
  selectedDayId,
  onJumpToSession,
}: LogbookViewProps) {
  const [dayId, setDayId] = useState(selectedDayId);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allLogs = useLiveQuery(() => db.setLogs.toArray(), []) ?? [];
  const allFeelings =
    useLiveQuery(() => db.exerciseFeelings.toArray(), []) ?? [];
  const allSessionDates =
    useLiveQuery(() => db.sessionDates.toArray(), []) ?? [];

  const feelingMap = new Map<string, ExerciseFeeling>();
  allFeelings.forEach((f) =>
    feelingMap.set(`${f.week}_${f.dayId}_${f.exerciseId}`, f)
  );

  const sessionDateMap = new Map<string, SessionDate>();
  allSessionDates.forEach((sd) =>
    sessionDateMap.set(`${sd.week}_${sd.dayId}`, sd)
  );

  const dayDef = WORKOUT_DAYS.find((d) => d.id === dayId) ?? WORKOUT_DAYS[0];

  const handleExportJson = async () => {
    try {
      const json = await exportAllDataAsJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aesthetic-athlete-logbook-${getTodayDateKey()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMsg('Exported JSON backup.');
    } catch (err) {
      setStatusMsg(
        err instanceof Error ? err.message : 'Failed to export JSON.'
      );
    }
  };

  const handleImportJson = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = await importDataFromJson(text);
      setStatusMsg(
        `Imported ${res.setsImported} sets & ${res.feelingsImported} exercise ratings.`
      );
    } catch (err) {
      setStatusMsg(
        err instanceof Error ? err.message : 'Invalid JSON backup file.'
      );
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-3.5 pb-4">
      {/* Backup / JSON Export & Import */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-zinc-100">
              16-Week Split-Cell Logbook
            </h2>
            <p className="text-[11px] text-zinc-400">
              W1–8 top / W9–16 bottom • Tap any cell to edit
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-zinc-950 active:bg-amber-400"
            >
              <Download className="h-3.5 w-3.5" />
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-200 active:bg-zinc-800"
            >
              <Upload className="h-3.5 w-3.5" />
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportJson}
              className="hidden"
            />
          </div>
        </div>

        {statusMsg && (
          <div className="mt-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
            {statusMsg}
          </div>
        )}

        {/* Day Filter */}
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {WORKOUT_DAYS.map((d) => {
            const splitName = d.shortTitle.split('•')[1]?.trim() ?? '';
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setDayId(d.id)}
                className={`rounded-xl border py-1.5 text-[11px] font-bold transition-colors ${
                  d.id === dayId
                    ? 'border-amber-500/70 bg-amber-500/15 text-amber-200'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                }`}
              >
                {d.dayName} • {splitName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400">
        <span>Top: Weeks 1–8 | Bottom: Weeks 9–16</span>
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Easy
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Med
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-400" /> Hard
          </span>
        </div>
      </div>

      {/* Horizontal-scroll split-cell log matrix matching PDF */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/90">
        <table className="w-full min-w-[640px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
              <th className="sticky left-0 z-10 min-w-[140px] border-r border-zinc-800 bg-zinc-950 px-3 py-2.5">
                Exercise
              </th>
              {WEEK_PAIRS.map((pair) => (
                <th
                  key={pair.topWeek}
                  className="min-w-[60px] border-r border-zinc-800/70 px-1.5 py-2 text-center last:border-r-0"
                >
                  <div>W{pair.topWeek} /</div>
                  <div className="text-zinc-400">W{pair.bottomWeek}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {/* Matched Gym Dates Row */}
            <tr className="bg-zinc-950/60">
              <td className="sticky left-0 z-10 border-r border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Gym Date
              </td>
              {WEEK_PAIRS.map((pair) => {
                const topDate = sessionDateMap.get(
                  `${pair.topWeek}_${dayId}`
                )?.dateKey;
                const botDate = sessionDateMap.get(
                  `${pair.bottomWeek}_${dayId}`
                )?.dateKey;
                return (
                  <td
                    key={`date-${pair.topWeek}`}
                    className="border-r border-zinc-800/70 p-0 text-center text-[9px] font-semibold last:border-r-0"
                  >
                    <div className="border-b border-zinc-800/60 py-1 text-zinc-300">
                      {topDate ? formatShortDayMonth(topDate) : '—'}
                    </div>
                    <div className="py-1 text-zinc-400">
                      {botDate ? formatShortDayMonth(botDate) : '—'}
                    </div>
                  </td>
                );
              })}
            </tr>
            {dayDef.exercises.map((ex) => (
              <tr key={ex.id} className="hover:bg-zinc-800/25">
                <td className="sticky left-0 z-10 border-r border-zinc-800 bg-zinc-900 px-3 py-2 align-middle">
                  <div className="font-bold text-zinc-100">{ex.tableName}</div>
                  <div className="text-[10px] text-amber-400/90">
                    {ex.targetText}
                  </div>
                </td>
                {WEEK_PAIRS.map((pair) => {
                  const topVal = summarizeWeekExercise(
                    allLogs,
                    pair.topWeek,
                    dayId,
                    ex.id
                  );
                  const botVal = summarizeWeekExercise(
                    allLogs,
                    pair.bottomWeek,
                    dayId,
                    ex.id
                  );
                  const topFeel = feelingMap.get(
                    `${pair.topWeek}_${dayId}_${ex.id}`
                  )?.feeling;
                  const botFeel = feelingMap.get(
                    `${pair.bottomWeek}_${dayId}_${ex.id}`
                  )?.feeling;

                  return (
                    <td
                      key={pair.topWeek}
                      className="border-r border-zinc-800/70 p-0 align-top last:border-r-0"
                    >
                      <button
                        type="button"
                        onClick={() => onJumpToSession(pair.topWeek, dayId)}
                        className={`flex h-8 w-full items-center justify-between border-b border-zinc-800/60 px-1.5 text-[10px] tabular-nums hover:bg-zinc-800/60 ${
                          pair.topWeek === 8 ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <span
                          className={
                            topVal
                              ? 'font-bold text-zinc-100'
                              : 'text-zinc-600'
                          }
                        >
                          {topVal || `${pair.topWeek}`}
                        </span>
                        {topFeel && (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${feelingDotClass(
                              topFeel
                            )}`}
                          />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onJumpToSession(pair.bottomWeek, dayId)}
                        className={`flex h-8 w-full items-center justify-between px-1.5 text-[10px] tabular-nums hover:bg-zinc-800/60 ${
                          pair.bottomWeek === 16 ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <span
                          className={
                            botVal
                              ? 'font-bold text-zinc-100'
                              : 'text-zinc-600'
                          }
                        >
                          {botVal || `${pair.bottomWeek}`}
                        </span>
                        {botFeel && (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${feelingDotClass(
                              botFeel
                            )}`}
                          />
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

