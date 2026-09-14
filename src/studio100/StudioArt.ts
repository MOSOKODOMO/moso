import * as THREE from 'three';
import type { Place, Weapon } from './StudioState';
import type { Teacher } from './Teachers';
import { defaultAppearance, type CharacterAppearance } from './CharacterAppearance';
import { paintCharacter } from './CharacterRenderer';
import type { CharacterMotion } from './CharacterMotion';
import { itemGrip, paintItem } from './ItemArt';

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
/** The same item art supplies world props, paper dolls and shop icons. */
export function toolDrawing(c: CanvasRenderingContext2D, kind: Weapon, x: number, y: number, scale = 1): void {
  paintItem(c, kind, x, y, scale);
}
const itemIcons = new Map<Weapon, string>();
export function toolIcon(kind: Weapon): string {
  const cached = itemIcons.get(kind); if (cached) return cached;
  const [el, c] = canvas(100, 100), grip = itemGrip(kind);
  c.translate(50, 50); c.rotate(grip.iconAngle); c.scale(grip.iconScale, grip.iconScale);
  toolDrawing(c, kind, -grip.iconX, -grip.iconY);
  const icon = el.toDataURL(); itemIcons.set(kind, icon); return icon;
}
export function cupTexture(): THREE.Texture { const [el, c] = canvas(100, 100); toolDrawing(c, 'cup', 45, 55, 1.1); return texture(el); }

export function craftingTableTexture(): THREE.Texture {
  const [el,c]=canvas(600,340);
  const metal=c.createLinearGradient(0,138,0,329);metal.addColorStop(0,'#b6b7a9');metal.addColorStop(.55,'#8d938a');metal.addColorStop(1,'#586360');
  const ivory=c.createLinearGradient(0,129,0,199);ivory.addColorStop(0,'#e3dac0');ivory.addColorStop(1,'#ada58f');
  const screen=c.createLinearGradient(0,35,0,125);screen.addColorStop(0,'#153e47');screen.addColorStop(1,'#245d61');
  // Braced metal station with the same warm ivory / teal finish as the fabrication lab.
  rounded(c,76,162,44,163,metal,6);rounded(c,482,162,44,163,metal,6);
  rounded(c,67,314,63,14,'#485551',4);rounded(c,473,314,63,14,'#485551',4);
  rounded(c,102,267,392,18,metal,3);line(c,[112,270,484,270],'#c4c7b4',2);
  rounded(c,45,150,512,52,ivory,6);rounded(c,29,133,542,25,'#d7ceb5',5);
  line(c,[39,137,560,137],'#f2e5c7',3);rounded(c,57,166,222,14,'#3b514f',4);
  rounded(c,66,171,142,4,'#76c4bd',2,false);
  for(let n=0;n<3;n++)ellipse(c,229+n*15,173,3,3,n===2?'#e4bb72':'#8ed0c3',false);
  for(let n=0;n<4;n++)line(c,[457,167+n*7,533,167+n*7],'#817f70',2);
  // CAD monitor, keyboard and a small wireframe architectural model.
  rounded(c,142,108,17,24,'#677771',3);rounded(c,116,126,71,8,'#949c8c',3);
  rounded(c,78,28,148,87,'#697b74',6);rounded(c,85,35,134,70,screen,3,false);
  line(c,[96,87,121,61,150,77,173,49,204,79],'#8edacb',2);
  line(c,[96,87,149,99,204,79,151,66,96,87],'#84c3bd',2);
  for(const x of [111,127,144,162,179,195])line(c,[x,91-(x-111)*.13,x,72-Math.sin(x)*9],'#8edacb88',1);
  rounded(c,90,118,116,13,'#73857d',2);for(let n=0;n<7;n++)line(c,[99+n*15,121,105+n*15,127],'#c7d4ba',2);
  rounded(c,253,123,119,10,'#456361',3);rounded(c,265,117,95,5,'#bce0d2',2,false);
  line(c,[280,116,280,87,309,69,341,87,341,116,280,116,309,98,341,116],'#d5e7cd',3);
  line(c,[280,87,309,98,341,87,309,69,309,98,309,127],'#8fbab0',2);
  // Compact articulated robotic arm with circular joints and a two-finger gripper.
  rounded(c,421,112,79,21,metal,5);rounded(c,441,94,40,23,ivory,4);
  line(c,[460,99,479,61,439,31,414,68],'#344844',19);
  line(c,[460,99,479,61,439,31,414,68],'#d2c6a8',13);
  for(const [x,y] of [[460,99],[479,61],[439,31]]){ellipse(c,x,y,13,13,'#a9b3a1');ellipse(c,x,y,7,7,'#6e8078',false);ellipse(c,x-2,y-2,3,3,'#dce0c6',false);}
  line(c,[414,67,411,82],'#7ec5bc',9);line(c,[409,82,400,91,405,99],'#6d7b72',5);line(c,[416,82,425,91,420,99],'#6d7b72',5);
  line(c,[477,103,495,74,493,61],'#3b514d',3);
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
  paint(time: number, walking: boolean, weapon: Weapon, attack = 0, seated = false, pose: 'uppercut' | 'kick' | 'dodge' | null = null, emptyHands = false, showBackpack = !this.instructor && !this.clerk, motion?: CharacterMotion): void {
    paintCharacter(this.c, this.appearance, time, walking, weapon, attack, seated, pose, emptyHands, toolDrawing, this.instructor, this.clerk, this.teacher, showBackpack, motion);
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
      text(c, 'G   LOBBY', 1150, 424, 18); text(c, 'L1 — L9   DESIGN STUDIOS', 1150, 458, 18); text(c, 'B1   STUDENT GYM', 1150, 492, 18, '#786342'); text(c, 'B2   MODEL WORKSHOP', 1150, 526, 18, '#786342');
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
