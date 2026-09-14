import { TEACHERS, assignTeachers, sanitizeAssignments } from './Teachers';
import { defaultAppearance, sanitizeAppearance, type CharacterAppearance } from './CharacterAppearance';
import { sanitizeInventions, type Invention } from './Inventions';
import { newWeaponMods, sanitizeWeaponMods, type WeaponMods } from './WeaponMods';
import { ITEMS, WEAPON_IDS, STARTER_WEAPONS, isWeapon, isShopItem, type Weapon } from './ItemCatalog';
export type { Weapon } from './ItemCatalog';
export type QuickSlots = [Weapon | null, Weapon | null, Weapon | null];
export type Place = 'lobby' | 'foyer' | 'mystery' | 'studio' | 'home' | 'skills' | 'tools' | 'restaurant';
export type Route = 'study' | 'fight';
export type ActivityKind = 'class' | 'work' | 'homework';
export interface ActivityRecord { day: number; studio: number; kind: ActivityKind }
export const SAVE_KEY = 'studio-100-save-v1';
export const CLASS_SECONDS = 16;
export const WORK_SECONDS = 15;
export const WORK_PAY = 45;
export const KNOWLEDGE_REQUIRED = 7;
export const PASS_KNOWLEDGE = 5;
export const HOMEWORK_SECONDS = 12;
export const SEMESTER_DAYS = 14;
export const HD_REWARD = 90;
export const STUDIO_NAMES = ['Foundations', 'Form & Space', 'Material & Texture', 'Structure & Balance', 'Light & Shadow', 'Dwelling & Place', 'City & Context', 'Composition & Detail', 'The Grand Atelier'];
export const WEAPONS = ITEMS;
export const newToolRanks = () => Object.fromEntries(WEAPON_IDS.map(id => [id, 0])) as Record<Weapon, number>;
export interface StudioSave {
  version: 1; catalogueVersion: 1; level: number; xp: number; coins: number; stamina: number; day: number; workShifts: number;
  studio: number; place: Place; knowledge: number[]; cleared: (Route | null)[];
  activities: ActivityRecord[]; semesterStarts: number[]; activityBudget: number; activityBudgetDay: number;
  weapon: Weapon; weaponEquipped: boolean; owned: Weapon[]; quickSlots: QuickSlots; toolRanks: Record<Weapon, number>;
  endurance: number; strength: number; efficiency: number; shoes: boolean; introSeen: boolean;
  charms: { anchor: boolean; moon: boolean; echo: boolean };
  teacherAssignments: string[];
  professorWins: string[];
  appearance: CharacterAppearance;
  characterCreated: boolean;
  inventions: Partial<Record<Weapon, Invention>>;
  weaponMods: WeaponMods;
}
export function newStudent(): StudioSave {
  return { version: 1, catalogueVersion: 1, level: 1, xp: 0, coins: 90, stamina: 100, day: 1, workShifts: 0, studio: 1, place: 'lobby',
    activities: [], semesterStarts: [1, 0, 0, 0, 0, 0, 0, 0, 0], activityBudget: 100, activityBudgetDay: 0,
    knowledge: Array(9).fill(0), cleared: Array(9).fill(null), weapon: 'pen', weaponEquipped: false, owned: [], quickSlots: [null, null, null],
    toolRanks: newToolRanks(), endurance: 0, strength: 0, efficiency: 0, shoes: false, introSeen: false,
    charms: { anchor: false, moon: false, echo: false }, teacherAssignments: assignTeachers(), professorWins: [], appearance:defaultAppearance(), characterCreated:false, inventions:{}, weaponMods:newWeaponMods() };
}
const integer = (v: unknown, min: number, max: number, fallback: number) => typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.floor(v))) : fallback;
export const maxStamina = (s: StudioSave) => 100 + (s.level - 1) * 5 + s.endurance * 20 + (s.charms?.moon ? 15 : 0);
export const xpNeeded = (s: StudioSave) => 60 + (s.level - 1) * 20;
/** All work counts together; learning limits apply to the selected studio. Omit kind for the daily total. */
export const activityCount = (s: StudioSave, kind?: ActivityKind, studio = s.studio) =>
  s.activities.filter(a => a.day === s.day && (!kind || a.kind === kind) && (!kind || kind === 'work' || a.studio === studio)).length;
export const hasActivity = (s: StudioSave, kind: ActivityKind, studio = s.studio) => activityCount(s, kind, studio) > 0;
export const dailyActivityCost = (s: StudioSave) => {
  const budget = s.activityBudgetDay === s.day ? s.activityBudget : maxStamina(s);
  return activityCount(s) === 0 ? Math.ceil(budget / 2) : Math.floor(budget / 2);
};
export const classCost = (s: StudioSave, _studio = s.studio) => dailyActivityCost(s);
export const workCost = (s: StudioSave) => dailyActivityCost(s);
export const homeworkCost = (s: StudioSave) => dailyActivityCost(s);
export const unlockedStudio = (s: StudioSave) => { const first = s.cleared.indexOf(null); return first === -1 ? 9 : first + 1; };
export function beginSemester(s: StudioSave, studio = s.studio): boolean {
  if (!Number.isInteger(studio) || studio < 1 || studio > unlockedStudio(s) || s.semesterStarts[studio - 1] > 0) return false;
  s.semesterStarts[studio - 1] = s.day;
  return true;
}
/** Days beyond fourteen are catch-up days; knowledge and progress are never reset. */
export const semesterDay = (s: StudioSave, studio = s.studio) => {
  const started = s.semesterStarts[studio - 1];
  return started > 0 ? Math.max(1, s.day - started + 1) : 1;
};
const knowledgeScore = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
  ? Math.max(0, Math.min(KNOWLEDGE_REQUIRED, Math.floor(value * 2) / 2)) : 0;

function sanitizeActivities(raw: unknown, day: number): ActivityRecord[] {
  if (!Array.isArray(raw)) return [];
  const records: ActivityRecord[] = [];
  for (const value of raw) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const a = value as Partial<ActivityRecord>;
    if (!Number.isSafeInteger(a.day) || a.day! < 1 || a.day! > day ||
      !Number.isInteger(a.studio) || a.studio! < 1 || a.studio! > 9 ||
      (a.kind !== 'class' && a.kind !== 'work' && a.kind !== 'homework')) continue;
    records.push({ day: a.day!, studio: a.studio!, kind: a.kind });
  }
  records.sort((a, b) => a.day - b.day);
  const unique = new Set<string>(), dailyCounts = new Map<number, number>();
  return records.filter(a => {
    const key = a.day + ':' + a.studio + ':' + a.kind;
    const count = dailyCounts.get(a.day) ?? 0;
    if (count >= 2 || (a.kind !== 'work' && unique.has(key))) return false;
    unique.add(key); dailyCounts.set(a.day, count + 1); return true;
  }).slice(-180);
}
function canSpendActivity(s: StudioSave, kind: ActivityKind): boolean {
  const cost = dailyActivityCost(s);
  return activityCount(s) < 2 && (kind === 'work' || !hasActivity(s, kind)) &&
    Number.isFinite(cost) && cost > 0 && Number.isFinite(s.stamina) && s.stamina >= cost;
}
function spendActivity(s: StudioSave, kind: ActivityKind): void {
  // Capture before awarding XP so a level-up cannot change the second half of today's budget.
  if (s.activityBudgetDay !== s.day) { s.activityBudget = maxStamina(s); s.activityBudgetDay = s.day; }
  const cost = dailyActivityCost(s);
  s.stamina -= cost;
  s.activities.push({ day: s.day, studio: s.studio, kind });
  if (s.activities.length > 180) s.activities.splice(0, s.activities.length - 180);
}
export function sanitizeSave(raw: unknown): StudioSave {
  const s = newStudent();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || (raw as Partial<StudioSave>).version !== 1) return s;
  const r = raw as Partial<StudioSave>;
  s.inventions = sanitizeInventions(r.inventions); s.weaponMods = sanitizeWeaponMods(r.weaponMods);
  s.appearance=sanitizeAppearance(r.appearance); s.characterCreated=r.characterCreated===true;
  s.level = integer(r.level, 1, 30, 1); s.xp = integer(r.xp, 0, xpNeeded(s) - 1, 0);
  s.coins = integer(r.coins, 0, 99999, 90); s.day = integer(r.day, 1, 9999, 1);
  s.workShifts = integer(r.workShifts, 0, 99999, 0);
  s.endurance = integer(r.endurance, 0, 5, 0); s.strength = integer(r.strength, 0, 5, 0); s.efficiency = integer(r.efficiency, 0, 5, 0);
  for (const key of ['anchor', 'moon', 'echo'] as const) s.charms[key] = r.charms?.[key] === true;
  s.stamina = integer(r.stamina, 0, maxStamina(s), maxStamina(s));
  let chain = true;
  for (let i = 0; i < 9; i++) {
    const route = r.cleared?.[i];
    s.cleared[i] = chain && (route === 'study' || route === 'fight') ? route : null;
    if (!s.cleared[i]) chain = false;
    // Keep recorded scores, including valid clears earned under the former three-point rule.
    s.knowledge[i] = knowledgeScore(Array.isArray(r.knowledge) ? r.knowledge[i] : undefined);
  }
  s.studio = integer(r.studio, 1, unlockedStudio(s), 1);
  s.activities = sanitizeActivities(r.activities, s.day);
  s.semesterStarts = Array.from({ length: 9 }, (_, i) => i >= unlockedStudio(s) ? 0 :
    integer(Array.isArray(r.semesterStarts) ? r.semesterStarts[i] : undefined, 0, s.day, i === 0 ? 1 : 0));
  s.activityBudget = integer(r.activityBudget, 100, 360, maxStamina(s));
  s.activityBudgetDay = Number.isSafeInteger(r.activityBudgetDay) && r.activityBudgetDay! >= 1 && r.activityBudgetDay! <= s.day ? r.activityBudgetDay! : 0;
  s.teacherAssignments = sanitizeAssignments(r.teacherAssignments, s.teacherAssignments);
  s.professorWins = s.cleared.every(Boolean) && Array.isArray(r.professorWins) ? TEACHERS.filter(t=>r.professorWins!.includes(t.id)).map(t=>t.id) : [];
  if (['lobby', 'foyer', 'mystery', 'studio', 'home', 'skills', 'tools', 'restaurant'].includes(r.place ?? '')) s.place = r.place!;
  // Retired street saves fall back to the illustrated lobby without losing progress.
  const rawRanks = r.toolRanks && typeof r.toolRanks === 'object' && !Array.isArray(r.toolRanks) ? r.toolRanks : {};
  // Upgrade records survive even when an item is not in the current backpack.
  for (const weapon of WEAPON_IDS) s.toolRanks[weapon] = integer((rawRanks as Record<string, unknown>)[weapon], 0, 5, 0);
  const currentCatalogue = r.catalogueVersion === 1;
  if (currentCatalogue) {
    s.owned = Array.isArray(r.owned) ? [...new Set(r.owned.filter(isWeapon))] : [];
    const used = new Set<Weapon>();
    s.quickSlots = [0, 1, 2].map(index => {
      const id = Array.isArray(r.quickSlots) ? r.quickSlots[index] : null;
      if (!isWeapon(id) || !s.owned.includes(id) || used.has(id)) return null;
      used.add(id); return id;
    }) as QuickSlots;
  } else {
    // Earlier versions gave away all three basics. Keep only paid legacy equipment.
    const legacyOwned = Array.isArray(r.owned) ? r.owned : STARTER_WEAPONS;
    s.owned = STARTER_WEAPONS.filter(id => legacyOwned.includes(id) &&
      (s.toolRanks[id] > 0 || !!s.inventions[id] || s.weaponMods[id].enhancement > 0 || s.weaponMods[id].relic !== null));
  }
  const selectedIsOwned = isWeapon(r.weapon) && s.owned.includes(r.weapon);
  s.weapon = selectedIsOwned ? r.weapon! : s.owned[0] ?? 'pen';
  s.weaponEquipped = currentCatalogue && selectedIsOwned && r.weaponEquipped === true;
  s.shoes = r.shoes === true; s.introSeen = r.introSeen === true;
  // Only a full seven-point pending studio is eligible for automatic completion.
  const pendingStudio = unlockedStudio(s), savedStudio = s.studio;
  // Locked studios cannot contain earned class progress.
  for (let i = pendingStudio; i < s.knowledge.length; i++) if (!s.cleared[i]) s.knowledge[i] = 0;
  if (!s.cleared[pendingStudio - 1] && s.knowledge[pendingStudio - 1] >= KNOWLEDGE_REQUIRED) {
    s.studio = pendingStudio; completeStudio(s, 'study'); s.studio = savedStudio;
  }
  return s;
}
export function gainXP(s: StudioSave, amount: number): void {
  s.xp += amount;
  while (s.level < 30 && s.xp >= xpNeeded(s)) { s.xp -= xpNeeded(s); s.level++; }
  if (s.level === 30) s.xp = Math.min(s.xp, xpNeeded(s) - 1);
}
export function completeStudio(s: StudioSave, route: Route): boolean {
  const i = s.studio - 1;
  if (!Number.isInteger(s.studio) || s.studio < 1 || s.studio > unlockedStudio(s) || s.cleared[i] ||
    (route !== 'study' && route !== 'fight') ||
    (route === 'study' && (!Number.isFinite(s.knowledge[i]) || s.knowledge[i] < PASS_KNOWLEDGE))) return false;
  s.cleared[i] = route;
  if (route === 'study' && s.knowledge[i] >= KNOWLEDGE_REQUIRED) s.coins += HD_REWARD;
  gainXP(s, 65 + s.studio * 5);
  return true;
}
const canLearn = (s: StudioSave) => Number.isInteger(s.studio) && s.studio >= 1 && s.studio <= unlockedStudio(s) &&
  !s.cleared[s.studio - 1] && Number.isFinite(s.knowledge[s.studio - 1]) &&
  s.knowledge[s.studio - 1] >= 0 && s.knowledge[s.studio - 1] < KNOWLEDGE_REQUIRED;

export function completeClass(s: StudioSave): { ok: boolean; cleared: boolean } {
  if (s.place !== 'studio' || !canLearn(s) || !canSpendActivity(s, 'class')) return { ok: false, cleared: false };
  beginSemester(s);
  spendActivity(s, 'class');
  s.knowledge[s.studio - 1] = Math.min(KNOWLEDGE_REQUIRED, knowledgeScore(s.knowledge[s.studio - 1]) + 1);
  gainXP(s, 15);
  return { ok: true, cleared: s.knowledge[s.studio - 1] >= KNOWLEDGE_REQUIRED && completeStudio(s, 'study') };
}
export function completeHomework(s: StudioSave): { ok: boolean; cleared: boolean } {
  if (s.place !== 'home' || !canLearn(s) || !canSpendActivity(s, 'homework')) return { ok: false, cleared: false };
  beginSemester(s);
  spendActivity(s, 'homework');
  s.knowledge[s.studio - 1] = Math.min(KNOWLEDGE_REQUIRED, knowledgeScore(s.knowledge[s.studio - 1]) + .5);
  gainXP(s, 8);
  return { ok: true, cleared: s.knowledge[s.studio - 1] >= KNOWLEDGE_REQUIRED && completeStudio(s, 'study') };
}
/** Called only after the timed shift finishes; cancellation has no cost or reward. */
export function completeWorkShift(s: StudioSave): boolean {
  if (s.place !== 'restaurant' || !canSpendActivity(s, 'work') ||
    !Number.isSafeInteger(s.coins) || s.coins < 0 || s.coins > Number.MAX_SAFE_INTEGER - WORK_PAY ||
    !Number.isSafeInteger(s.workShifts) || s.workShifts < 0 || s.workShifts === Number.MAX_SAFE_INTEGER) return false;
  spendActivity(s, 'work');
  s.coins += WORK_PAY; s.workShifts++;
  return true;
}

/** Buy once, keep the item in the backpack, and put it in the first available quick slot. */
export function buyItem(s: StudioSave, id: unknown): boolean {
  if (!isShopItem(id) || !Array.isArray(s.owned) || s.owned.includes(id) ||
    !Array.isArray(s.quickSlots) || s.quickSlots.length !== 3 ||
    !Number.isSafeInteger(s.coins) || s.coins < ITEMS[id].price) return false;
  const slot = s.quickSlots.indexOf(null);
  const selectedSlot = s.quickSlots.indexOf(s.weapon);
  s.coins -= ITEMS[id].price; s.owned.push(id);
  s.quickSlots[slot >= 0 ? slot : selectedSlot >= 0 ? selectedSlot : 0] = id;
  s.weapon = id; s.weaponEquipped = true;
  return true;
}
export function rest(s: StudioSave): void {
  s.day++; s.stamina = maxStamina(s); s.place = 'home';
  s.activityBudget = maxStamina(s); s.activityBudgetDay = 0;
}
export type Upgrade = 'strength' | 'endurance' | 'efficiency' | 'tool' | 'shoes' | 'snack';
export function upgradeCost(s: StudioSave, kind: Upgrade): number {
  if (kind === 'tool') return 35 + s.toolRanks[s.weapon] * 30;
  if (kind === 'endurance' || kind === 'strength') return 40 + s[kind] * 10;
  if (kind === 'efficiency') return 40 + s.efficiency * 35;
  return kind === 'shoes' ? 65 : 15;
}
export function buyUpgrade(s: StudioSave, kind: Upgrade): boolean {
  if (kind === 'tool' && (!isWeapon(s.weapon) || !s.owned.includes(s.weapon))) return false;
  const cost = upgradeCost(s, kind), training = kind === 'endurance' || kind === 'strength';
  const balance = training ? s.stamina : s.coins;
  if (!Number.isFinite(cost) || !Number.isFinite(balance) || balance < cost) return false;
  if ((kind === 'endurance' || kind === 'strength' || kind === 'efficiency') && s[kind] >= 5) return false;
  if (kind === 'tool' && s.toolRanks[s.weapon] >= 5) return false;
  if (kind === 'shoes' && s.shoes) return false;
  if (kind === 'snack' && s.stamina >= maxStamina(s)) return false;
  if (training) s.stamina -= cost; else s.coins -= cost;
  if (kind === 'tool') s.toolRanks[s.weapon]++;
  else if (kind === 'endurance') s.endurance++;
  else if (kind === 'strength') s.strength++;
  else if (kind === 'efficiency') s.efficiency++;
  else if (kind === 'shoes') s.shoes = true;
  else s.stamina = Math.min(maxStamina(s), s.stamina + 35);
  return true;
}

export type Charm = keyof StudioSave['charms'];
export const CHARMS: Record<Charm, { name: string; price: number; description: string; symbol: string }> = {
  anchor: { name: 'The Quiet Anchor', price: 45, description: 'A paperweight that feels heavier in your pocket. Take 35% less knockback from instructor hits.', symbol: '◇' },
  moon: { name: 'Moonlit Thread', price: 60, description: 'A silver thread sewn into your backpack. Permanently gain 15 maximum stamina.', symbol: '☾' },
  echo: { name: 'Echo of a Red Pen', price: 75, description: 'Someone has already marked this one. Your basic weapon hits deal 3 extra damage.', symbol: '✧' },
};
export function buyCharm(s: StudioSave, charm: Charm): boolean {
  const item = CHARMS[charm];
  if (!item || s.charms[charm] || s.coins < item.price) return false;
  s.coins -= item.price; s.charms[charm] = true;
  if (charm === 'moon') s.stamina += 15;
  return true;
}
