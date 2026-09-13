/**
 * Player — stats + side-view physics body.
 * Stat POINT allocation and gear bonuses arrive in later phases;
 * formulas already come from BalanceConfig so growth curves are final.
 */
import * as THREE from 'three';
import { BalanceConfig, playerBaseStats, xpRequired } from '../config/BalanceConfig';
import { GameConfig } from '../config/GameConfig';
import { SLOT_ORDER } from '../config/ItemDefs';
import type { RelicId } from '../config/ItemConfig';
import { DASH_DISTANCE, DASH_SPEED, SKILL_DEFS, SKILL_ORDER, type SkillId } from '../config/SkillConfig';
import type { DungeonFloor } from '../dungeon/DungeonFloor';
import type { EquipmentManager } from '../items/Equipment';
import type { FloorRelicManager } from '../relics/FloorRelics';
import type { StatId } from '../systems/SaveManager';
import { clamp } from '../utils/MathUtils';
import { PlayerAppearance } from './PlayerAppearance';
import type { CombatTarget } from '../combat/CombatSystem';

/** Additive stat breakdown for the character panel (Base + STR + Equip + Relics, then buffs). */
export interface AdditiveBreakdown {
  base: number;
  str: number;
  equip: number;
  relic: number;
  buffMult: number;
  final: number;
}

export interface StatBreakdown {
  attack: AdditiveBreakdown;
  defense: AdditiveBreakdown;
  maxHP: AdditiveBreakdown;
  maxMP: AdditiveBreakdown;
  critChance: { base: number; crit: number; equip: number; relic: number; final: number };
  dodge: { agi: number; equip: number; final: number };
  moveSpeed: { agi: number; equip: number; berserk: number; final: number };
  skillDamage: { int: number; equip: number; relic: number; berserk: number; final: number };
}

export class Player implements CombatTarget {
  readonly appearance: PlayerAppearance;

  // --- Build: allocated stat points (STR/AGI/CRIT/INT) ---
  level = 1;
  exp = 0;
  gold = 0;
  stats = { str: 0, agi: 0, crit: 0, int: 0 };
  statPoints = 0;
  // --- Skills ---
  skillSystemUnlocked = false;
  skillPoints = 0;
  skillLevels: Record<SkillId, number> = { power: 0, bolt: 0, heal: 0 };
  // --- Derived combat stats (recomputed from level + build + gear + relics) ---
  maxHP: number = BalanceConfig.baseHP;
  hp: number = this.maxHP;
  maxMP: number = BalanceConfig.baseMP;
  mp: number = this.maxMP;
  attack: number = BalanceConfig.baseAttack;
  defense: number = BalanceConfig.baseDefense;
  critChance: number = BalanceConfig.baseCritChance;
  attackCooldown: number = BalanceConfig.attackCooldown;
  dodgeChance = 0;
  /** Legacy charm relics (Phase 1 stat charms, always passive). */
  relicBonus: Record<RelicId, number> = { str: 0, agi: 0, crit: 0, int: 0 };
  /** Visual tiers (synced from equipped weapon/armor by Game). */
  weaponTier = 1;
  armorTier = 0;
  /** Gear + relic managers (wired by Game; null-safe). */
  equipment: EquipmentManager | null = null;
  floorRelics: FloorRelicManager | null = null;
  // --- Derived multipliers / buffs ---
  moveSpeedMult = 1;
  skillDamageMult = 1;
  critDamageMult: number = BalanceConfig.critMultiplier;
  damageReduction = 0;
  goldGainMult = 1;
  lifesteal = 0;
  tonicTime = 0;
  speedTonicTime = 0;
  vampiric = false;
  goldenTouch = false;
  manaEcho = false;
  berserkerRage = false;
  /** Component breakdown of the last recompute (character panel). */
  lastBreakdown!: StatBreakdown;

  // --- Physics (x / y = feet position) ---
  x: number = GameConfig.playerSpawnX;
  y: number = GameConfig.groundY;
  vx = 0;
  vy = 0;
  onGround = true;
  facing: 1 | -1 = 1;

  private attackTimer = 0;
  private invulnTimer = 0;
  private moveAxis = 0;
  private timeSinceCombat = 99;
  private dashTime = 0;
  private dashDir: 1 | -1 = 1;
  berserkActive = false;
  berserkTime = 0;

  constructor(private readonly scene: THREE.Scene) {
    this.appearance = new PlayerAppearance(scene);
    this.recomputeStats();
    this.hp = this.maxHP;
    this.appearance.setWeaponTier(this.weaponTier);
    this.appearance.setArmorTier(this.armorTier);
  }

  // --- CombatTarget interface (lets enemies hit the player via CombatSystem) ---
  isAlive(): boolean {
    return this.hp > 0;
  }
  getCenterX(): number {
    return this.x;
  }
  getCenterY(): number {
    return this.y + 0.8;
  }
  getDefense(): number {
    return this.defense;
  }
  getCritChance(): number {
    return this.critChance;
  }
  applyHit(damage: number, _isCrit: boolean, _knockDir: number): void {
    this.takeDamage(damage);
  }

  get alive(): boolean {
    return this.isAlive();
  }

  recomputeStats(): void {
    const base = playerBaseStats(this.level);
    const gear = this.equipment ? this.equipment.aggregates() : null;
    const relicFx = this.floorRelics ? this.floorRelics.effects() : null;
    const g = (v: number | undefined): number => v ?? 0;
    // Allocation + charms + gear affixes.
    const str = this.effStat('str') + g(gear?.str);
    const agi = this.effStat('agi') + g(gear?.agi);
    const crit = this.effStat('crit') + g(gear?.crit);
    const int = this.effStat('int') + g(gear?.int);

    // Legendary passives currently equipped (no stacking — set semantics).
    const passives = new Set<string>();
    if (this.equipment) {
      for (const slot of SLOT_ORDER) {
        const p = this.equipment.equipped[slot]?.legendaryPassive;
        if (p) passives.add(p);
      }
    }
    this.vampiric = passives.has('vampiric');
    this.goldenTouch = passives.has('goldenTouch');
    this.manaEcho = passives.has('manaEcho');
    this.berserkerRage = passives.has('berserkerRage');

    const bd: StatBreakdown = {
      attack: { base: base.attack, str: 0, equip: 0, relic: 0, buffMult: 1, final: 0 },
      defense: { base: base.defense, str: 0, equip: 0, relic: 0, buffMult: 1, final: 0 },
      maxHP: { base: base.hp, str: 0, equip: 0, relic: 0, buffMult: 1, final: 0 },
      maxMP: { base: BalanceConfig.baseMP, str: 0, equip: 0, relic: 0, buffMult: 1, final: 0 },
      critChance: { base: 0, crit: 0, equip: 0, relic: 0, final: 0 },
      dodge: { agi: 0, equip: 0, final: 0 },
      moveSpeed: { agi: 0, equip: 0, berserk: 0, final: 0 },
      skillDamage: { int: 0, equip: 0, relic: 0, berserk: 0, final: 0 },
    };

    bd.maxHP.str = str * BalanceConfig.strHP;
    bd.maxHP.equip = g(gear?.hp);
    this.maxHP = Math.round(base.hp + bd.maxHP.str + bd.maxHP.equip);
    bd.maxHP.final = this.maxHP;
    bd.maxMP.str = int * BalanceConfig.intMP;
    bd.maxMP.equip = g(gear?.mp);
    this.maxMP = Math.round(BalanceConfig.baseMP + bd.maxMP.str + bd.maxMP.equip);
    bd.maxMP.final = this.maxMP;
    this.hp = Math.min(this.hp, this.maxHP);

    const relicAtkPct = (relicFx?.attackPct ?? 0) / 100;
    bd.attack.str = str * BalanceConfig.strAttack;
    bd.attack.equip = g(gear?.attack);
    bd.attack.relic = (base.attack + bd.attack.str + bd.attack.equip) * relicAtkPct;
    let atk = base.attack + bd.attack.str + bd.attack.equip + bd.attack.relic;
    bd.attack.buffMult = 1;
    if (this.tonicTime > 0) {
      atk *= BalanceConfig.tonicAttackMult;
      bd.attack.buffMult *= BalanceConfig.tonicAttackMult;
    }
    if (this.berserkActive) {
      atk *= 1.5;
      bd.attack.buffMult *= 1.5;
    }
    if (this.berserkerRage && this.hp > 0 && this.hp < this.maxHP * 0.3) {
      atk *= 1.12;
      bd.attack.buffMult *= 1.12;
    }
    this.attack = atk;
    bd.attack.final = atk;

    const relicDefPct = (relicFx?.defensePct ?? 0) / 100;
    bd.defense.equip = g(gear?.defense);
    bd.defense.relic = (base.defense + bd.defense.equip) * relicDefPct;
    let def = base.defense + bd.defense.equip + bd.defense.relic;
    if (this.berserkActive) {
      def *= 1.2;
      bd.defense.buffMult *= 1.2;
    }
    this.defense = def;
    bd.defense.final = def;

    bd.critChance.base = BalanceConfig.baseCritChance;
    bd.critChance.crit = crit * BalanceConfig.critPerPoint;
    bd.critChance.equip = g(gear?.critChance) / 100;
    bd.critChance.relic = (relicFx?.critChance ?? 0) / 100;
    this.critChance = Math.min(
      BalanceConfig.critChanceCap,
      bd.critChance.base + bd.critChance.crit + bd.critChance.equip + bd.critChance.relic,
    );
    bd.critChance.final = this.critChance;
    bd.dodge.agi = agi * BalanceConfig.agiDodgePerPoint;
    bd.dodge.equip = g(gear?.dodge) / 100;
    this.dodgeChance = Math.min(BalanceConfig.dodgeCap, bd.dodge.agi + bd.dodge.equip);
    bd.dodge.final = this.dodgeChance;
    const reduction = Math.min(
      BalanceConfig.agiCooldownReductionCap,
      agi * BalanceConfig.agiCooldownPerPoint + g(gear?.attackSpeed) / 100,
    );
    this.attackCooldown = BalanceConfig.attackCooldown * (1 - reduction);
    bd.moveSpeed.agi = agi * BalanceConfig.agiMovePerPoint;
    bd.moveSpeed.equip = g(gear?.moveSpeed) / 100;
    bd.moveSpeed.berserk = this.berserkActive ? 0.25 : 0;
    this.moveSpeedMult = (1 + bd.moveSpeed.agi + bd.moveSpeed.equip) * (this.berserkActive ? 1.25 : 1) * (this.speedTonicTime > 0 ? 1.1 : 1);
    bd.moveSpeed.final = this.moveSpeedMult - 1;
    bd.skillDamage.int = int * BalanceConfig.intSkillPowerPerPoint;
    bd.skillDamage.equip = g(gear?.skillDamage) / 100;
    bd.skillDamage.relic = (relicFx?.skillDamage ?? 0) / 100;
    bd.skillDamage.berserk = this.berserkActive ? 0.25 : 0;
    this.skillDamageMult =
      (1 + bd.skillDamage.int + bd.skillDamage.equip + bd.skillDamage.relic) *
      (this.berserkActive ? 1.25 : 1);
    bd.skillDamage.final = this.skillDamageMult - 1;
    this.critDamageMult = BalanceConfig.critMultiplier + g(gear?.critDamage) / 100;
    this.damageReduction = Math.min(0.5, g(gear?.damageReduction) / 100);
    this.goldGainMult =
      1 + g(gear?.goldGain) / 100 + (relicFx?.goldGain ?? 0) / 100 + (this.goldenTouch ? 0.15 : 0);
    this.lifesteal = (relicFx?.lifesteal ?? 0) / 100;
    this.mp = Math.min(this.mp, this.maxMP);
    this.lastBreakdown = bd;
  }

  /** Base allocation + legacy charm bonus. (Berserk now multiplies combat stats, not stats.) */
  effStat(id: StatId): number {
    return this.stats[id] + this.relicBonus[id];
  }

  /** +attack-speed fraction for the character sheet. */
  get attackSpeedBonus(): number {
    return BalanceConfig.attackCooldown / this.attackCooldown - 1;
  }

  /** Returns true if this EXP caused a level-up (may chain). */
  gainExp(amount: number): boolean {
    if (this.level >= BalanceConfig.maxLevel) return false;
    this.exp += amount;
    let leveled = false;
    while (this.level < BalanceConfig.maxLevel && this.exp >= xpRequired(this.level)) {
      this.exp -= xpRequired(this.level);
      this.level += 1;
      this.statPoints += BalanceConfig.statPointsPerLevel;
      // Level 3 opens learning and awards the first point; level 2 grants none.
      // Later levels award one point until every available rank can be bought.
      // Existing saves may carry excess points; never discard those here.
      if (this.level >= 3) {
        this.skillSystemUnlocked = true;
        const learnedRanks = SKILL_ORDER.reduce((sum, id) => sum + this.skillLevels[id], 0);
        const availableRanks = SKILL_ORDER.reduce((sum, id) => sum + SKILL_DEFS[id].maxLevel, 0);
        if (learnedRanks + this.skillPoints < availableRanks) this.skillPoints += 1;
      }
      leveled = true;
    }
    if (leveled) {
      this.recomputeStats();
      this.hp = this.maxHP; // full heal on level-up: rewarding, arcade feel
      this.mp = this.maxMP;
    }
    return leveled;
  }

  expForNextLevel(): number {
    return this.level >= BalanceConfig.maxLevel ? 0 : xpRequired(this.level);
  }

  allocateStat(id: StatId): boolean {
    if (this.statPoints <= 0) return false;
    this.statPoints -= 1;
    this.stats[id] += 1;
    this.recomputeStats();
    return true;
  }

  upgradeSkill(id: SkillId): boolean {
    if (!this.skillSystemUnlocked || this.skillPoints <= 0 || this.skillLevels[id] >= SKILL_DEFS[id].maxLevel) return false;
    this.skillPoints -= 1;
    this.skillLevels[id] += 1;
    return true;
  }

  spendMana(amount: number): boolean {
    if (this.mp < amount) return false;
    this.mp -= amount;
    return true;
  }

  setRelicBonus(bonus: Record<RelicId, number>): void {
    this.relicBonus = { ...bonus };
    this.recomputeStats();
  }

  /** Drink a Battle Tonic (+attack for 30s). */
  useTonic(): void {
    this.tonicTime = BalanceConfig.tonicDuration;
    this.recomputeStats();
  }

  /** Drink a Speed Tonic (+10% move speed for 30s). */
  useSpeedTonic(): void {
    this.speedTonicTime = BalanceConfig.tonicDuration;
    this.recomputeStats();
  }

  /** True while recently fighting (blocks camp meals). */
  get inCombat(): boolean {
    return this.timeSinceCombat < BalanceConfig.outOfCombatDelay;
  }

  canAttack(): boolean {
    return this.alive && this.attackTimer <= 0;
  }

  markAttacked(): void {
    this.attackTimer = this.attackCooldown;
    this.appearance.playSwing();
  }

  /** Applies damage unless invulnerable; returns damage actually taken. */
  takeDamage(amount: number): number {
    if (!this.alive || this.invulnTimer > 0) return 0;
    const taken = Math.max(1, Math.round(amount * (1 - this.damageReduction)));
    this.hp = Math.max(0, this.hp - taken);
    this.invulnTimer = BalanceConfig.playerInvulnTime;
    this.appearance.playHurt();
    return taken;
  }

  respawn(x: number = GameConfig.playerSpawnX): void {
    this.x = x;
    this.y = GameConfig.groundY;
    this.vx = 0;
    this.vy = 0;
    this.hp = this.maxHP;
    this.mp = this.maxMP;
    this.invulnTimer = 1;
  }

  /** Reset the out-of-combat timer (call when attacking, casting, or hit). */
  markCombat(): void {
    this.timeSinceCombat = 0;
  }

  /** Dash Slash lunge: fixed-distance burst with brief invulnerability. */
  startDash(dir: 1 | -1): void {
    this.dashDir = dir;
    this.dashTime = DASH_DISTANCE / DASH_SPEED;
    this.invulnTimer = Math.max(this.invulnTimer, this.dashTime + 0.05);
  }

  /** Berserk rage: body burns red, every stat x1.5 until it expires. */
  setBerserk(on: boolean, duration = 0): void {
    this.berserkActive = on;
    this.berserkTime = on ? duration : 0;
    this.appearance.setBerserk(on);
    this.recomputeStats();
  }

  setMoveAxis(axis: number): void {
    this.moveAxis = clamp(axis, -1, 1);
  }

  tryJump(): boolean {
    if (!this.alive || !this.onGround) return false;
    this.vy = BalanceConfig.jumpVelocity;
    this.onGround = false;
    return true;
  }

  update(dt: number, floor: DungeonFloor): void {
    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    // Mana regenerates over time (INT speeds it up).
    this.mp = Math.min(
      this.maxMP,
      this.mp +
        (BalanceConfig.mpRegenBase + this.effStat('int') * BalanceConfig.mpRegenPerInt) * dt,
    );
    // Out-of-combat auto-heal.
    this.timeSinceCombat += dt;
    if (
      this.alive &&
      this.timeSinceCombat >= BalanceConfig.outOfCombatDelay &&
      this.hp < this.maxHP
    ) {
      this.hp = Math.min(
        this.maxHP,
        this.hp + this.maxHP * BalanceConfig.outOfCombatRegenPerSec * dt,
      );
    }
    // Berserk expiry.
    if (this.berserkActive) {
      this.berserkTime -= dt;
      if (this.berserkTime <= 0) this.setBerserk(false);
    }
    // Tonic expiry (recompute once when it wears off).
    if (this.tonicTime > 0) {
      this.tonicTime -= dt;
      if (this.tonicTime <= 0) {
        this.tonicTime = 0;
        this.recomputeStats();
      }
    }
    // Speed tonic expiry (same pattern).
    if (this.speedTonicTime > 0) {
      this.speedTonicTime -= dt;
      if (this.speedTonicTime <= 0) {
        this.speedTonicTime = 0;
        this.recomputeStats();
      }
    }

    if (this.moveAxis !== 0 && this.alive) {
      this.facing = this.moveAxis > 0 ? 1 : -1;
    }

    // Horizontal move + stage bounds (dash overrides steering).
    if (this.dashTime > 0 && this.alive) {
      this.dashTime -= dt;
      this.vx = this.dashDir * DASH_SPEED;
    } else {
      this.vx = this.alive ? this.moveAxis * BalanceConfig.moveSpeed * this.moveSpeedMult : 0;
    }
    this.x = clamp(
      this.x + this.vx * dt,
      GameConfig.minX,
      floor.width - GameConfig.minX,
    );

    // Vertical physics + landing.
    const prevFeet = this.y;
    this.vy += BalanceConfig.gravity * dt;
    this.y += this.vy * dt;
    if (this.vy <= 0) {
      const landing = floor.resolveLanding(this.x, prevFeet, this.y);
      if (landing !== null) {
        this.y = landing;
        this.vy = 0;
        this.onGround = true;
      } else {
        this.onGround = false;
      }
    } else {
      this.onGround = false;
    }

    this.appearance.setFacing(this.facing);
    this.appearance.setMoving(this.moveAxis !== 0 && this.onGround);
    this.appearance.setAirborne(!this.onGround);
    this.appearance.syncPosition(this.x, this.y);
    this.appearance.update(dt);
  }
}
