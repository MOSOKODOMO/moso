/**
 * DungeonFloor — side-view stage: collision surfaces + themed meshes.
 * Phase 2: built from a StageDef per map (Meadow Outpost hub vs Ruins dungeon),
 * with a shop hut, dungeon gate + portal, and full disposal for map switching.
 */
import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig';
import {
  makeBarrelTexture,
  makeBrickTexture,
  makeBushTexture,
  makeGrassTopTexture,
  makeWindowTexture,
  makeWoodTexture,
} from '../rendering/SpriteFactory';
import { makeLabelTexture, makePortalTexture } from '../rendering/StageSprites';
import { makeMarketAwningTexture, makeMarketLanternTexture, makeMarketRoofTexture, makeMeadowFenceTexture, makeMeadowFlowersTexture, makeMeadowSoilTexture, makeMeadowTreeTexture } from '../rendering/MeadowSprites';
import { Palette, Z_LAYERS } from '../utils/Constants';
import type { MapTheme, PlatformDef } from '../world/Maps';

export interface StageDef {
  width: number;
  floorNumber?: number;
  platforms: PlatformDef[];
  theme: MapTheme;
  /** Shop hut center x (outpost). */
  hutX?: number;
  /** Dungeon gate x + sign label. */
  gateX?: number;
  gateLabel?: string;
  nextGateX?: number;
  nextGateLabel?: string;
}

interface Surface {
  x0: number;
  x1: number;
  y: number;
}

export class DungeonFloor {
  readonly width: number;
  private readonly surfaces: Surface[] = [];
  private readonly group = new THREE.Group();
  private portalMat: THREE.MeshBasicMaterial | null = null;
  private animT = 0;

  constructor(private readonly scene: THREE.Scene, def: StageDef) {
    this.width = def.width;
    scene.add(this.group);
    this.build(def);
  }

  /** Animate the portal shimmer. Called every frame by Game. */
  update(dt: number): void {
    this.animT += dt;
    if (this.portalMat) {
      this.portalMat.opacity = 0.85 + Math.sin(this.animT * 3) * 0.15;
    }
  }

  /** Release everything (map switch). */
  dispose(): void {
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
    this.surfaces.length = 0;
    this.portalMat = null;
  }

  /** Highest surface the body lands on while falling from prevFeet to newFeet. */
  resolveLanding(x: number, prevFeet: number, newFeet: number): number | null {
    let best: number | null = null;
    for (const s of this.surfaces) {
      if (x < s.x0 - 0.35 || x > s.x1 + 0.35) continue;
      if (prevFeet >= s.y - 0.02 && newFeet <= s.y) {
        if (best === null || s.y > best) best = s.y;
      }
    }
    return best;
  }

  /** Is there ground directly beneath (x, feetY)? Used to detect walking off edges. */
  hasSupport(x: number, feetY: number): boolean {
    for (const s of this.surfaces) {
      if (x >= s.x0 - 0.3 && x <= s.x1 + 0.3 && Math.abs(feetY - s.y) < 0.35) return true;
    }
    return false;
  }

  /** Resting height for a nearby inventory drop; never float over a ledge. */
  surfaceYAt(x: number, ceilingY = Infinity): number {
    let height: number = GameConfig.groundY;
    for (const surface of this.surfaces) {
      if (x >= surface.x0 && x <= surface.x1 && surface.y <= ceilingY) {
        height = Math.max(height, surface.y);
      }
    }
    return height;
  }

  // --- Construction ---

  private flat(
    color: string,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ color }),
    );
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    return mesh;
  }

  private cloneTex(texture: THREE.Texture, repeatX: number, repeatY: number): THREE.Texture {
    const tex = texture.clone();
    tex.needsUpdate = true;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    return tex;
  }

  /** Box mesh skinned with a repeated canvas texture. */
  private textured(
    texture: THREE.Texture,
    repeatX: number,
    repeatY: number,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ map: this.cloneTex(texture, repeatX, repeatY) }),
    );
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    return mesh;
  }

  /** Flat billboard with a canvas texture (transparency supported). */
  private billboard(
    texture: THREE.Texture,
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    rotZ = 0,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
    );
    mesh.position.set(x, y, z);
    mesh.rotation.z = rotZ;
    this.group.add(mesh);
    return mesh;
  }

  private build(def: StageDef): void {
    const W = def.width;
    const outdoor = def.theme === 'meadow' || def.theme === 'ruins';
    const stone: Record<MapTheme, string> = { meadow: '#ffffff', ruins: '#ffffff', crypt: '#b4becb', blood: '#ce8b9e', library: '#9f93b7', fortress: '#9aabba', ember: '#ad8d86', kingdom: '#b6b5ce', abyss: '#929cc5' };

    // Ground is always a valid surface.
    this.surfaces.push({ x0: 0, x1: W, y: GameConfig.groundY });

    // The village rests on warm earth; collision geometry remains unchanged.
    const ground = this.textured(
      def.theme === 'meadow' ? makeMeadowSoilTexture() : makeBrickTexture(),
      W / 4,
      1,
      W,
      GameConfig.groundDepth,
      2,
      W / 2,
      -GameConfig.groundDepth / 2,
      Z_LAYERS.ground,
    );
    (ground.material as THREE.MeshBasicMaterial).color.set(stone[def.theme]);
    this.flat(outdoor ? Palette.grass : stone[def.theme], W, 0.16, 2.1, W / 2, -0.08, Z_LAYERS.ground);
    if (outdoor) this.textured(makeGrassTopTexture(), W / 2, 1, W, 0.1, 2.14, W / 2, -0.03, Z_LAYERS.ground);

    // Mossy stone platforms: brick body + grass lip.
    const brick = def.theme === 'meadow' ? makeMeadowSoilTexture() : makeBrickTexture();
    const grassTop = makeGrassTopTexture();
    for (const p of def.platforms) {
      this.surfaces.push({ x0: p.x, x1: p.x + p.w, y: p.y });
      const cx = p.x + p.w / 2;
      const rx = Math.max(1, Math.round(p.w / 2));
      if (def.theme === 'meadow') {
        // Same earth/grass proportions and texture scale as the main ground.
        const thickness = 0.85;
        const body = this.textured(brick, p.w / 4, thickness / GameConfig.groundDepth,
          p.w, thickness, 1.6, cx, p.y - thickness / 2, Z_LAYERS.stage);
        const earth = (body.material as THREE.MeshBasicMaterial).map!;
        earth.offset.y = 1 - thickness / GameConfig.groundDepth;
        this.flat(Palette.grass, p.w, 0.16, 1.7, cx, p.y - 0.08, Z_LAYERS.stage);
        this.textured(grassTop, p.w / 2, 1, p.w, 0.1, 1.74, cx, p.y - 0.03, Z_LAYERS.stage);
      } else {
        const body = this.textured(brick, rx, 1, p.w, 0.5, 1.6, cx, p.y - 0.25, Z_LAYERS.stage);
        (body.material as THREE.MeshBasicMaterial).color.set(stone[def.theme]);
        if (outdoor) this.textured(grassTop, rx, 1, p.w, 0.1, 1.7, cx, p.y - 0.03, Z_LAYERS.stage);
        else this.flat('#cbd3df', p.w, .12, 1.7, cx, p.y - .05, Z_LAYERS.stage);
      }
    }

    if (def.theme === 'meadow') this.buildMeadowDecor(W);
    else if (def.theme === 'ruins') this.buildRuinsMood(W);
    else this.buildCampaignDecor(def.theme, W);

    if (def.hutX !== undefined) this.buildHut(def.hutX);
    if (def.gateX !== undefined) this.buildGate(def.gateX, def.gateLabel);
    if (def.nextGateX !== undefined) this.buildGate(def.nextGateX, def.nextGateLabel ?? 'ONWARD');
  }

  /** Dark cavern mood behind the ruins dungeon (keeps the meadow parallax). */
  private buildRuinsMood(W: number): void {
    this.flat('#52677b', W + 16, 13, 0.5, W / 2, 3.4, Z_LAYERS.backRuins - 2);
    // Broken columns + rubble.
    const cols: Array<[number, number]> = [[8, 3.2], [24, 2.2], [40, 3.8], [53, 2.4]];
    for (let x = 70; x < W - 8; x += 18) cols.push([x, 2.2 + ((x / 18) % 3) * .7]);
    for (const [cx, h] of cols) {
      this.flat(Palette.ruinDark, 1.3, h, 1.0, cx, h / 2, Z_LAYERS.backRuins + 1);
      this.flat(Palette.ruinStone, 1.7, 0.4, 1.2, cx, h + 0.2, Z_LAYERS.backRuins + 1);
    }
    for (const [rx, rw] of [[15, 1.2], [33, 0.9], [47, 1.4]] as Array<[number, number]>) {
      this.flat(Palette.ruinDark, rw, 0.5, 1.4, rx, 0.25, Z_LAYERS.stage - 1);
    }
    // Braziers with warm glow.
    for (const bx of [6, 58]) {
      this.flat('#3a2c22', 0.5, 1.1, 0.6, bx, 0.55, Z_LAYERS.stage - 1);
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 1.4),
        new THREE.MeshBasicMaterial({ color: '#ff9f1c', transparent: true, opacity: 0.55, depthWrite: false }),
      );
      glow.position.set(bx, 1.6, Z_LAYERS.stage - 1);
      this.group.add(glow);
    }
  }

  /** Each deep floor has its own architecture, beyond changing a ground tint. */
  private buildCampaignDecor(theme: MapTheme, width: number): void {
    const walls: Partial<Record<MapTheme, string>> = { crypt: '#333e56', blood: '#533348', library: '#34304e', fortress: '#35404e', ember: '#553931', kingdom: '#3b415e', abyss: '#262d4b' };
    this.flat(walls[theme] ?? '#3a4054', width + 12, 14, .5, width / 2, 3.5, -12);
    const crystal = (x: number, y: number, w: number, h: number, color: string): void => {
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 4), new THREE.MeshBasicMaterial({ color }));
      mesh.scale.set(w / 2, h / 2, 1); mesh.position.set(x, y, -7); this.group.add(mesh);
      this.flat('#c8f2ed', .06, h * .65, .1, x, y, -6.9);
    };
    for (let x = 9; x < width - 5; x += 11) {
      if (theme === 'crypt') {
        // Round tomb niches and candles establish a quiet ossuary.
        const arch = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshBasicMaterial({ color: '#202a40' }));
        arch.position.set(x, 3.1, -10); this.group.add(arch);
        this.flat('#202a40', 3.2, 3.2, .3, x, 1.6, -10);
        this.flat('#8794a5', 2.7, .5, .5, x, .8, -8);
        this.flat('#69798d', 2.5, 1.2, .5, x, 1.6, -8);
        for (const dx of [-1.4, 1.4]) { this.flat('#d8c7a0', .13, .65, .1, x + dx, 1.2, -7); crystal(x + dx, 1.65, .18, .35, '#f0d78f'); }
      } else if (theme === 'blood') {
        this.flat('#784956', 2.2, 2.8, .7, x, 1.1, -9);
        crystal(x - 1, 2, 1.2, 3.1, '#bc6688'); crystal(x + .2, 2.7, 1.5, 4.2, '#d98ba0'); crystal(x + 1.2, 1.4, .8, 2.2, '#a96785');
      } else if (theme === 'library') {
        this.flat('#443b50', 5.1, 5.5, .7, x, 2.75, -9);
        for (const dx of [-2.6, 2.6]) this.flat('#9b775b', .25, 5.7, .5, x + dx, 2.85, -8);
        for (const y of [.6, 2, 3.4, 4.8]) {
          this.flat('#b6916c', 5.2, .18, .6, x, y, -8);
          for (let j = 0; j < 9; j++) this.flat(['#8b9fae', '#a57e85', '#b7a779'][j % 3], .36, .8 + (j % 3) * .12, .3, x - 2.1 + j * .51, y + .57, -8.2);
        }
      } else if (theme === 'fortress') {
        this.flat('#536879', 2, 6, .8, x, 3, -9);
        this.flat('#94a8b8', 2.6, .4, .8, x, 5.9, -8);
        this.flat('#8098a8', .3, 4.5, .5, x + 3.3, 3.5, -8);
        this.flat('#6f8898', 5.8, .3, .5, x + .5, 5.7, -8);
        for (const y of [1, 2.7, 4.4]) this.flat('#a1b5c2', .18, .18, .1, x - .65, y, -7.9);
      } else if (theme === 'ember') {
        this.flat('#786052', 4.4, 4.5, .8, x, 2.25, -9);
        this.flat('#342c31', 2.8, 2.5, .8, x, 1.5, -8);
        this.flat('#c17a48', 2.4, 1.8, .5, x, 1.35, -7.8);
        for (const dx of [-.8, -.3, .3, .8]) this.flat('#534a48', .2, 2.3, .3, x + dx, 1.5, -7.5);
        this.flat('#89705c', 1.1, 2.8, .6, x + .8, 5, -9);
      } else if (theme === 'kingdom') {
        for (const dx of [-2, 2]) { this.flat('#929eb9', .85, 5.7, .7, x + dx, 2.85, -9); this.flat('#c2c6d6', 1.3, .35, .7, x + dx, 5.6, -8.8); }
        this.flat('#665172', 2.5, 4, .2, x, 3.6, -9);
        crystal(x, 3.8, .8, 1.4, '#d2cda1');
      } else if (theme === 'abyss') {
        crystal(x, 3.5, 2.4, 5.5, '#527291'); crystal(x - 2.1, 1.8, 1.1, 3.1, '#6c82ac');
        this.flat('#70a2b5', 7.7, .055, .1, x, 1.1, -7);
        this.flat('#6390a7', .06, 2.4, .1, x + 3, 2.3, -7);
      }
    }
  }

  private buildMeadowDecor(width: number): void {
    const xScale = width / 64;
    // Orchard trees frame the route behind the player and platform surfaces.
    const tree = makeMeadowTreeTexture();
    for (const [x, h] of [[6, 6.1], [17, 5.2], [42, 6.5], [51, 5.6]] as Array<[number, number]>) {
      this.billboard(tree, h * 0.8, h, x * xScale, h / 2 - 0.08, Z_LAYERS.stage - 1);
    }
    const fence = makeMeadowFenceTexture();
    for (const x of [12, 21, 38, 47]) this.billboard(fence, 4.4, 1.35, x * xScale, 0.64, -3.1);
    const bush = makeBushTexture();
    this.billboard(bush, 1.7, 1.2, 8 * xScale, 0.6, -2.2);
    this.billboard(bush, 2.0, 1.4, 20 * xScale, 0.7, -2.4);
    this.billboard(bush, 1.6, 1.1, 44 * xScale, 0.55, -2.2);
    this.billboard(bush, 1.6, 1.1, 52 * xScale, 0.55, -2.2);
    const flowers = makeMeadowFlowersTexture();
    for (const [x, w] of [[3.7, 1.4], [9, 1.7], [15, 1.5], [22, 1.4], [35, 1.8], [41, 1.5], [49, 1.6], [55, 1.4]] as Array<[number, number]>) {
      this.billboard(flowers, w, w * 80 / 192, x * xScale, w * 40 / 192 - 0.01, -2.0);
    }
  }

  /** Roadside shop hut: plank walls, tile roof, barrels. Center x is parameterized. */
  private buildHut(cx: number): void {
    const wood = makeWoodTexture();
    this.billboard(this.cloneTex(wood, 3, 1), 7, 3.2, cx, 1.6, -1.2);
    this.textured(wood, 1, 2, 0.55, 3.4, 0.55, cx - 3.3, 1.7, -0.4);
    this.textured(wood, 1, 2, 0.55, 3.4, 0.55, cx + 3.3, 1.7, -0.4);
    // One continuous pitched silhouette joins the tiles, ridge and lower eaves.
    this.billboard(makeMarketRoofTexture(), 8, 1.8, cx, 4.2, -0.3);
    // Door + lattice window
    this.flat('#1c1c2e', 1.4, 2.5, 0.2, cx - 1.3, 1.25, -1.1);
    this.billboard(makeWindowTexture(), 1.5, 1.3, cx + 1.4, 2.0, -1.1);
    // The market's striped awning and lanterns provide a recognizable landmark.
    this.billboard(makeMarketAwningTexture(), 6.2, 1.05, cx, 3.05, -0.25);
    const lantern = makeMarketLanternTexture();
    this.billboard(lantern, 0.8, 1.28, cx - 3.1, 2.4, -0.1);
    this.billboard(lantern, 0.8, 1.28, cx + 3.1, 2.4, -0.1);
    // Barrels beside the door
    const barrelTex = makeBarrelTexture();
    for (const [bx, bz] of [[cx - 2.5, -0.3], [cx - 1.5, -0.45]] as Array<[number, number]>) {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.5, 0.95, 12),
        new THREE.MeshBasicMaterial({ map: barrelTex }),
      );
      barrel.position.set(bx, 0.48, bz);
      this.group.add(barrel);
    }
  }

  /** Ruined stone arch + glowing portal + hanging sign. */
  private buildGate(gx: number, label?: string): void {
    const z = Z_LAYERS.backRuins + 2;
    // Steps descending toward the gate.
    this.flat(Palette.ruinDark, 4.5, 0.25, 2.2, gx, 0.02, Z_LAYERS.stage - 1);
    // Arch columns + broken lintel.
    this.flat(Palette.ruinStone, 1.1, 5.2, 1.2, gx - 2.2, 2.6, z);
    this.flat(Palette.ruinStone, 1.1, 5.2, 1.2, gx + 2.2, 2.6, z);
    this.flat(Palette.ruinDark, 3.4, 0.7, 1.3, gx - 0.8, 5.4, z);
    this.flat(Palette.ruinDark, 1.4, 0.6, 1.3, gx + 1.9, 5.35, z);
    // Portal glow.
    this.portalMat = new THREE.MeshBasicMaterial({
      map: makePortalTexture(),
      transparent: true,
      depthWrite: false,
    });
    const portal = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.9), this.portalMat);
    portal.position.set(gx, 2.1, z + 0.2);
    this.group.add(portal);
    // Torches flanking the gate.
    for (const tx of [gx - 3.2, gx + 3.2]) {
      this.flat('#3a2c22', 0.35, 1.6, 0.5, tx, 0.8, z);
      const flame = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.9),
        new THREE.MeshBasicMaterial({ color: '#ffcf5e', transparent: true, opacity: 0.9, depthWrite: false }),
      );
      flame.position.set(tx, 1.95, z);
      this.group.add(flame);
    }
    if (label) {
      this.billboard(makeLabelTexture(label, '#9ecbff', 30), 5.2, 1.05, gx, 6.4, z);
    }
  }
}
