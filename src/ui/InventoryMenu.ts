/** A single bag grid with hover/focus inspection and explicit item actions. */
import type { Texture } from 'three';
import {
  BASE_ITEMS, CONSUMABLE_ORDER, CONSUMABLES, FLOOR_RELICS, MAX_ACTIVE_RELICS,
  RARITY_COLORS, SLOT_ORDER, type ConsumableId, type Slot,
} from '../config/ItemDefs';
import type { EquipmentManager } from '../items/Equipment';
import { MAX_BAG_EQUIPMENT, type Inventory } from '../items/Inventory';
import { itemName, itemSlot, itemTier, type ItemInstance } from '../items/ItemInstance';
import type { FloorRelicManager } from '../relics/FloorRelics';
import type { Player } from '../player/Player';
import { makePotionTexture, makeRelicTexture, makeWeaponTexture } from '../rendering/SpriteFactory';
import {
  makeAccessoryIcon, makeArmorIcon, makeBootsIcon, makeCampMealTexture,
  makeForgePowderTexture, makeIronShardTexture, makeReturnStoneTexture,
  makeSpeedTonicTexture, makeTonicTexture,
} from '../rendering/StageSprites';
import { tooltipHTML } from './ItemTooltip';
import { createHudAction } from './HudActions';

export interface InventoryMenuCallbacks {
  onUseConsumable: (id: ConsumableId) => void;
  onEquipItem: (uid: number) => void;
  onDropEquipment: (uid: number) => void;
  onDropConsumable: (id: ConsumableId) => void;
  onDiscardEquipment: (uid: number) => void;
  onDiscardConsumable: (id: ConsumableId) => void;
  onToggleRelic: (id: string) => void;
}

type Filter = 'all' | Slot | 'consumables';
type BagEntry = { type: 'gear'; uid: number } | { type: 'consumable'; id: ConsumableId } | { type: 'relic'; id: string };
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' }, { id: 'weapon', label: 'Weapon' },
  { id: 'armor', label: 'Armor' }, { id: 'boots', label: 'Boots' },
  { id: 'accessory', label: 'Acc' }, { id: 'consumables', label: 'Items' },
];
function entryKey(entry: BagEntry): string {
  return entry.type === 'gear' ? 'gear-' + entry.uid : entry.type + '-' + entry.id;
}

export class InventoryMenu {
  private readonly overlay: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private readonly button: HTMLButtonElement;
  private readonly iconCache = new Map<string, string>();
  private detail: HTMLElement | null = null;
  private selection: BagEntry | null = null;
  private pendingDiscard: BagEntry | null = null;
  private filter: Filter = 'all';
  private open = false;

  constructor(
    private readonly inventory: Inventory,
    private readonly equipment: EquipmentManager,
    private readonly floorRelics: FloorRelicManager,
    private readonly player: Player,
    private readonly cb: InventoryMenuCallbacks,
  ) {
    const hud = document.getElementById('hud') ?? document.body;
    this.button = createHudAction('inventory', () => this.toggle());
    this.overlay = document.createElement('div');
    this.overlay.id = 'bag-overlay';
    this.overlay.classList.add('hidden', 'panel-overlay');

    const panel = document.createElement('div');
    panel.className = 'pause-panel bag-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'bag-title');
    panel.addEventListener('keydown', (event) => {
      if (event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter') event.stopPropagation();
    });

    const header = document.createElement('div');
    header.className = 'bag-header';
    const title = document.createElement('h2');
    title.id = 'bag-title';
    title.textContent = 'INVENTORY';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'menu-btn small bag-close';
    close.dataset.hudClose = 'inventory';
    close.textContent = 'Close';
    close.addEventListener('click', () => this.setOpen(false));
    header.append(title, close);
    panel.appendChild(header);

    this.body = document.createElement('div');
    this.body.className = 'bag-body';
    panel.appendChild(this.body);
    this.overlay.appendChild(panel);
    hud.appendChild(this.overlay);
  }

  isOpen(): boolean { return this.open; }
  toggle(): void { this.setOpen(!this.open); }
  setOpen(open: boolean): void {
    this.open = open;
    this.button.setAttribute('aria-expanded', String(open));
    this.overlay.classList.toggle('hidden', !open);
    this.pendingDiscard = null;
    if (open) {
      this.selection = null;
      this.refresh();
    }
  }

  private icon(key: string, make: () => Texture): string {
    let url = this.iconCache.get(key);
    if (!url) {
      const tex = make();
      url = (tex.image as HTMLCanvasElement).toDataURL();
      tex.dispose();
      this.iconCache.set(key, url);
    }
    return url;
  }
  private gearIcon(item: ItemInstance): string {
    const def = BASE_ITEMS[item.baseId];
    const key = 'gear-' + item.baseId;
    if (def.slot === 'weapon') return this.icon(key, () => makeWeaponTexture(def.tier));
    if (def.slot === 'armor') return this.icon(key, () => makeArmorIcon(def.tier));
    if (def.slot === 'boots') return this.icon(key, () => makeBootsIcon(def.tier));
    return this.icon(key, () => makeAccessoryIcon(def.tier));
  }
  private consumableIcon(id: ConsumableId): string {
    if (id === 'smallHP' || id === 'largeHP') return this.icon('con-hp', () => makePotionTexture('hp'));
    if (id === 'smallMP' || id === 'largeMP') return this.icon('con-mp', () => makePotionTexture('mp'));
    if (id === 'tonic') return this.icon('con-tonic', () => makeTonicTexture());
    if (id === 'speedTonic') return this.icon('con-speed', () => makeSpeedTonicTexture());
    if (id === 'campMeal') return this.icon('con-meal', () => makeCampMealTexture());
    if (id === 'ironShard') return this.icon('con-shard', () => makeIronShardTexture());
    if (id === 'forgePowder') return this.icon('con-powder', () => makeForgePowderTexture());
    return this.icon('con-stone', () => makeReturnStoneTexture());
  }
  private findGear(uid: number): ItemInstance | null {
    return this.inventory.findEquipment(uid) ?? SLOT_ORDER.map((slot) => this.equipment.equipped[slot]).find((item) => item?.uid === uid) ?? null;
  }
  private isEquipped(item: ItemInstance): boolean {
    return this.equipment.equipped[itemSlot(item)]?.uid === item.uid;
  }

  private entries(): BagEntry[] {
    const entries: BagEntry[] = [];
    if (this.filter === 'all' || this.filter === 'consumables') {
      for (const id of CONSUMABLE_ORDER) if (this.inventory.consumables[id] > 0) entries.push({ type: 'consumable', id });
    }
    if (this.filter !== 'consumables') {
      for (const slot of SLOT_ORDER) {
        const item = this.equipment.equipped[slot];
        if (item && (this.filter === 'all' || this.filter === slot)) entries.push({ type: 'gear', uid: item.uid });
      }
      for (const item of this.inventory.equipment) {
        if (this.filter === 'all' || this.filter === itemSlot(item)) entries.push({ type: 'gear', uid: item.uid });
      }
    }
    if (this.filter === 'all') {
      for (const id of this.floorRelics.owned) if (FLOOR_RELICS[id]) entries.push({ type: 'relic', id });
    }
    return entries;
  }

  refresh(): void {
    if (!this.open) return;
    const active = document.activeElement instanceof HTMLElement && this.body.contains(document.activeElement)
      ? document.activeElement.dataset.bagKey : undefined;
    const oldScroll = this.body.querySelector('.bag-grid-scroll')?.scrollTop ?? 0;
    const entries = this.entries();
    if (this.selection && !entries.some((entry) => entryKey(entry) === entryKey(this.selection!))) {
      this.selection = null;
      this.pendingDiscard = null;
    }
    this.body.replaceChildren();
    const tabs = document.createElement('div');
    tabs.className = 'inv-filters';
    tabs.setAttribute('role', 'group');
    tabs.setAttribute('aria-label', 'Inventory categories');
    for (const f of FILTERS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'menu-btn small' + (this.filter === f.id ? ' primary' : '');
      btn.textContent = f.label;
      btn.dataset.bagKey = 'filter-' + f.id;
      btn.setAttribute('aria-pressed', String(this.filter === f.id));
      btn.addEventListener('click', () => {
        this.filter = f.id;
        this.selection = null;
        this.pendingDiscard = null;
        this.refresh();
      });
      tabs.appendChild(btn);
    }
    this.body.appendChild(tabs);

    const layout = document.createElement('div');
    layout.className = 'bag-layout';
    const bag = document.createElement('div');
    bag.className = 'bag-grid-area';
    bag.appendChild(this.note('Your bag · E = equipped · A = active relic', 'bag-caption'));
    const scroll = document.createElement('div');
    scroll.className = 'bag-grid-scroll';
    const grid = document.createElement('div');
    grid.className = 'inv-grid bag-grid';
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Items in your bag');
    for (const entry of entries) grid.appendChild(this.slot(entry));
    const slotCount = Math.max(32, Math.ceil(entries.length / 8) * 8);
    for (let i = entries.length; i < slotCount; i++) {
      const empty = document.createElement('div');
      empty.className = 'inv-slot empty';
      empty.setAttribute('aria-hidden', 'true');
      grid.appendChild(empty);
    }
    scroll.appendChild(grid);
    bag.appendChild(scroll);
    bag.appendChild(this.note(
      'Spare gear ' + this.inventory.equipment.length + '/' + MAX_BAG_EQUIPMENT +
      ' · Supplies stack to 99 · Relics ' + this.floorRelics.active.filter(Boolean).length + '/' + MAX_ACTIVE_RELICS + ' active',
      'bag-caption bag-capacity'));
    layout.appendChild(bag);
    this.detail = document.createElement('aside');
    this.detail.id = 'bag-item-details';
    this.detail.className = 'bag-item-details';
    this.detail.setAttribute('aria-label', 'Item details and actions');
    layout.appendChild(this.detail);
    this.body.appendChild(layout);
    this.renderDetail(this.selection, true);
    scroll.scrollTop = oldScroll;
    if (active) this.focusKey(active);
  }

  private focusKey(key: string): void {
    this.body.querySelector<HTMLElement>('[data-bag-key="' + key + '"]')?.focus({ preventScroll: true });
  }

  private slot(entry: BagEntry): HTMLButtonElement {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'inv-slot';
    el.dataset.bagKey = entryKey(entry);
    el.dataset.itemType = entry.type;
    const selected = this.selection && entryKey(this.selection) === entryKey(entry);
    el.classList.toggle('sel', !!selected);
    el.setAttribute('aria-pressed', String(!!selected));
    el.setAttribute('aria-describedby', 'bag-item-details');
    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    const badge = document.createElement('span');
    badge.className = 'slot-badge';
    let label = '';
    if (entry.type === 'consumable') {
      img.src = this.consumableIcon(entry.id);
      badge.textContent = '×' + this.inventory.consumables[entry.id];
      label = CONSUMABLES[entry.id].name + ', ' + this.inventory.consumables[entry.id] + ' owned';
      if (entry.id === 'largeHP' || entry.id === 'largeMP') {
        const size = document.createElement('span');
        size.className = 'bag-slot-tag';
        size.textContent = 'L';
        el.appendChild(size);
      }
    } else if (entry.type === 'gear') {
      const item = this.findGear(entry.uid)!;
      img.src = this.gearIcon(item);
      el.style.setProperty('--item-color', RARITY_COLORS[item.rarity]);
      const equipped = this.isEquipped(item);
      el.classList.toggle('equipped-slot', equipped);
      badge.textContent = equipped ? 'E' : 'T' + itemTier(item);
      label = itemName(item) + ', ' + item.rarity + (equipped ? ', equipped' : '');
    } else {
      const def = FLOOR_RELICS[entry.id];
      img.src = this.icon('relic-' + entry.id, () => makeRelicTexture(def.color));
      el.style.setProperty('--item-color', def.color);
      el.classList.toggle('relic-active', this.floorRelics.isActive(entry.id));
      badge.textContent = this.floorRelics.isActive(entry.id) ? 'A' : 'R';
      label = def.name + ', bound relic' + (this.floorRelics.isActive(entry.id) ? ', active' : '');
    }
    el.setAttribute('aria-label', label);
    el.append(img, badge);
    el.addEventListener('mouseenter', () => { if (!this.pendingDiscard) this.renderDetail(entry, !!selected); });
    el.addEventListener('mouseleave', () => {
      if (!this.pendingDiscard && document.activeElement !== el) this.renderDetail(this.selection, true);
    });
    el.addEventListener('focus', () => { if (!this.pendingDiscard) this.renderDetail(entry, !!selected); });
    el.addEventListener('click', () => {
      this.selection = entry;
      this.pendingDiscard = null;
      this.refresh();
    });
    return el;
  }

  private note(text: string, className = 'bag-note'): HTMLParagraphElement {
    const p = document.createElement('p');
    p.className = className;
    p.textContent = text;
    return p;
  }

  private renderDetail(entry: BagEntry | null, selected: boolean): void {
    const detail = this.detail;
    if (!detail) return;
    detail.replaceChildren();
    if (!entry) {
      const heading = document.createElement('h3');
      heading.textContent = 'Inspect your items';
      detail.append(heading,
        this.note('Hover or focus any item to see its description and bonuses. Click to keep its details open and choose an action.'),
        this.note('Sell supplies and spare gear at Mira’s shop.'),
        this.note('Drop places one item nearby. Collect it within 60 seconds, before leaving the map or reloading. Discard destroys one item permanently.'));
      return;
    }
    const card = document.createElement('div');
    card.className = 'tt-card';
    const actions = document.createElement('div');
    actions.className = 'bag-actions';
    let droppable = false;
    let name = '';
    if (entry.type === 'gear') {
      const item = this.findGear(entry.uid);
      if (!item) return;
      name = itemName(item);
      const equipped = this.isEquipped(item);
      const slot = itemSlot(item);
      card.innerHTML = tooltipHTML(item, this.equipment.equipped[slot], equipped ? this.equipment.enhance[slot] : 0);
      card.querySelector('.tt-sell')?.remove();
      card.insertBefore(this.note(BASE_ITEMS[item.baseId].description, 'bag-description'), card.children[2] ?? null);
      droppable = !equipped;
      if (equipped) {
        card.appendChild(this.note('Equipped · protected from drop/discard. Equip another item in this slot to move this one into your bag.'));
      } else if (selected) {
        actions.appendChild(this.actionButton('Equip', this.player.alive, () => this.perform(() => this.cb.onEquipItem(entry.uid))));
      }
    } else if (entry.type === 'consumable') {
      const def = CONSUMABLES[entry.id];
      name = def.name;
      const heading = document.createElement('div');
      heading.className = 'tt-name';
      heading.textContent = name + ' ×' + this.inventory.consumables[entry.id];
      card.append(heading, this.note(def.description, 'bag-description'));
      droppable = this.inventory.consumables[entry.id] > 0;
      if (selected) actions.appendChild(this.actionButton('Use', droppable && entry.id !== 'ironShard' && this.player.alive, () => this.perform(() => this.cb.onUseConsumable(entry.id))));
    } else {
      const def = FLOOR_RELICS[entry.id];
      name = def.name;
      const heading = document.createElement('div');
      heading.className = 'tt-name';
      heading.style.color = def.color;
      heading.textContent = name;
      const active = this.floorRelics.isActive(entry.id);
      card.append(heading, this.note(def.description, 'bag-description'),
        this.note('Bound relic · ' + (active ? 'active' : 'inactive') + '. Kept permanently; cannot be dropped or discarded.'));
      if (selected) {
        actions.appendChild(this.actionButton(active ? 'Deactivate' : 'Activate', true, () => this.perform(() => this.cb.onToggleRelic(entry.id))));
        if (!active && this.floorRelics.active.filter(Boolean).length >= MAX_ACTIVE_RELICS) {
          card.appendChild(this.note('All 3 relic slots are active. Activating this replaces the first active slot.'));
        }
      }
    }
    detail.appendChild(card);
    if (!selected) {
      detail.appendChild(this.note('Click or press Enter to select this item.'));
      return;
    }
    if (droppable) {
      actions.append(
        this.actionButton('Drop 1', this.player.alive, () => this.perform(() => {
          if (entry.type === 'consumable') this.cb.onDropConsumable(entry.id);
          else if (entry.type === 'gear') this.cb.onDropEquipment(entry.uid);
        })),
        this.actionButton('Discard 1', true, () => {
          this.pendingDiscard = entry;
          this.renderDetail(entry, true);
          this.detail?.querySelector<HTMLButtonElement>('[data-discard-cancel]')?.focus();
        }, 'danger'),
      );
    }
    detail.appendChild(actions);
    if (droppable) detail.appendChild(this.note('Drop: nearby for 60s; lost when leaving or reloading. Sell at Mira’s shop.'));
    if (this.pendingDiscard && entryKey(this.pendingDiscard) === entryKey(entry)) {
      const confirm = document.createElement('div');
      confirm.className = 'bag-discard-confirm';
      confirm.setAttribute('role', 'group');
      confirm.setAttribute('aria-label', 'Confirm destroying ' + name);
      confirm.appendChild(this.note('Destroy 1 ' + name + '? This cannot be undone and gives no gold.', 'bag-confirm-message'));
      const cancel = this.actionButton('Keep item', true, () => {
        this.pendingDiscard = null;
        this.renderDetail(entry, true);
        this.detail?.querySelector<HTMLButtonElement>('.danger')?.focus();
      });
      cancel.dataset.discardCancel = '';
      confirm.append(cancel, this.actionButton('Destroy 1', true, () => this.perform(() => {
        if (entry.type === 'consumable') this.cb.onDiscardConsumable(entry.id);
        else if (entry.type === 'gear') this.cb.onDiscardEquipment(entry.uid);
      }), 'danger'));
      detail.appendChild(confirm);
    }
  }

  private perform(action: () => void): void {
    this.pendingDiscard = null;
    action();
    this.refresh();
    if (this.selection) this.focusKey(entryKey(this.selection));
  }
  private actionButton(label: string, enabled: boolean, onClick: () => void, extra = ''): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'menu-btn small ' + extra;
    btn.textContent = label;
    btn.disabled = !enabled;
    btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
    return btn;
  }
}

