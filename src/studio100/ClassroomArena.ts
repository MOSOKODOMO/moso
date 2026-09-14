import * as THREE from 'three';
import { CLASSROOM_PLATFORMS, STUDIO_GROUND, type MotionBody } from './CombatMotion';
import { toolDrawing } from './StudioArt';
export type PropKind='cup'|'ruler';
export type PropOwner='hero'|'boss';
type Prop={kind:PropKind;x:number;y:number;vx:number;vy:number;homeX:number;homeY:number;state:'rest'|'held'|'flying'|'spent';owner:PropOwner|null;timer:number;bounces:number;mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>};
function mapTexture(draw:(c:CanvasRenderingContext2D)=>void,w=160,h=160){const el=document.createElement('canvas');el.width=w;el.height=h;draw(el.getContext('2d')!);const t=new THREE.CanvasTexture(el);t.colorSpace=THREE.SRGBColorSpace;return t;}
/** Shared world props: either fighter can pick up the same cup/ruler and throw it. */
export class ClassroomArena {
 readonly group=new THREE.Group();
 readonly props:Prop[]=[];
 private time=0;
 constructor(scene:THREE.Scene){
  scene.add(this.group);this.group.visible=false;
  for(const p of CLASSROOM_PLATFORMS){
   const lamp=p.kind==='light',w=p.x2-p.x1;
   const tex=mapTexture(c=>{
    c.fillStyle=lamp?'#cfa066':'#ab835b';c.strokeStyle='#463f35';c.lineWidth=5;
    c.beginPath();c.roundRect(5,8,310,lamp?24:18,8);c.fill();c.stroke();
    c.fillStyle=lamp?'#fff1b3':'#dbc19a';c.fillRect(14,10,292,5);
    if(lamp){c.fillStyle='#ffe9a566';c.fillRect(22,34,276,12);}
   },320,64);
   const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,.55),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));
   mesh.position.set((p.x1+p.x2)/2,p.y-.2,.5);this.group.add(mesh);
   if(lamp){const cable=new THREE.Mesh(new THREE.PlaneGeometry(.035,18-p.y),new THREE.MeshBasicMaterial({color:'#514b40'}));cable.position.set((p.x1+p.x2)/2,(18+p.y)/2,-.2);this.group.add(cable);}
  }
  const textures={cup:mapTexture(c=>toolDrawing(c,'cup',80,88,1.3)),ruler:mapTexture(c=>{c.translate(80,80);c.rotate(.8);toolDrawing(c,'ruler',0,0,1)})};
  for(const [kind,x,y]of [['cup',6,7.95],['ruler',15,7.95],['cup',26,7.95],['ruler',19,4.1],['cup',11.5,4.1]] as [PropKind,number,number][]){
   const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),new THREE.MeshBasicMaterial({map:textures[kind],transparent:true,depthWrite:false}));this.group.add(mesh);
   this.props.push({kind,x,y,vx:0,vy:0,homeX:x,homeY:y,state:'rest',owner:null,timer:0,bounces:0,mesh});
  }
 }
 reset(){for(const p of this.props){p.x=p.homeX;p.y=p.homeY;p.state='rest';p.owner=null;p.vx=p.vy=p.timer=p.bounces=0;p.mesh.visible=true;p.mesh.rotation.z=0;p.mesh.scale.set(1,1,1);}this.sync();}
 setVisible(on:boolean){this.group.visible=on;}
 held(owner:PropOwner){return this.props.find(p=>p.owner===owner&&p.state==='held');}
 nearby(body:MotionBody){return this.props.find(p=>p.state==='rest'&&Math.abs(p.x-body.x)<2.1&&Math.abs(p.y-(body.y+.6))<1.6);}
 pickup(owner:PropOwner,body:MotionBody):boolean{if(this.held(owner))return false;const p=this.nearby(body);if(!p)return false;p.state='held';p.owner=owner;return true;}
 throw(owner:PropOwner,body:MotionBody,facing:number,target?:MotionBody):boolean{
  const p=this.held(owner);if(!p)return false;
  p.state='flying';p.x=body.x+facing*1.1;p.y=body.y+1.8;p.vx=facing*(p.kind==='ruler'?21:17);
  const flight=target?Math.max(.2,Math.min(.8,Math.abs(target.x-p.x)/Math.abs(p.vx))):.5;
  p.vy=target?Math.max(-6,Math.min(12,(target.y+1.4-p.y)/flight+9*flight)):6;p.timer=0;p.bounces=0;return true;
 }
 drop(owner:PropOwner,body:MotionBody){const p=this.held(owner);if(p){p.state='flying';p.x=body.x;p.y=body.y+1;p.vx=2;p.vy=2;p.owner=null;p.timer=0;p.bounces=0;}}
 threat(body:MotionBody,owner:PropOwner){return this.props.some(p=>p.state==='flying'&&p.owner!==owner&&p.owner!==null&&Math.abs(p.x-body.x)<6&&Math.abs(p.y-body.y-1.4)<2.5&&Math.sign(p.vx)===Math.sign(body.x-p.x));}
 update(dt:number,hero:MotionBody,boss:MotionBody,heroFacing:number,onHit:(owner:PropOwner,kind:PropKind,direction:number)=>void,hands?:{hero:{x:number;y:number};boss:{x:number;y:number}}){
  if(!this.group.visible)return;this.time+=dt;
  for(const p of this.props){
   if(p.state==='spent'){p.timer-=dt;if(p.timer<=0){p.x=p.homeX;p.y=p.homeY;p.state='rest';p.owner=null;p.mesh.visible=true;}continue;}
   if(p.state==='held'){
    const body=p.owner==='hero'?hero:boss,dir=p.owner==='hero'?heroFacing:Math.sign(hero.x-boss.x)||1;
    const width=p.owner==='hero'?3.2:3.45,height=p.owner==='hero'?4.05:4.35;
    // Canvas hand (91.3,121.85) on a 130x165 sprite; place each handle at those fingers.
    const anchor=hands?.[p.owner!];
    const handX=anchor?.x??body.x+dir*(91.3/130-.5)*width,handY=anchor?.y??body.y+(1-121.85/165)*height;
    const scaleX=p.kind==='cup'?-dir:dir,angle=p.kind==='cup'?0:-dir*.24;
    const gripX=p.kind==='cup'?24*1.3*1.2/160:-Math.sin(.8)*48*1.2/160;
    const gripY=p.kind==='cup'?-(8+1.3)*1.2/160:-Math.cos(.8)*48*1.2/160;
    p.x=handX-(gripX*scaleX*Math.cos(angle)-gripY*Math.sin(angle));
    p.y=handY-(gripX*scaleX*Math.sin(angle)+gripY*Math.cos(angle));
    p.mesh.scale.x=scaleX;p.mesh.rotation.z=angle;continue;
   }
   if(p.state!=='flying'){p.mesh.rotation.z=Math.sin(this.time*2+p.homeX)*.08;continue;}
   const oldX=p.x,oldY=p.y;p.timer+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt-9*dt*dt;p.vy-=18*dt;p.mesh.rotation.z+=dt*p.vx*.5;
   if(p.owner){const target=p.owner==='hero'?boss:hero,dx=p.x-oldX,dy=p.y-oldY;const t=Math.max(0,Math.min(1,((target.x-oldX)*dx+(target.y+1.4-oldY)*dy)/(dx*dx+dy*dy||1)));
    if(Math.hypot(target.x-oldX-dx*t,target.y+1.4-oldY-dy*t)<1.05){onHit(p.owner,p.kind,Math.sign(p.vx));p.state='spent';p.timer=5;p.mesh.visible=false;continue;}
   }
   const surfaces=[{x1:2,x2:30,y:STUDIO_GROUND},...CLASSROOM_PLATFORMS].filter(s=>p.x>=s.x1&&p.x<=s.x2&&oldY>=s.y+.3&&p.y<=s.y+.3&&p.vy<0).sort((a,b)=>b.y-a.y);
   if(surfaces.length){p.y=surfaces[0].y+.55;p.bounces++;if(p.bounces>=2||Math.abs(p.vy)<3){p.state='rest';p.owner=null;p.vx=p.vy=0;}else{p.vy=-p.vy*.36;p.vx*=.55;}}
   if(p.x<2||p.x>30){p.x=Math.max(2,Math.min(30,p.x));p.vx*=-.4;p.owner=null;}
   if(p.timer>5||p.y<STUDIO_GROUND-1){p.state='spent';p.timer=3;p.mesh.visible=false;}
  }this.sync();
 }
 reflectNear(body:MotionBody,facing:number):number {
  let count=0;for(const p of this.props){if(p.state!=='flying'||p.owner!=='boss'||(p.x-body.x)*facing<-.3||Math.abs(p.x-body.x)>3.4||Math.abs(p.y-body.y-1.4)>2.3||p.vx*facing>=0)continue;
   p.owner='hero';p.vx=facing*Math.max(18,Math.abs(p.vx));p.vy=3;p.timer=0;count++;
  }return count;
 }
 private sync(){for(const p of this.props)p.mesh.position.set(p.x,p.y,4);}
}
