/** Original canvas artwork for the outpost. All decoration is non-colliding. */
import * as THREE from 'three';

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function texture(w: number, h: number, paint: Painter): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  paint(ctx, w, h);
  const result = new THREE.CanvasTexture(canvas);
  result.colorSpace = THREE.SRGBColorSpace;
  result.magFilter = THREE.NearestFilter;
  result.minFilter = THREE.NearestFilter;
  result.generateMipmaps = false;
  return result;
}

function oval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Earth strata, hanging roots, and small stones; edges repeat horizontally. */
export function makeMeadowSoilTexture(): THREE.CanvasTexture {
  const result = texture(256, 128, (ctx, w, h) => {
    const earth = ctx.createLinearGradient(0, 0, 0, h);
    earth.addColorStop(0, '#aa754b');
    earth.addColorStop(0.3, '#885638');
    earth.addColorStop(1, '#4e3632');
    ctx.fillStyle = earth;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#365941';
    ctx.fillRect(0, 0, w, 9);
    ctx.fillStyle = '#557944';
    ctx.fillRect(0, 0, w, 4);
    for (let i = 0; i < 16; i += 1) {
      const x = i * 16 + 5;
      ctx.strokeStyle = i % 2 ? '#bd8c58' : '#6d4735';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 8);
      ctx.lineTo(x + 3, 17 + i % 4 * 3);
      ctx.lineTo(x - 2, 25 + i % 3 * 7);
      ctx.stroke();
    }
    for (let i = 0; i < 46; i += 1) {
      const x = (i * 71 + 13) % w;
      const y = 36 + (i * 31) % 85;
      const r = 2 + i % 3;
      oval(ctx, x, y, r + 2, r, i % 3 === 0 ? '#bd9166' : '#654736');
      ctx.fillStyle = '#ffffff12';
      ctx.fillRect(x - r, y - 1, r + 1, 1);
    }
  });
  result.wrapS = result.wrapT = THREE.RepeatWrapping;
  return result;
}

/** Rounded treetop silhouette with warm bark and broad shaded leaf clusters. */
export function makeMeadowTreeTexture(): THREE.CanvasTexture {
  return texture(256, 320, (ctx) => {
    oval(ctx, 130, 306, 60, 10, '#1f49392b');
    ctx.fillStyle = '#684735';
    ctx.beginPath();
    ctx.moveTo(116, 138);
    ctx.lineTo(144, 138);
    ctx.lineTo(150, 276);
    ctx.lineTo(171, 306);
    ctx.lineTo(138, 298);
    ctx.lineTo(129, 309);
    ctx.lineTo(120, 297);
    ctx.lineTo(94, 304);
    ctx.lineTo(113, 278);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3b4230';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = '#c48c54';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(123, 173);
    ctx.quadraticCurveTo(117, 246, 125, 286);
    ctx.stroke();
    ctx.strokeStyle = '#684735';
    ctx.lineWidth = 17;
    ctx.beginPath();
    ctx.moveTo(126, 223);
    ctx.lineTo(81, 158);
    ctx.moveTo(138, 202);
    ctx.lineTo(177, 142);
    ctx.stroke();

    const clusters: Array<[number, number, number, number]> = [
      [63, 148, 51, 43], [191, 141, 51, 47], [125, 163, 71, 49],
      [67, 95, 58, 55], [183, 84, 60, 55], [127, 62, 65, 54], [127, 112, 70, 60],
    ];
    for (const [x, y, rx, ry] of clusters) {
      oval(ctx, x, y, rx, ry, '#285642');
      oval(ctx, x, y - 4, rx - 4, ry - 5, '#4b8c4d');
      oval(ctx, x - 5, y - 10, rx - 10, ry - 13, '#6baa56');
      oval(ctx, x - 14, y - 18, rx * 0.52, ry * 0.36, '#9dcb6b');
    }
    for (let i = 0; i < 34; i += 1) {
      const angle = i * 2.399;
      const radius = 20 + (i * 17) % 81;
      const x = 127 + Math.cos(angle) * radius;
      const y = 100 + Math.sin(angle) * radius * 0.7;
      oval(ctx, x, y, 3 + i % 3, 2, i % 4 === 0 ? '#c2dd87' : '#8bbe66');
    }
    // Moss gathers at the roots.
    oval(ctx, 110, 301, 18, 6, '#527d43');
    oval(ctx, 148, 302, 20, 5, '#71994e');
  });
}

/** Small wildflowers, kept below the hero's silhouette. */
export function makeMeadowFlowersTexture(): THREE.CanvasTexture {
  return texture(192, 80, (ctx) => {
    for (let i = 0; i < 12; i += 1) {
      const x = 8 + i * 16;
      const top = 21 + (i * 13) % 33;
      ctx.strokeStyle = '#427544';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, 77);
      ctx.quadraticCurveTo(x - 5, 56, x, top);
      ctx.stroke();
      oval(ctx, x - 5, 61, 7, 3, '#78a650');
      const petal = ['#fff1c5', '#f3ba9e', '#c6c3ed'][i % 3];
      for (let p = 0; p < 5; p += 1) {
        const a = p * Math.PI * 2 / 5;
        oval(ctx, x + Math.cos(a) * 4, top + Math.sin(a) * 4, 3.4, 3.4, petal);
      }
      oval(ctx, x, top, 2.4, 2.4, '#e2ac45');
    }
  });
}

export function makeMeadowFenceTexture(): THREE.CanvasTexture {
  return texture(256, 96, (ctx, w) => {
    for (const y of [35, 65]) {
      ctx.fillStyle = '#684d35';
      ctx.fillRect(0, y, w, 13);
      ctx.fillStyle = '#ba9461';
      ctx.fillRect(0, y, w, 4);
    }
    for (let x = 8; x < w; x += 48) {
      ctx.fillStyle = '#684d35';
      ctx.beginPath();
      ctx.moveTo(x, 94);
      ctx.lineTo(x, 17);
      ctx.lineTo(x + 9, 7);
      ctx.lineTo(x + 18, 17);
      ctx.lineTo(x + 18, 94);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d0ab70';
      ctx.fillRect(x + 3, 20, 11, 71);
      ctx.fillStyle = '#b48b59';
      ctx.fillRect(x + 11, 21, 3, 70);
      ctx.fillStyle = '#5b6048';
      ctx.fillRect(x + 7, 39, 3, 3);
      ctx.fillRect(x + 7, 68, 3, 3);
    }
  });
}

/** Continuous pitched market roof: warm tiles, shaded far slope and attached eaves. */
export function makeMarketRoofTexture(): THREE.CanvasTexture {
  return texture(512, 128, (ctx) => {
    const roofFace = (): void => {
      ctx.beginPath();
      ctx.moveTo(8, 108);
      ctx.lineTo(235, 8);
      ctx.lineTo(269, 8);
      ctx.lineTo(504, 108);
      ctx.closePath();
    };

    // The fascia follows the lower edge of the roof, directly above the awning.
    ctx.fillStyle = '#684530';
    ctx.beginPath();
    ctx.moveTo(8, 107);
    ctx.lineTo(504, 107);
    ctx.lineTo(494, 119);
    ctx.lineTo(18, 119);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#a46f43';
    ctx.fillRect(20, 109, 472, 4);

    ctx.save();
    roofFace();
    ctx.clip();
    ctx.fillStyle = '#a06a3e';
    ctx.fillRect(0, 0, 512, 109);
    // Staggered rounded tiles keep the original ochre and copper palette.
    for (let row = 0; row < 7; row += 1) {
      const y = row * 17 - 7;
      const tileWidth = 22 + row * 2;
      const offset = row % 2 ? tileWidth / 2 : 0;
      for (let col = -1; col * tileWidth < 512; col += 1) {
        const x = col * tileWidth + offset;
        ctx.fillStyle = ['#c98f4e', '#b5773f', '#d19a58'][(col + row + 3) % 3];
        ctx.beginPath();
        ctx.moveTo(x + 1, y);
        ctx.lineTo(x + tileWidth - 1, y);
        ctx.lineTo(x + tileWidth - 1, y + 15);
        ctx.quadraticCurveTo(x + tileWidth / 2, y + 26, x + 1, y + 15);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#855632';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.strokeStyle = '#efc17c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 3);
        ctx.lineTo(x + 5, y + 12);
        ctx.stroke();
      }
    }

    // A small shaded far face gives the joined roof a consistent sense of depth.
    ctx.fillStyle = '#54382435';
    ctx.beginPath();
    ctx.moveTo(269, 8);
    ctx.lineTo(504, 108);
    ctx.lineTo(407, 108);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    roofFace();
    ctx.strokeStyle = '#70492f';
    ctx.lineWidth = 4;
    ctx.stroke();
    // Bargeboards track the actual slopes; only the short cap crosses the apex.
    ctx.beginPath();
    ctx.moveTo(10, 107);
    ctx.lineTo(235, 8);
    ctx.lineTo(269, 8);
    ctx.lineTo(502, 107);
    ctx.strokeStyle = '#e2b16e';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(270, 11);
    ctx.lineTo(407, 108);
    ctx.strokeStyle = '#9a653d';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(234, 8);
    ctx.lineTo(270, 8);
    ctx.strokeStyle = '#f0c383';
    ctx.lineWidth = 6;
    ctx.stroke();
  });
}

export function makeMarketAwningTexture(): THREE.CanvasTexture {
  return texture(320, 64, (ctx, w) => {
    ctx.fillStyle = '#334e43';
    ctx.fillRect(0, 4, w, 40);
    for (let x = 3, i = 0; x < w - 3; x += 39, i += 1) {
      ctx.fillStyle = i % 2 ? '#efdfb2' : '#518879';
      ctx.fillRect(x, 7, 38, 32);
      ctx.beginPath();
      ctx.arc(x + 19, 39, 19, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#ffffff24';
      ctx.fillRect(x + 3, 9, 31, 5);
    }
    ctx.fillStyle = '#d2b17c';
    ctx.fillRect(0, 3, w, 4);
  });
}

export function makeMarketLanternTexture(): THREE.CanvasTexture {
  return texture(80, 128, (ctx) => {
    const glow = ctx.createRadialGradient(40, 73, 5, 40, 73, 39);
    glow.addColorStop(0, '#ffe6a080');
    glow.addColorStop(1, '#ffe6a000');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 26, 80, 90);
    ctx.strokeStyle = '#4a5141';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(40, 33);
    ctx.stroke();
    ctx.fillStyle = '#495445';
    ctx.fillRect(23, 41, 34, 56);
    ctx.fillStyle = '#f0ca78';
    ctx.fillRect(28, 46, 24, 46);
    ctx.fillStyle = '#fff1b8';
    ctx.fillRect(31, 49, 8, 38);
    ctx.fillStyle = '#495445';
    ctx.fillRect(38, 44, 4, 50);
    ctx.fillRect(19, 39, 42, 7);
    ctx.fillRect(21, 93, 38, 7);
    ctx.beginPath();
    ctx.moveTo(20, 39);
    ctx.lineTo(40, 24);
    ctx.lineTo(60, 39);
    ctx.fill();
  });
}
