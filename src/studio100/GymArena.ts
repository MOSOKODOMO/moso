import * as THREE from 'three';
import { STUDIO_GROUND, type MotionBody } from './CombatMotion';
import { GYM_BAG, GYM_PLATFORMS, GYM_WEIGHT_SPAWNS } from './GymLayout';

type WeightKind='dumbbell'|'barbell';
type Sprite=THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;
type Weight={kind:WeightKind;x:number;y:number;vx:number;vy:number;angle:number;state:'rest'|'held'|'flying';bounces:number;timer:number;bagCooldown:number;homeX:number;homeY:number;mesh:Sprite};
function canvasTexture(width:number,height:number,draw:(c:CanvasRenderingContext2D)=>void){const el=document.createElement('canvas');el.width=width;el.height=height;draw(el.getContext('2d')!);const t=new THREE.CanvasTexture(el);t.colorSpace=THREE.SRGBColorSpace;return t;}
function weightTexture(kind:WeightKind){return canvasTexture(360,120,c=>{
 const metal=c.createLinearGradient(0,44,0,76);metal.addColorStop(0,'#ddd2b3');metal.addColorStop(.35,'#b3b7ab');metal.addColorStop(.5,'#697b77');metal.addColorStop(.85,'#9eab9d');metal.addColorStop(1,'#354542');
 c.fillStyle=metal;c.strokeStyle='#263632';c.lineWidth=4;c.beginPath();c.roundRect(12,51,336,18,6);c.fill();c.stroke();
 const plate=(x:number,w:number,h:number)=>{const paint=c.createLinearGradient(x,0,x+w,0);paint.addColorStop(0,'#24332f');paint.addColorStop(.4,'#56655c');paint.addColorStop(.55,'#738072');paint.addColorStop(1,'#2c3b36');c.fillStyle=paint;c.beginPath();c.roundRect(x,60-h/2,w,h,9);c.fill();c.stroke();c.strokeStyle='#a8ac90';c.lineWidth=2;c.beginPath();c.moveTo(x+8,64-h/2);c.lineTo(x+8,54+h/2);c.stroke();c.strokeStyle='#263632';c.lineWidth=4;};
 if(kind==='barbell'){plate(29,19,77);plate(48,27,108);plate(285,27,108);plate(312,19,77);}else{plate(62,48,94);plate(110,20,74);plate(230,20,74);plate(250,48,94);}
 c.strokeStyle='#3c4d48';c.lineWidth=2;for(let x=146;x<218;x+=7){c.beginPath();c.moveTo(x,54);c.lineTo(x-5,66);c.stroke();}
 });}
function bagTexture(){return canvasTexture(180,420,c=>{
 const leather=c.createLinearGradient(20,0,160,0);leather.addColorStop(0,'#253b35');leather.addColorStop(.24,'#48635a');leather.addColorStop(.55,'#66766a');leather.addColorStop(.83,'#354c44');leather.addColorStop(1,'#1c302b');
 c.fillStyle=leather;c.strokeStyle='#20302a';c.lineWidth=5;c.beginPath();c.roundRect(13,8,154,400,40);c.fill();c.stroke();
 const belt=c.createLinearGradient(16,0,164,0);belt.addColorStop(0,'#8b6b43');belt.addColorStop(.4,'#c2a875');belt.addColorStop(1,'#725435');c.fillStyle=belt;c.fillRect(16,142,148,135);
 c.strokeStyle='#d1bb8f';c.lineWidth=2;c.setLineDash([5,5]);for(const y of [27,148,271,389]){c.beginPath();c.moveTo(33,y);c.lineTo(147,y);c.stroke();}c.setLineDash([]);
 c.strokeStyle='#192f2a';c.lineWidth=3;c.beginPath();c.moveTo(136,32);c.lineTo(140,383);c.stroke();c.strokeStyle='#a4ad91';c.globalAlpha=.4;c.lineWidth=2;c.beginPath();c.moveTo(37,45);c.quadraticCurveTo(30,130,35,140);c.stroke();c.globalAlpha=1;
 c.strokeStyle='#6d5336';c.lineWidth=4;c.beginPath();c.moveTo(70,189);c.lineTo(109,189);c.lineTo(91,222);c.closePath();c.stroke();
 });}
/** Reusable, loose gym weights and a damped pendulum training bag. No progression rewards. */
export class GymArena {
 readonly group=new THREE.Group();readonly props:Weight[]=[];
 readonly bagPivot=new THREE.Group();private bagAngle=0;private bagVelocity=0;
 private textures:THREE.Texture[]=[];
 constructor(scene:THREE.Scene,private onImpact:(x:number,y:number,dir:number)=>void){
  scene.add(this.group);this.group.visible=false;this.group.add(this.bagPivot);this.bagPivot.position.set(GYM_BAG.x,GYM_BAG.anchorY,.4);
  const bag=bagTexture();this.textures.push(bag);const body=this.sprite(bag,GYM_BAG.width,GYM_BAG.height);body.position.set(0,-GYM_BAG.length,0);this.bagPivot.add(body);
  const top=-GYM_BAG.length+GYM_BAG.height/2;
  for(const dir of [-1,1]){const endX=dir*.45,midY=top/2;const chain=new THREE.Mesh(new THREE.PlaneGeometry(.045,Math.hypot(endX,top)),new THREE.MeshBasicMaterial({color:'#756e57'}));chain.position.set(endX/2,midY,0);chain.rotation.z=-Math.atan2(endX,-top);this.bagPivot.add(chain);}
  const hook=new THREE.Mesh(new THREE.RingGeometry(.11,.17,20),new THREE.MeshBasicMaterial({color:'#b5a783',side:THREE.DoubleSide}));this.bagPivot.add(hook);
  const textures={dumbbell:weightTexture('dumbbell'),barbell:weightTexture('barbell')};this.textures.push(...Object.values(textures));
  for(const p of GYM_WEIGHT_SPAWNS){const width=p.kind==='barbell'?3.4:1.65,mesh=this.sprite(textures[p.kind],width,p.kind==='barbell'?1.05:.75);this.group.add(mesh);this.props.push({...p,homeX:p.x,homeY:p.y,vx:0,vy:0,angle:0,state:'rest',bounces:0,timer:0,bagCooldown:0,mesh});}
  this.sync();
 }
 private sprite(map:THREE.Texture,w:number,h:number):Sprite{return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false}));}
 setVisible(on:boolean){this.group.visible=on;}
 reset(){this.bagAngle=this.bagVelocity=0;for(const p of this.props){p.x=p.homeX;p.y=p.homeY;p.vx=p.vy=p.angle=p.timer=p.bounces=p.bagCooldown=0;p.state='rest';}this.sync();}
 held(){return this.props.find(p=>p.state==='held');}
 nearby(body:MotionBody){return this.props.filter(p=>p.state==='rest'&&Math.abs(p.x-body.x)<1.65&&Math.abs(p.y-body.y-.55)<1.4).sort((a,b)=>Math.abs(a.x-body.x)-Math.abs(b.x-body.x))[0];}
 pickup(body:MotionBody){if(!this.group.visible||this.held())return false;const p=this.nearby(body);if(!p)return false;p.state='held';p.vx=p.vy=p.angle=0;return true;}
 throw(body:MotionBody,dir:number){const p=this.held();if(!this.group.visible||!p)return false;p.state='flying';p.x=body.x+dir*.9;p.y=body.y+1.2;p.vx=dir*(p.kind==='barbell'?10:15);p.vy=p.kind==='barbell'?7:8.5;p.timer=p.bounces=p.bagCooldown=0;return true;}
 private bagCenter(){return {x:GYM_BAG.x+Math.sin(this.bagAngle)*GYM_BAG.length,y:GYM_BAG.anchorY-Math.cos(this.bagAngle)*GYM_BAG.length};}
 private hitBag(dir:number,power:number){this.bagVelocity=Math.max(-1.65,Math.min(1.65,this.bagVelocity+dir*Math.min(1.15,.32+power*.012)));const c=this.bagCenter();this.onImpact(c.x,c.y,dir);}
 strikeBag(x:number,y:number,dir:number,range:number,power:number){
  if(!this.group.visible)return false;const c=this.bagCenter(),dx=(c.x-x)*dir;
  if(dx<-.35||dx>range+GYM_BAG.width/2||Math.abs(c.y-y)>GYM_BAG.height/2+1)return false;this.hitBag(dir,power);return true;
 }
 /** Swept segment vs padded bag rectangle: fast small projectiles cannot tunnel through it. */
 projectileHit(x1:number,y1:number,x2:number,y2:number,radius:number,dir:number,power:number){
  if(!this.group.visible)return false;const c=this.bagCenter(),hw=GYM_BAG.width/2+radius,hh=GYM_BAG.height/2+radius;
  let lo=0,hi=1;
  for(const [start,delta,min,max] of [[x1,x2-x1,c.x-hw,c.x+hw],[y1,y2-y1,c.y-hh,c.y+hh]]){
   if(Math.abs(delta)<1e-8){if(start<min||start>max)return false;continue;}
   const a=(min-start)/delta,b=(max-start)/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi)return false;
  }
  this.hitBag(dir,power);return true;
 }
 update(dt:number,hero:MotionBody,facing:number,hands?:{front:{x:number;y:number};back:{x:number;y:number}}){
  if(!this.group.visible||!Number.isFinite(dt)||dt<=0)return;
  // Small substeps keep the pendulum stable even after a slow frame.
  const steps=Math.max(1,Math.ceil(dt/(1/120))),h=dt/steps;
  for(let n=0;n<steps;n++){this.bagVelocity+=(-16/GYM_BAG.length*Math.sin(this.bagAngle)-.8*this.bagVelocity)*h;this.bagAngle+=this.bagVelocity*h;if(Math.abs(this.bagAngle)>.67){this.bagAngle=Math.sign(this.bagAngle)*.67;this.bagVelocity*=-.2;}}
  for(const p of this.props){
   if(p.state==='held'){p.x=hands?(p.kind==='barbell'?(hands.front.x+hands.back.x)/2:hands.front.x):hero.x+(p.kind==='dumbbell'?facing*.646:0);p.y=hands?(p.kind==='barbell'?(hands.front.y+hands.back.y)/2:hands.front.y):hero.y+1.059;p.angle=p.kind==='dumbbell'?facing*.08:0;continue;}
   if(p.state!=='flying')continue;p.bagCooldown=Math.max(0,p.bagCooldown-dt);
   const oldX=p.x,oldY=p.y;p.timer+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt-12*dt*dt;p.vy-=24*dt;p.angle+=p.vx*dt*(p.kind==='barbell'?.16:.45);
   if(p.bagCooldown===0&&this.projectileHit(oldX,oldY,p.x,p.y,p.kind==='barbell'?.5:.3,Math.sign(p.vx)||facing,p.kind==='barbell'?48:25)){p.bagCooldown=.35;p.vx*=-.32;p.vy=Math.max(3,p.vy);p.x=oldX;}
   const radius=p.kind==='barbell'?.5:.35;
   const surface=[{x1:2,x2:30,y:STUDIO_GROUND},...GYM_PLATFORMS].filter(s=>p.x>=s.x1&&p.x<=s.x2&&oldY>=s.y+radius-.05&&p.y<=s.y+radius&&p.vy<0).sort((a,b)=>b.y-a.y)[0];
   if(surface){p.y=surface.y+radius;p.bounces++;if(p.bounces>=2||Math.abs(p.vy)<3){p.state='rest';p.vx=p.vy=p.angle=0;}else{p.vy*=-.3;p.vx*=.55;}}
   if(p.x<2+radius||p.x>30-radius){p.x=Math.max(2+radius,Math.min(30-radius,p.x));p.vx*=-.35;}
   if(p.timer>8||p.y<STUDIO_GROUND-1){p.state='rest';p.x=p.homeX;p.y=p.homeY;p.vx=p.vy=p.angle=0;}
  }
  this.sync();
 }
 private sync(){this.bagPivot.rotation.z=this.bagAngle;for(const p of this.props){p.mesh.position.set(p.x,p.y,p.state==='held'?1.9:p.state==='flying'?4:1);p.mesh.rotation.z=p.angle;}}
 dispose(){this.group.removeFromParent();this.group.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)m.dispose();}});for(const t of this.textures)t.dispose();}
}
