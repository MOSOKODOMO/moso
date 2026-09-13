/** Readable attack commitments, recovery openings and a hard passive first floor. */
import * as THREE from 'three';
import { BalanceConfig } from '../config/BalanceConfig';
import { BASE_MONSTER, EnemyConfig, type MonsterId, type MonsterDef, type AttackPattern } from '../config/EnemyConfig';
import { GameConfig } from '../config/GameConfig';
import type { CombatTarget } from '../combat/CombatSystem';
import type { DungeonFloor } from '../dungeon/DungeonFloor';
import { makeEnemyTexture } from '../rendering/EnemySprites';
import { makeLabelTexture } from '../rendering/StageSprites';
import { Z_LAYERS } from '../utils/Constants';
import { clamp } from '../utils/MathUtils';

export type EnemyState = 'idle' | 'chase' | 'attack' | 'recover' | 'hurt' | 'dead';
export interface EnemyCallbacks { dealDamageToPlayer: (attackPower: number) => void; onDeath: (enemy: Enemy) => void }
export interface EnemyOptions { passive?: boolean; boss?: boolean; respawn?: boolean }
interface StrikeArea { x: number; y: number; halfWidth: number; height: number }
const CUES: Record<AttackPattern, string> = {
  sweep: 'SWEEP · STEP BACK OR JUMP', stomp: 'GROUND WAVE · JUMP', lunge: 'CHARGE · JUMP OR STEP BEHIND',
  mark: 'RUNE · LEAVE THE MARK', twinMark: 'TWIN RUNES · MOVE TO A GAP',
};

export class Enemy implements CombatTarget {
  readonly monsterId: MonsterId; readonly displayName: string;
  readonly isBoss: boolean; readonly passive: boolean;
  readonly marker = new THREE.Group();
  maxHP: number; hp: number; attack: number; defense: number; expReward: number; goldReward: number;
  x: number; y: number = GameConfig.groundY; readonly homeX: number;
  state: EnemyState = 'idle'; facing: 1 | -1 = 1;
  private readonly def: MonsterDef; private readonly mayRespawn: boolean;
  private vx = 0; private vy = 0; private onGround = true; private stateT = 0; private attackCd = 1.3;
  private patrolDir: 1 | -1 = 1; private hopT = 0; private animT = Math.random() * 10; private flashT = 0;
  private attackIndex = 0; private pattern: AttackPattern = 'sweep'; private areas: StrikeArea[] = [];
  private strikeOriginX = 0; private strikeFacing = 1; private labelText = '';
  private readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly health = new THREE.Group();
  private readonly hpFill: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly caption: THREE.Sprite;
  private readonly barWidth: number;

  constructor(private readonly scene: THREE.Scene, monsterId: MonsterId, spawnX: number,
    private readonly cb: EnemyCallbacks, readonly floorNumber = 1, options: EnemyOptions = {}) {
    const def = this.def = EnemyConfig[monsterId]; this.monsterId = monsterId; this.displayName = def.displayName;
    this.isBoss = options.boss ?? !!def.boss;
    // Safety is a property of the whole opening area, not an AI state that a hit can change.
    this.passive = floorNumber <= 1 || monsterId === 'trainingDummy' || monsterId === 'giantSlime' || !!options.passive;
    this.mayRespawn = options.respawn ?? !this.isBoss;
    const f = Math.max(0, floorNumber - 1);
    this.maxHP = Math.round(BASE_MONSTER.hp * def.hpMult * Math.pow(BalanceConfig.floorHPGrowth, f));
    this.hp = this.maxHP;
    this.attack = this.passive ? 0 : Math.round(BASE_MONSTER.attack * def.attackMult * Math.pow(BalanceConfig.floorAttackGrowth, f) * 10) / 10;
    this.defense = Math.round(BASE_MONSTER.defense * def.defenseMult * Math.pow(BalanceConfig.floorDefenseGrowth, f) * 10) / 10;
    this.expReward = monsterId === 'trainingDummy' ? 0 : floorNumber === 1 && !this.isBoss ? 3
      : Math.round(BASE_MONSTER.exp * def.expMult * Math.pow(BalanceConfig.floorXPGrowth, f));
    this.goldReward = monsterId === 'trainingDummy' ? 0 : Math.max(1, Math.round((def.goldMin + Math.random() * (def.goldMax - def.goldMin)) * def.goldMult * Math.pow(BalanceConfig.floorGoldGrowth, f)));
    this.x = this.homeX = spawnX;
    if (def.moveMode === 'fly') this.y = this.isBoss ? .3 : .85;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(def.width, def.height), new THREE.MeshBasicMaterial({ map: makeEnemyTexture(monsterId), transparent: true }));
    scene.add(this.mesh); scene.add(this.marker); scene.add(this.health);
    this.marker.name = `telegraph:${monsterId}`;
    this.barWidth = this.isBoss ? Math.max(3.4, def.width * 1.25) : 1.2;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(this.barWidth + .08, this.isBoss ? .19 : .12), new THREE.MeshBasicMaterial({ color: '#292b3d', depthTest: false }));
    this.hpFill = new THREE.Mesh(new THREE.PlaneGeometry(this.barWidth, this.isBoss ? .12 : .07), new THREE.MeshBasicMaterial({ color: this.passive ? '#8bd39b' : '#e59e9c', depthTest: false }));
    this.hpFill.position.z = .01; this.health.add(back, this.hpFill); this.health.renderOrder = 10;
    this.caption = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false }));
    this.caption.position.y = .32; this.caption.renderOrder = 11; this.health.add(this.caption);
    this.syncMesh();
  }
  get isGuarding(): boolean { return !this.passive && !!this.def.guarded && ['idle', 'chase', 'attack'].includes(this.state); }
  get isVulnerable(): boolean { return this.state === 'recover'; }
  get attackCue(): string { return this.passive ? 'SAFE PRACTICE' : this.state === 'attack' ? CUES[this.pattern] : this.isVulnerable ? 'OPEN · ATTACK NOW' : this.isGuarding ? 'GUARDED · WAIT FOR THE STRIKE' : ''; }
  isAlive(): boolean { return this.state !== 'dead'; }
  getCenterX(): number { return this.x; }
  getCenterY(): number { return this.y + this.def.height / 2; }
  getDefense(): number { return this.isGuarding ? this.defense + 120 : this.isVulnerable ? this.defense * .35 : this.defense; }
  getCritChance(): number { return 0; }
  applyHit(damage: number, _isCrit: boolean, knockDir: number): void { this.takeDamage(damage, knockDir); }
  takeDamage(amount: number, knockDir: number): void {
    if (!this.isAlive()) return;
    this.hp = Math.max(0, this.hp - Math.max(0, Math.round(amount))); this.flashT = .18;
    if (this.hp <= 0) {
      this.state = 'dead'; this.stateT = 0; this.vx = 0; this.clearMarkers(); this.cb.onDeath(this);
    } else if (this.passive || (!this.isBoss && !this.def.guarded)) {
      this.state = 'hurt'; this.stateT = 0; this.clearMarkers();
      this.vx = this.monsterId === 'trainingDummy' ? 0 : knockDir * (this.passive ? 1.8 : 3);
      if (this.onGround && this.monsterId !== 'trainingDummy') this.vy = 2.2;
    }
  }
  private clearMarkers(): void {
    for (const obj of [...this.marker.children]) {
      const mesh = obj as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
      mesh.geometry.dispose(); mesh.material.dispose(); this.marker.remove(mesh);
    }
    this.areas = [];
  }
  private respawn(): void {
    this.x = this.homeX; this.y = this.def.moveMode === 'fly' ? .85 : 0;
    this.vx = this.vy = 0; this.hp = this.maxHP; this.state = 'idle'; this.stateT = 0; this.attackCd = 1.3;
    this.mesh.visible = true; this.mesh.rotation.z = 0; this.mesh.material.opacity = 1;
  }
  dispose(): void {
    this.clearMarkers(); this.scene.remove(this.mesh, this.marker, this.health);
    this.mesh.geometry.dispose(); this.mesh.material.map?.dispose(); this.mesh.material.dispose();
    for (const child of this.health.children) {
      if (child instanceof THREE.Mesh) { child.geometry.dispose(); (child.material as THREE.Material).dispose(); }
    }
    this.caption.material.map?.dispose(); this.caption.material.dispose();
  }
  private integrate(dt: number, floor: DungeonFloor): void {
    if (this.monsterId === 'trainingDummy') { this.x = this.homeX; this.y = 0; return; }
    this.x = clamp(this.x + this.vx * dt, .6, floor.width - .6);
    if (this.def.moveMode === 'fly' && this.state !== 'dead') {
      // Flyers remain reachable by an ordinary jump on every route.
      const hover = (this.isBoss ? .3 : .85) + Math.sin(this.animT * 2) * .2;
      this.y += (hover - this.y) * Math.min(1, dt * 4); this.onGround = false;
      this.vx *= Math.max(0, 1 - dt * 2); return;
    }
    const previous = this.y; this.vy += BalanceConfig.gravity * dt; this.y += this.vy * dt;
    const landing = this.vy <= 0 ? floor.resolveLanding(this.x, previous, this.y) : null;
    this.onGround = landing !== null;
    if (landing !== null) { this.y = landing; this.vy = 0; }
    if (this.onGround) this.vx *= Math.max(0, 1 - dt * 4);
  }
  private beginAttack(playerX: number, playerY: number, floor: DungeonFloor): void {
    this.pattern = this.def.patterns[this.attackIndex++ % this.def.patterns.length] ?? 'sweep';
    this.state = 'attack'; this.stateT = 0; this.vx = 0; this.strikeOriginX = this.x; this.strikeFacing = this.facing;
    this.clearMarkers();
    const ground = floor.surfaceYAt(this.x, this.y + .1);
    if (this.pattern === 'mark' || this.pattern === 'twinMark') {
      this.areas.push({ x: clamp(playerX, 1, floor.width - 1), y: floor.surfaceYAt(playerX, playerY + .1), halfWidth: this.isBoss ? 1.15 : .85, height: 3.8 });
      if (this.pattern === 'twinMark') {
        const second = clamp(playerX + (playerX < this.x ? 3.8 : -3.8), 1, floor.width - 1);
        this.areas.push({ x: second, y: floor.surfaceYAt(second, playerY + .1), halfWidth: 1.05, height: 3.8 });
      }
    } else if (this.pattern === 'stomp') {
      this.areas.push({ x: this.x, y: ground, halfWidth: this.isBoss ? 3.2 : 1.8, height: .95 });
    } else {
      const reach = this.pattern === 'lunge' ? this.isBoss ? 6 : 4 : this.isBoss ? 3 : 1.6;
      this.areas.push({ x: clamp(this.x + this.facing * reach / 2, .5, floor.width - .5), y: ground, halfWidth: reach / 2, height: this.pattern === 'lunge' ? 1.1 : 1.35 });
    }
    for (const area of this.areas) {
      const mat = new THREE.MeshBasicMaterial({ color: '#f1c46e', transparent: true, opacity: .18, depthWrite: false });
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(area.halfWidth * 2, area.height), mat);
      panel.position.set(area.x, area.y + area.height / 2, Z_LAYERS.enemy + .2); this.marker.add(panel);
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(area.halfWidth * 2, .09), new THREE.MeshBasicMaterial({ color: '#ffdb89', transparent: true, opacity: .8, depthWrite: false }));
      edge.position.set(area.x, area.y + .06, Z_LAYERS.effect); this.marker.add(edge);
    }
  }
  update(dt: number, playerX: number, playerY: number, playerAlive: boolean, floor: DungeonFloor): void {
    this.animT += dt; this.stateT += dt; this.attackCd = Math.max(0, this.attackCd - dt); this.flashT = Math.max(0, this.flashT - dt);
    const dx = playerX - this.x; const dist = Math.abs(dx); const dy = Math.abs(playerY - this.y);
    const aggro = BalanceConfig.enemyAggroRange * this.def.aggroRangeMult;
    if (this.state === 'dead') {
      this.mesh.rotation.z = -this.facing * Math.min(1, this.stateT * 5) * 1.2;
      this.mesh.material.opacity = clamp(1 - (this.stateT - .6) / .7, 0, 1);
      if (this.stateT > 1.3) this.mesh.visible = false;
      if (this.mayRespawn && this.stateT >= BalanceConfig.enemyRespawnDelay) this.respawn();
    } else if (this.state === 'hurt') {
      this.integrate(dt, floor);
      if (this.stateT >= .28) { this.state = this.passive ? 'idle' : playerAlive && dist < aggro ? 'chase' : 'idle'; this.stateT = 0; }
    } else if (this.state === 'attack') {
      this.vx = 0; this.integrate(dt, floor);
      const windup = this.floorNumber === 2 ? Math.max(.9, this.def.windup) : this.def.windup;
      for (const object of this.marker.children) (object as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>).material.opacity = .16 + .3 * Math.min(1, this.stateT / windup);
      if (this.stateT >= windup) {
        // Target areas were fixed at windup start. The warning always predicts the hit.
        if (!this.passive && playerAlive && this.areas.some(a => Math.abs(playerX - a.x) < a.halfWidth + .18 && playerY < a.y + a.height && playerY + 1.2 > a.y)) this.cb.dealDamageToPlayer(this.attack);
        if (this.pattern === 'lunge') this.x = clamp(this.strikeOriginX + this.strikeFacing * (this.isBoss ? 5 : 3), .6, floor.width - .6);
        this.state = 'recover'; this.stateT = 0; this.clearMarkers();
      }
    } else if (this.state === 'recover') {
      this.vx = 0; this.integrate(dt, floor);
      if (this.stateT >= this.def.recovery) { this.state = 'chase'; this.stateT = 0; this.attackCd = this.def.cooldown; }
    } else if (this.state === 'chase' && !this.passive) {
      if (!playerAlive || dist > aggro * 1.8) { this.state = 'idle'; this.stateT = 0; }
      else {
        this.facing = dx >= 0 ? 1 : -1;
        const next = this.def.patterns[this.attackIndex % this.def.patterns.length];
        const range = next === 'mark' || next === 'twinMark' ? 6.5 : next === 'lunge' ? 4.5 : this.isBoss ? 2.6 : 1.25;
        if (dist <= range && this.attackCd <= 0 && dy < 3.3) this.beginAttack(playerX, playerY, floor);
        else {
          this.vx = dist > range * .85 ? this.facing * this.def.moveSpeed : 0;
          this.hopT += dt;
          if (this.def.moveMode === 'hop' && this.onGround && this.hopT > 1.1) { this.vy = 4; this.hopT = 0; }
          this.integrate(dt, floor);
        }
      }
    } else {
      this.state = 'idle'; this.hopT += dt;
      if (Math.abs(this.x - this.homeX) > 2) this.patrolDir = this.x > this.homeX ? -1 : 1;
      if (this.hopT > 1.4) {
        this.hopT = 0; this.facing = this.patrolDir; this.vx = this.patrolDir * this.def.moveSpeed * .3;
        if (this.def.moveMode === 'hop' && this.onGround) this.vy = 2.8;
      }
      this.integrate(dt, floor);
      if (!this.passive && playerAlive && dist <= aggro && dy < 3.3) { this.state = 'chase'; this.stateT = 0; }
    }
    this.syncMesh();
  }
  private syncMesh(): void {
    this.mesh.position.set(this.x, this.y + this.def.height / 2, Z_LAYERS.enemy);
    const bounce = this.def.moveMode === 'hop' ? Math.sin(this.animT * 7) * .04 : .015 * Math.sin(this.animT * 3);
    const pulse = this.state === 'attack' ? Math.sin(this.stateT * 12) * .035 : 0;
    this.mesh.scale.set(this.facing * (1 + bounce + pulse), 1 - bounce + pulse, 1);
    this.mesh.material.color.setHex(this.flashT > 0 ? 0xffaaa2 : this.isVulnerable ? 0xd5fff0 : 0xffffff);
    this.health.visible = this.isAlive() && (this.isBoss || this.hp < this.maxHP || this.state === 'attack' || this.isGuarding || this.monsterId === 'trainingDummy');
    this.health.position.set(this.x, this.y + this.def.height + .15, Z_LAYERS.effect);
    const ratio = clamp(this.hp / this.maxHP, 0, 1); this.hpFill.scale.x = ratio; this.hpFill.position.x = -this.barWidth * (1 - ratio) / 2;
    this.hpFill.material.color.set(this.isVulnerable ? '#83dfbe' : this.isGuarding ? '#8fb8de' : this.passive ? '#8bd39b' : '#e59e9c');
    const text = this.isBoss ? `${this.displayName} · ${this.attackCue || 'READY'}` : this.attackCue || this.displayName;
    if (text !== this.labelText) {
      this.labelText = text; this.caption.material.map?.dispose(); const texture = makeLabelTexture(text, '#fff4d7', 24);
      this.caption.material.map = texture; this.caption.material.needsUpdate = true;
      const image = texture.image as HTMLCanvasElement; const height = this.isBoss ? .44 : .31;
      this.caption.scale.set(height * image.width / image.height, height, 1);
    }
  }
}
