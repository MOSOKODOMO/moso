/** Late-game vent lesson: visible warnings, quiet intervals and a raised safe route. */
import * as THREE from 'three';
import type { MapDef } from './Maps';
import { Z_LAYERS } from '../utils/Constants';
import { roomStart } from '../campaign/RouteProgress';

interface Vent {
  x: number;
  phase: number;
  grate: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  flame: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  warning: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
}
export class EncounterHazards {
  private readonly group = new THREE.Group();
  private readonly vents: Vent[] = [];
  private disabled = false;
  private time = 0;
  private hitCooldown = 0;

  constructor(private readonly scene: THREE.Scene, map: MapDef) {
    scene.add(this.group);
    // No trap is ever constructed in either safe opening area.
    if (map.safe || map.floorNumber !== 6) return;
    [1, 3, 5, 6].map(i => roomStart(6, i) + 42).forEach((x, index) => {
      const grate = this.plane(1.6, .17, '#6f7881', x, .05);
      const warning = this.plane(2.05, .1, '#e6c580', x, .17);
      const flame = this.plane(1.5, 1.25, '#f5a956', x, .65);
      flame.material.opacity = .65; flame.visible = false;
      this.vents.push({ x, phase: index * 1.6, grate, warning, flame });
      for (const dx of [-.55, -.2, .2, .55]) this.plane(.09, .18, '#333b49', x + dx, .065);
    });
  }
  private plane(w: number, h: number, color: string, x: number, y: number): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
    mesh.position.set(x, y, Z_LAYERS.enemy - .2); this.group.add(mesh); return mesh;
  }
  setDisabled(disabled: boolean): void {
    this.disabled = disabled;
    for (const vent of this.vents) {
      vent.flame.visible = false; vent.warning.visible = !disabled;
      vent.grate.material.color.set(disabled ? '#81b79e' : '#6f7881');
    }
  }
  get isDisabled(): boolean { return this.disabled; }
  get activeVents(): number[] {
    return this.disabled ? [] : this.vents.filter(v => (this.time + v.phase) % 5.6 >= 4.4).map(v => v.x);
  }
  update(dt: number, playerX: number, playerY: number, onDamage: (power: number) => void): void {
    this.time += dt; this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    if (this.disabled) return;
    for (const vent of this.vents) {
      const phase = (this.time + vent.phase) % 5.6;
      const warming = phase >= 3 && phase < 4.4;
      const active = phase >= 4.4;
      vent.warning.material.opacity = warming ? .35 + .5 * (phase - 3) / 1.4 : .18;
      vent.warning.material.color.set(active ? '#f6b276' : '#e6c580');
      vent.flame.visible = active;
      vent.flame.scale.y = .9 + Math.sin(this.time * 15) * .1;
      if (active && this.hitCooldown <= 0 && Math.abs(playerX - vent.x) < .85 && playerY < 1.25 && playerY > -.3) {
        this.hitCooldown = 1.1; onDamage(15);
      }
    }
  }
  dispose(): void {
    this.scene.remove(this.group);
    for (const object of this.group.children) {
      const mesh = object as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
      mesh.geometry.dispose(); mesh.material.dispose();
    }
    this.vents.length = 0;
  }
}
