/** Small math helpers shared across gameplay code. */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Frame-rate independent exponential smoothing factor. */
export function dampFactor(smoothing: number, dt: number): number {
  return 1 - Math.exp(-smoothing * dt);
}

export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function chance(probability: number): boolean {
  return Math.random() < probability;
}
