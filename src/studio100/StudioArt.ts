import * as THREE from 'three';
import type { Place, Weapon } from './StudioState';
import type { Teacher } from './Teachers';
import { defaultAppearance, type CharacterAppearance } from './CharacterAppearance';

const INK = '#303430';
export function rounded(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, r = 8, stroke = true): void {
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

export class StudentSprite {
  readonly canvas: HTMLCanvasElement; private c: CanvasRenderingContext2D; readonly texture: THREE.CanvasTexture;
  private appearance: CharacterAppearance = defaultAppearance();
  constructor(private instructor = false, private clerk = false, private teacher?: Teacher) { [this.canvas, this.c] = canvas(130, 165); this.texture = texture(this.canvas); this.texture.minFilter=THREE.NearestFilter;this.texture.magFilter=THREE.NearestFilter; this.paint(0, false, teacher?.tool ?? 'pen'); }
  setTeacher(teacher: Teacher): void { this.teacher = teacher; this.paint(0, false, teacher.tool); }
  setAppearance(appearance: CharacterAppearance): void { this.appearance={...appearance};this.paint(0,false,'pen'); }
  paint(time: number, walking: boolean, weapon: Weapon, attack = 0, seated = false, pose:'uppercut'|'kick'|'dodge'|null=null, emptyHands=false): void {
    const c = this.c, t = this.teacher ?? (!this.instructor && !this.clerk ? {...this.appearance,coat:this.appearance.sex==='female'?'#4d5662':'#374b48',glasses:'none',beard:'none'} : undefined); c.clearRect(0, 0, 130, 165); c.save(); c.scale(.5,.5);c.translate(125, 0);
    const step = walking ? Math.sin(time * 13) * 12 : 0;
    c.translate(0, walking ? -Math.abs(step) * .3 : Math.sin(time * 2) * 1.5);
    if(pose==='dodge'){c.translate(0,85);c.scale(1.12,.73);}
    // Compact body and oversized expressive head follow the supplied pixel-chibi reference.
    c.save();c.translate(0,72);c.scale(.92,.76);
    if (!this.clerk) { c.save(); c.translate(-46, 157); c.rotate(-.25); rounded(c, -10, -80, 21, 155, '#4b554e', 6); rounded(c, -13, -84, 27, 12, '#b9bda4', 4); c.restore(); }
    rounded(c, -36, seated ? 246 : 255 + step, 30, seated ? 28 : 50, '#414440', 8);
    if(pose==='kick'){rounded(c,10,253,69,25,'#414440',8);rounded(c,69,245,24,36,'#e8e2ce',6);}
    else rounded(c, 6, seated ? 242 : 255 - step, 29, seated ? 32 : 50, '#414440', 8);
    rounded(c, -40, (seated ? 268 : 298) + step, 40, 17, '#e8e2ce', 7);
    if(pose!=='kick')rounded(c, 3, (seated ? 268 : 298) - step, 43, 17, '#e8e2ce', 7);
    line(c, [-33, 304 + step, -8, 304 + step], '#9e9b8b', 2);
    rounded(c, -47, 172, 93, 97, t?.coat ?? (this.clerk ? '#a68d78' : this.instructor ? '#9b8066' : '#343e3b'), 23);
    c.beginPath(); c.moveTo(-25, 175); c.lineTo(0, 198); c.lineTo(27, 174); c.fillStyle = this.instructor ? '#e8ddc6' : '#58665d'; c.fill(); c.strokeStyle = INK; c.stroke();
    line(c, [-9, 191, -9, 217], '#c4c8b2', 2); line(c, [9, 190, 9, 213], '#c4c8b2', 2);
    line(c,[-36,220,-34,251,-14,256],'#ffffff33',5);line(c,[24,224,25,259],'#111b2844',7);
    c.restore();
    // Hair silhouette and oversized face.
    c.save();c.translate(0,10);c.scale(1.12,1.17);
    ellipse(c, -2, 104, 68, 71, t?.hairStyle === 'bald' ? t.skin : t?.hair ?? '#34322f');
    if (t?.hairStyle === 'long' || t?.hairStyle === 'bob') rounded(c, -67, 95, 132, t.hairStyle === 'long' ? 112 : 70, t.hair, 23);
    if (t?.hairStyle === 'curly') for(let n=0;n<11;n++){const a=Math.PI+n*Math.PI/10;ellipse(c,Math.cos(a)*59,98+Math.sin(a)*53,20,20,t.hair);}
    if (!this.instructor && !this.clerk && this.appearance.hairStyle==='swept') { line(c, [-29,45,-40,25,-18,38,3,25,1,45],this.appearance.hair,8); }
    ellipse(c, -55, 125, 12, 17, t?.skin ?? '#efd0aa'); ellipse(c, 53, 125, 12, 17, t?.skin ?? '#efd0aa');
    ellipse(c, 0, 123, 55, 53, t?.skin ?? '#f5dbb6');
    if (!t) {
    c.beginPath(); c.moveTo(-57, 104); c.quadraticCurveTo(-65, 43, 4, 48); c.quadraticCurveTo(67, 47, 58, 112);
    c.lineTo(33, 82); c.lineTo(22, 109); c.lineTo(4, 80); c.lineTo(-13, 111); c.lineTo(-22, 88); c.lineTo(-46, 116); c.closePath(); c.fillStyle = this.instructor ? '#655c50' : '#34322f'; c.fill(); c.strokeStyle = INK; c.stroke();
    } else if (t.hairStyle !== 'bald') {
      c.beginPath(); c.moveTo(-59,116); c.quadraticCurveTo(-72,40,0,43); c.quadraticCurveTo(69,40,60,116);
      if(t.hairStyle==='short'||t.hairStyle==='swept'){c.lineTo(47,78);c.quadraticCurveTo(2,111,-39,78);}
      else if(t.hairStyle==='curly'){c.lineTo(37,94);c.lineTo(20,81);c.lineTo(0,99);c.lineTo(-18,83);c.lineTo(-41,99);}
      else {c.lineTo(37,84);c.quadraticCurveTo(15,139,4,87);c.quadraticCurveTo(-30,88,-49,128);}
      c.closePath();c.fillStyle=t.hair;c.fill();c.strokeStyle=INK;c.stroke();
    }
    if(t?.hairStyle!=='bald') {
      c.save();c.globalAlpha=.25;
      line(c,[-47,80,-33,57,-15,52],'#f5e3c1',6);line(c,[-12,57,8,53,30,62],'#f5e3c1',5);line(c,[35,63,46,77],'#f5e3c1',4);
      c.restore();
    }
    // Layered eyes: ivory whites, coloured irises, dark lashes and double highlights.
    const blink = time > 0 && !attack && Math.floor(time*24)%109<3;
    for(const x of [-21,24]) {
      if(blink){line(c,[x-12,130,x+11,130],INK,4);continue;}
      rounded(c,x-13,115,26,25,'#fff3dc',7,false);
      ellipse(c,x+2,129,9,13, this.clerk?'#73629a':t?'#765b42':'#4a807b',false);
      ellipse(c,x+2,125,6,9,'#202b35',false);ellipse(c,x+1,137,5,3,this.clerk?'#c2a1dc':'#a6c9a0',false);
      rounded(c,x-3,117,6,7,'#fffdf4',1,false);rounded(c,x+6,127,3,4,'#fffdf4',0,false);
      line(c,[x-15,116,x-8,112,x+8,113,x+13,117],INK,4);
      line(c,[x-11,141,x+8,141],'#795b50',2);
    }
    ellipse(c, -35, 144, 9, 4, '#e9ad97', false); ellipse(c, 37, 144, 9, 4, '#e9ad97', false);
    if(attack>0) rounded(c,-3,149,13,9,'#a76159',3); else line(c, [-4, 151, 2, 154, 8, 151], '#875f4f', 2);
    if(t && t.beard!=='none') {
      c.save();c.globalAlpha=t.beard==='stubble'?.3:1;
      if(t.beard==='goatee') ellipse(c,2,161,16,16,t.hair,false);
      else {c.beginPath();c.moveTo(-43,145);c.quadraticCurveTo(0,168,43,145);c.quadraticCurveTo(44,t.beard==='full'?220:191,0,t.beard==='full'?209:179);c.quadraticCurveTo(-40,181,-43,145);c.fillStyle=t.hair;c.fill();}
      c.restore();line(c,[-3,155,3,158,9,155],'#875f4f',2);
    }
    if(this.clerk) {rounded(c,-63,46,126,39,'#756689',17);rounded(c,-65,69,130,19,'#b5a4c9',5);line(c,[-47,54,-29,49,27,49],'#d8c9e3',4);}
    if(this.instructor && (!t || t.glasses!=='none')) {
      const colour=t?.glasses==='red'?'#b44538':INK;c.strokeStyle=colour;c.lineWidth=4;
      if(t?.glasses==='round'){for(const x of [-21,25]){c.beginPath();c.arc(x,126,18,0,Math.PI*2);c.stroke();}}
      else {c.strokeRect(-40,111,36,29);c.strokeRect(8,111,36,29);}line(c,[-4,122,8,122],colour,4);
    }
    c.restore();
    c.save();c.translate(0,72);c.scale(.92,.76);
    if (this.clerk) {
      line(c, [-22, 176, -22, 206, 26, 206, 26, 176], '#74607d', 6);
      rounded(c, -33, 199, 67, 74, '#74607d', 8); rounded(c, -21, 215, 41, 17, '#ede1c7', 3); text(c, 'MIKA', -17, 227, 11);
      rounded(c, -20, 243, 39, 20, '#8e7797', 4);
    } else if (this.instructor) {
      rounded(c,-31,226,50,21,'#e9dfc5',3);text(c,'STUDIO',-27,240,10);
    }
    // The student wears a simple hoodie, without the former numbered shoulder bag.
    // Front arm and held everyday object.
    c.save(); c.translate(37, 207); c.rotate(pose==='uppercut'?-2.8:pose==='kick'?1:attack > 0 ? -1.2 + attack * 2.4 : -.22);
    rounded(c, -9, -5, 26, 48, t?.coat ?? (this.clerk ? '#a68d78' : this.instructor ? '#9b8066' : '#343e3b'), 10);
    ellipse(c, 4, 46, 13, 12, t?.skin ?? '#f5dbb6');
    c.translate(10, 40); c.rotate(-.4); if (this.clerk) { rounded(c, -15, -20, 33, 43, '#d9c8a5', 3); line(c, [-9, -9, 11, -9], '#84745b', 2); } else if(!pose&&!emptyHands) toolDrawing(c, weapon, 10, -10, attack > 0 ? 1.25 : .78); c.restore();
    if (seated) { rounded(c, -10, 208, 69, 45, '#d9c4a0', 3); line(c, [2, 220, 42, 220], '#8f8a73', 2); line(c, [2, 230, 33, 230], '#8f8a73', 2); }
    c.restore();c.restore(); this.texture.needsUpdate = true;
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
