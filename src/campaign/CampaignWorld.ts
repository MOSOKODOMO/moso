import * as THREE from 'three';
import type { MapDef } from '../world/Maps';
import { makeLabelTexture, makePortalTexture } from '../rendering/StageSprites';
import { makeRelicTexture, makeGlowTexture } from '../rendering/SpriteFactory';

/** Small readable story markers and the village's visible protective crystal. */
export class CampaignWorld {
  private readonly group = new THREE.Group();
  private readonly markers = new Map<string, THREE.Mesh>();
  constructor(private readonly scene: THREE.Scene, map: MapDef, restored: boolean) {
    scene.add(this.group);
    const billboard = (texture: THREE.Texture, x: number, y: number, w: number, h: number): THREE.Mesh => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
      mesh.position.set(x, y, 0.3); this.group.add(mesh); return mesh;
    };
    for (const station of map.stations ?? []) {
      const marker = billboard(makeRelicTexture('#a7e5eb'), station.x, (station.y ?? 0) + 1.05, .58, .85);
      this.markers.set(station.id, marker);
      const texture = makeLabelTexture(station.label, '#d8edf1', 24);
      const canvas = texture.image as HTMLCanvasElement;
      billboard(texture, station.x, (station.y ?? 0) + 1.9, .45 * canvas.width / canvas.height, .45);
    }
    if (map.nextGateX) {
      billboard(makePortalTexture(), map.nextGateX, 1.35, 1.6, 2.7);
      const texture = makeLabelTexture(map.floorNumber === 8 ? 'ROYAL CORE' : 'ONWARD', '#ddc8ee', 24);
      const canvas = texture.image as HTMLCanvasElement;
      billboard(texture, map.nextGateX, 3, .45 * canvas.width / canvas.height, .45);
    }
    if (map.floorNumber === 0) {
      const glow = billboard(makeGlowTexture(), 10, 3.75, restored ? 3.2 : 1.1, restored ? 3.2 : 1.1);
      const material = glow.material as THREE.MeshBasicMaterial;
      material.color.set(restored ? '#fff0a6' : '#86a9b6'); material.opacity = restored ? .65 : .2;
      billboard(makeRelicTexture(restored ? '#fff2ba' : '#71868e'), 10, 3.75, .65, 1.05);
      const texture = makeLabelTexture(restored ? 'Village light restored' : 'Fading village crystal', restored ? '#ffe6a0' : '#b3c4ce', 22);
      const canvas = texture.image as HTMLCanvasElement;
      billboard(texture, 10, 4.7, .4 * canvas.width / canvas.height, .4);
    }
  }
  update(interactions: string[]): void {
    for (const [id, mesh] of this.markers) {
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.color.set(interactions.includes(id) ? '#7faf96' : '#ffffff');
      material.opacity = interactions.includes(id) ? .55 : 1;
    }
  }
  dispose(): void {
    this.scene.remove(this.group);
    this.group.traverse(node => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) { mesh.geometry.dispose(); const mat = mesh.material as THREE.MeshBasicMaterial; mat.map?.dispose(); mat.dispose(); }
    });
  }
}
