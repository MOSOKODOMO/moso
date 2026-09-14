import { STARTER_WEAPONS, type StarterWeapon, type Weapon } from './ItemCatalog';

export const CRAFT_COST = 30;
const finishes = {
  swift: { name: 'Featherweight', damage: -2, speed: .82, range: 1, note: '18% faster attacks · 2 less damage' },
  heavy: { name: 'Heavyweight', damage: 4, speed: 1.22, range: 1, note: '+4 damage · 22% longer between attacks' },
  reach: { name: 'Telescopic', damage: -2, speed: 1.1, range: 1.25, note: '25% more reach · 2 less damage · 10% slower attacks' },
  steady: { name: 'Studio-made', damage: 1, speed: 1, range: 1, note: '+1 damage · familiar handling' },
} as const;
export interface Invention { weapon: StarterWeapon; finish: keyof typeof finishes; name: string; note: string }
// Descriptions select bounded recipes. Player text is never code or HTML.
export function invent(words: string): Invention | null {
  const text = words.slice(0, 120).toLowerCase();
  const match = text.match(/\b(pen|pencil|ruler|cup|mug)\b/);
  if (!match) return null;
  const weapon: StarterWeapon = match[1] === 'mug' ? 'cup' : match[1] === 'pencil' ? 'pen' : match[1] as StarterWeapon;
  const finish = /\b(fast|swift|light|lightweight|feather|quick)\b/.test(text) ? 'swift'
    : /\b(heavy|powerful|strong|brick|solid)\b/.test(text) ? 'heavy'
    : /\b(long|reach|telescopic|extend|extended)\b/.test(text) ? 'reach' : 'steady';
  return recipe(weapon, finish);
}
export function recipe(weapon: StarterWeapon, finish: keyof typeof finishes): Invention {
  return { weapon, finish, name: `${finishes[finish].name} ${weapon[0].toUpperCase()+weapon.slice(1)}`, note: finishes[finish].note };
}
export function sanitizeInventions(raw: unknown): Partial<Record<Weapon, Invention>> {
  const result: Partial<Record<Weapon, Invention>> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;
  for (const weapon of STARTER_WEAPONS) {
    if (!Object.prototype.hasOwnProperty.call(raw, weapon)) continue;
    const value = (raw as Record<string, unknown>)[weapon];
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const finish = (value as Invention).finish;
    if (Object.prototype.hasOwnProperty.call(finishes, finish)) result[weapon] = recipe(weapon, finish);
  }
  return result;
}
export function inventionStats<T extends { damage: number; speed: number; range: number; name: string }>(base: T, item?: Invention): T {
  if (!item || !Object.prototype.hasOwnProperty.call(finishes, item.finish)) return base;
  const mod = finishes[item.finish];
  return { ...base, name: item.name, damage: Math.max(1, base.damage + mod.damage), speed: base.speed * mod.speed, range: base.range * mod.range };
}
