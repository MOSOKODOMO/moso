/**
 * NPC — simple stationary townsfolk with a floating name label.
 * Phase 2 ships one: MIRA, merchant/blacksmith of Meadow Outpost.
 */
import * as THREE from 'three';
import { makeMiraTexture } from '../rendering/StageSprites';
import { HERO_LAYOUT } from '../rendering/SpriteFactory';
import { WorldNameplate } from '../rendering/WorldNameplate';
import { Z_LAYERS } from '../utils/Constants';

export interface NPCDef {
  id: string;
  name: string;
  title: string;
  x: number;
}

export class NPC {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  private readonly group = new THREE.Group();
  private readonly nameplate: WorldNameplate;
  private animT = Math.random() * 10;

  constructor(private readonly scene: THREE.Scene, def: NPCDef) {
    this.id = def.id;
    this.name = def.name;
    this.x = def.x;

    const body = new THREE.Mesh(
      new THREE.PlaneGeometry(HERO_LAYOUT.body.width, HERO_LAYOUT.body.height),
      new THREE.MeshBasicMaterial({ map: makeMiraTexture(), transparent: true }),
    );
    body.position.y = HERO_LAYOUT.body.height / 2;
    this.group.add(body);
    this.group.position.set(def.x, 0, Z_LAYERS.enemy);
    scene.add(this.group);
    this.nameplate = new WorldNameplate(scene, def.name, '#ffd75e');
    this.nameplate.setPosition(def.x, 0);
  }

  update(dt: number): void {
    this.animT += dt;
    this.group.position.y = Math.sin(this.animT * 2) * 0.03;
  }

  dispose(): void {
    this.nameplate.dispose();
    this.scene.remove(this.group);
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry.dispose();
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
    });
  }
}
