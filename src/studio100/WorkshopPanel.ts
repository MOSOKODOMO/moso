import { WEAPONS, upgradeCost, type StudioSave, type Weapon } from './StudioState';
import { inventionStats } from './Inventions';
import { applyWeaponMods, enhancementCost, RELICS, EMBED_COST, MAX_ENHANCEMENT, type RelicId } from './WeaponMods';

export function workshopPanel(s: StudioSave, icons: Record<Weapon, string>): string {
  const weapon=s.weapon, mod=s.weaponMods[weapon], rank=s.toolRanks[weapon];
  const stats=applyWeaponMods(inventionStats(WEAPONS[weapon],s.inventions[weapon]),mod);
  const power=stats.damage+rank*4+s.strength*3+(s.level-1)*2+(s.charms.echo?3:0);
  const levelCost=upgradeCost(s,'tool'), enhanceCost=enhancementCost(mod);
  return `<div class="workshop-panel"><nav class="workshop-loadout" aria-label="Choose a weapon to modify">${(['pen','ruler','cup'] as Weapon[]).map(w=>`<button class="workshop-tool ${w===weapon?'selected':''}" data-action="workshop-weapon:${w}" aria-pressed="${w===weapon}"><img src="${icons[w]}" alt=""><span>${WEAPONS[w].name}</span><small>Lv. ${s.toolRanks[w]+1}</small></button>`).join('')}</nav>
    <div class="workshop-summary"><strong>${stats.name}</strong><span>${s.coins} coins</span><small>Attack power ${power} · ${(1/stats.speed).toFixed(1)} attacks / sec · Reach ${stats.range.toFixed(1)}</small></div>
    <section class="choice"><h3>Level up</h3><p>+4 attack power with this weapon per level.</p><p class="detail">Weapon level ${rank+1} / 6</p><button data-action="buy:tool" ${rank>=5||s.coins<levelCost?'disabled':''}>${rank>=5?'Maximum level':`Level up · ${levelCost} coins`}</button></section>
    <section class="choice"><h3>Enhance</h3><p>Shorten the time between attacks by 5% per tier. Guaranteed improvement.</p><p class="detail">Enhancement ${mod.enhancement} / ${MAX_ENHANCEMENT}</p><button data-action="workshop-enhance" ${mod.enhancement>=MAX_ENHANCEMENT||s.coins<enhanceCost?'disabled':''}>${mod.enhancement>=MAX_ENHANCEMENT?'Fully enhanced':`Enhance · ${enhanceCost} coins`}</button></section>
    <section class="choice"><h3>Embed a relic</h3><p>One relic per weapon. ${EMBED_COST} coins includes the relic and embedding. Choosing another replaces the current relic.</p><div class="workshop-relics">${(Object.keys(RELICS) as RelicId[]).map(id=>`<div class="workshop-relic ${mod.relic===id?'selected':''}"><b>${RELICS[id].name}</b><small>${RELICS[id].description}</small><button data-action="workshop-relic:${id}" ${mod.relic===id||s.coins<EMBED_COST?'disabled':''}>${mod.relic===id?'Embedded':`Embed · ${EMBED_COST} coins`}</button></div>`).join('')}</div></section></div>`;
}
