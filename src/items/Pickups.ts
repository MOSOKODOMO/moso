/**
 * Pickups — physical loot in the world: consumables, equipment (with rarity
 * glow + name labels + legendary beams) and floor relics.
 * Walk close to collect; old drops despawn so farms never leak meshes.
 */
import * as THREE from 'three';
import { BASE_ITEMS, CONSUMABLES, RARITY_COLORS, type ConsumableId } from '../config/ItemDefs';
import { FLOOR_RELICS } from '../config/ItemDefs';
import type { ItemInstance } from './ItemInstance';
import { itemName, itemSlot, itemTier } from './ItemInstance';
import { makePotionTexture, makeRelicTexture, makeWeaponTexture } from '../rendering/SpriteFactory';
import {
  makeAccessoryIcon,
  makeArmorIcon,
  makeBeamTexture,
  makeBootsIcon,
  makeCampMealTexture,
  makeForgePowderTexture,
  makeGlowDiscTexture,
  makeIronShardTexture,
  makeLabelTexture,
  makeReturnStoneTexture,
  makeSpeedTonicTexture,
  makeTonicTexture,
} from '../rendering/StageSprites';
import { Z_LAYERS } from '../utils/Constants';
import { GameConfig } from '../config/GameConfig';

export type PickupKind = 'consumable' | 'equipment' | 'floorRelic';

export interface Pickup {
  kind: PickupKind;
  consumableId?: ConsumableId;
  item?: ItemInstance;
  floorRelicId?: string;
  x: number;
  baseY: number;
  group: THREE.Group;
  age: number;
  life: number;
  label: string;
  /** Voluntary drops return to the bag without auto-equipping or selling. */
  playerDropped?: boolean;
  collectAfter?: number;
  retryAt?: number;
}

const COLLECT_RADIUS = 1.4;
const PICKUP_LIFETIME = 60;

export class PickupManager {
  private readonly pickups: Pickup[] = [];
  private animT = 0;

  constructor(private readonly scene: THREE.Scene) {}

  get count(): number {
    return this.pickups.length;
  }

  /** Remove every drop (map switch). */
  clear(): void {
    for (let i = this.pickups.length - 1; i >= 0; i -= 1) this.removeAt(i);
  }

  private addBase(x: number, baseY: number, label: string): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, baseY, Z_LAYERS.effect);
    this.scene.add(group);
    return group;
  }

  private finish(
    group: THREE.Group,
    pickup: Omit<Pickup, 'group' | 'age' | 'life'>,
  ): void {
    this.pickups.push({ ...pickup, group, age: 0, life: PICKUP_LIFETIME });
  }

  private addItemMesh(group: THREE.Group, texture: THREE.Texture, size: number, yOff = 0): void {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
    );
    mesh.position.y = yOff;
    group.add(mesh);
  }

  /** Tinted ground ring so rarity reads at a glance. */
  private addGlow(group: THREE.Group, color: string, size = 1.3): void {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({
        map: makeGlowDiscTexture(),
        color,
        transparent: true,
        depthWrite: false,
      }),
    );
    mesh.position.y = -0.32;
    group.add(mesh);
  }

  /** Floating name plate (epic+ gear, relics). */
  private addLabel(group: THREE.Group, text: string, color: string): void {
    const tex = makeLabelTexture(text, color, 30);
    const aspect = (tex.image as HTMLCanvasElement).width / (tex.image as HTMLCanvasElement).height;
    const h = 0.42;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(h * aspect, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    mesh.position.y = 0.95;
    group.add(mesh);
  }

  /** Vertical light beam for legendary / relic moments. */
  private addBeam(group: THREE.Group, color: string): void {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 4.2),
      new THREE.MeshBasicMaterial({
        map: makeBeamTexture(),
        color,
        transparent: true,
        depthWrite: false,
      }),
    );
    mesh.position.y = 2.0;
    group.add(mesh);
  }

  dropConsumable(id: ConsumableId, x: number, y: number, playerDropped = false): void {
    const group = this.addBase(x, y + 0.4, CONSUMABLES[id].name);
    const tex =
      id === 'smallHP' || id === 'largeHP'
        ? makePotionTexture('hp')
        : id === 'smallMP' || id === 'largeMP'
          ? makePotionTexture('mp')
          : id === 'tonic'
            ? makeTonicTexture()
            : id === 'speedTonic' ? makeSpeedTonicTexture()
              : id === 'campMeal' ? makeCampMealTexture()
                : id === 'ironShard' ? makeIronShardTexture()
                  : id === 'forgePowder' ? makeForgePowderTexture()
                    : makeReturnStoneTexture();
    this.addItemMesh(group, tex, id === 'returnStone' ? 0.6 : 0.7);
    this.finish(group, { kind: 'consumable', consumableId: id, x, baseY: y + 0.4, label: CONSUMABLES[id].name, playerDropped, collectAfter: playerDropped ? 1.5 : 0 });
  }

  dropEquipment(item: ItemInstance, x: number, y: number, playerDropped = false): void {
    const def = BASE_ITEMS[item.baseId];
    const group = this.addBase(x, y + 0.5, itemName(item));
    const tex =
      def.slot === 'weapon'
        ? makeWeaponTexture(def.tier)
        : def.slot === 'armor'
          ? makeArmorIcon(def.tier)
          : def.slot === 'boots'
            ? makeBootsIcon(def.tier)
            : makeAccessoryIcon(def.tier);
    this.addItemMesh(group, tex, def.slot === 'weapon' ? 1.1 : 0.85);
    const color = RARITY_COLORS[item.rarity];
    if (item.rarity !== 'common') this.addGlow(group, color, item.rarity === 'legendary' ? 1.8 : 1.3);
    if (item.rarity === 'epic' || item.rarity === 'legendary') {
      this.addLabel(group, `${item.rarity.toUpperCase()} ${itemName(item)}`, color);
    }
    if (item.rarity === 'legendary') this.addBeam(group, color);
    this.finish(group, {
      kind: 'equipment',
      item,
      x,
      baseY: y + 0.5,
      label: `${item.rarity.toUpperCase()} ${itemName(item)}`,
      playerDropped,
      collectAfter: playerDropped ? 1.5 : 0,
    });
  }

  dropFloorRelic(id: string, x: number, y: number): void {
    const def = FLOOR_RELICS[id];
    const group = this.addBase(x, y + 0.5, def.name);
    this.addItemMesh(group, makeRelicTexture(def.color), 0.85);
    this.addGlow(group, def.color, 1.6);
    this.addLabel(group, def.name, def.color);
    this.addBeam(group, def.color);
    this.finish(group, { kind: 'floorRelic', floorRelicId: id, x, baseY: y + 0.5, label: def.name });
  }

  /** Bob pickups, expire old ones, collect nearby ones via callback. */
  update(dt: number, playerX: number, playerY: number, onCollect: (pickup: Pickup) => boolean): void {
    this.animT += dt;
    for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
      const p = this.pickups[i];
      p.age += dt;
      p.group.position.y = p.baseY + Math.sin(this.animT * 4 + p.x) * 0.12;
      // Blink during the last 5 seconds of life.
      const visible = p.life - p.age > 5 || Math.sin(this.animT * 12) > -0.2;
      p.group.visible = visible;
      const dx = playerX - p.x;
      const dy = playerY + 0.6 - p.group.position.y;
      if (p.age >= (p.collectAfter ?? 0) && p.age >= (p.retryAt ?? 0) && dx * dx + dy * dy <= COLLECT_RADIUS * COLLECT_RADIUS) {
        if (onCollect(p)) {
          this.removeAt(i);
          continue;
        }
        // A full bag keeps the actual item in the world; avoid a message every frame.
        p.retryAt = p.age + 1.5;
      }
      if (p.age >= p.life) this.removeAt(i);
    }
  }

  private removeAt(index: number): void {
    const p = this.pickups[index];
    this.scene.remove(p.group);
    p.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry.dispose();
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
    });
    this.pickups.splice(index, 1);
  }

  /** Keep drops inside the stage when spawning from a kill position. */
  static dropX(x: number, width: number = GameConfig.levelWidth): number {
    return Math.min(width - 1, Math.max(1, x + (Math.random() - 0.5) * 1.2));
  }
}

// Re-export slot helpers for Game-side labels.
export { itemSlot, itemTier };
