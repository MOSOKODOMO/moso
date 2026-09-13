/**
 * CombatSystem — melee sweep resolution shared by player AND enemies.
 * Anything hittable implements CombatTarget (no circular imports).
 */
import { calculateDamage } from './DamageSystem';

export interface CombatTarget {
  isAlive(): boolean;
  getCenterX(): number;
  getCenterY(): number;
  getDefense(): number;
  getCritChance(): number;
  applyHit(damage: number, isCrit: boolean, knockDir: number): void;
}

export interface MeleeOptions {
  attackerX: number;
  attackerYFeet: number;
  attackerAttack: number;
  attackerCritChance: number;
  /** Crit damage multiplier (defaults to the global 2.5×). */
  attackerCritMult?: number;
  facing: number;
  range: number;
  arcHeight: number;
  targets: CombatTarget[];
  onHit: (target: CombatTarget, damage: number, isCrit: boolean) => void;
}

/** Sweeps a melee arc; returns the number of targets hit. */
export function meleeAttack(opts: MeleeOptions): number {
  let hits = 0;
  const attackerCenterY = opts.attackerYFeet + 0.8;
  for (const target of opts.targets) {
    if (!target.isAlive()) continue;
    const dx = target.getCenterX() - opts.attackerX;
    if (dx * opts.facing < -0.3) continue; // behind the attacker
    if (Math.abs(dx) > opts.range) continue;
    if (Math.abs(target.getCenterY() - attackerCenterY) > opts.arcHeight) continue;
    const { damage, isCrit } = calculateDamage(
      opts.attackerAttack,
      target.getDefense(),
      opts.attackerCritChance,
      opts.attackerCritMult,
    );
    target.applyHit(damage, isCrit, opts.facing);
    opts.onHit(target, damage, isCrit);
    hits += 1;
  }
  return hits;
}
