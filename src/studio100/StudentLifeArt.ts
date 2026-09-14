import * as THREE from 'three';

/** A compact homework laptop in the same warm, outlined material palette as equipment. */
export function laptopTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 160;
  const c = canvas.getContext('2d')!;
  const ink = '#37433f'; c.lineCap = 'round'; c.lineJoin = 'round';
  const path = (d: string, fill: string | CanvasGradient, stroke = ink, width = 2.4) => {
    const p = new Path2D(d); c.fillStyle = fill; c.fill(p);
    if (width) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(p); }
  };
  const line = (d: string, colour = ink, width = 2) => {
    c.strokeStyle = colour; c.lineWidth = width; c.stroke(new Path2D(d));
  };
  const box = (x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, stroke = ink, width = 2.4) => {
    c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill();
    if (width) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  };
  const oval = (x: number, y: number, rx: number, ry: number, fill: string, stroke = '', width = 2) => {
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  };
  const shell = c.createLinearGradient(40, 8, 214, 147);
  shell.addColorStop(0, '#d6d9bd'); shell.addColorStop(.5, '#a8bda8'); shell.addColorStop(1, '#748f83');
  const screen = c.createLinearGradient(56, 20, 201, 104);
  screen.addColorStop(0, '#214d50'); screen.addColorStop(1, '#386c67');
  oval(133, 149, 110, 7, '#364d3926');

  // Screen frame and hinge sit above a shallow, beveled keyboard deck.
  box(42, 9, 171, 108, 8, shell); box(49, 17, 157, 92, 4, screen, '#526f65', 1.5);
  line('M50 13 L203 13', '#e8e7c9', 1.6); oval(128, 13, 1.4, 1.4, '#536e62');
  box(57, 110, 143, 8, 3, '#5b7669', ink, 1.6);

  // CAD viewport: a small axonometric building and a restrained tool palette.
  box(53, 21, 149, 8, 2, '#759b89', '', 0);
  for (let n = 0; n < 3; n++) oval(58 + n * 6, 25, 1.4, 1.4, n === 0 ? '#e2bd77' : '#c4d8b2');
  line('M167 25 L196 25', '#c6ddbc', 1.3);
  box(54, 32, 15, 69, 2, '#254d4c', '', 0);
  for (let n = 0; n < 5; n++) box(59, 37 + n * 12, 5, 5, 1, n === 1 ? '#dec28a' : '#789f8d', '', 0);
  for (let n = 0; n < 5; n++) line(`M${78 + n * 25} 94 L${103 + n * 18} 39`, '#68988d35', 1);
  for (let n = 0; n < 4; n++) line(`M77 ${48 + n * 15} L197 ${48 + n * 15}`, '#68988d35', 1);
  path('M96 77 L132 58 L174 72 L138 94Z', '#426f64', '#79b6a1', 1.3);
  path('M104 73 L104 52 L133 37 L133 64 L158 73 L158 85 L137 93Z', '#7d9f82', '#dce4b7', 1.6);
  path('M104 52 L133 37 L164 49 L137 66Z', '#b3bd91', '#e6dfb2', 1.7);
  path('M137 66 L164 49 L164 78 L137 93Z', '#527c6d', '#d3d9ac', 1.5);
  line('M104 62 L137 77 L164 61 M116 57 L116 78 M128 62 L128 84 M147 61 L147 87 M157 54 L157 82', '#b9d3aa', 1.2);
  line('M94 84 L128 99 M94 81 L94 87 M128 96 L128 102 M173 77 L185 72', '#e6be75', 1.1);
  path('M181 84 L181 93 L184 91 L187 96 L190 94 L187 89 L191 88Z', '#f4e8bd', '#467066', .8);

  // A warm ivory trackpad, individual keys and a polished front edge.
  path('M44 115 L211 115 L229 139 Q229 145 219 147 L31 147 Q21 144 23 139Z', shell);
  path('M23 139 L229 139 L229 143 Q225 148 217 148 L33 148 Q25 147 23 143Z', '#7c9483', ink, 1.8);
  line('M31 142 L217 142', '#dce0bd', 1.7);
  path('M54 119 L199 119 L207 132 L44 132Z', '#5c776b', '#799181', 1.4);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 13; col++) {
    const x = 57 + col * 10.7 - row * 3;
    box(x, 120 + row * 3.8, 7.5, 2.1, .5, '#b4c7a9', '', 0);
  }
  path('M110 134 L150 134 L153 138 L108 138Z', '#d5d8b7', '#8a9f87', .8);
  oval(210, 119, 1.6, 1, '#f0d495');

  // Everyday study supplies make the station readable without labels.
  c.save(); c.translate(16, 122); c.rotate(.58);
  box(-2.5, -23, 5, 41, 1.6, '#d9b26c', ink, 1.2);
  path('M-2.5 18 L2.5 18 L0 26Z', '#f3e3be', ink, 1); path('M-1 23 L1 23 L0 26Z', ink, ink, .5);
  box(-2.5, -26, 5, 6, 1.1, '#c38e81', ink, 1); line('M-1-17 L-1 14', '#f2d795', .8); c.restore();
  oval(240, 122, 8, 9, '#d9bf91', ink, 1.8); oval(240, 122, 4, 5, '#b4bea4', ink, 1);
  const mug = c.createLinearGradient(219, 111, 239, 139); mug.addColorStop(0, '#d9c7a0'); mug.addColorStop(1, '#9ba98c');
  box(218, 111, 21, 27, 5, mug, ink, 1.7); oval(228.5, 112, 10.5, 3.3, '#f0dec0', ink, 1.3);
  oval(228.5, 112, 7.5, 1.9, '#80604c'); line('M222 117 L222 129', '#efe0b9', 1.5);
  line('M228 105 Q224 101 228 96', '#e7d8b2aa', 1.7);

  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
  return texture;
}
