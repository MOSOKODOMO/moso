/**
 * PlayerAppearance — layered character renderer.
 *
 * THE equipment-visual contract: the hero is a group of INDEPENDENT layers
 *   - bodyMesh    (torso + head, tinted by armor tier)
 *   - helmetMesh  (separate overlay, style grows with armor tier)
 *   - weaponPivot → weaponMesh (separate layer, style grows with weapon tier)
 *
 * Upgrading gear = swapping a layer's texture. Later phases replace the
 * procedural textures with real art; this class's API stays the same.
 */
import * as THREE from 'three';
import { Z_LAYERS } from '../utils/Constants';
import { clamp, lerp } from '../utils/MathUtils';
import { WorldNameplate } from '../rendering/WorldNameplate';
import {
  HERO_HAND_POSITION,
  HERO_LAYOUT,
  enhancementStrength,
  makeArmorEnhancementTexture,
  makeEnhancementSparkleTexture,
  makeHelmetTexture,
  makePlayerBodyTexture,
  makeSwordEnhancementTexture,
  makeWeaponTexture,
  SWORD_CENTER,
  SWORD_ENHANCEMENT_LAYOUT,
  SWORD_IDLE_ANGLE,
} from '../rendering/SpriteFactory';

const SWING_DURATION = 0.18;
const HURT_FLASH_DURATION = 0.25;

export class PlayerAppearance {
  readonly root = new THREE.Group();
  private readonly nameplate: WorldNameplate;

  private bodyMat!: THREE.MeshBasicMaterial;
  private helmetMat!: THREE.MeshBasicMaterial;
  private weaponMat!: THREE.MeshBasicMaterial;
  private weaponPivot!: THREE.Group;
  private swordGlow!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private armorGlow!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly sparkles: Array<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>> = [];

  private weaponTier = 1;
  private armorTier = 1;
  private bootsTier = 1;
  private weaponEnhancement = 0;
  private armorEnhancement = 0;
  private effectTime = 0;
  private swingT = 1; // 0..1, 1 = idle
  private flashT = 0;
  private bobTime = 0;
  private moving = false;
  private airborne = false;
  private berserk = false;
  private inner!: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.build();
    scene.add(this.root);
    const name = document.getElementById('character-name')?.textContent?.trim() || 'Adventurer';
    this.nameplate = new WorldNameplate(scene, name);
  }

  // --- Equipment API (called by EquipmentManager in later phases) ---

  setWeaponTier(tier: number): void {
    const clamped = clamp(Math.round(tier), 1, 8);
    if (clamped === this.weaponTier && this.weaponMat) return;
    this.weaponTier = clamped;
    const old = this.weaponMat.map;
    this.weaponMat.map = makeWeaponTexture(clamped);
    this.weaponMat.needsUpdate = true;
    if (old) old.dispose();
  }

  setArmorTier(tier: number): void {
    const clamped = clamp(Math.round(tier), 0, 8);
    if (clamped === this.armorTier && this.bodyMat) return;
    this.armorTier = clamped;
    const oldBody = this.bodyMat.map;
    const oldHelm = this.helmetMat.map;
    this.bodyMat.map = makePlayerBodyTexture(clamped, {}, this.bootsTier);
    this.helmetMat.map = makeHelmetTexture(clamped);
    this.bodyMat.needsUpdate = true;
    this.helmetMat.needsUpdate = true;
    if (oldBody) oldBody.dispose();
    if (oldHelm) oldHelm.dispose();
    const oldGlow = this.armorGlow.material.map;
    this.armorGlow.material.map = makeArmorEnhancementTexture(clamped);
    this.armorGlow.material.needsUpdate = true;
    oldGlow?.dispose();
    this.armorGlow.visible = clamped > 0 && this.armorEnhancement > 0;
  }

  /** Footwear follows its own equipped slot, independently of chest armor. */
  setBootsTier(tier: number): void {
    const clamped = clamp(Math.round(tier), 0, 8);
    if (clamped === this.bootsTier) return;
    this.bootsTier = clamped;
    const oldBody = this.bodyMat.map;
    this.bodyMat.map = makePlayerBodyTexture(this.armorTier, {}, this.bootsTier);
    this.bodyMat.needsUpdate = true;
    oldBody?.dispose();
  }

  /** Enhancement is independent of material tier and item rarity. */
  setEnhancement(weaponLevel: number, armorLevel: number): void {
    this.weaponEnhancement = enhancementStrength(weaponLevel);
    this.armorEnhancement = enhancementStrength(armorLevel);
    this.swordGlow.visible = this.weaponEnhancement > 0;
    this.armorGlow.visible = this.armorTier > 0 && this.armorEnhancement > 0;
    this.swordGlow.material.opacity = 0.07 + 0.5 * this.weaponEnhancement ** 2;
    this.armorGlow.material.opacity = 0.025 + 0.18 * this.armorEnhancement ** 2;
    for (const sparkle of this.sparkles) sparkle.visible = false;
  }

  // --- Animation triggers ---

  setFacing(dir: number): void {
    this.root.scale.x = dir >= 0 ? 1 : -1;
  }

  setMoving(moving: boolean): void {
    this.moving = moving;
  }

  /** Jump pose leans the body; the resting blade stays upright. */
  setAirborne(airborne: boolean): void {
    this.airborne = airborne;
  }

  playSwing(): void {
    this.swingT = 0;
  }

  playHurt(): void {
    this.flashT = HURT_FLASH_DURATION;
  }

  /** Berserk tint (persistent red while raging). */
  setBerserk(on: boolean): void {
    this.berserk = on;
  }

  syncPosition(x: number, feetY: number): void {
    this.root.position.set(x, feetY, Z_LAYERS.player);
    this.nameplate.setPosition(x, feetY);
  }

  update(dt: number): void {
    // Body bounce/lean never drags the resting blade away from vertical.
    this.bobTime += dt * (this.moving ? 11 : 4);
    const bob = this.moving ? Math.abs(Math.sin(this.bobTime)) * 0.07 : Math.sin(this.bobTime) * 0.02;
    this.inner.position.y = bob;
    const lean = this.airborne ? -0.13 : this.moving ? 0.05 : 0;
    this.inner.rotation.z = lerp(this.inner.rotation.z, lean, Math.min(1, dt * 8));

    // Intentional attack only: a downward cut and recovery share the existing
    // swing duration. Every pose rotates around the original drawn hand.
    let bladeAngle = SWORD_IDLE_ANGLE;
    if (this.swingT < 1) {
      this.swingT = Math.min(1, this.swingT + dt / SWING_DURATION);
      if (this.swingT < 0.72) {
        const cut = this.swingT / 0.72;
        bladeAngle = lerp(SWORD_IDLE_ANGLE, -0.85, 1 - Math.pow(1 - cut, 2));
      } else {
        const recover = (this.swingT - 0.72) / 0.28;
        bladeAngle = lerp(-0.85, SWORD_IDLE_ANGLE, recover * recover * (3 - 2 * recover));
      }
    }
    this.weaponPivot.rotation.z = bladeAngle - this.inner.rotation.z;

    // Hurt flash / berserk rage: tint all layers red.
    if (this.flashT > 0) this.flashT -= dt;
    const tint = this.flashT > 0 || this.berserk ? 0xff7070 : 0xffffff;
    this.bodyMat.color.setHex(tint);
    this.helmetMat.color.setHex(tint);
    this.weaponMat.color.setHex(tint);

    this.effectTime += dt;
    const pulse = 0.94 + Math.sin(this.effectTime * 2.3) * 0.06;
    this.swordGlow.material.opacity = (0.07 + 0.5 * this.weaponEnhancement ** 2) * pulse;
    this.armorGlow.material.opacity = (0.025 + 0.18 * this.armorEnhancement ** 2) * pulse;
    this.sparkles.forEach((sparkle, index) => {
      const threshold = index === 0 ? 0.5 : 0.8;
      const amount = Math.max(0, (this.weaponEnhancement - threshold) / (1 - threshold));
      const twinkle = Math.max(0, Math.sin(this.effectTime * 2.8 + index * 2.8)) ** 8;
      sparkle.visible = amount > 0 && twinkle > 0.03;
      sparkle.material.opacity = amount * twinkle * 0.72;
      sparkle.scale.setScalar(0.7 + 0.3 * twinkle);
    });
  }

  // --- Construction ---

  private build(): void {
    this.inner = new THREE.Group();
    this.root.add(this.inner);
    const inner = this.inner;
    const layout = HERO_LAYOUT;

    // Body: 1.15w x 1.55h plane, anchored so feet sit at local y=0.
    this.bodyMat = new THREE.MeshBasicMaterial({
      map: makePlayerBodyTexture(this.armorTier, {}, this.bootsTier),
      transparent: true,
    });
    const body = new THREE.Mesh(new THREE.PlaneGeometry(layout.body.width, layout.body.height), this.bodyMat);
    body.position.set(0, layout.body.height / 2, 0);
    inner.add(body);

    this.armorGlow = new THREE.Mesh(new THREE.PlaneGeometry(layout.body.width, layout.body.height), new THREE.MeshBasicMaterial({
      map: makeArmorEnhancementTexture(this.armorTier), transparent: true, depthWrite: false, opacity: 0,
    }));
    this.armorGlow.position.set(0, layout.body.height / 2, 0.005);
    this.armorGlow.visible = false;
    inner.add(this.armorGlow);

    // Helmet overlay over the head top (overlaps the hair).
    this.helmetMat = new THREE.MeshBasicMaterial({
      map: makeHelmetTexture(this.armorTier),
      transparent: true,
    });
    const helmet = new THREE.Mesh(new THREE.PlaneGeometry(layout.helmet.width, layout.helmet.height), this.helmetMat);
    helmet.position.set(layout.helmet.x, layout.helmet.y, 0.01);
    inner.add(helmet);

    // Rotate around the drawn hand, with the texture grip exactly on the pivot.
    this.weaponPivot = new THREE.Group();
    this.weaponPivot.position.set(HERO_HAND_POSITION.x, HERO_HAND_POSITION.y, 0.02);
    this.weaponPivot.rotation.z = SWORD_IDLE_ANGLE;
    inner.add(this.weaponPivot);

    this.swordGlow = new THREE.Mesh(new THREE.PlaneGeometry(SWORD_ENHANCEMENT_LAYOUT.width, SWORD_ENHANCEMENT_LAYOUT.height), new THREE.MeshBasicMaterial({
      map: makeSwordEnhancementTexture(), transparent: true, depthWrite: false, opacity: 0,
    }));
    this.swordGlow.position.set(SWORD_CENTER.x, SWORD_CENTER.y, -0.002);
    this.swordGlow.renderOrder = 1;
    this.swordGlow.visible = false;
    this.weaponPivot.add(this.swordGlow);

    this.weaponMat = new THREE.MeshBasicMaterial({
      map: makeWeaponTexture(this.weaponTier),
      transparent: true,
    });
    const weapon = new THREE.Mesh(new THREE.PlaneGeometry(layout.weapon.width, layout.weapon.height), this.weaponMat);
    weapon.position.set(SWORD_CENTER.x, SWORD_CENTER.y, 0);
    weapon.renderOrder = 2;
    this.weaponPivot.add(weapon);

    for (let i = 0; i < 2; i += 1) {
      const sparkle = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.075), new THREE.MeshBasicMaterial({
        map: makeEnhancementSparkleTexture(), transparent: true, depthWrite: false, opacity: 0,
      }));
      // Blade-local coordinates: these remain attached while running or cutting.
      sparkle.position.set(i === 0 ? 0.43 : 0.7, i === 0 ? 0.06 : -0.04, 0.005);
      sparkle.renderOrder = 3;
      sparkle.visible = false;
      this.sparkles.push(sparkle);
      this.weaponPivot.add(sparkle);
    }
  }
}
