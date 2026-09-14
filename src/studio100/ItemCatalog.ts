/** The catalogue is the shared source for shop cards, combat, and saved inventory. */
export const STARTER_WEAPONS = ['pen', 'ruler', 'cup'] as const;
export const SHOP_ITEM_IDS = [
  'book', 'gloves', 'bat', 'umbrella', 'drawingBoard', 'mechanicalPencil', 'scaleRuler',
  'paintbrush', 'stapler', 'eraser', 'tapeMeasure', 'tapeDispenser', 'waterBottle',
  'deskLamp', 'poster', 'tennisRacket', 'fryingPan', 'skateboard', 'backpack', 'calculator',
] as const;
export const WEAPON_IDS = [...STARTER_WEAPONS, ...SHOP_ITEM_IDS] as const;
export type Weapon = typeof WEAPON_IDS[number];
export type StarterWeapon = typeof STARTER_WEAPONS[number];
export type ShopItemId = typeof SHOP_ITEM_IDS[number];
export const ITEM_RANKS = ['Common', 'Uncommon', 'Rare', 'Epic'] as const;
export type ItemRank = typeof ITEM_RANKS[number];
export type ItemFamily = 'thrust' | 'swing' | 'bash' | 'punch' | 'projectile';
export type SkillKind = 'none' | 'slam' | 'flurry' | 'homeRun' | 'canopy' | 'brace' |
  'leadstorm' | 'extend' | 'paintwave' | 'stapleburst' | 'ricochet' | 'snapline' |
  'sticky' | 'splash' | 'flash' | 'rapidJab' | 'reflect' | 'clang' | 'slide' | 'swing' | 'keyburst';
export interface ItemDefinition {
  name: string;
  /** Seconds between basic attacks. A smaller value attacks faster. */
  speed: number;
  range: number;
  damage: number;
  description: string;
  price: number;
  rank: ItemRank;
  family: ItemFamily;
  tint: string;
  skill: SkillKind;
  skillName: string;
  skillDescription: string;
  skillCost: number;
  skillCooldown: number;
}
export const isWeapon = (value: unknown): value is Weapon =>
  typeof value === 'string' && (WEAPON_IDS as readonly string[]).includes(value);
export const isShopItem = (value: unknown): value is ShopItemId =>
  typeof value === 'string' && (SHOP_ITEM_IDS as readonly string[]).includes(value);

function item(name: string, price: number, damage: number, speed: number, range: number,
  family: ItemFamily, tint: string, description: string,
  skill: SkillKind = 'none', skillName = '', skillDescription = '', skillCost = 0, skillCooldown = 0): ItemDefinition {
  const rank: ItemRank = price >= 675 ? 'Epic' : price >= 315 ? 'Rare' : price >= 135 ? 'Uncommon' : 'Common';
  return { name, price, rank, damage, speed, range, family, tint, description, skill, skillName, skillDescription, skillCost, skillCooldown };
}

/** Legacy basics remain readable in older saves, but are not given away or sold. */
export const ITEMS: Record<Weapon, ItemDefinition> = {
  pen: item('Pen', 0, 10, .34, 2.1, 'thrust', '#6d968d', 'Fast · short melee'),
  ruler: item('Ruler', 0, 24, .86, 4.1, 'swing', '#e6b762', 'Slow · long melee'),
  cup: item('Cup', 0, 12, .58, 19, 'projectile', '#c77658', 'Medium · ranged'),
  book: item('Hardcover book', 60, 16, .58, 2.7, 'bash', '#668e79', 'A solid cover with a satisfying thump.',
    'slam', 'Book slam', 'Slam the book down for a close shockwave.', 10, 5),
  gloves: item('Knuckle gloves', 65, 8, .25, 1.8, 'punch', '#b86263', 'Quick punches with a short reach.',
    'flurry', 'Flurry', 'Deliver three quick punches in front of you.', 8, 4.5),
  bat: item('Baseball bat', 180, 25, .92, 4.4, 'swing', '#c99558', 'A heavy swing with plenty of reach.',
    'homeRun', 'Home run', 'A powerful swing that launches the instructor back.', 12, 6),
  umbrella: item('Umbrella', 180, 12, .5, 3.1, 'thrust', '#8686b3', 'A neat point for poking through a crowd.',
    'canopy', 'Open canopy', 'Open the canopy to soften incoming hits for a moment.', 9, 7),
  drawingBoard: item('Drawing board', 360, 20, .65, 2.6, 'bash', '#c4a77a', 'A portable shield that can also bash.',
    'brace', 'Board brace', 'Raise the board to reduce incoming damage for a moment.', 8, 6),
  mechanicalPencil: item('Mechanical pencil', 360, 11, .3, 19, 'projectile', '#6ba7ad', 'Click and fire tiny lead shots.',
    'leadstorm', 'Lead storm', 'Fire a short burst of three lead shots.', 10, 5),
  scaleRuler: item('Scale ruler', 450, 25, .62, 4.6, 'swing', '#d4d9c3', 'A long triangular ruler with a little extra reach.',
    'extend', 'Extend', 'Unfold an extending strike with extra reach.', 9, 5),
  paintbrush: item('Paintbrush', 180, 11, .44, 2.6, 'thrust', '#78a6ca', 'A quick brushstroke, close enough to leave a mark.',
    'paintwave', 'Paint wave', 'Send a broad wave of paint ahead.', 10, 5),
  stapler: item('Stapler', 180, 9, .42, 14, 'projectile', '#a86977', 'A compact launcher with a sharp click.',
    'stapleburst', 'Staple burst', 'Fire a quick burst of three staples.', 10, 5.5),
  eraser: item('Eraser', 75, 13, .52, 10, 'projectile', '#e29cab', 'A chunky eraser made for tossing.',
    'ricochet', 'Ricochet', 'Throw a larger eraser that rebounds from the walls.', 8, 5),
  tapeMeasure: item('Tape measure', 135, 15, .57, 3.4, 'thrust', '#d6b955', 'A steel tape that reaches past your fingertips.',
    'snapline', 'Snap line', 'Snap an extended tape line toward the instructor.', 10, 5),
  tapeDispenser: item('Tape dispenser', 225, 17, .67, 2.9, 'bash', '#91a79a', 'A sturdy desk weight with a sticky side.',
    'sticky', 'Sticky strike', 'A sticky strike that briefly slows the instructor.', 9, 6),
  waterBottle: item('Water bottle', 85, 11, .55, 15, 'projectile', '#78b9b7', 'A reusable bottle with a generous splash.',
    'splash', 'Big splash', 'Send a broad splash ahead to catch the instructor.', 9, 5),
  deskLamp: item('Desk lamp', 405, 21, .65, 3, 'bash', '#c4b674', 'A bright idea with a heavy base.',
    'flash', 'Bright flash', 'Flash a bright light to briefly stun the instructor.', 10, 6),
  poster: item('Rolled poster', 90, 9, .31, 2.7, 'thrust', '#d8c9ac', 'A light roll for fast, pointed jabs.',
    'rapidJab', 'Rapid jab', 'Deliver three quick jabs with the rolled poster.', 8, 4),
  tennisRacket: item('Tennis racket', 720, 26, .52, 4.4, 'swing', '#8ba9cb', 'A springy swing with a generous sweet spot.',
    'reflect', 'Return serve', 'Swing to reflect incoming thrown objects.', 10, 5.5),
  fryingPan: item('Frying pan', 225, 23, .84, 3.3, 'bash', '#89929d', 'A weighty kitchen classic with a loud finish.',
    'clang', 'Clang', 'A ringing hit that sends the instructor back.', 12, 6),
  skateboard: item('Skateboard', 810, 28, .58, 4, 'swing', '#8baa95', 'A wide deck for sweeping swings.',
    'slide', 'Deck slide', 'Dash forward with a low sliding strike.', 10, 5),
  backpack: item('Loaded backpack', 135, 16, .66, 3.2, 'swing', '#b48b6e', 'One semester of supplies in a swinging bag.',
    'swing', 'Bag swing', 'Swing a heavy bag in a wide arc.', 9, 5),
  calculator: item('Calculator', 225, 10, .36, 15, 'projectile', '#87969f', 'Rapid little shots, one key at a time.',
    'keyburst', 'Key burst', 'Fire a burst of three glowing keys.', 10, 5.5),
};
