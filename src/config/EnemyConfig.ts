/** Floor scaling supplies power; attack patterns supply each encounter's lesson. */
export type MonsterId = 'slime' | 'mushroom' | 'bat' | 'skeleton' | 'fang' | 'ghost' | 'mage' | 'armored' | 'flame' | 'trainingDummy'
  | 'giantSlime' | 'boneCaptain' | 'bloodFang' | 'phantomScholar' | 'ironWarden' | 'emberBeast' | 'fallenKing' | 'abyssGuardian' | 'abyssLord';
export type MoveMode = 'hop' | 'fly' | 'walk';
export type AttackPattern = 'sweep' | 'stomp' | 'lunge' | 'mark' | 'twinMark';
export interface MonsterDef {
  id: MonsterId; displayName: string;
  hpMult: number; attackMult: number; defenseMult: number; expMult: number; goldMult: number;
  goldMin: number; goldMax: number; moveSpeed: number; moveMode: MoveMode;
  width: number; height: number; aggroRangeMult: number;
  patterns: AttackPattern[]; windup: number; recovery: number; cooldown: number;
  boss?: boolean; guarded?: boolean;
}
export const BASE_MONSTER = { hp: 40, attack: 7, defense: 2, exp: 12, gold: 5 } as const;
function monster(id: MonsterId, displayName: string, values: Partial<MonsterDef> = {}): MonsterDef {
  return { id, displayName, hpMult: 1, attackMult: .7, defenseMult: 1, expMult: 1, goldMult: 1,
    goldMin: 5, goldMax: 8, moveSpeed: 1.8, moveMode: 'walk', width: 1.2, height: 1.5,
    aggroRangeMult: .85, patterns: ['sweep'], windup: .95, recovery: .8, cooldown: 2.4, ...values };
}
function boss(id: MonsterId, displayName: string, patterns: AttackPattern[], values: Partial<MonsterDef> = {}): MonsterDef {
  return monster(id, displayName, { boss: true, hpMult: 4.5, attackMult: 1, defenseMult: 1.1, expMult: 5, goldMult: 4,
    moveSpeed: 1.6, width: 2.4, height: 2.5, aggroRangeMult: 1.8, patterns,
    windup: 1.2, recovery: 1.4, cooldown: 1.6, ...values });
}
export const EnemyConfig: Record<MonsterId, MonsterDef> = {
  slime: monster('slime', 'Green Slime', { hpMult: .8, attackMult: .7, defenseMult: .5, expMult: .8, goldMin: 4, goldMax: 6, moveMode: 'hop', width: 1.15, height: .95 }),
  mushroom: monster('mushroom', 'Mushroom', { hpMult: 1.125, expMult: 1.08, moveSpeed: 1.2, moveMode: 'hop', height: 1.15 }),
  bat: monster('bat', 'Cave Bat', { hpMult: .7, attackMult: .65, defenseMult: .5, moveSpeed: 2.4, moveMode: 'fly', height: .8 }),
  skeleton: monster('skeleton', 'Sleepy Skeleton', { hpMult: 1.1, attackMult: .5, moveSpeed: 1.15, windup: 1.1, cooldown: 3.2, recovery: 1 }),
  fang: monster('fang', 'Cavern Pup', { hpMult: 1.05, moveMode: 'hop', moveSpeed: 2.2, height: 1.15, patterns: ['lunge'], windup: 1.05 }),
  ghost: monster('ghost', 'Wisp Ghost', { hpMult: .85, moveMode: 'fly', moveSpeed: 1.5, patterns: ['mark'], windup: 1.25, cooldown: 2.6 }),
  mage: monster('mage', 'Lost Pagekeeper', { hpMult: .85, moveSpeed: .9, patterns: ['mark', 'twinMark'], windup: 1.4, cooldown: 2.8 }),
  armored: monster('armored', 'Iron Sentry', { hpMult: 1.3, moveSpeed: 1, guarded: true, windup: 1.25, recovery: 1.6, cooldown: 2.8 }),
  flame: monster('flame', 'Ember Sprite', { hpMult: .95, moveMode: 'hop', patterns: ['stomp', 'mark'], windup: 1.3, recovery: 1.2 }),
  trainingDummy: monster('trainingDummy', 'Training Dummy', { hpMult: 1.5, attackMult: 0, expMult: 0, goldMult: 0, goldMin: 0, goldMax: 0, moveSpeed: 0, width: 1.3, height: 1.65, patterns: [] }),
  giantSlime: boss('giantSlime', 'Gentle Giant Slime', [], { hpMult: 4, attackMult: 0, moveSpeed: .45, moveMode: 'hop', height: 1.9, width: 3 }),
  boneCaptain: boss('boneCaptain', 'Bone Captain', ['sweep', 'stomp'], { attackMult: .65, windup: 1.35, recovery: 1.6, cooldown: 2.2 }),
  bloodFang: boss('bloodFang', 'Blood Fang Beast', ['lunge', 'stomp'], { moveMode: 'hop', width: 2.8, height: 2.1, moveSpeed: 2, hpMult: 5 }),
  phantomScholar: boss('phantomScholar', 'Phantom Scholar', ['mark', 'twinMark', 'stomp'], { hpMult: 5, moveMode: 'fly', windup: 1.4 }),
  ironWarden: boss('ironWarden', 'Iron Warden', ['sweep', 'stomp'], { hpMult: 5.5, guarded: true, windup: 1.45, recovery: 2, moveSpeed: 1.1, width: 2.7 }),
  emberBeast: boss('emberBeast', 'Ember Beast', ['stomp', 'lunge', 'twinMark'], { hpMult: 5.5, moveMode: 'hop', width: 2.8, height: 2.4, windup: 1.35 }),
  fallenKing: boss('fallenKing', 'Fallen King', ['sweep', 'mark', 'lunge'], { hpMult: 6, guarded: true, windup: 1.25, recovery: 1.8, height: 2.8 }),
  abyssGuardian: boss('abyssGuardian', 'Abyss Guardian', ['stomp', 'twinMark'], { hpMult: 4, guarded: true, width: 2.8, height: 2.8, windup: 1.5, recovery: 2 }),
  abyssLord: boss('abyssLord', 'Abyss Lord', ['sweep', 'twinMark', 'lunge', 'stomp'], { hpMult: 7, width: 3, height: 2.8, windup: 1.3, recovery: 1.8, cooldown: 1.3 }),
};
