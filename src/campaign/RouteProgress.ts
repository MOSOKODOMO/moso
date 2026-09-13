import { ROUTES, type RouteRoom } from './CampaignRoutes';

export interface RouteData { version: 1; defeated: string[]; completed: string[]; inspected?: string[] }
export const ROOM_WIDTH = 82;
const FLOOR1_ROOM_WIDTH = 8;
const FLOOR1_ROUTE_START = 12;
export const routeRoomWidth = (floor: number): number => floor === 1 ? FLOOR1_ROOM_WIDTH : ROOM_WIDTH;
export const routeStart = (floor: number): number => floor === 1 ? FLOOR1_ROUTE_START : 8;
export const roomStart = (floor: number, index: number): number => routeStart(floor) + index * routeRoomWidth(floor);
export function enemyToken(room: RouteRoom, wave: number, index: number): string { return `${room.id}:${wave}:${index}`; }
export function roomTokens(room: RouteRoom): string[] { return room.waves.flatMap((wave, w) => wave.map((_, i) => enemyToken(room, w, i))); }

/** Checkpoints record individual encounter members so a reload never repeats a clear/reward. */
export class RouteProgress {
  readonly defeated = new Set<string>();
  readonly completed = new Set<string>();
  readonly inspected = new Set<string>();
  constructor(data?: unknown, clearedFloors: number[] = []) { this.deserialize(data, clearedFloors); }
  active(floor: number): RouteRoom | undefined { return ROUTES[floor]?.find(room => !this.completed.has(room.id)); }
  ready(room: RouteRoom): boolean { return roomTokens(room).every(token => this.defeated.has(token)); }
  inspect(room: RouteRoom, index: number): boolean {
    const token = `${room.id}-note-${index}`;
    if (![0, 1].includes(index) || this.inspected.has(token)) return false;
    this.inspected.add(token); return true;
  }
  record(token: string): boolean {
    const room = Object.values(ROUTES).flat().find(r => roomTokens(r).includes(token));
    if (!room || this.defeated.has(token) || this.completed.has(room.id)) return false;
    this.defeated.add(token); return true;
  }
  complete(room: RouteRoom): boolean {
    if (!this.ready(room) || this.completed.has(room.id)) return false;
    this.completed.add(room.id); return true;
  }
  serialize(): RouteData { return { version: 1, defeated: [...this.defeated], completed: [...this.completed], inspected: [...this.inspected] }; }
  deserialize(raw?: unknown, clearedFloors: number[] = []): void {
    this.defeated.clear(); this.completed.clear(); this.inspected.clear();
    const data = raw && typeof raw === 'object' ? raw as Partial<RouteData> : {};
    const valid = new Set(Object.values(ROUTES).flatMap(rooms => rooms.flatMap(roomTokens)));
    if (Array.isArray(data.defeated)) for (const token of data.defeated) if (valid.has(token)) this.defeated.add(token);
    const validNotes = new Set(Object.values(ROUTES).flatMap(rooms => rooms.flatMap(room => [0, 1].map(i => `${room.id}-note-${i}`))));
    if (Array.isArray(data.inspected)) for (const token of data.inspected) if (validNotes.has(token)) this.inspected.add(token);
    for (const [floor, rooms] of Object.entries(ROUTES)) {
      for (const room of rooms) {
        if (clearedFloors.includes(Number(floor)) || (Array.isArray(data.completed) && data.completed.includes(room.id) && roomTokens(room).every(token => this.defeated.has(token)))) {
          this.completed.add(room.id); for (const token of roomTokens(room)) this.defeated.add(token);
          for (const i of [0, 1]) this.inspected.add(`${room.id}-note-${i}`);
        }
      }
    }
  }
}
