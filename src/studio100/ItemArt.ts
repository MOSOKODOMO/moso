import type { Weapon } from './StudioState';

/** Native handle positions shared by inventory art and the character's fingers. */
export interface ItemGrip {
  x: number; y: number; scale: number; angle: number; attackAngle: number;
  iconX: number; iconY: number; iconScale: number; iconAngle: number;
  family: 'thrust' | 'swing' | 'bash' | 'punch' | 'projectile';
  flip?: boolean;
}
const grip = (x: number, y: number, scale: number, angle: number, attackAngle: number,
  iconX = 0, iconY = 0, iconScale = .76, iconAngle = .28,
  family: ItemGrip['family'] = 'swing', flip = false): ItemGrip =>
  ({ x, y, scale, angle, attackAngle, iconX, iconY, iconScale, iconAngle, family, flip });

const GRIPS: Record<Weapon, ItemGrip> = {
  pen: grip(0, -43, .32, -1.12, -1.45, 0, -6, .72, .65, 'thrust'),
  ruler: grip(0, 48, .265, .88, 1.55, 1, -2, .63, .65),
  cup: grip(24, 1, .29, -.06, -.2, 6, -12, .92, 0, 'projectile', true),
  book: grip(-27, 15, .36, .1, -.4, 0, -1, .91, -.12, 'bash'),
  gloves: grip(0, 15, .28, 0, 0, 0, -1, 1.08, -.2, 'punch'),
  bat: grip(0, 35, .31, .54, 1.4, 0, -7, .7, .53),
  umbrella: grip(0, 32, .32, .2, .85, 0, -5, .76, .1),
  drawingBoard: grip(-29, 12, .37, -.05, -.36, 0, 0, .81, -.1, 'bash'),
  mechanicalPencil: grip(0, 23, .36, -1.12, -1.48, 0, -3, .72, .57, 'projectile'),
  scaleRuler: grip(0, 41, .285, .62, 1.4, 0, -4, .65, .55, 'thrust'),
  paintbrush: grip(0, 30, .34, .6, 1.32, 0, -6, .73, .55),
  stapler: grip(-24, 1, .4, -.06, -.28, 0, 1, .98, -.2, 'bash'),
  eraser: grip(-21, 6, .43, -.2, -.4, 0, 0, 1.12, -.36, 'projectile'),
  tapeMeasure: grip(-20, 4, .34, -.1, -.18, 9, -2, .9, -.14, 'thrust'),
  tapeDispenser: grip(-18, 9, .36, -.04, -.2, 0, 0, .99, -.15, 'projectile'),
  waterBottle: grip(-13, 4, .36, .08, -.35, 0, -2, .92, -.15, 'projectile'),
  deskLamp: grip(0, 22, .36, .1, .4, 0, -5, .85, -.06),
  poster: grip(0, 25, .36, .6, 1.34, 6, -1, .78, .4),
  tennisRacket: grip(0, 40, .29, .48, 1.35, 0, -3, .64, .4),
  fryingPan: grip(0, 35, .33, .65, 1.42, 0, -5, .72, .45),
  skateboard: grip(-14, 24, .33, .23, 1.15, 0, 0, .68, .4),
  backpack: grip(0, -34, .37, -.1, -.4, 0, 0, .91, -.12, 'bash'),
  calculator: grip(-20, 8, .38, -.08, -.26, 0, 0, .94, -.18, 'projectile'),
};
export function itemGrip(kind: Weapon | string): ItemGrip { return GRIPS[kind as Weapon] ?? GRIPS.pen; }

const INK = '#37353a';
const shapes = new Map<string, Path2D>();
function shape(d: string): Path2D { let p = shapes.get(d); if (!p) { p = new Path2D(d); shapes.set(d, p); } return p; }

/** Warm, outlined miniatures. All item views use these same shapes and materials. */
export function paintItem(c: CanvasRenderingContext2D, kind: Weapon | string, x: number, y: number, scale = 1): void {
  c.save(); c.translate(x, y); c.scale(scale, scale); c.lineCap = 'round'; c.lineJoin = 'round';
  const line = (d: string, colour = INK, width = 2.5) => { c.strokeStyle = colour; c.lineWidth = width; c.stroke(shape(d)); };
  const path = (d: string, fill: string | CanvasGradient, stroke = INK, width = 2.8) => {
    c.fillStyle = fill; c.fill(shape(d)); if (width) line(d, stroke, width);
  };
  const box = (a: number, b: number, w: number, h: number, r: number, fill: string | CanvasGradient, stroke = INK, width = 2.8) => {
    c.beginPath(); c.roundRect(a, b, w, h, r); c.fillStyle = fill; c.fill();
    if (width) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  };
  const oval = (a: number, b: number, rx: number, ry: number, fill: string | CanvasGradient, stroke = INK, width = 2.8) => {
    c.beginPath(); c.ellipse(a, b, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
    if (width) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  };
  const grad = (top: number, bottom: number, light: string, dark: string) => {
    const g = c.createLinearGradient(-14, top, 19, bottom); g.addColorStop(0, light); g.addColorStop(1, dark); return g;
  };
  const paper = '#f7ebcc', gold = '#e1b66d', metal = '#bcc8c4';
  switch (kind) {
    case 'pen':
      box(-6, -55, 13, 86, 4, grad(-55, 31, '#a6c5b7', '#547e7b'));
      box(-7, -60, 15, 16, 3, gold); path('M-6 31 L7 31 L0 49Z', paper);
      path('M-2 43 L2 43 L0 49Z', INK, INK, 1); line('M8-44 L12-44 L12-21', '#f0d79c', 3);
      line('M-3-38 L-3 24', '#c5ddd0', 1.8); break;
    case 'ruler':
      box(-10, -65, 23, 125, 3, grad(-65, 60, '#f0cf8a', '#c79850'));
      line('M10-58 L10 53', '#f5dfab', 1.5);
      for (let i = 0; i < 12; i++) line(`M-9 ${-55 + i * 10} L${i % 2 ? 0 : 5} ${-55 + i * 10}`, '#785c3e', 2);
      break;
    case 'cup':
      oval(24, 1, 13, 15, '#e5c093'); oval(24, 1, 6, 8, '#f9f0df');
      box(-23, -22, 44, 47, 9, grad(-22, 25, '#e7ac80', '#b96250'));
      oval(-1, -21, 22, 6, paper); oval(-1, -21, 16, 3, '#74533c', '', 0);
      line('M-9-36 Q-15-42-8-51', '#e2d5b8', 3);
      path('M-10 0 Q-17-8-20-1 Q-21 7-10 13 Q1 7 0 0 Q-3-6-10 0Z', '#fae5b9', '', 0);
      line('M-18-11 L-18 13', '#f5c99c', 2); break;
    case 'book':
      box(-31, -40, 62, 81, 5, '#435e63');
      box(-24, -35, 54, 73, 3, paper); line('M-19 25 L26 25 M-19 30 L26 30', '#b7a583', 1.5);
      path('M-30-40 L27-40 Q32-40 32-34 L32 27 L-30 27Z', grad(-40, 27, '#83a297', '#456b6c'));
      box(-31, -40, 9, 69, 3, '#3c5b60'); box(-15, -25, 33, 26, 2, '#ddc899');
      path('M-9-8 L-9-15 L1-22 L12-15 L12-8Z', '#789386', '#658176', 1.5);
      line('M-14 9 L19 9 M-14 15 L8 15', '#c5cba5', 2);
      path('M13 27 L23 27 L23 47 L18 42 L13 47Z', '#bc6d63'); break;
    case 'gloves':
      c.save(); c.translate(-13, 3); c.rotate(-.22);
      box(-13, 15, 26, 15, 4, '#f0d9bb'); path('M-13 17 Q-21 9-18-10 Q-17-26-2-26 Q13-27 16-11 L15 9 Q11 19-13 17Z', grad(-26, 20, '#da8c75', '#a35355'));
      oval(-13, 7, 8, 11, '#b96561'); line('M-10-17 Q1-22 9-14', '#f3b49a', 3); line('M-8 21 L8 21', '#b1927f', 2); c.restore();
      c.save(); c.translate(18, -4); c.rotate(.24);
      box(-13, 15, 26, 15, 4, '#f4dfbf'); path('M-13 17 Q-21 9-18-10 Q-17-26-2-26 Q13-27 16-11 L15 9 Q11 19-13 17Z', grad(-26, 20, '#eeac89', '#b66058'));
      oval(-13, 7, 8, 11, '#c17765'); line('M-10-17 Q1-22 9-14', '#ffdab1', 3); line('M-8 21 L8 21', '#b1927f', 2); c.restore(); break;
    case 'bat':
      path('M-7 42 L-6 11 Q-6-3-12-29 Q-16-53-12-61 Q-8-69 2-68 Q15-67 16-55 Q16-36 9-12 Q5 3 6 42Z', grad(-68, 45, '#edc985', '#b08050'));
      line('M-7-58 Q-9-38-2-13', '#f9dfaa', 3); line('M8-49 Q10-28 3-8', '#ad784b', 1.5);
      box(-7, 19, 15, 29, 3, '#697e75'); for (let n = 0; n < 4; n++) line(`M-6 ${23 + n * 6} L6 ${20 + n * 6}`, '#adba9a', 2);
      oval(0, 49, 11, 5, '#d3b47e'); break;
    case 'umbrella':
      line('M0-33 L0 34 Q0 49 13 46 Q20 44 18 36', INK, 7); line('M0-33 L0 34 Q0 46 12 43 Q16 42 15 37', '#d7bb80', 3.5);
      line('M0-58 L0-48', INK, 3);
      path('M-46-16 Q-36-48 0-51 Q35-47 46-16 Q32-25 22-15 Q11-25 0-15 Q-10-25-23-15 Q-34-24-46-16Z', grad(-51, -15, '#a7c2ac', '#648b84'));
      path('M0-50 Q-13-40-23-15 Q-9-25 0-15 Q8-25 22-15 Q13-40 0-50Z', '#d1ceb0', INK, 1.7);
      line('M-36-24 Q-24-42-7-46', '#d9e1ba', 2); break;
    case 'drawingBoard':
      box(-40, -48, 80, 96, 5, grad(-48, 48, '#c9a771', '#927453'));
      box(-33, -39, 66, 78, 2, '#f2e7c9'); box(-14, -48, 28, 12, 3, metal);
      box(-8, -52, 16, 9, 3, '#d9dfca'); oval(0, -48, 2, 2, '#677971', '', 0);
      line('M-24 19 L-24-14 L-4-14 L-4-26 L24-26 L24 19Z M-4-14 L-4 19 M-24 1 L9 1 M9-26 L9-9 L24-9', '#76908e', 2);
      line('M-26 29 L24 29 M-27 25 L-27 33 M25 25 L25 33', '#af8e5b', 1.4);
      line('M-36-29 L-36 34', '#e4bf89', 2); break;
    case 'mechanicalPencil':
      path('M-6-43 L6-43 L7 36 L0 54 L-7 36Z', grad(-43, 48, '#d7dfd2', '#91a9a8'));
      box(-7, -52, 14, 11, 3, '#576f77'); box(-4, -58, 8, 7, 2, '#d1b781');
      box(-8, 17, 16, 21, 2, '#6f8c87'); for (let n = 0; n < 4; n++) line(`M-6 ${20 + n * 4} L6 ${20 + n * 4}`, '#c2ccba', 1.5);
      path('M-7 38 L7 38 L0 54Z', '#c8d1c5'); line('M0 52 L0 62', '#45494b', 2);
      line('M7-41 L12-41 L12-17', '#e4bf81', 3); line('M-3-34 L-3 11', '#f2eddb', 2); break;
    case 'scaleRuler':
      path('M-13-63 L6-66 L15 58 L-8 61Z', grad(-65, 61, '#e4d9c0', '#aaa995'));
      path('M-13-63 L-4-57 L4 57 L-8 61Z', '#91aba1'); path('M-4-57 L6-66 L15 58 L4 57Z', '#ece5ca');
      for (let n = 0; n < 12; n++) line(`M${-9 + n * .45} ${-53 + n * 9} L${n % 2 ? -4 + n * .45 : -1 + n * .45} ${-54 + n * 9}`, '#496962', 1.6);
      line('M7-48 L12 49', '#a6a287', 1.3); break;
    case 'paintbrush':
      path('M-5-1 L6-1 L5 43 Q5 57 0 58 Q-5 57-5 43Z', grad(0, 58, '#9ab5a1', '#507b77'));
      box(-9, -19, 18, 28, 3, grad(-19, 9, '#efd79c', '#ab925e'));
      line('M-6-9 L6-9 M-6 3 L6 3', '#927851', 1.6);
      path('M-9-19 Q-17-39-4-63 Q-5-45 10-37 Q16-29 9-19Z', grad(-63, -19, '#eed6a0', '#9b694a'));
      path('M-4-63 Q-5-48 5-43 Q-4-36-10-37 Q-7-55-4-63Z', '#6f9e99', INK, 1.5);
      line('M-6-30 L-4-20 M0-31 L2-20', '#f3daa2', 1.5); break;
    case 'stapler':
      path('M-36 11 L31 10 Q39 11 38 21 L-36 22Z', '#6d7e77'); box(-34, 16, 71, 9, 3, '#b9c4b4');
      path('M-34 10 L-31-16 Q-28-24-17-22 L32-7 Q39-3 36 7 L-24 6Z', grad(-22, 10, '#b0c5af', '#698d85'));
      path('M-29-13 Q-27-18-18-16 L28-3 L-25-5Z', '#d4dbc0', '', 0);
      line('M-23 7 L31 9', '#ede6cd', 3); oval(-28, 9, 5, 5, '#8f9c8e'); line('M26 14 L32 14', '#454c4b', 2.5); break;
    case 'eraser':
      path('M-32-15 L21-23 L35-10 L28 20 L-24 25 L-36 11Z', '#b97578');
      path('M-32-15 L21-23 L35-10 L-19-2Z', '#f1c4b5');
      path('M-19-2 L35-10 L28 20 L-24 25Z', grad(-2, 25, '#dea397', '#c38184'));
      path('M-17-18 L8-21 L22-9 L16 22 L-9 24 L-6-4Z', '#e9dec0');
      line('M-4 5 L9 3 M-5 10 L8 8', '#859d8b', 2); break;
    case 'tapeMeasure':
      path('M11-8 L50-12 L50-2 L11 3Z', '#eed18b'); line('M51-13 L54-13 L54 0 L49 0', '#788b87', 4);
      for (let n = 0; n < 5; n++) line(`M${23 + n * 6}-10 L${23 + n * 6} ${n % 2 ? -5 : -2}`, '#957945', 1.5);
      box(-29, -24, 54, 55, 15, grad(-24, 31, '#e6bc6e', '#ba8956')); box(-24, -19, 44, 44, 12, '#f2d498');
      oval(-2, 3, 15, 15, '#849d92'); oval(-2, 3, 9, 9, '#bad0b5');
      line('M-2-3 L-2 8 M-6 3 L3 3', '#5f7b72', 2); path('M-27 18 Q-44 19-36 34 L-21 34', '#667971'); break;
    case 'tapeDispenser':
      path('M-37 14 Q-45-18-22-29 Q-1-38 11-13 L31 6 L39 26 L-37 26Z', grad(-29, 26, '#a5b8a2', '#6c897d'));
      oval(-17, -8, 20, 22, '#ddc39a'); oval(-17, -8, 11, 12, '#889489'); oval(-17, -8, 6, 7, '#d5d5bb');
      path('M-6-25 L31 0 L26 10 L0-5Z', '#efdcb4', '#b59e75', 1.5);
      path('M25 4 L39 11 L35 18 L22 12Z', metal); line('M27 7 L27 11 M31 9 L31 13 M35 11 L35 15', '#61736e', 1.5);
      line('M-33 20 L29 20', '#c4cdb0', 2); break;
    case 'waterBottle':
      box(-12, -46, 24, 14, 4, '#5e8586'); line('M-7-43 L-7-36 M0-43 L0-36 M7-43 L7-36', '#b8cfbb', 1.8);
      path('M-11-32 L11-32 L12-22 Q22-18 22-6 L22 32 Q21 42 0 42 Q-21 42-22 32 L-22-6 Q-22-18-12-22Z', grad(-32, 42, '#d5e2d4', '#7aafad'));
      path('M-18 2 Q-7 6 2 1 Q11-3 18 0 L18 31 Q15 37 0 37 Q-15 37-18 31Z', '#80b7b5', '', 0);
      box(-23, 0, 46, 17, 2, '#efdfb6'); path('M0 2 Q-10 11 0 14 Q10 11 0 2Z', '#7caaa4', '', 0);
      line('M-13-17 Q-16-12-16-6 M-15 24 L-15 30', '#f8f0d8', 3); break;
    case 'deskLamp':
      oval(0, 35, 31, 9, '#687f76'); oval(0, 31, 31, 8, '#b0bda3');
      line('M0 28 L16 0 L-7-27', INK, 9); line('M0 28 L16 0 L-7-27', '#bcc8b1', 5);
      oval(15, 0, 6, 6, '#c4b080'); oval(-7, -27, 6, 6, '#c4b080');
      path('M-19-48 Q-3-49 4-37 L12-23 L-36-22 L-30-37 Q-27-44-19-48Z', grad(-48, -22, '#93b3a3', '#577e76'));
      oval(-12, -22, 24, 6, '#e6cb91'); oval(-12, -23, 9, 4, '#fff0b7', '', 0);
      line('M-25-38 L-21-43 L-14-44', '#d1dabb', 2.5); break;
    case 'poster':
      path('M-13-47 L16-47 L19 46 Q5 58-10 47Z', grad(-47, 51, '#f6e9c5', '#d4ba89'));
      path('M11-37 Q31-42 36-31 L33 17 Q23 13 15 22Z', '#c4d1bd');
      line('M20-26 L28-28 L28-11 L20-9Z M21-4 L28-4 M21 2 L28 2', '#729791', 1.5);
      oval(1, -47, 15, 7, paper); oval(1, -47, 8, 3, '#c3ad7d');
      box(-13, -2, 30, 11, 2, '#93a99a'); line('M-7-37 L-5-9', '#fff4d7', 2); break;
    case 'tennisRacket':
      path('M-17-2 L-4 21 L4 21 L17-2', '#899f8d'); line('M0 13 L0 51', INK, 10);
      line('M0 13 L0 51', '#d4b580', 6); box(-7, 32, 14, 28, 3, '#8798b4');
      for (let n = 0; n < 5; n++) line(`M-5 ${35 + n * 5} L5 ${33 + n * 5}`, '#c9d3d1', 1.7);
      oval(0, -30, 29, 36, grad(-66, 6, '#bad1b5', '#658b80'));
      oval(0, -30, 22, 29, '#dfe6c8');
      c.save(); c.beginPath(); c.ellipse(0, -30, 22, 29, 0, 0, Math.PI * 2); c.clip();
      for (let n = -3; n <= 3; n++) { line(`M${n * 7}-62 L${n * 7} 1`, '#97afa1', 1.1); line(`M-24 ${-30 + n * 8} L24 ${-30 + n * 8}`, '#97afa1', 1.1); } c.restore();
      line('M-22-44 Q-17-58-5-59', '#edf0d3', 2); break;
    case 'fryingPan':
      box(-7, 7, 14, 47, 5, grad(7, 54, '#ad8e68', '#766259')); oval(0, 45, 3, 5, '#d3c9ad', '', 0);
      oval(0, -25, 33, 34, '#758980'); oval(0, -25, 28, 29, '#3e5555');
      oval(-1, -27, 23, 23, grad(-50, -4, '#6e8881', '#455d5c'), '', 0);
      line('M-23-34 Q-18-48-3-49', '#a6b9a6', 3); oval(-3, -17, 7, 5, '#748c7c', '', 0); break;
    case 'skateboard':
      for (const side of [-1, 1]) { box(side < 0 ? -24 : 16, -34, 8, 17, 3, '#d6bb86'); box(side < 0 ? -24 : 16, 20, 8, 17, 3, '#d6bb86'); }
      path('M-17-44 Q-16-61 0-62 Q16-61 17-44 L17 44 Q16 61 0 62 Q-16 61-17 44Z', grad(-62, 62, '#96b5a1', '#547c76'));
      line('M-11-44 L-11 43', '#c4d2ae', 2); path('M-8-10 L5-28 L2-4 L10-4 L-4 24 L0 1 L-8 1Z', '#e9c992', '', 0);
      for (const y of [-29, 29]) for (const x of [-6, 6]) oval(x, y, 2.3, 2.3, '#3e5653', '', 0); break;
    case 'backpack':
      path('M-10-30 L-10-39 Q0-48 10-39 L10-30', '#9d8067');
      line('M-24-14 Q-39-1-29 23 M24-14 Q39-1 29 23', '#615c58', 8);
      box(-28, -33, 56, 73, 13, grad(-33, 40, '#c2ab7d', '#8a725a'));
      path('M-25-23 Q0-38 25-23 L23-8 Q0 4-23-8Z', '#b89e72');
      box(-22, 9, 44, 26, 7, '#9c8266'); line('M-17 15 L17 15', '#ddc498', 2); line('M12 15 L12 21', '#e4bc6c', 2.8);
      box(-9, -18, 18, 13, 2, '#e6d3a7'); line('M-21-25 L-23-11', '#e0c8a0', 2); break;
    case 'calculator':
      box(-27, -43, 54, 86, 7, grad(-43, 43, '#adc2ad', '#6e8c83'));
      box(-20, -33, 40, 23, 3, '#465f5d'); box(-16, -29, 32, 15, 1, '#d5dfba', '', 0);
      line('M2-26 L8-26 L8-17 L2-17Z M12-26 L17-26 L17-17 L12-17Z', '#6c836b', 1.5);
      for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
        box(-19 + col * 14, -2 + row * 10, 10, 7, 1.7, col === 2 && row === 3 ? '#ddb277' : col === 2 ? '#a8b9a1' : '#eee3c6', '#526d65', 1.2);
      }
      line('M-21-36 L17-36', '#dfe4c7', 2); break;
    default: paintItem(c, 'pen', 0, 0); break;
  }
  c.restore();
}

/** Gloves wrap the fists; they are never drawn as a loose object in the palm. */
export function paintWornGlove(c: CanvasRenderingContext2D, x: number, y: number, front: boolean): void {
  c.save(); c.translate(x, y); if (!front) c.scale(-1, 1);
  const g = c.createLinearGradient(-5, -8, 5, 7); g.addColorStop(0, '#f0ae8c'); g.addColorStop(1, '#b36560');
  c.lineWidth = 1.15; c.strokeStyle = INK;
  c.beginPath(); c.roundRect(-5, 2.5, 10, 6, 2); c.fillStyle = '#ead6b9'; c.fill(); c.stroke();
  c.beginPath(); c.ellipse(0, -1.5, 7.3, 7.8, -.1, 0, Math.PI * 2); c.fillStyle = g; c.fill(); c.stroke();
  c.beginPath(); c.ellipse(-5, 1.5, 3.2, 4.5, -.3, 0, Math.PI * 2); c.fillStyle = '#c97c6e'; c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-3, -6); c.quadraticCurveTo(1, -8, 4, -4); c.strokeStyle = '#ffe0b9'; c.lineWidth = 1.3; c.stroke(); c.restore();
}
