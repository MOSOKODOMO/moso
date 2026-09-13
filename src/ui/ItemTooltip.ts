/**
 * ItemTooltip — shared item card HTML with equipped comparison.
 * Used by the bag, shop buy/sell rows and enhance panel.
 */
import {
  LEGENDARY_PASSIVES,
  RARITY_COLORS,
  RARITY_LABELS,
  SLOT_LABELS,
} from '../config/ItemDefs';
import { BalanceConfig } from '../config/BalanceConfig';
import {
  itemName,
  itemSellValue,
  itemSlot,
  itemTier,
  passiveName,
  resolveEnhanced,
  resolveItem,
  type ItemInstance,
  type ResolvedItem,
} from '../items/ItemInstance';

const STAT_LABELS: Record<keyof ResolvedItem, string> = {
  attack: 'Attack',
  defense: 'Defense',
  hp: 'Max HP',
  mp: 'Max MP',
  moveSpeed: 'Move Speed',
  critChance: 'Crit Chance',
  skillDamage: 'Skill Damage',
  attackSpeed: 'Attack Speed',
  str: 'STR',
  agi: 'AGI',
  crit: 'CRIT',
  int: 'INT',
  goldGain: 'Gold Gain',
  dodge: 'Dodge',
  damageReduction: 'Damage Reduction',
  critDamage: 'Crit Damage',
  bossDamage: 'Boss Damage',
};

const PCT_STATS: Set<keyof ResolvedItem> = new Set([
  'moveSpeed',
  'critChance',
  'skillDamage',
  'goldGain',
  'dodge',
  'damageReduction',
  'critDamage',
  'bossDamage',
]);

function fmtStat(k: keyof ResolvedItem, v: number): string {
  const shown = PCT_STATS.has(k) ? `${trim(v)}%` : `+${trim(v)}`;
  return `${STAT_LABELS[k]} ${shown}`;
}

function trim(v: number): string {
  return String(Math.round(v * 10) / 10);
}

function deltaLine(label: string, now: number, pct: boolean, betterHigh = true): string {
  if (Math.abs(now) < 0.005) return '';
  const good = betterHigh ? now > 0 : now < 0;
  const cls = good ? 'up' : 'down';
  const arrow = good ? '↑' : '↓';
  const val = pct ? `${trim(Math.abs(now))}%` : `${trim(Math.abs(now))}`;
  return `<div class="cmp ${cls}">${label} ${good ? '+' : '−'}${val} ${arrow}</div>`;
}

/**
 * Full tooltip HTML. Pass the equipped item (same slot) for comparison lines;
 * pass enhance level so numbers include it.
 */
export function tooltipHTML(item: ItemInstance, equipped: ItemInstance | null, enhanceLevel = 0): string {
  const color = RARITY_COLORS[item.rarity];
  const r = resolveEnhanced(item, enhanceLevel, BalanceConfig.enhanceBonusPerLevel);
  const lines: string[] = [];
  lines.push(`<div class="tt-name" style="color:${color}">${itemName(item)}</div>`);
  lines.push(
    `<div class="tt-sub" style="color:${color}">${RARITY_LABELS[item.rarity]} • TIER ${itemTier(item)} • ${SLOT_LABELS[itemSlot(item)]}${enhanceLevel > 0 ? ` • +${enhanceLevel}` : ''}</div>`,
  );
  const order: Array<keyof ResolvedItem> = [
    'attack', 'defense', 'hp', 'mp', 'moveSpeed', 'critChance', 'skillDamage',
    'str', 'agi', 'crit', 'int', 'goldGain', 'dodge', 'damageReduction', 'critDamage', 'bossDamage',
  ];
  for (const k of order) {
    const v = r[k] as number;
    if (Math.abs(v) > 0.0001) lines.push(`<div>${fmtStat(k, v)}</div>`);
  }
  if (item.legendaryPassive) {
    const p = LEGENDARY_PASSIVES[item.legendaryPassive];
    lines.push(`<div class="tt-passive">✦ ${p.name}: ${p.description}</div>`);
  }
  if (equipped && equipped.uid !== item.uid && itemSlot(equipped) === itemSlot(item)) {
    const er = resolveItem(equipped);
    lines.push('<div class="tt-cmp-title">vs Equipped:</div>');
    for (const k of order) {
      const d = (r[k] as number) - (er[k] as number);
      if (Math.abs(d) > 0.0001) lines.push(deltaLine(STAT_LABELS[k], d, PCT_STATS.has(k)));
    }
  }
  lines.push(`<div class="tt-sell">Sell: ${itemSellValue(item)}g</div>`);
  return lines.join('');
}

/** One-line summary for shop rows. */
export function itemSummary(item: ItemInstance): string {
  const r = resolveItem(item);
  const parts: string[] = [];
  if (r.attack) parts.push(`ATK +${trim(r.attack)}`);
  if (r.defense) parts.push(`DEF +${trim(r.defense)}`);
  if (r.hp) parts.push(`HP +${trim(r.hp)}`);
  if (r.mp) parts.push(`MP +${trim(r.mp)}`);
  if (r.moveSpeed) parts.push(`Move +${trim(r.moveSpeed)}%`);
  if (r.critChance) parts.push(`Crit +${trim(r.critChance)}%`);
  if (r.skillDamage) parts.push(`Skill +${trim(r.skillDamage)}%`);
  if (item.affixes.length > 0) {
    parts.push(item.affixes.map((a) => `${a.stat.toUpperCase()} +${a.value}`).join(', '));
  }
  if (item.legendaryPassive) parts.push(`✦ ${passiveName(item)}`);
  return parts.join(' • ') || '—';
}
