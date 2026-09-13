/**
 * ItemInstance — one concrete piece of loot: base item + rarity + affixes.
 * Plain data (serializes straight into the save file).
 */
import {
  AFFIX_POOLS,
  AFFIX_RANGES,
  BASE_ITEMS,
  LEGENDARY_PASSIVES,
  RARITY_AFFIX_COUNT,
  RARITY_STAT_MULT,
  RARITY_VALUE_MULT,
  ROLLABLE_PASSIVES,
  SELL_FRACTION,
  baseItemId,
  itemBaseValue,
  type AffixStat,
  type BaseStats,
  type LegendaryPassiveId,
  type Rarity,
  type Slot,
} from '../config/ItemDefs';

export interface Affix {
  stat: AffixStat;
  /** Flat value, or %-points for critChance/skillDamage/goldGain. */
  value: number;
}

export interface ItemInstance {
  uid: number;
  baseId: string;
  rarity: Rarity;
  affixes: Affix[];
  legendaryPassive?: LegendaryPassiveId;
}

let nextUid = 1;

/** Base stats after the rarity multiplier (before slot enhancement). */
export function resolvedBaseStats(item: ItemInstance): BaseStats {
  const def = BASE_ITEMS[item.baseId];
  const mult = RARITY_STAT_MULT[item.rarity];
  const out: BaseStats = {};
  (Object.keys(def.base) as Array<keyof BaseStats>).forEach((k) => {
    const v = def.base[k];
    if (v !== undefined) out[k] = Math.round(v * mult * 10) / 10;
  });
  return out;
}

export function itemSlot(item: ItemInstance): Slot {
  return BASE_ITEMS[item.baseId].slot;
}

export function itemTier(item: ItemInstance): number {
  return BASE_ITEMS[item.baseId].tier;
}

export function itemName(item: ItemInstance): string {
  return BASE_ITEMS[item.baseId].name;
}

/** Sell value = round(baseValue × 0.35 × rarity mult). Relics are never sold. */
export function itemSellValue(item: ItemInstance): number {
  const def = BASE_ITEMS[item.baseId];
  return Math.max(
    1,
    Math.round(itemBaseValue(def.slot, def.tier) * SELL_FRACTION * RARITY_VALUE_MULT[item.rarity]),
  );
}

function rollAffixValue(stat: AffixStat, tier: number): number {
  const range = AFFIX_RANGES[stat];
  const scale = 1 + 0.12 * (tier - 1);
  const raw = range.min + Math.random() * (range.max - range.min);
  return Math.max(1, Math.round(raw * scale));
}

/** Roll one affix from the slot's logical pool (no duplicate stats). */
function rollAffixes(slot: Slot, tier: number, count: number): Affix[] {
  const pool = [...AFFIX_POOLS[slot]];
  const out: Affix[] = [];
  while (out.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    const stat = pool.splice(idx, 1)[0];
    out.push({ stat, value: rollAffixValue(stat, tier) });
  }
  return out;
}

export interface GeneratedItem {
  baseId: string;
  rarity: Rarity;
}

/** Create an instance from base+rarity (affixes/passive rolled automatically). */
export function createItem(baseId: string, rarity: Rarity): ItemInstance {
  const def = BASE_ITEMS[baseId];
  const item: ItemInstance = {
    uid: nextUid++,
    baseId,
    rarity,
    affixes: rollAffixes(def.slot, def.tier, RARITY_AFFIX_COUNT[rarity]),
  };
  if (rarity === 'legendary') {
    item.legendaryPassive =
      ROLLABLE_PASSIVES[Math.floor(Math.random() * ROLLABLE_PASSIVES.length)];
  }
  return item;
}

/** Roll a random equipment drop for a floor (tier == floor in Phase 2). */
export function rollDrop(rarity: Rarity, tier: number, slot: Slot): ItemInstance {
  return createItem(baseItemId(slot, tier), rarity);
}

/** Display name of a legendary passive (empty for non-legendary). */
export function passiveName(item: ItemInstance): string {
  if (!item.legendaryPassive) return '';
  return LEGENDARY_PASSIVES[item.legendaryPassive].name;
}

// ---------------------------------------------------------------------------
// Item Power (auto-equip + comparison; slot-specific weights)
// ---------------------------------------------------------------------------

interface Weights {
  attack: number;
  defense: number;
  hp: number;
  mp: number;
  moveSpeed: number;
  critChance: number;
  skillDamage: number;
  attackSpeed: number;
  str: number;
  agi: number;
  crit: number;
  int: number;
  goldGain: number;
  dodge: number;
  damageReduction: number;
  critDamage: number;
  bossDamage: number;
}

const SLOT_WEIGHTS: Record<Slot, Weights> = {
  weapon: { attack: 10, defense: 0, hp: 0.5, mp: 0.3, moveSpeed: 0, critChance: 60, skillDamage: 40, attackSpeed: 40, str: 6, agi: 3, crit: 5, int: 5, goldGain: 2, dodge: 0, damageReduction: 0, critDamage: 30, bossDamage: 10 },
  armor: { attack: 0, defense: 10, hp: 0.8, mp: 0.3, moveSpeed: 0, critChance: 0, skillDamage: 0, attackSpeed: 0, str: 4, agi: 3, crit: 2, int: 2, goldGain: 2, dodge: 50, damageReduction: 60, critDamage: 0, bossDamage: 0 },
  boots: { attack: 0, defense: 6, hp: 0.6, mp: 0.2, moveSpeed: 120, critChance: 0, skillDamage: 0, attackSpeed: 0, str: 2, agi: 6, crit: 2, int: 2, goldGain: 2, dodge: 60, damageReduction: 0, critDamage: 0, bossDamage: 0 },
  accessory: { attack: 8, defense: 6, hp: 0.7, mp: 0.5, moveSpeed: 0, critChance: 70, skillDamage: 50, attackSpeed: 30, str: 5, agi: 4, crit: 6, int: 6, goldGain: 4, dodge: 40, damageReduction: 0, critDamage: 20, bossDamage: 8 },
};

export interface ResolvedItem {
  attack: number;
  defense: number;
  hp: number;
  mp: number;
  moveSpeed: number;
  critChance: number;
  skillDamage: number;
  attackSpeed: number;
  str: number;
  agi: number;
  crit: number;
  int: number;
  goldGain: number;
  dodge: number;
  damageReduction: number;
  critDamage: number;
  bossDamage: number;
}

/** Fully resolved stats incl. affixes + intrinsic (BEFORE slot enhancement). */
export function resolveItem(item: ItemInstance): ResolvedItem {
  return resolveEnhanced(item, 0);
}

/** Rarity-scaled base + intrinsic, no affixes. */
export function resolveBase(item: ItemInstance): ResolvedItem {
  const def = BASE_ITEMS[item.baseId];
  const base = resolvedBaseStats(item);
  return {
    attack: base.attack ?? 0,
    defense: base.defense ?? 0,
    hp: base.hp ?? 0,
    mp: base.mp ?? 0,
    moveSpeed: base.moveSpeed ?? 0,
    critChance: base.critChance ?? 0,
    skillDamage: (base.skillDamage ?? 0) + (def.intrinsic?.skillDamage ?? 0),
    attackSpeed: base.attackSpeed ?? 0,
    str: 0,
    agi: 0,
    crit: 0,
    int: 0,
    goldGain: 0,
    dodge: def.intrinsic?.dodge ?? 0,
    damageReduction: def.intrinsic?.damageReduction ?? 0,
    critDamage: def.intrinsic?.critDamage ?? 0,
    bossDamage: def.intrinsic?.bossDamage ?? 0,
  };
}

/**
 * Base stats scaled by slot enhancement (+12%/level), affixes added raw.
 * Enhancement boosts the item's BASE main stat only — never the affixes.
 */
export function resolveEnhanced(item: ItemInstance, enhanceLevel: number, perLevel = 0.12): ResolvedItem {
  const r = resolveBase(item);
  const mult = 1 + perLevel * enhanceLevel;
  (Object.keys(r) as Array<keyof ResolvedItem>).forEach((k) => {
    r[k] = (r[k] as number) * mult;
  });
  for (const affix of item.affixes) {
    (r[affix.stat] as number) += affix.value;
  }
  return r;
}

/** Single power number for auto-equip comparison (slot-weighted). */
export function itemPower(item: ItemInstance, enhanceLevel = 0, enhanceBonusPerLevel = 0.12): number {
  const slot = itemSlot(item);
  const w = SLOT_WEIGHTS[slot];
  const r = resolveEnhanced(item, enhanceLevel, enhanceBonusPerLevel);
  let power = 0;
  (Object.keys(w) as Array<keyof Weights>).forEach((k) => {
    power += (r[k] as number) * w[k];
  });
  return power;
}
