export const HAIR_STYLES = ['short','swept','bob','long','curly','bald','ponytail','twin-tails','spiky'] as const;
export const SKIN_COLOURS = ['#f5dbb6','#ebc4a0','#d8aa83','#bd8b64','#936341','#62412e'] as const;
export const HAIR_COLOURS = ['#303333','#684735','#ac7845','#d2bd82','#c1bbb4','#72618e','#e7dfe5'] as const;
export const EYE_STYLES = ['bright','gentle','fierce','sleepy'] as const;
export const EYE_COLOURS = ['#526e9f','#71503e','#599077','#8b67a7','#b98a46','#454856'] as const;
export const OUTFITS = ['campus','varsity','studio','pinafore','street','classic'] as const;
export const OUTFIT_COLOURS = ['#6d9dc5','#83ad72','#ab7fac','#df9a75','#d8c16e','#e0ddd0','#465b79','#a95f6c'] as const;
export const BOTTOMS_COLOURS = ['#4c526d','#354b5e','#587469','#a89270','#d7cbbc','#713f52'] as const;
export const SHOE_COLOURS = ['#f6eee1','#b68c58','#303b48','#739083','#a95f6c','#6d9dc5'] as const;
export const BACKPACK_COLOURS = ['#9f8264','#577f76','#465b79','#a95f6c','#d8c16e','#d2bdac'] as const;
export const ACCESSORIES = ['none','round-glasses','bow','headphones','cap','beanie'] as const;
export interface ColourOption { readonly value:string; readonly name:string }
export type AppearanceColour='skin'|'hair'|'eyes'|'outfitColour'|'bottomsColour'|'shoeColour'|'backpackColour';
const named=(values:readonly string[],names:readonly string[]):readonly ColourOption[]=>values.map((value,index)=>({value,name:names[index]}));
export const PALETTES:Readonly<Record<AppearanceColour,readonly ColourOption[]>>={
 skin:named(SKIN_COLOURS,['Porcelain','Peach','Sand','Honey','Umber','Cocoa']),
 hair:named(HAIR_COLOURS,['Ink','Chestnut','Copper','Golden oat','Silver','Violet dusk','Pearl']),
 eyes:named(EYE_COLOURS,['Lake blue','Hazel','Jade','Amethyst','Amber','Graphite']),
 outfitColour:named(OUTFIT_COLOURS,['Sky blue','Meadow','Lilac','Apricot','Marigold','Linen','Midnight','Rosewood']),
 bottomsColour:named(BOTTOMS_COLOURS,['Denim','Deep indigo','Sage','Chino','Oat','Plum']),
 shoeColour:named(SHOE_COLOURS,['Cream','Caramel','Charcoal','Sage','Rosewood','Sky blue']),
 backpackColour:named(BACKPACK_COLOURS,['Canvas tan','Forest','Midnight','Rosewood','Marigold','Sandstone']),
};
export const colourName=(key:AppearanceColour,value:string|undefined):string=>PALETTES[key].find(option=>option.value===value)?.name??PALETTES[key][0].name;
export interface CharacterAppearance {
  sex:'male'|'female'; hairStyle:typeof HAIR_STYLES[number]; skin:string; hair:string;
  eyeStyle:typeof EYE_STYLES[number]; eyes:string; outfit:typeof OUTFITS[number]; outfitColour:string;
  accessory:typeof ACCESSORIES[number];
  bottomsColour?:string; shoeColour?:string; backpackColour?:string;
}
export const defaultAppearance = (): CharacterAppearance => ({sex:'male',hairStyle:'short',skin:SKIN_COLOURS[1],hair:HAIR_COLOURS[6],eyeStyle:'bright',eyes:EYE_COLOURS[0],outfit:'classic',outfitColour:OUTFIT_COLOURS[5],accessory:'none',bottomsColour:BOTTOMS_COLOURS[0],shoeColour:SHOE_COLOURS[0],backpackColour:BACKPACK_COLOURS[0]});
export function sanitizeAppearance(raw: unknown): CharacterAppearance {
  const result=defaultAppearance(); if(!raw || typeof raw!=='object')return result;
  const value=raw as Partial<CharacterAppearance>;
  if(value.sex==='male'||value.sex==='female')result.sex=value.sex;
  // Old saves gain wardrobe defaults without changing their selected hair or skin.
  if(result.sex==='female'){result.outfit='pinafore';result.outfitColour=OUTFIT_COLOURS[1];result.accessory='bow';}
  if(HAIR_STYLES.includes(value.hairStyle!))result.hairStyle=value.hairStyle!;
  if(SKIN_COLOURS.includes(value.skin as typeof SKIN_COLOURS[number]))result.skin=value.skin!;
  if(HAIR_COLOURS.includes(value.hair as typeof HAIR_COLOURS[number]))result.hair=value.hair!;
  if(EYE_STYLES.includes(value.eyeStyle!))result.eyeStyle=value.eyeStyle!;
  if(EYE_COLOURS.includes(value.eyes as typeof EYE_COLOURS[number]))result.eyes=value.eyes!;
  if(OUTFITS.includes(value.outfit!))result.outfit=value.outfit!;
  if(OUTFIT_COLOURS.includes(value.outfitColour as typeof OUTFIT_COLOURS[number]))result.outfitColour=value.outfitColour!;
  if(ACCESSORIES.includes(value.accessory!))result.accessory=value.accessory!;
  for(const key of ['bottomsColour','shoeColour','backpackColour'] as const){if(PALETTES[key].some(option=>option.value===value[key]))result[key]=value[key];}
  return result;
}
export const LOOK_NAMES: Record<string,string> = {short:'Cloud crop',swept:'Side sweep',bob:'Ribbon bob',long:'Silky layers',curly:'Soft curls',bald:'Clean cut',ponytail:'High pony','twin-tails':'Twin tails',spiky:'Wild spikes',bright:'Starry-eyed',gentle:'Soft gaze',fierce:'Determined',sleepy:'Daydreamer',campus:'Campus shirt',varsity:'Varsity jacket',studio:'Studio apron',pinafore:'Meadow dress',street:'Street layers',classic:'First-day classic',none:'No accessory','round-glasses':'Round glasses',bow:'Ribbon bow',headphones:'Headphones',cap:'Campus cap',beanie:'Soft beanie'};
export function starterLook(preset:'classic'|'meadow'|'midnight',skin:string):CharacterAppearance {
  const look={...defaultAppearance(),skin};
  if(preset==='meadow')return {...look,sex:'female',hairStyle:'bob',eyeStyle:'gentle',eyes:EYE_COLOURS[2],outfit:'pinafore',outfitColour:OUTFIT_COLOURS[1],accessory:'bow'};
  if(preset==='midnight')return {...look,hairStyle:'swept',hair:HAIR_COLOURS[5],eyeStyle:'fierce',eyes:EYE_COLOURS[3],outfit:'street',outfitColour:OUTFIT_COLOURS[6],accessory:'headphones'};
  return look;
}
