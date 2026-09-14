import * as THREE from 'three';
import { defaultAppearance, type CharacterAppearance } from './CharacterAppearance';
import { StudentSprite } from './StudioArt';

interface Classmate {
  art: StudentSprite;
  body: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  deskWork: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  appearance: CharacterAppearance;
  phase: number;
  reading: boolean;
}

/** Decorative classmates at the rear desks; deliberately absent from physics and combat. */
export class ClassroomStudents {
  private readonly group = new THREE.Group();
  private readonly classmates: Classmate[] = [];
  private readonly masks: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private lastPaint = -Infinity;

  constructor(scene: THREE.Scene, private readonly roomTexture: THREE.Texture) {
    const looks: Partial<CharacterAppearance>[] = [
      { sex: 'female', hairStyle: 'bob', hair: '#684735', skin: '#ebc4a0', outfit: 'varsity', outfitColour: '#83ad72', eyes: '#599077', accessory: 'none' },
      { sex: 'male', hairStyle: 'curly', hair: '#303333', skin: '#936341', outfit: 'classic', outfitColour: '#df9a75', eyeStyle: 'gentle', eyes: '#71503e', accessory: 'round-glasses' },
      { sex: 'female', hairStyle: 'ponytail', hair: '#ac7845', skin: '#f5dbb6', outfit: 'studio', outfitColour: '#6d9dc5', eyes: '#526e9f', accessory: 'none' },
    ];
    for (let n = 0; n < looks.length; n++) {
      const appearance = { ...defaultAppearance(), ...looks[n] };
      const art = new StudentSprite(); art.setAppearance(appearance);
      const body = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.67), new THREE.MeshBasicMaterial({ map: art.texture, transparent: true, depthWrite: false }));
      body.position.set([8.3, 16.4, 28.4][n], 8.35, -.9);
      const canvas = document.createElement('canvas'); canvas.width = 130; canvas.height = 165;
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
      const deskWork = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.67), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
      deskWork.position.set(body.position.x, body.position.y, -.6);
      this.group.add(body, deskWork);
      this.classmates.push({ art, body, deskWork, canvas, texture, appearance, phase: n * 1.8, reading: n === 1 });
    }

    // Measured tabletops from studio-background.png (1774×887). Sampling the original
    // pixels keeps legs behind desks without changing the painted furniture or loose props.
    for (const [left, top, right, bottom] of [[229, 509, 600, 670], [737, 504, 985, 670], [1405, 501, 1774, 675]]) {
      const x0 = left / 1774 * 32, x1 = right / 1774 * 32;
      const y0 = 18 - bottom / 887 * 18, y1 = 18 - top / 887 * 18;
      const geometry = new THREE.PlaneGeometry(x1 - x0, y1 - y0), uv = geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (x0 + uv.getX(i) * (x1 - x0)) / 32, (y0 + uv.getY(i) * (y1 - y0)) / 18);
      const mask = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: roomTexture, transparent: true, depthWrite: false }));
      mask.position.set((x0 + x1) / 2, (y0 + y1) / 2, -.75); this.masks.push(mask); this.group.add(mask);
    }
    this.group.visible = false; scene.add(this.group); this.paint(0);
  }

  /** The caller decides whether the studio is open on this day. */
  setVisible(visible: boolean): void { this.group.visible = visible; }

  update(time: number): void {
    if (!this.group.visible) return;
    const image = this.roomTexture.image as { width?: number; naturalWidth?: number } | undefined;
    for (const mask of this.masks) mask.visible = !!image && (image.naturalWidth ?? image.width ?? 0) > 0;
    if (time >= this.lastPaint && time - this.lastPaint < 1 / 16) return;
    this.lastPaint = time; this.paint(time);
  }

  private paint(time: number): void {
    for (let n = 0; n < this.classmates.length; n++) {
      const student = this.classmates[n], t = time + student.phase;
      student.art.paint(t, false, 'pen', 0, true, null, true, false);
      student.body.rotation.z = Math.sin(t * .9) * .008;
      const c = student.canvas.getContext('2d')!; c.clearRect(0, 0, 130, 165); c.lineJoin = 'round'; c.lineCap = 'round';
      const line = (d: string, color = '#5a554c', width = 1) => { c.strokeStyle = color; c.lineWidth = width; c.stroke(new Path2D(d)); };
      const path = (d: string, fill: string, stroke = '#686050', width = 1) => {
        const p = new Path2D(d); c.fillStyle = fill; c.fill(p); if (width) line(d, stroke, width);
      };
      const oval = (x: number, y: number, rx: number, ry: number, fill: string, stroke = '', width = 1) => {
        c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
        if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
      };
      if (student.reading) {
        const turn = Math.max(0, Math.sin(t * .7));
        // An open reference book is held above the table; page movement stays subtle.
        path('M38 105 Q53 99 65 104 Q81 99 95 104 L94 121 Q79 118 65 123 Q51 119 38 122Z', '#749586', '#4b6258', 1.3);
        path('M40 105 Q54 102 65 106 L65 120 Q53 117 40 119Z', '#eee2bf', '#bba982', .7);
        path('M65 106 Q80 102 93 105 L92 119 Q79 116 65 120Z', '#f8eacb', '#bba982', .7);
        line('M65 106 L65 120', '#ab9977', .75);
        line('M52 108 L60 108 M52 111 L61 112 M52 114 L59 114 M70 108 L79 107 M70 111 L79 111 M70 114 L77 114', '#9da68c', .75);
        if (turn > .75) path(`M65 106 Q${69 + turn * 5} 100 ${72 + turn * 5} 104 L${72 + turn * 3} 118 Q69 118 65 120Z`, '#f4e7c6', '#c2b18c', .55);
        oval(36.4, 120.4, 4.6, 4.6, student.appearance.skin, '#775c48', .75);
        oval(91.3, 121.8, 4.7, 4.6, student.appearance.skin, '#775c48', .75);
      } else {
        // Paper lies flat on the existing desk; the pen follows a small drafting stroke.
        path('M52 117 L99 116 L108 124 L49 125Z', n ? '#ccdbcb' : '#f0e4c4', '#9e9a7b', .8);
        line('M62 120 L70 118 L87 120 L81 123Z M70 118 L70 121 L81 123 M87 120 L87 122', n ? '#718f8c' : '#9a9e82', .75);
        if (n === 2) {
          path('M58 125 L100 124 L101 127 L58 128Z', '#cfb67b', '#9e8759', .6);
          for (let mark = 0; mark < 7; mark++) line(`M${63 + mark * 5} 126 L${63 + mark * 5} ${mark % 2 ? 127 : 127.5}`, '#8d7950', .45);
        }
        const hx = 91 + Math.sin(t * 3.7) * 1.3, hy = 121.6 + Math.sin(t * 2.1) * .4;
        line(`M${hx + 4} ${hy - 12} L${hx - 3} ${hy + 3}`, '#3d6460', 2.6);
        line(`M${hx + 3.8} ${hy - 11} L${hx + 1} ${hy - 5}`, '#c2ceb0', .7);
        path(`M${hx - 4} ${hy + 2} L${hx - 2} ${hy + 3} L${hx - 5} ${hy + 5}Z`, '#d2bb84', '#565a4b', .55);
        oval(hx, hy, 4, 3.6, student.appearance.skin, '#765d4c', .8);
        line(`M${hx - 1} ${hy - 1} L${hx - 1} ${hy + 1}`, '#a77960', .6);
      }
      student.texture.needsUpdate = true;
    }
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const student of this.classmates) {
      student.body.geometry.dispose(); student.body.material.dispose(); student.art.texture.dispose();
      student.deskWork.geometry.dispose(); student.deskWork.material.dispose(); student.texture.dispose();
    }
    for (const mask of this.masks) { mask.geometry.dispose(); mask.material.dispose(); }
    // The background texture remains owned by the game.
  }
}
