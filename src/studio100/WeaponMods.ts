import type { Weapon } from './StudioState';

export const MAX_ENHANCEMENT = 3;
export const EMBED_COST = 80;
export const RELICS = {
  ink: { name: 'Ink relic', description: '+3 weapon damage.' },
  prism: { name: 'Prism relic', description: '15% more weapon reach.' },
  gale: { name: 'Gale relic', description: '10% shorter attack cooldown.' },
} as const;
export type RelicId = keyof typeof RELICS;
export interface WeaponMod { enhancement: number; relic: RelicId | null }
export type WeaponMods = Record<Weapon, WeaponMod>;
export interface WeaponModState { coins: number; weapon: Weapon; weaponMods: WeaponMods }

const WEAPON_IDS = ['pen', 'ruler', 'cup'] as const;
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const owns = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key);
const rank = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(MAX_ENHANCEMENT, Math.floor(value))) : 0;
export const isRelicId = (value: unknown): value is RelicId => typeof value === 'string' && owns(RELICS, value);

function sanitizeMod(value: unknown): WeaponMod {
  if (!record(value)) return { enhancement: 0, relic: null };
  return { enhancement: rank(value.enhancement), relic: isRelicId(value.relic) ? value.relic : null };
}
export function newWeaponMods(): WeaponMods {
  return { pen: { enhancement: 0, relic: null }, ruler: { enhancement: 0, relic: null }, cup: { enhancement: 0, relic: null } };
}
export function sanitizeWeaponMods(raw: unknown): WeaponMods {
  const mods = newWeaponMods();
  if (!record(raw)) return mods;
  for (const weapon of WEAPON_IDS) if (owns(raw, weapon)) mods[weapon] = sanitizeMod(raw[weapon]);
  return mods;
}
export function enhancementCost(mod: WeaponMod): number {
  return 60 + rank(mod?.enhancement) * 40;
}

/** Speed is seconds between attacks; enhancements and Gale shorten that cooldown. */
export function applyWeaponMods<T extends { damage: number; speed: number; range: number }>(base: T, mod?: WeaponMod): T {
  const clean = sanitizeMod(mod);
  return {
    ...base,
    damage: Math.max(1, base.damage + (clean.relic === 'ink' ? 3 : 0)),
    speed: base.speed * (1 - clean.enhancement * .05) * (clean.relic === 'gale' ? .9 : 1),
    range: base.range * (clean.relic === 'prism' ? 1.15 : 1),
  };
}

// Purchases reject malformed records rather than charging or silently repairing a live state.
function currentMod(state: WeaponModState): WeaponMod | null {
  if (!WEAPON_IDS.includes(state.weapon) || !record(state.weaponMods) || !owns(state.weaponMods, state.weapon)) return null;
  const mod = state.weaponMods[state.weapon];
  if (!record(mod) || !Number.isInteger(mod.enhancement) || mod.enhancement < 0 || mod.enhancement > MAX_ENHANCEMENT) return null;
  return mod.relic === null || isRelicId(mod.relic) ? mod : null;
}
const canAfford = (state: WeaponModState, cost: number) => Number.isSafeInteger(state.coins) && state.coins >= cost;

export function enhanceWeapon(state: WeaponModState): boolean {
  const mod = currentMod(state);
  if (!mod || mod.enhancement >= MAX_ENHANCEMENT) return false;
  const cost = enhancementCost(mod);
  if (!canAfford(state, cost)) return false;
  state.coins -= cost;
  state.weaponMods[state.weapon] = { enhancement: mod.enhancement + 1, relic: mod.relic };
  return true;
}
export function embedRelic(state: WeaponModState, id: RelicId): boolean {
  const mod = currentMod(state);
  if (!mod || !isRelicId(id) || mod.relic === id || !canAfford(state, EMBED_COST)) return false;
  state.coins -= EMBED_COST;
  state.weaponMods[state.weapon] = { enhancement: mod.enhancement, relic: id };
  return true;
}
