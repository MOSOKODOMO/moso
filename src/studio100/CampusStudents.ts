import * as THREE from 'three';
import { defaultAppearance, type CharacterAppearance } from './CharacterAppearance';
import { StudentSprite } from './StudioArt';

export interface CampusSpeech { speaker:string; text:string; x:number; y:number }
interface ChatLine { speaker:0|1; text:string }
interface ChatGroup { x:number; names:readonly [string,string]; lines:readonly ChatLine[]; phase:number }
interface CampusStudent {
  art:StudentSprite;
  mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;
  shadow:THREE.Mesh<THREE.CircleGeometry,THREE.MeshBasicMaterial>;
  group:ChatGroup;
  member:0|1;
  phase:number;
}

const SCALE=.82,GROUND=3.55,WIDTH=3.2*SCALE,HEIGHT=4.05*SCALE;
const CHAT_DISTANCE=6,LINE_SECONDS=6,PAIR_SPACING=1.25;
const GROUPS:readonly ChatGroup[]=[
  {x:22,names:['Ava','Noah'],phase:0,lines:[
    {speaker:0,text:'One class, then homework on my laptop. That extra half Knowledge adds up.'},
    {speaker:1,text:"I'm aiming for five Knowledge first. Seven would be a lovely bonus."},
  ]},
  {x:48,names:['Jun','Tess'],phase:3,lines:[
    {speaker:0,text:"A noodle shift should help my weapon fund. I'm saving for that drawing board."},
    {speaker:1,text:"I keep one activity slot for class. On another day, I'll try two shifts."},
  ]},
  {x:75,names:['Leo','Nia'],phase:7,lines:[
    {speaker:0,text:'No classes on weekends. A good time for noodles, homework or a proper rest.'},
    {speaker:1,text:"I keep checking Mika's shelves. First I need to save a few more coins."},
  ]},
];
const LOOKS:readonly Partial<CharacterAppearance>[]=[
  {sex:'female',hairStyle:'ponytail',hair:'#684735',skin:'#d8aa83',eyeStyle:'gentle',eyes:'#599077',outfit:'varsity',outfitColour:'#83ad72',accessory:'none'},
  {sex:'male',hairStyle:'curly',hair:'#303333',skin:'#936341',eyeStyle:'bright',eyes:'#71503e',outfit:'campus',outfitColour:'#6d9dc5',accessory:'round-glasses'},
  {sex:'male',hairStyle:'swept',hair:'#72618e',skin:'#ebc4a0',eyeStyle:'gentle',eyes:'#454856',outfit:'street',outfitColour:'#465b79',accessory:'none'},
  {sex:'female',hairStyle:'bob',hair:'#ac7845',skin:'#f5dbb6',eyeStyle:'bright',eyes:'#526e9f',outfit:'classic',outfitColour:'#df9a75',accessory:'headphones'},
  {sex:'male',hairStyle:'short',hair:'#c1bbb4',skin:'#bd8b64',eyeStyle:'sleepy',eyes:'#b98a46',outfit:'varsity',outfitColour:'#d8c16e',accessory:'none'},
  {sex:'female',hairStyle:'long',hair:'#303333',skin:'#d8aa83',eyeStyle:'gentle',eyes:'#8b67a7',outfit:'pinafore',outfitColour:'#ab7fac',accessory:'none'},
];

/** Decorative campus conversation groups. These never become collision or combat targets. */
export class CampusStudents {
  private readonly root=new THREE.Group();
  private readonly students:CampusStudent[]=[];
  private lastPaint=-Infinity;

  constructor(scene:THREE.Scene) {
    GROUPS.forEach((group,index)=>{
      for(const member of [0,1] as const){
        const art=new StudentSprite();art.setAppearance({...defaultAppearance(),...LOOKS[index*2+member]});
        art.paint(0,false,'pen',0,false,null,true,true);
        const mesh=new THREE.Mesh(new THREE.PlaneGeometry(WIDTH,HEIGHT),new THREE.MeshBasicMaterial({map:art.texture,transparent:true,depthWrite:false}));
        mesh.position.set(group.x+(member?PAIR_SPACING:-PAIR_SPACING),GROUND+HEIGHT/2,1);
        mesh.scale.x=member?-1:1;
        const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,32),new THREE.MeshBasicMaterial({color:'#343d31',transparent:true,opacity:.16,depthWrite:false}));
        shadow.scale.set(SCALE,.13*SCALE,1);shadow.position.set(mesh.position.x,GROUND+.04,-.1);
        this.root.add(shadow,mesh);this.students.push({art,mesh,shadow,group,member,phase:index*2.1+member*1.4});
      }
    });
    this.root.visible=false;scene.add(this.root);
  }

  setVisible(visible:boolean):void {
    if(this.root.visible!==visible)this.lastPaint=-Infinity;
    this.root.visible=visible;
  }

  update(time:number):void {
    if(!this.root.visible||!Number.isFinite(time))return;
    if(time>=this.lastPaint&&time-this.lastPaint<1/15)return;
    this.lastPaint=time;
    for(const student of this.students){
      const t=Math.max(0,time)+student.phase;
      const speaking=this.line(student.group,time).speaker===student.member;
      student.art.paint(t,false,'pen',0,false,null,true,true);
      // A tiny conversational sway accompanies the shared painter's breathing and blinking.
      student.mesh.rotation.z=Math.sin(t*1.7)*(speaking?.009:.004);
      student.mesh.position.y=GROUND+HEIGHT/2+Math.sin(t*2.4)*.014;
    }
  }

  speech(heroX:number,time:number):CampusSpeech|null {
    if(!this.root.visible||!Number.isFinite(heroX)||!Number.isFinite(time))return null;
    let nearest:ChatGroup|undefined,distance=CHAT_DISTANCE;
    for(const group of GROUPS){const dx=Math.abs(heroX-group.x);if(dx<=distance){nearest=group;distance=dx;}}
    if(!nearest)return null;
    const line=this.line(nearest,time);
    return {speaker:nearest.names[line.speaker],text:line.text,x:nearest.x+(line.speaker?PAIR_SPACING:-PAIR_SPACING),y:GROUND+HEIGHT+.65};
  }

  private line(group:ChatGroup,time:number):ChatLine {
    return group.lines[Math.floor((Math.max(0,time)+group.phase)/LINE_SECONDS)%group.lines.length];
  }

  dispose():void {
    this.root.removeFromParent();
    for(const student of this.students){
      student.mesh.geometry.dispose();student.mesh.material.dispose();student.art.texture.dispose();
      student.shadow.geometry.dispose();student.shadow.material.dispose();
    }
    this.students.length=0;
  }
}
