export interface StudioDifficulty {
  readonly studio: number;
  readonly hp: number;
  readonly defense: number;
  readonly moveSpeed: number;
  readonly meleeDamage: number;
  readonly projectileDamage: number;
  readonly propDamage: number;
  readonly windupScale: number;
  readonly ai: Readonly<{
    openingDelay: number; thinkMin: number; thinkJitter: number;
    attackRecovery: number; recoveryJitter: number;
    dodgeChance: number; dodgeCooldown: number;
    pickupChance: number; randomJumpChance: number; jumpCooldown: number;
    dropChance: number; allowThrow: boolean; allowUppercut: boolean; allowKick: boolean;
  }>;
}
const hp = [95,125,155,185,220,255,290,325,365];
const speed = [3.1,3.4,3.7,4,4.3,4.6,4.9,5.2,5.5];
const damage = [6,8,10,12,14,16,18,20,23];
const windup = [1.9,1.7,1.5,1.35,1.2,1.1,1,.95,.9];
const opening = [1.15,1,.85,.75,.66,.58,.5,.43,.36];
const think = [.6,.48,.39,.33,.28,.23,.2,.17,.14];
const thinkJitter = [.28,.25,.22,.2,.18,.16,.14,.12,.1];
const recovery = [2.8,2.35,2,1.72,1.49,1.3,1.15,1,.88];
const recoveryJitter = [.25,.22,.2,.18,.16,.14,.12,.1,.08];
const dodgeChance = [0,.12,.18,.24,.3,.36,.42,.48,.55];
const dodgeCooldown = [4,3.8,3.5,3.2,2.9,2.6,2.3,2,1.7];
const pickupChance = [0,0,.3,.38,.45,.52,.58,.64,.7];
const jumpChance = [0,.025,.035,.045,.065,.08,.1,.12,.14];
const profiles: readonly StudioDifficulty[] = hp.map((health, index) => Object.freeze({
  studio: index+1, hp: health, defense: index, moveSpeed:speed[index],
  meleeDamage:damage[index], projectileDamage:damage[index]+2, propDamage:damage[index]+3,
  windupScale:windup[index],
  ai:Object.freeze({
    openingDelay:opening[index], thinkMin:think[index], thinkJitter:thinkJitter[index],
    attackRecovery:recovery[index], recoveryJitter:recoveryJitter[index],
    dodgeChance:dodgeChance[index], dodgeCooldown:dodgeCooldown[index],
    pickupChance:pickupChance[index], randomJumpChance:jumpChance[index], jumpCooldown:1.8-index*.1,
    dropChance:.45+index*.045, allowThrow:index>=2, allowUppercut:index>=3, allowKick:index>=4,
  }),
}));

/** Difficulty belongs to the studio, so changing professors never changes its baseline. */
export function studioDifficulty(studio:number):StudioDifficulty {
  const index=typeof studio==='number'&&Number.isFinite(studio)?Math.min(8,Math.max(0,Math.floor(studio)-1)):0;
  return profiles[index];
}
