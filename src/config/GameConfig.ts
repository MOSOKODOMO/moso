/**
 * GameConfig — world/stage layout and presentation settings.
 * Floor layouts for all 8 floors will live here (or per-floor files) in later phases;
 * Phase 1 defines only the prototype stage.
 */

export interface PlatformDef {
  x: number; // left edge (world units)
  y: number; // top surface height (world units)
  w: number; // width (world units)
}

export const GameConfig = {
  levelWidth: 64,
  /** Y of the ground top surface. Everything stands on y = 0. */
  groundY: 0,
  /** Thickness of the visible ground block below y = 0. */
  groundDepth: 3,
  /** World bounds margin so the player can't leave the stage. */
  minX: 1,
  playerSpawnX: 3,

  /** Floating platforms (jump height ~2.1 units, jump distance ~5.2 units). */
  platforms: [
    { x: 9, y: 1.6, w: 5 },
    { x: 18, y: 3.0, w: 4 },
    { x: 27, y: 1.8, w: 6 },
    { x: 39, y: 3.0, w: 5 },
    { x: 49, y: 1.8, w: 4 },
  ] as PlatformDef[],

  /** X positions where Phase 1 slimes spawn. */
  enemySpawns: [12, 24, 35, 46],

  // --- Camera ---
  cameraViewHeight: 10,
  cameraY: 3.1,
  cameraFollowSmoothing: 6,

  floorLabel: 'Floor 1 — Forgotten Meadow Ruins (Prototype)',
} as const;
