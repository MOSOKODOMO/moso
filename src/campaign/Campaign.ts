/**
 * Campaign — deterministic story progression. No rendering, random rolls or
 * storage access: Game awards items and persists this plain data with its save.
 */
import { RouteProgress, type RouteData } from './RouteProgress';
import { ROUTES } from './CampaignRoutes';
export interface CampaignStation { id: string; title: string; lines: string[] }
export interface FloorStory {
  floor: number; name: string; bossName: string; killQuota: number;
  recommendedLevel: number; stations: CampaignStation[];
  arrival: string[]; clear: string[]; keyName: string;
}
export interface CampaignData {
  journey?: RouteData;
  started: boolean;
  clearedFloors: number[];
  kills: Record<number, number>;
  interactions: string[];
  rewardClaims: string[];
  sealReturned: boolean;
  completed: boolean;
  endingSeen: boolean;
}
export interface CampaignObjective { id: string; label: string; done: boolean }
export const CAMPAIGN_TITLE = 'The Last Light of the Underground Kingdom';
export const GUARDIAN_REWARD_ID = 'guardian-8';
export const ENDING_REWARD_ID = 'ending';
export function floorRewardId(floor: number): string { return 'floor-' + floor; }
export const CAMPAIGN_INTRO = [
  'Mira: The crystal above our village is fading. Something below the ruins is drawing its light away.',
  'The nearby slimes and mushrooms are harmless. Practise moving and basic attacks there, and find the crystal fragment by the old marker.',
  'At character level 3, choose your first skill in Stats. Try it safely in the ruins, then follow the crystal light.',
];
export const SEAL_RETURN = [
  'Mira: This is a royal soldier’s seal. The buried kingdom has been calling for help all this time.',
  'I can open the Bone Crypt now. Its soldiers still obey an old command; watch their slow wind-ups and move clear.',
  'Your seal is recorded in the journal. The gate lets you return to every floor you have unlocked.',
];
export const GUARDIAN_DEFEATED = [
  'The last guardian lowers its weapon. It was protecting the king’s final gift, not the darkness.',
  'Take the Tier 8 equipment and prepare it before facing the Abyss Lord. The inner gate will wait for you.',
];
export const CORE_PURIFIED = [
  'The Abyss Lord’s shadow dissolves. You place the royal seal beside the broken core and the stolen light begins to flow home.',
  'The underground kingdom is finally quiet. Return to Meadow Outpost and speak with Mira.',
];
export const CAMPAIGN_ENDING = [
  'Mira: Look—the village crystal is shining again. Everyone followed its light to welcome you home.',
  'The king’s last promise has been kept. The people above can build a future, and those below can finally rest.',
  'Thank you for bringing the last light home. The story is complete; every unlocked floor remains open for optional adventures.',
];

export const FLOOR_STORIES: Record<number, FloorStory> = {
  1: {
    floor: 1, name: 'Forgotten Ruins', bossName: 'Giant Crystal Slime', killQuota: 18, recommendedLevel: 1,
    stations: [{ id: 'f1-fragment', title: 'Weathered Crystal Marker', lines: [
      'A shard of pale crystal is caught inside a soldier’s broken seal. Its light points deeper underground.',
      'The creatures here are harmless. Learn one skill at level 3 and practise it before testing the giant slime.',
    ] }],
    arrival: ['The sun still reaches these ruins. Every creature here is harmless, even when struck.', 'Gather crystal traces, inspect the old marker and practise a learned skill.'],
    clear: ['The giant slime releases the other half of the soldier’s seal.', 'Take it back to Mira in Meadow Outpost so she can read the route into the crypt.'],
    keyName: 'Royal Soldier’s Seal',
  },
  2: {
    floor: 2, name: 'Bone Crypt', bossName: 'Bone Captain', killQuota: 18, recommendedLevel: 4,
    stations: [{ id: 'f2-orders', title: 'Captain’s Last Orders', lines: [
      '“Hold the passage. The families must reach the surface.” The captain never received another order.',
      'A pulse from below keeps the dead at their posts. Break its hold and release the captain.',
    ] }],
    arrival: ['The first hostile sentries stand between the burial stones.', 'Their attacks are slow and visible. Move away from the warning, then strike.'],
    clear: ['The captain salutes once, then lays down his weapon.', 'His lantern reveals the path to a cavern of red crystal.'],
    keyName: 'Captain’s Lantern',
  },
  3: {
    floor: 3, name: 'Blood Cavern', bossName: 'Blood Fang Beast', killQuota: 20, recommendedLevel: 7,
    stations: [{ id: 'f3-conduit', title: 'Crimson Conduit', lines: [
      'The crystals are feeding the cave’s creatures with stolen energy.',
      'You disconnect the conduit. A distant machine continues to pull light deeper into the kingdom.',
    ] }],
    arrival: ['Crystal veins connect the cavern floor to its hanging ledges.', 'Watch enemies above and below while finding the crimson conduit.'],
    clear: ['With the beast quiet, the red crystals cool to a gentle glow.', 'A scholar’s sigil leads toward a library sealed beneath the rock.'],
    keyName: 'Scholar’s Sigil',
  },
  4: {
    floor: 4, name: 'Haunted Library', bossName: 'Phantom Scholar', killQuota: 20, recommendedLevel: 10,
    stations: [
      { id: 'f4-journal', title: 'The King’s Journal', lines: [
        '“I built the heart to shelter our people from the winter. I did not know what would answer its call.”',
        'The king tried to protect his kingdom. The darkness entered through the heart’s energy network.',
      ] },
      { id: 'f4-lens', title: 'Astral Reading Lens', lines: [
        'The lens reveals a map of conduits linking the fortress, furnaces and royal throne.',
        'Cut those links before approaching the heart. The scholar’s ward loosens around the next passage.',
      ] },
    ],
    arrival: ['Books turn their own pages in the dim library.', 'Find the king’s journal and the reading lens to reveal the source of the curse.'],
    clear: ['The scholar remembers the king’s warning and opens the fortress archive.', 'The ward key can sever the first major energy link.'],
    keyName: 'Archive Ward Key',
  },
  5: {
    floor: 5, name: 'Iron Fortress', bossName: 'Iron Warden', killQuota: 22, recommendedLevel: 14,
    stations: [
      { id: 'f5-forge', title: 'Abandoned Ward Forge', lines: [
        'A half-finished tool rests beside the cold anvil. Its teeth fit the royal energy relays.',
        'You recover the ward breaker. Enhancements stay with equipment slots when you change gear.',
      ] },
      { id: 'f5-relay', title: 'Fortress Relay', lines: [
        'The ward breaker turns in the relay. The fortress stops sending energy into the heart.',
        'The Iron Warden still protects the lower stair. Wait for its heavy attacks to leave an opening.',
      ] },
    ],
    arrival: ['Old plate-armored guards keep the fortress stair.', 'Recover the ward breaker, then disconnect the fortress relay.'],
    clear: ['The warden’s armor falls still. Its duty no longer binds it.', 'A furnace key opens the passages beneath the fortress.'],
    keyName: 'Furnace Key',
  },
  6: {
    floor: 6, name: 'Burning Depths', bossName: 'Ember Beast', killQuota: 22, recommendedLevel: 18,
    stations: [
      { id: 'f6-furnace-a', title: 'Western Furnace Feed', lines: [
        'You shut the first furnace feed. The flames draw back from the old maintenance route.',
        'The second feed must also stop before the Ember Beast loses its shield.',
      ] },
      { id: 'f6-furnace-b', title: 'Eastern Furnace Feed', lines: [
        'The last feed closes. The royal heart can no longer pull power from the furnaces.',
        'A cooling bridge leads toward the fallen throne.',
      ] },
    ],
    arrival: ['The furnaces still burn for a kingdom that is gone.', 'Shut both energy feeds. Deep hazards are visible before they flare; use the safe routes.'],
    clear: ['The Ember Beast fades into harmless sparks.', 'The bridge seal points to the throne where the last king waits.'],
    keyName: 'Throne Bridge Seal',
  },
  7: {
    floor: 7, name: 'Fallen Kingdom', bossName: 'Fallen King', killQuota: 24, recommendedLevel: 22,
    stations: [{ id: 'f7-oath', title: 'The Royal Oath', lines: [
      '“No crown is worth more than one life entrusted to it.” The promise is carved into the throne approach.',
      'The king is trapped by the heart’s command. Break its hold without forgetting whom you came to save.',
    ] }],
    arrival: ['The fallen city lies beyond a row of silent statues.', 'Read the royal oath and reach the throne to release the king.'],
    clear: ['The king’s eyes clear. “Bring the light home. That is all I ever wanted.”', 'He gives you the final gate seal and asks you to purify the heart.'],
    keyName: 'Final Gate Seal',
  },
  8: {
    floor: 8, name: 'Abyss Gate', bossName: 'Abyss Lord', killQuota: 18, recommendedLevel: 26,
    stations: [{ id: 'f8-ward', title: 'Last Guardian’s Ward', lines: [
      'The final gate recognizes the royal seal. Its guardian carries equipment prepared for the one who would mend the heart.',
      'Defeat the guardian and receive the Tier 8 reward before challenging the Abyss Lord.',
    ] }],
    arrival: ['The stolen light gathers at the heart of the abyss.', 'Pass the guardian, prepare the final equipment reward and face the Abyss Lord.'],
    clear: ['The Abyss Lord can no longer hold the royal heart.', 'Approach the core and purify it, then return to Mira with the village’s light.'],
    keyName: 'Purified Heart',
  },
};

const STATION_FLOORS = new Map(Object.values(FLOOR_STORIES).flatMap((story) => story.stations.map((station) => [station.id, story.floor] as const)));
const EXTRA_INTERACTIONS = ['f1-practice', 'f8-guardian', 'f8-core'];
const VALID_REWARDS = ['starter', 'seal-return', GUARDIAN_REWARD_ID, ENDING_REWARD_ID, ...Array.from({ length: 8 }, (_, i) => floorRewardId(i + 1))];
function validFloor(floor: number): boolean { return Number.isInteger(floor) && floor >= 1 && floor <= 8; }
export function defaultCampaign(): CampaignData {
  return { started: false, clearedFloors: [], kills: {}, interactions: [], rewardClaims: [], sealReturned: false, completed: false, endingSeen: false };
}

export class Campaign {
  readonly journey = new RouteProgress();
  state: CampaignData = defaultCampaign();
  constructor(data?: unknown, legacyUnlockedFloor = 1) { this.deserialize(data, legacyUnlockedFloor); }

  start(): boolean {
    if (this.state.started) return false;
    this.state.started = true;
    return true;
  }
  hasCleared(floor: number): boolean { return this.state.clearedFloors.includes(floor); }
  hasInteraction(id: string): boolean { return this.state.interactions.includes(id); }
  hasReward(id: string): boolean { return this.state.rewardClaims.includes(id); }
  get unlockedFloor(): number {
    let highest = 1;
    for (let floor = 2; floor <= 8; floor++) {
      if (!this.canEnter(floor)) break;
      highest = floor;
    }
    return highest;
  }
  canEnter(floor: number): boolean {
    if (!validFloor(floor)) return false;
    if (floor === 1) return true;
    if (!this.state.sealReturned) return false;
    for (let previous = 1; previous < floor; previous++) {
      if (!this.hasCleared(previous) || !this.hasReward(floorRewardId(previous))) return false;
    }
    return true;
  }
  recordKill(floor: number): boolean {
    if (!this.state.started || !this.canEnter(floor)) return false;
    const count = this.state.kills[floor] ?? 0;
    if (count >= FLOOR_STORIES[floor].killQuota) return false;
    this.state.kills[floor] = count + 1;
    return true;
  }
  /** World stations plus the actual first learned-skill cast; boss/core use dedicated methods. */
  interact(id: string): boolean {
    if (!this.state.started || this.hasInteraction(id)) return false;
    const floor = STATION_FLOORS.get(id) ?? (id === 'f1-practice' ? 1 : 0);
    if (!floor || !this.canEnter(floor)) return false;
    this.state.interactions.push(id);
    return true;
  }
  objectives(floor: number): CampaignObjective[] {
    if (!validFloor(floor)) return [];
    const story = FLOOR_STORIES[floor];
    const out: CampaignObjective[] = ROUTES[floor].map(room => ({
      id: room.id, label: room.title, done: this.journey.completed.has(room.id),
    }));
    for (const station of story.stations) out.push({ id: station.id, label: station.title, done: this.hasInteraction(station.id) });
    if (floor === 1) out.push({ id: 'f1-practice', label: 'Learn a skill at level 3, then cast it here', done: this.hasInteraction('f1-practice') });
    return out;
  }
  objectivesReady(floor: number): boolean {
    return this.state.started && this.canEnter(floor) && this.objectives(floor).every((o) => o.done);
  }
  canChallengeGuardian(floor = 8): boolean {
    return floor === 8 && this.objectivesReady(8) && !this.hasInteraction('f8-guardian') && !this.hasCleared(8);
  }
  defeatGuardian(): boolean {
    if (!this.canChallengeGuardian()) return false;
    this.state.interactions.push('f8-guardian');
    return true;
  }
  canChallenge(floor: number): boolean {
    if (!this.objectivesReady(floor)) return false;
    return floor !== 8 || (this.hasInteraction('f8-guardian') && this.hasReward(GUARDIAN_REWARD_ID));
  }
  /** True only on the first valid clear. Boss replay never repeats first-clear rewards. */
  completeFloor(floor: number): boolean {
    if (this.hasCleared(floor) || !this.canChallenge(floor)) return false;
    this.state.clearedFloors.push(floor);
    this.state.clearedFloors.sort((a, b) => a - b);
    return true;
  }
  returnSeal(): boolean {
    if (!this.hasCleared(1) || this.state.sealReturned) return false;
    this.state.sealReturned = true;
    return true;
  }
  private rewardAvailable(id: string): boolean {
    if (id === 'starter') return this.state.started;
    if (id === 'seal-return') return this.state.sealReturned;
    if (id === GUARDIAN_REWARD_ID) return this.hasInteraction('f8-guardian');
    if (id === ENDING_REWARD_ID) return this.state.completed;
    const match = /^floor-([1-8])$/.exec(id);
    return !!match && this.hasCleared(Number(match[1]));
  }
  /** Call after delivering the guaranteed reward; this claim is saved with the inventory. */
  claimReward(id: string): boolean {
    if (!this.rewardAvailable(id) || this.hasReward(id)) return false;
    this.state.rewardClaims.push(id);
    return true;
  }
  pendingRewards(): string[] {
    return VALID_REWARDS.filter((id) => this.rewardAvailable(id) && !this.hasReward(id));
  }
  purifyCore(): boolean {
    if (!this.hasCleared(8) || this.state.completed) return false;
    if (!this.hasInteraction('f8-core')) this.state.interactions.push('f8-core');
    this.state.completed = true;
    return true;
  }
  finishEnding(): boolean {
    if (!this.state.completed || this.state.endingSeen) return false;
    this.state.endingSeen = true;
    return true;
  }
  objective(currentFloor: number): string {
    if (!this.state.started) return 'Speak with Mira in Meadow Outpost.';
    if (this.state.completed) return this.state.endingSeen
      ? 'The light is home. Revisit any unlocked floor.'
      : 'Return to Meadow Outpost and speak with Mira.';
    if (this.hasCleared(8)) return 'Purify the core at Abyss Gate.';
    if (this.hasCleared(1) && !this.state.sealReturned) return 'Bring the Royal Soldier’s Seal to Mira.';
    const pendingFloor = this.state.clearedFloors.find((floor) => !this.hasReward(floorRewardId(floor)));
    if (pendingFloor) return 'Claim the guaranteed Floor ' + pendingFloor + ' reward in the journal.';
    const floor = validFloor(currentFloor) ? currentFloor : this.unlockedFloor;
    if (this.hasCleared(floor)) return floor < 8
      ? 'Floor cleared. Enter Floor ' + Math.min(8, floor + 1) + ' or revisit freely.'
      : 'Purify the core at Abyss Gate.';
    if (!currentFloor) return 'Enter Floor ' + floor + ' — ' + FLOOR_STORIES[floor].name + '.';
    const next = this.objectives(floor).find((o) => !o.done);
    if (next) {
      const room = this.journey.active(floor);
      if (room?.id === next.id) return room.title + (this.journey.ready(room) ? ' · Activate the chamber beacon (E).' : ' · Follow the encounter groups, then activate its beacon.');
      return next.label;
    }
    if (floor === 8 && !this.hasInteraction('f8-guardian')) return 'Defeat the Last Guardian for Tier 8 equipment.';
    if (floor === 8 && !this.hasReward(GUARDIAN_REWARD_ID)) return 'Collect the guardian’s guaranteed Tier 8 reward.';
    return 'Challenge ' + FLOOR_STORIES[floor].bossName + '.';
  }
  serialize(): CampaignData {
    return {
      ...this.state, clearedFloors: [...this.state.clearedFloors], kills: { ...this.state.kills },
      journey: this.journey.serialize(),
      interactions: [...this.state.interactions], rewardClaims: [...this.state.rewardClaims],
    };
  }
  deserialize(data?: unknown, legacyUnlockedFloor = 1): void {
    this.state = defaultCampaign();
    if (!data || typeof data !== 'object' || !('started' in data)) {
      // Legacy routes remain open; do not give old clears a second reward.
      const unlocked = Math.max(1, Math.min(8, Math.floor(Number.isFinite(legacyUnlockedFloor) ? legacyUnlockedFloor : 1)));
      if (unlocked > 1) {
        this.start();
        this.state.sealReturned = true;
        for (let floor = 1; floor < unlocked; floor++) {
          this.state.clearedFloors.push(floor);
          this.state.kills[floor] = FLOOR_STORIES[floor].killQuota;
          this.state.interactions.push(...FLOOR_STORIES[floor].stations.map((s) => s.id));
          this.state.rewardClaims.push(floorRewardId(floor));
        }
        this.state.interactions.push('f1-practice');
      }
      this.journey.deserialize(undefined, this.state.clearedFloors);
      return;
    }
    const raw = data as Partial<CampaignData>;
    this.state.started = raw.started === true;
    this.state.clearedFloors = Array.isArray(raw.clearedFloors)
      ? [...new Set(raw.clearedFloors.filter(validFloor))].sort((a, b) => a - b) : [];
    if (raw.kills && typeof raw.kills === 'object') {
      for (let floor = 1; floor <= 8; floor++) {
        const count = raw.kills[floor];
        if (typeof count === 'number' && Number.isFinite(count)) this.state.kills[floor] = Math.min(FLOOR_STORIES[floor].killQuota, Math.max(0, Math.floor(count)));
      }
    }
    this.state.interactions = Array.isArray(raw.interactions)
      ? [...new Set(raw.interactions.filter((id) => typeof id === 'string' && (STATION_FLOORS.has(id) || EXTRA_INTERACTIONS.includes(id))))] : [];
    this.state.started ||= this.state.clearedFloors.length > 0;
    this.state.sealReturned = raw.sealReturned === true && this.hasCleared(1);
    this.state.completed = raw.completed === true && this.hasCleared(8) && this.hasInteraction('f8-core');
    this.state.endingSeen = raw.endingSeen === true && this.state.completed;
    this.state.rewardClaims = Array.isArray(raw.rewardClaims)
      ? [...new Set(raw.rewardClaims.filter((id) => typeof id === 'string' && VALID_REWARDS.includes(id) && this.rewardAvailable(id)))] : [];
    this.journey.deserialize(raw.journey, this.state.clearedFloors);
  }
}
