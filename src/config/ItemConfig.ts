/**
 * ItemConfig — potions, swords, relics and monster drop rates.
 * Rebalance drops/effects here; collection logic lives in Game/Inventory.
 */
export type RelicId = 'str' | 'agi' | 'crit' | 'int';

export const RELIC_ORDER: RelicId[] = ['str', 'agi', 'crit', 'int'];

export interface RelicDef {
  id: RelicId;
  name: string;
  /** Flat bonus to the stat while owned (passive, no equip needed). */
  statBonus: number;
  color: string;
  flavor: string;
}

export const RELIC_DEFS: Record<RelicId, RelicDef> = {
  str: { id: 'str', name: 'Ogre Charm', statBonus: 6, color: '#e05a4e', flavor: '+6 STR' },
  agi: { id: 'agi', name: 'Wind Feather', statBonus: 6, color: '#57e6c9', flavor: '+6 AGI' },
  crit: { id: 'crit', name: 'Hunter Eye', statBonus: 6, color: '#ffd75e', flavor: '+6 CRIT' },
  int: { id: 'int', name: 'Sage Rune', statBonus: 6, color: '#b14aed', flavor: '+6 INT' },
};

/** Sword names per tier (matches the brief's weapon progression). */
export const SWORD_NAMES = [
  'Rusty Sword', // 1
  'Iron Sword', // 2
  'Steel Sword', // 3
  'Knight Sword', // 4
  'Magic Sword', // 5
  'Runic Sword', // 6
  'Royal Sword', // 7
  'Abyss Sword', // 8
];

export function swordName(tier: number): string {
  return SWORD_NAMES[Math.min(8, Math.max(1, Math.round(tier))) - 1];
}

/** Bonus attack granted by an equipped sword of the given tier. */
export function swordAttackBonus(tier: number): number {
  const t = Math.min(8, Math.max(1, Math.round(tier)));
  return Math.round(2 * Math.pow(t, 1.5));
}

export const Potions = {
  maxStack: 99,
  /** Fraction of max HP/MP restored. */
  hpRestore: 0.4,
  mpRestore: 0.4,
  startingHP: 3,
  startingMP: 2,
  /** Gold per potion when sold. */
  sellPrice: 3,
} as const;

/** Drop chances per normal-monster kill (elites/bosses scale these later). */
export const DropRates = {
  hpPotion: 0.12,
  mpPotion: 0.1,
  sword: 0.03,
  relic: 0.015,
  /** Gold granted when a duplicate relic drops. */
  duplicateRelicGold: 50,
} as const;

/** Bag grid dimensions (icon slots) + spare-sword cap. */
export const Bag = {
  cols: 10,
  rows: 10,
  maxSpareSwords: 90,
} as const;

/** Gold received for selling a sword of the given tier. */
export function swordSellPrice(tier: number): number {
  const t = Math.min(8, Math.max(1, Math.round(tier)));
  return 4 * t * t;
}
