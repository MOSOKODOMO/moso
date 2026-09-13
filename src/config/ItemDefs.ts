/**
 * ItemDefs — the full core catalogue (Phase 2 foundation for all 8 floors):
 * 32 standard equipment items (8/slot) + 8 floor relics + 6 consumables.
 * Rarity exists as a MODIFIER on a base item (no duplicate assets per rarity).
 * Rebalance here; generation/equipment logic lives in items/.
 */

export type Slot = 'weapon' | 'armor' | 'boots' | 'accessory';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const SLOT_ORDER: Slot[] = ['weapon', 'armor', 'boots', 'accessory'];
export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const SLOT_LABELS: Record<Slot, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  boots: 'Boots',
  accessory: 'Accessory',
};

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'COMMON',
  uncommon: 'UNCOMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
};

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#cfd2dc',
  uncommon: '#7ee081',
  rare: '#6fb7ff',
  epic: '#c77dff',
  legendary: '#ffb347',
};

/** Base-stat multiplier per rarity (affixes/passives stack on top). */
export const RARITY_STAT_MULT: Record<Rarity, number> = {
  common: 1.0,
  uncommon: 1.08,
  rare: 1.18,
  epic: 1.32,
  legendary: 1.5,
};

/** Sell-value multiplier per rarity (applied over 35% of base value). */
export const RARITY_VALUE_MULT: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.4,
  rare: 2.2,
  epic: 4,
  legendary: 8,
};

/** Number of affixes granted per rarity. */
export const RARITY_AFFIX_COUNT: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 1,
  epic: 2,
  legendary: 2,
};

// ---------------------------------------------------------------------------
// Base stats & intrinsics
// ---------------------------------------------------------------------------

/** Flat base stats an item can carry. Percent stats are %-points (e.g. 2 = +2%). */
export interface BaseStats {
  attack?: number;
  defense?: number;
  hp?: number;
  mp?: number;
  moveSpeed?: number; // %-points
  critChance?: number; // %-points
  skillDamage?: number; // %-points
  attackSpeed?: number; // %-points (faster basic attacks)
}

/** Built-in special bonuses (never rerolled, scale with nothing but tier). */
export interface Intrinsic {
  skillDamage?: number; // %-points
  critDamage?: number; // %-points added to crit multiplier
  bossDamage?: number; // %-points vs bosses
  dodge?: number; // %-points
  damageReduction?: number; // %-points
}

export interface BaseItemDef {
  id: string;
  name: string;
  slot: Slot;
  tier: number; // 1-8, roughly matches dungeon floor
  base: BaseStats;
  intrinsic?: Intrinsic;
  description: string;
  /** Explicit shop buy price (overrides the 1.75x formula). */
  shopPrice?: number;
}

function weapon(id: string, name: string, tier: number, attack: number, description: string, intrinsic?: Intrinsic): BaseItemDef {
  return { id, name, slot: 'weapon', tier, base: { attack }, intrinsic, description };
}
function armor(id: string, name: string, tier: number, defense: number, hp: number, description: string, intrinsic?: Intrinsic): BaseItemDef {
  return { id, name, slot: 'armor', tier, base: { defense, hp }, intrinsic, description };
}

export const BASE_ITEMS: Record<string, BaseItemDef> = {
  // --- Weapons ---
  w1: weapon('w1', 'Rusted Shortsword', 1, 4, 'An old sword found near the forgotten ruins.'),
  w2: weapon('w2', 'Iron Blade', 2, 7, 'A reliable iron sword forged for novice adventurers.'),
  w3: weapon('w3', 'Ironfang Blade', 3, 11, 'A heavier weapon reinforced with monster ore.'),
  w4: weapon('w4', 'Phantom Edge', 4, 16, 'A cold blade touched by spectral energy.'),
  w5: weapon('w5', 'Warden Greatsword', 5, 22, 'A fortress weapon once carried by elite guards.'),
  w6: weapon('w6', 'Ember Blade', 6, 29, 'A sword forged in the Burning Depths.', { skillDamage: 5 }),
  w7: weapon('w7', 'Royal Edge', 7, 37, 'A ceremonial weapon of the fallen kingdom.', { critDamage: 5 }),
  w8: weapon('w8', 'Abyss Sovereign', 8, 46, 'A weapon formed from energy beyond the Abyss Gate.', { bossDamage: 8 }),
  // --- Armors ---
  a1: armor('a1', 'Traveller Cloth', 1, 3, 10, 'Simple cloth protected by a light leather vest.'),
  a2: armor('a2', 'Hardened Leather', 2, 5, 18, 'Sturdy leather with crossed straps and reinforced seams.'),
  a3: armor('a3', 'Iron Guard', 3, 8, 28, 'Ornate layered leather with metal reinforcement.'),
  a4: armor('a4', 'Phantom Mail', 4, 12, 40, 'Fitted iron plate with a pale silver sheen.', { dodge: 2 }),
  a5: armor('a5', 'Warden Plate', 5, 22, 55, 'Articulated iron plate of the fortress guard.'),
  a6: armor('a6', 'Ember Armor', 6, 23, 70, 'Ornate iron armor edged in warm gold.', { damageReduction: 5 }),
  a7: armor('a7', 'Royal Battleplate', 7, 36, 90, 'Faceted blue crystal armor of the fallen kingdom.', { damageReduction: 3 }),
  a8: armor('a8', 'Abyssal Armor', 8, 38, 115, 'Brilliant diamond plate formed beyond the gate.', { damageReduction: 5 }),
  // --- Boots ---
  b1: { id: 'b1', name: 'Worn Boots', slot: 'boots', tier: 1, base: { moveSpeed: 1 }, description: 'Simple low shoes with scuffed, serviceable soles.' },
  b2: { id: 'b2', name: 'Leather Boots', slot: 'boots', tier: 2, base: { moveSpeed: 2.5 }, description: 'Soft leather, quiet steps.' },
  b3: { id: 'b3', name: 'Scout Boots', slot: 'boots', tier: 3, base: { moveSpeed: 3 }, intrinsic: { dodge: 1 }, description: 'Tall leather boots with sturdy straps and brass buckles.' },
  b4: { id: 'b4', name: 'Phantom Steps', slot: 'boots', tier: 4, base: { moveSpeed: 4 }, intrinsic: { dodge: 2 }, description: 'Light iron boots whose footfalls fade into mist.' },
  b5: { id: 'b5', name: 'Warden Greaves', slot: 'boots', tier: 5, base: { moveSpeed: 5, defense: 3 }, description: 'Layered iron greaves with articulated toe plates.' },
  b6: { id: 'b6', name: 'Ember Walkers', slot: 'boots', tier: 6, base: { moveSpeed: 6 }, intrinsic: { dodge: 3 }, description: 'Ornate iron boots with warm gold trim.' },
  b7: { id: 'b7', name: 'Royal Striders', slot: 'boots', tier: 7, base: { moveSpeed: 7 }, intrinsic: { dodge: 4 }, description: 'Polished iron greaves set with pale blue crystal.' },
  b8: { id: 'b8', name: 'Abyss Walkers', slot: 'boots', tier: 8, base: { moveSpeed: 8 }, intrinsic: { dodge: 5 }, description: 'Brilliant iron greaves crowned with diamond facets.' },
  // --- Accessories: a shared +ATK core advances every tier; signature bonuses still differ. ---
  c1: { id: 'c1', name: 'Copper Ring', slot: 'accessory', tier: 1, base: { attack: 1, hp: 8 }, description: 'A lucky market trinket.' },
  c2: { id: 'c2', name: 'Adventurer Pendant', slot: 'accessory', tier: 2, base: { attack: 2, skillDamage: 2 }, description: 'A guild rookie’s charm that steadies both blade and first spells.' },
  c3: { id: 'c3', name: "Hunter's Band", slot: 'accessory', tier: 3, base: { attack: 3, critChance: 2 }, description: 'It always finds the weak spot.' },
  c4: { id: 'c4', name: 'Phantom Talisman', slot: 'accessory', tier: 4, base: { attack: 4, mp: 20, skillDamage: 3 }, description: 'Hums with leftover spells.' },
  c5: { id: 'c5', name: 'Warden Emblem', slot: 'accessory', tier: 5, base: { attack: 5, defense: 4, hp: 25, skillDamage: 3 }, description: 'A protective medal that stores the fortress ward’s magic.' },
  c6: { id: 'c6', name: 'Ember Pendant', slot: 'accessory', tier: 6, base: { attack: 6, skillDamage: 6 }, description: 'A caged spark.' },
  c7: { id: 'c7', name: 'Royal Crest', slot: 'accessory', tier: 7, base: { attack: 7, critChance: 4, skillDamage: 1 }, description: 'The seal of a lost court, carrying a trace of royal magic.' },
  c8: { id: 'c8', name: 'Abyss Eye', slot: 'accessory', tier: 8, base: { attack: 8, critChance: 5, skillDamage: 8 }, description: 'It blinks. Do not blink back.' },
  // --- Tier 1 alternates (shop-only starter options) ---
  w1b: { id: 'w1b', name: 'Wooden Training Blade', slot: 'weapon', tier: 1, base: { attack: 3, attackSpeed: 3 }, description: 'Weaker damage, but swings a little faster.', shopPrice: 55 },
  a1b: { id: 'a1b', name: 'Padded Vest', slot: 'armor', tier: 1, base: { defense: 2, hp: 20 }, description: 'A simple leather vest over thick, protective padding.', shopPrice: 58 },
  b1b: { id: 'b1b', name: 'Light Runner Boots', slot: 'boots', tier: 1, base: { moveSpeed: 2 }, description: 'Simple running shoes with feather-light soles.', shopPrice: 48 },
  c1b: { id: 'c1b', name: 'Apprentice Charm', slot: 'accessory', tier: 1, base: { mp: 12, skillDamage: 2 }, description: 'A first focus for budding casters.', shopPrice: 52 },
};

/** Base item id per slot+tier (shop stock + drop generation use this). */
export function baseItemId(slot: Slot, tier: number): string {
  const prefix = slot === 'weapon' ? 'w' : slot === 'armor' ? 'a' : slot === 'boots' ? 'b' : 'c';
  return `${prefix}${Math.min(8, Math.max(1, Math.round(tier)))}`;
}

// ---------------------------------------------------------------------------
// Affixes
// ---------------------------------------------------------------------------

export type AffixStat =
  | 'str' | 'agi' | 'crit' | 'int'
  | 'hp' | 'mp' | 'attack' | 'defense'
  | 'critChance' | 'skillDamage' | 'goldGain';

export interface AffixRange { min: number; max: number }

/** Early-tier ranges; scaled slightly by item tier at roll time. */
export const AFFIX_RANGES: Record<AffixStat, AffixRange> = {
  str: { min: 1, max: 3 },
  agi: { min: 1, max: 3 },
  crit: { min: 1, max: 3 },
  int: { min: 1, max: 3 },
  hp: { min: 5, max: 20 },
  mp: { min: 5, max: 15 },
  attack: { min: 1, max: 4 },
  defense: { min: 1, max: 3 },
  critChance: { min: 1, max: 2 },
  skillDamage: { min: 2, max: 4 },
  goldGain: { min: 3, max: 6 },
};

/** Logical affix pools per slot (no nonsense combos). */
export const AFFIX_POOLS: Record<Slot, AffixStat[]> = {
  weapon: ['str', 'crit', 'int', 'attack', 'critChance', 'skillDamage'],
  armor: ['str', 'agi', 'hp', 'defense', 'mp'],
  boots: ['agi', 'hp', 'mp', 'defense'],
  accessory: ['crit', 'int', 'hp', 'mp', 'critChance', 'skillDamage', 'goldGain', 'attack'],
};

// ---------------------------------------------------------------------------
// Legendary passives
// ---------------------------------------------------------------------------

export type LegendaryPassiveId =
  | 'vampiric' | 'executioner' | 'manaEcho' | 'goldenTouch' | 'berserkerRage' | 'swift';

export interface LegendaryPassiveDef {
  id: LegendaryPassiveId;
  name: string;
  description: string;
  /** False until its hook is implemented in combat code. */
  implemented: boolean;
}

export const LEGENDARY_PASSIVES: Record<LegendaryPassiveId, LegendaryPassiveDef> = {
  vampiric: { id: 'vampiric', name: 'Vampiric', description: 'Basic attacks heal 2% of damage dealt.', implemented: true },
  executioner: { id: 'executioner', name: 'Executioner', description: '+15% damage vs enemies below 30% HP.', implemented: false },
  manaEcho: { id: 'manaEcho', name: 'Mana Echo', description: '15% chance for a skill to refund 50% MP cost.', implemented: true },
  goldenTouch: { id: 'goldenTouch', name: 'Golden Touch', description: '+15% Gold Gain.', implemented: true },
  berserkerRage: { id: 'berserkerRage', name: 'Berserker', description: 'Below 30% HP: +12% Attack.', implemented: true },
  swift: { id: 'swift', name: 'Swift', description: 'Dash Slash cooldown reduced by 10%.', implemented: false },
};

/** Only implemented passives can roll (keeps drops honest). */
export const ROLLABLE_PASSIVES: LegendaryPassiveId[] = (
  Object.keys(LEGENDARY_PASSIVES) as LegendaryPassiveId[]
).filter((id) => LEGENDARY_PASSIVES[id].implemented);

// ---------------------------------------------------------------------------
// Sell values & shop
// ---------------------------------------------------------------------------

/** Base sell-reference value by slot+tier (sell = 35% × rarity mult). */
export function itemBaseValue(slot: Slot, tier: number): number {
  const t = Math.min(8, Math.max(1, Math.round(tier)));
  const base = slot === 'weapon' ? 40 : slot === 'armor' ? 34 : slot === 'boots' ? 20 : 26;
  return Math.round(base * Math.pow(t, 1.5));
}

export const SELL_FRACTION = 0.35;
export const SHOP_PRICE_MULT = 1.75;

export type ConsumableId = 'smallHP' | 'largeHP' | 'smallMP' | 'largeMP' | 'tonic' | 'speedTonic' | 'returnStone' | 'campMeal' | 'ironShard' | 'forgePowder';

export interface ConsumableDef {
  id: ConsumableId;
  name: string;
  description: string;
  buyPrice: number; // 0 = not sold in shop
  sellPrice: number;
}

export const CONSUMABLES: Record<ConsumableId, ConsumableDef> = {
  smallHP: { id: 'smallHP', name: 'Small HP Potion', description: 'Restores 25% Max HP.', buyPrice: 20, sellPrice: 5 },
  largeHP: { id: 'largeHP', name: 'Large HP Potion', description: 'Restores 50% Max HP.', buyPrice: 45, sellPrice: 12 },
  smallMP: { id: 'smallMP', name: 'Small MP Potion', description: 'Restores 30% Max MP.', buyPrice: 15, sellPrice: 4 },
  largeMP: { id: 'largeMP', name: 'Large MP Potion', description: 'Restores 60% Max MP.', buyPrice: 35, sellPrice: 10 },
  tonic: { id: 'tonic', name: 'Battle Tonic', description: '+10% Attack for 30s.', buyPrice: 60, sellPrice: 15 },
  returnStone: { id: 'returnStone', name: 'Return Stone', description: 'Returns you to Meadow Outpost.', buyPrice: 30, sellPrice: 8 },
  speedTonic: { id: 'speedTonic', name: 'Speed Tonic', description: '+10% Movement Speed for 30s.', buyPrice: 55, sellPrice: 14 },
  campMeal: { id: 'campMeal', name: 'Camp Meal', description: 'Recover 60% HP + 60% MP. Cannot use in combat.', buyPrice: 40, sellPrice: 10 },
  ironShard: { id: 'ironShard', name: 'Iron Shard', description: 'Basic enhancement material. (Future recipes)', buyPrice: 20, sellPrice: 5 },
  forgePowder: { id: 'forgePowder', name: 'Forge Powder', description: 'Next enhancement at Mira costs 15% less. Does not stack.', buyPrice: 35, sellPrice: 9 },
};

export const CONSUMABLE_ORDER: ConsumableId[] = ['smallHP', 'largeHP', 'smallMP', 'largeMP', 'tonic', 'speedTonic', 'returnStone', 'campMeal', 'ironShard', 'forgePowder'];

/** Everything Mira stocks in supplies (potions, tonics, meal, stone, materials). */
export const SHOP_CONSUMABLES: ConsumableId[] = ['smallHP', 'largeHP', 'smallMP', 'largeMP', 'tonic', 'speedTonic', 'returnStone', 'campMeal', 'ironShard', 'forgePowder'];

/** Shop category pills for the BUY tab. */
export type ShopCategory = 'all' | 'potions' | 'weapons' | 'armor' | 'accessories' | 'materials';
export const SHOP_CATEGORIES: Array<{ id: ShopCategory; label: string }> = [
  { id: 'all', label: 'ALL' },
  { id: 'potions', label: 'POTIONS' },
  { id: 'weapons', label: 'WEAPONS' },
  { id: 'armor', label: 'ARMOR' },
  { id: 'accessories', label: 'ACCESSORIES' },
  { id: 'materials', label: 'MATERIALS' },
];

/** Usable supplies shown under POTIONS (materials live under MATERIALS). */
export const POTION_CATEGORY_IDS: ConsumableId[] = ['smallHP', 'largeHP', 'smallMP', 'largeMP', 'tonic', 'speedTonic', 'returnStone', 'campMeal'];

/** Blacksmith utility items (no direct Use effect except forge powder). */
export const MATERIAL_IDS: ConsumableId[] = ['ironShard', 'forgePowder'];

// ---------------------------------------------------------------------------
// Drop tables (normal monsters; elites/bosses scale these in later phases)
// ---------------------------------------------------------------------------

export const EquipmentDrop = {
  chance: 0.07,
  slotWeights: { weapon: 0.3, armor: 0.28, boots: 0.21, accessory: 0.21 } as Record<Slot, number>,
  rarityChances: { common: 0.58, uncommon: 0.25, rare: 0.11, epic: 0.05, legendary: 0.01 } as Record<Rarity, number>,
} as const;

export const PotionDrops = {
  smallHP: 0.05,
  largeHP: 0.02,
  smallMP: 0.035,
  largeMP: 0.015,
} as const satisfies Record<string, number>;

/** Floor-1 relic drop chance from normal dungeon monsters. */
export const FLOOR_RELIC_DROP = 0.012;

// ---------------------------------------------------------------------------
// Floor relics (8 total; Phase 2 unlocks Floor 1 only)
// ---------------------------------------------------------------------------

export type FloorRelicEffectKind =
  | 'goldGain' | 'attackPct' | 'lifesteal' | 'critChance'
  | 'defensePct' | 'skillDamage' | 'bossDamage' | 'abyss';

export interface FloorRelicDef {
  id: string; // 'f1'..'f8'
  floor: number;
  name: string;
  effectKind: FloorRelicEffectKind;
  /** Primary value (Abyss Crown carries extra in `extra`). */
  value: number;
  extra?: { attackPct: number; defensePct: number; skillDamage: number };
  color: string;
  description: string;
}

export const FLOOR_RELICS: Record<string, FloorRelicDef> = {
  f1: { id: 'f1', floor: 1, name: 'Lucky Slime Core', effectKind: 'goldGain', value: 10, color: '#7ee081', description: '+10% Gold Gain.' },
  f2: { id: 'f2', floor: 2, name: 'Bone Charm', effectKind: 'attackPct', value: 8, color: '#cfd2dc', description: '+8% Attack.' },
  f3: { id: 'f3', floor: 3, name: 'Blood Fang', effectKind: 'lifesteal', value: 3, color: '#e05a4e', description: 'Heal 3% of damage dealt.' },
  f4: { id: 'f4', floor: 4, name: 'Phantom Eye', effectKind: 'critChance', value: 8, color: '#6fb7ff', description: '+8% Critical Chance.' },
  f5: { id: 'f5', floor: 5, name: 'Iron Heart', effectKind: 'defensePct', value: 12, color: '#9aa7b5', description: '+12% Defense.' },
  f6: { id: 'f6', floor: 6, name: 'Ember Rune', effectKind: 'skillDamage', value: 10, color: '#ff9f1c', description: '+10% Skill Damage.' },
  f7: { id: 'f7', floor: 7, name: "King's Seal", effectKind: 'bossDamage', value: 12, color: '#ffd75e', description: '+12% Damage vs Bosses.' },
  f8: { id: 'f8', floor: 8, name: 'Abyss Crown', effectKind: 'abyss', value: 0, extra: { attackPct: 8, defensePct: 8, skillDamage: 5 }, color: '#b14aed', description: '+8% ATK, +8% DEF, +5% Skill Damage.' },
};

export const MAX_ACTIVE_RELICS = 3;
