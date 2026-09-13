import { STUDIO_GROUND, type MotionBody } from './CombatMotion';

type TeachingIntent = { axis: number; facing: number; gesture: number };

/** A quiet board → desk → discussion routine, separate from the combat AI. */
export class TeachingMotion {
  private stops = [26.6, 20.6, 15.4, 23.2];
  private stop = 0;
  private pause = .6;
  private phase = 0;
  private facing = -1;

  reset(id: string): void {
    const seed = Array.from(id).reduce((sum, c) => sum + c.charCodeAt(0), 0);
    this.stop = seed % this.stops.length;
    this.pause = .6;
    this.phase = seed % 6;
    this.facing = -1;
  }

  update(dt: number, teacher: MotionBody, student: MotionBody): TeachingIntent {
    this.phase += dt;
    const dx = student.x - teacher.x;
    const nearby = Math.abs(dx) < 4.4 && Math.abs(student.y - teacher.y) < 3;
    const airborne = teacher.y > STUDIO_GROUND + .05;
    if (nearby) this.facing = Math.sign(dx) || this.facing;

    // Stop to explain a point when approached; do not shove the student aside.
    if (nearby || airborne || this.pause > 0) {
      this.pause = Math.max(0, this.pause - dt);
      return { axis: 0, facing: this.facing, gesture: .08 + Math.max(0, Math.sin(this.phase * 2.5)) * .12 };
    }

    const distance = this.stops[this.stop] - teacher.x;
    if (Math.abs(distance) < .25) {
      this.stop = (this.stop + 1) % this.stops.length;
      this.pause = 2.1 + this.stop * .45;
      this.facing = Math.sign(dx) || this.facing;
      return { axis: 0, facing: this.facing, gesture: .1 };
    }

    this.facing = Math.sign(distance);
    return { axis: this.facing, facing: this.facing, gesture: 0 };
  }
}
