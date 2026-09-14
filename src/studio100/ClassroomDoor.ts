import * as THREE from 'three';

/** A small glazed timber exit aligned with the classroom's left interaction area. */
export class ClassroomDoor {
  private readonly group = new THREE.Group();
  private readonly texture: THREE.CanvasTexture;
  private readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

  constructor(scene: THREE.Scene) {
    const canvas = document.createElement('canvas'); canvas.width = 180; canvas.height = 360;
    const c = canvas.getContext('2d')!, ink = '#483e36'; c.lineCap = 'round'; c.lineJoin = 'round';
    const box = (x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, stroke = ink, width = 2.5) => {
      c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill();
      if (width) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
    };
    const line = (d: string, color: string, width = 2) => { c.strokeStyle = color; c.lineWidth = width; c.stroke(new Path2D(d)); };
    const wood = c.createLinearGradient(20, 10, 156, 350); wood.addColorStop(0, '#c09a69'); wood.addColorStop(.4, '#886347'); wood.addColorStop(1, '#654c3c');
    const glass = c.createLinearGradient(30, 55, 150, 234); glass.addColorStop(0, '#697c73'); glass.addColorStop(.45, '#a6aa8b'); glass.addColorStop(1, '#d5c292');
    const panel = c.createLinearGradient(36, 253, 143, 335); panel.addColorStop(0, '#b18b5a'); panel.addColorStop(1, '#77563d');
    c.fillStyle = '#3b342c2c'; c.beginPath(); c.ellipse(92, 350, 81, 7, 0, 0, Math.PI * 2); c.fill();
    box(13, 10, 154, 341, 4, '#50453a'); box(18, 13, 144, 337, 3, wood);
    box(29, 26, 122, 317, 2, '#614c3b'); box(34, 32, 112, 307, 2, '#a88559');
    line('M24 22 L24 344 M157 22 L157 344 M27 19 L154 19', '#d5b47d', 2);
    line('M29 34 L29 337 M149 34 L149 337', '#594333', 2);
    box(40, 45, 100, 194, 2, '#514f40'); box(44, 49, 92, 186, 1, glass, '#d1ba86', 1.3);
    // Softly reflected architecture gives the glazing depth without placing text in the art.
    c.save(); c.beginPath(); c.rect(45, 50, 90, 184); c.clip();
    box(49, 138, 25, 99, 0, '#6a746246', '', 0); box(102, 104, 19, 132, 0, '#69776935', '', 0);
    line('M59 49 L59 234 M112 49 L112 234 M45 123 L135 123', '#ead7aa77', 2);
    line('M48 66 L132 35 M48 87 L132 56', '#f6e9ba38', 7);
    const glow = c.createRadialGradient(88, 191, 3, 88, 191, 68); glow.addColorStop(0, '#ffdfa654'); glow.addColorStop(1, '#ffdfa600');
    c.fillStyle = glow; c.fillRect(43, 117, 94, 118); c.restore();
    box(40, 247, 100, 84, 2, '#6b513c'); box(46, 253, 88, 70, 2, panel, '#bf9866', 1.5);
    line('M51 259 L51 316 M59 256 L58 320 M125 260 L125 316', '#d3ad713d', 1.2);
    box(127, 241, 8, 26, 3, '#695c40', '#d8b574', 1.4);
    box(113, 247, 21, 6, 2, '#d4b475', ink, 1.4); line('M116 248 L130 248', '#f2d899', 1.2);
    for (const y of [89, 275]) { box(31, y, 6, 18, 1, '#c3a574', '#725b40', 1.2); line(`M34 ${y + 3} L34 ${y + 14}`, '#ead5a5', .8); }
    box(12, 342, 156, 9, 2, '#b4a483'); line('M17 345 L162 345', '#e6d3a3', 1.5);
    this.texture = new THREE.CanvasTexture(canvas); this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter; this.texture.magFilter = THREE.LinearFilter;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 5.45), new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, depthWrite: false }));
    this.mesh.position.set(2.9, 6.2, -.5); this.group.add(this.mesh); this.group.visible = false; scene.add(this.group);
  }

  setVisible(visible: boolean): void { this.group.visible = visible; }
  update(_time: number): void { /* Static doorway; the game owns the white transition effect. */ }
  dispose(): void { this.group.removeFromParent(); this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.texture.dispose(); }
}
