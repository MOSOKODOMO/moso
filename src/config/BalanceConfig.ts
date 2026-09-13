/**
 * BalanceConfig — SINGLE SOURCE OF TRUTH for tuning numbers.
 * Rebalance the game by editing values here, never core logic.
 *
 * Formulas mirror the project brief:
 *   baseHP     = 100 + (level - 1) * 8
 *   baseAttack = 10  + (level - 1) * 0.7
 *   baseDefense= 2   + (level - 1) * 0.25
 *   xpRequired = round(65 * 1.12^(level-1))
 */

export const BalanceConfig = {
  // --- Player base stats & per-level automatic growth ---
  maxLevel: 30,
  baseHP: 100,
  hpPerLevel: 8,
  baseAttack: 10,
  attackPerLevel: 0.7,
  baseDefense: 2,
  defensePerLevel: 0.25,
  baseCritChance: 0.05,
  critChanceCap: 0.4,
  critMultiplier: 2.5,

  // --- EXP curve ---
  xpBase: 65,
  xpGrowth: 1.12,

  // --- Mana ---
  baseMP: 30,
  mpRegenBase: 1.5,
  mpRegenPerInt: 0.15,

  // --- Level-up points ---
  statPointsPerLevel: 3,
  skillPointsPerLevel: 1,

  // --- STR: brawler stat (Phase 2 MMO curve: gear carries, stats season) ---
  strHP: 2,
  strAttack: 0.6,

  // --- AGI: speed stat (move speed + dodge) ---
  agiDodgePerPoint: 0.0008,
  dodgeCap: 0.25,
  agiMovePerPoint: 0.0012,
  agiCooldownPerPoint: 0.015,
  agiCooldownReductionCap: 0.5,

  // --- CRIT stat: +0.25% crit chance per point (crits hit 2.5x) ---
  critPerPoint: 0.0025,

  // --- INT: caster stat (mana + skill power) ---
  intMP: 2,
  intSkillPowerPerPoint: 0.005,

  // --- Out-of-combat recovery ---
  outOfCombatDelay: 4,
  outOfCombatRegenPerSec: 0.04,

  // --- Battle Tonic (+10% attack, 30s) ---
  tonicAttackMult: 1.1,
  tonicDuration: 30,

  // --- Blacksmith enhancement (+12% of base main stat per level, always succeeds) ---
  maxEnhance: 10,
  enhanceBonusPerLevel: 0.12,
  enhanceCostBase: 5,
  enhanceCostTierPow: 1.25,
  enhanceCostLevelPow: 1.1,

  // --- Auto-skill reaction delay (manual play stays slightly better) ---
  autoSkillDelay: 0.2,

  // --- Movement / physics feel ---
  moveSpeed: 6.5,
  jumpVelocity: 10.5,
  gravity: -26,

  // --- Player melee attack ---
  attackRange: 1.8,
  attackArcHeight: 1.4,
  attackCooldown: 0.38,
  /** Seconds of invulnerability after taking a hit (prevents instant melt). */
  playerInvulnTime: 0.9,

  // --- Enemy behaviour (floor-1 placeholder slime uses these) ---
  enemyAggroRange: 7,
  enemyAttackRange: 0.85,
  enemyAttackCooldown: 1.1,
  enemyTouchCooldown: 1.0,
  enemyRespawnDelay: 5,

  // --- Floor scaling exponents (brief: monsters scale by FLOOR, never player level) ---
  floorHPGrowth: 1.55,
  floorAttackGrowth: 1.38,
  floorDefenseGrowth: 1.32,
  floorXPGrowth: 1.48,
  floorGoldGrowth: 1.42,
} as const;

/** Automatic base stats for a given player level (before gear / stat points). */
export function playerBaseStats(level: number): { hp: number; attack: number; defense: number } {
  return {
    hp: BalanceConfig.baseHP + (level - 1) * BalanceConfig.hpPerLevel,
    attack: BalanceConfig.baseAttack + (level - 1) * BalanceConfig.attackPerLevel,
    defense: BalanceConfig.baseDefense + (level - 1) * BalanceConfig.defensePerLevel,
  };
}

/** EXP required to go from `level` to `level + 1`. */
export function xpRequired(level: number): number {
  return Math.round(BalanceConfig.xpBase * Math.pow(BalanceConfig.xpGrowth, level - 1));
}
