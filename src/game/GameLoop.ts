/** Fixed-clamp game loop: update(dt) + render() every animation frame. */
export class GameLoop {
  private rafId = 0;
  private lastTime = 0;
  private running = false;

  constructor(
    private readonly update: (dt: number) => void,
    private readonly render: () => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private readonly tick = (now: number): void => {
    if (!this.running) return;
    // Clamp dt so tab-switch hitches can't tunnel through platforms.
    const dt = Math.max(0, Math.min((now - this.lastTime) / 1000, 0.05));
    this.lastTime = now;
    this.update(dt);
    this.render();
    this.rafId = requestAnimationFrame(this.tick);
  };
}
