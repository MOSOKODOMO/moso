/**
 * EquipmentManager — the 4 loadout slots + slot-bound enhancement (+0..+10).
 * Enhancement belongs to the SLOT: swapping items keeps the +level.
 * Aggregates feed Player.recomputeStats (single source of gear truth).
 */
import { BalanceConfig } from '../config/BalanceConfig';
import { BASE_ITEMS, SLOT_ORDER, type Slot } from '../config/ItemDefs';
import { enhancementCost } from '../combat/DamageSystem';
import { itemPower, itemSlot, resolveEnhanced, type ItemInstance, type ResolvedItem } from './ItemInstance';

export type Loadout = Record<Slot, ItemInstance | null>;
export type EnhanceLevels = Record<Slot, number>;

export function emptyLoadout(): Loadout {
  return { weapon: null, armor: null, boots: null, accessory: null };
}

export function emptyEnhance(): EnhanceLevels {
  return { weapon: 0, armor: 0, boots: 0, accessory: 0 };
}

export class EquipmentManager {
  readonly equipped: Loadout = emptyLoadout();
  readonly enhance: EnhanceLevels = emptyEnhance();
  /** Forge powder banked: next enhancement costs 15% less (consumed on use). */
  forgeDiscount = false;

  /** Enhancement multiplier for a slot (base plus 12% per level). */
  enhanceMult(slot: Slot): number {
    return 1 + BalanceConfig.enhanceBonusPerLevel * this.enhance[slot];
  }

  /** Gold cost for the NEXT enhancement level of a slot (needs equipped item tier). */
  enhanceCost(slot: Slot): number | null {
    const item = this.equipped[slot];
    if (!item || this.enhance[slot] >= BalanceConfig.maxEnhance) return null;
    return enhancementCost(BASE_ITEMS[item.baseId].tier, this.enhance[slot] + 1);
  }

  canEnhance(slot: Slot, gold: number): boolean {
    const cost = this.enhanceCost(slot);
    return cost !== null && gold >= cost;
  }

  /** Always succeeds. Returns the gold cost charged (0 when impossible). */
  enhanceSlot(slot: Slot): number {
    const cost = this.enhanceCost(slot);
    if (cost === null) return 0;
    this.enhance[slot] += 1;
    return cost;
  }

  /** Fee to move one existing level between equipped slots; never creates a level. */
  transferCost(from: Slot, to: Slot): number | null {
    if (from === to || !SLOT_ORDER.includes(from) || !SLOT_ORDER.includes(to)) return null;
    const donor = this.equipped[from];
    const target = this.equipped[to];
    if (!donor || !target) return null;
    const donorDef = BASE_ITEMS[donor.baseId];
    const targetDef = BASE_ITEMS[target.baseId];
    if (!donorDef || !targetDef || donorDef.slot !== from || targetDef.slot !== to) return null;
    const donorLevel = this.enhance[from];
    const targetLevel = this.enhance[to];
    if (!Number.isInteger(donorLevel) || !Number.isInteger(targetLevel) ||
      donorLevel <= 0 || donorLevel > BalanceConfig.maxEnhance ||
      targetLevel < 0 || targetLevel >= BalanceConfig.maxEnhance) return null;
    return 20 + 5 * Math.max(donorDef.tier, targetDef.tier);
  }

  /** Both slot levels change in one synchronous operation after full validation. */
  transferEnhancement(from: Slot, to: Slot): boolean {
    if (this.transferCost(from, to) === null) return false;
    this.enhance[from] -= 1;
    this.enhance[to] += 1;
    return true;
  }

  /** Sum of resolved gear stats with slot enhancement applied to BASE stats only. */
  aggregates(): ResolvedItem {
    const total: ResolvedItem = {
      attack: 0, defense: 0, hp: 0, mp: 0, moveSpeed: 0, critChance: 0, skillDamage: 0,
      attackSpeed: 0,
      str: 0, agi: 0, crit: 0, int: 0, goldGain: 0, dodge: 0,
      damageReduction: 0, critDamage: 0, bossDamage: 0,
    };
    for (const slot of SLOT_ORDER) {
      const item = this.equipped[slot];
      if (!item) continue;
      const r = resolveEnhanced(item, this.enhance[slot], BalanceConfig.enhanceBonusPerLevel);
      (Object.keys(total) as Array<keyof ResolvedItem>).forEach((k) => {
        total[k] = (total[k] as number) + (r[k] as number);
      });
    }
    return total;
  }

  /** Does this bag item clearly beat what's equipped (2% margin, same +level)? */
  static isUpgrade(item: ItemInstance, equipped: ItemInstance | null, enhanceLevel = 0): boolean {
    if (!equipped) return true;
    return (
      itemPower(item, enhanceLevel) > itemPower(equipped, enhanceLevel) * 1.02
    );
  }

  serialize(): { equipped: Loadout; enhance: EnhanceLevels; forgeDiscount: boolean } {
    return {
      equipped: { ...this.equipped },
      enhance: { ...this.enhance },
      forgeDiscount: this.forgeDiscount,
    };
  }

  deserialize(data: { equipped?: Partial<Loadout>; enhance?: Partial<EnhanceLevels>; forgeDiscount?: unknown }): void {
    for (const slot of SLOT_ORDER) {
      const item = data.equipped?.[slot] ?? null;
      this.equipped[slot] = item && typeof item === 'object' && 'baseId' in item ? (item as ItemInstance) : null;
      const level = data.enhance?.[slot] ?? 0;
      this.enhance[slot] =
        Number.isInteger(level) && (level as number) >= 0 && (level as number) <= BalanceConfig.maxEnhance
          ? (level as number)
          : 0;
    }
    this.forgeDiscount = data.forgeDiscount === true;
  }
}
