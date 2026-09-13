/**
 * DamageSystem — the brief's combat formula, in one place:
 *   damage = attack * (100 / (100 + defense)), min 1, rounded.
 *   crit   = damage × 1.75
 */
import { BalanceConfig } from '../config/BalanceConfig';

export interface DamageResult {
  damage: number;
  isCrit: boolean;
}

export function rollCrit(critChance: number): boolean {
  return Math.random() < Math.min(critChance, BalanceConfig.critChanceCap);
}

export function calculateDamage(
  attack: number,
  defense: number,
  critChance: number,
  critMult: number = BalanceConfig.critMultiplier,
): DamageResult {
  const isCrit = rollCrit(critChance);
  let damage = attack * (100 / (100 + defense));
  if (isCrit) damage *= critMult;
  return { damage: Math.max(1, Math.round(damage)), isCrit };
}

/** Enhancement cost: round(5 * tier^1.25 * nextLevel^1.10). Always succeeds. */
export function enhancementCost(tier: number, nextLevel: number): number {
  return Math.round(
    BalanceConfig.enhanceCostBase *
      Math.pow(tier, BalanceConfig.enhanceCostTierPow) *
      Math.pow(nextLevel, BalanceConfig.enhanceCostLevelPow),
  );
}
