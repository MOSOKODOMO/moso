/**
 * Side-view orthographic camera that follows the player horizontally.
 * Orthographic projection keeps the flat sprite-based 2D look.
 */
import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig';
import { clamp, dampFactor } from '../utils/MathUtils';

export class Camera2D {
  readonly camera: THREE.OrthographicCamera;
  readonly viewHeight: number = GameConfig.cameraViewHeight;
  private aspect: number;
  private trauma = 0;
  private mapWidth: number = GameConfig.levelWidth;

  constructor(aspect: number) {
    const halfH = this.viewHeight / 2;
    const halfW = halfH * aspect;
    this.aspect = aspect;
    this.camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 100);
    this.camera.position.set(GameConfig.playerSpawnX, GameConfig.cameraY, 10);
    this.camera.lookAt(GameConfig.playerSpawnX, GameConfig.cameraY, 0);
  }

  get viewHalfWidth(): number {
    return (this.viewHeight / 2) * this.aspect;
  }

  updateAspect(aspect: number): void {
    const halfH = this.viewHeight / 2;
    const halfW = halfH * aspect;
    this.aspect = aspect;
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
  }

  /** Screen shake that decays over ~0.6s. Power 0..1. */
  shake(power: number): void {
    this.trauma = Math.min(1, this.trauma + power);
  }

  setMapWidth(width: number): void {
    this.mapWidth = width;
  }

  private boundedX(targetX: number): number {
    const halfW = this.viewHalfWidth;
    // An unusually wide window centers the map rather than following past it.
    if (halfW * 2 >= this.mapWidth) return this.mapWidth / 2;
    return clamp(targetX, halfW, this.mapWidth - halfW);
  }

  /** Instantly center on x (map transitions), clamped to stage bounds. */
  snap(targetX: number): void {
    this.camera.position.x = this.boundedX(targetX);
    this.camera.position.y = GameConfig.cameraY;
    this.camera.lookAt(this.camera.position.x, GameConfig.cameraY, 0);
  }

  /** Smooth horizontal follow, clamped to stage bounds. */
  follow(targetX: number, dt: number): void {
    const clamped = this.boundedX(targetX);
    const t = dampFactor(GameConfig.cameraFollowSmoothing, dt);
    this.camera.position.x += (clamped - this.camera.position.x) * t;
    // Trauma-based shake offset (quadratic falloff feels punchy but controlled).
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const s = this.trauma * this.trauma * 0.6;
    const ox = (Math.random() * 2 - 1) * s;
    const oy = (Math.random() * 2 - 1) * s;
    this.camera.position.y = GameConfig.cameraY + oy;
    this.camera.lookAt(this.camera.position.x + ox, GameConfig.cameraY + oy, 0);
  }

  get x(): number {
    return this.camera.position.x;
  }
}
