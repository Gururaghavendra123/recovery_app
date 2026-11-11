import { useState } from 'react';
import { Ban, CheckCircle2, ChevronDown, Compass, Utensils } from 'lucide-react';
import {
  ATHLETE_PROFILE,
  EIGHT_MONTH_ROADMAP,
  MOVEMENT_BAN_LIST,
  NUTRITION_PLAN,
  ROOT_CAUSE_MAP,
} from '../data/programData';

export function BlueprintView() {
  const [openSection, setOpenSection] = useState<
    'root' | 'bans' | 'meals' | 'roadmap' | null
  >('meals');

  const toggle = (key: 'root' | 'bans' | 'meals' | 'roadmap') => {
    setOpenSection((prev) => (prev === key ? null : key));
  };

  return (
    <div className="space-y-2.5 pb-4">
      {/* Compact Profile Strip */}
      <div className="rounded-2xl border border-amber-500/25 bg-zinc-900/90 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
            {ATHLETE_PROFILE.phaseBadge}
          </span>
          <span className="text-[11px] font-semibold text-zinc-400">
            {ATHLETE_PROFILE.deadline}
          </span>
        </div>
        <h2 className="mt-1.5 text-sm font-extrabold text-zinc-100">
          {ATHLETE_PROFILE.title}
        </h2>
        <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-xs">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 px-2.5 py-1.5">
            <div className="text-[10px] text-zinc-500">Profile</div>
            <div className="font-bold text-zinc-200">{ATHLETE_PROFILE.athlete}</div>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 px-2.5 py-1.5">
            <div className="text-[10px] text-zinc-500">Body Fat</div>
            <div className="font-bold text-amber-300">{ATHLETE_PROFILE.bodyFat}</div>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 px-2.5 py-1.5">
            <div className="text-[10px] text-zinc-500">Pull Base</div>
            <div className="font-bold text-zinc-200">{ATHLETE_PROFILE.pullBase}</div>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 px-2.5 py-1.5">
            <div className="text-[10px] text-zinc-500">Primary Fixes</div>
            <div className="font-bold text-zinc-200">{ATHLETE_PROFILE.primaryFixes}</div>
          </div>
        </div>
      </div>

      {/* Section 1: 2,000 kcal Nutrition Plan */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-900/90">
        <button
          type="button"
          onClick={() => toggle('meals')}
          className="flex w-full items-center justify-between px-3.5 py-3 text-left active:bg-zinc-800/40"
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-400">
              <Utensils className="h-3.5 w-3.5" />
              2,000 kcal Meal Plan
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-zinc-400">
              {NUTRITION_PLAN.targetSummary}
            </div>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${
              openSection === 'meals' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openSection === 'meals' && (
          <div className="animate-panel space-y-2 border-t border-zinc-800/80 p-3">
            {NUTRITION_PLAN.meals.map((meal) => (
              <div
                key={meal.timing}
                className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-2.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-zinc-100">{meal.timing}</span>
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                    {meal.macros}
                  </span>
                </div>
                <div className="mt-1 text-zinc-300">
                  <span className="text-zinc-500">Veg: </span>
                  {meal.insideHome}
                </div>
                {meal.outsideHome !== '—' && (
                  <div className="mt-0.5 text-emerald-300">
                    <span className="font-semibold">Stealth: </span>
                    {meal.outsideHome}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Movement Ban List */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-900/90">
        <button
          type="button"
          onClick={() => toggle('bans')}
          className="flex w-full items-center justify-between px-3.5 py-3 text-left active:bg-zinc-800/40"
        >
          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-rose-400">
            <Ban className="h-3.5 w-3.5" />
            6-Week Ban List vs. Swaps
          </div>
          <ChevronDown
            className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${
              openSection === 'bans' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openSection === 'bans' && (
          <div className="animate-panel space-y-2 border-t border-zinc-800/80 p-3">
            {MOVEMENT_BAN_LIST.map((item) => (
              <div
                key={item.ban}
                className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-2.5 text-xs"
              >
                <div className="text-rose-300">
                  <span className="font-bold">BAN: </span>
                  {item.ban}
                </div>
                <div className="mt-1 flex items-start gap-1 text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <span className="font-bold">USE: </span>
                    {item.use}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Root-Cause Map */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-900/90">
        <button
          type="button"
          onClick={() => toggle('root')}
          className="flex w-full items-center justify-between px-3.5 py-3 text-left active:bg-zinc-800/40"
        >
          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
            Biomechanical Root-Cause Map
          </span>
          <ChevronDown
            className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${
              openSection === 'root' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openSection === 'root' && (
          <div className="animate-panel grid grid-cols-1 gap-2 border-t border-zinc-800/80 p-3 sm:grid-cols-2">
            {ROOT_CAUSE_MAP.map((box) => (
              <div
                key={box.num}
                className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-2.5 text-xs"
              >
                <div className="font-bold text-zinc-100">
                  {box.num}. {box.title}
                </div>
                <ul className="mt-1 space-y-0.5 text-zinc-400">
                  {box.bullets.map((b) => (
                    <li key={b}>• {b}</li>
                  ))}
                </ul>
                <div className="mt-1.5 font-bold text-amber-400">{box.fix}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 4: 8-Month Roadmap */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-900/90">
        <button
          type="button"
          onClick={() => toggle('roadmap')}
          className="flex w-full items-center justify-between px-3.5 py-3 text-left active:bg-zinc-800/40"
        >
          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-400">
            <Compass className="h-3.5 w-3.5" />
            8-Month Plyo & Running Roadmap
          </div>
          <ChevronDown
            className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${
              openSection === 'roadmap' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openSection === 'roadmap' && (
          <div className="animate-panel space-y-2 border-t border-zinc-800/80 p-3">
            {EIGHT_MONTH_ROADMAP.map((stage) => (
              <div
                key={stage.phase}
                className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-2.5 text-xs"
              >
                <div className="font-bold text-zinc-100">{stage.phase}</div>
                <p className="mt-0.5 leading-relaxed text-zinc-400">
                  {stage.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
