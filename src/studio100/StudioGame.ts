import * as THREE from 'three';
import { GameLoop } from '../game/GameLoop';
import { Renderer2D } from '../rendering/Renderer2D';
import { InputManager, prettyKey, type ActionName } from '../input/InputManager';
import { StudioMusic } from './StudioMusic';
import { meleeAttack, type CombatTarget } from '../combat/CombatSystem';
import { calculateDamage } from '../combat/DamageSystem';
import { ProjectileManager } from '../combat/Projectiles';
import { StudentSprite, chairTexture, cupTexture, toolIcon, craftingTableTexture } from './StudioArt';
import { inventionStats } from './Inventions';
import { WEAPON_IDS, isWeapon, ITEMS } from './ItemCatalog';
import { shopPanel, backpackPanel, type ShopFilter } from './ShopPanel';
import { semesterPanel, knowledgeBoxes } from './SemesterPanel';
import { EquipmentFX } from './EquipmentFX';
import { skillPlan, type SkillEvent, type EquipmentSkillPlan } from './EquipmentSkills';
import { laptopTexture } from './StudentLifeArt';
import { DailyActivityVisuals } from './DailyActivityVisuals';
import { roomLayout, roomView, placePlatforms, HOME_POINTS } from './RoomLayout';
import { RestaurantCustomers } from './RestaurantCustomers';
import { ClassroomDoor } from './ClassroomDoor';
import { applyWeaponMods, enhanceWeapon, embedRelic, isRelicId } from './WeaponMods';
import { workshopPanel } from './WorkshopPanel';
import { weekdayName, semesterNumber, isSchoolDay, buyItem, PASS_KNOWLEDGE, SEMESTER_DAYS, HD_REWARD, WORK_SECONDS, WORK_PAY, HOMEWORK_SECONDS, workCost, homeworkCost, completeWorkShift, completeHomework, hasActivity, beginSemester, semesterDay, CHARMS, CLASS_SECONDS, KNOWLEDGE_REQUIRED, SAVE_KEY, STUDIO_NAMES, WEAPONS, buyCharm, buyUpgrade, classCost, completeClass, completeStudio, maxStamina, newStudent, rest, sanitizeSave, unlockedStudio, upgradeCost, xpNeeded, type Charm, type Place, type StudioSave, type Upgrade, type Weapon } from './StudioState';
import { STUDIO_GROUND, CLASSROOM_PLATFORMS, standingOn, hitImpulse, resetMotion, separateBodies, stepMotion } from './CombatMotion';
import { CombatEffects } from './CombatEffects';
import { SceneTransition } from './SceneTransition';
import { ClassroomArena } from './ClassroomArena';
import { TeacherBrain, type TeacherMove } from './TeacherBrain';
import { studioDifficulty } from './StudioDifficulty';
import { TeachingMotion } from './TeachingMotion';
import { TEACHERS, teacherById, type Teacher } from './Teachers';
import { HAIR_STYLES, HAIR_COLOURS, SKIN_COLOURS, EYE_STYLES, EYE_COLOURS, OUTFITS, OUTFIT_COLOURS, ACCESSORIES, sanitizeAppearance, defaultAppearance, starterLook, type CharacterAppearance } from './CharacterAppearance';
import { dressingRoom, type WardrobeTab, type PreviewPose } from './DressingRoom';
import './studio.css';
import './dressing-room.css';
import { settingsMenu, isSettingsTab, nextSettingsTab, updateSettingsVolume, type SettingsTab } from './SettingsMenu';
import './settings-menu.css';
import './rpg-ui.css';
import './shop.css';
import './semester.css';
import './workshop.css';
import './student-life.css';
import './room-navigation.css';

const FLOOR = STUDIO_GROUND;
const LOBBY_STUDENT_SCALE = .82;
const LOBBY_LIFTS=[13.7,18.8] as const;
const MENU_BINDINGS: Partial<Record<ActionName,string>> = {moveLeft:'Move left',moveRight:'Move right',jump:'Jump',attack:'Attack',interact:'Interact / grab / throw',skill1:'Uppercut',skill2:'Jump kick',skill3:'Dodge',stats:'Drop through platform',useHp:'Equipment skill',inventory:'Backpack'};
const roomAsset = (file:string) => new URL(`studio100/${file}`,document.baseURI).href;
type Modal = 'backpack' | 'semester' | 'map' | 'instructor' | 'shop' | 'clerk' | 'mystery' | 'skills' | 'tools' | 'home' | 'pause' | 'passed' | 'faculty' | 'exhibition' | 'exhibition-won' | 'character' | null;
const PLACES: Record<Place, { title: string; subtitle: string }> = {
  restaurant: { title: 'Lucky Lantern Noodles', subtitle: 'PART-TIME WORK · CHINESE NOODLES' },
  lobby: { title: 'Campus', subtitle: 'THE FORECOURT · BUILDING 100' },
  foyer: { title: 'Building 100 Lobby', subtitle: 'G · GROUND FLOOR' },
  mystery: { title: 'The Other Cupboard', subtitle: 'MYSTERY SHOP' },
  studio: { title: 'Foundations', subtitle: 'L1 · STUDIO 01' },
  home: { title: 'Your apartment', subtitle: 'STUDENT ACCOMMODATION · YOUR ROOM' },
  skills: { title: 'The Student Gym', subtitle: 'B1 · STAMINA & STRENGTH' },
  tools: { title: 'The Model Workshop', subtitle: 'B2 · TOOL UPGRADES' },
};

class Actor implements CombatTarget {
  x = 0; y = FLOOR; hp = 100; defense = 0;
  vx = 0; vy = 0; hitVx = 0; stun = 0;
  onHit: (damage: number, direction: number) => void = () => {};
  isAlive() { return this.hp > 0; }
  getCenterX() { return this.x; }
  getCenterY() { return this.y + 1.3; }
  getDefense() { return this.defense; }
  getCritChance() { return 0; }
  applyHit(damage: number, _isCrit = false, direction = 1) { this.onHit(damage, direction); }
}

export class StudioGame {
  readonly state: StudioSave;
  private renderer: Renderer2D;
  private camera = new THREE.OrthographicCamera(0, 32, 18, 0, .1, 100);
  private input: InputManager;
  private loop: GameLoop;
  private ui: HTMLDivElement;
  private background: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private backgrounds = new Map<Place, THREE.Texture>();
  private studentArt = new StudentSprite();
  private instructorArt = new StudentSprite(true);
  private selectedProfessor: string | null = null;
  private exhibitionFight = false;
  private portraits = new Map<string, string>();
  private characterDraft: CharacterAppearance = defaultAppearance();
  private wardrobeTab: WardrobeTab = 'hair';
  private settingsTab: SettingsTab = 'general';
  private previewPose: PreviewPose = 'idle';
  private previewFacing=1;
  private creatorArt=new StudentSprite();
  private creatorThumbnails=new Map<string,string>();
  private creatorPaintTime=0;
  private arena: ClassroomArena;
  private brain = new TeacherBrain();
  private teaching = new TeachingMotion();
  private teachingFacing = -1;
  private teachingGesture = 0;
  private specialCooldown = {uppercut:0,kick:0,dodge:0};
  private special: {kind:'uppercut'|'kick';remaining:number;facing:number} | null = null;
  private specialPose: 'uppercut'|'kick'|null = null;
  private specialPoseTime=0;
  private heroDrop=0;
  private bossDrop=0;
  private bossDodge=0;
  private heroDodge=0;
  private bossMove: {kind:TeacherMove;remaining:number;direction:number} | null = null;
  private bossPose: 'uppercut'|'kick'|null=null;
  private bossPoseTime=0;
  private comboHits=0;
  private comboTime=0;
  private heroCoyote=0;
  private jumpBuffer=0;
  private touchPointers=new Map<number,number>();
  private touchActions=new Set<string>();
  private get touchMode():boolean {return window.matchMedia('(pointer:coarse)').matches;}
  private clerkArt = new StudentSprite(false, true);
  private clerkMesh: THREE.Mesh;
  private clerkShadow: THREE.Mesh;
  private transition = new SceneTransition();
  private cameraBase = 0;
  private heroMesh: THREE.Mesh;
  private bossMesh: THREE.Mesh;
  private chair: THREE.Mesh;
  private craftingTable: THREE.Mesh;
  private shopFilter: ShopFilter = 'all';
  private workElapsed:number|null=null;
  private homeworkElapsed:number|null=null;
  private activityStartX=0;
  private get activityBusy():boolean{return this.workElapsed!==null||this.homeworkElapsed!==null;}
  private equipmentFX:EquipmentFX;
  private equipmentCooldown=0;
  private equipmentAction:{weapon:Weapon;plan:EquipmentSkillPlan;elapsed:number;next:number;damage:number;dir:number}|null=null;
  private guardTime=0;private guardFacing=1;private reflectTime=0;private bossSlow=0;
  private cashierArt=new StudentSprite();
  private cashierMesh:THREE.Mesh;
  private laptop:THREE.Mesh;
  private counterFront:THREE.Mesh;
  private dailyVisuals:DailyActivityVisuals;
  private restaurantCustomers:RestaurantCustomers;
  private classroomDoor:ClassroomDoor;
  private music=new StudioMusic();
  private lowGraphics=false;
  private warning: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private playerShadow: THREE.Mesh;
  private bossShadow: THREE.Mesh;
  private projectiles: ProjectileManager;
  private enemyProjectiles: ProjectileManager;
  private hero = new Actor();
  private boss = new Actor();
  private time = 0;
  private facing = 1;
  private effects: CombatEffects;
  private hitStop = 0;
  private cameraShake = 0;
  private heroFlash = 0;
  private bossFlash = 0;
  private attackBuffer = 0;
  private penChain = 0;
  private chainWindow = 0;
  private strikingWeapon: Weapon = 'pen';
  private strikingFinisher = false;
  private instructorSwing = 0;
  private pendingAttack: { unarmed: boolean; weapon: Weapon; damage: number; facing: number; remaining: number; finisher: boolean } | null = null;
  private attackTimer = 0;
  private swing = 0;
  private invulnerable = 0;
  private bossMax = 160;
  private warned = false;
  private fight = false;
  private classElapsed: number | null = null;
  private sleepElapsed: number | null = null;
  private modal: Modal = null;
  private saveTimer = 0;
  private uiTimer = 0;
  private paintTimer = 0;
  private toastUntil = 0;
  private saveFailed = false;
  private previousFocus: HTMLElement | null = null;
  private icons = Object.fromEntries(WEAPON_IDS.map(w=>[w,toolIcon(w)])) as Record<Weapon,string>;

  constructor(container: HTMLElement) {
    let saved: unknown;
    try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null'); } catch { saved = null; }
    this.state = saved ? sanitizeSave(saved) : newStudent();
    this.characterDraft={...this.state.appearance};this.studentArt.setAppearance(this.state.appearance);
    if (new URLSearchParams(location.search).get('scene') === 'lobby') this.state.place = 'lobby';
    document.title = 'Fight Your Way to Architecture — A Melbourne student adventure';
    document.getElementById('hud')!.hidden = true;
    this.renderer = new Renderer2D(container);
    this.renderer.scene.background = new THREE.Color('#c0c4af');
    this.camera.position.z = 20;
    this.renderer.onResize(() => this.resize()); this.resize();
    this.background = this.plane(32, 18, new THREE.MeshBasicMaterial({ color: '#d9d3bc' }), 16, 9, -10);
    const classroom = new THREE.TextureLoader().load(roomAsset('studio-background.png'), () => {
      classroom.colorSpace = THREE.SRGBColorSpace;
      if (this.state.place === 'studio') { this.background.material.map = classroom; this.background.material.color.set('#ffffff'); this.background.material.needsUpdate = true; }
    }, undefined, () => this.toast('The classroom illustration could not load. You can still play.'));
    classroom.colorSpace = THREE.SRGBColorSpace; this.backgrounds.set('studio', classroom);
    const lobby = new THREE.TextureLoader().load(roomAsset('campus-restaurant.png'), () => {
      lobby.colorSpace = THREE.SRGBColorSpace;
      if (this.state.place === 'lobby') { this.background.material.map = lobby; this.background.material.needsUpdate = true; }
    }, undefined, () => this.toast('The lobby illustration could not load. Building navigation still works.'));
    lobby.colorSpace = THREE.SRGBColorSpace; this.backgrounds.set('lobby', lobby);
    const shopInterior = new THREE.TextureLoader().load(roomAsset('mystery-interior.png'), () => {
      shopInterior.colorSpace = THREE.SRGBColorSpace;
      if (this.state.place === 'mystery') { this.background.material.map = shopInterior; this.background.material.needsUpdate = true; }
    }); shopInterior.colorSpace = THREE.SRGBColorSpace; this.backgrounds.set('mystery', shopInterior);
    for (const [place,file] of [['foyer','foyer-interior.png'],['home','apartment-interior.png'],['skills','student-lab.png?v=gym-20260913'],['tools','model-workshop.png?v=fabrication-20260913'],['restaurant','restaurant-interior.png']] as const) {
      const room = new THREE.TextureLoader().load(roomAsset(file),()=>{
        if(this.state.place===place){this.background.material.map=room;this.background.material.needsUpdate=true;}
      },undefined,()=>this.toast('Room artwork could not load. Please reload to try again.'));
      room.colorSpace=THREE.SRGBColorSpace;this.backgrounds.set(place,room);
    }
    this.heroMesh = this.sprite(3.2, 4.05, this.studentArt.texture, 12, FLOOR + 2.025, 2);
    this.bossMesh = this.sprite(3.45, 4.35, this.instructorArt.texture, 24, FLOOR + 2.175, 1);
    this.chair = this.sprite(2.2, 2.7, chairTexture(), 10, FLOOR + 1.35, 0);
    this.craftingTable = this.sprite(8, 4.53, craftingTableTexture(), 22, FLOOR + 2.265, 0);
    this.playerShadow = this.shadow(12); this.bossShadow = this.shadow(24);
    this.clerkMesh = this.sprite(3.2, 4.05, this.clerkArt.texture, 24, FLOOR + 2.025, 2); this.clerkShadow = this.shadow(24);
    this.cashierArt.setAppearance({...defaultAppearance(),hairStyle:'short',hair:'#342f37',outfit:'studio',outfitColour:'#698c77',accessory:'none'});
    this.cashierArt.paint(0,false,'pen',0,false,null,true);
    this.cashierMesh=this.sprite(3.2,4.05,this.cashierArt.texture,25,FLOOR+2.025,2);
    this.laptop=this.sprite(2.5,1.6,laptopTexture(),22.4,9.55,1);
    // Reuse the painted counter itself as a foreground layer; the clerk and worker stand behind it.
    this.counterFront=this.sprite(16.2,3.7,this.backgrounds.get('restaurant')!,23.85,8.28,3);
    const uv=this.counterFront.geometry.getAttribute('uv');
    for(let i=0;i<uv.count;i++)uv.setXY(i,(15.75+uv.getX(i)*16.2)/32,(6.43+uv.getY(i)*3.7)/18);
    uv.needsUpdate=true;this.cashierMesh.position.y=8.8+2.025;
    this.warning = this.plane(4, .18, new THREE.MeshBasicMaterial({ color: '#b64f3a', transparent: true, opacity: .7, depthWrite: false }), 16, FLOOR, 1);
    this.warning.visible = false;
    this.projectiles = new ProjectileManager(this.renderer.scene, cupTexture());
    this.enemyProjectiles = new ProjectileManager(this.renderer.scene, cupTexture());
    this.effects = new CombatEffects(this.renderer.scene);
    this.equipmentFX = new EquipmentFX(this.renderer.scene);
    this.dailyVisuals=new DailyActivityVisuals(this.renderer.scene);
    this.restaurantCustomers=new RestaurantCustomers(this.renderer.scene,this.backgrounds.get('restaurant')!);
    this.classroomDoor=new ClassroomDoor(this.renderer.scene);
    const laptop=HOME_POINTS.homework.laptop;this.laptop.scale.set(laptop.width/2.5,laptop.height/1.6,1);this.laptop.position.set(laptop.x,laptop.y,1);
    this.arena = new ClassroomArena(this.renderer.scene);
    this.hero.onHit = (damage, direction) => this.hurt(damage, direction);
    this.boss.onHit = (damage, direction) => this.hitInstructor(damage, direction);
    this.input = new InputManager(this.renderer.domElement);
    this.input.setBinding('skill3',0,'ShiftLeft');this.input.setBinding('skill3',1,'ShiftRight');this.input.setBinding('stats',0,'KeyS');this.input.setBinding('stats',1,'ArrowDown');
    this.input.setBinding('useHp',0,'KeyR');this.input.setBinding('useHp',1,'');
    this.input.setBinding('jump',0,'KeyW');this.input.setBinding('attack',0,'Space');this.input.setBinding('attack',1,'KeyJ');
    try {const settings=JSON.parse(localStorage.getItem('studio-100-settings')??'null');if(settings){
      this.music.enabled=settings.music!==false;this.music.volume=typeof settings.volume==='number'&&Number.isFinite(settings.volume)?Math.max(0,Math.min(1,settings.volume)):.25;this.lowGraphics=settings.lowGraphics===true;
      for(const key of Object.keys(MENU_BINDINGS) as ActionName[]){let code=settings.bindings?.[key]?.[0];if(settings.version!==3){if(key==='jump'&&code==='Space')code='KeyW';if(key==='attack'&&code==='KeyJ')code='Space';}if(typeof code==='string'&&/^(Key[A-Z]|Arrow(Left|Right|Up|Down)|Space|Shift(Left|Right))$/.test(code)&&!['KeyM','KeyP'].includes(code))this.input.setBinding(key,0,code);}
    }}catch{}
    this.renderer.renderer.setPixelRatio(this.lowGraphics?1:Math.min(devicePixelRatio,2));
    window.addEventListener('pointerdown',()=>this.music.unlock());window.addEventListener('keydown',()=>this.music.unlock());
    this.ui = document.createElement('div'); this.ui.className = 'studio-app';
    this.ui.style.setProperty('--creator-room',`url("${roomAsset('apartment-interior.png')}")`);
    this.ui.innerHTML = this.shell(); document.body.appendChild(this.ui);
    this.ui.addEventListener('pointerdown',event=>{
      const button=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-touch]');
      if(!button||this.modal||this.transition.active)return;
      event.preventDefault();button.setPointerCapture(event.pointerId);
      const action=button.dataset.touch!;
      if(action==='left'||action==='right')this.touchPointers.set(event.pointerId,action==='left'?-1:1);
      else this.touchActions.add(action);
      button.classList.add('pressed');
    });
    const releaseTouch=(event:PointerEvent)=>{this.touchPointers.delete(event.pointerId);(event.target as HTMLElement).closest('[data-touch]')?.classList.remove('pressed');};
    this.ui.addEventListener('pointerup',releaseTouch);this.ui.addEventListener('pointercancel',releaseTouch);this.ui.addEventListener('lostpointercapture',releaseTouch);
    window.addEventListener('blur',()=>{this.touchPointers.clear();this.touchActions.clear();});
    this.ui.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
      if (button && !button.disabled) this.action(button.dataset.action!);
    });
    this.ui.addEventListener('input',event=>{const target=event.target as HTMLInputElement;if(target.id==='music-volume'){this.music.volume=Number(target.value)/100;updateSettingsVolume(this.ui,this.music.volume);this.saveSettings();}});
    window.addEventListener('keydown', event => {
      if (event.repeat) return;
      if (this.transition.active) return;
      if (this.modal) { if (event.key === 'Tab') this.trapFocus(event);
        if(this.modal==='pause'&&(event.target as HTMLElement)?.closest('.settings-tabs')&&(event.target as HTMLElement)?.getAttribute('role')==='tab'){
          const next=nextSettingsTab(this.settingsTab,event.key);if(next){event.preventDefault();this.settingsTab=next;this.open('pause');this.el('settings-tab-'+next).focus();}
        }
        if(this.modal==='character'&&(event.target as HTMLElement)?.getAttribute('role')==='tab'&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const tabs:WardrobeTab[]=['hair','face','outfit','extras'];const index=tabs.indexOf(this.wardrobeTab);const next=event.key==='Home'?0:event.key==='End'?3:(index+(event.key==='ArrowRight'?1:3))%4;this.wardrobeTab=tabs[next];this.open('character');this.el('wardrobe-tab-'+this.wardrobeTab).focus();}return; }
      if (this.classElapsed===null && this.sleepElapsed===null && !this.activityBusy && ['Digit1','Digit2','Digit3'].includes(event.code)) this.equipSlot(Number(event.code.slice(-1))-1);
      if (event.code === 'KeyM' && !this.activityBusy && !this.fight && this.classElapsed === null && this.sleepElapsed === null) this.action('map');
    });
    window.addEventListener('blur', () => { this.input.releaseKeys(); if (!this.transition.active && !this.modal && this.classElapsed === null && this.sleepElapsed === null) this.open('pause'); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.persist(); });
    window.addEventListener('pagehide', () => this.persist());
    this.changePlace(this.state.place, false);
    this.persist(); // Store migrated teacher assignments immediately, before a possible reload.
    this.loop = new GameLoop(dt => this.update(dt), () => this.renderer.render(this.camera));
    if (!this.state.introSeen) { this.state.introSeen = true; this.persist(); this.toast('Building 100 to the right. Something curious to the left.', 7); }
    if(!this.state.characterCreated) this.open('character');
  }
  start(): void { this.loop.start(); }
  private saveSettings(): void {
    try {localStorage.setItem('studio-100-settings',JSON.stringify({version:3,music:this.music.enabled,volume:this.music.volume,lowGraphics:this.lowGraphics,bindings:this.input.getBindings()}));}
    catch {this.toast('Settings apply now, but this browser could not save them.');}
  }
  private plane(w: number, h: number, material: THREE.MeshBasicMaterial, x: number, y: number, z: number) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); mesh.position.set(x, y, z); this.renderer.scene.add(mesh); return mesh;
  }
  private sprite(w: number, h: number, map: THREE.Texture, x: number, y: number, z: number) { return this.plane(w, h, new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }), x, y, z); }
  private shadow(x: number) { const s = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: '#343d31', transparent: true, opacity: .18, depthWrite: false })); s.scale.set(1, .13, 1); s.position.set(x, FLOOR + .05, -.1); this.renderer.scene.add(s); return s; }
  private resize(): void {
    // Cover the viewport without stretching the art or revealing space outside a room.
    const view=roomView(this.state.place,this.renderer.aspect),center=roomLayout(this.state.place).width/2;
    this.camera.left=center-view.width/2;this.camera.right=center+view.width/2;
    this.camera.bottom=view.bottom;this.camera.top=view.top;this.camera.updateProjectionMatrix();
    this.followCamera(1,true);
  }
  private shell(): string {
    return `<header class="studio-top"><div class="studio-brand"><strong>FIGHT YOUR WAY<br><em>TO ARCHITECTURE</em></strong><div class="eyebrow">A Melbourne student adventure</div></div>
      <div class="student-stats"><div class="stats-line"><b id="s-level"></b><span id="s-stamina"></span></div><div class="stamina-track" role="meter" aria-label="Stamina" id="s-meter"><i id="s-fill"></i></div></div>
      <div class="studio-location"><span class="eyebrow" id="s-location-code"></span><strong id="s-location"></strong></div>
      <div class="studio-meta"><span class="day" id="s-day"></span><span class="coin" id="s-coins"></span><button data-action="pause" aria-label="Open game menu">Menu</button></div></header>
      <div class="studio-nameplate context-hint" id="s-context-hint"></div>
      <div class="studio-nameplate crafting-label" id="s-crafting-label">Crafting table</div>
      <div class="studio-nameplate" id="s-chair-label">Your desk<small>Study · +1 Knowledge</small></div><div class="studio-nameplate character-name" id="s-boss-label"></div>
      <div class="studio-nameplate mystery-nameplate" id="s-mystery-label">The Other Cupboard</div><div class="studio-nameplate" id="s-building-label">BUILDING 100</div>
      <div class="studio-nameplate character-name" id="s-clerk-label">Mika</div>
      <div class="studio-nameplate" id="s-exit-label">E · Exit</div><button class="lift-hotspot" id="s-lift-left" data-action="lift:0" aria-label="Use left lift · floor directory" hidden><span>Floor directory</span></button><button class="lift-hotspot" id="s-lift-right" data-action="lift:1" aria-label="Use right lift · floor directory" hidden><span>Floor directory</span></button>
      <div class="studio-nameplate accommodation-sign" id="s-accommodation-sign">STUDENT ACCOMMODATION</div>
      <div class="studio-nameplate wayfinding-sign" id="s-wayfinding">NOODLES →</div>
      <button class="studio-nameplate archive-board" id="s-archive-board" data-action="faculty-board" aria-label="Open professor archive" hidden><span aria-hidden="true">▤</span>Professor<br>archive</button>
      <div class="lobby-sparkles" id="s-lobby-sparkles" aria-hidden="true"><i>✧</i><i>·</i><i>✦</i><i>·</i></div>
      <div class="studio-boss" id="s-boss" hidden><strong id="s-boss-title"></strong><div class="stamina-track"><i id="s-boss-fill"></i></div><p id="s-boss-tip"></p></div>
      <div class="studio-toast" role="status" aria-live="polite" id="s-toast"></div>
      <div class="class-overlay" id="s-class" hidden><span class="eyebrow" id="s-class-code">CLASS IN SESSION</span><h3 id="s-class-title">A little wiser, every day.</h3><p id="s-class-quote"></p><div class="stamina-track"><i id="s-class-fill"></i></div><p id="s-class-progress"></p></div>
      <footer class="studio-dock"><div class="weapon-dock" role="group" aria-label="Quick equipment slots">${[0,1,2].map(i=>`<button class="weapon-button empty-slot" data-action="quick-slot:${i}" id="quick-slot-${i}" aria-label="Empty slot ${i+1}"><kbd>${i+1}</kbd><img hidden alt=""><span class="empty-slot-mark">+</span></button>`).join('')}<button class="bag-button" data-action="backpack" aria-label="Open backpack">Bag</button></div>
      <button id="equipment-skill" class="equipment-skill" data-action="equipment-skill" hidden><kbd>R</kbd><span></span></button><div class="move-dock" id="s-move-dock" hidden><button data-action="move:uppercut" id="move-uppercut" title="K · Uppercut"><kbd>K</kbd>↥</button><button data-action="move:kick" id="move-kick" title="L · Jump kick"><kbd>L</kbd>↗</button><button data-action="move:dodge" id="move-dodge" title="Shift · Dodge"><kbd>⇧</kbd>»</button><button data-action="interact" id="move-grab" title="E · Pick up / throw"><kbd>E</kbd>↔</button></div>
      <div class="studio-interaction"><button class="interact-button" id="s-interact" data-action="interact"><kbd class="key">E</kbd><span id="s-interact-text"></span></button><div class="studio-controls" id="s-controls">A D / ← → move &nbsp; W jump &nbsp; Space / click attack &nbsp; E interact &nbsp; M lift nearby</div></div>
      </footer><nav class="touch-controls" aria-label="Touch game controls"><div class="touch-movement"><button data-touch="left" aria-label="Move left">◀</button><button data-touch="right" aria-label="Move right">▶</button><button data-touch="drop" aria-label="Drop through platform">↓</button></div><div class="touch-actions"><button data-touch="interact" id="touch-interact" aria-label="Interact or grab and throw">Talk</button><button data-touch="jump" aria-label="Jump">Jump</button><button data-touch="attack" id="touch-attack" aria-label="Attack">Hit</button></div></nav><aside class="journey-dock" id="s-journey-panel"><span class="eyebrow">Your semester</span><b id="s-journey"></b><span id="s-xp" style="font-size:10px"></span><div class="xp-track"><i id="s-xp-fill"></i></div><div id="s-knowledge-boxes"></div><small id="s-knowledge"></small><button class="calendar-button" data-action="semester" id="s-calendar">Semester calendar</button><button class="submit-study" data-action="submit-study" id="s-submit-study" hidden>Pass studio →</button></aside>
      <aside class="outdoor-day-card" id="s-day-card"><strong id="s-weekday"></strong><span id="s-semester-number"></span><small id="s-school-status"></small></aside><div class="mika-speech" id="s-mika-speech" hidden>Oh, hey. Long studio day?<small>Find something for your next studio.</small></div><div class="studio-nameplate" id="s-restaurant-sign" hidden>LUCKY LANTERN NOODLES</div><div class="studio-nameplate" id="s-job-label" hidden></div><div class="studio-nameplate" id="s-laptop-label" hidden>Homework · +0.5 Knowledge</div><div id="s-modal-root"></div><div class="scene-transition" id="s-transition" hidden role="status" aria-live="polite"><div class="transition-panel"><span class="eyebrow" id="s-transition-kind"></span><span class="transition-symbol" aria-hidden="true">◇</span><h2 id="s-transition-title"></h2><p>One step closer.</p></div></div>`;
  }
  private el(id: string): HTMLElement { return this.ui.querySelector<HTMLElement>(`#${id}`)!; }
  private label(id: string, value: string): void { const el = this.el(id); if (el.textContent !== value) el.textContent = value; }
  private persist(): void {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); this.saveFailed = false; }
    catch { if (!this.saveFailed) { this.saveFailed = true; this.toast('Storage is unavailable. Keep this tab open to retain your progress.', 8); } }
  }
  private toast(message: string, seconds = 4): void { if (!this.ui) return; this.label('s-toast', message); this.toastUntil = this.time + seconds; }
  private equipSlot(slot:number):void {const item=this.state.quickSlots[slot];if(item)this.equip(item);else if(!this.fight)this.open('backpack');}
  private equip(weapon:Weapon):void {
    if(!isWeapon(weapon)||!this.state.owned.includes(weapon)||this.transition.active||this.classElapsed!==null||this.sleepElapsed!==null||this.activityBusy||this.equipmentAction)return;
    this.state.weaponEquipped=this.state.weapon!==weapon||!this.state.weaponEquipped;this.state.weapon=weapon;
    this.guardTime=this.reflectTime=0;this.persist();this.refresh();
  }
  private changePlace(place: Place, save = true): void {
    this.workElapsed=this.homeworkElapsed=null;this.dailyVisuals.endSleep();
    this.el('s-class').classList.remove('is-studying');
    this.resetBrawler();this.arena.setVisible(place==='studio');
    this.exhibitionFight = false;
    this.fight = false; this.projectiles.clear(); this.enemyProjectiles.clear(); this.warning.visible = false; this.invulnerable = 0;
    this.effects.clear(); resetMotion(this.hero); resetMotion(this.boss); this.pendingAttack = null; this.hitStop = 0; this.attackBuffer = 0; this.chainWindow = 0; this.penChain = 0; this.cameraShake = 0;
    this.camera.position.set(0, 0, 20); this.heroFlash = 0; this.bossFlash = 0;
    this.gymTraining=0; this.state.place = place; if(place==='studio')beginSemester(this.state); this.hero.x = place === 'studio' ? 5.5 : 14; this.hero.y = FLOOR; this.hero.hp = this.state.stamina;
    this.instructorArt.setTeacher(this.currentTeacher());
    this.boss.x = 24; this.boss.y = FLOOR; this.boss.hp = 160;
    this.teaching.reset(this.currentTeacher().id); this.teachingFacing = -1; this.teachingGesture = 0;
    this.background.material.map = this.backgrounds.get(place)!; this.background.material.color.set('#ffffff'); this.background.material.needsUpdate = true;
    const layout=roomLayout(place);this.background.scale.set(layout.background.width/32,layout.background.height/18,1);this.background.position.set(layout.background.x,layout.background.y,-10);
    this.restaurantCustomers.setVisible(place==='restaurant');this.classroomDoor.setVisible(place==='studio');
    this.chair.visible = place === 'studio'; this.bossMesh.visible = place === 'studio'&&isSchoolDay(this.state); this.bossShadow.visible = this.bossMesh.visible;
    this.craftingTable.visible = place === 'tools';
    this.cashierMesh.visible=place==='restaurant';this.counterFront.visible=place==='restaurant';this.laptop.visible=place==='home';
    this.clerkMesh.visible = place === 'mystery'; this.clerkShadow.visible = place === 'mystery';
    if (place === 'mystery') this.hero.x = 8;
    if (place === 'restaurant') this.hero.x=7;
    if(place==='home')this.hero.x=HOME_POINTS.spawn.x;
    if (place === 'skills' || place === 'tools') this.hero.x = 19;
    this.cameraBase = 0;
    this.resize();this.close(); this.positionActors(); if (save) this.persist(); this.refresh();
  }
  private travel(place: Place, studio?: number, after: Modal = null): void {
    if (this.transition.active || this.fight || this.classElapsed !== null || this.sleepElapsed !== null || this.activityBusy) return;
    if(['studio','skills','tools'].includes(place)&&!this.canUseLift()){this.toast('Choose your floor at a lift in the Building 100 lobby.');return;}
    if(place==='studio'&&(!isSchoolDay(this.state)||!Number.isInteger(studio??this.state.studio)||(studio??this.state.studio)<1||(studio??this.state.studio)>unlockedStudio(this.state)))return;
    const from = this.state.place;
    const indoor = ['studio', 'foyer', 'skills', 'tools'];
    const whiteDoor=from==='studio'&&place==='foyer';
    const lift = !whiteDoor&&indoor.includes(from) && indoor.includes(place);
    const title = place === 'studio' ? `L${studio ?? this.state.studio} · Studio ${studio ?? this.state.studio} · ${STUDIO_NAMES[(studio ?? this.state.studio) - 1]}` : place === 'foyer' ? 'G · Building 100 Lobby' : place === 'mystery' ? 'The Other Cupboard' : place==='restaurant'?'Lucky Lantern Noodles': place === 'home' ? 'Your apartment' : place === 'skills' ? 'B1 · Student Gym' : place === 'tools' ? 'B2 · Model Workshop' : place === 'lobby' ? 'Back to the forecourt' : 'Everyday supplies';
    this.close(); this.input.releaseKeys();
    const el = this.el('s-transition'); el.hidden = false; el.classList.toggle('lift-transition', lift);el.classList.toggle('white-door-transition',whiteDoor); el.style.opacity = '0';
    this.label('s-transition-kind', lift ? 'TAKING THE LIFT' : 'THROUGH THE DOOR'); this.label('s-transition-title', title);
    this.ui.setAttribute('aria-busy', 'true');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.transition.start(() => {
      if (studio !== undefined) {this.state.studio = studio;beginSemester(this.state,studio);}
      this.changePlace(place, false);
      if (place === 'lobby') this.hero.x = from==='restaurant'?83:from === 'home' ? 65 : from === 'mystery' ? 11 : 37;
      this.followCamera(1, true); this.positionActors(); this.persist();
    }, () => { el.hidden = true; this.ui.setAttribute('aria-busy', 'false'); this.input.releaseKeys(); this.refresh(); if (after) this.open(after); }, reduced ? .22 : lift ? 1.1 : .85);
    this.refresh();
  }
  private followCamera(dt: number, snap = false): void {
    const half = (this.camera.right - this.camera.left) / 2;
    const worldWidth=roomLayout(this.state.place).width,center=worldWidth/2;
    const desired = half<worldWidth/2 ? Math.max(half-center,Math.min(worldWidth-center-half,this.hero.x-center)) : 0;
    this.cameraBase = snap ? desired : this.cameraBase + (desired - this.cameraBase) * (1 - Math.exp(-6 * dt));
    this.camera.position.x = this.cameraBase;
  }
  private insideBuilding():boolean {return ['foyer','studio','skills','tools'].includes(this.state.place);}
  private canUseLift(index?:number):boolean {
    if(this.state.place!=='foyer'||Math.abs(this.hero.y-FLOOR)>.15||Math.abs(this.hero.vy)>.1)return false;
    return index===undefined?LOBBY_LIFTS.some(x=>Math.abs(this.hero.x-x)<1.5):Number.isInteger(index)&&index>=0&&index<LOBBY_LIFTS.length&&Math.abs(this.hero.x-LOBBY_LIFTS[index])<1.5;
  }
  private exitRoom():void {if(this.state.place!=='lobby')this.travel(['studio','skills','tools'].includes(this.state.place)?'foyer':'lobby');}
  private near(): 'chair' | 'instructor' | 'exit' | 'shop' | 'mystery' | 'clerk' | 'shopfloor' | 'building' | 'lobby' | 'home' | 'skills' | 'tools' | 'map' | 'workshopfloor' | 'faculty' | 'restaurant' | 'work' | 'jobfloor' | 'homework' | 'foyerfloor' | 'classroomfloor' | 'homefloor' {
    if (this.state.place === 'lobby') { if(Math.abs(this.hero.x-83)<3.5)return 'restaurant';if(Math.abs(this.hero.x-11)<3)return 'mystery';if(Math.abs(this.hero.x-65)<3)return 'home';if(Math.abs(this.hero.x-37)<3)return 'building';return 'lobby'; }
    if(this.state.place==='restaurant')return this.hero.x<5?'exit':Math.abs(this.hero.x-22)<4?'work':'jobfloor';
    if (this.state.place === 'mystery') { if (this.hero.x < 5.5) return 'exit'; if (Math.abs(this.hero.x - 24) < 3.5) return 'clerk'; return 'shopfloor'; }
    if (this.state.place === 'foyer') return this.hero.x < 5 ? 'exit' : this.hero.x > 27 ? 'faculty' : this.canUseLift()?'map':'foyerfloor';
    if (this.state.place === 'home') {
      const point=HOME_POINTS.homework.interact,bed=HOME_POINTS.sleep.bed;
      if(this.hero.x<4)return 'exit';
      if(Math.abs(this.hero.x-point.x)<point.radiusX&&Math.abs(this.hero.y-point.y)<point.radiusY)return 'homework';
      return this.hero.x>=bed.x1-1.5&&this.hero.x<=bed.x2+1?'home':'homefloor';
    }
    if (this.state.place === 'skills' || this.state.place === 'tools') return this.hero.x<5 ? 'exit' : Math.abs(this.hero.x-22)<5 ? this.state.place : 'workshopfloor';
    if (this.state.place === 'studio') {
      const teacherDistance=Math.abs(this.hero.x-this.boss.x),chairDistance=Math.abs(this.hero.x-10);
      if(isSchoolDay(this.state)&&teacherDistance<3 && Math.abs(this.hero.y-this.boss.y)<2.5 && teacherDistance<chairDistance)return 'instructor';
      if(chairDistance<3)return 'chair';
      return this.hero.x<5?'exit':'classroomfloor';
    }
    return this.state.place;
  }
  private action(action: string): void {
    if (this.transition.active || (this.activityBusy&&this.modal!=='pause'&&!['close','pause'].includes(action))) return;
    if(this.modal==='pause') {
      if(action.startsWith('settings-tab:')){const tab=action.slice(13);if(isSettingsTab(tab)){this.settingsTab=tab;this.open('pause');}return;}
      if(action==='save-game'){this.persist();const message=this.saveFailed?'Saving is unavailable in this browser.':'Game saved on this browser.';const feedback=this.ui.querySelector('#settings-save-feedback');if(feedback)feedback.textContent=message;this.toast(message);return;}
      if(action==='restart-game'){if(window.confirm('Restart the semester? This clears your studio progress, coins and upgrades on this browser. Your character appearance and settings stay.')){const appearance={...this.state.appearance};Object.assign(this.state,newStudent(),{appearance,characterCreated:true,introSeen:true});this.classElapsed=null;this.sleepElapsed=null;this.changePlace('lobby');}return;}
      if(action==='music-toggle'){this.music.enabled=!this.music.enabled;this.saveSettings();this.open('pause');return;}
      if(action==='graphics-toggle'){this.lowGraphics=!this.lowGraphics;this.renderer.renderer.setPixelRatio(this.lowGraphics?1:Math.min(devicePixelRatio,2));this.saveSettings();this.open('pause');return;}
      if(action.startsWith('rebind:')){const key=action.slice(7) as ActionName;if(!MENU_BINDINGS[key])return;this.el('binding-feedback').textContent='Press a key. Escape cancels.';this.input.captureNextKey(code=>{
        if(code!=='Escape'&&/^(Key[A-Z]|Arrow(Left|Right|Up|Down)|Space|Shift(Left|Right))$/.test(code)&&!['KeyM','KeyP'].includes(code)){
          const conflict=Object.entries(this.input.getBindings()).some(([other,list])=>other!==key&&Array.isArray(list)&&list.includes(code));
          if(conflict){this.el('binding-feedback').textContent='That key is already in use. Choose another key.';return;}
          this.input.setBinding(key,0,code);this.saveSettings();
        }this.open('pause');this.refresh();
      });return;}
    }
    if(this.modal==='character') {
      if(action==='random-character') {const pick=<T,>(values:readonly T[])=>values[Math.floor(Math.random()*values.length)];this.characterDraft={sex:pick(['male','female'] as const),hairStyle:pick(HAIR_STYLES),skin:pick(SKIN_COLOURS),hair:pick(HAIR_COLOURS),eyeStyle:pick(EYE_STYLES),eyes:pick(EYE_COLOURS),outfit:pick(OUTFITS),outfitColour:pick(OUTFIT_COLOURS),accessory:pick(ACCESSORIES)};this.open('character');return;}
      if(action.startsWith('wardrobe-tab:')){const tab=action.slice(13) as WardrobeTab;if(['hair','face','outfit','extras'].includes(tab)){this.wardrobeTab=tab;this.open('character');}return;}
      if(action==='preview-turn'){this.previewFacing*=-1;this.updateCreatorPreview();return;}
      if(action.startsWith('preview-pose:')){const pose=action.slice(13) as PreviewPose;if(['idle','walk','attack'].includes(pose)){this.previewPose=pose;this.open('character');}return;}
      if(action.startsWith('look-preset:')){const preset=action.slice(12);if(preset==='classic'||preset==='meadow'||preset==='midnight'){this.characterDraft=starterLook(preset,this.characterDraft.skin);this.open('character');}return;}
      if(action==='save-character') {this.state.appearance={...this.characterDraft};this.state.characterCreated=true;this.studentArt.setAppearance(this.state.appearance);this.persist();this.close();this.refresh();return;}
      if(action.startsWith('appearance:')) {const [,key,value]=action.split(':');if(['sex','hairStyle','skin','hair','eyeStyle','eyes','outfit','outfitColour','accessory'].includes(key)){this.characterDraft=sanitizeAppearance({...this.characterDraft,[key]:value});this.open('character');}return;}
      if(action==='close' && this.state.characterCreated){this.close();return;}
      return;
    }
    if (action === 'close') { this.close(); return; }
    if (action === 'pause') { this.open('pause'); return; }
    if(action==='equipment-skill'&&!this.modal){this.useEquipmentSkill();return;}
    if(action.startsWith('quick-slot:')){this.equipSlot(Number(action.slice(11)));return;}
    if (action.startsWith('weapon:')) { this.equip(action.split(':')[1] as Weapon); return; }
    if (this.classElapsed !== null || this.sleepElapsed !== null) return;
    if (action === 'retreat') { this.changePlace('home'); this.toast('A breather. Your Knowledge and upgrades are safe.'); return; }
    if(action.startsWith('move:') && !this.modal){const kind=action.split(':')[1];if(kind==='uppercut'||kind==='kick'||kind==='dodge')this.physicalMove(kind);return;}
    if (this.fight && action !== 'interact') return;
    if(action==='backpack'){this.open('backpack');return;}
    if(action==='semester'){this.open('semester');return;}
    if(action==='submit-study'){if(!this.state.cleared[this.state.studio-1]&&completeStudio(this.state,'study')){this.persist();this.open('passed');this.refresh();}return;}
    if(action==='find-shop'){this.travel('mystery');return;}
    if(action.startsWith('shop-filter:')&&this.modal==='shop'){const f=action.slice(12);if(['all','melee','ranged','defence'].includes(f)){this.shopFilter=f as ShopFilter;this.open('shop');}return;}
    if(action.startsWith('item-buy:')){const id=action.slice(9);if(this.state.place!=='mystery'||this.near()!=='clerk'||this.modal!=='shop'||!isWeapon(id))return;if(buyItem(this.state,id)){this.persist();this.toast(ITEMS[id].name+' bought and equipped.');}this.open('shop');this.refresh();return;}
    if(action.startsWith('item-equip:')&&['shop','backpack'].includes(this.modal??'')){const id=action.slice(11);if(isWeapon(id)){this.equip(id);this.open(this.modal);}return;}
    if(action.startsWith('slot-clear:')&&this.modal==='backpack'){const slot=Number(action.slice(11));if(Number.isInteger(slot)&&slot>=0&&slot<3){const old=this.state.quickSlots[slot];this.state.quickSlots[slot]=null;if(old===this.state.weapon)this.state.weaponEquipped=false;this.persist();this.open('backpack');this.refresh();}return;}
    if(action.startsWith('slot:')&&this.modal==='backpack'){const [,index,id]=action.split(':'),slot=Number(index);if(Number.isInteger(slot)&&slot>=0&&slot<3&&isWeapon(id)&&this.state.owned.includes(id)){this.state.quickSlots=this.state.quickSlots.map(w=>w===id?null:w) as typeof this.state.quickSlots;this.state.quickSlots[slot]=id;this.persist();this.open('backpack');this.refresh();}return;}
    if(action==='character') {this.characterDraft={...this.state.appearance};this.open('character');return;}
    if (action === 'interact') {
      if (this.fight || this.classroomPropAvailable()) { this.grabOrThrow(); return; }
      const near = this.near();
      if (near === 'exit') { this.exitRoom(); return; }
      if (near === 'home' && this.state.place !== 'home') { this.travel('home'); return; }
      if(near==='restaurant'){this.travel('restaurant');return;}
      if(near==='work'||near==='homework'){this.startDailyActivity(near);return;}
      if(near==='jobfloor'){this.toast('Walk to the cashier counter to work a shift.');return;}
      if(near==='clerk'){this.shopFilter='all';this.open('shop');return;}
      if (near === 'mystery') { this.travel('mystery'); return; }
      if (near === 'building') { this.travel('foyer'); return; }
      if (near === 'lobby') { this.toast(this.hero.x > 30 ? 'Your apartment is ahead. Look for the Student Accommodation sign.' : 'Shop to the left. Building 100 to the right. Keep walking right for your apartment.'); return; }
      if (near === 'shopfloor') { this.toast('Mika is by the counter on the right. Walk over and press E to chat.'); return; }
      if (near === 'workshopfloor') { this.toast(this.state.place==='skills'?'The training station is on the right. Walk over to exercise.':'The fabrication bench is on the right. Walk over to modify your weapon.'); return; }
      if(near==='chair'){this.startClass();return;}
      if(near==='homefloor'){this.toast('Jump onto the chair to reach your laptop, or walk left to your bed.');return;}
      if(near==='foyerfloor'){this.toast('Stand in front of either lift to choose a floor.');return;}
      if(near==='classroomfloor'){this.toast('Exit through the door on the far left.');return;}
      this.open(near === 'instructor' ? 'instructor' : near); return;
    }
    if(action==='exit-room'){this.exitRoom();return;}
    if(action==='map'||action.startsWith('lift:')) {
      const index=action==='map'?undefined:Number(action.slice(5));
      if(!this.canUseLift(index)){this.toast('Stand in front of a lift in the Building 100 lobby to choose a floor.');return;}
      this.open('map');return;
    }
    if (action === 'faculty-board') { if(this.state.place==='foyer'&&!this.modal)this.open('faculty'); return; }
    if (action === 'faculty') { this.open('faculty'); return; }
    if (action.startsWith('professor:')) {
      const id = action.slice(10);
      if (!this.state.cleared.every(Boolean) || !TEACHERS.some(t=>t.id===id)) return;
      this.selectedProfessor = id;
      if(this.state.place==='studio' && this.state.studio===9) { this.instructorArt.setTeacher(this.currentTeacher()); this.open('exhibition'); this.refresh(); }
      else {this.close();this.toast('Professor selected. Take the lobby lift to L9 for your exhibition duel.',6);}
      return;
    }
    if (action === 'exhibition-fight') { this.startFight(true); return; }
    if (action.startsWith('travel:')) { const place = action.split(':')[1] as Place; if (!(place in PLACES)) return; if(['studio','skills','tools'].includes(place)&&(this.modal!=='map'||!this.canUseLift()))return; if(place===this.state.place){this.close();return;} this.travel(place); return; }
    if (action.startsWith('floor:')) {
      const studio = Number(action.split(':')[1]); if(this.modal!=='map'||!this.canUseLift()||!isSchoolDay(this.state)||!Number.isInteger(studio)||studio<1||studio>unlockedStudio(this.state))return;
      if(studio!==9)this.selectedProfessor = null;
      this.instructorArt.setTeacher(teacherById(this.state.teacherAssignments[studio-1]));
      if (this.state.place === 'studio' && this.state.studio === studio) this.close(); else this.travel('studio', studio,studio===9&&this.selectedProfessor?'exhibition':null); return;
    }
    if (action === 'class') { this.startClass(); return; }
    if (action === 'fight') { this.startFight(); return; }
    if(action==='sleep') {
      if(this.state.place!=='home')return;
      this.close();resetMotion(this.hero);this.hero.x=HOME_POINTS.sleep.approach.x;this.hero.y=FLOOR;this.sleepElapsed=0;
      this.dailyVisuals.startSleep(this.state.appearance,this.backgrounds.get('home'));
      this.input.releaseKeys();this.touchPointers.clear();this.touchActions.clear();this.followCamera(1,true);this.positionActors();this.positionLabels();this.refresh();return;
    }
    if (action.startsWith('charm:')) {
      const charm = action.split(':')[1] as Charm;
      if (this.state.place !== 'mystery' || this.modal !== 'shop' || this.near() !== 'clerk') return;
      if (buyCharm(this.state, charm)) { this.hero.hp = this.state.stamina; this.persist(); this.toast(`${CHARMS[charm].name} is yours. Its effect is permanent.`); }
      this.open('shop'); this.refresh(); return;
    }
    if (action.startsWith('workshop-')) {
      if(this.state.place!=='tools'||this.near()!=='tools'||this.modal!=='tools')return;
      if(action.startsWith('workshop-weapon:')){const weapon=action.slice(16) as Weapon;if(!this.state.owned.includes(weapon))return;this.state.weapon=weapon;}
      else if(action==='workshop-enhance'){if(!enhanceWeapon(this.state))return;this.toast('Weapon enhanced. Quicker attacks.');}
      else if(action.startsWith('workshop-relic:')){const relic=action.slice(15);if(!isRelicId(relic)||!embedRelic(this.state,relic))return;this.toast('Relic embedded in your weapon.');}
      else return;
      this.persist();this.open('tools');this.refresh();return;
    }
    if (action.startsWith('buy:')) {
      const kind = action.split(':')[1] as Upgrade;
      const allowed = this.state.place === 'skills' && this.near()==='skills' ? ['endurance', 'strength'] : this.state.place === 'tools' && this.near()==='tools' ? ['tool'] : this.state.place === 'mystery' && this.near()==='clerk' && this.modal==='shop' ? ['shoes', 'snack'] : [];
      if (!allowed.includes(kind)) return;
      if (buyUpgrade(this.state, kind)) { this.hero.hp = this.state.stamina; this.persist(); this.toast(kind === 'snack' ? 'Lunch break. +35 stamina.' : kind==='strength'?'Strength trained. +3 damage to every attack.':kind==='endurance'?'Endurance trained. +20 maximum stamina and +4% movement speed.':'Tool upgraded.'); if(this.state.place==='skills'){this.gymTraining=2.4;this.close();this.refresh();return;} }
      this.open(this.modal); this.refresh(); return;
    }
  }
  private close(): void {
    this.input?.cancelCapture();
    if(this.modal==='character' && !this.state.characterCreated) return;
    this.modal = null; if (this.ui) this.el('s-modal-root').innerHTML = ''; this.input?.clearQueues();
    this.previousFocus?.focus(); this.previousFocus = null;
  }
  private characterThumbnail(look:CharacterAppearance):string {
    const key=JSON.stringify(look),cached=this.creatorThumbnails.get(key);if(cached)return cached;
    const art=new StudentSprite();art.setAppearance(look);art.paint(0,false,'pen',0,false,null,true);
    const url=art.canvas.toDataURL();art.texture.dispose();
    if(this.creatorThumbnails.size>160)this.creatorThumbnails.clear();this.creatorThumbnails.set(key,url);return url;
  }
  private updateCreatorPreview():void {
    const cycle=this.time%1.5,attack=this.previewPose==='attack'&&cycle<.4?(1-cycle/.4)*.8:0;
    this.creatorArt.paint(this.time,this.previewPose==='walk','pen',attack);
    this.creatorArt.canvas.style.transform='scaleX('+this.previewFacing+')';
  }
  private currentTeacher(): Teacher {
    return teacherById(this.state.studio === 9 && this.state.cleared.every(Boolean) && this.selectedProfessor ? this.selectedProfessor : this.state.teacherAssignments[this.state.studio-1]);
  }
  private portrait(t: Teacher): string {
    if(!this.portraits.has(t.id)) { const art = new StudentSprite(true,false,t); this.portraits.set(t.id,art.canvas.toDataURL()); art.texture.dispose(); }
    return this.portraits.get(t.id)!;
  }
  private open(modal: Modal): void {
    this.input?.cancelCapture();
    if (!modal || this.transition.active) return;
    if(modal==='map'&&!this.canUseLift()){this.toast('Stand in front of a lift in the Building 100 lobby to choose a floor.');return;}
    if (this.classElapsed !== null || this.sleepElapsed !== null || this.activityBusy) { if (modal !== 'pause') return; }
    const settingsFocus=modal==='pause'&&this.modal==='pause'?(document.activeElement as HTMLElement)?.dataset.action:undefined;
    const preserveCreator=modal==='character'&&this.modal==='character';
    const creatorPanel=this.ui.querySelector('.wardrobe-content');
    const creatorScroll=preserveCreator&&creatorPanel?.getAttribute('aria-labelledby')==='wardrobe-tab-'+this.wardrobeTab?creatorPanel.scrollTop:0;
    const creatorFocus=preserveCreator?(document.activeElement as HTMLElement)?.dataset.action:undefined;
    if (!this.modal) this.previousFocus = document.activeElement as HTMLElement;
    this.modal = modal; this.input.clearQueues();
    this.touchPointers.clear();this.touchActions.clear();
    const s = this.state, i = s.studio - 1, cost = classCost(s), cleared = s.cleared[i], teacher = this.currentTeacher();
    let title = '', eyebrow = '', body = '';
    if(modal==='backpack'){eyebrow='YOUR EQUIPMENT';title='Backpack';body=backpackPanel(s,this.icons);}
    else if(modal==='semester'){eyebrow='STUDIO '+s.studio;title='Semester calendar';body=semesterPanel(s);}
    else if(modal==='shop'){eyebrow='MIKA · THE OTHER CUPBOARD';title='Everyday objects. Extraordinary ideas.';body=shopPanel(s,this.icons,this.shopFilter);}
    else if (modal === 'character') {
      eyebrow='CHARACTER CREATION';title='Dressing room';
      body=dressingRoom(this.characterDraft,this.wardrobeTab,s.characterCreated,s.level,this.previewPose,look=>this.characterThumbnail(look));
    } else if (modal === 'faculty') {
      eyebrow = 'THE PROFESSOR ARCHIVE · 33 CHARACTERS'; title = 'Meet your studio teachers.';
      const unlocked = s.cleared.every(Boolean);
      body = `<p>${unlocked ? 'Semester complete. Choose any professor for a friendly exhibition duel in Studio 9.' : 'Patrik starts your journey in Studio 1. Eight other teachers are assigned once for your semester. Complete Studio 9 through Knowledge or combat to unlock exhibition duels with everyone.'}</p><p class="faculty-note">Fictionalised game characters inspired by reference sheets. Names, dialogue and duels are adapted for play.</p><div class="faculty-grid">${TEACHERS.map(t=>{
        const floor=s.teacherAssignments.indexOf(t.id), won=s.professorWins.includes(t.id);
        return `<article class="faculty-card"><img src="${this.portrait(t)}" alt="${t.name} game character"><div><span class="eyebrow">${floor>=0?'STUDIO '+(floor+1):'GUEST TEACHER'}</span><h3>${t.name}</h3><p>${t.project}</p><small>${WEAPONS[t.tool].name} · ${t.tool==='cup'?'ranged annotations':t.tool==='ruler'?'wide ruler sweep':'quick pen marks'}</small><button data-action="professor:${t.id}" ${unlocked?'':'disabled'}>${unlocked ? won?'✓ Defeated · rematch':'Choose professor →':'Unlock after Studio 9'}</button></div></article>`;
      }).join('')}</div>`;
    } else if (modal === 'exhibition' || modal === 'exhibition-won') {
      eyebrow = 'STUDIO 9 · EXHIBITION DUEL'; title = modal==='exhibition-won' ? 'A critique to remember.' : `Challenge ${teacher.name}?`;
      body = `<div class="teacher-intro"><img src="${this.portrait(teacher)}" alt="${teacher.name}"><div><h3>${teacher.name}</h3><p>${teacher.project}</p><p>${modal==='exhibition-won'?'Victory recorded in your professor archive. Your completed semester stays complete.':`A friendly final challenge with exaggerated ${WEAPONS[teacher.tool].name.toLowerCase()} attacks. Your Knowledge and completed studios stay safe if you lose.`}</p></div></div><div class="choice">${modal==='exhibition' ? `<p>${s.stamina}/${maxStamina(s)} stamina · Exhibition wins award collection badges, not extra coins or XP.</p><button class="rust" data-action="exhibition-fight" ${s.stamina<=0?'disabled':''}>Start exhibition duel →</button>${s.stamina<=0?'<button data-action="travel:home">Rest at home first →</button>':''}`:''}<button class="primary" data-action="faculty">Choose another professor →</button></div>`;
    } else if (modal === 'map') {
      title = 'Your way through 100.'; eyebrow = 'BUILDING DIRECTORY';
      body = `<p>${isSchoolDay(s)?"Choose a floor. Classes run Monday–Friday.":"Classes are closed for the weekend. The gym and workshop remain open."}</p><div class="floor-list">${STUDIO_NAMES.map((name, index) => {
        const n = index + 1, open = n <= unlockedStudio(s)&&isSchoolDay(s);
        return `<button class="floor-row ${n === s.studio && s.place === 'studio' ? 'current' : ''}" data-action="floor:${n}" ${open ? '' : 'disabled'}><span><span class="floor-code">${'L' + n}</span><strong>Enter Studio ${n} · ${name}</strong></span><small>${!isSchoolDay(s)?'Closed · weekend':s.cleared[index] ? '✓ ' + (s.cleared[index] === 'study' ? 'Knowledge' : 'Instructor') : open ? s.knowledge[index] + '/' + KNOWLEDGE_REQUIRED + ' Knowledge →' : 'Locked'}</small></button>`;
      }).reverse().join('')}<button class="floor-row ${s.place==='foyer'?'current':''}" data-action="travel:foyer"><span><span class="floor-code">G</span><strong>Building 100 Lobby</strong></span></button><div class="workshop-heading">✦ UPGRADE WORKSHOPS · OPEN TO ALL STUDENTS</div><button class="floor-row upgrade-row" data-action="travel:skills"><span><span class="floor-code">B1</span><strong>Student Gym</strong></span><small>✦ Stamina & strength →</small></button><button class="floor-row upgrade-row" data-action="travel:tools"><span><span class="floor-code">B2</span><strong>Model Workshop</strong></span><small>✦ Tool upgrades →</small></button></div>`;
    } else if (modal === 'instructor') {
      eyebrow = `STUDIO ${s.studio} · ${teacher.name.toUpperCase()}`; title = cleared ? 'A well-earned next step.' : 'Feeling confident?';
      body = `<div class="teacher-intro"><img src="${this.portrait(teacher)}" alt="${teacher.name}"><div><h3>${teacher.name}</h3><p>${teacher.project}</p></div></div>` + (cleared ? `<p>“You have earned your place upstairs. Keep going.”</p><div class="choice"><button class="primary" data-action="exit-room">Exit to the lobby →</button></div>` : `<p>“${PASS_KNOWLEDGE} Knowledge will get you through my studio. Reach ${KNOWLEDGE_REQUIRED} for an HD grade. Or you can challenge my oversized ${WEAPONS[teacher.tool].name.toLowerCase()}.”</p><div class="choice"><h3>Challenge the instructor</h3><p>Win to pass immediately. Jump onto desks and hanging lights; S drops through. E grabs or throws loose cups and rulers. K uppercuts, L jump-kicks and Shift dodges. Space or click ${s.weaponEquipped?'attacks with your '+WEAPONS[s.weapon].name.toLowerCase():'punches'}. R uses your equipment skill.</p><p class="detail">${s.stamina}/${maxStamina(s)} stamina</p><button class="rust" data-action="fight" ${s.stamina<=0?'disabled':''}>Challenge ${teacher.name} →</button></div><p>Your Knowledge stays safe if you lose. You can always return to class.</p>${s.stamina<=0?'<button data-action="travel:home">Rest at home first →</button>':''}`);
    } else if (modal === 'home') {
      eyebrow = 'YOUR ROOM'; title = 'Tomorrow is another idea.';
      body = `<p>Your own little apartment, right next to Building 100. Leave your drawing tube by the door. Put the kettle on.</p><div class="choice"><h3>A good night’s sleep</h3><p>Restore all stamina. Keep every bit of Knowledge, equipment and progress.</p><button class="primary" data-action="sleep">Sleep & restore · Day ${s.day + 1} →</button></div><button data-action="travel:lobby">Exit apartment ←</button>`;
    } else if (modal === 'skills' || modal === 'tools') {
      const kinds: Upgrade[] = modal === 'skills' ? ['endurance', 'strength'] : modal === 'tools' ? ['tool'] : ['shoes', 'snack'];
      eyebrow = modal === 'skills' ? 'B1 · STUDENT GYM' : modal === 'tools' ? 'B2 · MODEL WORKSHOP' : 'MIKA · EVERYDAY SUPPLIES';
      title = modal === 'skills' ? 'Train for the next studio.' : modal === 'tools' ? 'Every tool has potential.' : 'A little campus essential.';
      const descriptions: Record<Upgrade, [string, string]> = { endurance: ['Endurance training', '+20 maximum stamina and +4% movement speed per rank.'], strength: ['Strength training', '+3 damage per rank to every attack, including thrown items.'], efficiency: ['Study smarter', 'Every class costs 3 less stamina, down to a minimum of 10.'], tool: [`Upgrade your ${WEAPONS[s.weapon].name.toLowerCase()}`, '+4 basic attack damage with this tool.'], shoes: ['Comfy sneakers', 'Move 15% faster. Yours for the whole semester.'], snack: ['A proper lunch', 'Restore 35 stamina. Sleep at home restores it all for free.'] };
      const gym = modal === 'skills';
      body = `${gym ? `<p>Your stamina: <strong>${s.stamina} / ${maxStamina(s)}</strong>. Training uses stamina. Rest at home to recover.</p>` : `<p>You have <strong>${s.coins} coins</strong>. Earn coins from restaurant shifts.</p>`}${kinds.map(kind => {
        const rank = kind === 'tool' ? s.toolRanks[s.weapon] : kind === 'shoes' ? Number(s.shoes) : kind === 'snack' ? 0 : s[kind];
        const capped = kind === 'shoes' ? s.shoes : kind === 'snack' ? s.stamina >= maxStamina(s) : rank >= 5;
        const price = upgradeCost(s, kind), available = gym ? s.stamina : s.coins, resource = gym ? 'stamina' : 'coins';
        return `<div class="choice"><h3>${descriptions[kind][0]}</h3><p>${descriptions[kind][1]}</p><p class="detail">${kind === 'snack' ? s.stamina + '/' + maxStamina(s) + ' stamina' : kind === 'shoes' ? s.shoes ? 'Already owned' : 'Permanent clothing upgrade' : 'Rank ' + rank + '/5'}</p><button data-action="buy:${kind}" ${capped || available < price ? 'disabled' : ''}>${capped ? kind === 'snack' ? 'Already rested' : gym ? 'Fully trained' : 'Fully upgraded' : `${gym?'Train':'Buy'} · ${price} ${resource}`}</button></div>`;
      }).join('')}${modal === 'tools' ? '<p>Equip a different tool before entering the workshop to upgrade it.</p>' : ''}`;
    } else if (modal === 'passed') {
      const last = s.studio === 9; eyebrow = last ? 'SEMESTER COMPLETE' : `STUDIO ${s.studio} COMPLETE`; title = last ? 'You found your own way.' : 'A little higher. A little wiser.';
      body = `<p>${last ? 'Nine studios later, your work joins the final exhibition. You arrived with a sketchbook. You leave with a story of your own.' : `You passed ${STUDIO_NAMES[i]} through ${cleared === 'study' ? 'Knowledge' : 'an instructor victory'}. The next studio is now open.`}</p><div class="choice"><h3>${last ? 'Welcome to the exhibition.' : `Studio ${s.studio + 1} is waiting.`}</h3><p>+${65 + s.studio * 5} XP${cleared==='study'&&s.knowledge[i]>=KNOWLEDGE_REQUIRED?' · HD grade · +'+HD_REWARD+' coins':''} · Progress saved</p><button class="primary" data-action="exit-room">Exit to the lobby →</button></div><p>Your Knowledge, tools and upgrades come with you.</p>`;
    } else {
      eyebrow = 'FIGHT YOUR WAY TO ARCHITECTURE'; title = 'Game menu';
      body = `<p>Move with A/D or the arrow keys. W jumps; S drops through classroom furniture. Space or clicking the scene attacks. In fights, E grabs/throws, K uppercuts, L jump-kicks and Shift dodges. Outside fights, E interacts. 1, 2, 3 select quick slots; R uses equipment; I opens your backpack; M opens the directory while you stand at a lobby lift.</p><div class="choice"><button class="primary" data-action="close">Resume →</button>${this.fight ? '<button data-action="retreat">Leave fight & go home</button>' : this.classElapsed === null && this.sleepElapsed === null ? '<button data-action="map">Building directory</button>' : ''}</div><p>${this.saveFailed ? 'Saving is unavailable in this browser.' : 'Your completed progress is saved automatically.'} Classes and sleeping pause with the game.</p><footer><a href="?mode=farm">Open the original farming game ↗</a></footer>`;
    }
    if(modal==='map') body = `<button class="archive-link" data-action="faculty">Professor archive · ${s.professorWins.length}/33 exhibition wins ↗</button>`+body;
    if(modal==='pause') {
      eyebrow='';title='Settings';
      body=settingsMenu({tab:this.settingsTab,musicEnabled:this.music.enabled,musicVolume:this.music.volume,lowGraphics:this.lowGraphics,canVisit:!this.fight&&this.classElapsed===null&&this.sleepElapsed===null&&!this.activityBusy,fighting:this.fight,saveFailed:this.saveFailed,bindings:Object.entries(MENU_BINDINGS).map(([key,label])=>({action:key,label:label??key,keys:this.input.getBindings()[key as ActionName].map(prettyKey).join(' / ')}))});
    }

    if(modal==='tools') body = workshopPanel(s,this.icons);

    this.el('s-modal-root').innerHTML = `<div class="studio-modal-backdrop ${modal==='character'?'dressing-backdrop':modal==='pause'?'settings-backdrop':''}"><section class="studio-modal ${modal==='faculty'?'faculty-modal':modal==='character'?'character-modal dressing-room':modal==='pause'?'settings-modal':''}" role="dialog" aria-modal="true" aria-labelledby="s-modal-title"><header class="${modal==='character'?'dressing-header':''}"><div class="${modal==='character'?'dressing-logo':''}"><span class="eyebrow">${eyebrow}</span><h1 id="s-modal-title">${title}</h1></div>${modal==='character'?'<span class="dressing-step">✦ YOUR LOOK · YOUR ADVENTURE</span>':''}${modal==='character'&&!s.characterCreated?'':'<button class="close" aria-label="Close dialog" data-action="close">×</button>'}</header>${body}</section></div>`;
    if(modal==='character'){this.creatorArt.setAppearance(this.characterDraft);const stage=this.ui.querySelector('.avatar-stage');if(stage){stage.replaceChildren(this.creatorArt.canvas);this.creatorArt.canvas.setAttribute('role','img');this.creatorArt.canvas.setAttribute('aria-label','Live character preview');}this.updateCreatorPreview();}
    const buttons=Array.from(this.el('s-modal-root').querySelectorAll<HTMLButtonElement>('button'));
    const target=modal==='pause'?buttons.find(b=>!b.disabled&&b.dataset.action===(settingsFocus??'settings-tab:'+this.settingsTab)):creatorFocus?buttons.find(b=>b.dataset.action===creatorFocus):modal==='character'?buttons.find(b=>b.dataset.action?.startsWith('appearance:')):buttons[0];
    target?.focus({preventScroll:true});
    if(preserveCreator){const panel=this.ui.querySelector('.wardrobe-content');if(panel)panel.scrollTop=creatorScroll;}
  }
  private trapFocus(event: KeyboardEvent): void {
    const items = Array.from(this.el('s-modal-root').querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled)'));
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  private resetBrawler(keepInput = false, keepProps = false):void {
    if(!keepInput){this.touchPointers.clear();this.touchActions.clear();}
    if(!keepProps)this.arena.reset();this.special=null;this.bossMove=null;this.specialPose=null;this.bossPose=null;
    this.specialPoseTime=this.bossPoseTime=this.heroDrop=this.bossDrop=this.heroDodge=this.bossDodge=this.comboHits=this.comboTime=this.heroCoyote=this.jumpBuffer=0;
    this.specialCooldown={uppercut:0,kick:0,dodge:0};this.equipmentAction=null;this.guardTime=this.reflectTime=this.bossSlow=0;this.equipmentFX?.clear();
  }
  private classroomPropAvailable():boolean {
    const atSeat=!this.fight && !this.state.cleared[this.state.studio-1] && Math.abs(this.hero.x-10)<1.2 && Math.abs(this.hero.y-FLOOR)<.15;
    return this.state.place==='studio' && !this.modal && !this.transition.active && this.classElapsed===null && this.sleepElapsed===null && (!!this.arena.held('hero') || (!atSeat && !!this.arena.nearby(this.hero)));
  }
  private grabOrThrow():void {
    if(this.state.place!=='studio'||this.modal||this.transition.active||this.classElapsed!==null||this.sleepElapsed!==null||this.hero.stun>0||this.special||this.heroDodge>0||this.pendingAttack||this.attackTimer>0)return;
    if(this.arena.held('hero')) {
      this.arena.throw('hero',this.hero,this.facing,Math.sign(this.boss.x-this.hero.x)===this.facing?this.boss:undefined);
      this.swing=.28;this.attackTimer=.35;this.effects.word('THROW',this.hero.x,this.hero.y+3.6);
    }else if(this.arena.pickup('hero',this.hero)) this.effects.word('GOT IT',this.hero.x,this.hero.y+3.6);
    else this.toast('Move beside a cup or ruler, then press E to pick it up.',2);
  }
  private updateClassroomProps(dt:number):void {
    if(this.state.place!=='studio')return;
    this.arena.update(dt,this.hero,this.boss,this.facing,(owner,kind,direction)=>{
      if(owner==='hero'){
        if(!this.fight){
          const exhibition=this.state.studio===9 && this.state.cleared.every(Boolean) && !!this.selectedProfessor;
          this.startFight(exhibition,true);
        }
        if(!this.fight)return;
        this.strikingWeapon=kind;this.strikingFinisher=true;
        this.hitInstructor((kind==='cup'?27:32)+this.state.strength*3,direction);this.strikingFinisher=false;
      }else{
        if(!this.fight)return;
        this.hurt(studioDifficulty(this.state.studio).propDamage+(kind==='ruler'?3:0),direction,12,5);
      }
      this.effects.word(kind==='cup'?'SPLASH!':'BONK!',owner==='hero'?this.boss.x:this.hero.x,(owner==='hero'?this.boss.y:this.hero.y)+3.3);
    });
  }
  private physicalMove(kind:'uppercut'|'kick'|'dodge'):void {
    if(!this.fight||this.hero.stun>0||this.special||this.equipmentAction||this.specialCooldown[kind]>0||this.heroDodge>0||this.pendingAttack)return;
    this.specialCooldown[kind]=kind==='dodge'?1.2:kind==='uppercut'?1.5:1.25;
    if(kind==='dodge') {
      this.heroDodge=.2;this.invulnerable=Math.max(this.invulnerable,.2);this.hero.hitVx=this.facing*25;
      this.effects.trail(this.hero.x,this.hero.y,this.facing);return;
    }
    this.special={kind,remaining:kind==='uppercut'?.11:.1,facing:this.facing};this.specialPose=kind;this.specialPoseTime=.44;this.attackTimer=.48;
    if(kind==='uppercut') {this.hero.vy=Math.max(this.hero.vy,12);this.hero.hitVx=this.facing*5;}
    else {if(standingOn(this.hero))this.hero.vy=8;this.hero.hitVx=this.facing*15;}
  }
  private gymTraining=0;
  private resolvePhysicalMove():void {
    const move=this.special;this.special=null;if(!move||!this.fight||this.hero.stun>0)return;
    const dx=this.boss.x-this.hero.x,dy=this.boss.y-this.hero.y,range=move.kind==='uppercut'?2.9:4;
    this.effects.slash(this.hero.x,this.hero.y,move.facing,true);
    if(dx*move.facing<-.5||Math.abs(dx)>range||Math.abs(dy)>(move.kind==='uppercut'?3.2:2.1))return;
    const hp=this.boss.hp;this.strikingWeapon='ruler';this.strikingFinisher=true;
    this.hitInstructor((move.kind==='uppercut'?19:23)+(this.state.level-1)*2+this.state.strength*3,move.facing);
    this.strikingFinisher=false;
    if(this.boss.hp<hp){
      hitImpulse(this.boss,move.facing,move.kind==='uppercut'?4:16,move.kind==='uppercut'?15:6,.3);
      this.bossMove=null;this.warned=false;this.arena.drop('boss',this.boss);
      this.effects.word(move.kind==='uppercut'?'LAUNCH!':'KICK!',this.boss.x,this.boss.y+3.5);
    }
  }
  private startDailyActivity(kind:'work'|'homework'):void {
    if(this.modal||this.transition.active||this.fight||this.classElapsed!==null||this.sleepElapsed!==null||this.activityBusy)return;
    const work=kind==='work';
    if(this.state.place!==(work?'restaurant':'home')||this.near()!==kind||!standingOn(this.hero,placePlatforms(this.state.place)))return;
    if(this.state.activities.filter(a=>a.day===this.state.day).length>=2){this.toast('Two activities done. Sleep at home to begin tomorrow.');return;}
    if(!work&&(this.state.cleared[this.state.studio-1]||hasActivity(this.state,'homework'))){this.toast('Homework is finished. Rest, or choose your next studio.');return;}
    const cost=work?workCost(this.state):homeworkCost(this.state);
    if(this.state.stamina<cost){this.toast('Not enough stamina. Sleep at home first.');return;}
    this.activityStartX=this.hero.x;resetMotion(this.hero);this.arena.drop('hero',this.hero);
    this.input.releaseKeys();this.touchPointers.clear();this.touchActions.clear();
    if(work)this.workElapsed=0;else {this.homeworkElapsed=0;this.hero.x=HOME_POINTS.homework.seat.x;}
    this.el('s-class').classList.add('is-studying');this.paintTimer=0;this.refresh();
    this.updateDailyActivity(0);
  }
  private updateDailyActivity(dt:number):boolean {
    if(!this.activityBusy)return false;
    const work=this.workElapsed!==null,kind=work?'work':'homework',seconds=work?WORK_SECONDS:HOMEWORK_SECONDS;
    const moved=this.input.moveAxis!==0||[...this.touchPointers.values()].some(v=>v!==0)||this.input.consumeAction('moveLeft')||this.input.consumeAction('moveRight');
    const interrupted=moved||this.input.consumeAction('jump')||this.input.consumeAction('stats')||this.touchActions.has('jump')||this.touchActions.has('drop');
    if(interrupted||this.state.place!==(work?'restaurant':'home')){
      this.workElapsed=this.homeworkElapsed=null;this.hero.y=FLOOR;resetMotion(this.hero);this.heroMesh.position.z=2;this.playerShadow.visible=true;
      this.el('s-class').classList.remove('is-studying');this.paintTimer=0;this.refresh();
      this.toast(work?'Shift interrupted. Start again at the counter.':'Homework interrupted. Return to your laptop to start again.');return false;
    }
    const elapsed=Math.min(seconds,(work?this.workElapsed!:this.homeworkElapsed!)+dt);
    if(work){
      this.workElapsed=elapsed;const hop=Math.min(1,elapsed/.6),ease=hop*hop*(3-2*hop);
      this.hero.x=this.activityStartX+(22-this.activityStartX)*ease;
      this.hero.y=FLOOR+(8.8-FLOOR)*ease+Math.sin(hop*Math.PI)*2;
    }else{this.homeworkElapsed=elapsed;this.hero.x=HOME_POINTS.homework.seat.x;this.hero.y=HOME_POINTS.homework.seat.y;this.facing=1;}
    this.studentArt.paint(this.time,false,this.state.weapon,work?(.1+Math.sin(this.time*5)*.08):0,!work,null,true,!work);
    this.cashierArt.paint(this.time+2,false,'pen',Math.sin(this.time*3)*.06,false,null,true);
    this.positionActors();if(work&&elapsed<.6)this.heroMesh.position.z=6;
    this.playerShadow.visible=!work;this.followCamera(dt);this.positionLabels();
    const remaining=Math.max(0,Math.ceil(seconds-elapsed));
    this.label('s-class-code',work?'SHIFT IN PROGRESS':'HOMEWORK IN PROGRESS');
    this.label('s-class-progress',remaining+'s · '+(work?'+'+WORK_PAY+' coins':'+0.5 Knowledge'));
    const fill=this.el('s-class-fill');fill.style.width=(elapsed/seconds*100)+'%';fill.setAttribute('role','progressbar');
    fill.setAttribute('aria-label',work?'Work shift progress':'Homework progress');fill.setAttribute('aria-valuemin','0');fill.setAttribute('aria-valuemax',String(seconds));fill.setAttribute('aria-valuenow',String(Math.floor(elapsed)));
    this.el('s-class').title='Move or jump to interrupt';
    if(elapsed>=seconds){
      this.workElapsed=this.homeworkElapsed=null;this.hero.y=FLOOR;this.playerShadow.visible=true;resetMotion(this.hero);
      this.el('s-class').classList.remove('is-studying');this.paintTimer=0;
      const result=work?{ok:completeWorkShift(this.state),cleared:false}:completeHomework(this.state);
      this.hero.hp=this.state.stamina;this.persist();this.refresh();this.positionActors();
      if(result.cleared)this.open('passed');else if(result.ok)this.toast(work?'Shift complete · +'+WORK_PAY+' coins.':'Homework complete · +0.5 Knowledge · +8 XP.');
    }
    this.input.clearQueues();this.touchActions.clear();return true;
  }
  private startClass(): void {
    if(this.transition.active || this.fight || this.classElapsed!==null || this.sleepElapsed!==null || this.state.place!=='studio')return;
    if(!isSchoolDay(this.state)){this.toast('Classes are closed on weekends. Return on Monday.');return;}
    if(this.state.cleared[this.state.studio-1]){this.toast('Studio complete. Exit to the lobby to choose your next floor.');return;}
    if(hasActivity(this.state,'class')){this.toast('Class is finished for today. Try work or homework, then rest.');return;}
    if(this.state.activities.filter(a=>a.day===this.state.day).length>=2){this.toast('Your day is full. Sleep to begin tomorrow.');return;}
    if(Math.abs(this.hero.x-10)>=3 || Math.abs(this.hero.y-FLOOR)>.15){this.toast('Stand beside the classroom chair to take a seat.');return;}
    const cost=classCost(this.state);
    if(this.state.stamina<cost){this.toast('Not enough stamina for class. Rest at home first.');return;}
    this.arena.drop('hero',this.hero);this.close();resetMotion(this.hero);this.hero.x=10;this.heroDrop=0;this.jumpBuffer=0;
    this.classElapsed=0;this.el('s-class').classList.add('is-studying');
    this.paintClassProgress();this.studentArt.paint(this.time,false,this.state.weapon,0,true,null,true,true);
    this.followCamera(1,true);this.positionActors();this.refresh();
  }
  private cancelClass(): void {
    if(this.classElapsed===null)return;
    this.classElapsed=null;this.paintTimer=0;this.el('s-class').classList.remove('is-studying');
    this.el('s-class-fill').style.width='0%';this.refresh();
    this.toast('Class interrupted. Take a seat to start again.',2.5);
  }
  private paintClassProgress(): void {
    const elapsed=this.classElapsed??0,remaining=Math.max(0,Math.ceil(CLASS_SECONDS-elapsed));
    this.label('s-class-code','CLASS IN SESSION');
    this.label('s-class-progress',remaining+'s · +1 Knowledge');
    const fill=this.el('s-class-fill');
    fill.style.width=(Math.min(1,elapsed/CLASS_SECONDS)*100)+'%';
    fill.setAttribute('role','progressbar');fill.setAttribute('aria-label','Class progress');
    fill.setAttribute('aria-valuemin','0');fill.setAttribute('aria-valuemax',String(CLASS_SECONDS));
    fill.setAttribute('aria-valuenow',String(Math.min(CLASS_SECONDS,Math.floor(elapsed))));
    fill.setAttribute('aria-valuetext',remaining+' seconds remaining');
    this.el('s-class').title='Move or jump to interrupt class';
  }
  /** Returns false on cancellation so the same frame still processes movement and jump. */
  private updateClass(dt:number):boolean {
    if(this.classElapsed===null)return false;
    const touchMove=[...this.touchPointers.values()].some(axis=>axis!==0);
    const keyMove=this.input.consumeAction('moveLeft') || this.input.consumeAction('moveRight');
    const jumped=this.input.consumeAction('jump');
    const dropped=this.input.consumeAction('stats');
    if(this.state.place!=='studio' || this.input.moveAxis!==0 || keyMove || jumped || dropped || touchMove || this.touchActions.has('jump') || this.touchActions.has('drop') || Math.abs(this.hero.x-10)>.05 || Math.abs(this.hero.y-FLOOR)>.05){
      this.cancelClass();return false;
    }
    this.updateClassroomProps(dt);
    this.classElapsed=Math.min(CLASS_SECONDS,this.classElapsed+dt);
    this.followCamera(dt);this.updateTeaching(dt);
    this.instructorArt.paint(this.time+1,Math.abs(this.boss.vx)>.5,this.currentTeacher().tool,this.teachingGesture);
    this.studentArt.paint(this.time,false,this.state.weapon,0,true,null,true,true);
    this.paintClassProgress();
    if(this.classElapsed>=CLASS_SECONDS){
      this.classElapsed=null;this.paintTimer=0;this.el('s-class').classList.remove('is-studying');
      const result=completeClass(this.state);
      this.hero.hp=this.state.stamina;this.persist();this.refresh();
      if(result.cleared)this.open('passed');
      else if(result.ok)this.toast('+1 Knowledge · +15 XP. '+this.state.knowledge[this.state.studio-1]+'/'+KNOWLEDGE_REQUIRED+' learned.');
    }
    this.positionActors();this.positionLabels();this.input.clearQueues();this.touchActions.clear();
    return true;
  }
  private canStartFight(exhibition = false): boolean {
    if(!isSchoolDay(this.state)||this.fight || this.state.place!=='studio' || this.state.stamina<=0 || this.transition.active || this.classElapsed!==null || this.sleepElapsed!==null)return false;
    return exhibition ? this.state.studio===9 && this.state.cleared.every(Boolean) && !!this.selectedProfessor : !this.state.cleared[this.state.studio-1];
  }
  private startFight(exhibition = false, inPlace = false): void {
    if(!this.canStartFight(exhibition) || (inPlace && this.modal))return;
    this.exhibitionFight = exhibition;
    const difficulty=studioDifficulty(this.state.studio);
    this.resetBrawler(inPlace,true);this.brain.reset(this.currentTeacher().id,inPlace?.18:0,this.state.studio);
    this.instructorArt.setTeacher(this.currentTeacher());
    if(!inPlace)this.close();
    this.fight = true;
    if(!inPlace){resetMotion(this.hero);resetMotion(this.boss);this.hero.x=15;this.boss.x=24;}
    this.pendingAttack = null; this.attackBuffer = 0; this.penChain = 0; this.chainWindow = 0; this.hitStop = 0; this.effects.clear();
    this.bossMax = difficulty.hp; this.boss.hp = this.bossMax; this.boss.defense = difficulty.defense;
    this.hero.hp = this.state.stamina; this.warned = false; this.invulnerable = .5;
    this.attackTimer = 0; this.projectiles.clear(); this.enemyProjectiles.clear(); this.toast('', 0); this.refresh();
  }
  private winFight(): void {
    this.equipmentAction=null;this.equipmentFX.clear();this.guardTime=this.reflectTime=this.bossSlow=0;
    this.special=null;this.bossMove=null;this.arena.reset();this.specialPose=null;this.bossPose=null;
    this.fight = false; this.warning.visible = false; this.projectiles.clear(); this.enemyProjectiles.clear(); this.pendingAttack = null; this.attackBuffer = 0;
    this.cameraShake = 0; this.camera.position.set(0, 0, 20);
    if(this.exhibitionFight) {
      const id=this.currentTeacher().id;
      if(!this.state.professorWins.includes(id)) this.state.professorWins.push(id);
      this.exhibitionFight=false;this.persist();this.open('exhibition-won');
    } else if (completeStudio(this.state, 'fight')) { this.persist(); this.open('passed'); } this.refresh();
  }
  private hurt(damage: number, direction = this.hero.x < this.boss.x ? -1 : 1, force=9, lift=4): void {
    if (!this.fight || this.invulnerable > 0) return;
    if(this.guardTime>0&&direction===-this.guardFacing){damage=Math.max(1,Math.ceil(damage*.3));force*=.25;this.effects.word('BLOCK',this.hero.x,this.hero.y+3);}
    this.equipmentAction=null;
    this.state.stamina = Math.max(0, this.state.stamina - damage); this.hero.hp = this.state.stamina; this.invulnerable = .8;
    hitImpulse(this.hero, direction, force * (this.state.charms.anchor ? .65 : 1), lift, .23);
    this.special=null;this.arena.drop('hero',this.hero);this.comboHits=0;this.comboTime=0;
    this.pendingAttack = null; this.attackBuffer = 0; this.swing = 0; this.heroFlash = .14; this.hitStop = .055; this.cameraShake = .9;
    this.effects.impact(this.hero.x, this.hero.y + 1.4, damage, direction); this.effects.dust(this.hero.x, FLOOR);
    this.persist();
  }
  private strikingUnarmed=false;
  private hitInstructor(damage: number, direction: number, impact?:Pick<SkillEvent,'force'|'lift'|'slow'|'stun'|'style'>): void {
    if (!this.fight || !this.boss.isAlive()) return;
    if(this.bossDodge>0){this.effects.word('DODGE',this.boss.x,this.boss.y+3);return;}
    const heavy = ['swing','bash'].includes(ITEMS[this.strikingWeapon].family) || this.strikingFinisher;
    this.boss.hp = Math.max(0, this.boss.hp - damage);
    const strength = this.strikingWeapon === 'cup' ? 7 : heavy ? 11.5 : 6;
    // A telegraphed instructor attack has poise: it cannot be stun-locked by a fast pen.
    if(impact)hitImpulse(this.boss,direction,impact.force,impact.lift,impact.stun||.12);
    else hitImpulse(this.boss, direction, strength * (this.warned ? .65 : 1), heavy ? 5 : 2, this.warned ? .04 : heavy ? .23 : .12);
    this.comboHits++;this.comboTime=1.6;
    if(this.comboHits>1)this.effects.word(`${this.comboHits} HITS`,this.hero.x,this.hero.y+3.6);
    if (!this.strikingUnarmed && this.strikingWeapon === 'pen') { this.penChain = this.strikingFinisher ? 0 : this.penChain + 1; this.chainWindow = 1.05; }
    this.bossFlash = .12; this.hitStop = heavy ? .06 : .035; this.cameraShake = heavy ? .75 : .3;
    this.effects.impact(this.boss.x, this.boss.y + 1.4, damage, direction, heavy);
    if (heavy) this.effects.dust(this.boss.x, FLOOR, 1.4);
  }
  private toolStats(weapon: Weapon) {
    return applyWeaponMods(inventionStats(WEAPONS[weapon],this.state.inventions[weapon]),this.state.weaponMods[weapon]);
  }
  private useEquipmentSkill():void {
    const s=this.state,item=ITEMS[s.weapon];
    if(this.modal||this.transition.active||s.place!=='studio'||this.classElapsed!==null||this.sleepElapsed!==null||this.activityBusy||!s.weaponEquipped||!s.owned.includes(s.weapon)||item.skill==='none'||this.equipmentCooldown>0||this.equipmentAction||this.pendingAttack||this.special||this.heroDodge>0||this.hero.stun>0||this.arena.held('hero'))return;
    if(s.stamina<=item.skillCost){this.toast('You need more stamina for '+item.skillName+'.');return;}
    const stats=this.toolStats(s.weapon),plan=skillPlan(s.weapon,stats.range);
    if(!this.fight){
      const exhibition=s.studio===9&&s.cleared.every(Boolean)&&!!this.selectedProfessor;
      const reach=Math.max(stats.range,...plan.events.map(e=>e.range));
      if(!this.canStartFight(exhibition)||Math.abs(this.boss.x-this.hero.x)>reach||Math.abs(this.boss.y-this.hero.y)>3.5){this.toast('Face the professor and move within range.');return;}
      if((this.boss.x-this.hero.x)*this.facing<-.3)return;
      this.startFight(exhibition,true);
    }
    if(!this.fight)return;
    s.stamina-=item.skillCost;this.hero.hp=s.stamina;this.equipmentCooldown=item.skillCooldown;
    this.equipmentAction={weapon:s.weapon,plan,elapsed:0,next:0,damage:stats.damage+s.strength*3+s.toolRanks[s.weapon]*4+(s.level-1)*2+(s.charms.echo?3:0),dir:this.facing};
    this.guardFacing=this.facing;this.guardTime=plan.guard;this.reflectTime=plan.reflect;
    if(plan.dash){this.hero.hitVx=plan.dash*this.facing;this.effects.trail(this.hero.x,this.hero.y,this.facing);this.specialPose='kick';this.specialPoseTime=plan.duration;}
    if(plan.lift)this.hero.vy=Math.max(this.hero.vy,plan.lift);
    if(plan.guard||plan.reflect)this.equipmentFX.burst('guard',this.hero.x,this.hero.y+1.5,item.tint,this.facing,3,Math.max(plan.guard,plan.reflect),this.hero);
    this.effects.word(item.skillName.toUpperCase(),this.hero.x,this.hero.y+4);this.persist();this.refresh();
  }
  private updateEquipmentSkill(dt:number):void {
    const action=this.equipmentAction;if(!action)return;
    if(!this.fight||this.hero.stun>0){this.equipmentAction=null;return;}
    action.elapsed+=dt;
    while(action.next<action.plan.events.length&&action.plan.events[action.next].at<=action.elapsed){
      const event=action.plan.events[action.next++];this.swing=.28;
      const damage=Math.max(1,Math.round(action.damage*event.power));
      const item=ITEMS[action.weapon];
      if(event.kind==='projectile')this.equipmentFX.fire(action.weapon,this.hero.x+action.dir*.8,this.hero.y+1.4,action.dir,damage,event.range,event.bounces,true,event);
      else {
        this.equipmentFX.burst(event.style,this.hero.x+action.dir*event.range*.45,this.hero.y+1.4,item.tint,action.dir,event.range,.38);
        const dx=this.boss.x-this.hero.x,dy=this.boss.y-this.hero.y;
        if(dx*action.dir>=-.5&&Math.abs(dx)<=event.range&&Math.abs(dy)<(event.kind==='flash'?3.5:3))this.equipmentHit(action.weapon,damage,action.dir,event);
      }
    }
    if(action.elapsed>=action.plan.duration)this.equipmentAction=null;
  }
  private equipmentHit(weapon:Weapon,damage:number,dir:number,impact?:Pick<SkillEvent,'force'|'lift'|'slow'|'stun'|'style'>):void {
    if(!this.fight)return;
    const hp=this.boss.hp;this.strikingWeapon=weapon;this.strikingFinisher=false;this.strikingUnarmed=false;
    this.hitInstructor(calculateDamage(damage,this.boss.defense,0).damage,dir,impact);
    if(this.boss.hp>=hp||!impact)return;
    if(impact.slow)this.bossSlow=Math.max(this.bossSlow,impact.slow);
    if(impact.stun>=.15){this.bossMove=null;this.warned=false;this.warning.visible=false;}
    if(impact.lift>=6)this.arena.drop('boss',this.boss);
    this.equipmentFX.burst(impact.style,this.boss.x,this.boss.y+1.5,ITEMS[weapon].tint,dir,2.5,.28);
  }
  private attack(): void {
    if(this.modal || this.transition.active || this.classElapsed!==null || this.sleepElapsed!==null || this.activityBusy || this.special || this.equipmentAction || this.heroDodge>0)return;
    if(this.arena.held('hero')){this.grabOrThrow();return;}
    if(!this.fight){
      const exhibition=this.state.studio===9 && this.state.cleared.every(Boolean) && !!this.selectedProfessor;
      if(!this.canStartFight(exhibition))return;
      const dx=this.boss.x-this.hero.x,dy=this.boss.y-this.hero.y;
      const range=this.state.weaponEquipped?this.toolStats(this.state.weapon).range:1.65;
      if(dx*this.facing<-.3 || Math.abs(dx)>range || Math.abs(dy+.5)>2)return;
      this.startFight(exhibition,true);
    }
    if(!this.fight)return;
    if (this.attackTimer > 0 || this.pendingAttack || this.hero.stun > 0) { this.attackBuffer = .15; return; }
    this.beginAttack();
  }
  private beginAttack(): void {
    const unarmed=!this.state.weaponEquipped, weapon = unarmed?'pen':this.state.weapon, w = unarmed?{speed:.4,range:1.65,damage:8}:this.toolStats(weapon);
    const finisher = !unarmed && weapon === 'pen' && this.penChain === 2 && this.chainWindow > 0;
    const damage = w.damage + this.state.strength*3 + (unarmed?0:this.state.toolRanks[weapon] * 4) + (this.state.level - 1) * 2 + (this.state.charms.echo ? 3 : 0) + (finisher ? 4 : 0);
    this.attackTimer = w.speed; this.attackBuffer = 0;
    this.pendingAttack = { unarmed, weapon, damage, facing: this.facing, remaining: ['swing','bash'].includes(ITEMS[weapon].family) ? .15 : ITEMS[weapon].family==='projectile' ? .09 : .05, finisher };
    this.swing = .28;
  }
  private resolveAttack(): void {
    const strike = this.pendingAttack; this.pendingAttack = null;
    if (!strike || !this.fight || this.hero.stun > 0) return;
    const w = strike.unarmed?{range:1.65}:this.toolStats(strike.weapon); this.strikingWeapon = strike.weapon; this.strikingFinisher = strike.finisher; this.strikingUnarmed = strike.unarmed;
    if (!strike.unarmed&&ITEMS[strike.weapon].family==='projectile') this.equipmentFX.fire(strike.weapon,this.hero.x+strike.facing*.7,this.hero.y+1.25,strike.facing,strike.damage,w.range);
    else {
      if(!strike.unarmed)this.equipmentFX.burst(ITEMS[strike.weapon].family==='thrust'?'line':'arc',this.hero.x+strike.facing*1.4,this.hero.y+1.3,ITEMS[strike.weapon].tint,strike.facing,Math.min(4,w.range));
      meleeAttack({ attackerX: this.hero.x, attackerYFeet: this.hero.y, attackerAttack: strike.damage, attackerCritChance: 0, facing: strike.facing, range: w.range, arcHeight: 2, targets: [this.boss], onHit: () => {} });
    }
    this.strikingFinisher = false; this.strikingUnarmed = false;
  }
  private update(dt: number): void {
    this.music.update();
    if(this.modal==='character'&&(this.creatorPaintTime+=dt)>=1/24){this.creatorPaintTime=0;this.updateCreatorPreview();}
    this.time += dt;
    if (this.transition.active) {
      if (!document.hidden) this.transition.update(dt);
      this.input.releaseKeys();
      this.el('s-transition').style.opacity = String(this.transition.cover);
      this.el('s-transition').style.setProperty('--cover', String(this.transition.cover));
      this.positionActors(); this.positionLabels(); return;
    }
    if (this.input.consumePause()) { if (this.modal) this.close(); else this.open('pause'); }
    if (this.toastUntil < this.time) this.label('s-toast', '');
    if (this.modal || document.hidden) { this.input.clearQueues(); this.camera.position.set(this.cameraBase, 0, 20); this.positionLabels(); return; }
    this.gymTraining=Math.max(0,this.gymTraining-dt);
    if(this.state.place==='restaurant')this.restaurantCustomers.update(this.time);
    if(this.state.place==='studio')this.classroomDoor.update(this.time);
    this.effects.update(dt); this.cameraShake = Math.max(0, this.cameraShake - dt * 4);
    this.camera.position.x = this.cameraBase + Math.sin(this.time * 88) * this.cameraShake * .13;
    this.camera.position.y = Math.cos(this.time * 103) * this.cameraShake * .08;
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      if (this.input.consumeAttack()) this.attackBuffer = .15;
      this.positionActors(); this.positionLabels(); this.refresh(); return;
    }
    if (this.sleepElapsed !== null) {
      this.el('s-class').classList.remove('is-studying');
      this.sleepElapsed+=dt;this.dailyVisuals.updateSleep(this.sleepElapsed/2.5,this.time);this.heroMesh.visible=false;this.playerShadow.visible=false;
      this.label('s-class-title', 'A fresh start is on its way.'); this.label('s-class-quote', 'Sketchbooks closed. Stamina recharging.'); this.label('s-class-code', 'A GOOD NIGHT’S SLEEP');
      this.el('s-class-fill').style.width = `${this.sleepElapsed / 2.5 * 100}%`; this.label('s-class-progress', 'Z z z …');this.el('s-class').removeAttribute('title');this.el('s-class-fill').removeAttribute('role');
      if (this.sleepElapsed >= 2.5) { this.sleepElapsed=null;this.dailyVisuals.endSleep();this.hero.x=HOME_POINTS.sleep.wake.x;this.hero.y=FLOOR;this.positionActors();rest(this.state); this.hero.hp = this.state.stamina; this.persist(); this.refresh(); this.toast(`Morning, day ${this.state.day}. Stamina fully restored.`); }
      this.input.clearQueues(); return;
    }
    if(this.updateDailyActivity(dt)||this.updateClass(dt))return;
    if(this.input.consumeAction('inventory')&&!this.fight){this.open('backpack');return;}
    this.equipmentCooldown=Math.max(0,this.equipmentCooldown-dt);this.guardTime=Math.max(0,this.guardTime-dt);this.reflectTime=Math.max(0,this.reflectTime-dt);this.bossSlow=Math.max(0,this.bossSlow-dt);
    if(this.input.consumeAction('useHp')||this.touchActions.delete('equipment'))this.useEquipmentSkill();
    const touchAxis=Math.sign([...this.touchPointers.values()].reduce((a,b)=>a+b,0));
    const axis = touchAxis || this.input.moveAxis;
    if (axis && this.hero.stun <= 0) this.facing = axis;
    const platforms=placePlatforms(this.state.place);
    if(standingOn(this.hero,platforms))this.heroCoyote=.1;else this.heroCoyote=Math.max(0,this.heroCoyote-dt);
    this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);if(this.input.consumeJump()||this.touchActions.delete('jump'))this.jumpBuffer=.13;
    if(this.jumpBuffer>0&&this.heroCoyote>0&&this.hero.stun<=0){this.hero.vy=platforms.length?15.6:10;this.jumpBuffer=0;this.heroCoyote=0;this.effects.dust(this.hero.x,this.hero.y,.9);}
    if((this.input.consumeAction('stats')||this.touchActions.delete('drop'))&&platforms.length>0&&this.hero.y>FLOOR+.1){this.heroDrop=.12;this.hero.y-=.08;this.hero.vy=-3;}
    if(this.input.consumeAction('skill1'))this.physicalMove('uppercut');
    if(this.input.consumeAction('skill2'))this.physicalMove('kick');
    if(this.input.consumeAction('skill3'))this.physicalMove('dodge');
    for(const key of ['uppercut','kick','dodge'] as const)this.specialCooldown[key]=Math.max(0,this.specialCooldown[key]-dt);
    this.heroDrop=Math.max(0,this.heroDrop-dt);this.bossDrop=Math.max(0,this.bossDrop-dt);this.heroDodge=Math.max(0,this.heroDodge-dt);this.bossDodge=Math.max(0,this.bossDodge-dt);
    this.specialPoseTime=Math.max(0,this.specialPoseTime-dt);if(!this.specialPoseTime)this.specialPose=null;
    this.bossPoseTime=Math.max(0,this.bossPoseTime-dt);if(!this.bossPoseTime)this.bossPose=null;
    this.comboTime=Math.max(0,this.comboTime-dt);if(!this.comboTime)this.comboHits=0;
    const speed = (this.state.shoes ? 7.8 : 6.8) * (1 + this.state.endurance * .04) * (this.pendingAttack?.weapon === 'ruler' ? .5 : 1);
    const previousX = this.hero.x;
    if (stepMotion(this.hero, axis, speed, dt, roomLayout(this.state.place).rightBoundary,platforms,this.heroDrop>0)) this.effects.dust(this.hero.x,this.hero.y,1.3);
    if (this.state.place === 'mystery' && this.hero.y < FLOOR + 2 && Math.abs(this.hero.x - 24) < 2.3) {
      this.hero.x = previousX <= 24 ? 21.7 : 26.3; this.hero.vx = 0;
    }
    this.followCamera(dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt); this.swing = Math.max(0, this.swing - dt); this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.heroFlash = Math.max(0, this.heroFlash - dt); this.bossFlash = Math.max(0, this.bossFlash - dt); this.instructorSwing = Math.max(0, this.instructorSwing - dt);
    this.chainWindow = Math.max(0, this.chainWindow - dt); if (!this.chainWindow) this.penChain = 0;
    this.attackBuffer = Math.max(0, this.attackBuffer - dt);
    if(this.state.place==='studio'&&!this.fight)this.updateTeaching(dt);
    if (this.input.consumeAttack()||this.touchActions.delete('attack')) this.attack();
    if (this.attackBuffer > 0 && this.attackTimer <= 0 && !this.pendingAttack && !this.special && !this.equipmentAction && this.heroDodge<=0 && this.hero.stun <= 0 && this.fight) this.beginAttack();
    if (this.pendingAttack) { this.pendingAttack.remaining -= dt; if (this.pendingAttack.remaining <= 0) this.resolveAttack(); }
    if(this.special){this.special.remaining-=dt;if(this.special.remaining<=0)this.resolvePhysicalMove();}
    if (this.input.consumeAction('interact')||this.touchActions.delete('interact')) this.action('interact');
    this.updateEquipmentSkill(dt);
    if (this.fight) this.updateFight(dt);
    if(this.reflectTime>0){const reflected=this.arena.reflectNear(this.hero,this.guardFacing)+this.enemyProjectiles.reflectNear(this.hero.x,this.hero.y+1.4,this.guardFacing,damage=>this.equipmentFX.fire('tennisRacket',this.hero.x+this.guardFacing,this.hero.y+1.4,this.guardFacing,damage+5,20));if(reflected)this.effects.word('RETURN!',this.hero.x,this.hero.y+3.5);}
    this.equipmentFX.update(dt,this.hero,this.boss,this.fight,(weapon,damage,dir,impact)=>this.equipmentHit(weapon,damage,dir,impact));
    this.strikingWeapon = 'cup'; this.strikingFinisher = false;
    this.projectiles.update(dt, this.fight ? [this.boss] : [], () => {});
    this.enemyProjectiles.update(dt, this.fight ? [this.hero] : [], () => {});
    this.updateClassroomProps(dt);
    // Resolve scene changes after projectile iteration, never from a hit callback.
    if (this.fight && this.state.stamina === 0) { this.changePlace('home'); this.open('home'); this.toast('Out of stamina. Rest up—your Knowledge is safe.', 6); }
    else if (this.fight && this.boss.hp === 0) this.winFight();
    this.paintTimer -= dt;
    if (this.paintTimer <= 0) {
      this.studentArt.paint(this.time, Math.abs(this.hero.vx) > 1, this.pendingAttack?.weapon ?? this.state.weapon, this.swing > 0 ? 1 - this.swing / .28 : 0,false,this.specialPose??(this.gymTraining>0?(Math.floor(this.gymTraining*3)%2?'uppercut':'kick'):this.heroDodge>0?'dodge':null),!this.state.weaponEquipped||this.gymTraining>0||!!this.arena.held('hero'));
      if (this.state.place === 'mystery') this.clerkArt.paint(this.time + 2, false, 'pen', 0);
      if(this.state.place==='restaurant')this.cashierArt.paint(this.time+2,false,'pen',0,false,null,true);
      this.instructorArt.paint(this.time + 1, Math.abs(this.boss.vx) > .5, this.currentTeacher().tool, this.instructorSwing > 0 ? 1 - this.instructorSwing / .28 : this.warned ? .12 : this.fight ? 0 : this.teachingGesture,false,this.bossPose??(this.bossDodge>0?'dodge':null),!!this.arena.held('boss')); this.paintTimer = 1 / 24;
    }
    this.positionActors(); this.positionLabels();
    this.uiTimer -= dt; if (this.uiTimer <= 0) { this.refresh(); this.uiTimer = .12; }
    this.saveTimer += dt; if (this.saveTimer > 3) { this.persist(); this.saveTimer = 0; }
  }
  private updateTeaching(dt: number): void {
    if(!isSchoolDay(this.state))return;
    const intent=this.teaching.update(dt,this.boss,this.hero);
    this.teachingFacing=intent.facing;this.teachingGesture=intent.gesture;
    stepMotion(this.boss,intent.axis,1.65,dt,30,CLASSROOM_PLATFORMS);
    if(this.classElapsed===null)separateBodies(this.hero,this.boss);
  }
  private updateFight(dt: number): void {
    const difficulty=studioDifficulty(this.state.studio);
    const intent=this.brain.update(dt,{hero:this.hero,boss:this.boss,tool:this.currentTeacher().tool,held:!!this.arena.held('boss'),propNear:!!this.arena.nearby(this.boss),propThreat:this.arena.threat(this.boss,'boss'),heroAttacking:!!this.pendingAttack||!!this.special||!!this.equipmentAction,busy:!!this.bossMove});
    if(intent.pickup)this.arena.pickup('boss',this.boss);
    if(intent.jump&&standingOn(this.boss)&&this.boss.stun<=0){this.boss.vy=15.6;this.effects.dust(this.boss.x,this.boss.y,.8);}
    if(intent.drop&&this.boss.y>FLOOR+.1){this.bossDrop=.25;this.boss.y-=.08;this.boss.vy=-3;}
    if(intent.dodge&&this.boss.stun<=0){this.boss.hitVx=intent.dodge*19;this.bossDodge=.18;this.effects.trail(this.boss.x,this.boss.y,intent.dodge);}
    if(stepMotion(this.boss,intent.axis,difficulty.moveSpeed*(this.bossSlow>0?.45:1),dt,30,CLASSROOM_PLATFORMS,this.bossDrop>0))this.effects.dust(this.boss.x,this.boss.y);
    separateBodies(this.hero,this.boss);
    if(intent.move&&!this.bossMove&&this.boss.stun<=0){
      this.bossMove={kind:intent.move,remaining:(intent.move==='sweep'?.5:.38)*difficulty.windupScale,direction:Math.sign(this.hero.x-this.boss.x)||1};
      this.warned=true;
    }
    this.warning.visible=!!this.bossMove;
    if(this.bossMove){
      const move=this.bossMove,range=move.kind==='sweep'?4.8:move.kind==='throw'?7:3;
      this.warning.position.set(this.boss.x+move.direction*range/2,this.boss.y+.12,1);
      this.warning.scale.x=range/4;this.warning.material.opacity=.4+Math.sin(this.time*23)*.2;
      move.remaining-=dt;
      if(move.remaining<=0){
        this.bossMove=null;this.warned=false;this.warning.visible=false;this.instructorSwing=.28;
        if(move.kind==='throw'){
          if(!this.arena.throw('boss',this.boss,move.direction,this.hero))this.enemyProjectiles.fire(this.boss.x+move.direction,this.boss.y+1.4,move.direction,13,25,difficulty.projectileDamage,false);
        }else{
          this.effects.slash(this.boss.x,this.boss.y,move.direction,move.kind!=='jab');
          const dx=this.hero.x-this.boss.x,dy=this.hero.y-this.boss.y;
          if(dx*move.direction>-.5&&Math.abs(dx)<range&&Math.abs(dy)<(move.kind==='uppercut'?3:2))
            this.hurt(difficulty.meleeDamage,move.direction,move.kind==='kick'?14:10,move.kind==='uppercut'?13:4);
          if(move.kind==='uppercut'){this.boss.vy=11;this.bossPose='uppercut';this.bossPoseTime=.4;}
          if(move.kind==='kick'){this.boss.hitVx=move.direction*12;this.bossPose='kick';this.bossPoseTime=.4;}
        }
      }
    }
  }

  private positionActors(): void {
    const heroScale=this.state.place==='lobby'?LOBBY_STUDENT_SCALE:1;
    this.heroMesh.position.set(this.hero.x, this.hero.y + 2.025*heroScale, this.state.place==='restaurant'&&this.workElapsed===null?6:2);
    this.playerShadow.visible=this.workElapsed===null;
    this.heroMesh.scale.set(this.facing * heroScale * (this.heroFlash ? 1.08 : 1), heroScale * (this.heroFlash ? .94 : 1), 1);
    this.heroMesh.rotation.z = this.hero.stun > 0 ? -Math.sign(this.hero.hitVx) * .22 : this.specialPose==='kick'?-this.facing*.17:0;
    (this.heroMesh.material as THREE.MeshBasicMaterial).color.set(this.heroFlash ? '#f5b49d' : '#ffffff');
    this.heroMesh.visible=!this.dailyVisuals.active&&(this.invulnerable<=0||Math.floor(this.time*14)%2===0);
    this.playerShadow.visible=!this.dailyVisuals.active&&this.workElapsed===null;
    this.bossMesh.position.set(this.boss.x, this.boss.y + 2.175, 1);
    this.bossMesh.scale.set((this.fight ? (this.hero.x < this.boss.x ? -1 : 1) : this.teachingFacing) * (this.bossFlash ? 1.08 : 1), this.bossFlash ? .94 : 1, 1);
    this.bossMesh.rotation.z = this.boss.stun > 0 ? -Math.sign(this.boss.hitVx) * .2 : this.bossPose==='kick'?-.15:0;
    (this.bossMesh.material as THREE.MeshBasicMaterial).color.set(this.bossFlash ? '#ffd7a0' : '#ffffff');
    this.playerShadow.position.x = this.hero.x; this.bossShadow.position.x = this.boss.x;
    const support=(x:number,y:number)=>Math.max(FLOOR,...placePlatforms(this.state.place).filter(p=>x>=p.x1&&x<=p.x2&&p.y<=y+.1).map(p=>p.y));
    this.playerShadow.position.y=support(this.hero.x,this.hero.y)+.05;this.bossShadow.position.y=support(this.boss.x,this.boss.y)+.05;
    this.playerShadow.scale.x = heroScale * Math.max(.5, 1 - (this.hero.y - FLOOR) * .12); this.bossShadow.scale.x = Math.max(.5, 1 - (this.boss.y - FLOOR) * .12);
  }
  private positionLabels(): void {
    const place = this.state.place;
    const visibility: Record<string, boolean> = {
      's-mika-speech':place==='mystery'&&!this.modal&&Math.abs(this.hero.x-24)<9,
      's-restaurant-sign':place==='lobby',
      's-job-label':place==='restaurant'&&!this.modal&&!this.activityBusy,
      's-laptop-label':place==='home'&&!this.modal&&!this.activityBusy&&this.sleepElapsed===null,
      's-archive-board': place === 'foyer' && !this.modal && !this.transition.active,
      's-crafting-label': (place === 'tools' || place === 'skills') && !this.modal,
      's-chair-label': place === 'studio' && !this.fight && this.classElapsed === null,
      's-boss-label': place === 'studio' && isSchoolDay(this.state) && !this.fight && this.classElapsed === null,
      's-mystery-label': place === 'lobby', 's-building-label': place === 'lobby',
      's-clerk-label': place === 'mystery', 's-exit-label': place!=='lobby'&&!this.modal&&!this.fight&&!this.activityBusy&&this.sleepElapsed===null,
      's-accommodation-sign': place === 'lobby', 's-wayfinding': place === 'lobby',
      's-context-hint': !this.activityBusy && !this.modal && !this.transition.active && (this.fight || this.classroomPropAvailable() ? !!this.arena.held('hero') || !!this.arena.nearby(this.hero) : this.classElapsed===null && this.sleepElapsed===null && !['lobby','shopfloor','workshopfloor','skills','tools','exit','clerk','faculty','work','homework','jobfloor','foyerfloor','classroomfloor','homefloor','map'].includes(this.near())),
    };
    this.camera.updateMatrixWorld();
    for(const [index,id] of ['s-lift-left','s-lift-right'].entries()) {
      const x=LOBBY_LIFTS[index],left=new THREE.Vector3(x-1.15,11.8,0).project(this.camera),right=new THREE.Vector3(x+1.15,5.1,0).project(this.camera),el=this.el(id);
      el.hidden=place!=='foyer'||!!this.modal||this.transition.active||left.x>1||right.x< -1;
      el.style.left=((left.x+1)*50)+'%';el.style.top=((1-left.y)*50)+'%';el.style.width=((right.x-left.x)*50)+'%';el.style.height=((left.y-right.y)*50)+'%';
      el.classList.toggle('is-near',this.canUseLift(index));
    }
    for (const [id, x, y] of [['s-mika-speech',24,10.6],['s-restaurant-sign',83,10.8],['s-job-label',22,8.8],['s-laptop-label',HOME_POINTS.homework.label.x,HOME_POINTS.homework.label.y],['s-archive-board',29.38,9.7],['s-crafting-label',22,FLOOR+4.8],['s-chair-label', 10, FLOOR + 2.4], ['s-boss-label', this.boss.x, this.boss.y - .22], ['s-mystery-label',11,FLOOR+4.5],['s-building-label',37,FLOOR+4.5], ['s-clerk-label', 24, FLOOR - .22], ['s-exit-label',place==='home'?HOME_POINTS.exit.x:place==='studio'?2.9:3.2,place==='home'?HOME_POINTS.exit.y:place==='studio'?9.1:FLOOR+3.1], ['s-accommodation-sign',65,11.1],['s-wayfinding',75,FLOOR+3], ['s-context-hint',this.hero.x,this.hero.y+4.8*(place==='lobby'?LOBBY_STUDENT_SCALE:1)]] as const) {
      const p = new THREE.Vector3(x, y, 0).project(this.camera); const el = this.el(id);
      el.style.left = `${(p.x + 1) * 50}%`; el.style.top = `${(1 - p.y) * 50}%`;
      el.hidden = !visibility[id] || p.x < -1.1 || p.x > 1.1;
      if(id==='s-archive-board'){el.style.width=`${Math.max(76,Math.min(126,1.65*this.ui.clientWidth/(this.camera.right-this.camera.left)))}px`;el.classList.toggle('is-near',this.near()==='faculty');}
      if((id==='s-crafting-label'||id==='s-archive-board'||id==='s-mika-speech'||id==='s-restaurant-sign'||id==='s-job-label'||id==='s-laptop-label')&&!el.hidden){const edge=el.offsetWidth/2+8;el.style.left=`clamp(${edge}px,${(p.x+1)*50}%,calc(100% - ${edge}px))`;}
    }
  }
  private refresh(): void {
    const s = this.state, i = s.studio - 1, total = s.cleared.filter(Boolean).length;
    this.label('s-crafting-label', s.place==='skills' ? this.near()==='skills'?'E · Train':'Training station →' : this.near()==='tools'?'E · Modify weapon':'Fabrication bench →');
    this.el('touch-attack').hidden=!this.fight && !(s.place==='studio' && this.classElapsed===null && this.sleepElapsed===null);
    this.label('touch-interact',this.activityBusy?'Working':this.near()==='work'?'Work':this.near()==='homework'?'Study':this.fight || this.classroomPropAvailable()?(this.arena.held('hero')?'Throw':'Grab'):this.near()==='exit'?'Exit':this.near()==='map'?'Lift':['foyerfloor','classroomfloor','homefloor','workshopfloor','jobfloor','shopfloor','lobby'].includes(this.near())?'Action':this.near()==='home'&&s.place==='home'?'Rest':this.near()==='faculty'?'Archive':this.near()==='skills'?'Train':this.near()==='tools'?'Upgrade':this.near()==='chair'?'Sit':['instructor','clerk'].includes(this.near())?'Talk':'Enter');
    this.label('s-level', `LV ${s.level} · ${window.innerWidth < 1000 ? 'Student' : 'Architecture student'}`); this.label('s-stamina', `${s.stamina} / ${maxStamina(s)}`);
    this.el('s-fill').style.width = `${s.stamina / maxStamina(s) * 100}%`; this.el('s-meter').setAttribute('aria-valuenow', String(s.stamina)); this.el('s-meter').setAttribute('aria-valuemin', '0'); this.el('s-meter').setAttribute('aria-valuemax', String(maxStamina(s))); this.el('s-meter').setAttribute('aria-valuetext', `${s.stamina} of ${maxStamina(s)} stamina`);
    this.label('s-location', s.place === 'studio' ? STUDIO_NAMES[i] : s.place==='lobby'&&this.hero.x>75?'Lucky Lantern Noodles':s.place === 'lobby' && this.hero.x > 53 ? 'Student Accommodation' : PLACES[s.place].title);
    this.label('s-location-code', s.place === 'studio' ? `L${s.studio} · STUDIO ${String(s.studio).padStart(2, '0')}` : PLACES[s.place].subtitle);
    this.el('s-journey-panel').hidden=!this.insideBuilding();this.el('s-day-card').hidden=this.insideBuilding();this.el('s-day').hidden=!this.insideBuilding();
    this.label('s-weekday',weekdayName(s));this.label('s-semester-number','Semester '+semesterNumber(s));this.label('s-school-status',isSchoolDay(s)?'':'Classes closed · weekend');
    this.label('s-coins', `◉ ${s.coins}`); this.label('s-day', `DAY ${String(s.day).padStart(2, '0')}`); this.label('s-journey', `${total} / 9 studios completed`);
    this.label('s-xp', `${s.xp} / ${xpNeeded(s)} XP · Level ${s.level}`); this.el('s-xp-fill').style.width = `${s.xp / xpNeeded(s) * 100}%`;
    this.label('s-knowledge',`Studio ${s.studio} · Knowledge ${s.knowledge[i]}/${KNOWLEDGE_REQUIRED}${s.cleared[i]?' · ✓ Passed':''}`);
    const teacher=this.currentTeacher();
    this.label('s-boss-label',teacher.name);
    for(const slot of [0,1,2]){const w=s.quickSlots[slot],button=this.el('quick-slot-'+slot) as HTMLButtonElement,img=button.querySelector('img')!;button.classList.toggle('empty-slot',!w);button.classList.toggle('selected',!!w&&s.weaponEquipped&&s.weapon===w);button.setAttribute('aria-pressed',String(!!w&&s.weaponEquipped&&s.weapon===w));button.setAttribute('aria-label',w?'Equip '+ITEMS[w].name:'Empty slot '+(slot+1));img.hidden=!w;if(w&&img.getAttribute('src')!==this.icons[w])img.src=this.icons[w];button.title=w?ITEMS[w].name+' · '+ITEMS[w].description:'Empty · buy equipment from Mika';button.disabled=this.transition.active||this.classElapsed!==null||this.sleepElapsed!==null||this.activityBusy;}
    const boxes=knowledgeBoxes(s.knowledge[i]);if(this.el('s-knowledge-boxes').innerHTML!==boxes)this.el('s-knowledge-boxes').innerHTML=boxes;
    this.label('s-calendar','Day '+semesterDay(s)+' / '+SEMESTER_DAYS+' · Calendar');
    this.el('s-submit-study').hidden=!!s.cleared[i]||s.knowledge[i]<PASS_KNOWLEDGE||this.fight||this.activityBusy;
    this.label('s-job-label',this.near()==='work'?'E · Work shift · '+workCost(s)+' stamina':'Cashier · Work here');
    this.label('s-laptop-label',this.near()==='homework'?'E · Homework · '+homeworkCost(s)+' stamina':'Laptop · Homework');
    const item=ITEMS[s.weapon],skill=this.el('equipment-skill') as HTMLButtonElement;skill.hidden=!s.weaponEquipped||item.skill==='none'||s.place!=='studio';skill.disabled=this.classElapsed!==null||this.sleepElapsed!==null||this.activityBusy||this.equipmentCooldown>0||!!this.equipmentAction||this.hero.stun>0||s.stamina<=item.skillCost;skill.querySelector('span')!.textContent=this.equipmentCooldown>0?this.equipmentCooldown.toFixed(1)+'s':item.skillName;skill.title=item.skillDescription+' · '+item.skillCost+' stamina';
    this.el('s-class').hidden = this.classElapsed === null && this.sleepElapsed === null && !this.activityBusy;
    this.el('s-lobby-sparkles').hidden = s.place !== 'lobby' || this.cameraBase > 4;
    this.ui.classList.toggle('in-lobby', s.place === 'lobby');
    const busy = this.transition.active || this.fight || this.classElapsed !== null || this.sleepElapsed !== null || this.activityBusy;
    for(const id of ['s-lift-left','s-lift-right'])(this.el(id) as HTMLButtonElement).disabled=busy;
    this.el('s-boss').hidden = !this.fight; this.label('s-boss-title', `${this.currentTeacher().name.toUpperCase()} · ${Math.ceil(this.boss.hp)} / ${this.bossMax}`);
    this.el('s-boss-fill').style.width = `${this.boss.hp / this.bossMax * 100}%`;
    this.label('s-boss-tip', this.bossMove ? `${this.bossMove.kind.toUpperCase()} incoming · dodge, jump or interrupt!` : this.comboHits>1?`${this.comboHits} hits · keep the combo going!`:'Use the desks, lights and loose stationery.');
    this.el('s-move-dock').hidden=!this.fight;
    for(const key of ['uppercut','kick','dodge'] as const){const button=this.el(`move-${key}`) as HTMLButtonElement;button.disabled=this.specialCooldown[key]>0||this.hero.stun>0||!!this.special;button.style.setProperty('--cooldown',String(this.specialCooldown[key]/(key==='dodge'?1.2:key==='uppercut'?1.5:1.25)));}
    const key=(action:ActionName)=>prettyKey(this.input.getBindings()[action][0]??'—');
    this.label('s-controls',`${key('moveLeft')} ${key('moveRight')} move · ${key('jump')} jump · ${key('interact')} ${this.fight?'grab / throw':'interact'} · ${this.fight?`${key('attack')} attack · ${key('skill1')} uppercut · ${key('skill2')} kick`:this.canUseLift()?'M lift':`${key('stats')} drop`}`);
    const nearby = this.near();
    this.el('s-archive-board').title=nearby==='faculty'?`${key('interact')} · Open professor archive`:'Open professor archive';
    this.label('s-context-hint',this.fight || this.classroomPropAvailable() ? this.arena.held('hero')?'E · throw '+this.arena.held('hero')!.kind:'E · pick up '+(this.arena.nearby(this.hero)?.kind??'prop') : nearby==='home' && s.place==='home'?'E · rest':nearby==='skills'?'E · train':nearby==='tools'?'E · upgrade tool':nearby==='map'?'E · Floor directory':nearby==='chair'?'E · sit for class':nearby==='instructor'?`${key('attack')} · hit  /  ${key('interact')} · talk`:'E · enter');
    this.label('s-exit-label',`${key('interact')} · Exit`);
    for(const id of ['s-lift-left','s-lift-right'])this.el(id).querySelector('span')!.textContent=this.touchMode?'Tap · Floor directory':`${key('interact')} · Floor directory`;
    skill.querySelector('kbd')!.textContent=key('useHp');
    for(const id of ['s-context-hint','s-crafting-label','s-job-label','s-laptop-label'])this.el(id).textContent=this.el(id).textContent!.replace(/^E ·/,`${key('interact')} ·`);
    const labels: Record<ReturnType<StudioGame['near']>, string> = {homefloor:'Jump onto the chair to reach your laptop',foyerfloor:'Walk to a lift to choose a floor',classroomfloor:'Exit door ←',restaurant:'Enter Lucky Lantern Noodles',work:'Work a shift',jobfloor:'Cashier counter →',homework:'Do homework on your laptop', faculty:'Open professor archive', workshopfloor:'Crafting table →', chair: s.cleared[i] ? 'Studio complete · head upstairs' : 'Take a seat · attend class', instructor: s.cleared[i] ? 'Talk to your instructor' : 'Hit to start a duel · or talk', exit: ['studio','skills','tools'].includes(s.place)?'Exit to Building 100 Lobby':'Exit to campus', map: 'Open lift floor directory', shop: 'Browse the Supply Cupboard', mystery: 'Enter the mysterious shop', clerk: 'Talk to Mika', shopfloor: 'Walk right to Mika’s counter →', building: 'Enter Building 100', lobby:this.hero.x>72?'Lucky Lantern Noodles →':this.hero.x>45?'Accommodation → · noodles further right':'Shop ← · Building 100 →', home: s.place === 'home' ? 'Sleep & restore stamina' : 'Enter your apartment', skills: 'Train stamina & strength', tools: 'Modify weapon' };
    this.label('s-interact-text', this.fight ? `${s.weaponEquipped?'Attack with '+WEAPONS[s.weapon].name:'Punch'} · Space / click` : this.classElapsed !== null ? 'Class in session…' : this.sleepElapsed !== null ? 'Resting…' : labels[nearby]);
    (this.el('s-interact') as HTMLButtonElement).disabled = this.transition.active || this.classElapsed !== null || this.sleepElapsed !== null || this.activityBusy;
    this.positionLabels();
  }
}
