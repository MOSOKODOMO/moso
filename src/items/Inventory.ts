/**
 * Inventory — the BAG: 6 consumable stacks, unequipped gear, legacy charms.
 * Equipped loadout + enhancement live in EquipmentManager (slot-bound).
 */
import { CONSUMABLES, type ConsumableId } from '../config/ItemDefs';
import type { RelicId } from '../config/ItemConfig';
import type { ItemInstance } from './ItemInstance';

export const MAX_BAG_EQUIPMENT = 60;

export interface BagData {
  consumables: Record<ConsumableId, number>;
  equipment: ItemInstance[];
  /** Legacy Phase-1 charm relics (passive, kept working). */
  relics: Record<RelicId, boolean>;
}

const EMPTY_CONSUMABLES: Record<ConsumableId, number> = {
  smallHP: 0,
  largeHP: 0,
  smallMP: 0,
  largeMP: 0,
  tonic: 0,
  speedTonic: 0,
  returnStone: 0,
  campMeal: 0,
  ironShard: 0,
  forgePowder: 0,
};

export class Inventory {
  consumables: Record<ConsumableId, number> = {
    ...EMPTY_CONSUMABLES,
    smallHP: 3,
    smallMP: 2,
    returnStone: 1,
  };
  equipment: ItemInstance[] = [];
  relics: Record<RelicId, boolean> = { str: false, agi: false, crit: false, int: false };

  /** Accept the whole amount or leave the stack untouched (world loot can retry). */
  addConsumable(id: ConsumableId, n = 1): boolean {
    if (!Number.isInteger(n) || n <= 0 || this.consumables[id] + n > 99) return false;
    this.consumables[id] += n;
    return true;
  }

  useConsumable(id: ConsumableId): boolean {
    if (this.consumables[id] <= 0) return false;
    this.consumables[id] -= 1;
    return true;
  }

  sellConsumable(id: ConsumableId): number {
    if (this.consumables[id] <= 0) return 0;
    this.consumables[id] -= 1;
    return CONSUMABLES[id].sellPrice;
  }

  /** Returns false when the bag is full. */
  addEquipment(item: ItemInstance): boolean {
    if (this.equipment.length >= MAX_BAG_EQUIPMENT) return false;
    this.equipment.push(item);
    return true;
  }

  removeEquipment(uid: number): ItemInstance | null {
    const idx = this.equipment.findIndex((i) => i.uid === uid);
    if (idx < 0) return null;
    return this.equipment.splice(idx, 1)[0];
  }

  findEquipment(uid: number): ItemInstance | null {
    return this.equipment.find((i) => i.uid === uid) ?? null;
  }

  /** Legacy charm relic: true when newly acquired (false = duplicate). */
  acquireRelic(id: RelicId): boolean {
    if (this.relics[id]) return false;
    this.relics[id] = true;
    return true;
  }

  serialize(): BagData {
    return {
      consumables: { ...this.consumables },
      equipment: this.equipment.map((i) => ({ ...i, affixes: [...i.affixes] })),
      relics: { ...this.relics },
    };
  }

  deserialize(data: Partial<BagData>): void {
    this.consumables = { ...EMPTY_CONSUMABLES };
    if (data.consumables) {
      for (const id of Object.keys(EMPTY_CONSUMABLES) as ConsumableId[]) {
        const v = data.consumables[id];
        this.consumables[id] =
          typeof v === 'number' && Number.isFinite(v) ? Math.min(99, Math.max(0, Math.floor(v))) : 0;
      }
    }
    this.equipment = Array.isArray(data.equipment)
      ? data.equipment
          .filter((i) => i && typeof i === 'object' && typeof i.baseId === 'string')
          .slice(0, MAX_BAG_EQUIPMENT)
      : [];
    if (data.relics) {
      for (const id of Object.keys(this.relics) as RelicId[]) {
        this.relics[id] = data.relics[id] === true;
      }
    }
  }
}
