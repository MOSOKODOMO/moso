import type { CharacterAppearance } from './CharacterAppearance';
import type { Teacher } from './Teachers';
import type { Weapon } from './StudioState';
import { itemGrip, paintWornGlove } from './ItemArt';
import { characterRig, bodyPoint, type CharacterMotion, type RigLimb } from './CharacterMotion';

type Pose = 'uppercut' | 'kick' | 'dodge' | null;
type ToolPainter = (c: CanvasRenderingContext2D, kind: Weapon, x: number, y: number, scale?: number) => void;
type Look = CharacterAppearance & { coat?: string; glasses?: string; beard?: string };
const INK = '#302a37';
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;

const paths = new Map<string, Path2D>();
function shape(d: string): Path2D {
  let p = paths.get(d);
  if (!p) { p = new Path2D(d); paths.set(d, p); }
  return p;
}

function mix(a: string, b: string, amount: number): string {
  const aa = parseInt(a.slice(1), 16), bb = parseInt(b.slice(1), 16);
  const channel = (shift: number) => Math.round(((aa >> shift) & 255) * (1 - amount) + ((bb >> shift) & 255) * amount);
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}

/** One layered paper-doll renderer for the player, shop clerk and instructor roster. */
export function paintCharacter(
  c: CanvasRenderingContext2D, appearance: CharacterAppearance,
  time: number, walking: boolean, weapon: Weapon, attack: number, seated: boolean,
  pose: Pose, emptyHands: boolean, tool: ToolPainter, instructor = false, clerk = false, teacher?: Teacher, showBackpack = !instructor && !clerk, motion?:CharacterMotion,
): void {
  const a: Look = { ...appearance };
  if (instructor && teacher) Object.assign(a, {
    hairStyle: teacher.hairStyle, hair: teacher.hair, skin: teacher.skin, coat: teacher.coat,
    glasses: teacher.glasses, beard: teacher.beard, outfit: 'classic', outfitColour: teacher.coat,
    accessory: 'none', bottomsColour:'#4c526d',shoeColour:'#f6eee1',eyeStyle: 'gentle', eyes: '#695548',
  });
  if (clerk) Object.assign(a, { sex: 'female', hairStyle: 'bob', hair: '#484153', skin: '#eed0ad',
    outfit: 'studio', outfitColour: '#9d87b1', bottomsColour:'#4c526d',shoeColour:'#f6eee1',accessory: 'none', eyeStyle: 'bright', eyes: '#8b69aa' });
  const skin = a.skin, skinShade = mix(skin, '#9a5a55', .22), skinLight = mix(skin, '#fff3dc', .28);
  const hair = a.hair, hairShade = mix(hair, '#2b203c', .27), hairLight = mix(hair, '#fff5de', .42);
  const cloth = a.outfitColour || '#6e94c5', clothShade = mix(cloth, '#30324a', .29), clothLight = mix(cloth, '#ffffff', .32);
  const outfit = a.outfit || 'campus', style = a.hairStyle, feminine = a.sex === 'female';
  const grip=itemGrip(weapon),rig=characterRig({time,walking,attack,seated,pose,motion,weaponFamily:grip.family,emptyHands});
  const sitting=rig.state==='seated',sway=rig.hairSway;
  const bottoms=a.bottomsColour||'#4c526d',bottomsShade=mix(bottoms,'#202839',.28),bottomsLight=mix(bottoms,'#c9d4e1',.3);
  const shoes=a.shoeColour||'#f6eee1',shoeShade=mix(shoes,'#474553',.3),pack=a.backpackColour||'#9f8264';
  const path = (d: string, fill: string | CanvasGradient, stroke = INK, width = 1.55) => {
    const p = shape(d); c.fillStyle = fill; c.fill(p);
    if (width) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(p); }
  };
  const line = (d: string, colour = INK, width = 1) => { c.strokeStyle = colour; c.lineWidth = width; c.stroke(shape(d)); };
  const oval = (x: number, y: number, rx: number, ry: number, fill: string, stroke = '', width = 1) => {
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  };
  const box = (x: number, y: number, w: number, h: number, r: number, fill: string, stroke = INK, width = 1.3) => {
    c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill();
    if (width) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  };
  const grad = (top: number, bottom: number, light: string, dark: string) => {
    const g = c.createLinearGradient(0, top, 0, bottom); g.addColorStop(0, light); g.addColorStop(1, dark); return g;
  };
  const hairFill = grad(22, 100, hairLight, hair);
  const dress = outfit === 'pinafore';
  const longPants = outfit === 'varsity' || outfit === 'studio' || outfit === 'classic';

  c.clearRect(0,0,130,165);c.save();c.translate(65,0);c.lineCap='round';c.lineJoin='round';
  const applyBody=()=>{c.translate(rig.bodyX,rig.bodyY);c.rotate(rig.lean);c.scale(.94,.8);c.translate(0,-132);};
  const applyHead=()=>{const neck=bodyPoint(rig,0,95);c.translate(neck.x+1.5,neck.y);c.rotate(rig.headTilt);c.scale(1.08,.91);c.translate(0,-95);};
  c.save();applyHead();
  // Back hair is behind the entire figure, so neck, shoulders and outfits read clearly.
  if (style === 'long') {
    path('M-31 51 Q-45 83-36 123 Q-28 136-18 122 L-9 70 Z', hairShade);
    path('M29 51 Q45 81 37 124 Q28 136 17 121 L9 68 Z', hairShade);
    line('M-32 70 Q-39 103-29 123 M32 69 Q39 105 29 124', hairLight, 1.8);
  } else if (style === 'ponytail') {
    c.save(); c.translate(sway, 0);
    path('M-27 40 Q-53 45-47 75 Q-43 91-49 110 Q-31 107-27 85 Q-21 74-21 58 Z', hairFill);
    line('M-35 50 Q-45 70-38 84 Q-33 98-44 108', hairLight, 2);
    box(-36, 46, 12, 5, 2, clothLight); c.restore();
  } else if (style === 'twin-tails') {
    for (const side of [-1, 1]) { c.save(); c.scale(side, 1); c.translate(sway * .5, 0);
      path('M29 43 Q49 44 47 65 Q42 78 46 95 Q43 110 34 116 Q40 94 29 87 Q25 72 29 43Z', hairFill);
      line('M38 53 Q45 64 36 82 Q42 102 36 112', hairLight, 2);
      box(27, 48, 12, 5, 2, cloth); c.restore();
    }
  } else if (style === 'bob') {
    path('M-32 48 Q-40 66-33 96 Q-22 103-16 89 L18 89 Q28 105 35 92 Q40 67 32 49Z', hairShade);
    line('M-32 65 Q-33 88-27 95 M32 66 Q34 86 29 96', hairLight, 1.4);
  }

  c.restore();
  c.save();applyBody();
  const backpack = showBackpack && !instructor && !clerk;
  if (backpack) {
    // A compact pack behind the shoulder, with a gusset and zipped front pocket.
    line('M-24 102 Q-27 93-19 95 L-17 101', '#594c4b', 2.3);
    path('M-24 99 Q-31 100-32 108 L-32 125 Q-31 132-23 132 L-12 129 L-13 104 Q-15 98-24 99Z', grad(99, 133,mix(pack,'#eee4c3',.3),mix(pack,'#302d39',.27)));
    path('M-28 103 Q-23 99-17 103 L-16 127 L-24 130 Q-29 128-29 123Z', pack, '', 0);
    box(-31, 116, 14, 12, 3, mix(pack,'#463e43',.2), '#5b5050', .85);
    line('M-28 119 L-19 119', '#d4bc96', 1);
    line('M-20 119 L-20 122', '#e5c57f', 1.1);
    line('M-15 107 L-14 124', '#d0b58c', .8);
  }

  c.restore();
  const strokeLimb=(p:RigLimb,width:number,fill:string)=>{const draw=()=>{c.beginPath();c.moveTo(p.start.x,p.start.y);c.lineTo(p.joint.x,p.joint.y);c.lineTo(p.end.x,p.end.y);};draw();c.strokeStyle=INK;c.lineWidth=width+2.5;c.stroke();draw();c.strokeStyle=fill;c.lineWidth=width;c.stroke();};
  const leg=(p:RigLimb,front:boolean)=>{
    strokeLimb(p,longPants?8:6.5,longPants?(front?bottoms:bottomsShade):(front?skin:skinShade));
    if(longPants){line('M'+(p.joint.x-1)+' '+(p.joint.y-1)+' L'+(p.end.x-1)+' '+(p.end.y-2),front?bottomsLight:bottoms,1.6);}
    c.save();c.translate(p.end.x,p.end.y);c.rotate(p.angle);
    if(!longPants&&outfit!=='street')box(-4.5,-5,9,7,1,'#f8f0df','',0);
    path('M-6-2 Q-2-5 3-3 L6 0 Q13 1 13 5 L12 8 L-7 8 Q-9 4-6-2Z',front?shoes:shoeShade,INK,1.45);
    path('M-7 5 Q2 7 12 4 L12 8 L-7 8Z',shoeShade,'',0);line('M-2 0 L4 0 M-1 2 L5 2',mix(shoes,'#3d3a4b',.48),.9);line('M-6 7 L11 7',mix(shoes,'#fff8de',.4),1);c.restore();
  };
  leg(rig.backLeg,false);leg(rig.frontLeg,true);
  const heldItem=!emptyHands&&!clerk&&!sitting,wearsGloves=heldItem&&grip.family==='punch';
  const arm=(front:boolean)=>{
    const p=front?rig.frontArm:rig.backArm,longSleeve=['varsity','classic','street'].includes(outfit),sleeve=outfit==='campus'?'#fff9e9':outfit==='varsity'?'#eee4cf':outfit==='studio'||dress?'#f7ead6':cloth;
    strokeLimb(p,7.3,longSleeve?sleeve:(front?skin:skinShade));
    if(!longSleeve){const sx=lerp(p.start.x,p.joint.x,.72),sy=lerp(p.start.y,p.joint.y,.72);c.beginPath();c.moveTo(p.start.x,p.start.y);c.lineTo(sx,sy);c.strokeStyle=INK;c.lineWidth=11;c.stroke();c.strokeStyle=sleeve;c.lineWidth=8.5;c.stroke();}
    if(longSleeve){const dx=p.end.x-p.joint.x,dy=p.end.y-p.joint.y,d=Math.hypot(dx,dy)||1;line('M'+(p.end.x-dy/d*3)+' '+(p.end.y+dx/d*3)+' L'+(p.end.x+dy/d*3)+' '+(p.end.y-dx/d*3),clothLight,2.4);}
    if(front&&heldItem&&!wearsGloves){c.save();c.translate(p.end.x,p.end.y);const aim=grip.angle+(grip.attackAngle-grip.angle)*rig.strike-(['swing','bash'].includes(grip.family)?rig.anticipation*.5:0)+(rig.state==='uppercut'?-.4:0);c.rotate(aim);if(grip.flip)c.scale(-1,1);tool(c,weapon,-grip.x*grip.scale,-grip.y*grip.scale,grip.scale);c.restore();}
    if(front&&clerk){c.save();c.translate(p.end.x+2,p.end.y-1);c.rotate(-.16);box(-5,-6,13,18,1.5,'#e7d5b2');line('M-2-1 L5-1 M-2 2 L4 2','#9c866d',1);c.restore();}
    oval(p.end.x,p.end.y,5.5,5.2,front?skin:skinShade,INK,1.4);oval(p.end.x-1.5,p.end.y-2,2,1.3,skinLight);line('M'+(p.end.x-2)+' '+p.end.y+' L'+(p.end.x-2)+' '+(p.end.y+2),skinShade,.85);
    if(wearsGloves)paintWornGlove(c,p.end.x,p.end.y-1,front);
  };
  arm(false);c.save();applyBody();
  // Hips and hem are drawn before the torso and the moving front hand.
  if (!dress) {
    path('M-16 121 L16 121 L17 135 L3 137 L0 129 L-3 137 L-17 135Z', bottoms);
    line('M-14 132 L-5 133 M5 133 L14 132', bottomsLight, 1.2);
    line('M0 126 L0 131', bottomsShade, .9);
  }

  // A short tapered neck blends into the collar; the head covers its upper edge.
  path('M-4 91 L4 91 L4.8 100 Q0 102-4.8 100Z', skin, skinShade, .65);
  path('M-4 94 L4 94 L4 100 Q0 101-4 100Z', grad(94, 101, skinShade, skin), '', 0);

  const body = 'M-10 98 Q-17 98-20 105 L-15 111 L-15 127 Q0 131 15 127 L15 111 L20 105 Q17 99 10 98 Q0 106-10 98Z';
  if (outfit === 'campus') {
    path(body, grad(99, 130, '#fffdf2', '#dddde2'));
    path('M-9 98 L0 103 L-5 110 L-12 102Z', '#ffffff');
    path('M9 98 L0 103 L5 110 L12 102Z', '#ffffff');
    line('M0 106 L0 120', '#aab3c0', .9);
    oval(2, 112, .9, .9, cloth); oval(2, 117, .9, .9, cloth);
    line('M-14 123 L14 123', cloth, 3);
    path('M7 111 L13 111 L13 117 L10 119 L7 117Z', cloth);
    line('M9 113 L11 113', '#fff6ce', .9);
  } else if (outfit === 'varsity') {
    path(body, grad(99, 130, clothLight, cloth));
    path('M-5 102 L5 102 L5 127 L-5 127Z', '#fff2dc', '', 0);
    path('M-10 99 L-4 104 L-6 123 L-15 125 L-15 108Z', cloth);
    path('M10 99 L4 104 L6 126 L15 125 L15 108Z', cloth);
    line('M-15 124 L-5 125 M5 125 L15 124', clothShade, 2.7);
    line('M-15 126 L-5 127 M5 127 L15 126', '#f6e5ca', .9);
    line('M-9 101 L-4 104 M9 101 L4 104', '#f5e9d7', 2);
    path('M-12 109 L-8 109 L-8 115 L-12 115Z', '#f7e4bb', '', 0);
    line('M-11 110 L-9 114', cloth, .8);
    for (const y of [109, 115, 121]) oval(5, y, .85, .85, '#f9e5c0');
  } else if (outfit === 'studio') {
    path(body, '#f4e9d5');
    path('M-11 102 L-7 102 L-7 112 L7 112 L7 102 L11 102 L12 111 L16 132 Q0 138-16 132 L-12 111Z', grad(104, 136, clothLight, cloth));
    line('M-11 114 L-13 130 M11 114 L13 130', clothShade, 1.1);
    box(-7, 120, 14, 9, 1.5, clothShade, '', 0); line('M-6 122 L6 122', clothLight, .8);
    line('M4 117 L4 123', '#eac068', 1.8); line('M7 116 L7 123', '#d9e1c9', 1.4);
    oval(-8, 111, 1.1, 1.1, '#f5d48c'); oval(8, 111, 1.1, 1.1, '#f5d48c');
    if (clerk) box(-6, 113, 12, 4, 1, '#fff0c7', '', 0);
  } else if (dress) {
    path(body, '#ffefdf');
    path('M-12 100 L-7 101 L-7 111 L7 111 L7 101 L12 100 L12 114 L21 135 Q12 141 0 138 Q-12 141-21 135 L-12 114Z', grad(100, 140, clothLight, cloth));
    line('M-10 119 L-14 135 M-3 121 L-4 136 M5 121 L7 136 M12 121 L16 134', clothShade, 1.15);
    line('M-18 136 Q-9 141 0 138 Q10 141 18 136', '#ffefd9', 2.4);
    path('M-9 99 L0 104 L-5 109 L-13 102Z', '#fffbeb');
    path('M9 99 L0 104 L5 109 L13 102Z', '#fffbeb');
    line('M-12 117 L12 117', clothShade, 2);
    oval(-8, 110, 1.1, 1.1, '#f6d18b'); oval(8, 110, 1.1, 1.1, '#f6d18b');
  } else if (outfit === 'street') {
    path('M-10 97 Q-22 98-23 108 L-17 114 L-18 130 Q0 136 18 130 L17 114 L23 108 Q22 98 10 97 Q0 105-10 97Z', grad(99, 133, clothLight, cloth));
    path('M-11 98 Q0 111 11 98 L8 105 Q0 113-8 105Z', clothShade);
    box(-10, 118, 20, 9, 3, clothShade, '', 0); line('M-7 119 L-10 123 M7 119 L10 123', clothLight, .8);
    line('M-5 106 L-5 115 M5 106 L5 114', '#fff1da', 1.1);
    line('M-15 130 Q0 133 15 130', clothShade, 2.8);
    oval(-5, 115, 1, 1, '#efdaad'); oval(5, 114, 1, 1, '#efdaad');
  } else {
    path(body, grad(100, 131, clothLight, cloth));
    path('M-6 100 L6 100 L5 125 L-5 125Z', '#fff0d9');
    path('M-9 98 L-2 104 L-7 111 L-4 114 L-10 126 L-16 129 L-14 105Z', cloth);
    path('M9 98 L2 104 L7 111 L4 114 L10 126 L16 129 L14 105Z', cloth);
    path('M-2 105 L2 105 L3 116 L0 120 L-3 116Z', '#9f6978');
    line('M8 120 L13 119 M-13 120 L-8 121', clothShade, 1);
    oval(5, 120, 1, 1, '#e7c18b');
  }

  if (backpack) {
    line('M-13 101 Q-11 110-13 125 M13 102 Q15 111 13 124', mix(pack,'#2b2833',.38), 3.1);
    line('M-13 102 Q-12 110-13 123 M13 103 Q14 111 13 122', mix(pack,'#fff1c9',.33), 1.25);
    box(-14.5, 118, 3, 4, .8, '#dfc791', '', 0);
    box(11.5, 118, 3, 4, .8, '#dfc791', '', 0);
  }

  c.restore();
  c.save();applyHead();
  // Face: soft cheek curve, warm edge shading, small chin and expressive oval irises.
  const head = 'M-29 48 Q-28 34 1 33 Q31 36 30 53 L30 73 Q28 86 16 91 Q3 97-12 92 Q-27 88-30 74Z';
  if (style !== 'bald') path('M-32 66 Q-40 35-20 21 Q-3 11 17 21 Q39 29 35 63 L28 76 L-29 77Z', hairShade);
  oval(-29,71,5.8,7.2,skin,INK,1.35); oval(29,71,3.8,6.1,skin,INK,1.1);
  line('M-30 69 Q-26 67-26 73 M30 69 Q26 67 26 73', skinShade, 1);
  path(head, grad(45, 95, skinLight, skin));
  path('M-28 61 Q-27 81-15 87 Q0 95 16 88 Q1 99-16 91 Q-29 84-29 72Z', skinShade, '', 0);
  oval(-19, 81.5, 5.7, 2.6, mix(skin, '#e08088', .34)); oval(21, 81.5, 5.7, 2.6, mix(skin, '#e08088', .34));
  const blink = rig.blink;
  const eyeStyle = a.eyeStyle || 'bright', iris = a.eyes || '#6681a3';
  for (const side of [-1, 1]) {
    c.save(); c.translate(side<0?-9.5:17,68.2);c.scale(side<0?.88:1,1);
    const fierce = eyeStyle === 'fierce', sleepy = eyeStyle === 'sleepy', gentle = eyeStyle === 'gentle';
    if (blink) line('M-5 2 Q0 4 5 2', '#49323d', 1.5);
    else {
      const eye = fierce ? 'M-5-4 Q0-4 6-7 L6 5 Q0 10-5 5Z' : sleepy ? 'M-6-2 L6-2 L5 6 Q0 10-5 6Z' : gentle ? 'M-6-4 Q0-9 6-3 L5 6 Q0 11-5 6Z' : 'M-6-5 Q0-10 6-5 L6 5 Q0 11-5 6Z';
      path(eye, '#fff9ef', '#5f4650', .9);
      c.save(); c.clip(shape(eye));
      oval(1, 1.7, gentle ? 3.8 : 4.5, sleepy ? 7 : 8.2, iris);
      oval(1, -.4, 3.2, 5.8, '#303044');
      path('M-2 5 Q1 9 4 5 Q4 9 1 9 Q-2 9-2 5Z', mix(iris, '#ffefb7', .52), '', 0);
      oval(-.2, -3, 1.85, 2.1, '#fffdf6'); oval(3, 3.9, .85, 1.05, '#ffffff'); c.restore();
      line(fierce ? 'M-6-5 L6-7' : sleepy ? 'M-6-2 L6-2' : gentle ? 'M-6-4 Q0-9 6-3' : 'M-6-5 Q0-10 6-5', '#372c3e', feminine ? 1.9 : 1.65);
      if (feminine) line(side === -1 ? 'M-6-4 L-8-6' : 'M6-4 L8-6', '#372c3e', 1.1);
      line('M-3 8 Q0 9 3 8', '#956c6b', .55);
    }
    line(fierce ? 'M-5-12 L4-10' : gentle ? 'M-5-11 Q0-14 5-11' : 'M-5-12 Q0-14 4-12', hairShade, 1.15);
    c.restore();
  }
  line('M8 79 Q11 81 12 79', skinShade, .8);
  if (rig.strike>.3 || rig.state==='uppercut') path('M2 84 Q7 82 11 84 Q10 91 6 90 Q3 89 2 84Z', '#835061', INK, .8);
  else line('M2 85 Q6 88 10 85', '#89575b', 1);

  // Hair is painted as large flowing locks with thin internal shadows and ribbon-shaped highlights.
  if (style !== 'bald') {
    let cap = '';
    if (style === 'short') cap = 'M-33 66 Q-40 49-31 33 L-34 29 L-23 28 Q-17 19-5 20 L-5 15 Q4 14 12 20 L23 20 L21 25 Q38 31 36 48 L32 69 L25 59 L22 46 Q17 55 8 55 L12 43 Q3 54-9 56 L-7 47 Q-18 60-25 57 L-26 72Z';
    else if (style === 'spiky') cap = 'M-33 66 L-38 47 L-32 42 L-40 39 L-26 32 L-28 22 L-16 26 L-11 13 L-1 21 L7 9 L13 21 L27 16 L26 28 L39 28 L33 39 L42 44 L32 50 L31 68 L22 53 L20 42 L9 55 L11 41 L-2 51 L-3 42 L-17 55 L-16 47 L-26 65Z';
    else if (style === 'swept') cap = 'M-32 71 Q-41 47-29 30 Q-16 17 3 17 L15 20 L23 18 L22 24 Q39 29 35 50 L30 65 L25 45 Q20 40 14 40 Q11 61-3 72 L-2 60 Q-13 71-17 77 Q-14 52-7 42 Q-26 58-26 76Z';
    else if (style === 'curly') cap = 'M-33 70 Q-42 66-38 56 Q-45 49-36 42 Q-42 30-30 27 Q-27 16-17 21 Q-10 10-1 19 Q10 9 17 20 Q31 15 33 28 Q44 32 38 42 Q45 53 37 57 Q40 68 31 71 L25 61 Q17 67 13 56 Q5 63-2 56 Q-13 63-18 54 Q-29 65-30 57Z';
    else if (style === 'bob') cap = 'M-32 76 Q-39 54-33 36 Q-27 18-7 19 Q12 14 27 29 Q39 41 34 73 L30 88 Q26 91 23 86 L25 61 L22 47 Q16 56 8 54 L5 47 Q0 56-7 55 L-10 47 Q-15 56-23 55 L-26 67 L-24 88 Q-30 92-32 76Z';
    else if (style === 'long') cap = 'M-33 73 Q-39 51-30 33 Q-20 17-4 19 Q19 14 31 32 Q40 50 32 78 L27 97 L22 90 L25 65 L21 44 Q12 56 4 57 L7 44 Q-6 56-17 59 L-15 50 L-25 65 L-23 96 L-30 87Z';
    else cap = 'M-33 68 Q-39 49-31 32 Q-21 18-4 19 Q17 15 30 32 Q39 47 33 67 L27 73 L23 47 Q18 56 8 56 L11 43 Q1 56-9 59 L-8 49 Q-16 58-24 57 L-27 75Z';
    path(cap, hairFill);
    c.save(); c.clip(shape(cap));
    path('M17 21 Q34 30 32 50 L27 67 L21 46 Q18 31 6 23Z', hairShade, '', 0);
    path('M-32 37 Q-29 27-16 25 Q-24 35-23 48 L-29 54 Q-33 48-32 37Z', hairLight, '', 0);
    path('M-21 29 Q-9 19 3 24 Q-8 29-10 39 L-15 45 Q-15 35-21 29Z', mix(hair, '#fff7e6', .56), '', 0);
    path('M3 23 Q15 21 22 34 L23 39 L18 37 Q14 28 3 27Z', mix(hair, '#fff7ef', .48), '', 0);
    if (style === 'curly') {
      for (const [x, y] of [[-29, 33], [-15, 27], [0, 25], [16, 29], [29, 37], [-28, 48], [-12, 46], [6, 45], [24, 49]]) {
        c.save(); c.translate(x, y); line('M-4 3 C-8-5 3-7 4-1 Q5 3 1 3', hairShade, 1); line('M-3-3 Q0-5 3-2', hairLight, 1.3); c.restore();
      }
    } else if (style === 'bob') {
      line('M-18 27 Q-26 41-23 52 M-6 23 Q-10 39-7 51 M8 24 Q8 40 9 51 M22 31 Q27 44 25 54', hairShade, .8);
      line('M-20 34 Q-22 39-21 43 M-7 31 L-7 40 M7 31 L8 39', hairLight, 1.5);
    } else {
      line('M-11 24 Q-23 33-27 51 M3 24 Q-12 36-17 48 M12 27 Q8 37 0 47 M26 35 Q32 47 29 57', hairShade, .8);
      line('M-25 35 Q-29 42-28 45 M-15 32 Q-19 37-20 42 M2 28 Q-3 34-5 37', hairLight, 1.3);
    }
    c.restore();
  } else {
    line('M-18 39 Q-8 31 3 32', skinLight, 2.1);
    if (instructor) { path('M-31 55 Q-35 64-29 74 L-26 69 L-26 52Z', hairShade, '', 0); path('M30 54 Q34 65 28 74 L26 67 L26 52Z', hairShade, '', 0); }
  }

  if (a.beard && a.beard !== 'none') {
    const full = a.beard === 'full', goatee = a.beard === 'goatee', stubble = a.beard === 'stubble';
    c.save(); if (stubble) c.globalAlpha = .38;
    path(goatee ? 'M-4 88 Q2 93 8 88 L6 99 Q1 103-3 98Z' : `M-23 81 Q-17 86-11 85 Q0 91 12 85 Q19 86 24 80 Q24 ${full ? 104 : 94} 8 ${full ? 111 : 101} L1 ${full ? 113 : 103} Q-22 ${full ? 105 : 98}-23 81Z`, hairShade, '', 0);
    if (!stubble) { line(full ? 'M-13 91 Q-11 103-5 106 M7 94 L5 108 M17 89 Q17 100 12 104' : 'M-13 89 L-8 96 M8 92 L6 99', hairLight, .9); }
    line('M-3 85 Q2 88 6 85', '#8e6d65', .9); c.restore();
  }

  if (a.accessory === 'round-glasses' || (a.glasses && a.glasses !== 'none')) {
    const glasses = a.glasses || 'round', colour = glasses === 'red' ? '#aa5364' : '#403b50';
    if (glasses === 'round') { oval(-9.5,69.5,9,10,'#ffffff08',colour,1.35);oval(17,69.5,10,10,'#ffffff08',colour,1.35); }
    else { box(-20,61,20,17,3.5,'#ffffff08',colour,1.35);box(6,61,22,17,3.5,'#ffffff08',colour,1.35); }
    line('M0 68 Q3 66 7 68 M-19 65 L-29 63 M28 65 L31 64', colour, 1.2);
    line('M-19 63 L-15 61 M7 63 L11 61', '#fff7e8aa', 1.2);
  }
  if (a.accessory === 'bow') {
    c.save(); c.translate(-25, 30); c.rotate(-.23);
    path('M0 1 Q-7-9-12-7 L-12 8 Q-4 9 0 3 Q4 10 12 8 L12-7 Q6-8 0 1Z', grad(-7, 9, '#f2bfcc', '#c386a5'));
    line('M-9-4 L-3 1 M-9 5 L-3 3 M9-4 L3 1 M9 5 L3 3', '#fce3df', 1);
    box(-3, -2, 6, 8, 2, '#ffe1c6'); c.restore();
  } else if (a.accessory === 'headphones') {
    line('M-33 61 Q-39 20 0 18 Q39 20 33 62', '#352f45', 4.2);
    line('M-33 50 Q-32 21 0 21 Q31 21 33 50', clothLight, 1.8);
    for (const side of [-1, 1]) { box(side * 34 - 4, 54, 8, 20, 4, clothShade); box(side * 34 - 2.5, 56, 5, 14, 2.5, clothLight, '', 0); }
  }
  if (clerk) {
    path('M-29 34 Q-30 22-15 20 L16 20 Q31 23 29 36Z', '#827299');
    box(-31, 31, 62, 8, 3, '#baa5cc'); line('M-19 25 Q-3 21 16 25', '#cfbcdc', 1.5);
    box(8, 32.5, 11, 4, 1, '#f1dfbc', '', 0);
  }
  if(a.accessory==='cap'){
    path('M-34 42 Q-37 23-19 18 Q-2 12 18 20 Q32 26 31 43Z',grad(17,44,clothLight,cloth));
    path('M-31 41 Q-2 36 28 42 Q42 43 45 49 Q35 54 22 48 L-31 47Z',clothShade);
    line('M-8 18 Q-3 28-3 39',clothShade,1.5);oval(-7,17,2.4,1.7,clothLight);line('M27 46 Q35 46 40 49',clothLight,1.2);
  }else if(a.accessory==='beanie'){
    path('M-35 47 L-36 33 Q-35 10-9 9 Q19 6 31 26 L34 47Z',grad(10,49,clothLight,cloth));
    box(-35,39,69,13,5,clothShade);for(let x=-28;x<29;x+=7)line('M'+x+' 42 L'+(x-1)+' 49',clothLight,1.4);
    line('M-20 17 Q-26 25-25 36 M-5 13 Q-9 25-8 35 M11 16 Q15 26 17 36',clothShade,1.15);box(17,42,10,6,1.4,'#e6cea2');
  }
  c.restore();arm(true);
  if(sitting){c.save();applyBody();path('M-15 127 L0 126 L15 127 L16 136 L1 135 L-16 136Z','#f4e4c7');line('M0 128 L1 134 M-12 130 L-3 129 M4 129 L12 130','#b29b82',1);c.restore();}
  c.restore();
}
