import { Minus, Plus } from 'lucide-react';
import type { SliderSpec } from '../data/programData';
import { formatSliderValue } from '../db';

interface SliderInputProps {
  label: string;
  value: number;
  spec: SliderSpec;
  onChange: (nextValue: number) => void;
  subLabel?: string;
  highlightGood?: boolean;
}

function roundToPrecision(val: number, step: number): number {
  const decimals = step.toString().includes('.')
    ? step.toString().split('.')[1].length
    : 0;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

export function SliderInput({
  label,
  value,
  spec,
  onChange,
  subLabel,
  highlightGood,
}: SliderInputProps) {
  const clamped = Math.min(spec.max, Math.max(spec.min, value));
  const pct =
    spec.max > spec.min
      ? ((clamped - spec.min) / (spec.max - spec.min)) * 100
      : 0;

  const decrement = () => {
    const next = roundToPrecision(Math.max(spec.min, clamped - spec.step), spec.step);
    onChange(next);
  };

  const increment = () => {
    const next = roundToPrecision(Math.min(spec.max, clamped + spec.step), spec.step);
    onChange(next);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <span className="pixel-label text-[#5a6a78]">
            {label}
          </span>
          {subLabel && (
            <span className="font-[VT323] text-sm text-[#5a6a78]">{subLabel}</span>
          )}
        </div>
        <span
          className={`font-[VT323] text-2xl font-bold tabular-nums ${
            highlightGood ? 'text-[#39ff14] glow-green' : 'text-[#00f0ff] glow-cyan'
          }`}
        >
          {formatSliderValue(clamped, spec)}
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={decrement}
          disabled={clamped <= spec.min}
          aria-label={`Decrease ${label}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[#2a2a40] bg-[#111118] text-[#00f0ff] transition-transform active:translate-x-[1px] active:translate-y-[1px] active:bg-[#1a1a28] disabled:opacity-35"
          style={{ boxShadow: '3px 3px 0 0 rgba(0,0,0,0.7)' }}
        >
          <Minus className="h-4 w-4" />
        </button>

        <input
          type="range"
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={clamped}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-label={label}
          className="gym-slider flex-1"
          style={{
            background: `linear-gradient(to right, #00f0ff 0%, #00f0ff ${pct}%, #2a2a40 ${pct}%, #2a2a40 100%)`,
            borderRadius: '0',
            height: '10px',
          }}
        />

        <button
          type="button"
          onClick={increment}
          disabled={clamped >= spec.max}
          aria-label={`Increase ${label}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[#2a2a40] bg-[#111118] text-[#00f0ff] transition-transform active:translate-x-[1px] active:translate-y-[1px] active:bg-[#1a1a28] disabled:opacity-35"
          style={{ boxShadow: '3px 3px 0 0 rgba(0,0,0,0.7)' }}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
