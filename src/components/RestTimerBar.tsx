import { useEffect, useRef } from 'react';
import { BellRing, Minus, Plus, RotateCcw, Timer, X } from 'lucide-react';

export interface ActiveTimerState {
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isDone: boolean;
}

interface RestTimerBarProps {
  timer: ActiveTimerState | null;
  onTick: () => void;
  onAdjust: (deltaSec: number) => void;
  onReset: () => void;
  onDismiss: () => void;
}

function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    [880, 1174.66].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.16);
      gain.gain.setValueAtTime(0.001, now + idx * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.16 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.16);
      osc.stop(now + idx * 0.16 + 0.16);
    });
  } catch {
    // Ignore audio context errors on restricted devices
  }
}

export function RestTimerBar({
  timer,
  onTick,
  onAdjust,
  onReset,
  onDismiss,
}: RestTimerBarProps) {
  const beepedRef = useRef(false);

  useEffect(() => {
    if (!timer) {
      beepedRef.current = false;
      return;
    }
    if (timer.isDone) {
      if (!beepedRef.current) {
        beepedRef.current = true;
        playBeep();
        if (navigator.vibrate) {
          navigator.vibrate([160, 80, 160]);
        }
      }
      return;
    }

    beepedRef.current = false;
    const id = window.setInterval(onTick, 1000);
    return () => window.clearInterval(id);
  }, [timer, onTick]);

  if (!timer) return null;

  const mins = Math.floor(timer.remainingSeconds / 60);
  const secs = timer.remainingSeconds % 60;
  const formatted = `${mins}:${String(secs).padStart(2, '0')}`;
  const pct =
    timer.totalSeconds > 0
      ? Math.max(0, Math.min(100, (timer.remainingSeconds / timer.totalSeconds) * 100))
      : 0;

  return (
    <div className="animate-slide-up fixed bottom-[68px] left-0 right-0 z-40 mx-auto max-w-md px-3">
      <div
        className={`relative overflow-hidden rounded-2xl border px-3.5 py-2.5 shadow-2xl backdrop-blur-md transition-colors ${
          timer.isDone
            ? 'border-emerald-500/60 bg-emerald-950/95 text-emerald-100'
            : 'border-amber-500/40 bg-zinc-900/95 text-zinc-100'
        }`}
      >
        <div
          className={`absolute bottom-0 left-0 h-1 transition-all duration-500 ${
            timer.isDone ? 'bg-emerald-400' : 'bg-amber-500'
          }`}
          style={{ width: `${timer.isDone ? 100 : pct}%` }}
        />

        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            {timer.isDone ? (
              <BellRing className="h-5 w-5 shrink-0 animate-bounce text-emerald-400" />
            ) : (
              <Timer className="h-5 w-5 shrink-0 text-amber-400" />
            )}
            <div className="min-w-0">
              <div className="truncate text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                {timer.isDone ? 'Rest Complete — Next Set' : timer.label}
              </div>
              <div className="text-xl font-bold leading-tight tabular-nums">
                {timer.isDone ? 'GO!' : formatted}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!timer.isDone && (
              <>
                <button
                  type="button"
                  onClick={() => onAdjust(-15)}
                  className="flex h-8 items-center gap-0.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2 text-xs font-semibold text-zinc-200 active:bg-zinc-700"
                >
                  <Minus className="h-3 w-3" />
                  15s
                </button>
                <button
                  type="button"
                  onClick={() => onAdjust(15)}
                  className="flex h-8 items-center gap-0.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2 text-xs font-semibold text-zinc-200 active:bg-zinc-700"
                >
                  <Plus className="h-3 w-3" />
                  15s
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onReset}
              aria-label="Restart timer"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 active:bg-zinc-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss timer"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 active:bg-zinc-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

