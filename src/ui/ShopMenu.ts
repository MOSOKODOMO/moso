/**
 * ShopMenu — Mira's MMORPG merchant interface.
 * Header with portrait + speech, category pills, icon card grid, right-side
 * detail panel with comparison, affordability-aware prices, purchase feedback,
 * sell grid with buyback, and a forge-styled enhance tab.
 * Economy (prices/stock) unchanged — presentation only, plus the new wares.
 */
import { BalanceConfig } from '../config/BalanceConfig';
import {
  BASE_ITEMS,
  CONSUMABLES,
  MATERIAL_IDS,
  POTION_CATEGORY_IDS,
  RARITY_COLORS,
  RARITY_LABELS,
  SHOP_CATEGORIES,
  SHOP_PRICE_MULT,
  SLOT_LABELS,
  SLOT_ORDER,
  baseItemId,
  itemBaseValue,
  type ConsumableId,
  type ShopCategory,
  type Slot,
} from '../config/ItemDefs';
import {
  createItem,
  itemName,
  itemSellValue,
  itemSlot,
  itemTier,
  resolveItem,
  type ItemInstance,
} from '../items/ItemInstance';
import { EquipmentManager } from '../items/Equipment';
import type { Inventory } from '../items/Inventory';
import type { Player } from '../player/Player';
import { makePotionTexture, makeWeaponTexture } from '../rendering/SpriteFactory';
import {
  makeAccessoryIcon,
  makeArmorIcon,
  makeBootsIcon,
  makeCampMealTexture,
  makeForgePowderTexture,
  makeIronShardTexture,
  makeMiraTexture,
  makeReturnStoneTexture,
  makeSpeedTonicTexture,
  makeTonicTexture,
} from '../rendering/StageSprites';
import { iconURL } from './HeroPreview';
import { tooltipHTML } from './ItemTooltip';

export type ShopTab = 'buy' | 'sell' | 'enhance';

export interface ShopCallbacks {
  getGold: () => number;
  spendGold: (amount: number) => boolean;
  earnGold: (amount: number) => void;
  refreshBag: () => void;
}

type BuySelection = { kind: 'con'; id: ConsumableId } | { kind: 'gear'; index: number } | null;

const SPEECH = [
  'Need something sharper?',
  'Fresh stock, fair prices.',
  "That blade's seen things…",
  'Potions? Always be prepared.',
  'The forge never cools.',
];

const CONSUMABLE_BLURB: Record<ConsumableId, string> = {
  smallHP: 'Heal 25%',
  largeHP: 'Heal 50%',
  smallMP: 'Mana 30%',
  largeMP: 'Mana 60%',
  tonic: 'ATK +10%',
  speedTonic: 'Move +10%',
  returnStone: '→ Town',
  campMeal: 'HP+MP 60%',
  ironShard: 'Material',
  forgePowder: '-15% enhance',
};

export class ShopMenu {
  private readonly overlay: HTMLDivElement;
  private readonly headGold: HTMLElement;
  private readonly speechEl: HTMLElement;
  private readonly body: HTMLDivElement;
  private readonly tabs: HTMLDivElement;
  private readonly toastEl: HTMLDivElement;
  private tab: ShopTab = 'buy';
  private category: ShopCategory = 'all';
  private open = false;
  private shopTier = 1;
  /** Common gear stock, generated once per shop visit (stable uids). */
  private stock: ItemInstance[] = [];
  private buySel: BuySelection = null;
  private sellUid: number | null = null;
  private enhanceSlot: Slot = 'weapon';
  private toastTimer = 0;
  private buyback: Array<{ item: ItemInstance; price: number }> = [];

  constructor(
    private readonly player: Player,
    private readonly inventory: Inventory,
    private readonly equipment: EquipmentManager,
    private readonly cb: ShopCallbacks,
  ) {
    const hud = document.getElementById('hud') ?? document.body;
    this.overlay = document.createElement('div');
    this.overlay.id = 'shop-overlay';
    this.overlay.classList.add('hidden', 'panel-overlay');

    const panel = document.createElement('div');
    panel.className = 'pause-panel wide shop-panel';

    // --- Merchant header ---
    const head = document.createElement('div');
    head.className = 'shop-head';
    const portrait = document.createElement('img');
    portrait.className = 'mira-portrait';
    portrait.src = iconURL('mira-portrait', () => makeMiraTexture());
    portrait.alt = 'Mira';
    portrait.draggable = false;
    const who = document.createElement('div');
    who.className = 'mira-who';
    const name = document.createElement('div');
    name.className = 'mira-name';
    name.textContent = 'MIRA';
    const role = document.createElement('div');
    role.className = 'mira-role';
    role.textContent = 'Merchant & Blacksmith';
    this.speechEl = document.createElement('div');
    this.speechEl.className = 'mira-speech';
    who.append(name, role, this.speechEl);
    const gold = document.createElement('div');
    gold.className = 'shop-gold shop-gold-head';
    gold.innerHTML = '🪙 <b>0</b>';
    this.headGold = gold;
    head.append(portrait, who, gold);
    panel.appendChild(head);

    this.tabs = document.createElement('div');
    this.tabs.className = 'shop-tabs';
    (['buy', 'sell', 'enhance'] as ShopTab[]).forEach((t) => {
      const btn = document.createElement('button');
      btn.className = 'menu-btn small';
      btn.textContent = t.toUpperCase();
      btn.addEventListener('click', () => {
        this.tab = t;
        this.buySel = null;
        this.sellUid = null;
        this.refresh();
      });
      this.tabs.appendChild(btn);
    });
    panel.appendChild(this.tabs);

    this.body = document.createElement('div');
    this.body.className = 'shop-body';
    panel.appendChild(this.body);

    const close = document.createElement('button');
    close.className = 'menu-btn';
    close.textContent = 'Leave Shop (E)';
    close.addEventListener('click', () => this.setOpen(false));
    panel.appendChild(close);

    this.toastEl = document.createElement('div');
    this.toastEl.className = 'shop-toast hidden';
    panel.appendChild(this.toastEl);

    this.overlay.appendChild(panel);
    hud.appendChild(this.overlay);
  }

  isOpen(): boolean {
    return this.open;
  }

  setOpen(open: boolean, shopTier = 1): void {
    this.open = open;
    this.overlay.classList.toggle('hidden', !open);
    if (open) {
      this.shopTier = shopTier;
      this.tab = 'buy';
      this.category = 'all';
      this.buySel = null;
      this.sellUid = null;
      this.enhanceSlot = 'weapon';
      this.speechEl.textContent = `"${SPEECH[Math.floor(Math.random() * SPEECH.length)]}"`;
      // Show tier progression (1..3) by shop floor and keep the starter alternates.
      const maxTier = Math.max(1, Math.min(3, shopTier));
      this.stock = [];
      for (let tier = 1; tier <= maxTier; tier += 1) {
        for (const slot of SLOT_ORDER) {
          this.stock.push(createItem(baseItemId(slot, tier), 'common'));
        }
      }
      this.stock.push(createItem('w1b', 'common'));
      this.stock.push(createItem('a1b', 'common'));
      this.stock.push(createItem('b1b', 'common'));
      this.stock.push(createItem('c1b', 'common'));
      this.refresh();
    }
  }

  // --- shared bits ---

  private refresh(): void {
    if (!this.open) return;
    this.headGold.innerHTML = `🪙 <b>${Math.floor(this.cb.getGold())}</b>`;
    [...this.tabs.children].forEach((el, i) => {
      (el as HTMLButtonElement).classList.toggle('primary', (['buy', 'sell', 'enhance'] as ShopTab[])[i] === this.tab);
    });
    if (this.tab === 'buy') this.renderBuy();
    else if (this.tab === 'sell') this.renderSell();
    else this.renderEnhance();
  }

  private toast(text: string): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('hidden');
    this.toastEl.classList.remove('pop');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('pop');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.add('hidden'), 1500);
  }

  private gearIcon(baseId: string): string {
    const def = BASE_ITEMS[baseId];
    if (def.slot === 'weapon') return iconURL(`shop-w-${baseId}`, () => makeWeaponTexture(def.tier));
    if (def.slot === 'armor') return iconURL(`shop-a-${baseId}`, () => makeArmorIcon(def.tier));
    if (def.slot === 'boots') return iconURL(`shop-b-${baseId}`, () => makeBootsIcon(def.tier));
    return iconURL(`shop-c-${baseId}`, () => makeAccessoryIcon(def.tier));
  }

  private consumableIcon(id: ConsumableId): string {
    if (id === 'smallHP' || id === 'largeHP') return iconURL('shop-hp', () => makePotionTexture('hp'));
    if (id === 'smallMP' || id === 'largeMP') return iconURL('shop-mp', () => makePotionTexture('mp'));
    if (id === 'tonic') return iconURL('shop-tonic', () => makeTonicTexture());
    if (id === 'speedTonic') return iconURL('shop-speed', () => makeSpeedTonicTexture());
    if (id === 'campMeal') return iconURL('shop-meal', () => makeCampMealTexture());
    if (id === 'ironShard') return iconURL('shop-shard', () => makeIronShardTexture());
    if (id === 'forgePowder') return iconURL('shop-powder', () => makeForgePowderTexture());
    return iconURL('shop-stone', () => makeReturnStoneTexture());
  }

  private buyPrice(item: ItemInstance): number {
    const def = BASE_ITEMS[item.baseId];
    if (def.shopPrice !== undefined) return def.shopPrice;
    return Math.round(itemBaseValue(itemSlot(item), itemTier(item)) * SHOP_PRICE_MULT);
  }

  /** Short headline stat for cards. */
  private headline(item: ItemInstance): string {
    const r = resolveItem(item);
    const t = (v: number): string => String(Math.round(v * 10) / 10);
    switch (itemSlot(item)) {
      case 'weapon':
        return `ATK +${t(r.attack)}`;
      case 'armor':
        return `DEF +${t(r.defense)}`;
      case 'boots':
        return `Move +${t(r.moveSpeed)}%`;
      default: {
        const parts: string[] = [];
        if (r.attack) parts.push(`ATK +${t(r.attack)}`);
        if (r.critChance) parts.push(`Crit +${t(r.critChance)}%`);
        if (r.skillDamage) parts.push(`Skill +${t(r.skillDamage)}%`);
        if (r.hp) parts.push(`HP +${t(r.hp)}`);
        if (r.mp) parts.push(`MP +${t(r.mp)}`);
        if (r.defense) parts.push(`DEF +${t(r.defense)}`);
        return parts.slice(0, 2).join(' • ') || 'Trinket';
      }
    }
  }

  private priceHTML(price: number): string {
    const afford = this.cb.getGold() >= price;
    return `<span class="price${afford ? '' : ' poor'}">🪙 ${price}</span>`;
  }

  // --- BUY ---

  private stockEntries(): Array<{ kind: 'con'; id: ConsumableId } | { kind: 'gear'; index: number }> {
    const list: Array<{ kind: 'con'; id: ConsumableId } | { kind: 'gear'; index: number }> = [];
    const conIds =
      this.category === 'all'
        ? SHOP_CONSUMABLES_LIST
        : this.category === 'potions'
          ? POTION_CATEGORY_IDS
          : this.category === 'materials'
            ? MATERIAL_IDS
            : [];
    for (const id of conIds) list.push({ kind: 'con', id });
    if (this.category !== 'potions' && this.category !== 'materials') {
      [...this.stock.entries()]
        .sort((a, b) => {
          const compareByTier = itemTier(a[1]) - itemTier(b[1]);
          if (compareByTier !== 0) return compareByTier;
          return SLOT_ORDER.indexOf(itemSlot(a[1])) - SLOT_ORDER.indexOf(itemSlot(b[1]));
        })
        .forEach(([index, item]) => {
          const slot = itemSlot(item);
          if (this.category === 'all') return list.push({ kind: 'gear', index });
          if (this.category === 'weapons' && slot === 'weapon') list.push({ kind: 'gear', index });
          if (this.category === 'armor' && (slot === 'armor' || slot === 'boots')) list.push({ kind: 'gear', index });
          if (this.category === 'accessories' && slot === 'accessory') list.push({ kind: 'gear', index });
        });
    }
    return list;
  }

  private gearBadges(item: ItemInstance): string {
    const slot = itemSlot(item);
    const equipped = this.equipment.equipped[slot];
    if (equipped && equipped.baseId === item.baseId) return '<span class="badge equipped">EQUIPPED</span>';
    if (EquipmentManager.isUpgrade(item, equipped, this.equipment.enhance[slot])) {
      return '<span class="badge upgrade">↑ UPGRADE</span>';
    }
    if (this.inventory.equipment.some((i) => i.baseId === item.baseId)) {
      return '<span class="badge owned">OWNED</span>';
    }
    return '';
  }

  private renderBuy(): void {
    const cats = SHOP_CATEGORIES.map(
      (c) => `<button class="cat-pill${this.category === c.id ? ' on' : ''}" data-cat="${c.id}">${c.label}</button>`,
    ).join('');
    let html = `<div class="shop-cats">${cats}</div><div class="shop-buy-layout"><div class="shop-grid">`;
    const entries = this.stockEntries();
    if (entries.length === 0) html += '<div class="pause-note">Nothing in this category.</div>';
    entries.forEach((entry, n) => {
      const selected =
        this.buySel !== null &&
        ((entry.kind === 'con' && this.buySel.kind === 'con' && this.buySel.id === entry.id) ||
          (entry.kind === 'gear' && this.buySel.kind === 'gear' && this.buySel.index === entry.index));
      if (entry.kind === 'con') {
        const def = CONSUMABLES[entry.id];
        html +=
          `<div class="shop-card rarity-common${selected ? ' sel' : ''}" data-card="${n}">` +
          `<img src="${this.consumableIcon(entry.id)}" alt="" draggable="false">` +
          `<div class="card-name">${def.name}</div>` +
          `<div class="card-sub">Supply • ×${this.inventory.consumables[entry.id]}</div>` +
          `<div class="card-stat">${CONSUMABLE_BLURB[entry.id]}</div>` +
          `<div class="card-price">${this.priceHTML(def.buyPrice)}</div></div>`;
      } else {
        const item = this.stock[entry.index];
        const price = this.buyPrice(item);
        html +=
          `<div class="shop-card rarity-${item.rarity}${selected ? ' sel' : ''}" data-card="${n}">` +
          `${this.gearBadges(item)}` +
          `<img src="${this.gearIcon(item.baseId)}" alt="" draggable="false">` +
          `<div class="card-name">${itemName(item)}</div>` +
          `<div class="card-sub">${RARITY_LABELS[item.rarity]} • T${itemTier(item)}</div>` +
          `<div class="card-stat">${this.headline(item)}</div>` +
          `<div class="card-price">${this.priceHTML(price)}</div></div>`;
      }
    });
    html += '</div><div class="shop-detail">';
    html += this.buyDetail();
    html += '</div></div>';
    this.body.innerHTML = html;
    this.body.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.category = btn.dataset.cat as typeof this.category;
        this.buySel = null;
        this.refresh();
      });
    });
    this.body.querySelectorAll<HTMLDivElement>('[data-card]').forEach((el) => {
      el.addEventListener('click', () => {
        const entry = entries[Number(el.dataset.card)];
        this.buySel = entry.kind === 'con' ? { kind: 'con', id: entry.id } : { kind: 'gear', index: entry.index };
        this.refresh();
      });
    });
    this.body.querySelector('#shop-buy-btn')?.addEventListener('click', () => this.confirmBuy());
  }

  private buyDetail(): string {
    if (!this.buySel) return '<div class="pause-note">Select an item to inspect it.</div>';
    if (this.buySel.kind === 'con') {
      const def = CONSUMABLES[this.buySel.id];
      const afford = this.cb.getGold() >= def.buyPrice;
      return (
        `<div class="detail-name">${def.name}</div>` +
        `<div class="detail-sub">SUPPLY • own ×${this.inventory.consumables[this.buySel.id]}</div>` +
        `<img class="detail-icon" src="${this.consumableIcon(this.buySel.id)}" alt="" draggable="false">` +
        `<div class="detail-desc">${def.description}</div>` +
        `<div class="detail-price">${this.priceHTML(def.buyPrice)} <span class="your-gold">Your gold: 🪙 ${Math.floor(this.cb.getGold())}</span></div>` +
        `<button class="menu-btn primary" id="shop-buy-btn"${afford ? '' : ' disabled'}>BUY</button>`
      );
    }
    const item = this.stock[this.buySel.index];
    const price = this.buyPrice(item);
    const afford = this.cb.getGold() >= price;
    const color = RARITY_COLORS[item.rarity];
    const equipped = this.equipment.equipped[itemSlot(item)];
    return (
      `<div class="detail-name" style="color:${color}">${itemName(item)}</div>` +
      `<div class="detail-sub" style="color:${color}">${RARITY_LABELS[item.rarity]} • TIER ${itemTier(item)} • ${SLOT_LABELS[itemSlot(item)]}</div>` +
      `<img class="detail-icon" src="${this.gearIcon(item.baseId)}" alt="" draggable="false">` +
      `<div class="tt-card">${tooltipHTML(item, equipped)}</div>` +
      `<div class="detail-desc">${BASE_ITEMS[item.baseId].description}</div>` +
      `<div class="detail-price">${this.priceHTML(price)} <span class="your-gold">Your gold: 🪙 ${Math.floor(this.cb.getGold())}</span></div>` +
      `<button class="menu-btn primary" id="shop-buy-btn"${afford ? '' : ' disabled'}>BUY</button>`
    );
  }

  private confirmBuy(): void {
    if (!this.buySel) return;
    if (this.buySel.kind === 'con') {
      const def = CONSUMABLES[this.buySel.id];
      if (this.inventory.consumables[this.buySel.id] >= 99) {
        this.toast('Stack full (99)');
        return;
      }
      if (!this.cb.spendGold(def.buyPrice)) return;
      this.inventory.addConsumable(this.buySel.id);
      this.toast(`+1 ${def.name}`);
      this.cb.refreshBag();
      this.refresh();
      return;
    }
    const item = this.stock[this.buySel.index];
    if (!item) return;
    const price = this.buyPrice(item);
    if (price > this.cb.getGold() * 0.3) {
      if (!window.confirm(`${itemName(item)} costs ${price}g (over 30% of your gold). Buy it?`)) return;
    }
    if (!this.cb.spendGold(price)) return;
    if (!this.inventory.addEquipment(item)) {
      this.cb.earnGold(price); // refund when the bag is full
      this.toast('Bag is full!');
      return;
    }
    this.stock[this.buySel.index] = createItem(item.baseId, 'common');
    this.toast(`PURCHASED ${itemName(item)}`);
    this.cb.refreshBag();
    this.refresh();
  }

  // --- SELL ---

  private renderSell(): void {
    let html = '<div class="shop-buy-layout"><div class="shop-grid">';
    const bag = this.inventory.equipment;
    if (bag.length === 0) html += '<div class="pause-note">No spare gear. Dungeon loot appears here.</div>';
    bag.forEach((item) => {
      const selected = this.sellUid === item.uid;
      const equippedSame = this.equipment.equipped[itemSlot(item)]?.baseId === item.baseId;
      html +=
        `<div class="shop-card rarity-${item.rarity}${selected ? ' sel' : ''}" data-sell="${item.uid}">` +
        `${equippedSame ? '<span class="badge equipped">EQUIPPED</span>' : ''}` +
        `<img src="${this.gearIcon(item.baseId)}" alt="" draggable="false">` +
        `<div class="card-name">${itemName(item)}</div>` +
        `<div class="card-sub">${RARITY_LABELS[item.rarity]} • T${itemTier(item)}</div>` +
        `<div class="card-stat">${this.headline(item)}</div>` +
        `<div class="card-price"><span class="price">🪙 ${itemSellValue(item)}</span></div></div>`;
    });
    // Consumables with any stock.
    for (const id of Object.keys(CONSUMABLES) as ConsumableId[]) {
      const count = this.inventory.consumables[id];
      if (count <= 0) continue;
      const def = CONSUMABLES[id];
      html +=
        `<div class="shop-card rarity-common" data-sell-con="${id}">` +
        `<img src="${this.consumableIcon(id)}" alt="" draggable="false">` +
        `<div class="card-name">${def.name}</div>` +
        `<div class="card-sub">Supply • ×${count}</div>` +
        `<div class="card-price"><span class="price">🪙 ${def.sellPrice}</span></div></div>`;
    }
    html += '</div><div class="shop-detail">';
    html += this.sellDetail();
    if (this.buyback.length > 0) {
      html += '<h3>BUYBACK</h3><div class="buyback-row">';
      this.buyback.forEach((entry, i) => {
        html +=
          `<button class="buyback-chip" data-buyback="${i}" title="Buy back ${itemName(entry.item)}">` +
          `<img src="${this.gearIcon(entry.item.baseId)}" alt="" draggable="false">🪙 ${entry.price}</button>`;
      });
      html += '</div>';
    }
    html += '</div></div>';
    this.body.innerHTML = html;
    this.body.querySelectorAll<HTMLDivElement>('[data-sell]').forEach((el) => {
      el.addEventListener('click', () => {
        this.sellUid = Number(el.dataset.sell);
        this.refresh();
      });
    });
    this.body.querySelectorAll<HTMLDivElement>('[data-sell-con]').forEach((el) => {
      el.addEventListener('click', () => this.sellConsumable(el.dataset.sellCon as ConsumableId));
    });
    this.body.querySelectorAll<HTMLButtonElement>('[data-buyback]').forEach((btn) => {
      btn.addEventListener('click', () => this.buyBack(Number(btn.dataset.buyback)));
    });
    this.body.querySelector('#shop-sell-btn')?.addEventListener('click', () => this.confirmSell());
  }

  private sellDetail(): string {
    const item = this.sellUid !== null ? this.inventory.findEquipment(this.sellUid) : null;
    if (!item) return '<div class="pause-note">Select your gear (or supplies) to sell it back to Mira.</div>';
    const color = RARITY_COLORS[item.rarity];
    const price = itemSellValue(item);
    const original = Math.round(price / 0.35);
    return (
      `<div class="detail-name" style="color:${color}">${itemName(item)}</div>` +
      `<div class="detail-sub" style="color:${color}">${RARITY_LABELS[item.rarity]} • TIER ${itemTier(item)}</div>` +
      `<img class="detail-icon" src="${this.gearIcon(item.baseId)}" alt="" draggable="false">` +
      `<div class="tt-card">${tooltipHTML(item, this.equipment.equipped[itemSlot(item)])}</div>` +
      `<div class="detail-desc">Original value ≈ ${original}g • Sell value ${price}g</div>` +
      `<button class="menu-btn primary" id="shop-sell-btn">SELL FOR ${price}G</button>`
    );
  }

  private confirmSell(): void {
    if (this.sellUid === null) return;
    const item = this.inventory.findEquipment(this.sellUid);
    if (!item) return;
    if (
      (item.rarity === 'epic' || item.rarity === 'legendary') &&
      !window.confirm(`Sell ${itemName(item)} (${item.rarity.toUpperCase()}) for ${itemSellValue(item)}g?`)
    ) {
      return;
    }
    const removed = this.inventory.removeEquipment(this.sellUid);
    this.sellUid = null;
    if (removed) {
      const price = itemSellValue(removed);
      this.cb.earnGold(price);
      this.buyback.unshift({ item: removed, price: Math.round(price * 1.1) });
      if (this.buyback.length > 5) this.buyback.pop();
      this.toast(`Sold ${itemName(removed)} +${price}g`);
      this.cb.refreshBag();
      this.refresh();
    }
  }

  private sellConsumable(id: ConsumableId): void {
    const gained = this.inventory.sellConsumable(id);
    if (gained > 0) {
      this.cb.earnGold(gained);
      this.toast(`Sold 1 ${CONSUMABLES[id].name} +${gained}g`);
      this.cb.refreshBag();
      this.refresh();
    }
  }

  private buyBack(index: number): void {
    const entry = this.buyback[index];
    if (!entry) return;
    if (!this.cb.spendGold(entry.price)) {
      this.toast('Not enough gold!');
      return;
    }
    if (!this.inventory.addEquipment(entry.item)) {
      this.cb.earnGold(entry.price);
      this.toast('Bag is full!');
      return;
    }
    this.buyback.splice(index, 1);
    this.toast(`Bought back ${itemName(entry.item)}`);
    this.cb.refreshBag();
    this.refresh();
  }

  // --- ENHANCE (forge) ---

  private renderEnhance(): void {
    let html = `<div class="forge-head">🔨 Mira's Forge — up to +${BalanceConfig.maxEnhance}. Always succeeds; enhancement stays with the slot.</div>`;
    if (this.equipment.forgeDiscount) {
      html += '<div class="forge-powder">✨ Forge powder banked: next enhance costs 15% less!</div>';
    }
    html += '<div class="forge-layout"><div class="forge-slots">';
    for (const slot of SLOT_ORDER) {
      const item = this.equipment.equipped[slot];
      const level = this.equipment.enhance[slot];
      const pips = '●'.repeat(level) + '○'.repeat(BalanceConfig.maxEnhance - level);
      html +=
        `<div class="forge-slot${this.enhanceSlot === slot ? ' sel' : ''}" data-slot="${slot}">` +
        (item
          ? `<img src="${this.gearIcon(item.baseId)}" alt="" draggable="false">`
          : '<div class="forge-empty">—</div>') +
        `<div><div class="card-name">${item ? itemName(item) : SLOT_LABELS[slot]}</div>` +
        `<div class="forge-pips" aria-label="Enhancement +${level} of +${BalanceConfig.maxEnhance}">${pips}</div></div></div>`;
    }
    html += '</div><div class="forge-detail">';
    html += this.enhanceDetail();
    html += '</div></div>';
    this.body.innerHTML = html;
    this.body.querySelectorAll<HTMLDivElement>('[data-slot]').forEach((el) => {
      el.addEventListener('click', () => {
        this.enhanceSlot = el.dataset.slot as Slot;
        this.refresh();
      });
    });
    this.body.querySelector('#forge-btn')?.addEventListener('click', () => this.confirmEnhance());
    this.body.querySelectorAll<HTMLButtonElement>('[data-transfer-from]').forEach((button) => {
      button.addEventListener('keydown', (event) => {
        if (event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter') event.stopPropagation();
      });
      button.addEventListener('click', () => this.confirmTransfer(button.dataset.transferFrom as Slot));
    });
  }

  private enhanceDetail(): string {
    const slot = this.enhanceSlot;
    const item = this.equipment.equipped[slot];
    if (!item) return `<div class="pause-note">Equip a ${SLOT_LABELS[slot].toLowerCase()} to enhance this slot.</div>`;
    const level = this.equipment.enhance[slot];
    const maxed = level >= BalanceConfig.maxEnhance;
    const color = RARITY_COLORS[item.rarity];
    const full = this.equipment.enhanceCost(slot) ?? 0;
    const quoted = this.equipment.forgeDiscount ? Math.round(full * 0.85) : full;
    const afford = this.cb.getGold() >= quoted;
    let html =
      `<div class="detail-name" style="color:${color}">${itemName(item)} +${level}</div>` +
      `<img class="detail-icon forge-icon" src="${this.gearIcon(item.baseId)}" alt="" draggable="false">` +
      `<div class="forge-cards"><div class="tt-card"><b>Current +${level}</b>${tooltipHTML(item, null, level)}</div>`;
    if (!maxed) {
      html += `<div class="tt-card next"><b>Next +${level + 1}</b>${tooltipHTML(item, null, level + 1)}</div>`;
    }
    html += '</div>';
    html += maxed
      ? `<div class="detail-price">Maximum enhancement +${BalanceConfig.maxEnhance}`
      : `<div class="detail-price">Cost: <span class="price${afford ? '' : ' poor'}">🪙 ${quoted}</span>`;
    if (this.equipment.forgeDiscount && !maxed) html += ` <s class="was-price">${full}g</s> <span class="powder-tag">powder −15%</span>`;
    html += ` <span class="your-gold">Your gold: 🪙 ${Math.floor(this.cb.getGold())}</span></div>`;
    html += `<div class="stat-desc">Success: 100% • No breaks, no downgrades.</div>`;
    html += `<button class="menu-btn primary forge-btn" id="forge-btn"${maxed || !afford ? ' disabled' : ''}>${maxed ? `MAX +${BalanceConfig.maxEnhance}` : 'ENHANCE'}</button>`;
    html += '<div class="forge-feedback"></div>';
    html += this.transferDetail();
    return html;
  }

  private transferDetail(): string {
    const target = this.enhanceSlot;
    const targetLevel = this.equipment.enhance[target];
    let html = '<div class="tt-card forge-transfer"><h3>MOVE AN ENHANCEMENT LEVEL</h3>' +
      `<p class="stat-desc">Destination: <b>${SLOT_LABELS[target]} +${targetLevel}</b>. Move one existing level here from another equipped slot.</p>` +
      '<p class="stat-desc">The donor loses 1 level; the destination gains 1. No item is consumed. Fee: 20g + 5g × the higher item tier. Forge powder is not used.</p>';
    if (targetLevel >= BalanceConfig.maxEnhance) {
      html += `<p class="pause-note">This destination is already +${BalanceConfig.maxEnhance}. Select another slot to receive a level.</p>`;
    } else {
      const donors = SLOT_ORDER.filter((from) => from !== target && this.equipment.equipped[from] && this.equipment.enhance[from] > 0);
      if (donors.length === 0) html += '<p class="pause-note">Equip another item in a slot with at least +1 to use it as a donor.</p>';
      for (const from of donors) {
        const cost = this.equipment.transferCost(from, target);
        const level = this.equipment.enhance[from];
        const afford = cost !== null && this.cb.getGold() >= cost;
        html += `<button type="button" class="menu-btn small forge-btn" data-transfer-from="${from}"${afford ? '' : ' disabled'}>` +
          `Move 1 from ${SLOT_LABELS[from]} (+${level}) · ${cost ?? '—'}g` +
          `<br><small>${SLOT_LABELS[from]} +${level} → +${level - 1} · ${SLOT_LABELS[target]} +${targetLevel} → +${targetLevel + 1}</small></button>`;
      }
    }
    return html + '<p class="pause-note">Replacing an item in the same slot still keeps its enhancement for free.</p></div>';
  }

  private confirmTransfer(from: Slot): void {
    const to = this.enhanceSlot;
    const cost = this.equipment.transferCost(from, to);
    if (cost === null) return;
    if (this.cb.getGold() < cost) {
      this.toast('Not enough gold for this transfer.');
      return;
    }
    const donorBefore = this.equipment.enhance[from];
    const targetBefore = this.equipment.enhance[to];
    if (!this.equipment.transferEnhancement(from, to)) return;
    // No save or UI callback occurs between level mutation and payment. Restore
    // both levels if payment cannot be made, then publish the complete result.
    if (!this.cb.spendGold(cost)) {
      this.equipment.enhance[from] = donorBefore;
      this.equipment.enhance[to] = targetBefore;
      this.toast('Not enough gold for this transfer.');
      return;
    }
    this.player.recomputeStats();
    this.cb.refreshBag();
    this.refresh();
    this.toast(`Moved 1 level: ${SLOT_LABELS[from]} +${donorBefore - 1} → ${SLOT_LABELS[to]} +${targetBefore + 1}. Fee ${cost}g.`);
  }

  private confirmEnhance(): void {
    const slot = this.enhanceSlot;
    const full = this.equipment.enhanceCost(slot);
    if (full === null) return;
    const quoted = this.equipment.forgeDiscount ? Math.round(full * 0.85) : full;
    if (!this.cb.spendGold(quoted)) return;
    const usedPowder = this.equipment.forgeDiscount;
    this.equipment.forgeDiscount = false;
    this.equipment.enhanceSlot(slot);
    this.player.recomputeStats();
    this.cb.refreshBag();
    this.refresh();
    const item = this.equipment.equipped[slot];
    const fb = this.body.querySelector('.forge-feedback');
    if (fb) {
      fb.textContent = `ENHANCED +${this.equipment.enhance[slot]}!${usedPowder ? ' (powder used)' : ''} ${item ? itemName(item) : ''}`;
      fb.classList.add('show');
    }
    const icon = this.body.querySelector('.forge-icon');
    if (icon) {
      icon.classList.remove('shake');
      void (icon as HTMLElement).offsetWidth;
      icon.classList.add('shake');
    }
    this.toast(`ENHANCED +${this.equipment.enhance[slot]}!`);
  }
}

// Full consumable list for the ALL category (supplies + materials).
const SHOP_CONSUMABLES_LIST: ConsumableId[] = [
  'smallHP', 'largeHP', 'smallMP', 'largeMP', 'tonic', 'speedTonic', 'returnStone', 'campMeal',
  'ironShard', 'forgePowder',
];
