/**
 * SkillConfig — the 3 player skills. Damage formulas live here;
 * casting, cooldowns and projectiles live in Game/combat code.
 */
export type SkillId = 'power' | 'bolt' | 'heal';

export const SKILL_ORDER: SkillId[] = ['power', 'bolt', 'heal'];

export interface SkillDef {
  id: SkillId;
  name: string;
  maxLevel: 5;
  cooldown: number; // seconds
  manaCost: number;
  /** Short effect line for the skill bar tooltip / stats panel. */
  describe: (level: number) => string;
}

function fmt(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1);
}

/** Dash physics for Dash Slash. */
export const DASH_DISTANCE = 3.5;
export const DASH_SPEED = 20;
/** Berserk buff duration (seconds). */
export const BERSERK_DURATION = 15;

export const SKILL_DEFS: Record<SkillId, SkillDef> = {
  power: {
    id: 'power',
    name: 'Dash Slash',
    maxLevel: 5,
    cooldown: 7,
    manaCost: 10,
    describe: (level) => `Dash forward + triple slash: ${dashSlashMults(level).map(fmt).join(' / ')}x ATK`,
  },
  bolt: {
    id: 'bolt',
    name: 'Sword Rain',
    maxLevel: 5,
    cooldown: 10,
    manaCost: 14,
    describe: (level) => `Swords rain down: ${fmt(swordRainMult(level))}x (STR + INT), wide area`,
  },
  heal: {
    id: 'heal',
    name: 'Berserk',
    maxLevel: 5,
    cooldown: 45,
    manaCost: 20,
    describe: () => `${BERSERK_DURATION}s rage: ATK x1.5, Move x1.25, Skill x1.25, DEF x1.2`,
  },
};

/** Per-hit multipliers of Dash Slash's triple slash by skill level. */
export function dashSlashMults(level: number): [number, number, number] {
  const bonus = 1 + 0.12 * (level - 1);
  return [0.8 * bonus, 0.8 * bonus, 1.6 * bonus];
}

/** Multiplier on (STR + INT) for Sword Rain by skill level. */
export function swordRainMult(level: number): number {
  return 1 + 0.3 * (level - 1);
}
