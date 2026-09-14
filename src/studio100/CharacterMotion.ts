export type CharacterMotionState='idle'|'walk'|'run'|'jump'|'fall'|'land'|'attack'|'uppercut'|'kick'|'dodge'|'seated';
export interface CharacterMotion {state:CharacterMotionState;progress?:number;speed?:number;holding?:'one'|'two'}
export type CharacterPose='uppercut'|'kick'|'dodge'|null;
export interface CharacterRigInput {time:number;walking?:boolean;attack?:number;seated?:boolean;pose?:CharacterPose;motion?:CharacterMotion;weaponFamily?:string;emptyHands?:boolean}
export interface RigPoint {x:number;y:number}
export interface RigLimb {start:RigPoint;joint:RigPoint;end:RigPoint;angle:number}
export interface CharacterRig {
 state:CharacterMotionState;bodyX:number;bodyY:number;lean:number;headTilt:number;
 frontArm:RigLimb;backArm:RigLimb;frontLeg:RigLimb;backLeg:RigLimb;
 strike:number;anticipation:number;step:number;hairSway:number;blink:boolean;
}
const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
const smooth=(v:number)=>{const t=clamp(v);return t*t*(3-2*t)};
const point=(x:number,y:number):RigPoint=>({x,y});
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
/** Resolve an articulated limb, keeping knees and elbows attached throughout every pose. */
function limb(start:RigPoint,target:RigPoint,upper:number,lower:number,bend:number,angle=0):RigLimb {
 const dx=target.x-start.x,dy=target.y-start.y,raw=Math.hypot(dx,dy),distance=clamp(raw,.001,upper+lower-.05),ux=dx/(raw||1),uy=dy/(raw||1);
 const along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
 return {start,joint:point(start.x+ux*along-uy*height*bend,start.y+uy*along+ux*height*bend),end:point(start.x+ux*distance,start.y+uy*distance),angle};
}
/** Existing garment paths use a local 130px paper-doll rig, transformed around its hips. */
export function bodyPoint(rig:Pick<CharacterRig,'bodyX'|'bodyY'|'lean'>,x:number,y:number):RigPoint {
 const dx=x*.94,dy=(y-132)*.8,co=Math.cos(rig.lean),si=Math.sin(rig.lean);
 return point(rig.bodyX+dx*co-dy*si,rig.bodyY+dx*si+dy*co);
}
export function characterRig(input:CharacterRigInput):CharacterRig {
 const time=Number.isFinite(input.time)?input.time:0,motion=input.motion;
 const state:CharacterMotionState=motion?.state??(input.seated?'seated':input.pose??((input.attack??0)>0?'attack':input.walking?'walk':'idle'));
 const running=state==='run'||(state==='walk'&&(motion?.speed??0)>7),moving=state==='walk'||state==='run';
 const phase=time*(running?12:9.5),step=moving?Math.sin(phase):0,progress=clamp(motion?.progress??input.attack??0);
 const anticipation=state==='attack'?1-smooth(progress/.23):0;
 const strike=state==='attack'?(progress<.23?0:progress<.48?smooth((progress-.23)/.25):1-smooth((progress-.48)/.52)):0;
 let bodyX=0,bodyY=135+Math.sin(time*2.5)*.35,lean=.015,headTilt=-.015;
 let frontFoot=point(13,153),backFoot=point(-10,153),frontHand=point(27,131),backHand=point(-22,130),frontAngle=0,backAngle=0;
 if(moving){const stride=running?16:11,lift=running?10:6;bodyY=135-Math.abs(Math.sin(phase))*1.6;lean=running?.14:.075;headTilt=-lean*.45;
  frontFoot=point(10+step*stride,153-Math.max(0,Math.cos(phase))*lift);backFoot=point(-8-step*stride,153-Math.max(0,-Math.cos(phase))*lift);
  frontHand=point(24-step*(running?10:7),129-Math.max(0,step)*4);backHand=point(-20+step*(running?12:8),127-Math.max(0,-step)*5);
  frontAngle=-Math.max(0,Math.cos(phase))*.42;backAngle=-Math.max(0,-Math.cos(phase))*.42;
 }
 if(state==='jump'){bodyY=132;lean=.09;headTilt=-.03;frontFoot=point(23,147);backFoot=point(-15,143);frontHand=point(28,112);backHand=point(-26,115);frontAngle=-.25;backAngle=.4;}
 if(state==='fall'){bodyY=133;lean=-.035;headTilt=.025;frontFoot=point(17,154);backFoot=point(-12,151);frontHand=point(31,113);backHand=point(-29,115);frontAngle=.18;backAngle=.3;}
 if(state==='land'){const settle=1-smooth(progress);bodyY=135+7*settle;lean=.11*settle;headTilt=-.04;frontFoot=point(17,153);backFoot=point(-15,153);frontHand=point(27,130+4*settle);backHand=point(-23,130+4*settle);}
 if(state==='attack'){const heavy=['swing','bash'].includes(input.weaponFamily??'');bodyX=-2.3*anticipation+5*strike;bodyY=135+anticipation*1.3-strike;lean=-.06*anticipation+.17*strike;headTilt=-lean*.55;
  frontFoot=point(14+strike*5,153);backFoot=point(-11-strike*3,153);backHand=point(-19+strike*6,121+anticipation*5);
  if(heavy){frontHand=point(lerp(15,33,strike),lerp(106,122,strike));}
  else{const reach=input.emptyHands?45:33;frontHand=point(lerp(15,reach,strike),lerp(120,116,strike));}
 }
 if(state==='uppercut'){const power=Math.sin(Math.PI*clamp(progress||.5));bodyX=2;bodyY=132;lean=.11;headTilt=-.06;frontHand=point(27,96-5*power);backHand=point(-17,118);frontFoot=point(20,149);backFoot=point(-9,151);frontAngle=-.2;}
 if(state==='kick'){bodyX=-2;bodyY=136;lean=-.17;headTilt=.08;frontFoot=point(37,129);backFoot=point(-8,153);frontHand=point(27,115);backHand=point(-23,119);frontAngle=-.24;}
 if(state==='dodge'){bodyX=5;bodyY=144;lean=.24;headTilt=-.1;frontFoot=point(26,152);backFoot=point(-19,152);frontHand=point(26,130);backHand=point(-17,125);frontAngle=-.14;}
 if(state==='seated'){bodyY=136;lean=0;headTilt=.015;frontFoot=point(22,143);backFoot=point(-19,144);frontHand=point(18,132);backHand=point(-15,131);frontAngle=-.25;backAngle=.18;}
 if(motion?.holding==='one'&&state!=='attack'){frontHand=point(27+step*1.6,129+Math.abs(step)*.8+(state==='land'?4*(1-smooth(progress)):0));}
 if(motion?.holding==='two'&&state!=='attack'){frontHand=point(21,127);backHand=point(-20,127);}
 const rig={state,bodyX,bodyY,lean,headTilt,strike,anticipation,step,hairSway:Math.sin(time*(moving?9:2))*(moving?2.1:.5),blink:time>0&&!['attack','uppercut','kick'].includes(state)&&Math.floor(time*24)%127<2} as CharacterRig;
 const fh=bodyPoint(rig,8,132),bh=bodyPoint(rig,-8,132);
 const relaxed=state==='idle'||state==='attack';
 rig.frontLeg=limb(fh,frontFoot,state==='kick'?16:relaxed?9.5:11,state==='kick'?17:relaxed?10:12,-1,frontAngle);
 rig.backLeg=limb(bh,backFoot,relaxed?9.5:11,relaxed?10:12,-1,backAngle);
 rig.frontArm=limb(bodyPoint(rig,17,106),frontHand,10,state==='uppercut'||state==='attack'?12:11,-1);
 rig.backArm=limb(bodyPoint(rig,-18,106),backHand,9,10,1);
 return rig;
}
/** Canvas pixels, before the sprite's world-facing mirror. The same points paint the fingers. */
export function characterHandAnchor(input:CharacterRigInput,hand:'front'|'back'='front'):RigPoint {
 const rig=characterRig(input),p=hand==='front'?rig.frontArm.end:rig.backArm.end;return{x:65+p.x,y:p.y};
}
