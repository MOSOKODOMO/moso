import * as THREE from 'three';
type Effect = { mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; life: number; duration: number; vx: number; vy: number; spin: number; grow: number };

/** Lightweight chalk bursts and dust; no simulation or damage logic lives here. */
export class CombatEffects {
  private effects: Effect[] = [];
  private textures = new Map<string, THREE.CanvasTexture>();
  get activeCount(): number { return this.effects.length; }
  constructor(private scene: THREE.Scene) {}
  private texture(key: string): THREE.CanvasTexture {
    const cached = this.textures.get(key); if (cached) return cached;
    const canvas = document.createElement('canvas'); canvas.width = 192; canvas.height = 128;
    const c = canvas.getContext('2d')!;
    if (key === 'slash') {
      c.strokeStyle = '#fff5c8'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.ellipse(90, 65, 80, 45, -.3, -.9, 2.1); c.stroke();
      c.strokeStyle = '#d6b76e'; c.lineWidth = 4; c.beginPath(); c.ellipse(90, 65, 64, 32, -.3, -.9, 2.1); c.stroke();
    } else if (key === 'dust') {
      const g = c.createRadialGradient(96, 64, 2, 96, 64, 55); g.addColorStop(0, '#e9d7bba8'); g.addColorStop(1, '#e9d7bb00'); c.fillStyle = g; c.fillRect(0, 0, 192, 128);
    } else if (key === 'spark') {
      c.translate(96, 64); c.beginPath();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 10 : 53; if (!i) c.moveTo(Math.cos(a) * r, Math.sin(a) * r); else c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.closePath(); c.fillStyle = '#fff3b3'; c.fill(); c.strokeStyle = '#b47c50'; c.lineWidth = 3; c.stroke();
    } else {
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 66px Trebuchet MS'; c.lineWidth = 8; c.strokeStyle = '#3d3c35'; c.strokeText(key, 96, 64); c.fillStyle = '#fff0bf'; c.fillText(key, 96, 64);
    }
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; this.textures.set(key, t); return t;
  }
  private spawn(key: string, x: number, y: number, w: number, h: number, duration: number, vx = 0, vy = 0, spin = 0, grow = 0): void {
    if (this.effects.length > 80) return;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: this.texture(key), transparent: true, depthWrite: false }));
    mesh.position.set(x, y, 6); this.scene.add(mesh); this.effects.push({ mesh, life: 0, duration, vx, vy, spin, grow });
  }
  impact(x: number, y: number, damage: number, direction: number, heavy = false): void {
    this.spawn(String(damage), x, y + 1.1, 1.65, 1.1, .7, direction * .5, 1.5);
    for (let i = 0; i < (heavy ? 8 : 5); i++) { const angle = (i / 7) * Math.PI * 2; this.spawn('spark', x, y, .5, .42, .25 + i * .02, Math.cos(angle) * (heavy ? 6 : 4), Math.sin(angle) * 4, (i % 2 ? 1 : -1) * 5); }
  }
  slash(x: number, y: number, direction: number, heavy: boolean): void {
    this.spawn('slash', x + direction * (heavy ? 1.65 : 1), y + 1.3, heavy ? 4 : 2.2, heavy ? 2.8 : 1.6, .17, direction * 1.3, 0, direction * 2);
    this.effects[this.effects.length - 1].mesh.scale.x = direction;
  }
  dust(x: number, y: number, strength = 1): void {
    for (let i = 0; i < 5; i++) this.spawn('dust', x + (i - 2) * .18, y + .12, .7, .4, .32, (i - 2) * strength, .3 + i * .08, 0, 1.7);
  }
  word(value:string,x:number,y:number):void { this.spawn(value,x,y,2.8,1,.65,0,1.3); }
  trail(x:number,y:number,direction:number):void { this.spawn('dust',x,y+1.1,1.8,2.2,.2,-direction*3,0,0,.5); }
  update(dt: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i]; e.life += dt;
      if (e.life >= e.duration) { this.scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); this.effects.splice(i, 1); continue; }
      e.mesh.position.x += e.vx * dt; e.mesh.position.y += e.vy * dt; e.mesh.rotation.z += e.spin * dt;
      e.mesh.material.opacity = 1 - e.life / e.duration;
      if (e.grow) e.mesh.scale.setScalar(1 + e.life * e.grow);
    }
  }
  clear(): void { for (const e of this.effects) { this.scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); } this.effects = []; }
}
