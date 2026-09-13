/**
 * SpriteFactory — procedural placeholder sprites (canvas-generated textures).
 * No external art files needed for Phase 1.
 *
 * IMPORTANT for the equipment-visual rule: every appearance function already
 * takes a tier (1-8). Higher tiers change colors/shapes TODAY (placeholder),
 * and later phases swap these builders for real art without touching
 * PlayerAppearance or game logic.
 */
import * as THREE from 'three';

/** Equipped armor materials: leather I–III, iron I–III, crystal, diamond. */
export const ARMOR_COLORS = [
  '#ab7952', '#875538', '#68442e',
  '#9baebb', '#7791aa', '#8b9eae',
  '#9bcae6', '#d0ecf3',
];

/** Sword blade gradient per tier: T1 Rusty → T8 Abyss. */
export const WEAPON_COLORS = [
  '#8a6a4a', // 1 Rusty
  '#9aa7b5', // 2 Iron
  '#cfd8e3', // 3 Steel
  '#7fb2e5', // 4 Knight
  '#57e6c9', // 5 Magic (teal glow)
  '#7bed6f', // 6 Runic (green glow)
  '#ffd75e', // 7 Royal (gold)
  '#b14aed', // 8 Abyss (violet)
];

/** Signature dark outline for the storybook pixel-art look. */
export const OUTLINE = '#262633';

function strokeRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  width = 3,
): void {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = width;
  ctx.strokeRect(x + width / 2, y + width / 2, w - width, h - width);
}

function makeCanvas(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  ctx.clearRect(0, 0, w, h);
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

function tierIndex(tier: number): number {
  return Math.min(8, Math.max(1, Math.round(tier))) - 1;
}

/** Trim/accent color per armor tier (belts, edges, emblems). */
export const TRIM_COLORS = [
  '#ddbe88', '#ca9c64', '#e3bd72',
  '#dce8ee', '#bad0df', '#e8ca79',
  '#d7f4ff', '#f1ffff',
];

/** Shared canvas sizes and world-plane layout for the hero and character preview. */
export const HERO_LAYOUT = {
  body: { canvasWidth: 96, canvasHeight: 128, width: 1.15, height: 1.55 },
  helmet: { canvasWidth: 96, canvasHeight: 48, width: 1.05, height: 0.62, x: 0.02, y: 1.32 },
  weapon: { canvasWidth: 128, canvasHeight: 48, width: 1.6, height: 0.6 },
} as const;

/** Body-canvas pixel at the center of the drawn gripping hand. */
export const HERO_HAND = { x: 73, y: 51 };
/** Weapon-canvas pixel of the grip point (= world pivot). */
export const SWORD_GRIP = { x: 64, y: 24 };
/** Blade texture points right; a quarter turn holds it straight up. */
export const SWORD_IDLE_ANGLE = Math.PI / 2;
/** Body pixels use down-positive Y; world coordinates use up-positive Y. */
export const HERO_HAND_POSITION = {
  x: (HERO_HAND.x / HERO_LAYOUT.body.canvasWidth - 0.5) * HERO_LAYOUT.body.width,
  y: (1 - HERO_HAND.y / HERO_LAYOUT.body.canvasHeight) * HERO_LAYOUT.body.height,
};
/** Plane center relative to the grip, including any transparent texture padding. */
export const SWORD_CENTER = {
  x: (0.5 - SWORD_GRIP.x / HERO_LAYOUT.weapon.canvasWidth) * HERO_LAYOUT.weapon.width,
  y: (SWORD_GRIP.y / HERO_LAYOUT.weapon.canvasHeight - 0.5) * HERO_LAYOUT.weapon.height,
};

/**
 * Side-view adventurer hero (head + torso + arms + legs).
 * The front hand lands exactly on HERO_HAND so the sword grip connects.
 * Armor tier changes materials, pauldrons, trim and silhouette extras.
 */
export function makePlayerBodyTexture(
  armorTier: number,
  palette: { armor?: string; trim?: string } = {},
  bootsTier = 0,
): THREE.CanvasTexture {
  const tier = Math.max(0, Math.min(8, Math.round(armorTier)));
  const boots = Math.max(0, Math.min(8, Math.round(bootsTier)));
  const armor = palette.armor ?? ARMOR_COLORS[tierIndex(tier)];
  const trim = palette.trim ?? TRIM_COLORS[tierIndex(tier)];
  const skin = '#ffdcbd';
  const skinShade = '#dba47f';
  const hair = '#69452e';
  return makeCanvas(HERO_LAYOUT.body.canvasWidth, HERO_LAYOUT.body.canvasHeight, (ctx) => {
    const rounded = (x: number, y: number, w: number, h: number, radius: number, color: string, outline = false): void => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.fill();
      if (outline) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke(); }
    };
    const line = (x1: number, y1: number, x2: number, y2: number, color: string, width = 2): void => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    };
    const diamond = (x: number, y: number, w: number, h: number, color: string): void => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(x, y - h / 2); ctx.lineTo(x + w / 2, y);
      ctx.lineTo(x, y + h / 2); ctx.lineTo(x - w / 2, y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#416382'; ctx.lineWidth = 1.5; ctx.stroke();
      line(x, y - h / 2 + 2, x, y + h / 2 - 2, '#e3ffff', 1.5);
    };

    // The unequipped base is a small tank top, shorts and visible bare legs.
    rounded(31, 91, 13, 30, 5, skinShade, true);
    rounded(49, 91, 13, 30, 5, skin, true);
    rounded(28, 85, 38, 19, 5, '#66708c', true);
    line(46, 91, 46, 103, '#394259', 2.5);
    rounded(24, 65, 11, 25, 5, skinShade, true);
    rounded(29, 61, 36, 30, 9, '#efebe0', true);
    rounded(36, 57, 20, 10, 4, skinShade);
    // A scooped neckline and narrow shoulder straps make the tank top readable.
    rounded(37, 60, 18, 9, 5, skin);
    line(34, 63, 34, 84, '#ffffff', 2);
    line(59, 69, 59, 86, '#c8c6bd', 2);

    // Armor covers the base only when the corresponding real slot is equipped.
    if (tier > 0 && tier <= 3) {
      // Leather I: sleeveless vest; II: cross straps; III: layered shoulders/fauld.
      rounded(30, 63, 34, 29, 5, armor, true);
      rounded(39, 61, 15, 8, 4, '#efebe0');
      line(46, 70, 46, 88, trim, 2);
      line(33, 69, 33, 87, '#e0b586', 1.5);
      if (tier >= 2) {
        line(34, 65, 60, 85, '#503826', 5);
        line(35, 65, 60, 84, trim, 1.5);
        rounded(42, 75, 7, 6, 1, '#dcb66a', true);
      }
      if (tier === 3) {
        rounded(24, 62, 13, 11, 4, armor, true);
        rounded(56, 61, 16, 12, 4, armor, true);
        line(27, 65, 35, 65, trim);
        line(59, 64, 68, 64, trim);
        for (const x of [32, 43, 54]) rounded(x, 90, 11, 9, 2, armor, true);
        for (const x of [34, 59]) for (const y of [73, 82]) rounded(x, y, 2.5, 2.5, 1, '#e3bd72');
        rounded(50, 76, 10, 9, 2, '#afb9ba', true);
        line(52, 78, 57, 78, '#e6eceb', 1.5);
      }
    } else if (tier >= 4 && tier <= 6) {
      // Iron I: fitted chest plate; II: layered plates; III: gold-trimmed armor.
      rounded(29, 62, 36, 32, 7, armor, true);
      line(33, 67, 58, 67, '#e9f0f3', 3);
      line(34, 70, 34, 88, '#bfcfdb', 2);
      line(58, 71, 58, 89, '#657686', 4);
      rounded(23, 61, 15, 13, 5, armor, true);
      rounded(56, 60, 18, 14, 5, armor, true);
      for (const x of [33, 45, 57]) rounded(x, 91, 9, 9, 2, armor, true);
      if (tier >= 5) {
        line(32, 77, 60, 77, trim, 3);
        line(32, 86, 60, 86, '#53697c', 2);
        rounded(25, 72, 10, 10, 3, armor, true);
        line(59, 65, 70, 65, trim, 2);
        diamond(46, 74, 7, 9, '#92b9d7');
      }
      if (tier === 6) {
        line(32, 64, 61, 64, '#efd58f', 3);
        line(31, 88, 62, 88, '#d8b766', 3);
        line(27, 65, 34, 65, '#efd58f', 3);
        line(59, 65, 70, 65, '#efd58f', 3);
        diamond(46, 75, 9, 12, '#bfeaf3');
      }
    } else if (tier >= 7) {
      // Crystal and diamond: faceted silhouettes, independent of item rarity.
      rounded(29, 62, 36, 32, 5, armor, true);
      diamond(46, 78, 29, 31, armor);
      diamond(29, 65, tier === 8 ? 23 : 17, tier === 8 ? 20 : 14, '#b8dfea');
      diamond(65, 64, tier === 8 ? 27 : 19, tier === 8 ? 22 : 16, '#d1edf4');
      for (const x of [34, 46, 58]) diamond(x, 96, 12, 15, armor);
      if (tier === 8) {
        diamond(33, 60, 9, 22, '#e8ffff');
        diamond(66, 59, 10, 25, '#e8ffff');
        diamond(46, 75, 10, 16, '#ffffff');
      }
    }
    if (tier > 0) {
      rounded(29, 87, 36, 7, 2, tier <= 3 ? '#55392a' : '#465263', true);
      rounded(43, 88, 7, 6, 1, tier === 6 ? '#f4d98c' : trim, true);
    }

    // Boots have their own tier. Removing chest armor never removes footwear.
    const drawFoot = (x: number, y: number, back: boolean): void => {
      const shade = back ? '#384453' : '#506174';
      if (boots === 0) {
        rounded(x, y + 4, 19, 8, 3, back ? skinShade : skin, true);
        line(x + 2, y + 11, x + 17, y + 11, '#67513d', 3);
        line(x + 5, y + 5, x + 10, y + 11, '#8c6342', 3);
      } else if (boots === 1) {
        rounded(x, y + 3, 20, 11, 4, '#807f79', true);
        line(x + 2, y + 12, x + 18, y + 12, '#e7dfc9', 2);
        line(x + 7, y + 6, x + 12, y + 6, '#f6ecd6');
      } else if (boots <= 3) {
        const leather = boots === 3 ? '#68442e' : '#906343';
        rounded(x + 2, y - 3, 13, 15, 3, back ? '#63482f' : leather, true);
        rounded(x, y + 5, 21, 10, 3, back ? '#624633' : leather, true);
        line(x + 3, y, x + 13, y, '#c89960', 2);
        if (boots === 3) rounded(x + 4, y + 1, 7, 4, 1, '#cbbb86', true);
      } else {
        const metal = ARMOR_COLORS[tierIndex(boots)];
        rounded(x + 2, y - 5, 14, 17, 3, back ? shade : metal, true);
        rounded(x, y + 5, 22, 10, 3, metal, true);
        line(x + 4, y - 2, x + 13, y - 2, boots === 6 ? '#e7ce87' : '#ddebf4', 2);
        line(x + 3, y + 8, x + 18, y + 8, '#e4f4f7', 2);
        if (boots >= 7) diamond(x + 10, y + 2, 9, boots === 8 ? 16 : 11, '#cdeefa');
      }
    };
    drawFoot(27, 109, true);
    drawFoot(47, 109, false);

    // Large soft head, rounded fringe and cheek: same original chibi language.
    rounded(23, 20, 42, 42, 17, '#463124', true);
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.ellipse(47, 41, 23, 21, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#ffffff30';
    ctx.beginPath(); ctx.ellipse(40, 33, 10, 7, -.2, 0, Math.PI * 2); ctx.fill();
    rounded(25, 20, 40, 14, 8, hair);
    rounded(24, 25, 10, 23, 6, hair);
    ctx.fillStyle = hair;
    ctx.beginPath(); ctx.moveTo(37, 29); ctx.quadraticCurveTo(48, 42, 52, 29);
    ctx.quadraticCurveTo(58, 39, 63, 29); ctx.closePath(); ctx.fill();
    rounded(52, 37, 12, 14, 5, '#fff');
    rounded(57, 39, 7, 11, 3, '#2b2934');
    rounded(58, 40, 3, 3, 1, '#fff');
    line(53, 34, 62, 34, '#563922', 2);
    rounded(46, 50, 10, 5, 2.5, '#f1a5a0');
    line(59, 54, 65, 53, '#a96659', 1.7);
    rounded(64, 45, 5, 5, 2, skinShade);

    // Bare bent forearm remains visible with early sleeveless armor.
    rounded(61, 59, 10, 15, 4, tier >= 4 ? armor : skin, true);
    rounded(66, 51, 8, 13, 4, skin, true);
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.ellipse(HERO_HAND.x, HERO_HAND.y, 6, 6.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
    line(HERO_HAND.x - 2, HERO_HAND.y - 2, HERO_HAND.x - 2, HERO_HAND.y + 3, skinShade, 2);
  });
}

/**
 * Headgear overlay — separate layer so armor upgrades change the head.
 * Footprint matches the 1.05 x 0.62 world plane at y 1.32 (overlaps head top).
 */
export function makeHelmetTexture(armorTier: number): THREE.CanvasTexture {
  const armor = ARMOR_COLORS[tierIndex(armorTier)];
  const trim = TRIM_COLORS[tierIndex(armorTier)];
  const tier = Math.max(0, Math.min(8, Math.round(armorTier)));
  return makeCanvas(HERO_LAYOUT.helmet.canvasWidth, HERO_LAYOUT.helmet.canvasHeight, (ctx) => {
    if (tier === 0) return; // No separate hat slot: unequipped armor leaves hair visible.
    const outline = (): void => { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke(); };
    if (tier <= 3) {
      // Soft leather band, stitched cap, then a cap with a reinforced brow.
      if (tier >= 2) {
        ctx.fillStyle = armor;
        ctx.beginPath(); ctx.ellipse(47, 25, 28, 12, 0, Math.PI, 0); ctx.lineTo(75, 30); ctx.lineTo(19, 30); ctx.closePath(); ctx.fill(); outline();
        ctx.strokeStyle = trim; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.ellipse(47, 25, 23, 8, 0, Math.PI, 0); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.fillStyle = armor;
      ctx.beginPath(); ctx.roundRect(19, 29, 57, 7, 2); ctx.fill(); outline();
      ctx.fillStyle = trim; ctx.fillRect(22, 30, 50, 1.5);
      if (tier === 3) { ctx.fillStyle = '#e3bd72'; for (const x of [26, 38, 59, 70]) ctx.fillRect(x, 32, 2, 2); }
    } else if (tier <= 6) {
      ctx.fillStyle = armor;
      ctx.beginPath(); ctx.ellipse(47, 27, 29, 15, 0, Math.PI, 0); ctx.lineTo(76, 32); ctx.lineTo(18, 32); ctx.closePath(); ctx.fill(); outline();
      ctx.fillStyle = '#dce8ee'; ctx.fillRect(28, 17, 4, 11);
      ctx.fillStyle = trim; ctx.beginPath(); ctx.roundRect(16, 30, 63, 6, 2); ctx.fill(); outline();
      if (tier >= 5) {
        ctx.fillStyle = '#617d96'; ctx.fillRect(46, 12, 4, 18);
        ctx.fillStyle = trim; ctx.fillRect(46, 14, 2, 15);
      }
      if (tier === 6) {
        ctx.fillStyle = '#e8ca79'; ctx.fillRect(20, 31, 56, 3);
        ctx.beginPath(); ctx.moveTo(43, 29); ctx.lineTo(47, 23); ctx.lineTo(52, 29); ctx.lineTo(47, 35); ctx.closePath(); ctx.fill(); outline();
      }
    } else {
      // Faceted crystal circlet; highest tier has a taller central diamond.
      ctx.fillStyle = armor; ctx.beginPath(); ctx.roundRect(18, 29, 60, 7, 2); ctx.fill(); outline();
      for (const [x, height] of [[29, 17], [48, tier === 8 ? 29 : 23], [67, 17]]) {
        ctx.fillStyle = tier === 8 ? '#e3fbff' : '#b6def0';
        ctx.beginPath(); ctx.moveTo(x, 31 - height); ctx.lineTo(x + 6, 27); ctx.lineTo(x, 35); ctx.lineTo(x - 6, 27); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#547895'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x, 33); ctx.lineTo(x, 34 - height); ctx.stroke();
      }
    }
  });
}

/** Tight enhancement layers use the same pixels/attachment as the equipment. */
export const SWORD_ENHANCEMENT_LAYOUT = { width: 2, height: 1 };
export function enhancementStrength(level: number): number {
  return Math.max(0, Math.min(10, Number.isFinite(level) ? level : 0)) / 10;
}

export function makeSwordEnhancementTexture(): THREE.CanvasTexture {
  // Sixteen pixels of padding preserve the grip at the new canvas center.
  return makeCanvas(160, 80, (ctx) => {
    ctx.translate(16, 16);
    ctx.beginPath();
    ctx.moveTo(85, 20); ctx.lineTo(118, 20); ctx.lineTo(118, 18);
    ctx.lineTo(128, 24); ctx.lineTo(118, 30); ctx.lineTo(118, 28);
    ctx.lineTo(85, 28); ctx.closePath();
    ctx.shadowColor = '#ffd269'; ctx.shadowBlur = 5;
    ctx.strokeStyle = '#ffd987'; ctx.lineWidth = 2; ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#fff0b5'; ctx.lineWidth = .8; ctx.stroke();
  });
}

export function makeArmorEnhancementTexture(armorTier: number): THREE.CanvasTexture {
  return makeCanvas(HERO_LAYOUT.body.canvasWidth, HERO_LAYOUT.body.canvasHeight, (ctx) => {
    if (armorTier <= 0) return;
    ctx.strokeStyle = '#ffe1a0'; ctx.lineWidth = 1.4;
    ctx.shadowColor = '#ffdda0'; ctx.shadowBlur = 2;
    ctx.beginPath(); ctx.moveTo(31, 68); ctx.lineTo(31, 87);
    ctx.moveTo(63, 70); ctx.lineTo(63, 87); ctx.moveTo(34, 90); ctx.lineTo(60, 90);
    if (armorTier >= 4) { ctx.moveTo(25, 65); ctx.lineTo(35, 64); ctx.moveTo(60, 63); ctx.lineTo(71, 66); }
    ctx.stroke();
  });
}

export function makeEnhancementSparkleTexture(): THREE.CanvasTexture {
  return makeCanvas(16, 16, (ctx) => {
    ctx.fillStyle = '#ffe29c';
    ctx.beginPath(); ctx.moveTo(8, 1); ctx.lineTo(9.5, 6.5); ctx.lineTo(15, 8);
    ctx.lineTo(9.5, 9.5); ctx.lineTo(8, 15); ctx.lineTo(6.5, 9.5);
    ctx.lineTo(1, 8); ctx.lineTo(6.5, 6.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff9df'; ctx.fillRect(7, 7, 2, 2);
  });
}

/**
 * Side-view sword with the GRIP at the canvas pivot (64, 24).
 * The pivot sits in the hero's hand, so rotation reads as a real swing.
 * Compact sidearm (~0.45 world units of blade). Style evolves with tier.
 */
export function makeWeaponTexture(weaponTier: number): THREE.CanvasTexture {
  const blade = WEAPON_COLORS[tierIndex(weaponTier)];
  const tier = tierIndex(weaponTier);
  return makeCanvas(HERO_LAYOUT.weapon.canvasWidth, HERO_LAYOUT.weapon.canvasHeight, (ctx) => {
    // Material tier controls steel and ornament. Enhancement is a separate layer.
    // Pommel
    ctx.fillStyle = tier >= 4 ? '#ffd75e' : '#6b6b7d';
    ctx.beginPath();
    ctx.arc(49, 24, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Handle (passes under the gripping hand)
    ctx.fillStyle = '#4a2f1d';
    ctx.fillRect(52, 21, 28, 7);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(55, 21, 2, 7);
    ctx.fillRect(60, 21, 2, 7);
    ctx.fillRect(64, 21, 2, 7);
    ctx.fillRect(69, 21, 2, 7);
    ctx.fillRect(74, 21, 2, 7);
    // Guard
    ctx.fillStyle = tier >= 4 ? '#ffd75e' : '#8d88a3';
    ctx.fillRect(78, 13, 7, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(78, 13, 7, 4);
    // Blade
    ctx.fillStyle = blade;
    ctx.fillRect(85, 20, 33, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillRect(85, 20, 33, 2.5);
    // Tier accents
    if (tier === 0) {
      ctx.fillStyle = '#6b4a2f'; // rust spots
      ctx.fillRect(92, 22, 4, 4);
      ctx.fillRect(104, 23, 5, 3);
    } else if (tier === 3) {
      ctx.fillStyle = 'rgba(111,183,255,0.7)'; // phantom chill edge
      ctx.fillRect(85, 26, 33, 2);
    } else if (tier === 4) {
      ctx.fillStyle = '#ffd75e'; // warden gem
      ctx.fillRect(80, 22, 3, 4);
    } else if (tier === 5) {
      ctx.fillStyle = '#ff6b3c'; // ember edge
      ctx.fillRect(85, 26, 33, 2);
    } else if (tier >= 6) {
      ctx.fillStyle = tier >= 7 ? '#b14aed' : '#ffd75e';
      ctx.fillRect(86, 22, 4, 4);
    }
    // Tip
    ctx.beginPath();
    ctx.moveTo(118, 18);
    ctx.lineTo(128, 24);
    ctx.lineTo(118, 30);
    ctx.closePath();
    ctx.fillStyle = blade;
    ctx.fill();
    // Outlines
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(52, 21, 28, 7);
    ctx.strokeRect(78, 13, 7, 22);
    ctx.strokeRect(85, 20, 33, 8);
  });
}

/** Cute slime placeholder. `elite` tints it for later reuse. */
export function makeSlimeTexture(elite = false): THREE.CanvasTexture {
  return makeCanvas(96, 80, (ctx) => {
    const body = elite ? '#b14aed' : '#5ad66f';
    const dark = elite ? '#7d2fb0' : '#3aa84f';
    // Blob body
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(48, 52, 36, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    // Shiny highlight
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(34, 40, 10, 7, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // Bottom shade
    ctx.fillStyle = dark;
    ctx.fillRect(16, 62, 64, 8);
    // Eyes
    ctx.fillStyle = '#22222e';
    ctx.fillRect(34, 44, 8, 12);
    ctx.fillRect(54, 44, 8, 12);
    ctx.fillStyle = '#fff';
    ctx.fillRect(36, 44, 3, 4);
    ctx.fillRect(56, 44, 3, 4);
    // Mouth (happy)
    ctx.fillStyle = '#2b6b35';
    ctx.fillRect(42, 60, 12, 4);
    // Dark outline around the blob
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(48, 52, 36, 26, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
}

/** White-yellow slash arc shown briefly on attack. */
export function makeSlashTexture(): THREE.CanvasTexture {
  return makeCanvas(128, 128, (ctx) => {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(64, 64, 44, -0.9, 0.9);
    ctx.stroke();
    ctx.strokeStyle = '#ffd75e';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(64, 64, 44, -0.9, 0.9);
    ctx.stroke();
  });
}

/** Repeating silhouette tile for a parallax layer. `variant` picks the theme. */
export function makeParallaxTileTexture(
  variant: 'hills' | 'trees' | 'ruins',
  color: string,
): THREE.CanvasTexture {
  const tex = makeCanvas(512, 256, (ctx) => {
    ctx.fillStyle = color;
    if (variant === 'hills') {
      ctx.beginPath();
      ctx.moveTo(0, 256);
      ctx.quadraticCurveTo(128, 90, 256, 200);
      ctx.quadraticCurveTo(384, 280, 512, 150);
      ctx.lineTo(512, 256);
      ctx.closePath();
      ctx.fill();
    } else if (variant === 'trees') {
      // Bushy round canopies + trunks, tileable-ish spacing
      const drawTree = (x: number, r: number, trunkH: number) => {
        ctx.fillStyle = '#8a5a3b';
        ctx.fillRect(x - 8, 256 - trunkH, 16, trunkH);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, 256 - trunkH - r + 14, r, 0, Math.PI * 2);
        ctx.fill();
      };
      drawTree(90, 62, 70);
      drawTree(260, 84, 90);
      drawTree(430, 58, 64);
    } else {
      // Meadow-ruin columns & arch, spaced to tile
      const drawColumn = (x: number, h: number) => {
        ctx.fillRect(x - 18, 256 - h, 36, h);
        ctx.fillRect(x - 26, 256 - h - 12, 52, 12);
      };
      drawColumn(80, 150);
      drawColumn(430, 150);
      ctx.fillRect(62, 82, 386, 22); // broken arch beam
      ctx.fillRect(220, 130, 70, 60); // fallen block
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/** Vertical sky gradient (stretched over the whole view). */
export function makeSkyTexture(top: string, bottom: string): THREE.CanvasTexture {
  return makeCanvas(4, 256, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

/* ------------------------------------------------------------------ */
/* Environment textures — storybook pixel style (dark mortar, outlines) */
/* ------------------------------------------------------------------ */

/** Light stone bricks with dark mortar for ground faces and platforms. */
export function makeBrickTexture(): THREE.CanvasTexture {
  const tex = makeCanvas(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#4a4458'; // mortar
    ctx.fillRect(0, 0, w, h);
    const bh = 32;
    const bw = 64;
    for (let row = 0; row < h / bh; row += 1) {
      const offset = row % 2 === 0 ? 0 : -bw / 2;
      for (let x = offset; x < w; x += bw) {
        const even = (row + Math.round(x / bw)) % 2 === 0;
        ctx.fillStyle = even ? '#b9b3c7' : '#a29cb5';
        ctx.fillRect(x + 2, row * bh + 2, bw - 4, bh - 4);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x + 2, row * bh + 2, bw - 4, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(x + 2, (row + 1) * bh - 6, bw - 4, 4);
      }
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Vertical wooden planks with dark seams for hut walls and posts. */
export function makeWoodTexture(): THREE.CanvasTexture {
  const tex = makeCanvas(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#7a5236';
    ctx.fillRect(0, 0, w, h);
    const pw = 32;
    for (let x = 0; x < w; x += pw) {
      if (x / pw % 2 === 1) {
        ctx.fillStyle = '#6b452c';
        ctx.fillRect(x, 0, pw, h);
      }
      // Grain streaks
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x + 7, 8, 2, h - 16);
      ctx.fillRect(x + 20, 20, 2, h - 40);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x + 2, 0, 2, h);
      // Plank seams
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(x, 0, 3, h);
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Overlapping clay roof tiles with dark outlines, like the reference hut. */
export function makeRoofTexture(): THREE.CanvasTexture {
  const tex = makeCanvas(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#5d3d27';
    ctx.fillRect(0, 0, w, h);
    const tw = 32;
    const rh = 32;
    for (let row = 0; row < h / rh; row += 1) {
      for (let col = 0; col < w / tw; col += 1) {
        const x = col * tw;
        const y = row * rh;
        const base = (row + col) % 2 === 0 ? '#c98f4e' : '#b5773f';
        ctx.fillStyle = base;
        ctx.beginPath();
        ctx.moveTo(x + 1, y + rh);
        ctx.lineTo(x + 1, y + 10);
        ctx.arc(x + tw / 2, y + 10, tw / 2 - 1, Math.PI, 0);
        ctx.lineTo(x + tw - 1, y + rh);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 2;
        ctx.stroke();
        // Tile highlight
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(x + 5, y + 12, 5, rh - 14);
      }
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Grass strip with tufts and a dark top edge for ground/platform lips. */
export function makeGrassTopTexture(): THREE.CanvasTexture {
  const tex = makeCanvas(128, 32, (ctx, w, h) => {
    ctx.fillStyle = '#62c370';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3e8e5a';
    ctx.fillRect(0, h - 8, w, 8);
    // Tufts (deterministic pattern so the tile repeats cleanly)
    for (let x = 4; x < w; x += 16) {
      const tall = 8 + ((x * 7) % 8);
      ctx.fillStyle = '#2e6b34';
      ctx.beginPath();
      ctx.moveTo(x - 5, 6);
      ctx.lineTo(x - 1, 6 - tall);
      ctx.lineTo(x + 3, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#8fe388';
      ctx.beginPath();
      ctx.moveTo(x + 1, 6);
      ctx.lineTo(x + 4, 6 - tall + 3);
      ctx.lineTo(x + 7, 6);
      ctx.closePath();
      ctx.fill();
    }
    // Dark outline along the top edge
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(0, 0, w, 3);
  });
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

function drawLeafCluster(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
): void {
  const blobs: Array<[number, number, number, string]> = [
    [0, 0, r, '#2e6b34'],
    [0, 0, r - 4, '#55a04e'],
    [-r * 0.3, -r * 0.3, r * 0.45, '#93d67e'],
    [r * 0.35, r * 0.25, r * 0.3, '#4e9b47'],
  ];
  for (const [ox, oy, br, color] of blobs) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx + ox, cy + oy, Math.max(2, br), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Tileable overhanging-leaf canopy (transparent gaps show the sky). */
export function makeLeafTileTexture(): THREE.CanvasTexture {
  return makeCanvas(256, 256, (ctx) => {
    for (let i = 0; i < 16; i += 1) {
      const cx = (i * 53 + 20) % 256;
      const cy = (i * 97 + 30) % 190;
      const r = 22 + ((i * 13) % 20);
      // Draw wrapped copies so the tile repeats without hard seams.
      for (const wx of [-256, 0, 256]) {
        drawLeafCluster(ctx, cx + wx, cy, r);
      }
    }
    // A couple of hanging vines
    ctx.strokeStyle = '#2e6b34';
    ctx.lineWidth = 4;
    for (const vx of [70, 190]) {
      ctx.beginPath();
      ctx.moveTo(vx, 150);
      ctx.lineTo(vx, 220);
      ctx.stroke();
      drawLeafCluster(ctx, vx, 228, 12);
    }
  });
}

/** Single leafy bush (transparent background). */
export function makeBushTexture(): THREE.CanvasTexture {
  return makeCanvas(128, 96, (ctx) => {
    drawLeafCluster(ctx, 30, 62, 26);
    drawLeafCluster(ctx, 64, 52, 32);
    drawLeafCluster(ctx, 98, 64, 24);
    drawLeafCluster(ctx, 48, 74, 22);
    drawLeafCluster(ctx, 82, 76, 20);
  });
}

/** Small wooden barrel for hut decoration. */
export function makeBarrelTexture(): THREE.CanvasTexture {
  return makeCanvas(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#8a5a3b';
    ctx.fillRect(6, 4, w - 12, h - 8);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let x = 14; x < w - 6; x += 10) ctx.fillRect(x, 4, 2, h - 8);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(10, 4, 5, h - 8);
    // Metal bands
    ctx.fillStyle = '#3a3a4a';
    ctx.fillRect(6, 12, w - 12, 7);
    ctx.fillRect(6, h - 19, w - 12, 7);
    strokeRect(ctx, 6, 4, w - 12, h - 8, 3);
  });
}

/** Wooden lattice window with a dark interior. */
export function makeWindowTexture(): THREE.CanvasTexture {
  return makeCanvas(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#1c1c2e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7a5236';
    ctx.fillRect(26, 4, 6, h - 8);
    ctx.fillRect(4, 26, w - 8, 6);
    ctx.fillRect(4, 48, w - 8, 4);
    strokeRect(ctx, 0, 0, w, h, 4);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(26, 4, 6, h - 8);
    ctx.strokeRect(4, 26, w - 8, 6);
  });
}

/** HP/MP potion flask pickup. */
export function makePotionTexture(kind: 'hp' | 'mp'): THREE.CanvasTexture {
  const liquid = kind === 'hp' ? '#e04848' : '#4e7de0';
  const light = kind === 'hp' ? '#ff9d9d' : '#9ecbff';
  return makeCanvas(48, 64, (ctx) => {
    // Cork + neck
    ctx.fillStyle = '#8a5a3b';
    ctx.fillRect(19, 2, 10, 10);
    ctx.fillStyle = '#d8d8e8';
    ctx.fillRect(17, 12, 14, 8);
    // Round flask body
    ctx.fillStyle = 'rgba(216,216,232,0.95)';
    ctx.beginPath();
    ctx.arc(24, 40, 19, 0, Math.PI * 2);
    ctx.fill();
    // Liquid + shine
    ctx.fillStyle = liquid;
    ctx.beginPath();
    ctx.arc(24, 42, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(19, 37, 5, 0, Math.PI * 2);
    ctx.fill();
    // Outline
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(24, 40, 19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(17, 12, 14, 8);
  });
}

/** Glowing magic bolt projectile. */
export function makeBoltTexture(): THREE.CanvasTexture {
  return makeCanvas(48, 32, (ctx) => {
    ctx.fillStyle = 'rgba(87,230,201,0.35)';
    ctx.beginPath();
    ctx.ellipse(24, 16, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#57e6c9';
    ctx.beginPath();
    ctx.ellipse(24, 16, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(24, 16, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(24, 16, 14, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
}

/** Relic gem pickup, colored per stat. */
export function makeRelicTexture(color: string): THREE.CanvasTexture {
  return makeCanvas(48, 64, (ctx) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(24, 4);
    ctx.lineTo(42, 24);
    ctx.lineTo(24, 60);
    ctx.lineTo(6, 24);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.moveTo(24, 10);
    ctx.lineTo(34, 24);
    ctx.lineTo(24, 44);
    ctx.lineTo(14, 24);
    ctx.closePath();
    ctx.fill();
  });
}

/** Soft radial glow dot (tinted via material color) for particles. */
export function makeGlowTexture(): THREE.CanvasTexture {
  return makeCanvas(32, 32, (ctx) => {
    const grad = ctx.createRadialGradient(16, 16, 2, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
  });
}

/** Shockwave ring (tinted via material color). */
export function makeRingTexture(): THREE.CanvasTexture {
  return makeCanvas(128, 128, (ctx) => {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(64, 64, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(64, 64, 42, 0, Math.PI * 2);
    ctx.stroke();
  });
}
