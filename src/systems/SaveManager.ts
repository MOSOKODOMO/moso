/**
 * SaveManager — versioned LocalStorage persistence.
 * v3 stores: level/EXP/gold, stat+skill builds, bag, loadout+enhance,
 * floor relics (+slots), souls/pity counters, map progress, settings, bindings.
 * v2 and v1 saves migrate forward; loaders sanitize so old saves never crash.
 */
import { DEFAULT_BINDINGS } from '../input/InputManager';
import { BalanceConfig } from '../config/BalanceConfig';
import { baseItemId } from '../config/ItemDefs';
import type { BagData } from '../items/Inventory';
import type { EnhanceLevels, Loadout } from '../items/Equipment';
import { createItem } from '../items/ItemInstance';
import type { MapId } from '../world/Maps';
import { MAPS } from '../world/Maps';
import { Campaign, type CampaignData } from '../campaign/Campaign';

export type ActionName =
  | 'moveLeft'
  | 'moveRight'
  | 'jump'
  | 'attack'
  | 'skill1'
  | 'skill2'
  | 'skill3'
  | 'useHp'
  | 'useMp'
  | 'stats'
  | 'inventory'
  | 'interact'
  | 'pause';

export interface KeyBindings extends Record<ActionName, string[]> {}

export type StatId = 'str' | 'agi' | 'crit' | 'int';

export interface SaveData {
  version: 3;
  savedAt: number;
  player: {
    level: number;
    exp: number;
    gold: number;
  };
  stats: {
    str: number;
    agi: number;
    crit: number;
    int: number;
    points: number;
  };
  skills: {
    points: number;
    unlocked: boolean;
    power: number;
    bolt: number;
    heal: number;
  };
  bag: BagData;
  loadout: {
    equipped: Loadout;
    enhance: EnhanceLevels;
    forgeDiscount: boolean;
  };
  floorRelics: {
    owned: string[];
    active: Array<string | null>;
  };
  souls: Record<string, number>;
  pity: Record<string, number>;
  maps: {
    current: MapId;
    unlockedFloor: number;
  };
  campaign: CampaignData;
  settings: {
    autoAttack: boolean;
    autoSkill: boolean;
  };
  bindings: KeyBindings;
}

const SAVE_KEY = 'dungeon-farmer-save-v3';
const LEGACY_KEYS = ['dungeon-farmer-save-v2', 'dungeon-farmer-save-v1'];
export const SAVE_VERSION = 3;

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    savedAt: 0,
    player: { level: 1, exp: 0, gold: 60 },
    stats: { str: 0, agi: 0, crit: 0, int: 0, points: 0 },
    skills: { points: 0, power: 0, bolt: 0, heal: 0, unlocked: false },
    bag: {
      consumables: { smallHP: 3, largeHP: 0, smallMP: 2, largeMP: 0, tonic: 0, speedTonic: 0, returnStone: 1, campMeal: 0, ironShard: 0, forgePowder: 0 },
      equipment: [],
      relics: { str: false, agi: false, crit: false, int: false },
    },
    loadout: {
      equipped: { weapon: null, armor: null, boots: null, accessory: null },
      enhance: { weapon: 0, armor: 0, boots: 0, accessory: 0 },
      forgeDiscount: false,
    },
    floorRelics: { owned: [], active: [null, null, null] },
    souls: {},
    pity: {},
    maps: { current: 'outpost', unlockedFloor: 1 },
    campaign: new Campaign().serialize(),
    settings: { autoAttack: false, autoSkill: false },
    bindings: structuredClone(DEFAULT_BINDINGS),
  };
}

/** Load and sanitize; returns null when no save exists. Never throws. */
export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      if (parsed.version === SAVE_VERSION) return sanitize(parsed);
      return null;
    }
    return migrateLegacy();
  } catch {
    return null;
  }
}

function sanitize(parsed: Partial<SaveData>): SaveData {
  const clean = defaultSave();
  clean.savedAt = typeof parsed.savedAt === 'number' ? parsed.savedAt : 0;
  if (parsed.player) {
    clean.player.level = clampInt(parsed.player.level, 1, 30, 1);
    clean.player.exp = clampInt(parsed.player.exp, 0, 1_000_000, 0);
    clean.player.gold = clampInt(parsed.player.gold, 0, 99_999_999, 0);
  }
  if (parsed.stats) {
    clean.stats.str = clampInt(parsed.stats.str, 0, 999, 0);
    clean.stats.agi = clampInt(parsed.stats.agi, 0, 999, 0);
    clean.stats.crit = clampInt(parsed.stats.crit, 0, 999, 0);
    clean.stats.int = clampInt(parsed.stats.int, 0, 999, 0);
    clean.stats.points = clampInt(parsed.stats.points, 0, 9999, 0);
  }
  if (parsed.skills) {
    clean.skills.points = clampInt(parsed.skills.points, 0, 9999, 0);
    clean.skills.power = clampInt(parsed.skills.power, 0, 5, 0);
    clean.skills.bolt = clampInt(parsed.skills.bolt, 0, 5, 0);
    clean.skills.heal = clampInt(parsed.skills.heal, 0, 5, 0);
    // Previous v3 characters already knew skills: grandfather learned ranks,
    // points and access rather than taking away their existing build.
    clean.skills.unlocked = typeof parsed.skills.unlocked === 'boolean'
      ? parsed.skills.unlocked : clean.skills.power + clean.skills.bolt + clean.skills.heal > 0;
  }
  if (!clean.skills.unlocked && clean.player.level >= 3) {
    clean.skills.unlocked = true;
    clean.skills.points += 1;
  }
  if (parsed.bag) {
    const bag = parsed.bag;
    if (bag.consumables) {
      for (const id of Object.keys(clean.bag.consumables) as Array<keyof typeof clean.bag.consumables>) {
        clean.bag.consumables[id] = clampInt(bag.consumables[id], 0, 99, 0);
      }
    }
    if (Array.isArray(bag.equipment)) {
      clean.bag.equipment = bag.equipment
        .filter((i) => i && typeof i === 'object' && typeof (i as { baseId?: unknown }).baseId === 'string')
        .slice(0, 60) as SaveData['bag']['equipment'];
    }
    if (bag.relics) {
      for (const id of Object.keys(clean.bag.relics) as Array<keyof typeof clean.bag.relics>) {
        clean.bag.relics[id] = bag.relics[id] === true;
      }
    }
  }
  if (parsed.loadout) {
    const lo = parsed.loadout;
    for (const slot of Object.keys(clean.loadout.equipped) as Array<keyof typeof clean.loadout.equipped>) {
      const item = lo.equipped?.[slot];
      clean.loadout.equipped[slot] =
        item && typeof item === 'object' && typeof (item as { baseId?: unknown }).baseId === 'string'
          ? (item as SaveData['loadout']['equipped'][typeof slot])
          : null;
      clean.loadout.enhance[slot] = clampInt(lo.enhance?.[slot], 0, BalanceConfig.maxEnhance, 0);
    }
    clean.loadout.forgeDiscount = lo.forgeDiscount === true;
  }
  if (parsed.floorRelics) {
    if (Array.isArray(parsed.floorRelics.owned)) {
      clean.floorRelics.owned = parsed.floorRelics.owned.filter((id): id is string => typeof id === 'string').slice(0, 8);
    }
    const active = Array.isArray(parsed.floorRelics.active) ? parsed.floorRelics.active : [];
    clean.floorRelics.active = [0, 1, 2].map((i) => {
      const id = active[i];
      return typeof id === 'string' && clean.floorRelics.owned.includes(id) ? id : null;
    });
  }
  if (parsed.souls && typeof parsed.souls === 'object') {
    for (const [k, v] of Object.entries(parsed.souls)) {
      if (typeof v === 'number') clean.souls[k] = clampInt(v, 0, 999, 0);
    }
  }
  if (parsed.pity && typeof parsed.pity === 'object') {
    for (const [k, v] of Object.entries(parsed.pity)) {
      if (typeof v === 'number') clean.pity[k] = clampInt(v, 0, 99, 0);
    }
  }
  if (parsed.maps) {
    clean.maps.current = typeof parsed.maps.current === 'string' && parsed.maps.current in MAPS ? parsed.maps.current : 'outpost';
    clean.maps.unlockedFloor = clampInt(parsed.maps.unlockedFloor, 1, 8, 1);
  }
  const campaign = new Campaign();
  campaign.deserialize(parsed.campaign, clean.maps.unlockedFloor);
  clean.campaign = campaign.serialize();
  clean.maps.unlockedFloor = Math.max(clean.maps.unlockedFloor, campaign.unlockedFloor);
  if (parsed.settings) {
    clean.settings.autoAttack = parsed.settings.autoAttack === true;
    clean.settings.autoSkill = parsed.settings.autoSkill === true;
  }
  if (parsed.bindings) {
    for (const action of Object.keys(clean.bindings) as ActionName[]) {
      const list = (parsed.bindings as Partial<KeyBindings>)[action];
      if (Array.isArray(list) && list.every((c) => typeof c === 'string')) {
        clean.bindings[action] = list.slice(0, 2);
      }
    }
  }
  return clean;
}

// ---------------------------------------------------------------------------
// Legacy migration (v2 Phase-1 saves, v1 originals)
// ---------------------------------------------------------------------------

interface LegacyV2Bag {
  hpPotions?: unknown;
  mpPotions?: unknown;
  swords?: unknown;
  equippedWeaponTier?: unknown;
  relics?: unknown;
}

interface LegacyV2 {
  version: 2;
  player?: { level?: unknown; exp?: unknown; gold?: unknown };
  stats?: { str?: unknown; agi?: unknown; crit?: unknown; int?: unknown; points?: unknown };
  skills?: { points?: unknown; power?: unknown; bolt?: unknown; heal?: unknown };
  inventory?: LegacyV2Bag;
  settings?: { autoAttack?: unknown; autoSkill?: unknown };
  bindings?: Partial<KeyBindings>;
}

interface LegacyV1 {
  version: 1;
  player?: { level?: unknown; exp?: unknown; gold?: unknown };
  settings?: { autoAttack?: unknown };
  bindings?: Partial<KeyBindings>;
}

function migrateLegacy(): SaveData | null {
  try {
    // v2 → v3.
    const raw2 = localStorage.getItem(LEGACY_KEYS[0]);
    if (raw2) {
      const parsed = JSON.parse(raw2) as Partial<LegacyV2>;
      if (parsed.version === 2) {
        const clean = migrateV2(parsed);
        // Keep the only persisted copy if storage is full or writing is denied.
        if (storeSave(clean)) {
          try {
            localStorage.removeItem(LEGACY_KEYS[0]);
          } catch { /* ignore */ }
        }
        return clean;
      }
    }
    // v1 → v3 (retroactive build points, starter bag).
    const raw1 = localStorage.getItem(LEGACY_KEYS[1]);
    if (raw1) {
      const parsed = JSON.parse(raw1) as Partial<LegacyV1>;
      if (parsed.version === 1 && parsed.player) {
        const clean = defaultSave();
        clean.player.level = clampInt(parsed.player.level, 1, 30, 1);
        clean.player.exp = clampInt(parsed.player.exp, 0, 1_000_000, 0);
        clean.player.gold = clampInt(parsed.player.gold, 0, 99_999_999, 0);
        clean.stats.points = (clean.player.level - 1) * 3;
        // Preserve the established v1 migration build rather than applying the
        // new-character level-three gate retroactively to an existing player.
        clean.skills = { points: clean.player.level - 1, power: 1, bolt: 1, heal: 1, unlocked: true };
        if (parsed.settings) clean.settings.autoAttack = parsed.settings.autoAttack === true;
        mergeBindings(clean, parsed.bindings);
        if (storeSave(clean)) {
          try {
            localStorage.removeItem(LEGACY_KEYS[1]);
          } catch { /* ignore */ }
        }
        return clean;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function migrateV2(parsed: Partial<LegacyV2>): SaveData {
  const clean = defaultSave();
  // v2 characters began with all three skills. Keep that fallback even when
  // their skill block is absent, then restore any saved ranks and points below.
  clean.skills = { points: 0, power: 1, bolt: 1, heal: 1, unlocked: true };
  if (parsed.player) {
    clean.player.level = clampInt(parsed.player.level, 1, 30, 1);
    clean.player.exp = clampInt(parsed.player.exp, 0, 1_000_000, 0);
    clean.player.gold = clampInt(parsed.player.gold, 0, 99_999_999, 0);
  }
  if (parsed.stats) {
    clean.stats.str = clampInt(parsed.stats.str, 0, 999, 0);
    clean.stats.agi = clampInt(parsed.stats.agi, 0, 999, 0);
    clean.stats.crit = clampInt(parsed.stats.crit, 0, 999, 0);
    clean.stats.int = clampInt(parsed.stats.int, 0, 999, 0);
    clean.stats.points = clampInt(parsed.stats.points, 0, 9999, 0);
  }
  if (parsed.skills) {
    clean.skills.points = clampInt(parsed.skills.points, 0, 9999, 0);
    clean.skills.power = clampInt(parsed.skills.power, 1, 5, 1);
    clean.skills.bolt = clampInt(parsed.skills.bolt, 1, 5, 1);
    clean.skills.heal = clampInt(parsed.skills.heal, 1, 5, 1);
  }
  const inv = parsed.inventory;
  if (inv) {
    // Old potion counts become SMALL potions.
    clean.bag.consumables.smallHP = clampInt(inv.hpPotions, 0, 99, 3);
    clean.bag.consumables.smallMP = clampInt(inv.mpPotions, 0, 99, 2);
    clean.bag.consumables.returnStone = 1;
    // Old tiered swords become common base weapons of the same tier.
    const tiers = Array.isArray(inv.swords)
      ? (inv.swords as unknown[]).filter((t): t is number => Number.isInteger(t) && (t as number) >= 1 && (t as number) <= 8)
      : [];
    for (const tier of tiers.slice(0, 60)) clean.bag.equipment.push(createItem(baseItemId('weapon', tier), 'common'));
    const eqTier =
      Number.isInteger(inv.equippedWeaponTier) && (inv.equippedWeaponTier as number) >= 1 && (inv.equippedWeaponTier as number) <= 8
        ? (inv.equippedWeaponTier as number)
        : 1;
    clean.loadout.equipped.weapon = createItem(baseItemId('weapon', eqTier), 'common');
    if (inv.relics && typeof inv.relics === 'object') {
      for (const id of Object.keys(clean.bag.relics) as Array<keyof typeof clean.bag.relics>) {
        clean.bag.relics[id] = (inv.relics as Record<string, unknown>)[id] === true;
      }
    }
  }
  if (parsed.settings) {
    clean.settings.autoAttack = parsed.settings.autoAttack === true;
    clean.settings.autoSkill = parsed.settings.autoSkill === true;
  }
  mergeBindings(clean, parsed.bindings);
  return clean;
}

function mergeBindings(clean: SaveData, bindings: Partial<KeyBindings> | undefined): void {
  if (!bindings) return;
  for (const action of Object.keys(clean.bindings) as ActionName[]) {
    const list = bindings[action];
    if (Array.isArray(list) && list.every((c) => typeof c === 'string')) {
      clean.bindings[action] = list.slice(0, 2);
    }
  }
}

/** Persist a save. Never throws (storage full / private mode → ignored). */
export function storeSave(data: SaveData): boolean {
  try {
    data.savedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}
