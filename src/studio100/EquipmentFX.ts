import * as THREE from 'three';
import { ITEMS, isWeapon, type Weapon } from './ItemCatalog';
import type { SkillEvent } from './EquipmentSkills';
import type { MotionBody } from './CombatMotion';
import { toolDrawing } from './StudioArt';

type Style='arc'|'ring'|'line'|'splash'|'flash'|'guard';
type Sprite=THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;
export type ProjectileImpact = Pick<SkillEvent, 'force' | 'lift' | 'slow' | 'stun' | 'style'>;
type Shot={mesh:Sprite;weapon:Weapon;damage:number;vx:number;life:number;remaining:number;bounces:number;radius:number;impact?:ProjectileImpact};
type Burst={mesh:Sprite;life:number;duration:number;grow:number;anchor?:MotionBody;dir:number};
/** Bounded cosmetic effects and item-specific projectiles; player text is never involved. */
export class EquipmentFX {
 private shots:Shot[]=[];private bursts:Burst[]=[];private textures=new Map<string,THREE.CanvasTexture>();
 constructor(private scene:THREE.Scene){}
 private texture(key:string):THREE.CanvasTexture {
  const cached=this.textures.get(key);if(cached)return cached;
  const c=document.createElement('canvas');c.width=128;c.height=128;const g=c.getContext('2d')!;
  g.translate(64,64);g.strokeStyle='#fff6d9';g.fillStyle='#fff6d9';g.lineCap='round';g.lineJoin='round';
  if(key==='lead'){g.rotate(-.15);g.fillStyle='#434657';g.fillRect(-42,-4,84,8);g.fillStyle='#b9dce1';g.fillRect(-35,-4,55,2);}
  else if(key==='staple'){g.lineWidth=7;g.beginPath();g.moveTo(-30,22);g.lineTo(-30,-16);g.lineTo(30,-16);g.lineTo(30,22);g.stroke();}
  else if(key==='keycap'){g.beginPath();g.roundRect(-26,-26,52,52,8);g.fill();g.strokeStyle='#506271';g.lineWidth=4;g.stroke();g.fillStyle='#536270';g.textAlign='center';g.textBaseline='middle';g.font='bold 36px sans-serif';g.fillText('+',0,0);}
  else if(key==='eraser'){toolDrawing(g,'eraser',0,0,1);}
  else if(key==='cup'){toolDrawing(g,'cup',0,0,1.25);}
  else if(key==='arc'){g.lineWidth=12;g.beginPath();g.ellipse(0,0,46,38,-.35,-1.3,1.8);g.stroke();g.lineWidth=3;g.beginPath();g.ellipse(0,0,34,29,-.35,-1.3,1.8);g.stroke();}
  else if(key==='line'){g.lineWidth=8;g.beginPath();g.moveTo(-57,0);g.lineTo(55,0);g.stroke();g.lineWidth=3;for(let x=-45;x<50;x+=12){g.beginPath();g.moveTo(x,-9);g.lineTo(x,5);g.stroke();}}
  else if(key==='ring'){g.lineWidth=8;g.beginPath();g.ellipse(0,8,52,24,0,0,Math.PI*2);g.stroke();}
  else if(key==='guard'){g.lineWidth=7;g.beginPath();g.moveTo(-39,-40);g.quadraticCurveTo(0,-57,39,-40);g.lineTo(32,20);g.quadraticCurveTo(16,48,0,55);g.quadraticCurveTo(-16,48,-32,20);g.closePath();g.globalAlpha=.22;g.fill();g.globalAlpha=1;g.stroke();}
  else if(key==='flash'){for(let i=0;i<12;i++){g.rotate(Math.PI/6);g.beginPath();g.moveTo(19,0);g.lineTo(56,0);g.lineWidth=i%2?4:8;g.stroke();}g.beginPath();g.arc(0,0,18,0,Math.PI*2);g.fill();}
  else {for(let i=0;i<9;i++){const a=i*2.4,r=12+(i%3)*13;g.beginPath();g.ellipse(Math.cos(a)*r,Math.sin(a)*r,10+(i%2)*5,7, a,0,Math.PI*2);g.fill();}}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;this.textures.set(key,t);return t;
 }
 private sprite(key:string,tint:string,x:number,y:number,w:number,h:number):Sprite{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:this.texture(key),color:tint,transparent:true,depthWrite:false}));m.position.set(x,y,5);this.scene.add(m);return m;}
 burst(style:Style,x:number,y:number,tint:string,dir=1,size=3,duration=.35,anchor?:MotionBody):void {
  if(this.bursts.length>=36 || ![x,y,size,duration].every(Number.isFinite) || size<=0 || duration<=0)return;
  dir=dir<0?-1:1;size=Math.min(size,16);duration=Math.min(duration,3);
  const mesh=this.sprite(style,tint,x,y,size,style==='line'?.8:size);mesh.scale.x=dir;
  this.bursts.push({mesh,life:0,duration,grow:style==='ring'||style==='flash'?.8:.25,anchor,dir});
 }
 fire(weapon:Weapon,x:number,y:number,dir:number,damage:number,range:number,bounces=0,large=false,impact?:ProjectileImpact):void {
  if(this.shots.length>=30 || !isWeapon(weapon) || ![x,y,dir,damage,range].every(Number.isFinite) || dir===0 || damage<=0 || range<=0)return;
  dir=dir<0?-1:1;
  bounces=Number.isFinite(bounces)?Math.max(0,Math.min(2,Math.floor(bounces))):0;
  range=Math.min(28,range);
  // A returned teacher projectile remains a cup; the racket itself stays in the student's hands.
  const key=weapon==='mechanicalPencil'?'lead':weapon==='stapler'?'staple':weapon==='calculator'?'keycap':weapon==='eraser'?'eraser':weapon==='cup'||weapon==='tennisRacket'?'cup':'splash';
  const size=large?1.5:key==='lead'?.85:.7,speed=key==='lead'?24:key==='eraser'?13:18;
  const tint=['eraser','cup','lead','keycap'].includes(key)?'#ffffff':ITEMS[weapon].tint;
  const mesh=this.sprite(key,tint,Math.max(2,Math.min(30,x)),y,key==='lead'?(large?1.8:1.2):size,key==='lead'?(large?.45:.3):size);mesh.scale.x=dir;
  this.shots.push({
   mesh,weapon,damage,vx:dir*speed,life:0,
   // Each permitted rebound has enough travel budget to reach the opposite classroom wall.
   remaining:(range+28*bounces)/speed,bounces,radius:large?1.5:.7,
   impact:impact?{...impact}:undefined,
  });
 }
 update(dt:number,hero:MotionBody,boss:MotionBody,active:boolean,onHit:(weapon:Weapon,damage:number,dir:number,impact?:ProjectileImpact)=>void):void {
  if(!Number.isFinite(dt)||dt<=0)return;
  for(let i=this.bursts.length-1;i>=0;i--){
   const b=this.bursts[i];b.life+=dt;
   if(b.life>=b.duration){this.remove(b.mesh);this.bursts.splice(i,1);continue;}
   if(b.anchor)b.mesh.position.set(b.anchor.x+b.dir*.9,b.anchor.y+1.6,5);
   const scale=1+b.life/b.duration*b.grow;b.mesh.scale.set(scale*b.dir,scale,1);b.mesh.material.opacity=(1-b.life/b.duration)*.85;
  }
  // Hit callbacks may start a fight or change scene, both of which clear effects.
  // Snapshot iteration and removal before callbacks prevent stale or duplicate hits.
  for(const p of [...this.shots]){
   if(!this.shots.includes(p))continue;
   const step=Math.min(dt,p.remaining);p.life+=step;p.remaining-=step;
   let travel=Math.abs(p.vx)*step;
   p.mesh.rotation.z=p.weapon==='eraser'?p.life*10:p.weapon==='calculator'?Math.sin(p.life*15)*.3:0;
   while(travel>1e-8 && this.shots.includes(p)){
    const oldX=p.mesh.position.x,dir=Math.sign(p.vx),wall=dir>0?30:2;
    const toWall=Math.max(0,(wall-oldX)*dir),distance=Math.min(travel,toWall),nextX=oldX+dir*distance;
    const left=Math.min(oldX,nextX)-p.radius,right=Math.max(oldX,nextX)+p.radius;
    p.mesh.position.x=nextX;
    if(active && boss.x>=left && boss.x<=right && Math.abs(boss.y+1.3-p.mesh.position.y)<p.radius+.8){
     this.removeShot(p);
     onHit(p.weapon,p.damage,dir,p.impact);
     break;
    }
    travel-=distance;
    if(distance>=toWall-1e-8){
     if(p.bounces>0){
      p.bounces--;p.vx=-p.vx;p.mesh.scale.x=Math.sign(p.vx);
      this.burst('ring',wall,p.mesh.position.y,ITEMS[p.weapon].tint,1,1,.2);
     }else{this.removeShot(p);break;}
    }
   }
   if(this.shots.includes(p)&&p.remaining<=1e-8)this.removeShot(p);
  }
  void hero;
 }
 private removeShot(shot:Shot):void {
  const index=this.shots.indexOf(shot);
  if(index<0)return;
  this.shots.splice(index,1);this.remove(shot.mesh);
 }
 clear():void{for(const p of this.shots)this.remove(p.mesh);for(const b of this.bursts)this.remove(b.mesh);this.shots=[];this.bursts=[];}
 /** Release cached artwork when the whole game is destroyed, not between scenes. */
 dispose():void{this.clear();for(const texture of this.textures.values())texture.dispose();this.textures.clear();}
 private remove(m:Sprite):void{this.scene.remove(m);m.geometry.dispose();m.material.dispose();}
}
