import { useCallback, useEffect, useState } from 'react';
import { BookOpen, CalendarDays, Dumbbell, Flame, Table2 } from 'lucide-react';
import { db } from './db';
import { WorkoutView } from './components/WorkoutView';
import { CalendarView } from './components/CalendarView';
import { WarmupView } from './components/WarmupView';
import { LogbookView } from './components/LogbookView';
import { BlueprintView } from './components/BlueprintView';
import { RestTimerBar, type ActiveTimerState } from './components/RestTimerBar';

type TabId = 'workout' | 'calendar' | 'warmup' | 'logbook' | 'blueprint';

const TABS: { id: TabId; label: string; Icon: typeof Dumbbell }[] = [
  { id: 'workout', label: 'Workout', Icon: Dumbbell },
  { id: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { id: 'warmup', label: 'Warm-Up', Icon: Flame },
  { id: 'logbook', label: 'Logbook', Icon: Table2 },
  { id: 'blueprint', label: 'Blueprint', Icon: BookOpen },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('workout');
  const [week, setWeek] = useState<number>(1);
  const [dayId, setDayId] = useState<number>(1);
  const [preferredDateKey, setPreferredDateKey] = useState<string | undefined>(
    undefined
  );
  const [timer, setTimer] = useState<ActiveTimerState | null>(null);

  // Restore last active week & day from Dexie appMeta
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [savedWeek, savedDay] = await Promise.all([
          db.appMeta.get('currentWeek'),
          db.appMeta.get('currentDayId'),
        ]);
        if (!mounted) return;
        if (savedWeek && typeof savedWeek.value === 'number') {
          setWeek(Math.min(16, Math.max(1, savedWeek.value)));
        }
        if (savedDay && typeof savedDay.value === 'number') {
          setDayId(Math.min(4, Math.max(1, savedDay.value)));
        }
      } catch {
        // Ignore initial read error
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleChangeWeek = useCallback((nextWeek: number) => {
    setWeek(nextWeek);
    setPreferredDateKey(undefined);
    db.appMeta.put({ key: 'currentWeek', value: nextWeek }).catch(() => {});
  }, []);

  const handleChangeDayId = useCallback((nextDayId: number) => {
    setDayId(nextDayId);
    setPreferredDateKey(undefined);
    db.appMeta.put({ key: 'currentDayId', value: nextDayId }).catch(() => {});
  }, []);

  const handleOpenSession = useCallback(
    (targetWeek: number, targetDayId: number, dateKey?: string) => {
      setWeek(targetWeek);
      setDayId(targetDayId);
      setPreferredDateKey(dateKey);
      db.appMeta.put({ key: 'currentWeek', value: targetWeek }).catch(() => {});
      db.appMeta.put({ key: 'currentDayId', value: targetDayId }).catch(() => {});
      setActiveTab('workout');
    },
    []
  );

  const handleStartTimer = useCallback((label: string, seconds: number) => {
    setTimer({
      label,
      totalSeconds: seconds,
      remainingSeconds: seconds,
      isDone: false,
    });
  }, []);

  const handleTickTimer = useCallback(() => {
    setTimer((prev) => {
      if (!prev || prev.isDone) return prev;
      if (prev.remainingSeconds <= 1) {
        return { ...prev, remainingSeconds: 0, isDone: true };
      }
      return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
    });
  }, []);

  const handleAdjustTimer = useCallback((deltaSec: number) => {
    setTimer((prev) => {
      if (!prev) return prev;
      const next = Math.max(5, prev.remainingSeconds + deltaSec);
      return {
        ...prev,
        totalSeconds: Math.max(prev.totalSeconds, next),
        remainingSeconds: next,
        isDone: false,
      };
    });
  }, []);

  const handleResetTimer = useCallback(() => {
    setTimer((prev) =>
      prev
        ? {
            ...prev,
            remainingSeconds: prev.totalSeconds,
            isDone: false,
          }
        : null
    );
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sticky App Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider text-zinc-100">
              Aesthetic <span className="text-amber-400">Athlete</span>
            </h1>
            <p className="text-[10px] font-medium text-zinc-400">
              16-Week Posture & Hypertrophy Logbook
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] font-bold text-amber-300 tabular-nums active:bg-zinc-800"
          >
            W{week} • D{dayId}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-md px-3 pt-3 pb-28">
        {activeTab === 'workout' && (
          <WorkoutView
            week={week}
            dayId={dayId}
            preferredDateKey={preferredDateKey}
            onChangeWeek={handleChangeWeek}
            onChangeDayId={handleChangeDayId}
            onStartTimer={handleStartTimer}
            onOpenCalendar={() => setActiveTab('calendar')}
          />
        )}
        {activeTab === 'calendar' && (
          <CalendarView
            currentWeek={week}
            onOpenSession={handleOpenSession}
            onOpenWarmup={() => setActiveTab('warmup')}
          />
        )}
        {activeTab === 'warmup' && (
          <WarmupView onStartTimer={handleStartTimer} />
        )}
        {activeTab === 'logbook' && (
          <LogbookView
            selectedDayId={dayId}
            onJumpToSession={(w, d) => handleOpenSession(w, d)}
          />
        )}
        {activeTab === 'blueprint' && <BlueprintView />}
      </main>

      {/* Floating Rest / Drill Timer */}
      <RestTimerBar
        timer={timer}
        onTick={handleTickTimer}
        onAdjust={handleAdjustTimer}
        onReset={handleResetTimer}
        onDismiss={() => setTimer(null)}
      />

      {/* Bottom Tab Navigation */}
      <nav className="pb-safe fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800/90 bg-zinc-950/95 backdrop-blur-md">
        <div className="mx-auto grid max-w-md grid-cols-5 px-1.5 pt-1.5">
          {TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1 transition-all duration-150 active:scale-95 ${
                  active
                    ? 'text-amber-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span
                  className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors duration-150 ${
                    active ? 'bg-amber-500/15' : 'bg-transparent'
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] ${active ? 'stroke-[2.4]' : ''}`} />
                </span>
                <span className="text-[10px] font-bold tracking-wide">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
