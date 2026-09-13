import type { TeacherLook } from './Teachers';
export const HAIR_STYLES = ['short','swept','bob','long','curly','bald'] as const;
export const SKIN_COLOURS = ['#f5dbb6','#ebc4a0','#d8aa83','#bd8b64','#936341','#62412e'] as const;
export const HAIR_COLOURS = ['#303333','#684735','#ac7845','#d2bd82','#c1bbb4','#72618e','#e7dfe5'] as const;
export interface CharacterAppearance { sex:'male'|'female'; hairStyle:TeacherLook['hairStyle']; skin:string; hair:string }
export const defaultAppearance = (): CharacterAppearance => ({sex:'male',hairStyle:'short',skin:SKIN_COLOURS[1],hair:HAIR_COLOURS[6]});
export function sanitizeAppearance(raw: unknown): CharacterAppearance {
  const result=defaultAppearance(); if(!raw || typeof raw!=='object')return result;
  const value=raw as Partial<CharacterAppearance>;
  if(value.sex==='male'||value.sex==='female')result.sex=value.sex;
  if(HAIR_STYLES.includes(value.hairStyle!))result.hairStyle=value.hairStyle!;
  if(SKIN_COLOURS.includes(value.skin as typeof SKIN_COLOURS[number]))result.skin=value.skin!;
  if(HAIR_COLOURS.includes(value.hair as typeof HAIR_COLOURS[number]))result.hair=value.hair!;
  return result;
}
