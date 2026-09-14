import * as THREE from 'three';
import type { CharacterAppearance } from './CharacterAppearance';
import { paintCharacter } from './CharacterRenderer';
import { paintItem } from './ItemArt';

// Coordinates follow the existing 32×18 apartment illustration, not the walking floor.
const BED_HEAD = { x: 7.8, y: 9.25, width: 2.75, height: 2.2 };
const ROOM_IMAGE_WIDTH = 1120, ROOM_IMAGE_HEIGHT = 630;

/** A portrait on the actual pillow, with the apartment's own duvet in front of it. */
export class DailyActivityVisuals {
  private readonly group = new THREE.Group();
  private readonly portrait = document.createElement('canvas');
  private readonly portraitTexture: THREE.CanvasTexture;
  private readonly head: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly blanket: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial>;
  private roomTexture: THREE.Texture | undefined;
  private started = false;

  constructor(scene: THREE.Scene) {
    this.portrait.width = 130; this.portrait.height = 104;
    this.portraitTexture = new THREE.CanvasTexture(this.portrait);
    this.portraitTexture.colorSpace = THREE.SRGBColorSpace;
    this.portraitTexture.minFilter = THREE.LinearFilter; this.portraitTexture.magFilter = THREE.LinearFilter;
    this.head = new THREE.Mesh(new THREE.PlaneGeometry(BED_HEAD.width, BED_HEAD.height),
      new THREE.MeshBasicMaterial({ map: this.portraitTexture, transparent: true, depthWrite: false }));
    this.head.position.set(BED_HEAD.x, BED_HEAD.y, -.4); this.head.rotation.z = Math.PI / 2;
    this.head.renderOrder = 3;

    // Re-use the painted blanket pixels exactly, including the irregular upper edge and folds.
    // Its UVs retain the room's coordinates, so the overlay has no rectangular patch or art seam.
    const edge = [[288,330],[295,319],[310,312],[328,307],[350,308],[371,303],[392,301],
      [404,298],[418,302],[433,300],[456,302],[480,306],[500,312],[520,320],[541,337],
      [551,365],[542,386],[532,397],[525,384],[494,382],[472,380],[446,383],[420,381],
      [398,382],[375,385],[353,382],[327,381],[309,383],[290,381]];
    const outline = new THREE.Shape();
    edge.forEach(([x,y], index) => {
      const wx = x / ROOM_IMAGE_WIDTH * 32, wy = 18 - y / ROOM_IMAGE_HEIGHT * 18;
      if (index) outline.lineTo(wx, wy); else outline.moveTo(wx, wy);
    }); outline.closePath();
    const geometry = new THREE.ShapeGeometry(outline), position = geometry.getAttribute('position');
    const uv: number[] = [];
    for (let n = 0; n < position.count; n++) uv.push(position.getX(n) / 32, position.getY(n) / 18);
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    this.blanket = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
    this.blanket.position.z = -.3; this.blanket.renderOrder = 4; this.blanket.visible = false;
    this.group.add(this.head, this.blanket); this.group.visible = false; scene.add(this.group);
  }

  get active(): boolean { return this.started; }

  /** Hide the normal walking sprite and shadow while this overlay is active. */
  startSleep(appearance: CharacterAppearance, apartmentTexture?: THREE.Texture): void {
    const source = document.createElement('canvas'); source.width = 130; source.height = 165;
    // The existing renderer has a closed-eye blink at this fixed time; all customization is preserved.
    paintCharacter(source.getContext('2d')!, appearance, .04, false, 'pen', 0, false, null,
      true, paintItem, false, false, undefined, false);
    const c = this.portrait.getContext('2d')!; c.clearRect(0, 0, 130, 104);
    // Only the head reaches the pillow. The standing torso, limbs and equipment never appear.
    c.drawImage(source, 0, 0, 130, 99, 0, 0, 130, 99);
    this.portraitTexture.needsUpdate = true;
    this.roomTexture = apartmentTexture;
    this.blanket.material.map = apartmentTexture ?? null; this.blanket.material.needsUpdate = true;
    this.started = true; this.group.visible = true; this.updateSleep(0, 0);
  }

  /** progress is 0–1; time is the game's running time in seconds. */
  updateSleep(progress: number, time: number): void {
    if (!this.started) return;
    const settled = Math.min(1, Math.max(0, progress) * 8);
    const breath = Math.sin(time * 2.1) * .007 * (.7 + settled * .3);
    this.head.position.set(BED_HEAD.x, BED_HEAD.y + breath * .7, -.4);
    this.head.scale.set(1 + breath, 1 + breath * .4, 1);
    this.head.rotation.z = Math.PI / 2 + Math.sin(time * 1.3) * .005;
    const image = this.roomTexture?.image as { width?: number; naturalWidth?: number } | undefined;
    this.blanket.visible = !!image && (image.naturalWidth ?? image.width ?? 0) > 0;
  }

  endSleep(): void {
    this.started = false; this.group.visible = false; this.head.scale.set(1, 1, 1);
  }

  dispose(): void {
    this.group.removeFromParent(); this.head.geometry.dispose(); this.head.material.dispose();
    this.blanket.geometry.dispose(); this.blanket.material.dispose(); this.portraitTexture.dispose();
    // The apartment texture is owned by the game and is deliberately not disposed here.
  }
}
