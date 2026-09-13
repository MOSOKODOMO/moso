/** Nine connected campaign areas. Every map has continuous, safe footing. */
import type { MonsterId } from '../config/EnemyConfig';
import { ROUTES } from '../campaign/CampaignRoutes';
import { ROOM_WIDTH, routeRoomWidth, roomStart, routeStart } from '../campaign/RouteProgress';
export type FloorNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type MapId = 'outpost' | `floor${FloorNumber}`;
export type MapTheme = 'meadow' | 'ruins' | 'crypt' | 'blood' | 'library' | 'fortress' | 'ember' | 'kingdom' | 'abyss';
export interface PlatformDef { x: number; y: number; w: number }
export interface EnemySpawn { type: MonsterId; x: number; passive?: boolean }
export interface ZoneDef { name: string; x0: number; x1: number }
export interface StationDef { id: string; x: number; y?: number; label: string }
export interface MapDef {
  id: MapId; label: string; theme: MapTheme; floorNumber: number;
  width: number; spawnX: number; platforms: PlatformDef[]; enemies: EnemySpawn[]; safe: boolean;
  hutX?: number; merchantX?: number;
  /** Back gate (or the dungeon entrance in town). */
  gateX?: number; nextGateX?: number; boss?: MonsterId; bossX?: number;
  stations?: StationDef[]; zones?: ZoneDef[];
}
const platforms = (...rows: Array<[number, number, number]>): PlatformDef[] => rows.map(([x, y, w]) => ({ x, y, w }));
const enemies = (...rows: Array<[MonsterId, number]>): EnemySpawn[] => rows.map(([type, x]) => ({ type, x }));
const zones = (width: number, names: [string, string, string]): ZoneDef[] => names.map((name, i) => ({ name, x0: width * i / 3, x1: width * (i + 1) / 3 }));
export const MAPS: Record<MapId, MapDef> = {
  outpost: {
    id: 'outpost', label: 'Meadow Outpost', theme: 'meadow', floorNumber: 0,
    width: 32, spawnX: 3, safe: true, hutX: 18, merchantX: 13.5, gateX: 28.5,
    platforms: platforms([4.5, 1.6, 4], [9.5, 2.9, 3.5], [23, 1.7, 3.5]),
    enemies: enemies(['trainingDummy', 7]),
  },
  floor1: {
    id: 'floor1', label: 'Floor 1 — Sunlit Practice Yard', theme: 'ruins', floorNumber: 1,
    width: 64, spawnX: 3, safe: true, gateX: 3.5, nextGateX: 61, boss: 'giantSlime', bossX: 55,
    platforms: platforms([10, 1.6, 5], [19, 3, 4], [28, 1.8, 5], [36, 3, 4], [48, 1.8, 5]),
    enemies: enemies(['slime', 12], ['slime', 16], ['mushroom', 24], ['slime', 30], ['bat', 36], ['mushroom', 42], ['bat', 47]),
    stations: [{ id: 'f1-fragment', x: 44, label: 'Faded crystal' }],
    zones: zones(64, ['Peaceful Ruins', 'Practice Glade', 'Ancient Insignia']),
  },
  floor2: {
    id: 'floor2', label: 'Floor 2 — Bone Crypt', theme: 'crypt', floorNumber: 2,
    width: 68, spawnX: 3, safe: false, gateX: 3.5, nextGateX: 65, boss: 'boneCaptain', bossX: 58,
    platforms: platforms([12, 1.5, 5], [20, 2.8, 5], [35, 1.6, 5], [43, 2.8, 4]),
    enemies: enemies(['skeleton', 15], ['skeleton', 25], ['bat', 35], ['skeleton', 45]),
    stations: [{ id: 'f2-orders', x: 39, label: 'Last orders' }],
    zones: zones(68, ['Quiet Ossuary', 'Watchful Soldiers', 'Captain’s Rest']),
  },
  floor3: {
    id: 'floor3', label: 'Floor 3 — Blood Cavern', theme: 'blood', floorNumber: 3,
    width: 72, spawnX: 3, safe: false, gateX: 3.5, nextGateX: 69, boss: 'bloodFang', bossX: 61,
    platforms: platforms([10, 1.6, 5], [17, 3, 5], [28, 1.7, 5], [36, 3.2, 5], [46, 1.6, 6]),
    enemies: enemies(['fang', 13], ['bat', 21], ['fang', 30], ['bat', 37], ['fang', 45], ['bat', 50]),
    stations: [{ id: 'f3-conduit', x: 43, label: 'Crimson conduit' }],
    zones: zones(72, ['Redstone Grotto', 'High Roost', 'Fang Hollow']),
  },
  floor4: {
    id: 'floor4', label: 'Floor 4 — Haunted Library', theme: 'library', floorNumber: 4,
    width: 76, spawnX: 3, safe: false, gateX: 3.5, nextGateX: 73, boss: 'phantomScholar', bossX: 65,
    platforms: platforms([11, 1.6, 5], [19, 3, 6], [32, 1.7, 5], [40, 3, 5], [51, 1.7, 5]),
    enemies: enemies(['ghost', 14], ['mage', 24], ['ghost', 33], ['mage', 42], ['ghost', 51]),
    stations: [{ id: 'f4-journal', x: 30, label: 'Royal journal' }, { id: 'f4-lens', x: 53, label: 'Memory lens' }],
    zones: zones(76, ['Whispering Shelves', 'Forbidden Study', 'Scholar’s Archive']),
  },
  floor5: {
    id: 'floor5', label: 'Floor 5 — Iron Fortress', theme: 'fortress', floorNumber: 5,
    width: 80, spawnX: 3, safe: false, gateX: 3.5, nextGateX: 77, boss: 'ironWarden', bossX: 68,
    platforms: platforms([13, 1.6, 5], [21, 2.9, 5], [37, 1.7, 6], [46, 3, 6]),
    enemies: enemies(['armored', 15], ['skeleton', 25], ['armored', 36], ['mage', 46], ['armored', 55]),
    stations: [{ id: 'f5-forge', x: 32, label: 'Abandoned forge' }, { id: 'f5-relay', x: 57, label: 'Energy relay' }],
    zones: zones(80, ['Forge Approach', 'Guarded Foundry', 'Warden’s Hall']),
  },
  floor6: {
    id: 'floor6', label: 'Floor 6 — Burning Depths', theme: 'ember', floorNumber: 6,
    width: 84, spawnX: 3, safe: false, gateX: 3.5, nextGateX: 81, boss: 'emberBeast', bossX: 72,
    platforms: platforms([13, 1.5, 5], [26, 1.7, 6], [40, 1.7, 6], [56, 1.7, 6]),
    enemies: enemies(['flame', 15], ['armored', 23], ['flame', 35], ['flame', 49], ['mage', 64]),
    stations: [{ id: 'f6-furnace-a', x: 35, label: 'West furnace' }, { id: 'f6-furnace-b', x: 63, label: 'East furnace' }],
    zones: zones(84, ['Cooling Ducts', 'Flame Vents', 'Ember Crucible']),
  },
  floor7: {
    id: 'floor7', label: 'Floor 7 — Fallen Kingdom', theme: 'kingdom', floorNumber: 7,
    width: 88, spawnX: 3, safe: false, gateX: 3.5, nextGateX: 85, boss: 'fallenKing', bossX: 75,
    platforms: platforms([12, 1.7, 5], [20, 3, 5], [36, 1.7, 6], [45, 3, 5], [60, 1.7, 5]),
    enemies: enemies(['armored', 15], ['ghost', 26], ['mage', 36], ['armored', 47], ['ghost', 58]),
    stations: [{ id: 'f7-oath', x: 53, label: 'King’s memorial' }],
    zones: zones(88, ['Silent Court', 'Lost Oath', 'Throne of Shadows']),
  },
  floor8: {
    id: 'floor8', label: 'Floor 8 — Abyss Gate', theme: 'abyss', floorNumber: 8,
    width: 96, spawnX: 3, safe: false, gateX: 3.5, nextGateX: 92, boss: 'abyssLord', bossX: 82,
    platforms: platforms([12, 1.6, 5], [20, 3, 5], [36, 1.7, 6], [45, 3, 5], [66, 1.7, 6]),
    enemies: enemies(['ghost', 15], ['armored', 25], ['mage', 37], ['flame', 46]),
    stations: [{ id: 'f8-ward', x: 43, label: 'Final ward' }, { id: 'f8-core', x: 90, label: 'Corrupted core' }],
    zones: zones(96, ['Last Ascent', 'Guardian’s Threshold', 'Heart of the Abyss']),
  },
};
export function shopTierForFloor(unlockedFloor: number): number { return Math.min(8, Math.max(1, unlockedFloor)); }

// Each floor is a sequence of authored encounter chambers, with continuous ground
// and optional raised approaches. The opening meadow remains available for farming.
for (let floor = 1; floor <= 8; floor++) {
  const map = MAPS[`floor${floor}` as MapId];
  const rooms = ROUTES[floor];
  const roomWidth = routeRoomWidth(floor);
  const tailPadding = floor === 8 ? 86 : 40;
  const roomScale = roomWidth / ROOM_WIDTH;
  map.width = routeStart(floor) + rooms.length * roomWidth + tailPadding;
  map.bossX = map.width - 22;
  map.nextGateX = map.width - 7;
  map.enemies = floor === 1 ? map.enemies : [];
  map.platforms = floor === 1 ? map.platforms : [];
  for (let index = 0; index < rooms.length; index++) {
    const x = roomStart(floor, index);
    // Alternating lower and upper approaches: basic jumps reach every platform.
    map.platforms.push(...platforms(
      [x + 12 * roomScale, 1.6, Math.max(2.4, 6 * roomScale)],
      [x + 22 * roomScale, 3, Math.max(2.4, 6 * roomScale)],
      [x + 39 * roomScale, 1.7, Math.max(2.4, 7 * roomScale)],
      [x + 50 * roomScale, 3.1, Math.max(2.4, 6 * roomScale)],
      [x + 65 * roomScale, 1.6, Math.max(2.4, 6 * roomScale)],
    ));
  }
  const story = map.stations ?? [];
  story.forEach((station, index) => {
    station.x = station.id === 'f8-core' ? map.width - 10
      : roomStart(floor, Math.min(rooms.length - 1, Math.floor((index + 1) * rooms.length / (story.length + 1)))) + roomWidth * (7 / ROOM_WIDTH);
  });
  map.stations = [...story, ...rooms.map((room, index) => ({ id: room.id, x: roomStart(floor, index) + roomWidth * (75 / ROOM_WIDTH), label: `Beacon: ${room.title}` }))];
  map.zones = rooms.map((room, index) => ({ name: room.title, x0: roomStart(floor, index), x1: roomStart(floor, index) + roomWidth }));
}
