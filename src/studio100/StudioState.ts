import { TEACHERS, assignTeachers, sanitizeAssignments } from './Teachers';
import { defaultAppearance, sanitizeAppearance, type CharacterAppearance } from './CharacterAppearance';
import { sanitizeInventions, type Invention } from './Inventions';
export type Weapon = 'pen' | 'ruler' | 'cup';
export type Place = 'lobby' | 'foyer' | 'mystery' | 'studio' | 'home' | 'skills' | 'tools';
export type Route = 'study' | 'fight';
export const SAVE_KEY = 'studio-100-save-v1';
export const CLASS_SECONDS = 16;
export const STUDIO_NAMES = ['The First Brief', 'Small Spaces', 'Material Matters', 'Working Together', 'Making Connections', 'Weather & Light', 'The Melbourne Project', 'Your Design Voice', 'The Final Exhibition'];
export const WEAPONS: Record<Weapon, { name: string; speed: number; range: number; damage: number; description: string }> = {
  pen: { name: 'Pen', speed: .34, range: 2.1, damage: 10, description: 'Fast · short melee' },
  ruler: { name: 'Ruler', speed: .86, range: 4.1, damage: 24, description: 'Slow · long melee' },
  cup: { name: 'Cup', speed: .58, range: 19, damage: 12, description: 'Medium · ranged' },
};
export interface StudioSave {
  version: 1; level: number; xp: number; coins: number; stamina: number; day: number;
  studio: number; place: Place; knowledge: number[]; cleared: (Route | null)[];
  weapon: Weapon; owned: Weapon[]; toolRanks: Record<Weapon, number>;
  endurance: number; efficiency: number; shoes: boolean; introSeen: boolean;
  charms: { anchor: boolean; moon: boolean; echo: boolean };
  teacherAssignments: string[];
  professorWins: string[];
  appearance: CharacterAppearance;
  characterCreated: boolean;
  inventions: Partial<Record<Weapon, Invention>>;
}
export function newStudent(): StudioSave {
  return { version: 1, level: 1, xp: 0, coins: 90, stamina: 100, day: 1, studio: 1, place: 'lobby',
    knowledge: Array(9).fill(0), cleared: Array(9).fill(null), weapon: 'pen', owned: ['pen', 'ruler', 'cup'],
    toolRanks: { pen: 0, ruler: 0, cup: 0 }, endurance: 0, efficiency: 0, shoes: false, introSeen: false,
    charms: { anchor: false, moon: false, echo: false }, teacherAssignments: assignTeachers(), professorWins: [], appearance:defaultAppearance(), characterCreated:false, inventions:{} };
}
const integer = (v: unknown, min: number, max: number, fallback: number) => typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.floor(v))) : fallback;
export const maxStamina = (s: StudioSave) => 100 + (s.level - 1) * 5 + s.endurance * 20 + (s.charms?.moon ? 15 : 0);
export const xpNeeded = (s: StudioSave) => 60 + (s.level - 1) * 20;
export const classCost = (s: StudioSave, studio = s.studio) => Math.min(maxStamina(s), Math.max(10, 28 + (studio - 1) * 9 - (s.level - 1) * 3 - s.efficiency * 3));
export const unlockedStudio = (s: StudioSave) => { const first = s.cleared.indexOf(null); return first === -1 ? 9 : first + 1; };
export function sanitizeSave(raw: unknown): StudioSave {
  const s = newStudent();
  if (!raw || typeof raw !== 'object' || (raw as Partial<StudioSave>).version !== 1) return s;
  const r = raw as Partial<StudioSave>;
  s.inventions = sanitizeInventions(r.inventions);
  s.appearance=sanitizeAppearance(r.appearance); s.characterCreated=r.characterCreated===true;
  s.level = integer(r.level, 1, 30, 1); s.xp = integer(r.xp, 0, xpNeeded(s) - 1, 0);
  s.coins = integer(r.coins, 0, 99999, 90); s.day = integer(r.day, 1, 9999, 1);
  s.endurance = integer(r.endurance, 0, 5, 0); s.efficiency = integer(r.efficiency, 0, 5, 0);
  for (const key of ['anchor', 'moon', 'echo'] as const) s.charms[key] = r.charms?.[key] === true;
  s.stamina = integer(r.stamina, 0, maxStamina(s), maxStamina(s));
  let chain = true;
  for (let i = 0; i < 9; i++) {
    const route = r.cleared?.[i];
    s.cleared[i] = chain && (route === 'study' || route === 'fight') ? route : null;
    if (!s.cleared[i]) chain = false;
    s.knowledge[i] = s.cleared[i] === 'study' ? 7 : integer(r.knowledge?.[i], 0, s.cleared[i] ? 7 : 6, 0);
  }
  s.studio = integer(r.studio, 1, unlockedStudio(s), 1);
  s.teacherAssignments = sanitizeAssignments(r.teacherAssignments, s.teacherAssignments);
  s.professorWins = s.cleared.every(Boolean) && Array.isArray(r.professorWins) ? TEACHERS.filter(t=>r.professorWins!.includes(t.id)).map(t=>t.id) : [];
  if (['lobby', 'foyer', 'mystery', 'studio', 'home', 'skills', 'tools'].includes(r.place ?? '')) s.place = r.place!;
  // Retired street saves fall back to the illustrated lobby without losing progress.
  s.owned = ['pen', 'ruler', 'cup']; // Starter kit: all three are available for the prototype.
  if (r.weapon === 'pen' || r.weapon === 'ruler' || r.weapon === 'cup') s.weapon = r.weapon;
  for (const weapon of s.owned) s.toolRanks[weapon] = integer(r.toolRanks?.[weapon], 0, 5, 0);
  s.shoes = r.shoes === true; s.introSeen = r.introSeen === true;
  return s;
}
export function gainXP(s: StudioSave, amount: number): void {
  s.xp += amount;
  while (s.level < 30 && s.xp >= xpNeeded(s)) { s.xp -= xpNeeded(s); s.level++; }
  if (s.level === 30) s.xp = Math.min(s.xp, xpNeeded(s) - 1);
}
export function completeStudio(s: StudioSave, route: Route): boolean {
  const i = s.studio - 1;
  if (s.studio > unlockedStudio(s) || s.cleared[i] || (route === 'study' && s.knowledge[i] < 7)) return false;
  s.cleared[i] = route;
  s.coins += 70 + s.studio * 10;
  gainXP(s, 65 + s.studio * 5);
  return true;
}
export function completeClass(s: StudioSave): { ok: boolean; cleared: boolean } {
  const cost = classCost(s), i = s.studio - 1;
  if (s.cleared[i] || s.knowledge[i] >= 7 || s.stamina < cost || s.studio > unlockedStudio(s)) return { ok: false, cleared: false };
  s.stamina -= cost; s.knowledge[i]++; s.coins += 10; gainXP(s, 15);
  return { ok: true, cleared: completeStudio(s, 'study') };
}
export function rest(s: StudioSave): void { s.day++; s.stamina = maxStamina(s); s.place = 'home'; }
export type Upgrade = 'endurance' | 'efficiency' | 'tool' | 'shoes' | 'snack';
export function upgradeCost(s: StudioSave, kind: Upgrade): number {
  if (kind === 'tool') return 35 + s.toolRanks[s.weapon] * 30;
  if (kind === 'endurance' || kind === 'efficiency') return 40 + s[kind] * 35;
  return kind === 'shoes' ? 65 : 15;
}
export function buyUpgrade(s: StudioSave, kind: Upgrade): boolean {
  const cost = upgradeCost(s, kind);
  if (s.coins < cost) return false;
  if ((kind === 'endurance' || kind === 'efficiency') && s[kind] >= 5) return false;
  if (kind === 'tool' && s.toolRanks[s.weapon] >= 5) return false;
  if (kind === 'shoes' && s.shoes) return false;
  if (kind === 'snack' && s.stamina >= maxStamina(s)) return false;
  s.coins -= cost;
  if (kind === 'tool') s.toolRanks[s.weapon]++;
  else if (kind === 'endurance') { s.endurance++; s.stamina += 20; }
  else if (kind === 'efficiency') s.efficiency++;
  else if (kind === 'shoes') s.shoes = true;
  else s.stamina = Math.min(maxStamina(s), s.stamina + 35);
  return true;
}

export type Charm = keyof StudioSave['charms'];
export const CHARMS: Record<Charm, { name: string; price: number; description: string; symbol: string }> = {
  anchor: { name: 'The Quiet Anchor', price: 45, description: 'A paperweight that feels heavier in your pocket. Take 35% less knockback from instructor hits.', symbol: '◇' },
  moon: { name: 'Moonlit Thread', price: 60, description: 'A silver thread sewn into your tote. Permanently gain 15 maximum stamina.', symbol: '☾' },
  echo: { name: 'Echo of a Red Pen', price: 75, description: 'Someone has already marked this one. Your basic weapon hits deal 3 extra damage.', symbol: '✧' },
};
export function buyCharm(s: StudioSave, charm: Charm): boolean {
  const item = CHARMS[charm];
  if (!item || s.charms[charm] || s.coins < item.price) return false;
  s.coins -= item.price; s.charms[charm] = true;
  if (charm === 'moon') s.stamina += 15;
  return true;
}
