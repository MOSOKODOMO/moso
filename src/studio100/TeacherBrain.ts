import { CLASSROOM_PLATFORMS, standingOn, type MotionBody } from './CombatMotion';
export type TeacherMove='jab'|'sweep'|'uppercut'|'kick'|'throw';
type View={hero:MotionBody;boss:MotionBody;tool:'pen'|'ruler'|'cup';held:boolean;propNear:boolean;propThreat:boolean;heroAttacking:boolean;busy:boolean};
export class TeacherBrain {
 private think=0;private attackWait=.8;private jumpWait=.5;private dodgeWait=0;private axis=0;
 private aggression=.5;
 constructor(private random:()=>number=Math.random){}
 reset(id:string){this.think=0;this.attackWait=.8;this.jumpWait=.5;this.dodgeWait=0;this.axis=0;this.aggression=.35+(Array.from(id).reduce((a,c)=>a+c.charCodeAt(0),0)%50)/100;}
 update(dt:number,v:View):{axis:number;jump:boolean;drop:boolean;dodge:number;pickup:boolean;move:TeacherMove|null}{
  this.think-=dt;this.attackWait-=dt;this.jumpWait-=dt;this.dodgeWait-=dt;
  const out={axis:this.axis,jump:false,drop:false,dodge:0,pickup:false,move:null as TeacherMove|null};
  if(v.busy||v.boss.stun>0){out.axis=0;return out;}
  if(this.think>0)return out;
  this.think=.18+this.random()*.24;
  const dx=v.hero.x-v.boss.x,dy=v.hero.y-v.boss.y,dir=Math.sign(dx)||1,distance=Math.abs(dx);
  const preferred=v.held||v.tool==='cup'?6:2.6;
  this.axis=distance>preferred+1?dir:distance<preferred-1?-dir:0;
  if(v.boss.x<3)this.axis=1;if(v.boss.x>29)this.axis=-1;
  if(v.propNear&&!v.held&&this.random()<.6)out.pickup=true;
  if(this.dodgeWait<=0&&(v.propThreat||(v.heroAttacking&&distance<4))&&this.random()<.55){
   out.dodge=distance<3?-dir:dir;this.dodgeWait=1.6+this.random();this.attackWait=Math.max(this.attackWait,.4);
  }
  if(standingOn(v.boss)&&this.jumpWait<=0){
   if(dy>1){
    const next=CLASSROOM_PLATFORMS.filter(p=>p.y>v.boss.y+.5&&p.y-v.boss.y<5).sort((a,b)=>(Math.abs((a.x1+a.x2)/2-v.hero.x)+Math.abs((a.x1+a.x2)/2-v.boss.x)*.5)-(Math.abs((b.x1+b.x2)/2-v.hero.x)+Math.abs((b.x1+b.x2)/2-v.boss.x)*.5))[0];
    if(next){const target=Math.max(next.x1+.5,Math.min(next.x2-.5,v.hero.x));this.axis=Math.abs(target-v.boss.x)>.7?Math.sign(target-v.boss.x):dir;if(Math.abs(target-v.boss.x)<5){out.jump=true;this.jumpWait=1.1;}}
   }else if(v.propThreat||this.random()<.13){out.jump=true;this.jumpWait=1.2+this.random();}
   if(dy<-2 && this.random()<.6)out.drop=true;
  }
  if(this.attackWait<=0&&distance<(v.held||v.tool==='cup'?14:4.8)){
   if(v.held&&distance>2.5)out.move='throw';
   else if(Math.abs(dy)<2.5){const roll=this.random();out.move=!standingOn(v.boss)&&distance<4?'kick':roll<.2?'uppercut':v.tool==='cup'?'throw':v.tool==='ruler'&&roll<.75?'sweep':'jab';}
   if(out.move)this.attackWait=1.15+(1-this.aggression)*.65+this.random()*.65;
  }
  out.axis=this.axis;return out;
 }
}

