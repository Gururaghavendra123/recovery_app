export type Feeling = 'easy' | 'medium' | 'hard';

export interface SliderSpec {
  min: number;
  max: number;
  step: number;
  defaultVal: number;
  zeroLabel?: string;
  prefix?: string;
  unit: string;
}

export interface ExercisePhase {
  weeks: [number, number];
  name: string;
  targetText: string;
  cue: string;
  weight?: SliderSpec;
  reps?: SliderSpec;
  durationSec?: SliderSpec;
  distanceM?: SliderSpec;
}

export interface ExerciseDef {
  id: string;
  orderLabel: string;
  tableName: string;
  summary: string;
  setsCount: number;
  setLabels?: string[];
  restSeconds: number;
  targetRepsNote?: string;
  targetRepRange?: [number, number];
  supersetTag?: string;
  defaultWeight?: SliderSpec;
  defaultReps?: SliderSpec;
  defaultDurationSec?: SliderSpec;
  defaultDistanceM?: SliderSpec;
  defaultCue: string;
  targetText: string;
  phases?: ExercisePhase[];
}

export interface WorkoutDayDef {
  id: number;
  dayName: string;
  shortTitle: string;
  title: string;
  focus: string;
  ruleTitle?: string;
  ruleText?: string;
  exercises: ExerciseDef[];
}

export interface WarmupItemDef {
  id: string;
  order: number;
  title: string;
  prescription: string;
  details: string;
  timerSeconds?: number;
}

export interface MealItemDef {
  timing: string;
  insideHome: string;
  outsideHome: string;
  macros: string;
}

export interface ResolvedExercise {
  def: ExerciseDef;
  name: string;
  targetText: string;
  cue: string;
  setsCount: number;
  setLabels: string[];
  isDeload: boolean;
  weightSpec?: SliderSpec;
  repsSpec?: SliderSpec;
  durationSpec?: SliderSpec;
  distanceSpec?: SliderSpec;
}

export function isDeloadWeek(week: number): boolean {
  return week === 8 || week === 16;
}

export function resolveExerciseForWeek(def: ExerciseDef, week: number): ResolvedExercise {
  const deload = isDeloadWeek(week);
  const phase = def.phases?.find((p) => week >= p.weeks[0] && week <= p.weeks[1]);

  const name = phase ? phase.name : def.tableName;
  const targetText = phase ? phase.targetText : def.targetText;
  const cue = phase ? phase.cue : def.defaultCue;

  const weightSpec = phase && 'weight' in phase ? phase.weight : def.defaultWeight;
  const repsSpec = phase && 'reps' in phase ? phase.reps : def.defaultReps;
  const durationSpec = phase && 'durationSec' in phase ? phase.durationSec : def.defaultDurationSec;
  const distanceSpec = phase && 'distanceM' in phase ? phase.distanceM : def.defaultDistanceM;

  let setsCount = def.setsCount;
  let setLabels = def.setLabels
    ? [...def.setLabels]
    : Array.from({ length: setsCount }, (_, i) => `Set ${i + 1}`);

  if (deload && setsCount > 1) {
    if (def.id === 'd1-e7') {
      setLabels = ['R1', 'R2', 'R3', 'R4', 'L1', 'L2'];
      setsCount = setLabels.length;
    } else {
      setsCount = setsCount - 1;
      setLabels = setLabels.slice(0, setsCount);
    }
  }

  return {
    def,
    name,
    targetText,
    cue,
    setsCount,
    setLabels,
    isDeload: deload,
    weightSpec,
    repsSpec,
    durationSpec,
    distanceSpec,
  };
}

export const ATHLETE_PROFILE = {
  title: 'AESTHETIC ATHLETE & POSTURE REBUILD',
  subtitle: '8-Month Blueprint • 16-Week Hypertrophy + ATG Logbook',
  phaseBadge: 'PHASE 1–3: RECOMP & PLYO',
  athlete: '21Y Male • 69–70 kg',
  bodyFat: '18% → 12% Target',
  pullBase: '+20 kg Pull-Up Base',
  primaryFixes: 'APT, Groin, L Ankle/Scapula',
  deadline: '8-Mo Corporate Armor',
  targetRir: '1–2 RIR',
  deloadRule: 'W8 & W16 Deload: -15% weight, -1 set.',
};

export const ROOT_CAUSE_MAP = [
  {
    num: 1,
    title: 'Left Ankle & Flat Arch',
    bullets: ['Collapsed arch + tight Achilles', 'Limited tibia glide', 'Weak eyes-closed L balance'],
    fix: 'FIX: KOT Split Squat & Pogos',
  },
  {
    num: 2,
    title: 'Locked Groin & APT',
    bullets: ['Pelvis dumps forward (APT)', 'Adductors lock; bike hip pinch', 'Bottom-squat butt wink'],
    fix: 'FIX: Zercher, Seated GM, Pancake',
  },
  {
    num: 3,
    title: 'Right QL & Outer Hip',
    bullets: ['Left leg under-absorbs impact', 'Right QL spasms', 'Tight outer hips (TFL)'],
    fix: 'FIX: Copenhagen & Side Plank',
  },
  {
    num: 4,
    title: 'Ribs & Left Scapula',
    bullets: ['Flared ribs block diaphragm', 'Lats overpower serratus', 'Left scapula wings; dips pinch'],
    fix: 'FIX: Push-Up Plus & Hollow Pull',
  },
];

export const MOVEMENT_BAN_LIST = [
  {
    ban: 'Parallel Bar Dips (pinches left shoulder while scapula wings)',
    use: 'Incline DB Press, Push-Up Plus & Overhead Rope Ext.',
  },
  {
    ban: 'Low-Bar Squats & Floor Deadlifts (feeds lumbar arch & butt-wink)',
    use: 'Heel-Elevated Zercher Squat & High-Handle Trap-Bar Deadlift',
  },
  {
    ban: 'Standing Toe-Touch Stretches (worsens APT & right QL pain)',
    use: '90/90 Wall Breathing, Seated Good Mornings & Seated Pancake',
  },
];

export const DAILY_WARMUP_ITEMS: WarmupItemDef[] = [
  {
    id: 'wu-1',
    order: 1,
    title: '90/90 Wall Breathing + Hamstring Drag',
    prescription: '2 × 5 breaths',
    details:
      'Heels on wall (90°), drag down to lift tailbone 1". 4s silent nose inhale into upper back; 8s hard exhale until ribs drop flat & deep abs shake.',
  },
  {
    id: 'wu-2',
    order: 2,
    title: 'Barefoot "Short-Foot" Balance',
    prescription: '2×40s L, 1×40s R',
    details:
      'Press big toe knuckle & heel into floor to dome arch (no toe curl). Unlock knee 5°; close eyes final 15s.',
    timerSeconds: 40,
  },
  {
    id: 'wu-3',
    order: 3,
    title: 'Knee-to-Wall Ankle Rocks',
    prescription: '2 × 12/side',
    details:
      'Foot 4" from wall. Drive knee past pinky toe with heel glued down; 2s pause.',
  },
  {
    id: 'wu-4',
    order: 4,
    title: 'Deep Squat Goblet Groin Pry',
    prescription: '2 × 30s',
    details:
      'Heels on 2.5 kg plates, hold 10–12 kg KB. Ribs tucked, spine tall; push knees out with elbows in 5s pulses.',
    timerSeconds: 30,
  },
  {
    id: 'wu-5',
    order: 5,
    title: '90/90 Hip Switches → Pancake',
    prescription: '2 × 8 + 30s',
    details:
      'Rotate knees side-to-side 8× tall. Straddle wide (sit on block if back rounds), lock knees, hinge flat-backed w/ light DB.',
    timerSeconds: 30,
  },
  {
    id: 'wu-6',
    order: 6,
    title: 'Forearm Wall Slides (Serratus)',
    prescription: '2 × 10 reps',
    details:
      'Forearms on wall, ribs down. Push into wall to spread scapulae; slide up 6" in a V-shape without shrugging traps.',
  },
];

export const NUTRITION_PLAN: {
  targetSummary: string;
  meals: MealItemDef[];
} = {
  targetSummary: '~2,000 KCAL • 140g P • 200g C • 55g F',
  meals: [
    {
      timing: '1. Breakfast (8:00 AM)',
      insideHome: '2 Idlis + Sambar + 1 Scoop Whey + 1 tsp Chia in water + Black coffee/tea',
      outsideHome: '—',
      macros: '30g P • 380 kcal',
    },
    {
      timing: '2. Lunch (1:00 PM)',
      insideHome: '100g Rice/Quinoa + Poriyal + 50g Soya Chunks or 150g Low-Fat Paneer',
      outsideHome: '150g Grilled Chicken Breast/Tikka (no mayo) + 1 chapati or 100g rice',
      macros: '35–40g P • 570 kcal',
    },
    {
      timing: '3. Pre-Gym (4:45 PM)',
      insideHome: '1–2 Elakki Bananas + 300ml water w/ 1/4 tsp salt & lemon',
      outsideHome: '—',
      macros: '2g P • 120 kcal',
    },
    {
      timing: '4. Post-Gym (7:00 PM)',
      insideHome: '1 Scoop Whey in water',
      outsideHome: '3 Whole Boiled Eggs + 4 Boiled Egg Whites (stall before home)',
      macros: '54g P • 390 kcal',
    },
    {
      timing: '5. Dinner (8:30 PM)',
      insideHome: '2 Chapatis/Dosas or 100g Quinoa/Rice + Dal/Rasam + 300g Curd/Skyr + 1 Guava',
      outsideHome: '—',
      macros: '20g P • 520 kcal',
    },
  ],
};

export const DAILY_ARMOR_RULES = [
  {
    title: 'Bike Mounting Fix',
    text: 'Exhale ribs down + squeeze left glute 2s before swinging leg over bike.',
  },
  {
    title: 'Standing Armor',
    text: 'Keep knees unlocked 2°, 60% weight in heels, lower abs lightly braced.',
  },
  {
    title: 'Step Target',
    text: '8,500–10,000 steps/day. Walk 10 min briskly after lunch & dinner.',
  },
];

export const EIGHT_MONTH_ROADMAP = [
  {
    phase: 'Months 1–2 (W1–8 • Tendon Base)',
    text: 'Zero road running. Wed & Sat: 25m Incline Walk (8%, 4.5 km/h) or Bike, nasal breathing. Master Zercher depth, Seated GM & 45s eyes-closed L balance.',
  },
  {
    phase: 'Months 3–4 (W9–16 • Run-Walk)',
    text: 'Progress to Box Jumps (Day 1) & Lateral Bounds (Day 3). Wed & Sat: 3m brisk mid-foot run (pelvis tucked) + 1m walk × 6 rounds.',
  },
  {
    phase: 'Months 5–8 (Cycle 2 + Desk Armor)',
    text: 'Progress to Depth Drops/Jumps, Broad Jumps & 5–8 km runs. Month 8 job: stand 60s every hour (15s glute squeeze + reach) + 2m Groin Pry nightly.',
  },
];

export const WORKOUT_DAYS: WorkoutDayDef[] = [
  {
    id: 1,
    dayName: 'Day 1',
    shortTitle: 'Day 1 • Lower A',
    title: 'Zercher, Trap-Bar & Groin/Pancake',
    focus: 'Quad/Glute Mass • Groin Unlock • Ankle Stiffness',
    exercises: [
      {
        id: 'd1-e1',
        orderLabel: 'A1',
        tableName: 'Ankle Pogos → Box Jumps',
        summary: 'W1–6: Pogos | W7–16: Box Jump',
        setsCount: 3,
        restSeconds: 45,
        targetText: '3 × 20s / 5 (45s)',
        defaultCue:
          'Bounce off balls of feet, stiff knees, zero heel touch. Bias 55% effort into left ankle.',
        phases: [
          {
            weeks: [1, 6],
            name: 'Ankle Pogo Hops (Stiff Pogos)',
            targetText: '3 × 20s (45s rest)',
            cue: 'Bounce off balls of feet, stiff knees, zero heel touch. Bias 55% effort into left ankle.',
            durationSec: { min: 10, max: 45, step: 5, defaultVal: 20, unit: 's' },
          },
          {
            weeks: [7, 16],
            name: 'Low Box Jump w/ Step-Down',
            targetText: '3 × 5 reps (45s rest)',
            cue: 'Explosive jump to low box, quiet stick, controlled step-down. Bias left ankle.',
            reps: { min: 1, max: 12, step: 1, defaultVal: 5, unit: 'reps' },
          },
        ],
      },
      {
        id: 'd1-e2',
        orderLabel: 'B1',
        tableName: 'Trap-Bar Deadlift',
        summary: 'High handles • Ribs stacked • 2s lower',
        setsCount: 4,
        restSeconds: 150,
        targetText: '4 × 6–8 (150s)',
        targetRepRange: [6, 8],
        defaultWeight: { min: 20, max: 180, step: 2.5, defaultVal: 60, unit: 'kg' },
        defaultReps: { min: 1, max: 15, step: 1, defaultVal: 8, unit: 'reps' },
        defaultCue:
          'Exhale ribs down, grip high handles, drive floor away. Squeeze glutes at top—no lumbar arch. Add 2.5–5 kg when all sets hit 8 reps.',
      },
      {
        id: 'd1-e3',
        orderLabel: 'C1',
        tableName: 'Heel-Elevated Zercher Squat',
        summary: 'Heels on plates • 3s down • 2s pause',
        setsCount: 4,
        restSeconds: 120,
        targetText: '4 × 8–10 (120s)',
        targetRepRange: [8, 10],
        defaultWeight: { min: 20, max: 140, step: 2.5, defaultVal: 40, unit: 'kg' },
        defaultReps: { min: 1, max: 15, step: 1, defaultVal: 8, unit: 'reps' },
        defaultCue:
          'Bar in elbow crooks (pad/towel), fists to chin, heels on 2.5 kg plates. 3s lower, 2s bottom pause with flat lower back.',
      },
      {
        id: 'd1-e4',
        orderLabel: 'D1',
        tableName: 'ATG Seated Good Morning',
        summary: 'Wide bench stance • 3s lower • 2s pause',
        setsCount: 3,
        restSeconds: 75,
        targetText: '3 × 10–12 (75s)',
        targetRepRange: [10, 12],
        defaultWeight: { min: 5, max: 80, step: 2.5, defaultVal: 20, unit: 'kg' },
        defaultReps: { min: 1, max: 18, step: 1, defaultVal: 10, unit: 'reps' },
        defaultCue:
          'Bench edge, feet wide (45° out), flat/arched lower back. Hinge belly button between thighs until groin stretches; pause 2s.',
      },
      {
        id: 'd1-e5',
        orderLabel: '—',
        tableName: 'Swiss Ball Hamstring Curl',
        summary: 'Posterior pelvic tuck • Glutes tight',
        setsCount: 3,
        restSeconds: 60,
        targetText: '3 × 12–15 (60s)',
        targetRepRange: [12, 15],
        defaultWeight: { min: 0, max: 30, step: 2.5, defaultVal: 0, zeroLabel: 'BW', unit: 'kg' },
        defaultReps: { min: 1, max: 25, step: 1, defaultVal: 12, unit: 'reps' },
        defaultCue: 'Hold posterior pelvic tuck and keep glutes squeezed every rep.',
      },
      {
        id: 'd1-e6',
        orderLabel: 'E1',
        tableName: 'Loaded Seated Pancake',
        summary: 'Wide straddle • Flat back KB reach',
        setsCount: 3,
        restSeconds: 60,
        supersetTag: 'Superset E1 + E2',
        targetText: '3 × 10 + 20s hold',
        targetRepsNote: '+ 20s hold',
        defaultWeight: { min: 0, max: 30, step: 2.5, defaultVal: 5, zeroLabel: 'BW', unit: 'kg' },
        defaultReps: { min: 1, max: 20, step: 1, defaultVal: 10, unit: 'reps' },
        defaultCue:
          'Wide straddle on floor w/ 5–10 kg plate/KB. Hinge forward 10 slow breaths/pulses + 20s hold, then Side Planks.',
      },
      {
        id: 'd1-e7',
        orderLabel: 'E2',
        tableName: 'Short-Lever Side Plank',
        summary: '5 sets Right • 3 sets Left',
        setsCount: 8,
        setLabels: ['R1', 'R2', 'R3', 'R4', 'R5', 'L1', 'L2', 'L3'],
        restSeconds: 45,
        supersetTag: 'Superset E1 + E2',
        targetText: '5R / 3L × 30s',
        defaultDurationSec: { min: 10, max: 60, step: 5, defaultVal: 30, unit: 's' },
        defaultCue: 'Knees bent 90°. Hit 2 extra sets on weak right side (5R / 3L × 30s).',
      },
    ],
  },
  {
    id: 2,
    dayName: 'Day 2',
    shortTitle: 'Day 2 • Upper A',
    title: 'Inner Chest, Serratus & Scapula',
    focus: 'Sternal/Clavicular Mass • Left Scapula Fix',
    ruleTitle: 'Left Shoulder Rule',
    ruleText:
      'Start unilateral sets Left arm first & match Right reps. Let shoulder blades protract naturally on the top 2" of presses.',
    exercises: [
      {
        id: 'd2-e1',
        orderLabel: 'A1',
        tableName: 'Cable Serratus Punch',
        summary: 'Left first • 2s protraction hold',
        setsCount: 3,
        restSeconds: 45,
        targetText: '3 × 12/side (45s)',
        targetRepRange: [12, 12],
        defaultWeight: { min: 2.5, max: 35, step: 2.5, defaultVal: 7.5, unit: 'kg' },
        defaultReps: { min: 1, max: 20, step: 1, defaultVal: 12, unit: 'reps' },
        defaultCue:
          'Left first! Cable at shoulder height, ribs down. Punch extra 2" forward at lockout (2s hold) without twisting torso.',
      },
      {
        id: 'd2-e2',
        orderLabel: 'B1',
        tableName: '30° Incline DB Press',
        summary: '45° elbow tuck • Ribs flat',
        setsCount: 4,
        restSeconds: 120,
        targetText: '4 × 8–10 (120s)',
        targetRepRange: [8, 10],
        defaultWeight: { min: 5, max: 50, step: 2.5, defaultVal: 15, unit: 'kg' },
        defaultReps: { min: 1, max: 15, step: 1, defaultVal: 8, unit: 'reps' },
        defaultCue:
          'Elbows 45° (never 90° flared), lower back flat on pad (feet on bench if needed). Stop 1" above chest.',
      },
      {
        id: 'd2-e3',
        orderLabel: 'C1',
        tableName: 'Chest-Supported DB Row',
        summary: '30° incline • 1s top squeeze',
        setsCount: 4,
        restSeconds: 90,
        targetText: '4 × 10–12 (90s)',
        targetRepRange: [10, 12],
        defaultWeight: { min: 5, max: 50, step: 2.5, defaultVal: 15, unit: 'kg' },
        defaultReps: { min: 1, max: 18, step: 1, defaultVal: 10, unit: 'reps' },
        defaultCue: 'Chest down on 30° bench. Pull elbows toward hips; pause 1s at top.',
      },
      {
        id: 'd2-e4',
        orderLabel: 'D1',
        tableName: 'Cross-Wrist Cable Fly',
        summary: 'Cross wrists at midline • 2s squeeze',
        setsCount: 3,
        restSeconds: 60,
        targetText: '3 × 12–15 (60s)',
        targetRepRange: [12, 15],
        defaultWeight: { min: 2.5, max: 30, step: 2.5, defaultVal: 7.5, unit: 'kg' },
        defaultReps: { min: 1, max: 20, step: 1, defaultVal: 12, unit: 'reps' },
        defaultCue:
          'Mid-to-high cables. Cross hands past each other at chest midline and squeeze 2 full seconds.',
      },
      {
        id: 'd2-e5',
        orderLabel: 'E1',
        tableName: 'Rope Face Pull (Ext. Rot.)',
        summary: 'To eyebrows • Thumbs point back',
        setsCount: 3,
        restSeconds: 45,
        supersetTag: 'Superset E1 + E2',
        targetText: '3 × 15 (45s)',
        targetRepRange: [15, 15],
        defaultWeight: { min: 2.5, max: 40, step: 2.5, defaultVal: 12.5, unit: 'kg' },
        defaultReps: { min: 1, max: 25, step: 1, defaultVal: 15, unit: 'reps' },
        defaultCue: 'Pull rope toward eyebrows while rotating thumbs backward; superset w/ Lateral Raises.',
      },
      {
        id: 'd2-e6',
        orderLabel: 'E2',
        tableName: 'Cable Lateral Raise',
        summary: 'Wrist height • Zero trap shrug',
        setsCount: 3,
        restSeconds: 60,
        supersetTag: 'Superset E1 + E2',
        targetText: '3 × 12–15 (60s)',
        targetRepRange: [12, 15],
        defaultWeight: { min: 1.25, max: 20, step: 1.25, defaultVal: 5, unit: 'kg' },
        defaultReps: { min: 1, max: 25, step: 1, defaultVal: 12, unit: 'reps' },
        defaultCue: 'Cable at wrist height; strict side delt raise with zero trap shrug.',
      },
      {
        id: 'd2-e7',
        orderLabel: 'F1',
        tableName: 'Swiss Ball Stir-the-Pot',
        summary: 'Glutes locked • Zero back sag',
        setsCount: 3,
        restSeconds: 60,
        targetText: '3 × 25–35s (60s)',
        defaultDurationSec: { min: 10, max: 60, step: 5, defaultVal: 30, unit: 's' },
        defaultCue: 'Forearms on ball, glutes tight, tailbone tucked. Draw slow small circles.',
      },
    ],
  },
  {
    id: 3,
    dayName: 'Day 3',
    shortTitle: 'Day 3 • Lower B',
    title: 'KOT Split Squat, Deep Squat & Copenhagen',
    focus: 'Left-Leg Symmetry • Mobility • Groin Strength',
    ruleTitle: 'Unilateral Symmetry Rule',
    ruleText:
      'Left leg sets rep ceiling (Split Squats, RDLs, Landings). Never add Right reps; do +1 extra Left set W1–6 until balance equals.',
    exercises: [
      {
        id: 'd3-e1',
        orderLabel: 'A1',
        tableName: '1-Leg Snap-Down → Bounds',
        summary: 'Left first • 3s silent stick',
        setsCount: 4,
        restSeconds: 60,
        targetText: '4 × 5/leg (60s)',
        targetRepRange: [5, 5],
        defaultReps: { min: 1, max: 12, step: 1, defaultVal: 5, unit: 'reps' },
        defaultCue:
          'Start Left! Snap onto 1 foot, freeze 3s silently with knee over middle toe & arch domed.',
        phases: [
          {
            weeks: [1, 6],
            name: 'Single-Leg Altitude Snap-Downs',
            targetText: '4 × 5/leg (60s rest)',
            cue: 'Start Left! Rise onto tiptoes, snap down onto 1 foot, freeze 3s silently (knee over toe, arch domed).',
            reps: { min: 1, max: 12, step: 1, defaultVal: 5, unit: 'reps' },
          },
          {
            weeks: [7, 16],
            name: 'Single-Leg Lateral Bounds',
            targetText: '4 × 5/leg (60s rest)',
            cue: 'Start Left! Bound laterally onto 1 foot, stick 3s silently (knee over toe, arch domed).',
            reps: { min: 1, max: 12, step: 1, defaultVal: 5, unit: 'reps' },
          },
        ],
      },
      {
        id: 'd3-e2',
        orderLabel: 'B1',
        tableName: 'KOT (ATG) Split Squat',
        summary: 'Knee max over toes • Back hip open',
        setsCount: 4,
        restSeconds: 90,
        targetText: '4 × 8–10/leg (90s)',
        targetRepRange: [8, 10],
        defaultWeight: { min: 0, max: 45, step: 2.5, defaultVal: 0, zeroLabel: 'BW', unit: 'kg' },
        defaultReps: { min: 1, max: 16, step: 1, defaultVal: 8, unit: 'reps' },
        defaultCue:
          'Left leg first! Upright torso, drive knee max over toes (hamstring covers calf), keep back leg straight.',
        phases: [
          {
            weeks: [1, 4],
            name: 'KOT Split Squat (Elevated Front Foot)',
            targetText: '4 × 8–10/leg (90s rest)',
            cue: 'W1–4: Front foot on 4–6" step/plates. Start Left! Upright torso, knee max over toes, back leg straight.',
            weight: { min: 0, max: 40, step: 2.5, defaultVal: 0, zeroLabel: 'BW', unit: 'kg' },
            reps: { min: 1, max: 16, step: 1, defaultVal: 8, unit: 'reps' },
          },
          {
            weeks: [5, 16],
            name: 'KOT Split Squat (Flat Floor w/ DBs)',
            targetText: '4 × 8–10/leg (90s rest)',
            cue: 'W5–16: Flat floor w/ DBs. Start Left! Upright torso, knee max over toes, back leg straight.',
            weight: { min: 0, max: 45, step: 2.5, defaultVal: 10, zeroLabel: 'BW', unit: 'kg' },
            reps: { min: 1, max: 16, step: 1, defaultVal: 8, unit: 'reps' },
          },
        ],
      },
      {
        id: 'd3-e3',
        orderLabel: 'C1',
        tableName: 'Deep Heel-Elevated Squat',
        summary: 'Vertical torso • 3s hole pause',
        setsCount: 3,
        restSeconds: 90,
        targetText: '3 × 10–12 (90s)',
        targetRepRange: [10, 12],
        defaultWeight: { min: 5, max: 100, step: 2.5, defaultVal: 25, unit: 'kg' },
        defaultReps: { min: 1, max: 18, step: 1, defaultVal: 10, unit: 'reps' },
        defaultCue:
          'Goblet/Front squat on plates. Vertical spine, ribs tucked, hold bottom 3 full seconds.',
      },
      {
        id: 'd3-e4',
        orderLabel: 'D1',
        tableName: 'Kickstand (B-Stance) RDL',
        summary: 'Left first • Stop at mid-shin',
        setsCount: 3,
        restSeconds: 75,
        targetText: '3 × 10/leg (75s)',
        targetRepRange: [10, 10],
        defaultWeight: { min: 5, max: 80, step: 2.5, defaultVal: 25, unit: 'kg' },
        defaultReps: { min: 1, max: 16, step: 1, defaultVal: 10, unit: 'reps' },
        defaultCue:
          'Left first! 85% weight on front leg, back tiptoes by heel. Hinge to mid-shin without arching lower back.',
      },
      {
        id: 'd3-e5',
        orderLabel: 'E1',
        tableName: 'Copenhagen Adductor Plank',
        summary: 'Knee on bench • Slow dips + hold',
        setsCount: 3,
        restSeconds: 60,
        targetText: '3 × 8 + 15s/side',
        targetRepsNote: '+ 15s/side hold',
        defaultReps: { min: 1, max: 15, step: 1, defaultVal: 8, unit: 'reps' },
        defaultCue:
          'Top knee/shin on bench, elbow on floor. Lower hips 3" slowly, drive up + 15s hold per side.',
      },
      {
        id: 'd3-e6',
        orderLabel: 'F1',
        tableName: 'Standing Calf Raise',
        summary: '3s Achilles bottom stretch',
        setsCount: 4,
        restSeconds: 60,
        supersetTag: 'Superset F1 + F2',
        targetText: '4 × 12–15 (60s)',
        targetRepRange: [12, 15],
        defaultWeight: { min: 0, max: 120, step: 2.5, defaultVal: 30, zeroLabel: 'BW', unit: 'kg' },
        defaultReps: { min: 1, max: 25, step: 1, defaultVal: 12, unit: 'reps' },
        defaultCue: 'Pause 3 full seconds at the bottom stretch every rep; superset w/ Carry.',
      },
      {
        id: 'd3-e7',
        orderLabel: 'F2',
        tableName: 'Heavy Suitcase Carry',
        summary: '2 sets Left hand • 1 set Right hand',
        setsCount: 3,
        setLabels: ['Set 1 (Left)', 'Set 2 (Left)', 'Set 3 (Right)'],
        restSeconds: 60,
        supersetTag: 'Superset F1 + F2',
        targetText: '3 × 35m (60s)',
        defaultWeight: { min: 5, max: 60, step: 2.5, defaultVal: 20, unit: 'kg' },
        defaultDistanceM: { min: 10, max: 60, step: 5, defaultVal: 35, unit: 'm' },
        defaultCue: '2 sets Left hand, 1 set Right hand to fire right QL/obliques evenly.',
      },
    ],
  },
  {
    id: 4,
    dayName: 'Day 4',
    shortTitle: 'Day 4 • Upper B',
    title: 'Hollow Pull-Ups, Chest & Arm Aesthetics',
    focus: 'V-Taper Control • Lower Traps • Arms • Deep Core',
    exercises: [
      {
        id: 'd4-e1',
        orderLabel: 'A1',
        tableName: 'Hollow-Body Pull-Ups',
        summary: 'W1–4: BW | W5–16: Add Belt',
        setsCount: 4,
        restSeconds: 120,
        targetText: '4 × 6–8 (120s)',
        targetRepRange: [6, 8],
        defaultCue:
          'Toes 15° in front, glutes squeezed, ribs locked down. Hit 4×8 strict before adding +2.5 kg every 2 wks up to +20 kg.',
        phases: [
          {
            weeks: [1, 4],
            name: 'Hollow-Body Pull-Ups (Strict BW)',
            targetText: '4 × 6–8 (120s rest)',
            cue: 'W1–4 Strict BW: Toes 15° in front, glutes squeezed, ribs locked down (zero lumbar arch).',
            weight: { min: 0, max: 25, step: 2.5, defaultVal: 0, zeroLabel: 'BW', prefix: '+', unit: 'kg' },
            reps: { min: 1, max: 15, step: 1, defaultVal: 8, unit: 'reps' },
          },
          {
            weeks: [5, 16],
            name: 'Hollow-Body Pull-Ups (Weighted)',
            targetText: '4 × 6–8 (120s rest)',
            cue: 'W5–16 Belt: Add +2.5 kg every 2 wks up to +20 kg once 4×8 strict hollow reps are clean.',
            weight: { min: 0, max: 35, step: 2.5, defaultVal: 5, zeroLabel: 'BW', prefix: '+', unit: 'kg' },
            reps: { min: 1, max: 15, step: 1, defaultVal: 6, unit: 'reps' },
          },
        ],
      },
      {
        id: 'd4-e2',
        orderLabel: 'B1',
        tableName: 'Push-Up Plus → Flat DB Press',
        summary: 'W1–4: Push-Up+ | W5–16: Neutral DB',
        setsCount: 4,
        restSeconds: 90,
        targetText: '4 × 10–12 (90s)',
        targetRepRange: [10, 12],
        defaultCue:
          'W1–4: Push-Up Plus (+2" reach at top). W5–16: Flat Neutral-Grip DB Press (45° palms).',
        phases: [
          {
            weeks: [1, 4],
            name: 'Weighted Push-Up Plus',
            targetText: '4 × 10–12 (90s rest)',
            cue: 'W1–4: Push floor away an extra 2" at top every rep to build serratus.',
            weight: { min: 0, max: 35, step: 2.5, defaultVal: 0, zeroLabel: 'BW', prefix: '+', unit: 'kg' },
            reps: { min: 1, max: 20, step: 1, defaultVal: 10, unit: 'reps' },
          },
          {
            weeks: [5, 16],
            name: 'Flat Neutral-Grip DB Press',
            targetText: '4 × 10–12 (90s rest)',
            cue: 'W5–16: Palms angled 45° neutral; let scapulae protract on final 2".',
            weight: { min: 5, max: 50, step: 2.5, defaultVal: 17.5, unit: 'kg' },
            reps: { min: 1, max: 20, step: 1, defaultVal: 10, unit: 'reps' },
          },
        ],
      },
      {
        id: 'd4-e3',
        orderLabel: 'C1',
        tableName: 'Half-Kneeling Row + Prone Y',
        summary: '12 Rows + 10 Incline Y-Raises',
        setsCount: 3,
        restSeconds: 75,
        targetText: '3 × 12 + 10 (75s)',
        targetRepsNote: '+ 10 Prone Y (2.5kg)',
        targetRepRange: [12, 12],
        defaultWeight: { min: 2.5, max: 45, step: 2.5, defaultVal: 15, unit: 'kg' },
        defaultReps: { min: 1, max: 20, step: 1, defaultVal: 12, unit: 'reps' },
        defaultCue:
          '12 single-arm cable rows (ribs stacked), then 10 chest-down 30° Y-raises (2.5 kg plates, thumbs up, 2s hold).',
      },
      {
        id: 'd4-e4',
        orderLabel: 'D1',
        tableName: 'Overhead Rope Tricep Ext.',
        summary: 'Replaces dips • Deep stretch • Ribs down',
        setsCount: 3,
        restSeconds: 60,
        supersetTag: 'Superset D1 + D2',
        targetText: '3 × 12–15 (60s)',
        targetRepRange: [12, 15],
        defaultWeight: { min: 5, max: 50, step: 2.5, defaultVal: 17.5, unit: 'kg' },
        defaultReps: { min: 1, max: 25, step: 1, defaultVal: 12, unit: 'reps' },
        defaultCue: 'Deep long-head stretch with ribs locked down; replaces dips cleanly.',
      },
      {
        id: 'd4-e5',
        orderLabel: 'D2',
        tableName: 'Incline Dumbbell Curl',
        summary: 'Scapulae pinned • Full stretch',
        setsCount: 3,
        restSeconds: 60,
        supersetTag: 'Superset D1 + D2',
        targetText: '3 × 10–12 (60s)',
        targetRepRange: [10, 12],
        defaultWeight: { min: 2.5, max: 30, step: 2.5, defaultVal: 10, unit: 'kg' },
        defaultReps: { min: 1, max: 20, step: 1, defaultVal: 10, unit: 'reps' },
        defaultCue: 'Keep scapulae pinned back on incline bench; full bottom stretch.',
      },
      {
        id: 'd4-e6',
        orderLabel: 'Core',
        tableName: 'Deadbug w/ Band Pullover',
        summary: 'Lower back flat • 8s exhale/rep',
        setsCount: 3,
        restSeconds: 60,
        targetText: '3 × 8/side (60s)',
        targetRepRange: [8, 8],
        defaultWeight: { min: 0, max: 25, step: 2.5, defaultVal: 0, zeroLabel: 'Band', unit: 'kg' },
        defaultReps: { min: 1, max: 15, step: 1, defaultVal: 8, unit: 'reps' },
        defaultCue: 'Hold band/cable overhead, smash lower back flat into floor, exhale 8s per rep.',
      },
    ],
  },
];
