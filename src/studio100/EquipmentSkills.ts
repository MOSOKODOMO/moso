import { ITEMS, isWeapon, type Weapon } from './ItemCatalog';

export interface SkillEvent {
  /** Seconds after the skill starts. */
  at: number;
  kind: 'melee' | 'projectile' | 'flash';
  /** Multiplier applied to the player's final basic-attack damage. */
  power: number;
  range: number;
  force: number;
  lift: number;
  slow: number;
  stun: number;
  style: 'arc' | 'ring' | 'line' | 'splash' | 'flash';
  bounces: number;
}
export interface EquipmentSkillPlan {
  duration: number;
  dash: number;
  lift: number;
  /** Seconds of frontal damage reduction; the combat layer applies the reduction. */
  guard: number;
  /** Seconds during which incoming objects can be reflected. */
  reflect: number;
  events: SkillEvent[];
}
const event = (changes: Partial<SkillEvent>): SkillEvent => ({
  at: .12, kind: 'melee', power: 1, range: 3, force: 5, lift: 0,
  slow: 0, stun: 0, style: 'arc', bounces: 0, ...changes,
});
const plan = (duration: number, events: SkillEvent[], changes: Partial<Omit<EquipmentSkillPlan, 'events'>> = {}): EquipmentSkillPlan =>
  ({ duration, dash: 0, lift: 0, guard: 0, reflect: 0, ...changes, events });
const bounded = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Pure timing and movement data. Charging stamina, cooldowns and hits belongs to combat. */
export function skillPlan(weapon: Weapon, baseRange: number): EquipmentSkillPlan {
  if (!isWeapon(weapon)) return plan(0, []);
  const range = Number.isFinite(baseRange) ? bounded(baseRange, .5, 24) : ITEMS[weapon].range;
  const meleeRange = (factor = 1, min = .5, max = 8) => bounded(range * factor, min, max);
  const burst = (power: number, style: SkillEvent['style'], force: number): SkillEvent[] =>
    [.06, .18, .30].map(at => event({ at, kind: 'projectile', power, range: bounded(range, 5, 24), force, style }));
  switch (ITEMS[weapon].skill) {
    case 'slam':
      return plan(.58, [event({ at: .25, power: 1.6, range: meleeRange(1.35, 3.6, 5), force: 7, lift: 6, style: 'ring' })], { lift: 6 });
    case 'flurry':
      return plan(.5, [.08, .21, .34].map(at => event({ at, power: .55, range: meleeRange(1.1, 1.8, 3), force: 2, stun: .06, style: 'line' })));
    case 'homeRun':
      return plan(.7, [event({ at: .3, power: 1.8, range: meleeRange(1.15, 3, 6), force: 16, lift: 9 })]);
    case 'canopy':
      return plan(1.4, [event({ at: .14, power: .65, range: meleeRange(1.1, 2.6, 4), force: 6 })], { guard: 1.4 });
    case 'brace':
      return plan(1.6, [event({ at: .18, power: .9, range: meleeRange(1.1, 2.6, 4), force: 9, lift: 2, style: 'ring' })], { guard: 1.6 });
    case 'leadstorm':
      return plan(.48, burst(.65, 'line', 2));
    case 'extend':
      return plan(.55, [event({ at: .18, power: 1.4, range: meleeRange(1.75, 5, 8), force: 8, lift: 2, style: 'line' })]);
    case 'paintwave':
      return plan(.5, [event({ at: .12, kind: 'projectile', power: 1.3, range: bounded(range * 3.5, 9, 14), force: 5, lift: 3, style: 'splash' })]);
    case 'stapleburst':
      return plan(.48, burst(.6, 'line', 3));
    case 'ricochet':
      return plan(.45, [event({ at: .1, kind: 'projectile', power: 1.25, range: bounded(range * 1.5, 14, 24), force: 5, lift: 2, style: 'ring', bounces: 2 })]);
    case 'snapline':
      return plan(.52, [event({ at: .18, power: 1.35, range: meleeRange(1.8, 5, 8), force: 6, stun: .15, style: 'line' })]);
    case 'sticky':
      return plan(.52, [event({ at: .18, power: 1.1, range: meleeRange(1.15, 2.6, 4), force: 3, slow: 2, style: 'splash' })]);
    case 'splash':
      return plan(.5, [event({ at: .15, kind: 'projectile', power: 1.35, range: bounded(range, 8, 20), force: 7, lift: 3, style: 'splash' })]);
    case 'flash':
      return plan(.52, [event({ at: .14, kind: 'flash', power: .7, range: meleeRange(1.7, 4.8, 6), force: 2, stun: .6, style: 'flash' })]);
    case 'rapidJab':
      return plan(.5, [.08, .21, .34].map(at => event({ at, power: .55, range: meleeRange(1.15, 2.6, 4), force: 2.5, style: 'line' })));
    case 'reflect':
      return plan(.65, [event({ at: .18, power: 1.15, range: meleeRange(1.1, 3.5, 5.5), force: 8, lift: 3 })], { reflect: 1 });
    case 'clang':
      return plan(.68, [event({ at: .27, power: 1.65, range: meleeRange(1.1, 3.2, 5), force: 13, lift: 7, stun: .2, style: 'ring' })]);
    case 'slide':
      return plan(.52, [event({ at: .14, power: 1.4, range: meleeRange(1.1, 3, 5), force: 10, lift: 4 })], { dash: 18 });
    case 'swing':
      return plan(.6, [event({ at: .23, power: 1.4, range: meleeRange(1.45, 4, 6), force: 10, lift: 4 })]);
    case 'keyburst':
      return plan(.48, burst(.65, 'flash', 2.5));
    default:
      return plan(0, []);
  }
}
