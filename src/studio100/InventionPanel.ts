import { CRAFT_COST, type Invention } from './Inventions';
import type { StudioSave, Weapon } from './StudioState';

const entities:Record<string,string>={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
const escape = (text:string):string => text.replace(/[&<>"']/g,char=>entities[char]);

/** Shop-only presentation for the existing bounded word recipes. */
export function inventionPanel(state:Pick<StudioSave,'coins'|'inventions'>,draft:Invention|null,icons:Record<Weapon,string>,words=''):string {
  const existing=draft?state.inventions[draft.weapon]:undefined;
  const owned=Object.values(state.inventions),same=!!draft&&existing?.finish===draft.finish;
  return `<section class="invention-panel shop-invention-panel"><p>“Tell me what you have in mind. I’ll put together a blueprint.”</p><p>Describe a <b>pen, ruler or cup</b>. Add <b>light</b>, <b>heavy</b> or <b>long</b> to choose how it handles. Your words select a shop recipe; the tool keeps its original shape.</p><p class="detail">${state.coins} coins · Preview free · Craft ${CRAFT_COST} coins</p><label for="invention-words">Your idea</label><input id="invention-words" maxlength="120" value="${escape(words)}" placeholder="A lightweight pen for quick sketches" autocomplete="off"><button class="primary" data-action="invent-preview">Preview invention</button><p id="invention-feedback" role="status">${draft?'Blueprint ready.':'Previewing is free.'}</p>${draft?`<div class="choice invention-preview"><img src="${icons[draft.weapon]}" alt=""><h3>${escape(draft.name)}</h3><p>${escape(draft.note)}</p><p>${existing?'Replaces your current '+draft.weapon+' invention.':'Fits your '+draft.weapon+' slot.'} Your equipment upgrades stay.</p><button class="mystery-buy" data-action="invent-craft" ${state.coins<CRAFT_COST||same?'disabled':''}>${same?'Already crafted':`Craft & equip · ${CRAFT_COST} coins`}</button>${state.coins<CRAFT_COST&&!same?'<p class="detail">You need 30 coins to craft this blueprint.</p>':''}</div>`:''}<h3>Your inventions</h3>${owned.length?owned.map(item=>`<div class="invention-owned"><b>${escape(item.name)}</b><small>${escape(item.note)}</small></div>`).join(''):'<p>No inventions yet.</p>'}<small>One invention per tool. Saved with your progress on this browser.</small></section>`;
}
