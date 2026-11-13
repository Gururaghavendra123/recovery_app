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
      osc.type = 'square'; // 8-bit square wave!
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
        className={`pixel-card relative overflow-hidden px-3.5 py-2.5 backdrop-blur-sm transition-colors ${
          timer.isDone
            ? 'border-[#39ff14] box-glow-green'
            : 'border-[#ff2d95] box-glow-pink'
        }`}
      >
        <div
          className={`absolute bottom-0 left-0 h-[3px] transition-all duration-500 ${
            timer.isDone ? 'bg-[#39ff14]' : 'bg-[#ff2d95]'
          }`}
          style={{ width: `${timer.isDone ? 100 : pct}%` }}
        />

        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            {timer.isDone ? (
              <BellRing className="h-5 w-5 shrink-0 animate-bounce text-[#39ff14] drop-shadow-[0_0_6px_rgba(57,255,20,0.6)]" />
            ) : (
              <Timer className="h-5 w-5 shrink-0 text-[#ff2d95] drop-shadow-[0_0_6px_rgba(255,45,149,0.6)]" />
            )}
            <div className="min-w-0">
              <div className="truncate pixel-label text-[#5a6a78]">
                {timer.isDone ? 'Rest Complete — Next Set' : timer.label}
              </div>
              <div className={`font-[VT323] text-2xl font-bold leading-tight tabular-nums ${
                timer.isDone ? 'text-[#39ff14] glow-green' : 'text-[#ff2d95] glow-pink'
              }`}>
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
                  className="flex h-8 items-center gap-0.5 border-2 border-[#2a2a40] bg-[#111118] px-2 font-[VT323] text-sm text-[#c0f0ff] active:translate-x-[1px] active:translate-y-[1px]"
                  style={{ boxShadow: '2px 2px 0 0 rgba(0,0,0,0.7)' }}
                >
                  <Minus className="h-3 w-3" />
                  15s
                </button>
                <button
                  type="button"
                  onClick={() => onAdjust(15)}
                  className="flex h-8 items-center gap-0.5 border-2 border-[#2a2a40] bg-[#111118] px-2 font-[VT323] text-sm text-[#c0f0ff] active:translate-x-[1px] active:translate-y-[1px]"
                  style={{ boxShadow: '2px 2px 0 0 rgba(0,0,0,0.7)' }}
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
              className="flex h-8 w-8 items-center justify-center border-2 border-[#2a2a40] bg-[#111118] text-[#c0f0ff] active:translate-x-[1px] active:translate-y-[1px]"
              style={{ boxShadow: '2px 2px 0 0 rgba(0,0,0,0.7)' }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss timer"
              className="flex h-8 w-8 items-center justify-center border-2 border-[#2a2a40] bg-[#111118] text-[#c0f0ff] active:translate-x-[1px] active:translate-y-[1px]"
              style={{ boxShadow: '2px 2px 0 0 rgba(0,0,0,0.7)' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
