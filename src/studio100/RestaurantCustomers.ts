import * as THREE from 'three';
import { defaultAppearance, type CharacterAppearance } from './CharacterAppearance';
import { StudentSprite } from './StudioArt';

interface Customer {
  art: StudentSprite;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  dining: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  appearance: CharacterAppearance;
  phase: number;
}

/** Two background students share the restaurant's existing tables and stools. */
export class RestaurantCustomers {
  private readonly group = new THREE.Group();
  private readonly customers: Customer[] = [];
  private readonly tableMasks: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private lastPaint = -Infinity;

  constructor(scene: THREE.Scene, private roomTexture?: THREE.Texture) {
    const looks: Partial<CharacterAppearance>[] = [
      { sex: 'female', hairStyle: 'ponytail', hair: '#705147', skin: '#e7bc95', outfit: 'varsity', outfitColour: '#8b9f80', eyes: '#726448', accessory: 'none' },
      { sex: 'male', hairStyle: 'short', hair: '#393b3f', skin: '#c79872', outfit: 'campus', outfitColour: '#bc9273', eyes: '#786456', accessory: 'none' },
    ];
    for (let n = 0; n < 2; n++) {
      const appearance = { ...defaultAppearance(), ...looks[n] };
      const art = new StudentSprite(); art.setAppearance(appearance);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.79), new THREE.MeshBasicMaterial({ map: art.texture, transparent: true, depthWrite: false }));
      mesh.position.set(n ? 12 : 7.7, 10.25, .2);
      const canvas = document.createElement('canvas'); canvas.width = 130; canvas.height = 165;
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
      const dining = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.79), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
      dining.position.set(mesh.position.x, mesh.position.y, .5);
      this.group.add(mesh, dining); this.customers.push({ art, mesh, dining, canvas, texture, appearance, phase: n * 2.3 });
    }

    // These rectangles copy the original painted tables exactly in front of the sitting legs.
    // Global room UVs preserve every wood grain, stool and table edge without changing the raster.
    for (const [left, top, right, bottom] of [[210, 292, 348, 401], [368, 291, 487, 401]]) {
      const x0 = left / 1120 * 32, x1 = right / 1120 * 32;
      const y0 = 18 - bottom / 630 * 18, y1 = 18 - top / 630 * 18;
      const geometry = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
      const uv = geometry.getAttribute('uv');
      for (let n = 0; n < uv.count; n++) uv.setXY(n, (x0 + uv.getX(n) * (x1 - x0)) / 32, (y0 + uv.getY(n) * (y1 - y0)) / 18);
      const mask = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: roomTexture ?? null, transparent: true, depthWrite: false }));
      mask.position.set((x0 + x1) / 2, (y0 + y1) / 2, .35);
      this.tableMasks.push(mask); this.group.add(mask);
    }
    this.group.visible = false; scene.add(this.group); this.paint(0);
  }

  setVisible(visible: boolean): void { this.group.visible = visible; }

  update(time: number): void {
    if (!this.group.visible) return;
    const image = this.roomTexture?.image as { width?: number; naturalWidth?: number } | undefined;
    for (const mask of this.tableMasks) mask.visible = !!image && (image.naturalWidth ?? image.width ?? 0) > 0;
    if (time - this.lastPaint < 1 / 18) return;
    this.lastPaint = time; this.paint(time);
  }

  private paint(time: number): void {
    for (let n = 0; n < this.customers.length; n++) {
      const guest = this.customers[n], t = time + guest.phase;
      const bite = Math.max(0, Math.sin(t * 1.2));
      const attack = bite > .35 ? .18 + bite * .09 : 0;
      guest.art.paint(t, false, 'pen', attack, true, null, true, false);
      const c = guest.canvas.getContext('2d')!; c.clearRect(0, 0, 130, 165); c.lineCap = 'round'; c.lineJoin = 'round';
      const path = (d: string, fill: string, stroke = '#574a3f', width = 1) => {
        const p = new Path2D(d); c.fillStyle = fill; c.fill(p); if (width) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(p); }
      };
      const line = (d: string, color: string, width = 1) => { c.strokeStyle = color; c.lineWidth = width; c.stroke(new Path2D(d)); };
      const oval = (x: number, y: number, rx: number, ry: number, fill: string, stroke = '', width = 1) => {
        c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
        if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
      };

      // The bowl's base rests on the painted tabletop at world y≈9.57.
      oval(100, 123.4, 10, 1.8, '#35362d35');
      path('M85 111 Q87 120 96 123 L104 123 Q113 120 115 111Z', n ? '#b9cec1' : '#e7d7b9');
      line('M89 116 Q100 121 111 116', n ? '#688d83' : '#759795', 1.8);
      oval(100, 111.2, 15, 4.2, '#f1e3c5', '#61564b', 1);
      oval(100, 111, 12, 2.8, '#b8794d');
      line('M91 111 Q94 107 97 112 Q100 108 103 111 Q108 107 109 112', '#efd494', 1.3);
      oval(106, 110, 2, 1, '#82a369'); oval(94, 110.5, 2.2, 1.2, '#d69362');
      for (let plume = 0; plume < 2; plume++) {
        const rise = (t * .27 + plume * .5) % 1, drift = Math.sin(t + plume) * 2;
        c.globalAlpha = Math.sin(rise * Math.PI) * .5;
        line(`M${96 + plume * 7} ${105 - rise * 9} Q${92 + plume * 7 + drift} ${100 - rise * 9} ${98 + plume * 7 + drift} ${96 - rise * 9}`, '#f6e0b8', 1.3);
      } c.globalAlpha = 1;

      // Use the renderer's arm transform so chopsticks stay inside the front fist.
      const angle = attack ? -1.05 + attack * 2.1 : -.14;
      const hx = 82 + 7 * Math.cos(angle) - 17 * Math.sin(angle);
      const hy = 106 + 7 * Math.sin(angle) + 17 * Math.cos(angle) + Math.sin(t * 2.4) * .5;
      const lift = Math.max(0, (bite - .35) / .65);
      const tipX = 106 + (78 - 106) * lift, tipY = 109 + (88 - 109) * lift;
      const dx = tipX - hx, dy = tipY - hy;
      line(`M${hx - dx * .22} ${hy - dy * .22} L${tipX} ${tipY}`, '#7a5137', 1.4);
      line(`M${hx - dx * .22 + 2} ${hy - dy * .22} L${tipX + 2} ${tipY + 1}`, '#ba8b50', 1.2);
      if (lift > .25) line(`M${tipX} ${tipY} Q${tipX + 6} ${tipY + 5} ${tipX + 3} ${tipY + 9}`, '#e6cc83', 1);
      oval(hx, hy, 4.6, 4.4, guest.appearance.skin, '#5d4c46', .8);
      line(`M${hx - 2} ${hy} L${hx - 2} ${hy + 2}`, '#bb8b72', .65);
      guest.texture.needsUpdate = true;
    }
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const guest of this.customers) {
      guest.mesh.geometry.dispose(); guest.mesh.material.dispose(); guest.art.texture.dispose();
      guest.dining.geometry.dispose(); guest.dining.material.dispose(); guest.texture.dispose();
    }
    for (const mask of this.tableMasks) { mask.geometry.dispose(); mask.material.dispose(); }
    // The supplied room texture is shared with the game's background.
  }
}
