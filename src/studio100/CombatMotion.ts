/** Small arcade impulses, independent of rendering and the old farming-game physics. */
export const STUDIO_GROUND = 3.55;
export interface MotionBody { x: number; y: number; vx: number; vy: number; hitVx: number; stun: number }
export interface ArenaPlatform { x1:number; x2:number; y:number; kind:'desk'|'light' }
export const CLASSROOM_PLATFORMS: ArenaPlatform[] = [
  {x1:4,x2:10.4,y:7.4,kind:'desk'}, {x1:13,x2:17.7,y:7.4,kind:'desk'}, {x1:24,x2:29.5,y:7.4,kind:'desk'},
  {x1:9.4,x2:12.6,y:10.7,kind:'light'}, {x1:18.8,x2:22.2,y:10.7,kind:'light'},
];
export function standingOn(body:MotionBody,platforms:readonly ArenaPlatform[]=CLASSROOM_PLATFORMS):boolean {
  return Math.abs(body.vy)<.01 && (body.y<=STUDIO_GROUND+.02 || platforms.some(p=>body.x>=p.x1&&body.x<=p.x2&&Math.abs(body.y-p.y)<.03));
}
export function resetMotion(body: MotionBody): void { body.vx = 0; body.vy = 0; body.hitVx = 0; body.stun = 0; body.y = STUDIO_GROUND; }
export function hitImpulse(body: MotionBody, direction: number, strength: number, lift: number, stun: number): void {
  body.hitVx = (direction < 0 ? -1 : 1) * strength;
  body.vx *= .15; body.vy = Math.max(body.vy, lift); body.stun = Math.max(body.stun, stun);
}
/** Exact exponential displacement keeps drag consistent at different frame rates. */
export function stepMotion(body: MotionBody, axis: number, speed: number, dt: number, rightBoundary = 30, platforms:readonly ArenaPlatform[]=[], dropThrough=false, ceiling=13.7): boolean {
  const previousY=body.y;
  const wasAirborne = body.y > STUDIO_GROUND + .001 || body.vy > 0;
  const target = body.stun > 0 ? 0 : axis * speed;
  const acceleration = body.y > STUDIO_GROUND + .01 ? 8 : 18;
  const blend = Math.exp(-acceleration * dt), drag = Math.exp(-9 * dt);
  body.x += target * dt + (body.vx - target) * (1 - blend) / acceleration + body.hitVx * (1 - drag) / 9;
  body.vx = target + (body.vx - target) * blend;
  body.hitVx *= drag;
  body.y += body.vy * dt - 12 * dt * dt; body.vy -= 24 * dt;
  body.stun = Math.max(0, body.stun - dt);
  if (body.x < 2 || body.x > rightBoundary) { body.x = Math.min(rightBoundary, Math.max(2, body.x)); body.hitVx = 0; body.vx = 0; }
  if(!dropThrough && body.vy<=0){
    const landing=platforms.filter(p=>body.x>=p.x1&&body.x<=p.x2&&previousY>=p.y-.03&&body.y<=p.y).sort((a,b)=>b.y-a.y)[0];
    if(landing){body.y=landing.y;body.vy=0;return previousY>landing.y+.03;}
  }
  if (body.y <= STUDIO_GROUND) { body.y = STUDIO_GROUND; body.vy = 0; return wasAirborne; }
  if(platforms.length && body.y>ceiling){body.y=ceiling;body.vy=Math.min(0,body.vy);}
  return false;
}
/** Bodies share the floor, but a jumping student can pass over an instructor. */
export function separateBodies(a: MotionBody, b: MotionBody): void {
  const gap = b.x - a.x;
  if (Math.abs(a.y - b.y) > 1.25 || Math.abs(gap) >= 1.35) return;
  const push = (1.35 - Math.abs(gap)) / 2, dir = gap < 0 ? -1 : 1;
  a.x = Math.min(30, Math.max(2, a.x - dir * push)); b.x = Math.min(30, Math.max(2, b.x + dir * push));
  if (Math.abs(b.x - a.x) < 1.35 - 1e-6) {
    if (dir > 0) { if (a.x <= 2) b.x = 3.35; else a.x = 28.65; }
    else { if (b.x <= 2) a.x = 3.35; else b.x = 28.65; }
  }
}
