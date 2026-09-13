export const HAIR_STYLES = ['short','swept','bob','long','curly','bald','ponytail','twin-tails','spiky'] as const;
export const SKIN_COLOURS = ['#f5dbb6','#ebc4a0','#d8aa83','#bd8b64','#936341','#62412e'] as const;
export const HAIR_COLOURS = ['#303333','#684735','#ac7845','#d2bd82','#c1bbb4','#72618e','#e7dfe5'] as const;
export const EYE_STYLES = ['bright','gentle','fierce','sleepy'] as const;
export const EYE_COLOURS = ['#526e9f','#71503e','#599077','#8b67a7','#b98a46','#454856'] as const;
export const OUTFITS = ['campus','varsity','studio','pinafore','street','classic'] as const;
export const OUTFIT_COLOURS = ['#6d9dc5','#83ad72','#ab7fac','#df9a75','#d8c16e','#e0ddd0','#465b79','#a95f6c'] as const;
export const ACCESSORIES = ['none','round-glasses','bow','headphones'] as const;
export interface CharacterAppearance {
  sex:'male'|'female'; hairStyle:typeof HAIR_STYLES[number]; skin:string; hair:string;
  eyeStyle:typeof EYE_STYLES[number]; eyes:string; outfit:typeof OUTFITS[number]; outfitColour:string;
  accessory:typeof ACCESSORIES[number];
}
export const defaultAppearance = (): CharacterAppearance => ({sex:'male',hairStyle:'short',skin:SKIN_COLOURS[1],hair:HAIR_COLOURS[6],eyeStyle:'bright',eyes:EYE_COLOURS[0],outfit:'classic',outfitColour:OUTFIT_COLOURS[5],accessory:'none'});
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
  return result;
}
export const LOOK_NAMES: Record<string,string> = {short:'Cloud crop',swept:'Side sweep',bob:'Ribbon bob',long:'Silky layers',curly:'Soft curls',bald:'Clean cut',ponytail:'High pony','twin-tails':'Twin tails',spiky:'Wild spikes',bright:'Starry-eyed',gentle:'Soft gaze',fierce:'Determined',sleepy:'Daydreamer',campus:'Campus hoodie',varsity:'Varsity jacket',studio:'Studio apron',pinafore:'Meadow dress',street:'Street layers',classic:'First-day classic',none:'No accessory','round-glasses':'Round glasses',bow:'Ribbon bow',headphones:'Headphones'};
export function starterLook(preset:'classic'|'meadow'|'midnight',skin:string):CharacterAppearance {
  const look={...defaultAppearance(),skin};
  if(preset==='meadow')return {...look,sex:'female',hairStyle:'bob',eyeStyle:'gentle',eyes:EYE_COLOURS[2],outfit:'pinafore',outfitColour:OUTFIT_COLOURS[1],accessory:'bow'};
  if(preset==='midnight')return {...look,hairStyle:'swept',hair:HAIR_COLOURS[5],eyeStyle:'fierce',eyes:EYE_COLOURS[3],outfit:'street',outfitColour:OUTFIT_COLOURS[6],accessory:'headphones'};
  return look;
}
