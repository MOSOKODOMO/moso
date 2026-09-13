/**
 * FloorRelics — the 8 signature dungeon relics (one per floor).
 * Owned relics are collected forever; up to 3 can be ACTIVE at once.
 * Phase 2 unlocks Floor 1 (Lucky Slime Core) only.
 */
import { FLOOR_RELICS, MAX_ACTIVE_RELICS } from '../config/ItemDefs';

export interface RelicEffects {
  goldGain: number; // %
  attackPct: number; // %
  lifesteal: number; // % of damage dealt healed
  critChance: number; // %-points
  defensePct: number; // %
  skillDamage: number; // %
  bossDamage: number; // %
}

export function emptyRelicEffects(): RelicEffects {
  return { goldGain: 0, attackPct: 0, lifesteal: 0, critChance: 0, defensePct: 0, skillDamage: 0, bossDamage: 0 };
}

export class FloorRelicManager {
  owned: string[] = [];
  /** 3 active slots holding relic ids (null = empty). */
  active: Array<string | null> = [null, null, null];

  owns(id: string): boolean {
    return this.owned.includes(id);
  }

  /** Returns true when newly acquired. */
  acquire(id: string): boolean {
    if (this.owns(id)) return false;
    this.owned.push(id);
    // Auto-slot into the first empty slot for instant gratification.
    const empty = this.active.indexOf(null);
    if (empty >= 0) this.active[empty] = id;
    return true;
  }

  isActive(id: string): boolean {
    return this.active.includes(id);
  }

  toggleActive(id: string): void {
    if (!this.owns(id)) return;
    const at = this.active.indexOf(id);
    if (at >= 0) {
      this.active[at] = null;
      return;
    }
    const empty = this.active.indexOf(null);
    if (empty >= 0) this.active[empty] = id;
    else this.active[0] = id; // replace oldest slot when full
  }

  /** Sum of all ACTIVE relic effects. */
  effects(): RelicEffects {
    const total = emptyRelicEffects();
    for (const id of this.active) {
      if (!id) continue;
      const def = FLOOR_RELICS[id];
      if (!def) continue;
      switch (def.effectKind) {
        case 'goldGain': total.goldGain += def.value; break;
        case 'attackPct': total.attackPct += def.value; break;
        case 'lifesteal': total.lifesteal += def.value; break;
        case 'critChance': total.critChance += def.value; break;
        case 'defensePct': total.defensePct += def.value; break;
        case 'skillDamage': total.skillDamage += def.value; break;
        case 'bossDamage': total.bossDamage += def.value; break;
        case 'abyss':
          if (def.extra) {
            total.attackPct += def.extra.attackPct;
            total.defensePct += def.extra.defensePct;
            total.skillDamage += def.extra.skillDamage;
          }
          break;
      }
    }
    return total;
  }

  serialize(): { owned: string[]; active: Array<string | null> } {
    return { owned: [...this.owned], active: [...this.active] };
  }

  deserialize(data: { owned?: unknown; active?: unknown }): void {
    this.owned = Array.isArray(data.owned)
      ? data.owned.filter((id): id is string => typeof id === 'string' && !!FLOOR_RELICS[id]).slice(0, 8)
      : [];
    const active = Array.isArray(data.active) ? data.active.slice(0, MAX_ACTIVE_RELICS) : [];
    this.active = [0, 1, 2].map((i) => {
      const id = active[i];
      return typeof id === 'string' && this.owned.includes(id) ? id : null;
    });
  }
}
