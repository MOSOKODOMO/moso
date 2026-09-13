import * as THREE from 'three';
import type { Place, Weapon } from './StudioState';
import type { Teacher } from './Teachers';
import { defaultAppearance, type CharacterAppearance } from './CharacterAppearance';
import { paintCharacter } from './CharacterRenderer';

const INK = '#303430';
export function rounded(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string | CanvasGradient, r = 8, stroke = true): void {
  c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = INK; c.lineWidth = 3; c.stroke(); }
}
function ellipse(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, stroke = true) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = INK; c.lineWidth = 3; c.stroke(); }
}
function line(c: CanvasRenderingContext2D, points: number[], colour = INK, width = 3) {
  c.beginPath(); c.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1]);
  c.strokeStyle = colour; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
function text(c: CanvasRenderingContext2D, value: string, x: number, y: number, size = 22, colour = INK) {
  c.font = `bold ${size}px 'Trebuchet MS', sans-serif`; c.fillStyle = colour; c.fillText(value, x, y);
}
function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const el = document.createElement('canvas'); el.width = w; el.height = h; return [el, el.getContext('2d')!];
}
export function texture(el: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(el); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; return t;
}
export function toolDrawing(c: CanvasRenderingContext2D, kind: Weapon, x: number, y: number, scale = 1): void {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  if (kind === 'cup') {
    ellipse(c, 24, 1, 13, 15, '#e5c093'); ellipse(c, 24, 1, 6, 8, '#f9f0df');
    rounded(c, -23, -22, 44, 47, '#c77658', 9); ellipse(c, -1, -21, 22, 6, '#f6e7c8');
    ellipse(c, -1, -21, 16, 3, '#74533c', false); line(c, [-9, -36, -12, -44, -8, -52], '#eee0be', 3);
    text(c, '100', -16, 9, 15, '#fff2d8');
  } else if (kind === 'ruler') {
    rounded(c, -10, -65, 23, 125, '#e6b762', 3);
    for (let i = -55; i < 53; i += 10) line(c, [-9, i, i % 20 === -15 ? 5 : 0, i], '#775838', 2);
  } else {
    rounded(c, -6, -55, 13, 86, '#6d968d', 4); rounded(c, -7, -60, 15, 16, '#e3bb74', 3);
    c.beginPath(); c.moveTo(-6, 31); c.lineTo(7, 31); c.lineTo(0, 49); c.closePath(); c.fillStyle = '#e4d4b2'; c.fill(); c.strokeStyle = INK; c.stroke();
    line(c, [8, -44, 12, -44, 12, -21], '#f0d79c', 3);
  }
  c.restore();
}
export function toolIcon(kind: Weapon): string {
  const [el, c] = canvas(100, 100); c.translate(50, 52); if (kind !== 'cup') c.rotate(.65); toolDrawing(c, kind, 0, 0, .65); return el.toDataURL();
}
export function cupTexture(): THREE.Texture { const [el, c] = canvas(100, 100); toolDrawing(c, 'cup', 45, 55, 1.1); return texture(el); }

export function craftingTableTexture(): THREE.Texture {
  const [el,c]=canvas(600,340);
  const wood=c.createLinearGradient(0,90,0,320);wood.addColorStop(0,'#ac8050');wood.addColorStop(1,'#463126');
  rounded(c,76,140,35,184,wood,5);rounded(c,490,140,35,184,wood,5);
  rounded(c,82,242,435,19,'#765236',3);
  rounded(c,44,108,514,58,wood,5);rounded(c,32,95,538,24,'#b88c59',5);
  for(let n=0;n<11;n++)line(c,[58+n*44,120,84+n*42,132,71+n*43,148],'#d9ad7128',2);
  rounded(c,167,84,230,14,'#658779',2);
  line(c,[180,89,386,89],'#e3dab988',2);
  rounded(c,395,23,45,69,'#9e6845',4);
  for(let n=0;n<4;n++)line(c,[400+n*10,25,392+n*14,4],n%2?'#d9b877':'#739387',6);
  rounded(c,88,50,57,43,'#d9d1b3',2);line(c,[88,50,116,31,145,50],'#d9d1b3',5);
  c.save();c.translate(270,78);c.rotate(1.5);toolDrawing(c,'ruler',0,0,.7);c.restore();
  return texture(el);
}

export class StudentSprite {
  readonly canvas: HTMLCanvasElement;
  private c: CanvasRenderingContext2D;
  readonly texture: THREE.CanvasTexture;
  private appearance: CharacterAppearance = defaultAppearance();
  constructor(private instructor = false, private clerk = false, private teacher?: Teacher) {
    [this.canvas, this.c] = canvas(130, 165);
    this.texture = texture(this.canvas);
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.magFilter = THREE.NearestFilter;
    this.paint(0, false, teacher?.tool ?? 'pen');
  }
  setTeacher(teacher: Teacher): void { this.teacher = teacher; this.paint(0, false, teacher.tool); }
  setAppearance(appearance: CharacterAppearance): void { this.appearance = { ...appearance }; this.paint(0, false, 'pen'); }
  paint(time: number, walking: boolean, weapon: Weapon, attack = 0, seated = false, pose: 'uppercut' | 'kick' | 'dodge' | null = null, emptyHands = false): void {
    paintCharacter(this.c, this.appearance, time, walking, weapon, attack, seated, pose, emptyHands, toolDrawing, this.instructor, this.clerk, this.teacher);
    this.texture.needsUpdate = true;
  }
}

function plant(c: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  c.save(); c.translate(x, y); c.scale(scale, scale); rounded(c, -25, -35, 50, 40, '#b9795b', 8);
  for (let i = 0; i < 7; i++) { const a = i * 1.2; const px = Math.cos(a) * 32, py = -65 - i * 10; line(c, [0, -30, px, py], '#55664d', 4); ellipse(c, px, py, 19, 9, i % 2 ? '#70825b' : '#8f9a6b'); } c.restore();
}
function windowDrawing(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  rounded(c, x, y, w, h, '#b6c9c4', 1); c.save(); c.beginPath(); c.rect(x + 4, y + 4, w - 8, h - 8); c.clip();
  for (let i = 0; i < 8; i++) { const b = 35 + (i * 43) % 110; rounded(c, x + i * w / 7, y + h - b, w / 6, b, '#95aaa5', 0, false); }
  line(c, [x + w / 2, y, x + w / 2, y + h], '#596c63', 5); line(c, [x, y + h / 2, x + w, y + h / 2], '#596c63', 4); c.restore();
}
function desk(c: CanvasRenderingContext2D, x: number, y: number, w = 250) {
  rounded(c, x, y, w, 17, '#b39168', 4); line(c, [x + 18, y + 17, x + 12, y + 132], INK, 9); line(c, [x + w - 18, y + 17, x + w - 12, y + 132], INK, 9);
  rounded(c, x + 25, y - 10, 80, 10, '#e8e1c8', 2); rounded(c, x + w - 65, y - 29, 25, 29, '#859987', 3);
}
export function roomTexture(place: Exclude<Place, 'studio' | 'lobby' | 'mystery'>): THREE.Texture {
  const [el, c] = canvas(1600, 900);
  const sky = c.createLinearGradient(0, 0, 0, 900); sky.addColorStop(0, '#b7cec7'); sky.addColorStop(1, '#eee4c8'); c.fillStyle = sky; c.fillRect(0, 0, 1600, 900);
  {
    c.fillStyle = place === 'home' ? '#e2d7bd' : '#c9cbbb'; c.fillRect(0, 0, 1600, 710);
    for (let x = 0; x < 1600; x += 220) line(c, [x, 0, x, 710], '#b7bba9', 2);
    windowDrawing(c, 98, 190, 355, 350); windowDrawing(c, 1140, 180, 330, 340);
    if (place === 'foyer') {
      rounded(c, 548, 125, 508, 552, '#6c766c', 9);
      rounded(c, 569, 194, 466, 475, '#b2b9a7', 3);
      rounded(c, 582, 209, 211, 441, '#c7cdbc', 2); rounded(c, 799, 209, 220, 441, '#c7cdbc', 2);
      line(c, [797, 213, 797, 645], '#7b8678', 5);
      rounded(c, 723, 143, 160, 34, '#34493c', 5); text(c, 'G   ↑   ↓', 750, 168, 20, '#ebddb7');
      rounded(c, 1120, 348, 352, 215, '#eee4c8', 7); text(c, 'BUILDING 100', 1161, 388, 28);
      text(c, 'G — L8   DESIGN STUDIOS', 1150, 432, 18); text(c, 'B1   STUDENT LAB', 1150, 476, 20, '#786342'); text(c, 'B2   MODEL WORKSHOP', 1150, 518, 20, '#786342');
      text(c, 'IDEAS START HERE.', 127, 600, 27, '#526958'); plant(c, 491, 680, 1.15); plant(c, 1080, 679, .95);
    } else if (place === 'home') {
      rounded(c, 570, 450, 470, 230, '#a87960', 12); rounded(c, 585, 460, 440, 184, '#e4c396', 15);
      rounded(c, 601, 458, 111, 91, '#f6eedc', 19); rounded(c, 724, 465, 292, 190, '#899781', 13);
      for (let x = 738; x < 1000; x += 36) line(c, [x, 470, x, 645], '#aab69b', 2);
      desk(c, 1160, 548, 270); plant(c, 1490, 680, 1.2);
      rounded(c, 645, 160, 310, 160, '#f2e6cc', 3); text(c, 'REST IS PART', 688, 224, 28); text(c, 'OF THE PROCESS.', 664, 264, 27);
      text(c, 'Your little corner of Melbourne', 565, 373, 27, '#717d69');
    } else {
      const tools = place === 'tools';
      rounded(c, 550, 178, 488, 272, '#6c7c68', 4); text(c, tools ? 'MAKE IT YOUR OWN' : 'SMALL STEPS. BIG IDEAS.', 583, 241, 29, '#f0e9d2');
      text(c, tools ? 'PEN    /    RULER    /    CUP' : 'REST  ·  LEARN  ·  GROW', 605, 300, 23, '#d2d8bb');
      if (tools) for (let i = 0; i < 3; i++) toolDrawing(c, ['pen', 'ruler', 'cup'][i] as Weapon, 665 + i * 125, 380, .9);
      else { line(c, [632, 405, 632, 353, 735, 353, 735, 328, 858, 328, 858, 305], '#e8d5a5', 7); }
      desk(c, 515, 540, 560); desk(c, 1160, 554, 280); plant(c, 490, 680, 1.25);
      rounded(c, 105, 530, 331, 24, '#aa8966', 4); for (let i = 0; i < 7; i++) rounded(c, 125 + i * 39, 470 - i % 3 * 20, 28, 60 + i % 3 * 20, ['#b47e63', '#91a184', '#dac49a'][i % 3], 2);
    }
    for (const x of [400, 1100]) { line(c, [x, 0, x, 100], INK, 4); ellipse(c, x, 110, 66, 15, '#cba56b'); ellipse(c, x, 119, 53, 6, '#ffe7a5', false); }
  }
  c.fillStyle = '#b6a482'; c.fillRect(0, 690, 1600, 210); line(c, [0, 690, 1600, 690], '#736c56', 5);
  for (let y = 720; y < 900; y += 36) { line(c, [0, y, 1600, y], '#9e9075', 2); for (let x = (y % 72) * 7; x < 1600; x += 300) line(c, [x, y, x, y + 36], '#9e9075', 1); }
  // Fine deterministic paper grain, so the handmade props sit with the painted studio.
  for (let i = 0; i < 15000; i++) { c.fillStyle = i % 2 ? 'rgba(40,44,32,.035)' : 'rgba(255,246,220,.09)'; c.fillRect((i * 113) % 1600, (i * 331) % 900, 1.5, 1.5); }
  return texture(el);
}
export function chairTexture(): THREE.Texture {
  const [el, c] = canvas(190, 240); rounded(c, 42, 55, 95, 85, '#82927a', 12); line(c, [53, 140, 42, 226], INK, 7); line(c, [133, 140, 145, 226], INK, 7); rounded(c, 35, 140, 115, 18, '#ae906a', 5); return texture(el);
}
