import { CLASSROOM_PLATFORMS, standingOn, type MotionBody } from './CombatMotion';
import { studioDifficulty } from './StudioDifficulty';
export type TeacherMove='jab'|'sweep'|'uppercut'|'kick'|'throw';

type View={hero:MotionBody;boss:MotionBody;tool:'pen'|'ruler'|'cup';held:boolean;propNear:boolean;propThreat:boolean;heroAttacking:boolean;busy:boolean};
export class TeacherBrain {
 private think=0;private attackWait=.8;private jumpWait=.5;private dodgeWait=0;private axis=0;
 private difficulty=studioDifficulty(1);
 private recoveryPersonality=1;
 private jumpTarget:{x:number;y:number}|null=null;
 private launchTarget:number|null=null;
 constructor(private random:()=>number=Math.random){}
 reset(id:string,openingDelay=0,studio=1):void {
  this.difficulty=studioDifficulty(studio);
  const ai=this.difficulty.ai;
  this.think=Math.max(openingDelay,ai.openingDelay);this.attackWait=this.think+ai.thinkMin;
  this.jumpWait=.5;this.dodgeWait=this.think;this.axis=0;this.jumpTarget=null;this.launchTarget=null;
  // A small cadence variation gives teachers personality without overriding the floor.
  this.recoveryPersonality=1+((Array.from(id).reduce((sum,c)=>sum+c.charCodeAt(0),0)%101)/100-.5)*.08;
 }
 update(dt:number,v:View):{axis:number;jump:boolean;drop:boolean;dodge:number;pickup:boolean;move:TeacherMove|null}{
  const ai=this.difficulty.ai;
  this.think-=dt;this.attackWait-=dt;this.jumpWait-=dt;this.dodgeWait-=dt;
  const out={axis:this.axis,jump:false,drop:false,dodge:0,pickup:false,move:null as TeacherMove|null};
  if(v.busy||v.boss.stun>0){out.axis=0;return out;}
  // Keep an already chosen jump/launch on course between the slower tactical decisions.
  const groundedNow=standingOn(v.boss);
  if(!groundedNow&&this.jumpTarget){const gap=this.jumpTarget.x-v.boss.x;this.axis=Math.abs(gap)>.15?Math.sign(gap):0;out.axis=this.axis;}
  else if(groundedNow&&this.launchTarget!==null&&v.hero.y>v.boss.y+1){const gap=this.launchTarget-v.boss.x;this.axis=Math.abs(gap)>.15?Math.sign(gap):0;out.axis=this.axis;}
  if(this.think>0)return out;
  this.think=ai.thinkMin+this.random()*ai.thinkJitter;
  const dx=v.hero.x-v.boss.x,dy=v.hero.y-v.boss.y,dir=Math.sign(dx)||1,distance=Math.abs(dx);
  const ranged=ai.allowThrow&&(v.held||v.tool==='cup');
  // Jabs reach three units. Earlier cup teachers must close in for a jab.
  const preferred=ranged?6:v.tool==='ruler'?3.25:2.1,spacing=ranged?.8:.35;
  this.axis=distance>preferred+spacing?dir:distance<preferred-spacing?-dir:0;
  if(v.boss.x<3)this.axis=1;if(v.boss.x>29)this.axis=-1;
  if(ai.allowThrow&&v.propNear&&!v.held&&this.random()<ai.pickupChance){
   out.pickup=true;this.attackWait=Math.max(this.attackWait,.3);
  }
  if(ai.dodgeChance>0&&this.dodgeWait<=0&&(v.propThreat||(v.heroAttacking&&distance<4))&&this.random()<ai.dodgeChance){
   out.dodge=distance<3?-dir:dir;this.dodgeWait=ai.dodgeCooldown+this.random()*.5;this.attackWait=Math.max(this.attackWait,.5);
  }
  const grounded=standingOn(v.boss);
  if(grounded)this.jumpTarget=null;
  if(this.jumpTarget&&!grounded){
   const gap=this.jumpTarget.x-v.boss.x;this.axis=Math.abs(gap)>.2?Math.sign(gap):0;
  }
  if(grounded){
   this.launchTarget=null;
   if(dy>1){
    const next=CLASSROOM_PLATFORMS.filter(p=>p.y>v.boss.y+.5&&p.y-v.boss.y<5).sort((a,b)=>(Math.abs((a.x1+a.x2)/2-v.hero.x)+Math.abs((a.x1+a.x2)/2-v.boss.x)*.5)-(Math.abs((b.x1+b.x2)/2-v.hero.x)+Math.abs((b.x1+b.x2)/2-v.boss.x)*.5))[0];
    if(next){
     // Aim at the near side and hold that landing target through the jump.
     const target=Math.max(next.x1+.8,Math.min(next.x2-.8,v.boss.x));
     const support=CLASSROOM_PLATFORMS.find(p=>v.boss.x>=p.x1&&v.boss.x<=p.x2&&Math.abs(v.boss.y-p.y)<.03);
     const launch=support?Math.max(support.x1+.45,Math.min(support.x2-.45,target)):target;
     this.launchTarget=launch;this.axis=Math.abs(launch-v.boss.x)>.15?Math.sign(launch-v.boss.x):0;
     if(this.jumpWait<=0&&Math.abs(target-v.boss.x)<this.difficulty.moveSpeed*.76+.1){
      out.jump=true;this.jumpTarget={x:target,y:next.y};this.axis=Math.sign(target-v.boss.x);this.jumpWait=ai.jumpCooldown;
     }
    }
   }else if(this.jumpWait<=0&&!out.dodge&&ai.randomJumpChance>0&&this.random()<ai.randomJumpChance+(v.propThreat?ai.dodgeChance*.25:0)){
    out.jump=true;this.jumpWait=ai.jumpCooldown+this.random()*.5;
   }
   if(dy<-2&&this.random()<ai.dropChance)out.drop=true;
  }
  if(!out.dodge&&!out.pickup&&this.attackWait<=0&&distance<(ranged?14:4.8)){
   if(ai.allowThrow&&v.held&&distance>2.5&&Math.abs(dy)<5)out.move='throw';
   else if(Math.abs(dy)<2.5){
    const roll=this.random();
    if(ai.allowThrow&&v.tool==='cup')out.move='throw';
    else if(ai.allowKick&&!standingOn(v.boss)&&distance<4)out.move='kick';
    else if(ai.allowUppercut&&distance<3&&roll<.13+(this.difficulty.studio-4)*.02)out.move='uppercut';
    else if(ai.allowKick&&distance<3.2&&roll>.86)out.move='kick';
    else if(v.tool==='ruler'&&(distance>=2.8||roll<.75))out.move='sweep';
    else if(distance<2.8)out.move='jab';
   }
   if(out.move)this.attackWait=ai.attackRecovery*this.recoveryPersonality+this.random()*ai.recoveryJitter;
  }
  out.axis=this.axis;return out;
 }
}
