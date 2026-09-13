/** Destination commits once behind a closed curtain. Partial trips never enter the save. */
export class SceneTransition {
  private trip: { elapsed: number; duration: number; committed: boolean; commit: () => void; done: () => void } | null = null;
  get active(): boolean { return this.trip !== null; }
  get progress(): number { return this.trip ? Math.min(1, this.trip.elapsed / this.trip.duration) : 1; }
  get cover(): number { const p = this.progress; const t = p < .4 ? p / .4 : p > .65 ? (1 - p) / .35 : 1; return t * t * (3 - 2 * t); }
  start(commit: () => void, done: () => void, duration = 1): boolean {
    if (this.trip) return false;
    this.trip = { elapsed: 0, duration, committed: false, commit, done }; return true;
  }
  update(dt: number): void {
    const trip = this.trip; if (!trip) return;
    trip.elapsed += Math.max(0, dt);
    if (!trip.committed && this.progress >= .45) { trip.committed = true; trip.commit(); }
    if (trip.elapsed >= trip.duration) { this.trip = null; trip.done(); }
  }
}
