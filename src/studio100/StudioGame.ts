import * as THREE from 'three';
import { GameLoop } from '../game/GameLoop';
import { Renderer2D } from '../rendering/Renderer2D';
import { InputManager, prettyKey, type ActionName } from '../input/InputManager';
import { StudioMusic } from './StudioMusic';
import { meleeAttack, type CombatTarget } from '../combat/CombatSystem';
import { ProjectileManager } from '../combat/Projectiles';
import { StudentSprite, chairTexture, cupTexture, toolIcon, craftingTableTexture } from './StudioArt';
import { CRAFT_COST, invent, inventionStats, type Invention } from './Inventions';
import { CHARMS, CLASS_SECONDS, SAVE_KEY, STUDIO_NAMES, WEAPONS, buyCharm, buyUpgrade, classCost, completeClass, completeStudio, maxStamina, newStudent, rest, sanitizeSave, unlockedStudio, upgradeCost, xpNeeded, type Charm, type Place, type StudioSave, type Upgrade, type Weapon } from './StudioState';
import { STUDIO_GROUND, CLASSROOM_PLATFORMS, standingOn, hitImpulse, resetMotion, separateBodies, stepMotion } from './CombatMotion';
import { CombatEffects } from './CombatEffects';
import { SceneTransition } from './SceneTransition';
import { ClassroomArena } from './ClassroomArena';
import { TeacherBrain, type TeacherMove } from './TeacherBrain';
import { TeachingMotion } from './TeachingMotion';
import { TEACHERS, teacherById, type Teacher } from './Teachers';
import { HAIR_STYLES, HAIR_COLOURS, SKIN_COLOURS, EYE_STYLES, EYE_COLOURS, OUTFITS, OUTFIT_COLOURS, ACCESSORIES, sanitizeAppearance, defaultAppearance, starterLook, type CharacterAppearance } from './CharacterAppearance';
import { dressingRoom, type WardrobeTab, type PreviewPose } from './DressingRoom';
import './studio.css';
import './dressing-room.css';

const FLOOR = STUDIO_GROUND;
const MENU_BINDINGS: Partial<Record<ActionName,string>> = {moveLeft:'Move left',moveRight:'Move right',jump:'Jump',attack:'Attack',interact:'Interact / grab / throw',skill1:'Uppercut',skill2:'Jump kick',skill3:'Dodge',stats:'Drop through platform'};
const roomAsset = (file:string) => new URL(`studio100/${file}`,document.baseURI).href;
type Modal = 'map' | 'class' | 'instructor' | 'shop' | 'clerk' | 'mystery' | 'skills' | 'tools' | 'home' | 'pause' | 'passed' | 'faculty' | 'exhibition' | 'exhibition-won' | 'character' | null;
const PLACES: Record<Place, { title: string; subtitle: string }> = {
  lobby: { title: 'Campus', subtitle: 'THE FORECOURT · BUILDING 100' },
  foyer: { title: 'Building 100', subtitle: 'BUILDING 100 · GROUND FLOOR FOYER' },
  mystery: { title: 'The Other Cupboard', subtitle: 'MYSTERY SHOP' },
  studio: { title: 'The First Brief', subtitle: 'GROUND FLOOR · STUDIO 01' },
  home: { title: 'Your apartment', subtitle: 'STUDENT ACCOMMODATION · YOUR ROOM' },
  skills: { title: 'The Student Lab', subtitle: 'B1 · CHARACTER UPGRADES' },
  tools: { title: 'The Model Workshop', subtitle: 'B2 · TOOL UPGRADES' },
};
const LESSONS = ['Every idea starts with looking.', 'Start small. Draw what you notice.', 'A model is a question you can hold.', 'Try another angle. Then another.', 'Good spaces leave room for people.', 'A little revision goes a long way.', 'Your first idea has found its feet.'];

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
  private inventionDraft: Invention | null = null;
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
  private pendingAttack: { weapon: Weapon; damage: number; facing: number; remaining: number; finisher: boolean } | null = null;
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
  private icons: Record<Weapon, string> = { pen: toolIcon('pen'), ruler: toolIcon('ruler'), cup: toolIcon('cup') };

  constructor(container: HTMLElement) {
    let saved: unknown;
    try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null'); } catch { saved = null; }
    this.state = saved ? sanitizeSave(saved) : newStudent();
    this.characterDraft={...this.state.appearance};this.studentArt.setAppearance(this.state.appearance);
    if (new URLSearchParams(location.search).get('scene') === 'lobby') this.state.place = 'lobby';
    document.title = 'Fight Your Way to Heaven — A Melbourne student adventure';
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
    const lobby = new THREE.TextureLoader().load(roomAsset('campus-panorama.png'), () => {
      lobby.colorSpace = THREE.SRGBColorSpace;
      if (this.state.place === 'lobby') { this.background.material.map = lobby; this.background.material.needsUpdate = true; }
    }, undefined, () => this.toast('The lobby illustration could not load. Building navigation still works.'));
    lobby.colorSpace = THREE.SRGBColorSpace; this.backgrounds.set('lobby', lobby);
    const shopInterior = new THREE.TextureLoader().load(roomAsset('mystery-interior.png'), () => {
      shopInterior.colorSpace = THREE.SRGBColorSpace;
      if (this.state.place === 'mystery') { this.background.material.map = shopInterior; this.background.material.needsUpdate = true; }
    }); shopInterior.colorSpace = THREE.SRGBColorSpace; this.backgrounds.set('mystery', shopInterior);
    for (const [place,file] of [['foyer','foyer-interior.png'],['home','apartment-interior.png'],['skills','student-lab.png'],['tools','model-workshop.png']] as const) {
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
    this.warning = this.plane(4, .18, new THREE.MeshBasicMaterial({ color: '#b64f3a', transparent: true, opacity: .7, depthWrite: false }), 16, FLOOR, 1);
    this.warning.visible = false;
    this.projectiles = new ProjectileManager(this.renderer.scene, cupTexture());
    this.enemyProjectiles = new ProjectileManager(this.renderer.scene, cupTexture());
    this.effects = new CombatEffects(this.renderer.scene);
    this.arena = new ClassroomArena(this.renderer.scene);
    this.hero.onHit = (damage, direction) => this.hurt(damage, direction);
    this.boss.onHit = (damage, direction) => this.hitInstructor(damage, direction);
    this.input = new InputManager(this.renderer.domElement);
    this.input.setBinding('skill3',0,'ShiftLeft');this.input.setBinding('skill3',1,'ShiftRight');this.input.setBinding('stats',0,'KeyS');this.input.setBinding('stats',1,'ArrowDown');
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
    this.ui.addEventListener('input',event=>{const target=event.target as HTMLInputElement;if(target.id==='music-volume'){this.music.volume=Number(target.value)/100;this.saveSettings();}});
    window.addEventListener('keydown', event => {
      if (event.repeat) return;
      if (this.transition.active) return;
      if (this.modal) { if (event.key === 'Tab') this.trapFocus(event);
        if(this.modal==='character'&&(event.target as HTMLElement)?.getAttribute('role')==='tab'&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const tabs:WardrobeTab[]=['hair','face','outfit','extras'];const index=tabs.indexOf(this.wardrobeTab);const next=event.key==='Home'?0:event.key==='End'?3:(index+(event.key==='ArrowRight'?1:3))%4;this.wardrobeTab=tabs[next];this.open('character');this.el('wardrobe-tab-'+this.wardrobeTab).focus();}return; }
      if (!this.classElapsed && this.sleepElapsed === null && ['Digit1', 'Digit2', 'Digit3'].includes(event.code)) this.equip((['pen', 'ruler', 'cup'] as Weapon[])[Number(event.code.slice(-1)) - 1]);
      if (event.code === 'KeyM' && !this.fight && this.classElapsed === null && this.sleepElapsed === null) this.action('map');
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
    const a = this.renderer.aspect, w = Math.min(32, 18 * a), h = w / a;
    const bottom = Math.max(0, Math.min(18-h, FLOOR-h*.2));
    this.camera.left = 16-w/2; this.camera.right = 16+w/2;
    this.camera.bottom = bottom; this.camera.top = bottom+h; this.camera.updateProjectionMatrix();
    this.followCamera(1,true);
  }
  private shell(): string {
    return `<header class="studio-top"><div class="studio-brand"><strong>FIGHT YOUR WAY<br><em>TO HEAVEN</em></strong><div class="eyebrow">A Melbourne student adventure</div></div>
      <div class="student-stats"><div class="stats-line"><b id="s-level"></b><span id="s-stamina"></span></div><div class="stamina-track" role="meter" aria-label="Stamina" id="s-meter"><i id="s-fill"></i></div></div>
      <div class="studio-location"><span class="eyebrow" id="s-location-code"></span><strong id="s-location"></strong></div>
      <div class="studio-meta"><span class="day" id="s-day"></span><span class="coin" id="s-coins"></span><button data-action="travel:lobby" id="s-lobby-button" aria-label="Go to lobby">Lobby</button><button data-action="map" id="s-map-button" aria-label="Open building map">Building ↗</button><button data-action="pause" aria-label="Open game menu">Menu</button></div></header>
      <div class="studio-nameplate context-hint" id="s-context-hint"></div>
      <div class="studio-nameplate crafting-label" id="s-crafting-label">Crafting table</div>
      <div class="studio-nameplate" id="s-chair-label">Your desk<small>Study · +1 Knowledge</small></div><div class="studio-nameplate character-name" id="s-boss-label"></div>
      <div class="studio-nameplate mystery-nameplate" id="s-mystery-label">The Other Cupboard</div><div class="studio-nameplate" id="s-building-label">BUILDING 100</div>
      <div class="studio-nameplate character-name" id="s-clerk-label">Mika</div>
      <div class="studio-nameplate" id="s-exit-label">E · exit</div>
      <div class="studio-nameplate accommodation-sign" id="s-accommodation-sign">STUDENT ACCOMMODATION</div>
      <div class="studio-nameplate wayfinding-sign" id="s-wayfinding">ACCOMMODATION →</div>
      <nav class="lobby-errands" id="s-lobby-errands" aria-label="Campus collection"><button data-action="faculty">Professor archive ↗</button><span>Accommodation →</span></nav>
      <div class="lobby-sparkles" id="s-lobby-sparkles" aria-hidden="true"><i>✧</i><i>·</i><i>✦</i><i>·</i></div>
      <div class="studio-boss" id="s-boss" hidden><strong id="s-boss-title"></strong><div class="stamina-track"><i id="s-boss-fill"></i></div><p id="s-boss-tip"></p></div>
      <div class="studio-toast" role="status" aria-live="polite" id="s-toast"></div>
      <div class="class-overlay" id="s-class" hidden><span class="eyebrow" id="s-class-code">CLASS IN SESSION</span><h3 id="s-class-title">A little wiser, every day.</h3><p id="s-class-quote"></p><div class="stamina-track"><i id="s-class-fill"></i></div><p id="s-class-progress"></p></div>
      <footer class="studio-dock"><div class="weapon-dock" role="group" aria-label="Equip a weapon">${(['pen', 'ruler', 'cup'] as Weapon[]).map((w, i) => `<button class="weapon-button" data-action="weapon:${w}" id="weapon-${w}" aria-label="Equip ${WEAPONS[w].name}"><kbd>${i + 1}</kbd><img src="${this.icons[w]}" alt=""><strong>${WEAPONS[w].name}</strong><small>${WEAPONS[w].description}</small></button>`).join('')}</div>
      <div class="move-dock" id="s-move-dock" hidden><button data-action="move:uppercut" id="move-uppercut" title="K · Uppercut"><kbd>K</kbd>↥</button><button data-action="move:kick" id="move-kick" title="L · Jump kick"><kbd>L</kbd>↗</button><button data-action="move:dodge" id="move-dodge" title="Shift · Dodge"><kbd>⇧</kbd>»</button><button data-action="interact" id="move-grab" title="E · Pick up / throw"><kbd>E</kbd>↔</button></div>
      <div class="studio-interaction"><button class="interact-button" id="s-interact" data-action="interact"><kbd class="key">E</kbd><span id="s-interact-text"></span></button><div class="studio-controls" id="s-controls">A D / ← → move &nbsp; W jump &nbsp; Space / click attack &nbsp; E interact &nbsp; M building</div></div>
      </footer><nav class="touch-controls" aria-label="Touch game controls"><div class="touch-movement"><button data-touch="left" aria-label="Move left">◀</button><button data-touch="right" aria-label="Move right">▶</button><button data-touch="drop" aria-label="Drop through platform">↓</button></div><div class="touch-actions"><button data-touch="interact" id="touch-interact" aria-label="Interact or grab and throw">Talk</button><button data-touch="jump" aria-label="Jump">Jump</button><button data-touch="attack" id="touch-attack" aria-label="Attack">Hit</button></div></nav><aside class="journey-dock"><span class="eyebrow">Your semester</span><b id="s-journey"></b><span id="s-xp" style="font-size:10px"></span><div class="xp-track"><i id="s-xp-fill"></i></div><small id="s-knowledge"></small></aside>
      <div id="s-modal-root"></div><div class="scene-transition" id="s-transition" hidden role="status" aria-live="polite"><div class="transition-panel"><span class="eyebrow" id="s-transition-kind"></span><span class="transition-symbol" aria-hidden="true">◇</span><h2 id="s-transition-title"></h2><p>One step closer.</p></div></div>`;
  }
  private el(id: string): HTMLElement { return this.ui.querySelector<HTMLElement>(`#${id}`)!; }
  private label(id: string, value: string): void { const el = this.el(id); if (el.textContent !== value) el.textContent = value; }
  private persist(): void {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); this.saveFailed = false; }
    catch { if (!this.saveFailed) { this.saveFailed = true; this.toast('Storage is unavailable. Keep this tab open to retain your progress.', 8); } }
  }
  private toast(message: string, seconds = 4): void { if (!this.ui) return; this.label('s-toast', message); this.toastUntil = this.time + seconds; }
  private equip(weapon: Weapon): void {
    if (this.transition.active || this.classElapsed !== null || this.sleepElapsed !== null) return;
    this.state.weapon = weapon; this.persist(); this.refresh();
  }
  private changePlace(place: Place, save = true): void {
    this.resetBrawler();this.arena.setVisible(place==='studio');
    this.exhibitionFight = false;
    this.fight = false; this.projectiles.clear(); this.enemyProjectiles.clear(); this.warning.visible = false; this.invulnerable = 0;
    this.effects.clear(); resetMotion(this.hero); resetMotion(this.boss); this.pendingAttack = null; this.hitStop = 0; this.attackBuffer = 0; this.chainWindow = 0; this.penChain = 0; this.cameraShake = 0;
    this.camera.position.set(0, 0, 20); this.heroFlash = 0; this.bossFlash = 0;
    this.state.place = place; this.hero.x = place === 'studio' ? 12.3 : 14; this.hero.y = FLOOR; this.hero.hp = this.state.stamina;
    this.instructorArt.setTeacher(this.currentTeacher());
    this.boss.x = 24; this.boss.y = FLOOR; this.boss.hp = 160;
    this.teaching.reset(this.currentTeacher().id); this.teachingFacing = -1; this.teachingGesture = 0;
    this.background.material.map = this.backgrounds.get(place)!; this.background.material.color.set('#ffffff'); this.background.material.needsUpdate = true;
    this.background.scale.set(place==='lobby'?2:1,1,1); this.background.position.x=place==='lobby'?32:16;
    this.chair.visible = place === 'studio'; this.bossMesh.visible = place === 'studio'; this.bossShadow.visible = place === 'studio';
    this.craftingTable.visible = place === 'tools' || place === 'skills';
    this.clerkMesh.visible = place === 'mystery'; this.clerkShadow.visible = place === 'mystery';
    if (place === 'mystery') this.hero.x = 8;
    if (place === 'skills' || place === 'tools') this.hero.x = 19;
    this.cameraBase = 0;
    this.close(); this.positionActors(); if (save) this.persist(); this.refresh();
  }
  private travel(place: Place, studio?: number, after: Modal = null): void {
    if (this.transition.active || this.fight || this.classElapsed !== null || this.sleepElapsed !== null) return;
    const from = this.state.place;
    const indoor = ['studio', 'foyer', 'skills', 'tools'];
    const lift = indoor.includes(from) && indoor.includes(place);
    const title = place === 'studio' ? `Studio ${studio ?? this.state.studio} · ${STUDIO_NAMES[(studio ?? this.state.studio) - 1]}` : place === 'foyer' ? 'Entering Building 100' : place === 'mystery' ? 'The Other Cupboard' : place === 'home' ? 'Your apartment' : place === 'skills' ? 'B1 · Student Lab' : place === 'tools' ? 'B2 · Model Workshop' : place === 'lobby' ? 'Back to the forecourt' : 'Everyday supplies';
    this.close(); this.input.releaseKeys();
    const el = this.el('s-transition'); el.hidden = false; el.classList.toggle('lift-transition', lift); el.style.opacity = '0';
    this.label('s-transition-kind', lift ? 'TAKING THE LIFT' : 'THROUGH THE DOOR'); this.label('s-transition-title', title);
    this.ui.setAttribute('aria-busy', 'true');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.transition.start(() => {
      if (studio !== undefined) this.state.studio = studio;
      this.changePlace(place, false);
      if (place === 'lobby') this.hero.x = from === 'home' ? 54 : from === 'mystery' ? 8 : 28;
      this.followCamera(1, true); this.positionActors(); this.persist();
    }, () => { el.hidden = true; this.ui.setAttribute('aria-busy', 'false'); this.input.releaseKeys(); this.refresh(); if (after) this.open(after); }, reduced ? .22 : lift ? 1.1 : .85);
    this.refresh();
  }
  private followCamera(dt: number, snap = false): void {
    const half = (this.camera.right - this.camera.left) / 2;
    const worldWidth=this.state.place==='lobby'?64:32;
    const desired = half<worldWidth/2 ? Math.max(half-16,Math.min(worldWidth-16-half,this.hero.x-16)) : 0;
    this.cameraBase = snap ? desired : this.cameraBase + (desired - this.cameraBase) * (1 - Math.exp(-6 * dt));
    this.camera.position.x = this.cameraBase;
  }
  private near(): 'chair' | 'instructor' | 'exit' | 'shop' | 'mystery' | 'clerk' | 'shopfloor' | 'building' | 'lobby' | 'home' | 'skills' | 'tools' | 'map' | 'workshopfloor' {
    if (this.state.place === 'lobby') { if (Math.abs(this.hero.x-8)<3) return 'mystery'; if (Math.abs(this.hero.x - 54) < 3) return 'home'; if (Math.abs(this.hero.x-28)<3) return 'building'; return 'lobby'; }
    if (this.state.place === 'mystery') { if (this.hero.x < 5.5) return 'exit'; if (Math.abs(this.hero.x - 24) < 3.5) return 'clerk'; return 'shopfloor'; }
    if (this.state.place === 'foyer') return this.hero.x < 5 ? 'exit' : 'map';
    if (this.state.place === 'home') return this.hero.x < 4 ? 'exit' : 'home';
    if (this.state.place === 'skills' || this.state.place === 'tools') return this.hero.x<5 ? 'map' : Math.abs(this.hero.x-22)<5 ? this.state.place : 'workshopfloor';
    if (this.state.place === 'studio') {
      const teacherDistance=Math.abs(this.hero.x-this.boss.x),chairDistance=Math.abs(this.hero.x-10);
      if(teacherDistance<3 && Math.abs(this.hero.y-this.boss.y)<2.5 && teacherDistance<chairDistance)return 'instructor';
      if(chairDistance<3)return 'chair';
      return this.hero.x<5?'exit':'map';
    }
    return this.state.place;
  }
  private action(action: string): void {
    if (this.transition.active) return;
    if(this.modal==='pause') {
      if(action==='save-game'){this.persist();this.toast(this.saveFailed?'Saving is unavailable in this browser.':'Game saved on this browser.');return;}
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
    if (action.startsWith('weapon:')) { this.equip(action.split(':')[1] as Weapon); return; }
    if (this.classElapsed !== null || this.sleepElapsed !== null) return;
    if (action === 'retreat') { this.changePlace('home'); this.toast('A breather. Your Knowledge and upgrades are safe.'); return; }
    if(action.startsWith('move:') && !this.modal){const kind=action.split(':')[1];if(kind==='uppercut'||kind==='kick'||kind==='dodge')this.physicalMove(kind);return;}
    if (this.fight && action !== 'interact') return;
    if(action==='character') {this.characterDraft={...this.state.appearance};this.open('character');return;}
    if (action === 'interact') {
      if (this.fight) { this.grabOrThrow(); return; }
      const near = this.near();
      if (near === 'exit') { this.travel('lobby'); return; }
      if (near === 'home' && this.state.place !== 'home') { this.travel('home', undefined, 'home'); return; }
      if (near === 'mystery') { this.travel('mystery'); return; }
      if (near === 'building') { this.travel('foyer', undefined, 'map'); return; }
      if (near === 'lobby') { this.toast(this.hero.x > 30 ? 'Your apartment is ahead. Look for the Student Accommodation sign.' : 'Shop to the left. Building 100 to the right. Keep walking right for your apartment.'); return; }
      if (near === 'shopfloor') { this.toast('Mika is by the counter on the right. Walk over and press E to chat.'); return; }
      if (near === 'workshopfloor') { this.toast('The crafting table is on the right. Walk over to upgrade or invent.'); return; }
      this.open(near === 'chair' ? 'class' : near === 'instructor' ? 'instructor' : near); return;
    }
    if (action === 'map') { if (['lobby', 'mystery', 'home'].includes(this.state.place)) this.travel('foyer', undefined, 'map'); else this.open('map'); return; }
    if (action === 'faculty') { this.open('faculty'); return; }
    if (action.startsWith('professor:')) {
      const id = action.slice(10);
      if (!this.state.cleared.every(Boolean) || !TEACHERS.some(t=>t.id===id)) return;
      this.selectedProfessor = id;
      if(this.state.place==='studio' && this.state.studio===9) { this.instructorArt.setTeacher(this.currentTeacher()); this.open('exhibition'); this.refresh(); }
      else this.travel('studio',9,'exhibition');
      return;
    }
    if (action === 'exhibition-fight') { this.startFight(true); return; }
    if (action.startsWith('travel:')) { const place = action.split(':')[1] as Place; if (!(place in PLACES)) return; this.travel(place); return; }
    if (action.startsWith('floor:')) {
      const studio = Number(action.split(':')[1]); if (studio < 1 || studio > unlockedStudio(this.state)) return;
      this.selectedProfessor = null;
      this.instructorArt.setTeacher(teacherById(this.state.teacherAssignments[studio-1]));
      if (this.state.place === 'studio' && this.state.studio === studio) this.close(); else this.travel('studio', studio); return;
    }
    if (action === 'class') {
      if (this.state.place !== 'studio' || this.state.cleared[this.state.studio - 1] || this.state.stamina < classCost(this.state)) return;
      this.close(); resetMotion(this.hero); this.hero.x = 10; this.classElapsed = 0; this.refresh(); return;
    }
    if (action === 'fight') { this.startFight(); return; }
    if (action === 'sleep') { if (this.state.place !== 'home') return; this.close(); this.sleepElapsed = 0; this.refresh(); return; }
    if (action.startsWith('charm:')) {
      const charm = action.split(':')[1] as Charm;
      if (this.state.place !== 'mystery' || this.modal !== 'mystery' || this.near() !== 'clerk') return;
      if (buyCharm(this.state, charm)) { this.hero.hp = this.state.stamina; this.persist(); this.toast(`${CHARMS[charm].name} is yours. Its effect is permanent.`); }
      this.open('mystery'); this.refresh(); return;
    }
    if (action === 'browse-charms') { if (this.state.place === 'mystery' && this.near() === 'clerk' && this.modal === 'clerk') this.open('mystery'); return; }
    if (action === 'browse-supplies') { if(this.state.place==='mystery' && this.near()==='clerk') this.open('shop'); return; }
    if (action === 'invent-preview' && this.modal === 'tools' && this.near() === 'tools') {
      const words = (this.el('invention-words') as HTMLInputElement).value;
      this.inventionDraft = invent(words);
      this.open('tools');
      if (!this.inventionDraft) this.el('invention-feedback').textContent = 'Include pen, ruler or cup. Try “a light pen” or “a heavy cup”.';
      return;
    }
    if (action === 'invent-craft' && this.modal === 'tools' && this.near() === 'tools' && this.inventionDraft) {
      const item = this.inventionDraft;
      if (this.state.coins < CRAFT_COST || this.state.inventions[item.weapon]?.finish === item.finish) return;
      this.state.coins -= CRAFT_COST; this.state.inventions[item.weapon] = {...item}; this.state.weapon = item.weapon;
      this.persist(); this.open('tools'); this.refresh(); this.toast(`${item.name} crafted and equipped.`); return;
    }
    if (action.startsWith('buy:')) {
      const kind = action.split(':')[1] as Upgrade;
      const allowed = this.state.place === 'skills' && this.near()==='skills' ? ['endurance', 'efficiency'] : this.state.place === 'tools' && this.near()==='tools' ? ['tool'] : this.state.place === 'mystery' && this.near()==='clerk' && this.modal==='shop' ? ['shoes', 'snack'] : [];
      if (!allowed.includes(kind)) return;
      if (buyUpgrade(this.state, kind)) { this.hero.hp = this.state.stamina; this.persist(); this.toast(kind === 'snack' ? 'Lunch break. +35 stamina.' : 'A little better equipped for what comes next.'); }
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
    if (this.classElapsed !== null || this.sleepElapsed !== null) { if (modal !== 'pause') return; }
    const preserveCreator=modal==='character'&&this.modal==='character';
    const creatorPanel=this.ui.querySelector('.wardrobe-content');
    const creatorScroll=preserveCreator&&creatorPanel?.getAttribute('aria-labelledby')==='wardrobe-tab-'+this.wardrobeTab?creatorPanel.scrollTop:0;
    const creatorFocus=preserveCreator?(document.activeElement as HTMLElement)?.dataset.action:undefined;
    if (!this.modal) this.previousFocus = document.activeElement as HTMLElement;
    this.modal = modal; this.input.clearQueues();
    this.touchPointers.clear();this.touchActions.clear();
    const s = this.state, i = s.studio - 1, cost = classCost(s), cleared = s.cleared[i], teacher = this.currentTeacher();
    let title = '', eyebrow = '', body = '';
    if (modal === 'character') {
      eyebrow='CHARACTER CREATION';title='Dressing room';
      body=dressingRoom(this.characterDraft,this.wardrobeTab,s.characterCreated,s.level,this.previewPose,look=>this.characterThumbnail(look));
    } else if (modal === 'faculty') {
      eyebrow = 'THE PROFESSOR ARCHIVE · 33 CHARACTERS'; title = 'Meet your studio teachers.';
      const unlocked = s.cleared.every(Boolean);
      body = `<p>${unlocked ? 'Semester complete. Choose any professor for a friendly exhibition duel in Studio 9.' : 'Patrick starts your journey in Studio 1. Eight other teachers are assigned once for your semester. Complete Studio 9 through Knowledge or combat to unlock exhibition duels with everyone.'}</p><p class="faculty-note">Playful character interpretations of your reference sheets. Dialogue and duels are fictional.</p><div class="faculty-grid">${TEACHERS.map(t=>{
        const floor=s.teacherAssignments.indexOf(t.id), won=s.professorWins.includes(t.id);
        return `<article class="faculty-card"><img src="${this.portrait(t)}" alt="${t.name} game character"><div><span class="eyebrow">${floor>=0?'STUDIO '+(floor+1):'GUEST TEACHER'}</span><h3>${t.name}</h3><p>${t.project}</p><small>${WEAPONS[t.tool].name} · ${t.tool==='cup'?'ranged annotations':t.tool==='ruler'?'wide ruler sweep':'quick pen marks'}</small><button data-action="professor:${t.id}" ${unlocked?'':'disabled'}>${unlocked ? won?'✓ Defeated · rematch':'Choose professor →':'Unlock after Studio 9'}</button></div></article>`;
      }).join('')}</div>`;
    } else if (modal === 'exhibition' || modal === 'exhibition-won') {
      eyebrow = 'STUDIO 9 · EXHIBITION DUEL'; title = modal==='exhibition-won' ? 'A critique to remember.' : `Challenge ${teacher.name}?`;
      body = `<div class="teacher-intro"><img src="${this.portrait(teacher)}" alt="${teacher.name}"><div><h3>${teacher.name}</h3><p>${teacher.project}</p><p>${modal==='exhibition-won'?'Victory recorded in your professor archive. Your completed semester stays complete.':`A friendly final challenge with exaggerated ${WEAPONS[teacher.tool].name.toLowerCase()} attacks. Your Knowledge and completed studios stay safe if you lose.`}</p></div></div><div class="choice">${modal==='exhibition' ? `<p>${s.stamina}/${maxStamina(s)} stamina · Exhibition wins award collection badges, not extra coins or XP.</p><button class="rust" data-action="exhibition-fight" ${s.stamina<=0?'disabled':''}>Start exhibition duel →</button>${s.stamina<=0?'<button data-action="travel:home">Rest at home first →</button>':''}`:''}<button class="primary" data-action="faculty">Choose another professor →</button></div>`;
    } else if (modal === 'map') {
      title = 'Your way through 100.'; eyebrow = 'BUILDING DIRECTORY';
      body = `<p>Nine studios. Two ways to pass each one. Choose a studio or visit an upgrade workshop below.</p><div class="floor-list">${STUDIO_NAMES.map((name, index) => {
        const n = index + 1, open = n <= unlockedStudio(s);
        return `<button class="floor-row ${n === s.studio && s.place === 'studio' ? 'current' : ''}" data-action="floor:${n}" ${open ? '' : 'disabled'}><span><span class="floor-code">${index === 0 ? 'G' : 'L' + index}</span><strong>Studio ${n} · ${name}</strong></span><small>${s.cleared[index] ? '✓ ' + (s.cleared[index] === 'study' ? 'Knowledge' : 'Instructor') : open ? s.knowledge[index] + '/7 Knowledge →' : 'Locked'}</small></button>`;
      }).reverse().join('')}<div class="workshop-heading">✦ UPGRADE WORKSHOPS · OPEN TO ALL STUDENTS</div><button class="floor-row upgrade-row" data-action="travel:skills"><span><span class="floor-code">B1</span><strong>Student Lab</strong></span><small>✦ Character upgrades →</small></button><button class="floor-row upgrade-row" data-action="travel:tools"><span><span class="floor-code">B2</span><strong>Model Workshop</strong></span><small>✦ Tool upgrades →</small></button></div>`;
    } else if (modal === 'clerk') {
      eyebrow = 'MIKA · ARCHITECTURE STUDENT / PART-TIME CLERK'; title = 'Oh, hey. Long studio day?';
      body = `<p>“I’m Mika. I study across the courtyard, and work here between classes. The shelves rearrange themselves sometimes. You get used to it.”</p><div class="choice"><h3>A few things for the semester.</h3><p>“These little curios might help with your stamina, tools or the occasional instructor challenge. Have a look?”</p><button class="mystery-buy" data-action="browse-charms">Browse Mika’s curios →</button></div><p>All purchases use the coins you earn in the game.</p>`;
    } else if (modal === 'mystery') {
      eyebrow = 'THE OTHER CUPBOARD · FORECOURT'; title = 'Some things aren’t on the syllabus.';
      body = `<p>“Ah. An architecture student. I thought you might find us.”</p><p>Unusual objects, useful little effects. Every charm is a permanent, one-time purchase with your game coins. You have <strong>${s.coins} coins</strong>.</p><div class="charm-grid">${(Object.keys(CHARMS) as Charm[]).map(key => {
        const item = CHARMS[key], owned = s.charms[key];
        return `<div class="choice charm-choice"><span class="charm-symbol">${item.symbol}</span><h3>${item.name}</h3><p>${item.description}</p><button class="mystery-buy" data-action="charm:${key}" ${owned || s.coins < item.price ? 'disabled' : ''}>${owned ? '✓ Already yours' : `Take it with you · ${item.price} coins`}</button></div>`;
      }).join('')}</div><p class="mystery-note">No new abilities to learn. Their effects work quietly in the background.</p>`;
    } else if (modal === 'class') {
      eyebrow = `STUDIO ${s.studio} · KNOWLEDGE ${s.knowledge[i]}/7`; title = cleared ? 'You passed this studio.' : 'Take a seat. Take it in.';
      body = cleared ? `<p>You have already earned your way upstairs. Your completed studio is saved.</p><div class="choice"><button class="primary" data-action="map">Choose your next floor →</button></div>` : `<p>A quiet route through the semester. Sit through a short class, gain Knowledge, and head home whenever you need rest.</p><div class="choice"><h3>One class, one new idea.</h3><p>${CLASS_SECONDS} seconds · +1 Knowledge · +15 XP · +10 coins</p><p class="detail">Costs ${cost} stamina · You have ${s.stamina}/${maxStamina(s)}</p><button class="primary" data-action="class" ${s.stamina < cost ? 'disabled' : ''}>Sit for class · ${cost} stamina</button>${s.stamina < cost ? '<p>You need a little rest first.</p><button data-action="travel:home">Head home →</button>' : ''}</div><p>Reach 7 Knowledge to pass. Higher character levels make classes less tiring. Leaving mid-class grants no Knowledge and uses no stamina.</p>`;
    } else if (modal === 'instructor') {
      eyebrow = `STUDIO ${s.studio} · ${teacher.name.toUpperCase()}`; title = cleared ? 'A well-earned next step.' : 'Feeling confident?';
      body = `<div class="teacher-intro"><img src="${this.portrait(teacher)}" alt="${teacher.name}"><div><h3>${teacher.name}</h3><p>${teacher.project}</p></div></div>` + (cleared ? `<p>“You have earned your place upstairs. Keep going.”</p><div class="choice"><button class="primary" data-action="${s.studio===9?'faculty':'map'}">${s.studio===9?'Choose an exhibition professor →':'Open the building directory →'}</button></div>` : `<p>“Seven Knowledge will get you through my studio. Or you can challenge my oversized ${WEAPONS[teacher.tool].name.toLowerCase()}.”</p><div class="choice"><h3>Challenge the instructor</h3><p>Win to pass immediately. Jump onto desks and hanging lights; S drops through. E grabs or throws loose cups and rulers. K uppercuts, L jump-kicks and Shift dodges. Space or click attacks with your equipped ${WEAPONS[s.weapon].name.toLowerCase()}.</p><p class="detail">${s.stamina}/${maxStamina(s)} stamina</p><button class="rust" data-action="fight" ${s.stamina<=0?'disabled':''}>Challenge ${teacher.name} →</button></div><p>Your Knowledge stays safe if you lose. You can always return to class.</p>${s.stamina<=0?'<button data-action="travel:home">Rest at home first →</button>':''}`);
    } else if (modal === 'home') {
      eyebrow = 'YOUR ROOM'; title = 'Tomorrow is another idea.';
      body = `<p>Your own little apartment, right next to Building 100. Leave your drawing tube by the door. Put the kettle on.</p><div class="choice"><h3>A good night’s sleep</h3><p>Restore all stamina. Keep every bit of Knowledge, equipment and progress.</p><button class="primary" data-action="sleep">Sleep & restore · Day ${s.day + 1} →</button></div><button data-action="travel:lobby">Step outside to campus ←</button>`;
    } else if (modal === 'skills' || modal === 'tools' || modal === 'shop') {
      const kinds: Upgrade[] = modal === 'skills' ? ['endurance', 'efficiency'] : modal === 'tools' ? ['tool'] : ['shoes', 'snack'];
      eyebrow = modal === 'skills' ? 'B1 · STUDENT LAB' : modal === 'tools' ? 'B2 · MODEL WORKSHOP' : 'MIKA · EVERYDAY SUPPLIES';
      title = modal === 'skills' ? 'Grow into your own.' : modal === 'tools' ? 'Every tool has potential.' : 'A little campus essential.';
      const descriptions: Record<Upgrade, [string, string]> = { endurance: ['Build endurance', '+20 maximum stamina. A permanent upgrade.'], efficiency: ['Study smarter', 'Every class costs 3 less stamina, down to a minimum of 10.'], tool: [`Upgrade your ${WEAPONS[s.weapon].name.toLowerCase()}`, '+4 basic attack damage with this tool.'], shoes: ['Comfy sneakers', 'Move 15% faster. Yours for the whole semester.'], snack: ['A proper lunch', 'Restore 35 stamina. Sleep at home restores it all for free.'] };
      body = `<p>You have <strong>${s.coins} coins</strong>. Earn coins from classes and completing studios.</p>${kinds.map(kind => {
        const rank = kind === 'tool' ? s.toolRanks[s.weapon] : kind === 'shoes' ? Number(s.shoes) : kind === 'snack' ? 0 : s[kind];
        const capped = kind === 'shoes' ? s.shoes : kind === 'snack' ? s.stamina >= maxStamina(s) : rank >= 5;
        const price = upgradeCost(s, kind);
        return `<div class="choice"><h3>${descriptions[kind][0]}</h3><p>${descriptions[kind][1]}</p><p class="detail">${kind === 'snack' ? s.stamina + '/' + maxStamina(s) + ' stamina' : kind === 'shoes' ? s.shoes ? 'Already owned' : 'Permanent clothing upgrade' : 'Rank ' + rank + '/5'}</p><button data-action="buy:${kind}" ${capped || s.coins < price ? 'disabled' : ''}>${capped ? kind === 'snack' ? 'Already rested' : 'Fully upgraded' : `Buy · ${price} coins`}</button></div>`;
      }).join('')}${modal === 'tools' ? '<p>Equip a different tool before entering the workshop to upgrade it.</p>' : ''}`;
    } else if (modal === 'passed') {
      const last = s.studio === 9; eyebrow = last ? 'SEMESTER COMPLETE' : `STUDIO ${s.studio} COMPLETE`; title = last ? 'You found your own way.' : 'A little higher. A little wiser.';
      body = `<p>${last ? 'Nine studios later, your work joins the final exhibition. You arrived with a sketchbook. You leave with a story of your own.' : `You passed ${STUDIO_NAMES[i]} through ${cleared === 'study' ? 'Knowledge' : 'an instructor victory'}. The next studio is now open.`}</p><div class="choice"><h3>${last ? 'Welcome to the exhibition.' : `Studio ${s.studio + 1} is waiting.`}</h3><p>+${70 + s.studio * 10} coins · +${65 + s.studio * 5} XP · Progress saved</p><button class="primary" data-action="${last ? 'faculty' : 'floor:' + (s.studio + 1)}">${last ? 'Choose an exhibition professor →' : 'Head upstairs →'}</button></div><p>Your Knowledge, tools and upgrades come with you.</p>`;
    } else {
      eyebrow = 'FIGHT YOUR WAY TO HEAVEN'; title = 'Game menu';
      body = `<p>Move with A/D or the arrow keys. W jumps; S drops through classroom furniture. Space or clicking the scene attacks. In fights, E grabs/throws, K uppercuts, L jump-kicks and Shift dodges. Outside fights, E interacts. 1, 2, 3 switch tools; M opens the building.</p><div class="choice"><button class="primary" data-action="close">Resume →</button>${this.fight ? '<button data-action="retreat">Leave fight & go home</button>' : this.classElapsed === null && this.sleepElapsed === null ? '<button data-action="map">Building directory</button>' : ''}</div><p>${this.saveFailed ? 'Saving is unavailable in this browser.' : 'Your completed progress is saved automatically.'} Classes and sleeping pause with the game.</p><footer><a href="?mode=farm">Open the original farming game ↗</a></footer>`;
    }
    if(modal==='map') body = `<button class="archive-link" data-action="faculty">Professor archive · ${s.professorWins.length}/33 exhibition wins ↗</button>`+body;
    if(modal==='pause') body=`<div class="menu-actions"><button class="primary" data-action="close">Resume →</button><button data-action="save-game">Save game</button><button data-action="restart-game">Restart semester</button>${this.fight?'<button data-action="retreat">Leave fight & go home</button>':''}</div><p>Your game is paused. Progress saves on this browser.</p><details><summary>Key bindings</summary><p id="binding-feedback" role="status">Choose an action, then press a new key. M opens the building; 1–3 switch tools; Escape opens this menu.</p>${Object.entries(MENU_BINDINGS).map(([key,label])=>`<button class="binding-row" data-action="rebind:${key}"><span>${label}</span><kbd>${this.input.getBindings()[key as ActionName].map(prettyKey).join(' / ')}</kbd></button>`).join('')}</details><details><summary>Graphics</summary><p>Lower resolution can help on older phones.</p><button data-action="graphics-toggle">Quality: ${this.lowGraphics?'Battery saver':'High'}</button></details><details open><summary>Sound</summary><p>Original music · A little way home</p><button data-action="music-toggle">Music: ${this.music.enabled?'On':'Off'}</button><label for="music-volume">Music volume</label><input id="music-volume" type="range" min="0" max="100" value="${Math.round(this.music.volume*100)}"></details>`;
    if(modal==='tools') {
      const draft=this.inventionDraft, existing=draft?s.inventions[draft.weapon]:null;
      body += `<section class="invention-panel"><span class="eyebrow">MAKE SOMETHING YOURS</span><h2>Invent with words</h2><p>Describe a pen, ruler or cup. Try light, heavy or long to change how it handles. Other details are imagination for now; each invention keeps its original tool shape.</p><label for="invention-words">Your idea</label><input id="invention-words" maxlength="120" placeholder="A lightweight pen for quick sketches" autocomplete="off"><button data-action="invent-preview">Preview invention</button><p id="invention-feedback" role="status">${draft?'Blueprint ready.':'Previewing is free.'}</p>${draft?`<div class="choice invention-preview"><img src="${this.icons[draft.weapon]}" alt=""><h3>${draft.name}</h3><p>${draft.note}</p><p>${existing?'Replaces your current '+draft.weapon+' invention.':'Fits your '+draft.weapon+' slot.'} Existing upgrade ranks stay.</p><button data-action="invent-craft" ${s.coins<CRAFT_COST||existing?.finish===draft.finish?'disabled':''}>${existing?.finish===draft.finish?'Already crafted':`Craft & equip · ${CRAFT_COST} coins`}</button></div>`:''}<h3>Your inventions</h3>${Object.values(s.inventions).length?Object.values(s.inventions).map(item=>`<div class="invention-owned"><b>${item.name}</b><small>${item.note}</small></div>`).join(''):'<p>No inventions yet.</p>'}<small>One invention per tool. Saved with your progress on this browser.</small></section>`;
    }
    if(modal==='clerk') body += '<button data-action="browse-supplies">Everyday supplies · sneakers & lunch →</button>';
    if(modal==='pause' && !this.fight && this.classElapsed===null && this.sleepElapsed===null) body += '<button data-action="faculty">Professor archive ↗</button>';
    if(modal==='pause' && !this.fight && this.classElapsed===null && this.sleepElapsed===null) body += '<button data-action="character">Edit character ↗</button>';
    this.el('s-modal-root').innerHTML = `<div class="studio-modal-backdrop ${modal==='character'?'dressing-backdrop':''}"><section class="studio-modal ${modal==='faculty'?'faculty-modal':modal==='character'?'character-modal dressing-room':''}" role="dialog" aria-modal="true" aria-labelledby="s-modal-title"><header class="${modal==='character'?'dressing-header':''}"><div class="${modal==='character'?'dressing-logo':''}"><span class="eyebrow">${eyebrow}</span><h1 id="s-modal-title">${title}</h1></div>${modal==='character'?'<span class="dressing-step">✦ YOUR LOOK · YOUR ADVENTURE</span>':''}${modal==='character'&&!s.characterCreated?'':'<button class="close" aria-label="Close dialog" data-action="close">×</button>'}</header>${body}</section></div>`;
    if(modal==='character'){this.creatorArt.setAppearance(this.characterDraft);const stage=this.ui.querySelector('.avatar-stage');if(stage){stage.replaceChildren(this.creatorArt.canvas);this.creatorArt.canvas.setAttribute('role','img');this.creatorArt.canvas.setAttribute('aria-label','Live character preview');}this.updateCreatorPreview();}
    const buttons=Array.from(this.el('s-modal-root').querySelectorAll<HTMLButtonElement>('button'));
    const target=creatorFocus?buttons.find(b=>b.dataset.action===creatorFocus):modal==='character'?buttons.find(b=>b.dataset.action?.startsWith('appearance:')):buttons[0];
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
  private resetBrawler(keepInput = false):void {
    if(!keepInput){this.touchPointers.clear();this.touchActions.clear();}
    this.arena.reset();this.special=null;this.bossMove=null;this.specialPose=null;this.bossPose=null;
    this.specialPoseTime=this.bossPoseTime=this.heroDrop=this.bossDrop=this.heroDodge=this.bossDodge=this.comboHits=this.comboTime=this.heroCoyote=this.jumpBuffer=0;
    this.specialCooldown={uppercut:0,kick:0,dodge:0};
  }
  private grabOrThrow():void {
    if(!this.fight||this.hero.stun>0||this.special||this.heroDodge>0||this.pendingAttack||this.attackTimer>0)return;
    if(this.arena.held('hero')) {
      this.arena.throw('hero',this.hero,this.facing,Math.sign(this.boss.x-this.hero.x)===this.facing?this.boss:undefined);
      this.swing=.28;this.attackTimer=.35;this.effects.word('THROW',this.hero.x,this.hero.y+3.6);
    }else if(this.arena.pickup('hero',this.hero)) this.effects.word('GOT IT',this.hero.x,this.hero.y+3.6);
    else this.toast('Move beside a cup or ruler, then press E to pick it up.',2);
  }
  private physicalMove(kind:'uppercut'|'kick'|'dodge'):void {
    if(!this.fight||this.hero.stun>0||this.special||this.specialCooldown[kind]>0||this.heroDodge>0||this.pendingAttack)return;
    this.specialCooldown[kind]=kind==='dodge'?1.2:kind==='uppercut'?1.5:1.25;
    if(kind==='dodge') {
      this.heroDodge=.2;this.invulnerable=Math.max(this.invulnerable,.2);this.hero.hitVx=this.facing*25;
      this.effects.trail(this.hero.x,this.hero.y,this.facing);return;
    }
    this.special={kind,remaining:kind==='uppercut'?.11:.1,facing:this.facing};this.specialPose=kind;this.specialPoseTime=.44;this.attackTimer=.48;
    if(kind==='uppercut') {this.hero.vy=Math.max(this.hero.vy,12);this.hero.hitVx=this.facing*5;}
    else {if(standingOn(this.hero))this.hero.vy=8;this.hero.hitVx=this.facing*15;}
  }
  private resolvePhysicalMove():void {
    const move=this.special;this.special=null;if(!move||!this.fight||this.hero.stun>0)return;
    const dx=this.boss.x-this.hero.x,dy=this.boss.y-this.hero.y,range=move.kind==='uppercut'?2.9:4;
    this.effects.slash(this.hero.x,this.hero.y,move.facing,true);
    if(dx*move.facing<-.5||Math.abs(dx)>range||Math.abs(dy)>(move.kind==='uppercut'?3.2:2.1))return;
    const hp=this.boss.hp;this.strikingWeapon='ruler';this.strikingFinisher=true;
    this.hitInstructor((move.kind==='uppercut'?19:23)+(this.state.level-1)*2,move.facing);
    this.strikingFinisher=false;
    if(this.boss.hp<hp){
      hitImpulse(this.boss,move.facing,move.kind==='uppercut'?4:16,move.kind==='uppercut'?15:6,.3);
      this.bossMove=null;this.warned=false;this.arena.drop('boss',this.boss);
      this.effects.word(move.kind==='uppercut'?'LAUNCH!':'KICK!',this.boss.x,this.boss.y+3.5);
    }
  }
  private canStartFight(exhibition = false): boolean {
    if(this.fight || this.state.place!=='studio' || this.state.stamina<=0 || this.transition.active || this.classElapsed!==null || this.sleepElapsed!==null)return false;
    return exhibition ? this.state.studio===9 && this.state.cleared.every(Boolean) && !!this.selectedProfessor : !this.state.cleared[this.state.studio-1];
  }
  private startFight(exhibition = false, inPlace = false): void {
    if(!this.canStartFight(exhibition) || (inPlace && this.modal))return;
    this.exhibitionFight = exhibition;
    this.resetBrawler(inPlace);this.brain.reset(this.currentTeacher().id,inPlace?.18:0);
    this.instructorArt.setTeacher(this.currentTeacher());
    if(!inPlace)this.close();
    this.fight = true;
    if(!inPlace){resetMotion(this.hero);resetMotion(this.boss);this.hero.x=15;this.boss.x=24;}
    this.pendingAttack = null; this.attackBuffer = 0; this.penChain = 0; this.chainWindow = 0; this.hitStop = 0; this.effects.clear();
    this.bossMax = 140 + this.state.studio * 20; this.boss.hp = this.bossMax; this.boss.defense = (this.state.studio - 1) * 3;
    this.hero.hp = this.state.stamina; this.warned = false; this.invulnerable = .5;
    this.attackTimer = 0; this.projectiles.clear(); this.enemyProjectiles.clear(); this.toast('', 0); this.refresh();
  }
  private winFight(): void {
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
    this.state.stamina = Math.max(0, this.state.stamina - damage); this.hero.hp = this.state.stamina; this.invulnerable = .8;
    hitImpulse(this.hero, direction, force * (this.state.charms.anchor ? .65 : 1), lift, .23);
    this.special=null;this.arena.drop('hero',this.hero);this.comboHits=0;this.comboTime=0;
    this.pendingAttack = null; this.attackBuffer = 0; this.swing = 0; this.heroFlash = .14; this.hitStop = .055; this.cameraShake = .9;
    this.effects.impact(this.hero.x, this.hero.y + 1.4, damage, direction); this.effects.dust(this.hero.x, FLOOR);
    this.persist();
  }
  private hitInstructor(damage: number, direction: number): void {
    if (!this.fight || !this.boss.isAlive()) return;
    if(this.bossDodge>0){this.effects.word('DODGE',this.boss.x,this.boss.y+3);return;}
    const heavy = this.strikingWeapon === 'ruler' || this.strikingFinisher;
    this.boss.hp = Math.max(0, this.boss.hp - damage);
    const strength = this.strikingWeapon === 'cup' ? 7 : heavy ? 11.5 : 6;
    // A telegraphed instructor attack has poise: it cannot be stun-locked by a fast pen.
    hitImpulse(this.boss, direction, strength * (this.warned ? .65 : 1), heavy ? 5 : 2, this.warned ? .04 : heavy ? .23 : .12);
    this.comboHits++;this.comboTime=1.6;
    if(this.comboHits>1)this.effects.word(`${this.comboHits} HITS`,this.hero.x,this.hero.y+3.6);
    if (this.strikingWeapon === 'pen') { this.penChain = this.strikingFinisher ? 0 : this.penChain + 1; this.chainWindow = 1.05; }
    this.bossFlash = .12; this.hitStop = heavy ? .06 : .035; this.cameraShake = heavy ? .75 : .3;
    this.effects.impact(this.boss.x, this.boss.y + 1.4, damage, direction, heavy);
    if (heavy) this.effects.dust(this.boss.x, FLOOR, 1.4);
  }
  private attack(): void {
    if(this.modal || this.transition.active || this.classElapsed!==null || this.sleepElapsed!==null || this.special || this.heroDodge>0)return;
    if(!this.fight){
      const exhibition=this.state.studio===9 && this.state.cleared.every(Boolean) && !!this.selectedProfessor;
      if(!this.canStartFight(exhibition))return;
      const dx=this.boss.x-this.hero.x,dy=this.boss.y-this.hero.y;
      const range=inventionStats(WEAPONS[this.state.weapon],this.state.inventions[this.state.weapon]).range;
      if(dx*this.facing<-.3 || Math.abs(dx)>range || Math.abs(dy+.5)>2)return;
      this.startFight(exhibition,true);
    }
    if(!this.fight)return;
    if (this.attackTimer > 0 || this.pendingAttack || this.hero.stun > 0) { this.attackBuffer = .15; return; }
    this.beginAttack();
  }
  private beginAttack(): void {
    const weapon = this.state.weapon, w = inventionStats(WEAPONS[weapon], this.state.inventions[weapon]);
    const finisher = weapon === 'pen' && this.penChain === 2 && this.chainWindow > 0;
    const damage = w.damage + this.state.toolRanks[weapon] * 4 + (this.state.level - 1) * 2 + (this.state.charms.echo ? 3 : 0) + (finisher ? 4 : 0);
    this.attackTimer = w.speed; this.attackBuffer = 0;
    this.pendingAttack = { weapon, damage, facing: this.facing, remaining: weapon === 'ruler' ? .15 : weapon === 'cup' ? .09 : .05, finisher };
    this.swing = .28;
  }
  private resolveAttack(): void {
    const strike = this.pendingAttack; this.pendingAttack = null;
    if (!strike || !this.fight || this.hero.stun > 0) return;
    const w = inventionStats(WEAPONS[strike.weapon], this.state.inventions[strike.weapon]); this.strikingWeapon = strike.weapon; this.strikingFinisher = strike.finisher;
    if (strike.weapon === 'cup') this.projectiles.fire(this.hero.x + strike.facing * .7, this.hero.y + 1.25, strike.facing, 17, w.range, strike.damage, false);
    else {
      this.effects.slash(this.hero.x, this.hero.y, strike.facing, strike.weapon === 'ruler');
      meleeAttack({ attackerX: this.hero.x, attackerYFeet: this.hero.y, attackerAttack: strike.damage, attackerCritChance: 0, facing: strike.facing, range: w.range, arcHeight: 2, targets: [this.boss], onHit: () => {} });
    }
    this.strikingFinisher = false;
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
    this.effects.update(dt); this.cameraShake = Math.max(0, this.cameraShake - dt * 4);
    this.camera.position.x = this.cameraBase + Math.sin(this.time * 88) * this.cameraShake * .13;
    this.camera.position.y = Math.cos(this.time * 103) * this.cameraShake * .08;
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      if (this.input.consumeAttack()) this.attackBuffer = .15;
      this.positionActors(); this.positionLabels(); this.refresh(); return;
    }
    if (this.sleepElapsed !== null) {
      this.sleepElapsed += dt; this.heroMesh.rotation.z = -.9;
      this.label('s-class-title', 'A fresh start is on its way.'); this.label('s-class-quote', 'Sketchbooks closed. Stamina recharging.'); this.label('s-class-code', 'A GOOD NIGHT’S SLEEP');
      this.el('s-class-fill').style.width = `${this.sleepElapsed / 2.5 * 100}%`; this.label('s-class-progress', 'Z z z …');
      if (this.sleepElapsed >= 2.5) { this.sleepElapsed = null; this.heroMesh.rotation.z = 0; rest(this.state); this.hero.hp = this.state.stamina; this.persist(); this.refresh(); this.toast(`Morning, day ${this.state.day}. Stamina fully restored.`); }
      this.input.clearQueues(); return;
    }
    if (this.classElapsed !== null) {
      this.classElapsed += dt; this.updateTeaching(dt);
      this.instructorArt.paint(this.time+1,Math.abs(this.boss.vx)>.5,this.currentTeacher().tool,this.teachingGesture);
      this.studentArt.paint(this.time, false, this.state.weapon, 0, true);
      this.label('s-class-title', 'A little wiser, every day.'); this.label('s-class-code', 'CLASS IN SESSION'); this.label('s-class-quote', `“${LESSONS[this.state.knowledge[this.state.studio - 1]]}”`);
      this.el('s-class-fill').style.width = `${this.classElapsed / CLASS_SECONDS * 100}%`; this.label('s-class-progress', `${Math.max(0, Math.ceil(CLASS_SECONDS - this.classElapsed))} seconds · +1 Knowledge when class ends`);
      if (this.classElapsed >= CLASS_SECONDS) {
        this.classElapsed = null; const result = completeClass(this.state); this.hero.hp = this.state.stamina; this.persist(); this.refresh();
        if (result.cleared) this.open('passed'); else if (result.ok) this.toast(`+1 Knowledge · +15 XP · +10 coins. ${this.state.knowledge[this.state.studio - 1]}/7 learned.`);
      }
      this.positionActors(); this.input.clearQueues(); return;
    }
    const touchAxis=Math.sign([...this.touchPointers.values()].reduce((a,b)=>a+b,0));
    const axis = touchAxis || this.input.moveAxis;
    if (axis && this.hero.stun <= 0) this.facing = axis;
    const platforms=this.state.place==='studio'?CLASSROOM_PLATFORMS:[];
    if(standingOn(this.hero,platforms))this.heroCoyote=.1;else this.heroCoyote=Math.max(0,this.heroCoyote-dt);
    this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);if(this.input.consumeJump()||this.touchActions.delete('jump'))this.jumpBuffer=.13;
    if(this.jumpBuffer>0&&this.heroCoyote>0&&this.hero.stun<=0){this.hero.vy=platforms.length?15.6:10;this.jumpBuffer=0;this.heroCoyote=0;this.effects.dust(this.hero.x,this.hero.y,.9);}
    if((this.input.consumeAction('stats')||this.touchActions.delete('drop'))&&this.state.place==='studio'&&this.hero.y>FLOOR+.1){this.heroDrop=.25;this.hero.y-=.08;this.hero.vy=-3;}
    if(this.input.consumeAction('skill1'))this.physicalMove('uppercut');
    if(this.input.consumeAction('skill2'))this.physicalMove('kick');
    if(this.input.consumeAction('skill3'))this.physicalMove('dodge');
    for(const key of ['uppercut','kick','dodge'] as const)this.specialCooldown[key]=Math.max(0,this.specialCooldown[key]-dt);
    this.heroDrop=Math.max(0,this.heroDrop-dt);this.bossDrop=Math.max(0,this.bossDrop-dt);this.heroDodge=Math.max(0,this.heroDodge-dt);this.bossDodge=Math.max(0,this.bossDodge-dt);
    this.specialPoseTime=Math.max(0,this.specialPoseTime-dt);if(!this.specialPoseTime)this.specialPose=null;
    this.bossPoseTime=Math.max(0,this.bossPoseTime-dt);if(!this.bossPoseTime)this.bossPose=null;
    this.comboTime=Math.max(0,this.comboTime-dt);if(!this.comboTime)this.comboHits=0;
    const speed = (this.state.shoes ? 7.8 : 6.8) * (this.pendingAttack?.weapon === 'ruler' ? .5 : 1);
    const previousX = this.hero.x;
    if (stepMotion(this.hero, axis, speed, dt, this.state.place === 'lobby' ? 62 : 30,platforms,this.heroDrop>0)) this.effects.dust(this.hero.x,this.hero.y,1.3);
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
    if (this.attackBuffer > 0 && this.attackTimer <= 0 && !this.pendingAttack && !this.special && this.heroDodge<=0 && this.hero.stun <= 0 && this.fight) this.beginAttack();
    if (this.pendingAttack) { this.pendingAttack.remaining -= dt; if (this.pendingAttack.remaining <= 0) this.resolveAttack(); }
    if(this.special){this.special.remaining-=dt;if(this.special.remaining<=0)this.resolvePhysicalMove();}
    if (this.input.consumeAction('interact')||this.touchActions.delete('interact')) this.action('interact');
    if (this.fight) this.updateFight(dt);
    this.strikingWeapon = 'cup'; this.strikingFinisher = false;
    this.projectiles.update(dt, this.fight ? [this.boss] : [], () => {});
    this.enemyProjectiles.update(dt, this.fight ? [this.hero] : [], () => {});
    if(this.fight)this.arena.update(dt,this.hero,this.boss,this.facing,(owner,kind,direction)=>{
      if(owner==='hero'){this.strikingWeapon=kind;this.strikingFinisher=true;this.hitInstructor(kind==='cup'?27:32,direction);this.strikingFinisher=false;}
      else this.hurt(kind==='cup'?18:22,direction,12,5);
      this.effects.word(kind==='cup'?'SPLASH!':'BONK!',owner==='hero'?this.boss.x:this.hero.x,(owner==='hero'?this.boss.y:this.hero.y)+3.3);
    });
    // Resolve scene changes after projectile iteration, never from a hit callback.
    if (this.fight && this.state.stamina === 0) { this.changePlace('home'); this.open('home'); this.toast('Out of stamina. Rest up—your Knowledge is safe.', 6); }
    else if (this.fight && this.boss.hp === 0) this.winFight();
    this.paintTimer -= dt;
    if (this.paintTimer <= 0) {
      this.studentArt.paint(this.time, Math.abs(this.hero.vx) > 1, this.pendingAttack?.weapon ?? this.state.weapon, this.swing > 0 ? 1 - this.swing / .28 : 0,false,this.specialPose??(this.heroDodge>0?'dodge':null),!!this.arena.held('hero'));
      if (this.state.place === 'mystery') this.clerkArt.paint(this.time + 2, false, 'pen', 0);
      this.instructorArt.paint(this.time + 1, Math.abs(this.boss.vx) > .5, this.currentTeacher().tool, this.instructorSwing > 0 ? 1 - this.instructorSwing / .28 : this.warned ? .12 : this.fight ? 0 : this.teachingGesture,false,this.bossPose??(this.bossDodge>0?'dodge':null),!!this.arena.held('boss')); this.paintTimer = 1 / 24;
    }
    this.positionActors(); this.positionLabels();
    this.uiTimer -= dt; if (this.uiTimer <= 0) { this.refresh(); this.uiTimer = .12; }
    this.saveTimer += dt; if (this.saveTimer > 3) { this.persist(); this.saveTimer = 0; }
  }
  private updateTeaching(dt: number): void {
    const intent=this.teaching.update(dt,this.boss,this.hero);
    this.teachingFacing=intent.facing;this.teachingGesture=intent.gesture;
    stepMotion(this.boss,intent.axis,1.65,dt,30,CLASSROOM_PLATFORMS);
    if(this.classElapsed===null)separateBodies(this.hero,this.boss);
  }
  private updateFight(dt: number): void {
    const intent=this.brain.update(dt,{hero:this.hero,boss:this.boss,tool:this.currentTeacher().tool,held:!!this.arena.held('boss'),propNear:!!this.arena.nearby(this.boss),propThreat:this.arena.threat(this.boss,'boss'),heroAttacking:!!this.pendingAttack||!!this.special,busy:!!this.bossMove});
    if(intent.pickup)this.arena.pickup('boss',this.boss);
    if(intent.jump&&standingOn(this.boss)&&this.boss.stun<=0){this.boss.vy=15.6;this.effects.dust(this.boss.x,this.boss.y,.8);}
    if(intent.drop&&this.boss.y>FLOOR+.1){this.bossDrop=.25;this.boss.y-=.08;this.boss.vy=-3;}
    if(intent.dodge&&this.boss.stun<=0){this.boss.hitVx=intent.dodge*19;this.bossDodge=.18;this.effects.trail(this.boss.x,this.boss.y,intent.dodge);}
    if(stepMotion(this.boss,intent.axis,4.6+this.state.studio*.1,dt,30,CLASSROOM_PLATFORMS,this.bossDrop>0))this.effects.dust(this.boss.x,this.boss.y);
    separateBodies(this.hero,this.boss);
    if(intent.move&&!this.bossMove&&this.boss.stun<=0){
      this.bossMove={kind:intent.move,remaining:intent.move==='sweep'?.5:.38,direction:Math.sign(this.hero.x-this.boss.x)||1};
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
          if(!this.arena.throw('boss',this.boss,move.direction,this.hero))this.enemyProjectiles.fire(this.boss.x+move.direction,this.boss.y+1.4,move.direction,13,25,14+this.state.studio,false);
        }else{
          this.effects.slash(this.boss.x,this.boss.y,move.direction,move.kind!=='jab');
          const dx=this.hero.x-this.boss.x,dy=this.hero.y-this.boss.y;
          if(dx*move.direction>-.5&&Math.abs(dx)<range&&Math.abs(dy)<(move.kind==='uppercut'?3:2))
            this.hurt(12+Math.round(this.state.studio*1.5),move.direction,move.kind==='kick'?14:10,move.kind==='uppercut'?13:4);
          if(move.kind==='uppercut'){this.boss.vy=11;this.bossPose='uppercut';this.bossPoseTime=.4;}
          if(move.kind==='kick'){this.boss.hitVx=move.direction*12;this.bossPose='kick';this.bossPoseTime=.4;}
        }
      }
    }
  }

  private positionActors(): void {
    this.heroMesh.position.set(this.hero.x, this.hero.y + 2.025, 2); this.heroMesh.scale.set(this.facing * (this.heroFlash ? 1.08 : 1), this.heroFlash ? .94 : 1, 1);
    this.heroMesh.rotation.z = this.hero.stun > 0 ? -Math.sign(this.hero.hitVx) * .22 : this.specialPose==='kick'?-this.facing*.17:0;
    (this.heroMesh.material as THREE.MeshBasicMaterial).color.set(this.heroFlash ? '#f5b49d' : '#ffffff');
    this.heroMesh.visible = this.invulnerable <= 0 || Math.floor(this.time * 14) % 2 === 0;
    this.bossMesh.position.set(this.boss.x, this.boss.y + 2.175, 1);
    this.bossMesh.scale.set((this.fight ? (this.hero.x < this.boss.x ? -1 : 1) : this.teachingFacing) * (this.bossFlash ? 1.08 : 1), this.bossFlash ? .94 : 1, 1);
    this.bossMesh.rotation.z = this.boss.stun > 0 ? -Math.sign(this.boss.hitVx) * .2 : this.bossPose==='kick'?-.15:0;
    (this.bossMesh.material as THREE.MeshBasicMaterial).color.set(this.bossFlash ? '#ffd7a0' : '#ffffff');
    this.playerShadow.position.x = this.hero.x; this.bossShadow.position.x = this.boss.x;
    const support=(x:number,y:number)=>this.state.place==='studio'?Math.max(FLOOR,...CLASSROOM_PLATFORMS.filter(p=>x>=p.x1&&x<=p.x2&&p.y<=y+.1).map(p=>p.y)):FLOOR;
    this.playerShadow.position.y=support(this.hero.x,this.hero.y)+.05;this.bossShadow.position.y=support(this.boss.x,this.boss.y)+.05;
    this.playerShadow.scale.x = Math.max(.5, 1 - (this.hero.y - FLOOR) * .12); this.bossShadow.scale.x = Math.max(.5, 1 - (this.boss.y - FLOOR) * .12);
  }
  private positionLabels(): void {
    const place = this.state.place;
    const visibility: Record<string, boolean> = {
      's-crafting-label': (place === 'tools' || place === 'skills') && !this.modal,
      's-chair-label': place === 'studio' && !this.fight && this.classElapsed === null,
      's-boss-label': place === 'studio' && !this.fight && this.classElapsed === null,
      's-mystery-label': place === 'lobby', 's-building-label': place === 'lobby',
      's-clerk-label': place === 'mystery', 's-exit-label': place === 'mystery' || place === 'foyer' || place==='home',
      's-accommodation-sign': place === 'lobby', 's-wayfinding': place === 'lobby',
      's-context-hint': !this.modal && !this.transition.active && (this.fight ? !!this.arena.held('hero') || !!this.arena.nearby(this.hero) : this.classElapsed===null && this.sleepElapsed===null && !['lobby','shopfloor','workshopfloor','skills','tools','exit','clerk'].includes(this.near())),
    };
    this.camera.updateMatrixWorld();
    for (const [id, x, y] of [['s-crafting-label',22,FLOOR+4.8],['s-chair-label', 10, FLOOR + 2.4], ['s-boss-label', this.boss.x, this.boss.y - .22], ['s-mystery-label', 8, FLOOR + 3.4], ['s-building-label', 28, FLOOR + 3.4], ['s-clerk-label', 24, FLOOR - .22], ['s-exit-label', 3.2, FLOOR + 3.1], ['s-accommodation-sign', 54, 7.6], ['s-wayfinding', 39, FLOOR + 3], ['s-context-hint',this.hero.x,this.hero.y+4.8]] as const) {
      const p = new THREE.Vector3(x, y, 0).project(this.camera); const el = this.el(id);
      el.style.left = `${(p.x + 1) * 50}%`; el.style.top = `${(1 - p.y) * 50}%`;
      el.hidden = !visibility[id] || p.x < -1.1 || p.x > 1.1;
      if(id==='s-crafting-label'&&!el.hidden){const edge=el.offsetWidth/2+8;el.style.left=`clamp(${edge}px,${(p.x+1)*50}%,calc(100% - ${edge}px))`;}
    }
  }
  private refresh(): void {
    const s = this.state, i = s.studio - 1, total = s.cleared.filter(Boolean).length;
    this.label('s-crafting-label', ['skills','tools'].includes(this.near()) ? s.place==='tools'?'E · Upgrade & invent':'E · Upgrade character' : 'Crafting table →');
    this.el('touch-attack').hidden=!this.fight && !(s.place==='studio' && this.classElapsed===null && this.sleepElapsed===null);
    this.label('touch-interact',this.fight?(this.arena.held('hero')?'Throw':'Grab'):this.near()==='home'&&s.place==='home'?'Rest':['instructor','clerk'].includes(this.near())?'Talk':'Enter');
    this.label('s-level', `LV ${s.level} · ${window.innerWidth < 1000 ? 'Student' : 'Architecture student'}`); this.label('s-stamina', `${s.stamina} / ${maxStamina(s)}`);
    this.el('s-fill').style.width = `${s.stamina / maxStamina(s) * 100}%`; this.el('s-meter').setAttribute('aria-valuenow', String(s.stamina)); this.el('s-meter').setAttribute('aria-valuemin', '0'); this.el('s-meter').setAttribute('aria-valuemax', String(maxStamina(s))); this.el('s-meter').setAttribute('aria-valuetext', `${s.stamina} of ${maxStamina(s)} stamina`);
    this.label('s-location', s.place === 'studio' ? STUDIO_NAMES[i] : s.place === 'lobby' && this.hero.x > 37 ? 'Student Accommodation' : PLACES[s.place].title);
    this.label('s-location-code', s.place === 'studio' ? `${s.studio === 1 ? 'GROUND FLOOR' : 'LEVEL ' + (s.studio - 1)} · STUDIO ${String(s.studio).padStart(2, '0')}` : PLACES[s.place].subtitle);
    this.label('s-coins', `◉ ${s.coins}`); this.label('s-day', `DAY ${String(s.day).padStart(2, '0')}`); this.label('s-journey', `${total} / 9 studios completed`);
    this.label('s-xp', `${s.xp} / ${xpNeeded(s)} XP · Level ${s.level}`); this.el('s-xp-fill').style.width = `${s.xp / xpNeeded(s) * 100}%`;
    this.label('s-knowledge',`Studio ${s.studio} · Knowledge ${s.knowledge[i]}/7${s.cleared[i]?' · ✓ Passed':''}`);
    const teacher=this.currentTeacher();
    this.label('s-boss-label',teacher.name);
    for (const w of ['pen', 'ruler', 'cup'] as Weapon[]) {
      const button = this.el(`weapon-${w}`) as HTMLButtonElement; button.classList.toggle('selected', w === s.weapon); button.setAttribute('aria-pressed', String(w === s.weapon)); button.disabled = this.transition.active || this.classElapsed !== null || this.sleepElapsed !== null;
      button.title=s.inventions[w]?`${s.inventions[w]!.name} · ${s.inventions[w]!.note}`:WEAPONS[w].description;
    }
    this.el('s-class').hidden = this.classElapsed === null && this.sleepElapsed === null;
    this.el('s-lobby-sparkles').hidden = s.place !== 'lobby' || this.cameraBase > 4;
    this.el('s-lobby-errands').hidden = s.place !== 'lobby';
    this.el('s-lobby-errands').querySelector('span')!.textContent = this.hero.x > 37 ? '← Back to Building 100' : 'Accommodation →';
    this.ui.classList.toggle('in-lobby', s.place === 'lobby');
    const busy = this.transition.active || this.fight || this.classElapsed !== null || this.sleepElapsed !== null;
    (this.el('s-lobby-button') as HTMLButtonElement).disabled = busy || s.place === 'lobby';
    (this.el('s-map-button') as HTMLButtonElement).disabled = busy;
    this.el('s-boss').hidden = !this.fight; this.label('s-boss-title', `${this.currentTeacher().name.toUpperCase()} · ${Math.ceil(this.boss.hp)} / ${this.bossMax}`);
    this.el('s-boss-fill').style.width = `${this.boss.hp / this.bossMax * 100}%`;
    this.label('s-boss-tip', this.bossMove ? `${this.bossMove.kind.toUpperCase()} incoming · dodge, jump or interrupt!` : this.comboHits>1?`${this.comboHits} hits · keep the combo going!`:'Use the desks, lights and loose stationery.');
    this.el('s-move-dock').hidden=!this.fight;
    for(const key of ['uppercut','kick','dodge'] as const){const button=this.el(`move-${key}`) as HTMLButtonElement;button.disabled=this.specialCooldown[key]>0||this.hero.stun>0||!!this.special;button.style.setProperty('--cooldown',String(this.specialCooldown[key]/(key==='dodge'?1.2:key==='uppercut'?1.5:1.25)));}
    const key=(action:ActionName)=>prettyKey(this.input.getBindings()[action][0]??'—');
    this.label('s-controls',`${key('moveLeft')} ${key('moveRight')} move · ${key('jump')} jump · ${key('interact')} ${this.fight?'grab / throw':'interact'} · ${this.fight?`${key('attack')} attack · ${key('skill1')} uppercut · ${key('skill2')} kick`:'M building'}`);
    const nearby = this.near();
    this.label('s-context-hint',this.fight ? this.arena.held('hero')?'E · throw '+this.arena.held('hero')!.kind:'E · pick up '+(this.arena.nearby(this.hero)?.kind??'prop') : nearby==='home' && s.place==='home'?'E · rest':nearby==='skills'?'E · upgrade character':nearby==='tools'?'E · upgrade tool':nearby==='map'?'E · directory':nearby==='chair'?'E · class':nearby==='instructor'?`${key('attack')} · hit  /  ${key('interact')} · talk`:'E · enter');
    for(const id of ['s-context-hint','s-crafting-label'])this.el(id).textContent=this.el(id).textContent!.replace(/^E ·/,`${key('interact')} ·`);
    const labels: Record<ReturnType<StudioGame['near']>, string> = { workshopfloor:'Crafting table →', chair: s.cleared[i] ? 'Studio complete · head upstairs' : 'Take a seat · attend class', instructor: s.cleared[i] ? 'Talk to your instructor' : 'Hit to start a duel · or talk', exit: 'Step outside to the lobby', map: 'Explore Building 100', shop: 'Browse the Supply Cupboard', mystery: 'Enter the mysterious shop', clerk: 'Talk to Mika', shopfloor: 'Walk right to Mika’s counter →', building: 'Enter Building 100', lobby: this.hero.x > 30 ? 'Accommodation → · keep walking right' : 'Shop ← · Building 100 → · home further right', home: s.place === 'home' ? 'Sleep & restore stamina' : 'Enter your apartment', skills: 'Improve your character', tools: 'Upgrade & invent' };
    this.label('s-interact-text', this.fight ? `Attack with ${WEAPONS[s.weapon].name} · Space / click` : this.classElapsed !== null ? 'Class in session…' : this.sleepElapsed !== null ? 'Resting…' : labels[nearby]);
    (this.el('s-interact') as HTMLButtonElement).disabled = this.transition.active || this.classElapsed !== null || this.sleepElapsed !== null;
    this.positionLabels();
  }
}
