/**
 * StageSprites — Phase 2 canvas textures: NPCs, new monsters, dungeon gate,
 * floating labels, loot beams and equipment icons. Same procedural pipeline
 * as SpriteFactory (no external art files).
 */
import * as THREE from 'three';
import { ARMOR_COLORS, HERO_HAND, makePlayerBodyTexture, OUTLINE } from './SpriteFactory';

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

/** Mira shares the hero's rounded silhouette, with a teal cap and merchant satchel. */
export function makeMiraTexture(): THREE.CanvasTexture {
  const base = makePlayerBodyTexture(1, { armor: '#438c82', trim: '#edcd82' });
  const texture = makeCanvas(96, 128, (ctx) => {
    ctx.drawImage(base.image as HTMLCanvasElement, 0, 0);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    // Soft beret over the same large, round head as the adventurer.
    ctx.fillStyle = '#2e6b68';
    ctx.beginPath();
    ctx.ellipse(43, 22, 25, 12, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#66aa98';
    ctx.beginPath();
    ctx.ellipse(37, 17, 12, 4, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#edcd82';
    ctx.fillRect(26, 29, 40, 3);
    ctx.beginPath();
    ctx.arc(60, 25, 4, 0, Math.PI * 2);
    ctx.fill();
    // Shoulder strap and rounded leather bag.
    ctx.strokeStyle = '#68462f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(35, 62);
    ctx.lineTo(64, 85);
    ctx.stroke();
    ctx.fillStyle = '#a27349';
    ctx.beginPath();
    ctx.roundRect(59, 80, 18, 20, 4);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#edcd82';
    ctx.fillRect(61, 82, 14, 3);
    ctx.fillRect(66, 85, 4, 5);
    // Open greeting hand, without the hero's weapon grip.
    ctx.fillStyle = '#ffd9b3';
    ctx.beginPath();
    ctx.ellipse(HERO_HAND.x, HERO_HAND.y, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  base.dispose();
  return texture;
}

/** Cute mushroom monster: cream stem, red dotted cap, sleepy face. */
export function makeMushroomTexture(): THREE.CanvasTexture {
  return makeCanvas(96, 96, (ctx) => {
    // Stem
    ctx.fillStyle = '#f2e4c9';
    ctx.fillRect(34, 48, 28, 40);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(34, 78, 28, 10);
    // Cap
    ctx.fillStyle = '#d64545';
    ctx.beginPath();
    ctx.ellipse(48, 48, 40, 26, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(8, 46, 80, 8);
    // Dots
    ctx.fillStyle = '#fff';
    for (const [dx, dy, r] of [[28, 34, 7], [52, 26, 9], [70, 38, 6]] as Array<[number, number, number]>) {
      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Face
    ctx.fillStyle = '#22222e';
    ctx.fillRect(38, 60, 7, 10);
    ctx.fillRect(53, 60, 7, 10);
    ctx.fillStyle = '#7a2e2e';
    ctx.fillRect(44, 72, 10, 3);
    // Outline
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(48, 48, 40, 26, 0, Math.PI, 0);
    ctx.stroke();
    ctx.strokeRect(34, 48, 28, 40);
  });
}

/** Cave bat: dark wings + round body + fangs. Wing flap via scale in Enemy. */
export function makeBatTexture(): THREE.CanvasTexture {
  return makeCanvas(96, 64, (ctx) => {
    // Wings
    ctx.fillStyle = '#5b4a8a';
    ctx.beginPath();
    ctx.moveTo(48, 30);
    ctx.lineTo(6, 8);
    ctx.lineTo(14, 44);
    ctx.lineTo(30, 38);
    ctx.lineTo(34, 52);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(48, 30);
    ctx.lineTo(90, 8);
    ctx.lineTo(82, 44);
    ctx.lineTo(66, 38);
    ctx.lineTo(62, 52);
    ctx.closePath();
    ctx.fill();
    // Body
    ctx.fillStyle = '#3d3266';
    ctx.beginPath();
    ctx.ellipse(48, 36, 14, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ears
    ctx.fillStyle = '#3d3266';
    ctx.fillRect(36, 14, 8, 12);
    ctx.fillRect(52, 14, 8, 12);
    // Eyes + fangs
    ctx.fillStyle = '#ff5b5b';
    ctx.fillRect(41, 30, 6, 8);
    ctx.fillRect(51, 30, 6, 8);
    ctx.fillStyle = '#fff';
    ctx.fillRect(43, 44, 4, 6);
    ctx.fillRect(51, 44, 4, 6);
    // Outline
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(48, 36, 14, 16, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
}

/** Glowing blue dungeon portal (gate arch itself is built from boxes). */
export function makePortalTexture(): THREE.CanvasTexture {
  return makeCanvas(128, 192, (ctx, w, h) => {
    const grad = ctx.createRadialGradient(64, 110, 8, 64, 110, 80);
    grad.addColorStop(0, '#e8fbff');
    grad.addColorStop(0.35, '#6fd8ff');
    grad.addColorStop(0.7, '#2f6fe0');
    grad.addColorStop(1, 'rgba(20,30,80,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(64, 110, 52, 78, 0, 0, Math.PI * 2);
    ctx.fill();
    // Rune sparkles
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const [rx, ry] of [[48, 70], [78, 95], [58, 140], [74, 150]] as Array<[number, number]>) {
      ctx.fillRect(rx, ry, 4, 4);
    }
  });
}

/** Floating world-space label (NPC names, gate signs, drop names). */
export function makeLabelTexture(text: string, color = '#ffffff', fontPx = 30): THREE.CanvasTexture {
  const pad = 16;
  const measurer = document.createElement('canvas').getContext('2d');
  const font = `900 ${fontPx}px 'Trebuchet MS', Verdana, sans-serif`;
  measurer!.font = font;
  const tw = Math.ceil(measurer!.measureText(text).width);
  return makeCanvas(tw + pad * 2, fontPx + pad * 2, (ctx) => {
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = OUTLINE;
    ctx.strokeText(text, (tw + pad * 2) / 2, (fontPx + pad * 2) / 2);
    ctx.fillStyle = color;
    ctx.fillText(text, (tw + pad * 2) / 2, (fontPx + pad * 2) / 2);
  });
}

/** Vertical light beam for legendary / relic drops (tinted via color). */
export function makeBeamTexture(): THREE.CanvasTexture {
  return makeCanvas(32, 256, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.85)');
    grad.addColorStop(1, 'rgba(255,255,255,0.9)');
    ctx.fillStyle = grad;
    ctx.fillRect(8, 0, w - 16, h);
  });
}

/** Soft round glow (rarity ground ring tinted via material color). */
export function makeGlowDiscTexture(): THREE.CanvasTexture {
  return makeCanvas(64, 64, (ctx) => {
    const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  });
}

function tierColor(tier: number): string {
  return ARMOR_COLORS[Math.min(8, Math.max(1, Math.round(tier))) - 1];
}

/** Leather, iron and crystal chest pieces match the hero's material progression. */
export function makeArmorIcon(tier: number): THREE.CanvasTexture {
  const level = Math.min(8, Math.max(1, Math.round(tier)));
  const armor = tierColor(level);
  const trim = ['#ddbe88', '#ca9c64', '#e3bd72', '#dce8ee', '#bad0df', '#e8ca79', '#d7f4ff', '#f1ffff'][level - 1];
  return makeCanvas(64, 64, (ctx) => {
    const shape = (points: Array<[number, number]>, color: string, outline = true): void => {
      ctx.beginPath();
      points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      if (outline) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke(); }
    };
    const line = (points: Array<[number, number]>, color: string, width = 2): void => {
      ctx.beginPath();
      points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    };
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (level <= 3) {
      // A scooped vest, crossed straps, then layered shoulder and skirt guards.
      if (level === 3) {
        shape([[12, 17], [18, 11], [25, 16], [22, 29], [7, 27]], armor);
        shape([[52, 17], [46, 11], [39, 16], [42, 29], [57, 27]], armor);
        for (const x of [18, 28, 38]) shape([[x, 44], [x + 9, 44], [x + 10, 57], [x - 1, 55]], armor);
        line([[11, 23], [20, 24]], trim);
        line([[44, 24], [53, 23]], trim);
      }
      shape([[19, 12], [25, 11], [27, 19], [37, 19], [39, 11], [45, 12], [45, 28], [43, 46], [21, 46], [19, 28]], armor);
      shape([[22, 25], [29, 23], [29, 42], [22, 42]], '#ffffff16', false);
      line([[32, 23], [32, 42]], trim, 1.5);
      line([[23, 18], [23, 39]], '#dfb385', 1.5);
      if (level >= 2) {
        line([[24, 15], [41, 38]], '#4b3023', 7);
        line([[24, 15], [41, 38]], trim, 2);
        shape([[29, 25], [35, 24], [39, 29], [34, 33]], trim);
      }
      if (level === 3) {
        for (const x of [24, 40]) for (const y of [32, 39]) {
          ctx.fillStyle = trim; ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
        }
        shape([[29, 34], [35, 34], [34, 40], [30, 40]], '#9baebb');
      }
      shape([[20, 43], [44, 43], [44, 49], [20, 49]], '#55392a');
      shape([[29, 44], [35, 44], [35, 49], [29, 49]], trim);
    } else if (level <= 6) {
      // Each iron tier adds articulated plates; T6 retains iron with gold edges.
      shape([[14, 15], [22, 11], [25, 23], [21, 30], [7, 27], [8, 19]], armor);
      shape([[50, 15], [42, 11], [39, 23], [43, 30], [57, 27], [56, 19]], armor);
      for (const x of [19, 29, 39]) shape([[x, 42], [x + 8, 42], [x + 8, 56], [x - 1, 54]], armor);
      shape([[22, 12], [27, 16], [37, 16], [42, 12], [47, 25], [43, 47], [21, 47], [17, 25]], armor);
      shape([[22, 22], [30, 21], [30, 42], [23, 41]], '#ffffff35', false);
      shape([[36, 22], [42, 21], [39, 42], [34, 43]], '#34495b45', false);
      line([[23, 20], [32, 23], [41, 20]], trim, 3);
      line([[22, 45], [42, 45]], '#465263', 4);
      if (level >= 5) {
        line([[20, 32], [32, 35], [44, 32]], trim, 2.5);
        line([[20, 39], [32, 42], [44, 39]], '#53697c');
        line([[10, 23], [20, 25]], trim, 2.5);
        line([[44, 25], [54, 23]], trim, 2.5);
        shape([[32, 24], [37, 29], [32, 34], [27, 29]], '#92b9d7');
      }
      if (level === 6) {
        line([[21, 17], [21, 27], [24, 40]], trim, 2.5);
        line([[43, 17], [43, 27], [40, 40]], trim, 2.5);
        line([[10, 20], [15, 17], [20, 18]], trim, 3);
        line([[44, 18], [49, 17], [54, 20]], trim, 3);
        line([[22, 48], [42, 48]], trim, 3);
        shape([[32, 24], [38, 31], [32, 38], [26, 31]], '#bfeaf3');
        line([[32, 27], [32, 34]], '#f1ffff', 2);
      }
    } else {
      // Faceted crystal armor replaces the old flat crimson/violet shirts.
      shape([[8, 15], [19, 10], [25, 21], [17, 31], [4, 26]], armor);
      shape([[56, 15], [45, 10], [39, 21], [47, 31], [60, 26]], armor);
      for (const x of [20, 32, 44]) shape([[x, 41], [x + 6, 48], [x, 59], [x - 6, 48]], armor);
      shape([[22, 14], [27, 19], [37, 19], [42, 14], [48, 28], [42, 46], [32, 52], [22, 46], [16, 28]], armor);
      shape([[32, 20], [44, 29], [32, 46], [20, 29]], '#b8e4f3');
      shape([[32, 20], [32, 46], [20, 29]], '#efffff', false);
      shape([[32, 20], [44, 29], [32, 31]], '#75b3d9', false);
      line([[20, 29], [32, 31], [44, 29]], '#5485a5', 1.5);
      line([[10, 17], [17, 26], [21, 20]], trim);
      line([[54, 17], [47, 26], [43, 20]], trim);
      if (level === 8) {
        shape([[10, 25], [9, 5], [21, 16], [20, 27]], '#e8ffff');
        shape([[54, 25], [55, 5], [43, 16], [44, 27]], '#e8ffff');
        shape([[32, 21], [38, 31], [32, 43], [26, 31]], '#ffffff');
        line([[32, 23], [32, 40]], '#a8dcec', 1.5);
        line([[7, 7], [7, 13]], '#ffffff');
        line([[4, 10], [10, 10]], '#ffffff');
        line([[57, 39], [57, 47]], '#ffffff');
        line([[53, 43], [61, 43]], '#ffffff');
      }
    }
  });
}

/** Simple shoes, leather boots and progressively detailed iron greaves. */
export function makeBootsIcon(tier: number): THREE.CanvasTexture {
  const level = Math.min(8, Math.max(0, Math.round(tier)));
  const material = ['#8c6342', '#807f79', '#906343', '#68442e', '#9baebb', '#7791aa', '#8b9eae', '#b4d6e6', '#d0ecf3'][level];
  return makeCanvas(64, 64, (ctx) => {
    const shape = (points: Array<[number, number]>, color: string, outline = true): void => {
      ctx.beginPath();
      points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath(); ctx.fillStyle = color; ctx.fill();
      if (outline) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke(); }
    };
    const line = (x1: number, y1: number, x2: number, y2: number, color: string, width = 2): void => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (level === 0) {
      // The empty-slot base footwear is a sandal, never an equipped boot.
      shape([[13, 40], [31, 36], [50, 40], [54, 46], [48, 51], [14, 51]], '#a97b50');
      shape([[17, 35], [28, 32], [34, 38], [46, 38], [50, 43], [46, 46], [17, 46]], '#ffdcbd');
      line(22, 37, 28, 47, material, 5);
      line(34, 39, 39, 47, material, 5);
      return;
    }
    if (level === 1) {
      shape([[15, 33], [24, 28], [32, 34], [38, 39], [49, 40], [54, 46], [51, 51], [14, 51], [11, 45]], material);
      line(15, 48, 50, 48, '#e7dfc9', 3);
      line(27, 36, 34, 35, '#e7dfc9');
      line(31, 40, 38, 39, '#e7dfc9');
      line(16, 36, 19, 42, '#ffffff45');
      return;
    }
    const cuffY = level >= 5 ? 9 : level === 3 ? 13 : 16;
    shape([[17, cuffY], [37, cuffY], [35, 34], [41, 40], [49, 40], [55, 47], [51, 54], [15, 54], [12, 48], [17, 38]], material);
    shape([[19, cuffY + 5], [24, cuffY + 5], [23, 39], [17, 46]], '#ffffff2b', false);
    line(16, 51, 51, 51, '#394452', 4);
    if (level <= 3) {
      line(18, cuffY + 4, 35, cuffY + 4, '#c89960', 4);
      line(29, cuffY + 9, 29, 35, '#4f3025', 2.5);
      for (const y of [cuffY + 10, cuffY + 16]) line(25, y, 32, y + 2, '#ddbe88', 2);
      if (level === 3) {
        line(18, 30, 35, 30, '#493126', 5);
        shape([[24, 27], [31, 27], [31, 33], [24, 33]], '#e3bd72');
      }
      line(37, 43, 47, 45, '#c89960', 2);
    } else {
      const trim = level === 6 ? '#e8ca79' : level >= 7 ? '#e8ffff' : '#dce8ee';
      line(19, cuffY + 4, 35, cuffY + 4, trim, 3);
      shape([[22, cuffY + 8], [32, cuffY + 8], [31, 35], [23, 39], [20, 31]], level >= 7 ? '#bfe5f1' : '#bdcfdb');
      line(25, cuffY + 10, 25, 31, '#f1ffff', 2);
      line(33, 43, 48, 45, trim, 3);
      if (level >= 5) {
        line(18, 35, 34, 36, '#465669', 3);
        line(34, 40, 32, 49, '#50667a', 2);
        line(42, 43, 40, 50, '#50667a', 2);
      }
      if (level === 6) {
        line(19, 18, 18, 30, trim, 2.5);
        line(35, 18, 34, 30, trim, 2.5);
        line(17, 49, 51, 49, trim, 2);
      }
      if (level >= 7) {
        shape([[27, level === 8 ? 10 : 16], [34, 25], [27, 36], [20, 25]], level === 8 ? '#ffffff' : '#9bcae6');
        line(27, 17, 27, 32, '#e8ffff', 2);
        if (level === 8) {
          shape([[14, 15], [18, 5], [24, 15]], '#e8ffff');
          shape([[29, 15], [35, 5], [40, 15]], '#c6ebf4');
          line(49, 22, 49, 30, '#ffffff');
          line(45, 26, 53, 26, '#ffffff');
        }
      }
    }
  });
}

/** Ring icon (gold for high tiers, copper for low). */
export function makeAccessoryIcon(tier: number): THREE.CanvasTexture {
  const gem = tier >= 5 ? '#ffd75e' : tier >= 3 ? '#6fb7ff' : '#e08a4e';
  return makeCanvas(64, 64, (ctx) => {
    ctx.strokeStyle = tier >= 5 ? '#ffd75e' : '#c98f4e';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(32, 36, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = gem;
    ctx.beginPath();
    ctx.moveTo(32, 8);
    ctx.lineTo(42, 20);
    ctx.lineTo(32, 28);
    ctx.lineTo(22, 20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

/** Green battle tonic flask. */
export function makeTonicTexture(): THREE.CanvasTexture {
  return makeCanvas(48, 64, (ctx) => {
    ctx.fillStyle = '#8a5a3b';
    ctx.fillRect(19, 2, 10, 10);
    ctx.fillStyle = '#d8d8e8';
    ctx.fillRect(17, 12, 14, 8);
    ctx.fillStyle = 'rgba(216,216,232,0.95)';
    ctx.beginPath();
    ctx.arc(24, 40, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#57e6c9';
    ctx.beginPath();
    ctx.arc(24, 42, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d8fff4';
    ctx.beginPath();
    ctx.arc(19, 37, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(24, 40, 19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(17, 12, 14, 8);
  });
}

/** Blue-grey return stone with a glowing rune. */
export function makeReturnStoneTexture(): THREE.CanvasTexture {
  return makeCanvas(48, 64, (ctx) => {
    ctx.fillStyle = '#8d88a3';
    ctx.beginPath();
    ctx.ellipse(24, 34, 17, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6fd8ff';
    ctx.fillRect(20, 20, 8, 26);
    ctx.fillRect(14, 28, 20, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(14, 16, 6, 12);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(24, 34, 17, 22, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
}

/** Orange speed tonic flask (same silhouette as battle tonic, warm brew). */
export function makeSpeedTonicTexture(): THREE.CanvasTexture {
  return makeCanvas(48, 64, (ctx) => {
    ctx.fillStyle = '#8a5a3b';
    ctx.fillRect(19, 2, 10, 10);
    ctx.fillStyle = '#d8d8e8';
    ctx.fillRect(17, 12, 14, 8);
    ctx.fillStyle = 'rgba(216,216,232,0.95)';
    ctx.beginPath();
    ctx.arc(24, 40, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath();
    ctx.arc(24, 42, 14, 0, Math.PI * 2);
    ctx.fill();
    // Motion streaks for "speed"
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(10, 34, 8, 3);
    ctx.fillRect(8, 42, 10, 3);
    ctx.fillRect(11, 50, 7, 3);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(24, 40, 19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(17, 12, 14, 8);
  });
}

/** Camp meal: wooden bowl with steaming stew. */
export function makeCampMealTexture(): THREE.CanvasTexture {
  return makeCanvas(48, 64, (ctx) => {
    // Steam wisps
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillRect(18, 4, 4, 10);
    ctx.fillRect(27, 2, 4, 12);
    // Bowl
    ctx.fillStyle = '#8a5a3b';
    ctx.beginPath();
    ctx.ellipse(24, 40, 19, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    // Stew surface
    ctx.fillStyle = '#c96b2e';
    ctx.beginPath();
    ctx.ellipse(24, 36, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Chunks + shine
    ctx.fillStyle = '#7ee081';
    ctx.fillRect(17, 33, 5, 4);
    ctx.fillRect(27, 37, 5, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(20, 31, 6, 3);
    // Feet
    ctx.fillStyle = '#5d3d27';
    ctx.fillRect(12, 50, 6, 8);
    ctx.fillRect(30, 50, 6, 8);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(24, 40, 19, 13, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
}

/** Iron shard: jagged grey crystal cluster. */
export function makeIronShardTexture(): THREE.CanvasTexture {
  return makeCanvas(48, 64, (ctx) => {
    ctx.fillStyle = '#9aa7b5';
    ctx.beginPath();
    ctx.moveTo(24, 4);
    ctx.lineTo(36, 30);
    ctx.lineTo(30, 58);
    ctx.lineTo(18, 58);
    ctx.lineTo(12, 30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#cfd8e3';
    ctx.beginPath();
    ctx.moveTo(24, 4);
    ctx.lineTo(29, 30);
    ctx.lineTo(24, 58);
    ctx.lineTo(18, 30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6b7686';
    ctx.beginPath();
    ctx.moveTo(36, 34);
    ctx.lineTo(44, 48);
    ctx.lineTo(38, 58);
    ctx.lineTo(30, 52);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(24, 4);
    ctx.lineTo(36, 30);
    ctx.lineTo(30, 58);
    ctx.lineTo(18, 58);
    ctx.lineTo(12, 30);
    ctx.closePath();
    ctx.stroke();
  });
}

/** Forge powder: tied pouch with ember glow. */
export function makeForgePowderTexture(): THREE.CanvasTexture {
  return makeCanvas(48, 64, (ctx) => {
    // Pouch body
    ctx.fillStyle = '#7a5a3b';
    ctx.beginPath();
    ctx.ellipse(24, 40, 16, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cinched top + tie
    ctx.fillStyle = '#5d3d27';
    ctx.fillRect(17, 16, 14, 10);
    ctx.fillStyle = '#ffd75e';
    ctx.fillRect(15, 24, 18, 4);
    // Ember rune glow
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath();
    ctx.moveTo(24, 32);
    ctx.lineTo(30, 42);
    ctx.lineTo(24, 52);
    ctx.lineTo(18, 42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(22, 38, 4, 8);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(24, 40, 16, 17, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
}
