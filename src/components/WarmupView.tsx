import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2, Circle, RotateCcw, ShieldAlert, Timer } from 'lucide-react';
import { DAILY_ARMOR_RULES, DAILY_WARMUP_ITEMS } from '../data/programData';
import { db, formatReadableDate, getTodayDateKey, makeWarmupId } from '../db';

interface WarmupViewProps {
  onStartTimer: (label: string, seconds: number) => void;
}

export function WarmupView({ onStartTimer }: WarmupViewProps) {
  const dateKey = getTodayDateKey();

  const checks =
    useLiveQuery(
      () => db.warmupChecks.where('dateKey').equals(dateKey).toArray(),
      [dateKey]
    ) ?? [];

  const completedMap = new Map(checks.map((c) => [c.warmupId, c.completed]));
  const doneCount = DAILY_WARMUP_ITEMS.filter((item) =>
    completedMap.get(item.id)
  ).length;

  const toggleItem = async (warmupId: string) => {
    const id = makeWarmupId(dateKey, warmupId);
    const current = Boolean(completedMap.get(warmupId));
    await db.warmupChecks.put({
      id,
      dateKey,
      warmupId,
      completed: !current,
      updatedAt: Date.now(),
    });
  };

  const resetToday = async () => {
    await db.warmupChecks.where('dateKey').equals(dateKey).delete();
  };

  return (
    <div className="space-y-3 pb-4">
      <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/90 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
              Daily 12-Min Pre-Gym Reset
            </span>
            <h2 className="mt-0.5 text-base font-extrabold text-zinc-100">
              Anti-Shrimp & Groin Unlock
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              {formatReadableDate(dateKey)} •{' '}
              <span className="font-semibold text-zinc-200">
                {doneCount}/{DAILY_WARMUP_ITEMS.length}
              </span>{' '}
              done
            </p>
          </div>
          {doneCount > 0 && (
            <button
              type="button"
              onClick={resetToday}
              className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs font-semibold text-zinc-400 transition-colors active:scale-95 active:bg-zinc-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{
              width: `${Math.round(
                (doneCount / DAILY_WARMUP_ITEMS.length) * 100
              )}%`,
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {DAILY_WARMUP_ITEMS.map((item) => {
          const isDone = Boolean(completedMap.get(item.id));
          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-3 transition-all duration-200 ${
                isDone
                  ? 'border-emerald-500/35 bg-emerald-950/15 opacity-80'
                  : 'border-zinc-800/90 bg-zinc-900/90'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  aria-label={`Toggle ${item.title}`}
                  className="mt-0.5 shrink-0 transition-transform active:scale-90"
                >
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-zinc-600" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                      #{item.order} • {item.prescription}
                    </span>

                    {item.timerSeconds && (
                      <button
                        type="button"
                        onClick={() =>
                          onStartTimer(item.title, item.timerSeconds!)
                        }
                        className="flex items-center gap-1 rounded-lg border border-zinc-700/80 bg-zinc-950 px-2 py-0.5 text-[11px] font-semibold text-amber-300 transition-transform active:scale-95 active:bg-zinc-800"
                      >
                        <Timer className="h-3 w-3" />
                        {item.timerSeconds}s
                      </button>
                    )}
                  </div>

                  <h3
                    onClick={() => toggleItem(item.id)}
                    className={`mt-1 cursor-pointer text-sm font-bold leading-snug transition-colors ${
                      isDone ? 'text-emerald-200 line-through' : 'text-zinc-100'
                    }`}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                    {item.details}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily Armor Rules */}
      <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/80 p-3">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
          <ShieldAlert className="h-3.5 w-3.5" />
          Daily Posture & Step Rules
        </div>
        <div className="mt-2 space-y-1.5">
          {DAILY_ARMOR_RULES.map((rule) => (
            <div
              key={rule.title}
              className="rounded-xl border border-zinc-800/70 bg-zinc-950/60 px-2.5 py-2 text-xs"
            >
              <span className="font-bold text-zinc-200">{rule.title}: </span>
              <span className="text-zinc-400">{rule.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
