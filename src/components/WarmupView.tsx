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
      <div className="pixel-card p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="pixel-label text-[#ff2d95] glow-pink">
              Daily 12-Min Pre-Gym Reset
            </span>
            <h2 className="mt-1 font-[VT323] text-2xl font-bold text-[#c0f0ff]">
              Anti-Shrimp & Groin Unlock
            </h2>
            <p className="mt-0.5 font-[VT323] text-base text-[#5a6a78]">
              {formatReadableDate(dateKey)} •{' '}
              <span className="text-[#00f0ff]">
                {doneCount}/{DAILY_WARMUP_ITEMS.length}
              </span>{' '}
              done
            </p>
          </div>
          {doneCount > 0 && (
            <button
              type="button"
              onClick={resetToday}
              className="pixel-btn flex items-center gap-1 px-2.5 py-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden border border-[#2a2a40] bg-[#111118]">
          <div
            className="h-full bg-[#39ff14] transition-all duration-300"
            style={{
              width: `${Math.round(
                (doneCount / DAILY_WARMUP_ITEMS.length) * 100
              )}%`,
              boxShadow: '0 0 8px rgba(57,255,20,0.4)',
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
              className={`pixel-card p-3 transition-all duration-200 ${
                isDone
                  ? 'border-[#39ff14]/40 opacity-75'
                  : ''
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
                    <CheckCircle2 className="h-5 w-5 text-[#39ff14] drop-shadow-[0_0_4px_rgba(57,255,20,0.6)]" />
                  ) : (
                    <Circle className="h-5 w-5 text-[#2a2a40]" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="pixel-label text-[#ff2d95]">
                      #{item.order} • {item.prescription}
                    </span>

                    {item.timerSeconds && (
                      <button
                        type="button"
                        onClick={() =>
                          onStartTimer(item.title, item.timerSeconds!)
                        }
                        className="pixel-btn flex items-center gap-1 px-2 py-0.5"
                      >
                        <Timer className="h-3 w-3" />
                        {item.timerSeconds}s
                      </button>
                    )}
                  </div>

                  <h3
                    onClick={() => toggleItem(item.id)}
                    className={`mt-1 cursor-pointer font-[VT323] text-lg font-bold leading-snug transition-colors ${
                      isDone ? 'text-[#39ff14] line-through opacity-70' : 'text-[#c0f0ff]'
                    }`}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-0.5 font-[VT323] text-sm leading-relaxed text-[#5a6a78]">
                    {item.details}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily Armor Rules */}
      <div className="pixel-card p-3">
        <div className="flex items-center gap-1.5 pixel-label text-[#ffe600] glow-yellow">
          <ShieldAlert className="h-3.5 w-3.5" />
          Daily Posture & Step Rules
        </div>
        <div className="mt-2 space-y-1.5">
          {DAILY_ARMOR_RULES.map((rule) => (
            <div
              key={rule.title}
              className="border-2 border-[#2a2a40] bg-[#111118] px-2.5 py-2 font-[VT323] text-sm"
            >
              <span className="font-bold text-[#c0f0ff]">{rule.title}: </span>
              <span className="text-[#5a6a78]">{rule.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
