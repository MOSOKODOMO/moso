import * as THREE from 'three';
import { makeLabelTexture } from './StageSprites';

/** A shared, unmirrored name beneath the character's feet. */
export class WorldNameplate {
  private readonly sprite: THREE.Sprite;

  constructor(private readonly scene: THREE.Scene, name: string, color = '#fff3ce') {
    const texture = makeLabelTexture(name, color);
    const material = new THREE.SpriteMaterial({
      map: texture, transparent: true, depthTest: false, depthWrite: false,
    });
    this.sprite = new THREE.Sprite(material);
    this.sprite.name = `nameplate:${name}`;
    const canvas = texture.image as HTMLCanvasElement;
    this.sprite.scale.set(0.4 * canvas.width / canvas.height, 0.4, 1);
    this.sprite.renderOrder = 12;
    scene.add(this.sprite);
  }

  setPosition(x: number, feetY: number): void {
    this.sprite.position.set(x, feetY - 0.25, 2);
  }

  dispose(): void {
    this.scene.remove(this.sprite);
    this.sprite.material.map?.dispose();
    this.sprite.material.dispose();
  }
}
