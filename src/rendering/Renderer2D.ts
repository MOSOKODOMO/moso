/** Thin wrapper around THREE.WebGLRenderer + Scene with resize handling. */
import * as THREE from 'three';

export class Renderer2D {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  private resizeHandlers: Array<(width: number, height: number) => void> = [];

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#7ec8f7');

    window.addEventListener('resize', () => this.handleResize());
  }

  onResize(handler: (width: number, height: number) => void): void {
    this.resizeHandlers.push(handler);
  }

  get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  get aspect(): number {
    return window.innerWidth / window.innerHeight;
  }

  private handleResize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    for (const handler of this.resizeHandlers) handler(window.innerWidth, window.innerHeight);
  }

  render(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera);
  }
}
