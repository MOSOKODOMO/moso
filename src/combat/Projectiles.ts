/**
 * Projectiles — Magic Bolt orbs. Fly straight, hit the first monster in the
 * path, then despawn. Damage is pre-rolled at cast time (incl. crits).
 */
import * as THREE from 'three';
import type { CombatTarget } from '../combat/CombatSystem';
import { makeBoltTexture } from '../rendering/SpriteFactory';
import { Z_LAYERS } from '../utils/Constants';

interface Bolt {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  vx: number;
  damage: number;
  isCrit: boolean;
  knockDir: number;
  life: number;
  maxLife: number;
}

const HIT_HALF_WIDTH = 0.6;
const HIT_HALF_HEIGHT = 1.0;

export class ProjectileManager {
  private readonly bolts: Bolt[] = [];
  private readonly texture: THREE.Texture;

  constructor(private readonly scene: THREE.Scene, customTexture?: THREE.Texture) {
    this.texture = customTexture ?? makeBoltTexture();
  }

  clear(): void {
    for (const bolt of this.bolts) {
      this.scene.remove(bolt.mesh);
      bolt.mesh.geometry.dispose();
      (bolt.mesh.material as THREE.Material).dispose();
    }
    this.bolts.length = 0;
  }

  fire(x: number, y: number, facing: number, speed: number, range: number, damage: number, isCrit: boolean): void {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.6),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, depthWrite: false }),
    );
    mesh.position.set(x, y, Z_LAYERS.effect);
    mesh.scale.x = facing;
    this.scene.add(mesh);
    this.bolts.push({
      mesh,
      vx: facing * speed,
      damage,
      isCrit,
      knockDir: facing,
      life: 0,
      maxLife: range / speed,
    });
  }

  update(
    dt: number,
    targets: CombatTarget[],
    onHit: (target: CombatTarget, damage: number, isCrit: boolean) => void,
  ): void {
    for (let i = this.bolts.length - 1; i >= 0; i -= 1) {
      const bolt = this.bolts[i];
      bolt.life += dt;
      bolt.mesh.position.x += bolt.vx * dt;
      bolt.mesh.rotation.z = Math.sin(bolt.life * 20) * 0.15;
      let consumed = bolt.life >= bolt.maxLife;
      if (!consumed) {
        for (const target of targets) {
          if (!target.isAlive()) continue;
          const dx = Math.abs(target.getCenterX() - bolt.mesh.position.x);
          const dy = Math.abs(target.getCenterY() - bolt.mesh.position.y);
          if (dx <= HIT_HALF_WIDTH && dy <= HIT_HALF_HEIGHT) {
            target.applyHit(bolt.damage, bolt.isCrit, bolt.knockDir);
            onHit(target, bolt.damage, bolt.isCrit);
            consumed = true;
            break;
          }
        }
      }
      if (consumed) {
        this.scene.remove(bolt.mesh);
        bolt.mesh.geometry.dispose();
        bolt.mesh.material.dispose();
        this.bolts.splice(i, 1);
      }
    }
  }
}
