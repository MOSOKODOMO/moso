import type { CharacterAppearance } from './CharacterAppearance';
import type { Teacher } from './Teachers';
import type { Weapon } from './StudioState';

type Pose = 'uppercut' | 'kick' | 'dodge' | null;
type ToolPainter = (c: CanvasRenderingContext2D, kind: Weapon, x: number, y: number, scale?: number) => void;
type Look = CharacterAppearance & { coat?: string; glasses?: string; beard?: string };
const INK = '#352d3c';
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
  pose: Pose, emptyHands: boolean, tool: ToolPainter, instructor = false, clerk = false, teacher?: Teacher, showBackpack = !instructor && !clerk,
): void {
  const a: Look = { ...appearance };
  if (instructor && teacher) Object.assign(a, {
    hairStyle: teacher.hairStyle, hair: teacher.hair, skin: teacher.skin, coat: teacher.coat,
    glasses: teacher.glasses, beard: teacher.beard, outfit: 'classic', outfitColour: teacher.coat,
    accessory: 'none', eyeStyle: 'gentle', eyes: '#695548',
  });
  if (clerk) Object.assign(a, { sex: 'female', hairStyle: 'bob', hair: '#484153', skin: '#eed0ad',
    outfit: 'studio', outfitColour: '#9d87b1', accessory: 'none', eyeStyle: 'bright', eyes: '#8b69aa' });
  const skin = a.skin, skinShade = mix(skin, '#9a5a55', .22), skinLight = mix(skin, '#fff3dc', .28);
  const hair = a.hair, hairShade = mix(hair, '#2b203c', .27), hairLight = mix(hair, '#fff5de', .42);
  const cloth = a.outfitColour || '#6e94c5', clothShade = mix(cloth, '#30324a', .29), clothLight = mix(cloth, '#ffffff', .32);
  const outfit = a.outfit || 'campus', style = a.hairStyle, feminine = a.sex === 'female';
  const step = walking ? Math.sin(time * 12) : 0, bounce = walking ? -Math.abs(step) * 1.4 : Math.sin(time * 2.4) * .5;
  const sway = walking ? Math.sin(time * 8) * 2 : Math.sin(time * 2) * .65;

  const path = (d: string, fill: string | CanvasGradient, stroke = INK, width = 1.15) => {
    const p = shape(d); c.fillStyle = fill; c.fill(p);
    if (width) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(p); }
  };
  const line = (d: string, colour = INK, width = 1) => { c.strokeStyle = colour; c.lineWidth = width; c.stroke(shape(d)); };
  const oval = (x: number, y: number, rx: number, ry: number, fill: string, stroke = '', width = 1) => {
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  };
  const box = (x: number, y: number, w: number, h: number, r: number, fill: string, stroke = INK, width = 1) => {
    c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill();
    if (width) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  };
  const grad = (top: number, bottom: number, light: string, dark: string) => {
    const g = c.createLinearGradient(0, top, 0, bottom); g.addColorStop(0, light); g.addColorStop(1, dark); return g;
  };
  const hairFill = grad(22, 100, hairLight, hair);
  const dress = outfit === 'pinafore';
  const longPants = outfit === 'varsity' || outfit === 'studio' || outfit === 'classic';

  c.clearRect(0, 0, 130, 165); c.save(); c.translate(65, bounce); c.lineCap = 'round'; c.lineJoin = 'round';
  if (pose === 'dodge') { c.translate(0, 38); c.scale(1.06, .76); }

  // Lower the whole head assembly slightly so the neck stays short and natural.
  c.save(); c.translate(0, 3);
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

  const backpack = showBackpack && !instructor && !clerk;
  if (backpack) {
    // A compact pack behind the shoulder, with a gusset and zipped front pocket.
    line('M-24 102 Q-27 93-19 95 L-17 101', '#594c4b', 2.3);
    path('M-24 99 Q-31 100-32 108 L-32 125 Q-31 132-23 132 L-12 129 L-13 104 Q-15 98-24 99Z', grad(99, 133, '#b29876', '#786455'));
    path('M-28 103 Q-23 99-17 103 L-16 127 L-24 130 Q-29 128-29 123Z', '#a58b6d', '', 0);
    box(-31, 116, 14, 12, 3, '#8b735d', '#5b5050', .85);
    line('M-28 119 L-19 119', '#d4bc96', 1);
    line('M-20 119 L-20 122', '#e5c57f', 1.1);
    line('M-15 107 L-14 124', '#d0b58c', .8);
  }

  // The leg and shoe shapes have ankles, rounded toes and soles instead of rectangular blocks.
  const leg = (side: number) => {
    c.save(); c.translate(side * 9, seated ? 126 : 128);
    const kick = pose === 'kick' && side === 1;
    c.rotate(kick ? -1.12 : seated ? -side * .8 : side * step * .19);
    const lift = seated ? -2 : side * step * 2.8;
    c.translate(0, lift);
    path('M-6-3 L6-3 L5 22 Q2 25-4 22Z', longPants ? '#4c526d' : skin);
    if (longPants) {
      path('M-5-2 L-1-2 L-1 20 L-5 20Z', '#67718e', '', 0);
      line('M-5 18 L5 18', '#313c53', 1.2);
    } else {
      path('M-5 7 L-2 8 L-2 21 L-5 21Z', skinShade, '', 0);
      if (outfit !== 'street' && !dress) box(-5, 18, 10, 6, 1, '#fff9e9', '', 0);
    }
    const shoe = dress ? '#b68c58' : outfit === 'street' ? cloth : '#f6eee1';
    path(`M-6 ${dress ? 13 : 21} Q0 ${dress ? 12 : 20} 6 ${dress ? 14 : 21} L7 27 Q13 28 12 31 Q7 33-7 32 Q-9 29-6 ${dress ? 13 : 21}Z`, shoe);
    path('M-8 29 Q1 31 12 29 L12 32 L-7 33Z', dress ? '#6f5860' : '#c4bcc4', '', 0);
    line('M-4 25 L3 25 M-4 27 L4 27', dress ? '#efdfb6' : '#9a9ba9', .8);
    c.restore();
  };
  leg(-1); leg(1);

  // Hips and hem are drawn before the torso and the moving front hand.
  if (!dress) {
    path('M-16 121 L16 121 L17 135 L3 137 L0 129 L-3 137 L-17 135Z', longPants ? '#4c526d' : outfit === 'street' ? '#535c68' : '#5d83b8');
    line('M-14 132 L-5 133 M5 133 L14 132', '#a6bcce', 1.2);
    line('M0 126 L0 131', '#344455', .9);
  }

  const arm = (front: boolean) => {
    const poke = front && weapon === 'pen' && attack && !pose && !emptyHands ? Math.sin(attack * Math.PI) : 0;
    const angle = front ? pose === 'uppercut' ? -2.35 : pose === 'kick' ? .6 : poke ? -.14 - poke * .35 : attack ? -1.05 + attack * 2.1 : -.14 : .17 + step * .13;
    c.save(); c.translate(front ? 17 + poke * 2 : -18, 106 - poke); c.rotate(angle);
    const sleeve = outfit === 'varsity' || outfit === 'classic' || outfit === 'street';
    path(front ? 'M-2-6 Q7-7 9 0 L13 12 Q13 18 6 18 Q2 18 1 12 L-5 3Z' : 'M-3-6 Q-9-5-10 3 L-12 14 Q-10 20-4 17 L3 2Z', sleeve ? outfit === 'varsity' ? '#fbefdc' : cloth : skin);
    if (!sleeve) path(front ? 'M7 0 Q12 8 11 14 L8 14 Q8 7 5 3Z' : 'M-9 1 L-10 12 L-7 12 L-6 1Z', skinShade, '', 0);
    if (sleeve) { line(front ? 'M3 11 L11 10' : 'M-11 11 L-5 12', outfit === 'varsity' ? cloth : clothLight, 2); }
    if (front) {
      if (!pose && !emptyHands && !clerk) {
        c.save(); c.translate(7, 17);
        // Each native grip point sits under the fingers. Pointed tools face outwards.
        if (weapon === 'cup') {
          c.rotate(-angle - .06); c.scale(-1, 1);
          tool(c, weapon, -24 * .29, -.29, .29);
        } else if (weapon === 'ruler') {
          c.rotate((attack ? .55 + attack : .88) - angle);
          tool(c, weapon, 0, -48 * .32, .32);
        } else {
          c.rotate((attack ? -Math.PI / 2 + .12 : -1.12) - angle);
          tool(c, weapon, 0, 43 * .32, .32);
        }
        c.restore();
      }
      if (clerk) { c.save(); c.translate(9, 13); c.rotate(-.2); box(-5, -4, 13, 18, 1.5, '#e7d5b2'); line('M-2 1 L5 1 M-2 4 L4 4', '#9c866d', .8); c.restore(); }
      oval(7, 17, 5.4, 5.3, skin, INK, 1.1); line('M4 16 L4 18', skinShade, .8);
      oval(5.4, 14.5, 1.9, 1.1, skinLight);
    } else { oval(-8, 16, 5, 5.3, skin, INK, 1.1); oval(-9, 14, 1.6, 1, skinLight); }
    c.restore();
  };
  arm(false);
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
    line('M-13 101 Q-11 110-13 125 M13 102 Q15 111 13 124', '#6d6156', 3.1);
    line('M-13 102 Q-12 110-13 123 M13 103 Q14 111 13 122', '#c4ad88', 1.25);
    box(-14.5, 118, 3, 4, .8, '#dfc791', '', 0);
    box(11.5, 118, 3, 4, .8, '#dfc791', '', 0);
  }

  c.save(); c.translate(0, 3);
  // Face: soft cheek curve, warm edge shading, small chin and expressive oval irises.
  const head = 'M-28 48 Q-29 34 0 33 Q30 35 29 52 L28 72 Q26 84 13 90 Q0 97-14 90 Q-27 85-29 72Z';
  if (style !== 'bald') path('M-32 66 Q-40 35-20 21 Q-3 11 17 21 Q39 29 35 63 L28 76 L-29 77Z', hairShade);
  oval(-28, 71, 5.2, 7.2, skin, INK, 1); oval(28, 71, 5.2, 7.2, skin, INK, 1);
  line('M-30 69 Q-26 67-26 73 M30 69 Q26 67 26 73', skinShade, 1);
  path(head, grad(45, 95, skinLight, skin));
  path('M-28 61 Q-27 81-15 87 Q0 95 16 88 Q1 99-16 91 Q-29 84-29 72Z', skinShade, '', 0);
  oval(-19, 81.5, 5.7, 2.6, mix(skin, '#e08088', .34)); oval(21, 81.5, 5.7, 2.6, mix(skin, '#e08088', .34));
  const blink = time > 0 && !attack && !pose && Math.floor(time * 24) % 113 < 3;
  const eyeStyle = a.eyeStyle || 'bright', iris = a.eyes || '#6681a3';
  for (const side of [-1, 1]) {
    c.save(); c.translate(side * 12.5, 68.3);
    const fierce = eyeStyle === 'fierce', sleepy = eyeStyle === 'sleepy', gentle = eyeStyle === 'gentle';
    if (blink) line('M-5 2 Q0 4 5 2', '#49323d', 1.5);
    else {
      const eye = fierce ? 'M-5-4 Q0-4 6-7 L6 5 Q0 10-5 5Z' : sleepy ? 'M-6-2 L6-2 L5 6 Q0 10-5 6Z' : gentle ? 'M-6-4 Q0-9 6-3 L5 6 Q0 11-5 6Z' : 'M-6-5 Q0-10 6-5 L6 5 Q0 11-5 6Z';
      path(eye, '#fff9ef', '#7c5b62', .6);
      c.save(); c.clip(shape(eye));
      oval(1, 1.7, gentle ? 3.8 : 4.5, sleepy ? 7 : 8.2, iris);
      oval(1, -.4, 3.2, 5.8, '#303044');
      path('M-2 5 Q1 9 4 5 Q4 9 1 9 Q-2 9-2 5Z', mix(iris, '#ffefb7', .52), '', 0);
      oval(-.2, -3, 1.85, 2.1, '#fffdf6'); oval(3, 3.9, .85, 1.05, '#ffffff'); c.restore();
      line(fierce ? 'M-6-5 L6-7' : sleepy ? 'M-6-2 L6-2' : gentle ? 'M-6-4 Q0-9 6-3' : 'M-6-5 Q0-10 6-5', '#372c3e', feminine ? 1.55 : 1.3);
      if (feminine) line(side === -1 ? 'M-6-4 L-8-6' : 'M6-4 L8-6', '#372c3e', 1.1);
      line('M-3 8 Q0 9 3 8', '#956c6b', .55);
    }
    line(fierce ? 'M-5-12 L4-10' : gentle ? 'M-5-11 Q0-14 5-11' : 'M-5-12 Q0-14 4-12', hairShade, 1.15);
    c.restore();
  }
  line('M1 79 Q3 80 4 79', skinShade, .8);
  if (attack || pose === 'uppercut') path('M-2 84 Q3 82 7 84 Q6 91 2 90 Q-1 89-2 84Z', '#835061', INK, .8);
  else line('M-2 85 Q2 88 6 85', '#89575b', 1);

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
    if (glasses === 'round') { oval(-12.5, 69.5, 10, 10, '#ffffff08', colour, 1.25); oval(12.5, 69.5, 10, 10, '#ffffff08', colour, 1.25); }
    else { box(-23, 61, 21, 17, 3.5, '#ffffff08', colour, 1.25); box(3, 61, 21, 17, 3.5, '#ffffff08', colour, 1.25); }
    line('M-3 68 Q0 66 3 68 M-23 65 L-28 63 M24 65 L29 63', colour, 1.2);
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
  c.restore();
  arm(true);
  if (seated) {
    path('M-15 127 L0 126 L15 127 L16 136 L1 135 L-16 136Z', '#f4e4c7');
    line('M0 128 L1 134 M-12 130 L-3 129 M4 129 L12 130', '#c2ad91', .8);
  }
  c.restore();
}
