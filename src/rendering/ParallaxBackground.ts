/**
 * Layered parallax background: sky gradient + 3 scrolling silhouette layers.
 * Layers are camera-locked planes whose repeating textures scroll at different
 * rates → cheap depth illusion, Meadow Ruins theme for Floor 1.
 */
import * as THREE from 'three';
import { Palette, Z_LAYERS } from '../utils/Constants';
import type { MapTheme } from '../world/Maps';
import { makeLeafTileTexture, makeParallaxTileTexture, makeSkyTexture } from './SpriteFactory';

interface ParallaxLayer {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  /** Fraction of camera movement applied to texture scroll (0 = infinitely far). */
  scrollFactor: number;
  tileWorldWidth: number;
}

export class ParallaxBackground {
  private readonly group = new THREE.Group();
  private sky!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private layers: ParallaxLayer[] = [];
  private ruinLayer!: ParallaxLayer;
  private theme: MapTheme = 'meadow';
  private restored = false;

  constructor(private readonly scene: THREE.Scene) {
    this.build();
    scene.add(this.group);
  }

  private makeLayer(
    texture: THREE.Texture,
    z: number,
    scrollFactor: number,
    tileWorldWidth: number,
    height: number,
    yOffset: number,
  ): ParallaxLayer {
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    mesh.position.z = z;
    mesh.userData.baseHeight = height;
    mesh.userData.yOffset = yOffset;
    this.group.add(mesh);
    const layer: ParallaxLayer = { mesh, scrollFactor, tileWorldWidth };
    this.layers.push(layer);
    return layer;
  }

  private build(): void {
    const skyTex = makeSkyTexture('#8dcddd', '#fff0c8');
    this.sky = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: skyTex, depthWrite: false }),
    );
    this.sky.position.z = Z_LAYERS.sky;
    this.group.add(this.sky);

    // Order matters: far → near.
    this.makeLayer(
      makeParallaxTileTexture('hills', Palette.hillFar),
      Z_LAYERS.farHills,
      0.12,
      22,
      7,
      -1.4,
    );
    this.ruinLayer = this.makeLayer(
      makeParallaxTileTexture('ruins', Palette.ruinStone),
      Z_LAYERS.backRuins,
      0.3,
      26,
      6,
      -1.6,
    );
    this.makeLayer(
      makeParallaxTileTexture('trees', Palette.treeDark),
      Z_LAYERS.midTrees,
      0.5,
      20,
      5.4,
      -2.0,
    );
    this.ruinLayer.mesh.visible = false;
    // Overhanging leaf canopy: foreground fringe like the reference art.
    this.makeLayer(makeLeafTileTexture(), Z_LAYERS.foreground, 0.75, 12, 4.5, 4.6);
  }

  /** Keep the peaceful village distinct from the dungeon's ruined skyline. */
  setTheme(theme: MapTheme): void {
    if (theme === this.theme) return;
    this.theme = theme;
    this.refreshTheme();
  }

  /** Campaign completion restores the village light without recoloring dungeons. */
  setRestored(restored: boolean): void {
    if (restored === this.restored) return;
    this.restored = restored;
    if (this.theme === 'meadow') this.refreshTheme();
  }

  private refreshTheme(): void {
    const outdoor = this.theme === 'meadow' || this.theme === 'ruins';
    this.ruinLayer.mesh.visible = this.theme !== 'meadow';
    const colors: Record<MapTheme, [string, string]> = {
      meadow: this.restored ? ['#99d9ee', '#fff5ca'] : ['#8dcddd', '#fff0c8'],
      ruins: ['#899bb6', '#bbc9bc'], crypt: ['#495775', '#7b839a'], blood: ['#67435d', '#a97185'],
      library: ['#4e476c', '#9295b7'], fortress: ['#4c5b70', '#93a2ae'], ember: ['#714b47', '#bd9270'],
      kingdom: ['#59617f', '#b2aec9'], abyss: ['#313b62', '#748da8'],
    };
    const previous = this.sky.material.map;
    this.sky.material.map = makeSkyTexture(...colors[this.theme]);
    this.sky.material.needsUpdate = true;
    previous?.dispose();
    for (const layer of this.layers) {
      if (layer !== this.ruinLayer) layer.mesh.visible = outdoor;
      layer.mesh.material.color.set(this.theme === 'meadow' && this.restored ? '#ffffe5' : '#ffffff');
    }
  }

  /** Keep planes covering the view; call when the viewport resizes. */
  layout(viewWidth: number, viewHeight: number): void {
    const pad = 4;
    this.sky.scale.set(viewWidth + pad, viewHeight + pad, 1);
    for (const layer of this.layers) {
      const h = layer.mesh.userData.baseHeight as number;
      layer.mesh.scale.set(viewWidth + pad, h, 1);
      const tex = layer.mesh.material.map;
      if (tex) tex.repeat.set((viewWidth + pad) / layer.tileWorldWidth, 1);
    }
  }

  /** Reposition to camera + scroll textures. Called every frame. */
  update(cameraX: number, cameraY: number): void {
    this.sky.position.set(cameraX, cameraY, Z_LAYERS.sky);
    for (const layer of this.layers) {
      const yOffset = layer.mesh.userData.yOffset as number;
      layer.mesh.position.set(cameraX, cameraY + yOffset, layer.mesh.position.z);
      const tex = layer.mesh.material.map;
      if (tex) tex.offset.x = (cameraX * layer.scrollFactor) / layer.tileWorldWidth;
    }
  }
}
