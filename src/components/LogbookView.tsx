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
  if (feeling === 'easy') return 'bg-[#39ff14] shadow-[0_0_4px_#39ff14]';
  if (feeling === 'medium') return 'bg-[#ffe600] shadow-[0_0_4px_#ffe600]';
  if (feeling === 'hard') return 'bg-[#ff2d95] shadow-[0_0_4px_#ff2d95]';
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
      a.download = `workout-logger-${getTodayDateKey()}.json`;
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
        `Imported ${res.setsImported} sets & ${res.feelingsImported} ratings.`
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
      <div className="pixel-card p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="pixel-heading text-xs text-[#00f0ff] glow-cyan">
              16-Week Logbook
            </h2>
            <p className="mt-0.5 font-[VT323] text-sm text-[#5a6a78]">
              W1–8 top / W9–16 bottom • Tap cell to edit
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="pixel-btn-solid flex items-center gap-1 px-2.5 py-1.5 text-[8px]"
            >
              <Download className="h-3 w-3" />
              Export
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="pixel-btn flex items-center gap-1 px-2.5 py-1.5 text-[8px] text-[#c0f0ff]"
            >
              <Upload className="h-3 w-3" />
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
          <div className="mt-2.5 border-2 border-[#39ff14] bg-[#39ff14]/10 p-2 font-[VT323] text-sm text-[#39ff14]">
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
                className={`border-2 py-1 font-[VT323] text-sm font-bold transition-colors ${
                  d.id === dayId
                    ? 'border-[#00f0ff] bg-[#00f0ff]/20 text-[#00f0ff] box-glow-cyan'
                    : 'border-[#2a2a40] bg-[#111118] text-[#5a6a78]'
                }`}
                style={{ boxShadow: '2px 2px 0 0 rgba(0,0,0,0.6)' }}
              >
                {d.dayName} • {splitName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between px-1 font-[VT323] text-xs text-[#5a6a78]">
        <span>Top: W1–8 | Bottom: W9–16</span>
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 bg-[#39ff14]" /> Easy
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 bg-[#ffe600]" /> Med
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 bg-[#ff2d95]" /> Hard
          </span>
        </div>
      </div>

      {/* Horizontal-scroll split-cell log matrix */}
      <div className="overflow-x-auto border-2 border-[#2a2a40] bg-[#111118]" style={{ boxShadow: '4px 4px 0 0 rgba(0,0,0,0.7)' }}>
        <table className="w-full min-w-[640px] border-collapse text-left font-[VT323] text-sm">
          <thead>
            <tr className="border-b-2 border-[#2a2a40] bg-[#0a0a0f] pixel-label text-[8px] text-[#5a6a78]">
              <th className="sticky left-0 z-10 min-w-[140px] border-r-2 border-[#2a2a40] bg-[#0a0a0f] px-3 py-2">
                Exercise
              </th>
              {WEEK_PAIRS.map((pair) => (
                <th
                  key={pair.topWeek}
                  className="min-w-[60px] border-r border-[#2a2a40] px-1 py-1.5 text-center last:border-r-0"
                >
                  <div className="text-[#00f0ff]">W{pair.topWeek}</div>
                  <div className="text-[#5a6a78]">W{pair.bottomWeek}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a40]">
            {/* Matched Gym Dates Row */}
            <tr className="bg-[#0a0a0f]/80">
              <td className="sticky left-0 z-10 border-r-2 border-[#2a2a40] bg-[#0a0a0f] px-3 py-1 pixel-label text-[8px] text-[#ffe600]">
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
                    className="border-r border-[#2a2a40] p-0 text-center font-[VT323] text-xs last:border-r-0"
                  >
                    <div className="border-b border-[#2a2a40] py-0.5 text-[#c0f0ff]">
                      {topDate ? formatShortDayMonth(topDate) : '—'}
                    </div>
                    <div className="py-0.5 text-[#5a6a78]">
                      {botDate ? formatShortDayMonth(botDate) : '—'}
                    </div>
                  </td>
                );
              })}
            </tr>
            {dayDef.exercises.map((ex) => (
              <tr key={ex.id} className="hover:bg-[#1a1a28]">
                <td className="sticky left-0 z-10 border-r-2 border-[#2a2a40] bg-[#111118] px-3 py-1.5 align-middle">
                  <div className="font-[VT323] text-base font-bold text-[#c0f0ff]">{ex.tableName}</div>
                  <div className="font-[VT323] text-xs text-[#00f0ff]/80">
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
                      className="border-r border-[#2a2a40] p-0 align-top last:border-r-0"
                    >
                      <button
                        type="button"
                        onClick={() => onJumpToSession(pair.topWeek, dayId)}
                        className={`flex h-8 w-full items-center justify-between border-b border-[#2a2a40] px-1 font-[VT323] text-xs tabular-nums hover:bg-[#1a1a28] ${
                          pair.topWeek === 8 ? 'bg-[#ffe600]/5' : ''
                        }`}
                      >
                        <span
                          className={
                            topVal
                              ? 'font-bold text-[#c0f0ff]'
                              : 'text-[#2a2a40]'
                          }
                        >
                          {topVal || `${pair.topWeek}`}
                        </span>
                        {topFeel && (
                          <span
                            className={`h-1.5 w-1.5 ${feelingDotClass(
                              topFeel
                            )}`}
                          />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onJumpToSession(pair.bottomWeek, dayId)}
                        className={`flex h-8 w-full items-center justify-between px-1 font-[VT323] text-xs tabular-nums hover:bg-[#1a1a28] ${
                          pair.bottomWeek === 16 ? 'bg-[#ffe600]/5' : ''
                        }`}
                      >
                        <span
                          className={
                            botVal
                              ? 'font-bold text-[#c0f0ff]'
                              : 'text-[#2a2a40]'
                          }
                        >
                          {botVal || `${pair.bottomWeek}`}
                        </span>
                        {botFeel && (
                          <span
                            className={`h-1.5 w-1.5 ${feelingDotClass(
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
