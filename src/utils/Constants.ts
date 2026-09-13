/** Render-layer (z depth) constants for the 2D side-view scene.
 *  Camera looks down -Z; larger z = closer to viewer. */

export const Z_LAYERS = {
  sky: -30,
  farHills: -22,
  midTrees: -15,
  backRuins: -10,
  stage: -5,
  ground: -4,
  enemy: 0,
  player: 1,
  weapon: 2,
  effect: 3,
  foreground: 5,
} as const;

/** Flat cute-fantasy palette (tweak freely, no logic depends on these). */
export const Palette = {
  skyTop: '#7ec8f7',
  skyBottom: '#dff6ff',
  hillFar: '#9fd49a',
  hillNear: '#6fb86f',
  treeDark: '#3e8e5a',
  trunk: '#8a5a3b',
  ruinStone: '#b8b3c7',
  ruinDark: '#8d88a3',
  soil: '#7a5236',
  soilDark: '#5d3d27',
  grass: '#62c370',
  grassLight: '#8fe388',
  platform: '#a08bc0',
  platformTop: '#c9b8ec',
} as const;
