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
      <div className="pixel-card p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="pixel-label border border-[#00f0ff] bg-[#00f0ff]/15 px-2 py-0.5 text-[#00f0ff] box-glow-cyan">
            {ATHLETE_PROFILE.phaseBadge}
          </span>
          <span className="font-[VT323] text-sm text-[#5a6a78]">
            {ATHLETE_PROFILE.deadline}
          </span>
        </div>
        <h2 className="mt-1 font-[VT323] text-xl font-bold text-[#c0f0ff]">
          {ATHLETE_PROFILE.title}
        </h2>
        <div className="mt-2.5 grid grid-cols-2 gap-1.5 font-[VT323] text-sm">
          <div className="border-2 border-[#2a2a40] bg-[#111118] px-2.5 py-1">
            <div className="pixel-label text-[7px] text-[#5a6a78]">Profile</div>
            <div className="font-bold text-[#c0f0ff]">{ATHLETE_PROFILE.athlete}</div>
          </div>
          <div className="border-2 border-[#2a2a40] bg-[#111118] px-2.5 py-1">
            <div className="pixel-label text-[7px] text-[#5a6a78]">Body Fat</div>
            <div className="font-bold text-[#ffe600]">{ATHLETE_PROFILE.bodyFat}</div>
          </div>
          <div className="border-2 border-[#2a2a40] bg-[#111118] px-2.5 py-1">
            <div className="pixel-label text-[7px] text-[#5a6a78]">Pull Base</div>
            <div className="font-bold text-[#c0f0ff]">{ATHLETE_PROFILE.pullBase}</div>
          </div>
          <div className="border-2 border-[#2a2a40] bg-[#111118] px-2.5 py-1">
            <div className="pixel-label text-[7px] text-[#5a6a78]">Primary Fixes</div>
            <div className="font-bold text-[#c0f0ff]">{ATHLETE_PROFILE.primaryFixes}</div>
          </div>
        </div>
      </div>

      {/* Section 1: 2,000 kcal Nutrition Plan */}
      <div className="pixel-card overflow-hidden">
        <button
          type="button"
          onClick={() => toggle('meals')}
          className="flex w-full items-center justify-between px-3.5 py-3 text-left active:bg-[#1a1a28]"
        >
          <div>
            <div className="flex items-center gap-1.5 pixel-label text-[#00f0ff]">
              <Utensils className="h-3.5 w-3.5" />
              2,000 kcal Meal Plan
            </div>
            <div className="mt-0.5 font-[VT323] text-sm text-[#5a6a78]">
              {NUTRITION_PLAN.targetSummary}
            </div>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-[#5a6a78] transition-transform duration-200 ${
              openSection === 'meals' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openSection === 'meals' && (
          <div className="animate-panel space-y-2 border-t-2 border-[#2a2a40] p-3">
            {NUTRITION_PLAN.meals.map((meal) => (
              <div
                key={meal.timing}
                className="border-2 border-[#2a2a40] bg-[#111118] p-2.5 font-[VT323] text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#c0f0ff]">{meal.timing}</span>
                  <span className="border border-[#00f0ff]/50 bg-[#00f0ff]/10 px-1.5 py-0.5 text-xs font-bold text-[#00f0ff]">
                    {meal.macros}
                  </span>
                </div>
                <div className="mt-1 text-[#c0f0ff]">
                  <span className="text-[#5a6a78]">Veg: </span>
                  {meal.insideHome}
                </div>
                {meal.outsideHome !== '—' && (
                  <div className="mt-0.5 text-[#39ff14]">
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
      <div className="pixel-card overflow-hidden">
        <button
          type="button"
          onClick={() => toggle('bans')}
          className="flex w-full items-center justify-between px-3.5 py-3 text-left active:bg-[#1a1a28]"
        >
          <div className="flex items-center gap-1.5 pixel-label text-[#ff2d95]">
            <Ban className="h-3.5 w-3.5" />
            6-Week Ban List vs. Swaps
          </div>
          <ChevronDown
            className={`h-4 w-4 text-[#5a6a78] transition-transform duration-200 ${
              openSection === 'bans' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openSection === 'bans' && (
          <div className="animate-panel space-y-2 border-t-2 border-[#2a2a40] p-3">
            {MOVEMENT_BAN_LIST.map((item) => (
              <div
                key={item.ban}
                className="border-2 border-[#2a2a40] bg-[#111118] p-2.5 font-[VT323] text-sm"
              >
                <div className="text-[#ff2d95]">
                  <span className="font-bold">BAN: </span>
                  {item.ban}
                </div>
                <div className="mt-1 flex items-start gap-1 text-[#39ff14]">
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
      <div className="pixel-card overflow-hidden">
        <button
          type="button"
          onClick={() => toggle('root')}
          className="flex w-full items-center justify-between px-3.5 py-3 text-left active:bg-[#1a1a28]"
        >
          <span className="pixel-label text-[#ffe600]">
            Biomechanical Root-Cause Map
          </span>
          <ChevronDown
            className={`h-4 w-4 text-[#5a6a78] transition-transform duration-200 ${
              openSection === 'root' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openSection === 'root' && (
          <div className="animate-panel grid grid-cols-1 gap-2 border-t-2 border-[#2a2a40] p-3 sm:grid-cols-2">
            {ROOT_CAUSE_MAP.map((box) => (
              <div
                key={box.num}
                className="border-2 border-[#2a2a40] bg-[#111118] p-2.5 font-[VT323] text-sm"
              >
                <div className="font-bold text-[#c0f0ff]">
                  {box.num}. {box.title}
                </div>
                <ul className="mt-1 space-y-0.5 text-[#5a6a78]">
                  {box.bullets.map((b) => (
                    <li key={b}>• {b}</li>
                  ))}
                </ul>
                <div className="mt-1.5 font-bold text-[#ffe600]">{box.fix}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 4: 8-Month Roadmap */}
      <div className="pixel-card overflow-hidden">
        <button
          type="button"
          onClick={() => toggle('roadmap')}
          className="flex w-full items-center justify-between px-3.5 py-3 text-left active:bg-[#1a1a28]"
        >
          <div className="flex items-center gap-1.5 pixel-label text-[#8b5cf6]">
            <Compass className="h-3.5 w-3.5" />
            8-Month Plyo & Running Roadmap
          </div>
          <ChevronDown
            className={`h-4 w-4 text-[#5a6a78] transition-transform duration-200 ${
              openSection === 'roadmap' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openSection === 'roadmap' && (
          <div className="animate-panel space-y-2 border-t-2 border-[#2a2a40] p-3">
            {EIGHT_MONTH_ROADMAP.map((stage) => (
              <div
                key={stage.phase}
                className="border-2 border-[#2a2a40] bg-[#111118] p-2.5 font-[VT323] text-sm"
              >
                <div className="font-bold text-[#c0f0ff]">{stage.phase}</div>
                <p className="mt-0.5 leading-relaxed text-[#5a6a78]">
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
