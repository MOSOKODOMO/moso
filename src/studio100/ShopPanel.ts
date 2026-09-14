import { ITEMS, SHOP_ITEM_IDS, WEAPON_IDS, type Weapon } from './ItemCatalog';
import { CHARMS, maxStamina, upgradeCost, type StudioSave, type Charm } from './StudioState';

export type ShopFilter = 'all' | 'melee' | 'ranged' | 'defence';
const FILTERS: [ShopFilter,string][] = [['all','All'],['melee','Melee'],['ranged','Ranged'],['defence','Defence']];
const DEFENSIVE:readonly Weapon[] = ['umbrella','drawingBoard','tennisRacket'];
const category = (id:Weapon):Exclude<ShopFilter,'all'> => DEFENSIVE.includes(id)?'defence':ITEMS[id].family==='projectile'?'ranged':'melee';
const escape = (text:string):string => text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as Record<string,string>)[char]);
const equipped = (s:StudioSave,id:Weapon):boolean => s.weaponEquipped && s.weapon===id;
const sortedOwned = (s:StudioSave):Weapon[] => WEAPON_IDS.filter(id=>s.owned.includes(id)).sort((a,b)=>ITEMS[a].name.localeCompare(ITEMS[b].name));

function details(id:Weapon):string {
  const item=ITEMS[id];
  return `<p class="item-basic">${escape(item.description)}</p>${item.skill==='none'?'':`<div class="item-ability"><b>${escape(item.skillName)}</b><p>${escape(item.skillDescription)}</p><small>${item.skillCost} stamina · ${item.skillCooldown}s cooldown</small></div>`}`;
}
function itemHeader(id:Weapon,icon:string,badge:string):string {
  const item=ITEMS[id];
  return `<div class="item-card-head"><div class="item-thumb" style="--item-tint:${item.tint}"><img src="${icon}" alt="" loading="lazy"></div><div><div class="item-tags"><span class="item-category">${category(id)}</span><span class="item-rank" data-rank="${item.rank}">${item.rank}</span></div><h3>${escape(item.name)}</h3><small class="item-badge">${badge}</small></div></div>`;
}
function extras(s:StudioSave):string {
  const shoes=upgradeCost(s,'shoes'),snack=upgradeCost(s,'snack'),rested=s.stamina>=maxStamina(s);
  return `<details class="shop-extras"><summary>Charms & supplies <span>5 essentials</span></summary><div class="shop-extra-grid">${(Object.keys(CHARMS) as Charm[]).map(id=>{
    const charm=CHARMS[id],owned=s.charms[id];
    return `<article class="shop-extra-card"><span class="extra-symbol" aria-hidden="true">${charm.symbol}</span><h3>${escape(charm.name)}</h3><p>${escape(charm.description)}</p><button data-action="charm:${id}" ${owned||s.coins<charm.price?'disabled':''}>${owned?'Owned':`Buy · ${charm.price} coins`}</button></article>`;
  }).join('')}<article class="shop-extra-card"><span class="extra-symbol" aria-hidden="true">↟</span><h3>Comfy sneakers</h3><p>Move 15% faster.</p><button data-action="buy:shoes" ${s.shoes||s.coins<shoes?'disabled':''}>${s.shoes?'Owned':`Buy · ${shoes} coins`}</button></article><article class="shop-extra-card"><span class="extra-symbol" aria-hidden="true">◒</span><h3>A proper lunch</h3><p>Restore 35 stamina. ${s.stamina} / ${maxStamina(s)} now.</p><button data-action="buy:snack" ${rested||s.coins<snack?'disabled':''}>${rested?'Already rested':`Buy · ${snack} coins`}</button></article></div></details>`;
}

export function shopPanel(s:StudioSave,icons:Record<Weapon,string>,filter:ShopFilter='all'):string {
  const selected=FILTERS.some(([id])=>id===filter)?filter:'all';
  const items=SHOP_ITEM_IDS.filter(id=>selected==='all'||category(id)===selected);
  return `<div class="shop-panel"><div class="shop-toolbar"><nav class="shop-filters" aria-label="Equipment categories">${FILTERS.map(([id,label])=>`<button class="shop-filter" data-action="shop-filter:${id}" aria-pressed="${selected===id}">${label}</button>`).join('')}</nav><span class="shop-wallet">◉ ${s.coins}<small>coins</small></span></div><div class="shop-catalogue-line"><span>${items.length} items</span><small>Earn coins at Lucky Lantern Noodles.</small></div><div class="shop-grid">${items.map(id=>{
    const item=ITEMS[id],owned=s.owned.includes(id),active=equipped(s,id);
    return `<article class="shop-card ${owned?'is-owned':''} ${active?'is-equipped':''}" data-item="${id}" data-category="${category(id)}" style="--item-tint:${item.tint}">${itemHeader(id,icons[id],owned?active?'Equipped':'Owned':`${item.price} coins`)}${details(id)}<footer><span class="item-numbers">${item.damage} power · ${item.speed.toFixed(2)}s / hit</span><button class="shop-card-action ${active?'active':''}" data-action="${owned?'item-equip:':'item-buy:'}${id}" ${!owned&&s.coins<item.price?'disabled':''}>${owned?active?'Unequip':'Equip':`Buy & equip · ${item.price} coins`}</button>${!owned&&s.coins<item.price?`<small class="item-shortfall">${item.price-s.coins} more coins needed</small>`:''}</footer></article>`;
  }).join('')}</div>${extras(s)}</div>`;
}

export function backpackPanel(s:StudioSave,icons:Record<Weapon,string>):string {
  const owned=sortedOwned(s);
  return `<div class="backpack-panel"><div class="backpack-toolbar"><span><b>${owned.length}</b> owned</span><span class="backpack-equipped">${s.weaponEquipped?`Equipped: ${escape(ITEMS[s.weapon].name)}`:'Empty hands'}</span></div><section class="backpack-quickslots" aria-label="Your three quickslots">${s.quickSlots.map((id,slot)=>`<div class="backpack-slot ${id?'filled':'empty'}"><kbd>${slot+1}</kbd>${id?`<img src="${icons[id]}" alt=""><strong>${escape(ITEMS[id].name)}</strong><button class="slot-clear" data-action="slot-clear:${slot}" aria-label="Clear quickslot ${slot+1}" title="Clear slot">×</button>`:'<span class="empty-slot-symbol" aria-hidden="true">+</span><strong>Empty</strong>'}</div>`).join('')}</section>${owned.length?`<p class="backpack-slot-help">Choose 1, 2 or 3 below an item to put it in that quickslot.</p><div class="backpack-grid">${owned.map(id=>{
    const active=equipped(s,id),mod=s.weaponMods[id];
    return `<article class="backpack-card ${active?'is-equipped':''}" data-item="${id}" style="--item-tint:${ITEMS[id].tint}">${itemHeader(id,icons[id],`Lv. ${s.toolRanks[id]+1}${mod.enhancement?` · +${mod.enhancement}`:''}${active?' · Equipped':''}`)}${details(id)}<div class="backpack-card-actions"><button class="backpack-equip ${active?'active':''}" data-action="item-equip:${id}">${active?'Unequip':'Equip'}</button><div class="slot-assign" role="group" aria-label="Quickslot for ${escape(ITEMS[id].name)}"><span>Slot</span>${[0,1,2].map(slot=>`<button data-action="slot:${slot}:${id}" aria-label="Assign ${escape(ITEMS[id].name)} to quickslot ${slot+1}" aria-pressed="${s.quickSlots[slot]===id}">${slot+1}</button>`).join('')}</div></div></article>`;
  }).join('')}</div>`:'<div class="backpack-empty"><span aria-hidden="true">◇</span><h3>Your backpack is empty</h3><p>Get your first equipment from the mysterious shop.</p><button class="primary" data-action="find-shop">Find the shop →</button><small>Work a shift at Lucky Lantern Noodles to earn coins.</small></div>'}</div>`;
}
