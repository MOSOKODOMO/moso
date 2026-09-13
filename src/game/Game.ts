/**
 * Game — wires Phase 1 + Phase 2 systems together:
 * maps (Meadow Outpost hub + Floor 1 dungeon), Mira's shop, dungeon gate,
 * tiered MMO-style loot with rarity, 4-slot loadout + enhancement, floor relics.
 */
import * as THREE from 'three';
import { BalanceConfig } from '../config/BalanceConfig';
import { GameConfig } from '../config/GameConfig';
import {
  CONSUMABLES,
  EquipmentDrop,
  FLOOR_RELICS,
  FLOOR_RELIC_DROP,
  PotionDrops,
  SLOT_ORDER,
  baseItemId,
  type ConsumableId,
  type Rarity,
  type Slot,
} from '../config/ItemDefs';
import { RELIC_DEFS } from '../config/ItemConfig';
import {
  BERSERK_DURATION,
  SKILL_DEFS,
  SKILL_ORDER,
  dashSlashMults,
  swordRainMult,
  type SkillId,
} from '../config/SkillConfig';
import { meleeAttack, type CombatTarget } from '../combat/CombatSystem';
import { calculateDamage } from '../combat/DamageSystem';
import { DungeonFloor } from '../dungeon/DungeonFloor';
import { Enemy } from '../enemy/Enemy';
import { InputManager, prettyKey } from '../input/InputManager';
import { Inventory } from '../items/Inventory';
import { EquipmentManager } from '../items/Equipment';
import {
  createItem,
  itemName,
  itemSellValue,
  itemSlot,
  type ItemInstance,
} from '../items/ItemInstance';
import { PickupManager, type Pickup } from '../items/Pickups';
import { Player } from '../player/Player';
import { PlayerController } from '../player/PlayerController';
import { FloorRelicManager } from '../relics/FloorRelics';
import { Camera2D } from '../rendering/Camera2D';
import { ParallaxBackground } from '../rendering/ParallaxBackground';
import { Renderer2D } from '../rendering/Renderer2D';
import {
  makeGlowTexture,
  makeRingTexture,
  makeSlashTexture,
  makeWeaponTexture,
} from '../rendering/SpriteFactory';
import { BASE_ITEMS } from '../config/ItemDefs';
import { HUD, type Projector } from '../ui/HUD';
import { updateHudActionKeys } from '../ui/HudActions';
import { InventoryMenu } from '../ui/InventoryMenu';
import { PauseMenu } from '../ui/PauseMenu';
import { ShopMenu } from '../ui/ShopMenu';
import { GateMenu } from '../ui/GateMenu';
import { StatsMenu } from '../ui/StatsMenu';
import { SAVE_VERSION, clearSave, loadSave, storeSave, type SaveData } from '../systems/SaveManager';
import { Z_LAYERS } from '../utils/Constants';
import { chance } from '../utils/MathUtils';
import { MAPS, shopTierForFloor, type MapId } from '../world/Maps';
import { NPC } from '../world/NPC';
import { GameLoop } from './GameLoop';
import { Campaign, FLOOR_STORIES, CAMPAIGN_INTRO, SEAL_RETURN, CAMPAIGN_ENDING, CORE_PURIFIED, GUARDIAN_DEFEATED, GUARDIAN_REWARD_ID, floorRewardId } from '../campaign/Campaign';
import { CampaignUI } from '../ui/CampaignUI';
import { CampaignWorld } from '../campaign/CampaignWorld';
import { EncounterHazards } from '../world/EncounterHazards';
import { ROUTES, type RouteRoom } from '../campaign/CampaignRoutes';
import { routeRoomWidth, roomStart, enemyToken, roomTokens } from '../campaign/RouteProgress';

interface SlashFx {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  life: number;
  ttl: number;
  opacity: number;
}

interface Particle {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  grav: number;
}

interface Shockwave {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  life: number;
  ttl: number;
  maxR: number;
}

interface RainSword {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  vy: number;
  landed: number; // < 0 while falling, otherwise fade-out timer
}

const INTERACT_RADIUS = 2.8;
const RELIC_ECHO_GOLD = 150;

export class Game {
  private readonly renderer: Renderer2D;
  private readonly camera: Camera2D;
  private readonly background: ParallaxBackground;
  private floor!: DungeonFloor;
  private readonly player: Player;
  private readonly controller: PlayerController;
  private readonly input: InputManager;
  private readonly hud = new HUD();
  private readonly loop: GameLoop;
  private readonly enemies: Enemy[] = [];
  private readonly slashes: SlashFx[] = [];

  private readonly slashTexture = makeSlashTexture();
  private readonly projectPoint: Projector;
  private readonly projectVec = new THREE.Vector3();
  private deathTimer = -1;
  private readonly pauseMenu: PauseMenu;
  private readonly statsMenu: StatsMenu;
  private readonly bagMenu: InventoryMenu;
  private readonly shopMenu: ShopMenu;
  private readonly gateMenu: GateMenu;
  private readonly inventory: Inventory;
  private readonly equipment = new EquipmentManager();
  private readonly campaign = new Campaign();
  private readonly campaignUI: CampaignUI;
  private campaignWorld!: CampaignWorld;
  private hazards!: EncounterHazards;
  private readonly townspeople: NPC[] = [];
  private routeEnemies = new WeakMap<Enemy, string>();
  private readonly spawnedRouteEnemies = new Set<string>();
  private readonly pickups: PickupManager;
  private readonly scheduled: Array<{ t: number; fn: () => void }> = [];
  private readonly rainSwords: RainSword[] = [];
  private readonly skillCds: Record<SkillId, number> = { power: 0, bolt: 0, heal: 0 };
  private readonly particles: Particle[] = [];
  private readonly shockwaves: Shockwave[] = [];
  private readonly particleTexture = makeGlowTexture();
  private readonly ringTexture = makeRingTexture();
  private readonly particleGeo = new THREE.PlaneGeometry(1, 1);

  // --- Phase 2 world state ---
  private currentMap: MapId = 'outpost';
  private unlockedFloor = 1;
  private currentZone = '';
  private mira: NPC | null = null;
  private souls: Record<string, number> = {};
  private pity: Record<string, number> = {};
  private hitstopT = 0;
  private autoPending: { id: SkillId; t: number } | null = null;

  private autoAttack = false;
  private autoSkill = false;
  private autoWantsAttack = false;
  private saveTimer = 0;
  private static readonly AUTOSAVE_INTERVAL = 15;

  constructor(container: HTMLElement) {
    this.renderer = new Renderer2D(container);
    this.camera = new Camera2D(this.renderer.aspect);
    this.renderer.onResize((w, h) => {
      this.camera.updateAspect(w / h);
      this.background.layout(this.camera.viewHalfWidth * 2, this.camera.viewHeight);
    });

    this.background = new ParallaxBackground(this.renderer.scene);
    this.background.layout(this.camera.viewHalfWidth * 2, this.camera.viewHeight);

    this.input = new InputManager(this.renderer.domElement);
    this.player = new Player(this.renderer.scene);
    this.controller = new PlayerController(this.player, this.input);
    this.inventory = new Inventory();
    this.pickups = new PickupManager(this.renderer.scene);
    this.player.equipment = this.equipment;
    this.player.floorRelics = new FloorRelicManager();

    const savedMap = this.applySave(loadSave());
    this.syncEquipmentVisuals();
    this.player.recomputeStats();
    this.player.hp = this.player.maxHP;
    this.player.mp = this.player.maxMP;

    this.statsMenu = new StatsMenu(
      this.player,
      {
        onAllocateStat: (id) => this.player.allocateStat(id),
        onUpgradeSkill: (id) => {
          this.player.upgradeSkill(id);
          this.saveGame();
        },
        onToggleRelic: (id) => {
          this.player.floorRelics?.toggleActive(id);
          this.player.recomputeStats();
        },
      },
      { equipment: this.equipment, floorRelics: this.player.floorRelics },
    );
    this.bagMenu = new InventoryMenu(
      this.inventory,
      this.equipment,
      this.player.floorRelics,
      this.player,
      {
        onUseConsumable: (id) => this.useConsumable(id),
        onEquipItem: (uid) => this.equipItem(uid),
        onDropEquipment: (uid) => this.dropBagEquipment(uid),
        onDropConsumable: (id) => this.dropBagConsumable(id),
        onDiscardEquipment: (uid) => this.discardBagEquipment(uid),
        onDiscardConsumable: (id) => this.discardBagConsumable(id),
        onToggleRelic: (id) => {
          this.player.floorRelics?.toggleActive(id);
          this.player.recomputeStats();
        },
      },
    );
    this.shopMenu = new ShopMenu(this.player, this.inventory, this.equipment, {
      getGold: () => this.player.gold,
      spendGold: (amount) => {
        if (this.player.gold < amount) return false;
        this.player.gold -= amount;
        return true;
      },
      earnGold: (amount) => {
        this.player.gold += amount;
      },
      refreshBag: () => {
        this.bagMenu.refresh();
        this.syncEquipmentVisuals();
        this.saveGame();
      },
    });
    this.gateMenu = new GateMenu({
      onEnter: (floor) => {
        if (!this.campaign.state.started) {
          this.talkToMira();
          return;
        }
        if (this.campaign.canEnter(floor)) this.transitionTo(`floor${floor}` as MapId);
      },
      onLeave: () => this.transitionTo('outpost', MAPS.outpost.gateX! - 2),
      getCampaign: () => this.campaign,
      getCurrentFloor: () => MAPS[this.currentMap].floorNumber,
    });
    this.campaignUI = new CampaignUI({
      onOpenSkills: () => this.openLearning(), onClaimReward: (id) => this.claimCampaignReward(id),
      onReturnTown: () => this.transitionTo('outpost', 12),
    });

    this.pauseMenu = new PauseMenu(this.input, {
      onTogglePause: () => this.setPaused(!this.pauseMenu.isOpen()),
      onResume: () => this.setPaused(false),
      onSave: () => this.saveGame(),
      onResetSave: () => {
        clearSave();
        window.location.reload();
      },
      isAutoAttack: () => this.autoAttack,
      onToggleAutoAttack: (enabled) => {
        this.autoAttack = enabled;
        this.refreshHint();
      },
      onBindingsChanged: () => this.refreshHint(),
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.setPaused(true);
    });
    this.refreshHint();
    this.initSkillBar();
    this.hud.initAutoSkillButton(() => this.toggleAutoSkill());
    this.hud.setAutoSkill(this.autoSkill);

    this.projectPoint = (x, y) => {
      this.projectVec.set(x, y, 0).project(this.camera.camera);
      return {
        sx: (this.projectVec.x * 0.5 + 0.5) * window.innerWidth,
        sy: (-this.projectVec.y * 0.5 + 0.5) * window.innerHeight,
      };
    };

    this.loadMap(savedMap, undefined, true);

    this.loop = new GameLoop(
      (dt) => this.update(dt),
      () => this.renderer.render(this.camera.camera),
    );
  }

  start(): void {
    this.hud.showBanner(MAPS[this.currentMap].label.toUpperCase());
    this.loop.start();
  }

  private openLearning(): void {
    this.campaignUI.setOpen(false);
    this.shopMenu.setOpen(false);
    this.gateMenu.setOpen(false);
    this.bagMenu.setOpen(false);
    this.statsMenu.openLearning();
    this.input.clearQueues();
  }

  private talkToMira(): void {
    if (!this.campaign.state.started) {
      this.campaign.start();
      this.campaign.claimReward('starter');
      this.campaignUI.showDialogue('Mira · The fading crystal', CAMPAIGN_INTRO, [
        { label: 'Explore the safe ruins', onClick: () => this.campaignUI.setOpen(false) },
        { label: 'Shop and forge', onClick: () => { this.campaignUI.setOpen(false); this.shopMenu.setOpen(true, this.unlockedFloor); } },
      ]);
    } else if (this.campaign.state.completed && !this.campaign.state.endingSeen) {
      this.campaign.finishEnding();
      this.campaign.claimReward('ending');
      this.campaignUI.showDialogue('The Last Light · Home again', CAMPAIGN_ENDING, [
        { label: 'Continue exploring', onClick: () => this.campaignUI.setOpen(false) },
      ]);
    } else if (this.campaign.returnSeal()) {
      this.campaign.claimReward('seal-return');
      this.campaignUI.showDialogue('Mira · The royal seal', SEAL_RETURN, [
        { label: 'Prepare at the shop', onClick: () => { this.campaignUI.setOpen(false); this.shopMenu.setOpen(true, this.campaign.unlockedFloor); } },
        { label: 'Continue', onClick: () => this.campaignUI.setOpen(false) },
      ]);
    } else {
      this.shopMenu.setOpen(true, shopTierForFloor(this.campaign.unlockedFloor));
    }
    this.refreshCampaign();
    this.saveGame();
  }

  private interactStation(id: string): void {
    const map = MAPS[this.currentMap];
    const note = /^(f[1-8]-room\d+)-note-([01])$/.exec(id);
    if (note) {
      const room = ROUTES[MAPS[this.currentMap].floorNumber]?.find(room => room.id === note[1]);
      if (!room) return;
      const index = Number(note[2]);
      this.campaign.journey.inspect(room, index);
      const title = `${map.label} · Beacon note`;
      const line = index ? 'There is nothing to read here.' : 'Use this beacon to keep moving forward.';
      this.campaignUI.showDialogue(title, [line], [{ label: 'Continue', onClick: () => {} }]);
      this.refreshCampaign(); this.saveGame(); return;
    }
    const room = ROUTES[MAPS[this.currentMap].floorNumber]?.find(room => room.id === id);
    if (room) { this.interactRoom(room); return; }
    if (id === 'f8-core') {
      if (this.campaign.state.completed) {
        this.campaignUI.showDialogue('The royal heart', ['The core shines freely. Its light is already home.'], [
          { label: 'Return to Meadow Outpost', onClick: () => this.transitionTo('outpost', 12) },
          { label: 'Keep exploring', onClick: () => {} },
        ]);
      } else if (this.campaign.purifyCore()) {
        this.saveGame();
        this.campaignUI.showDialogue('The royal heart', CORE_PURIFIED, [
          { label: 'Return the light to Mira', onClick: () => { this.campaignUI.setOpen(false); this.transitionTo('outpost', 12); } },
        ]);
      } else {
        this.campaignUI.showDialogue('The royal heart', ['Defeat the Abyss Lord before purifying the core.']);
      }
    } else {
      const floor = MAPS[this.currentMap].floorNumber;
      const station = FLOOR_STORIES[floor]?.stations.find(s => s.id === id);
      if (!station) return;
      if (!this.campaign.state.started) this.campaign.start();
      this.campaign.interact(id);
      this.campaignUI.showDialogue(station.title, station.lines);
      this.saveGame();
    }
    this.refreshCampaign();
  }

  private refreshCampaign(): void {
    this.unlockedFloor = Math.max(this.unlockedFloor, this.campaign.unlockedFloor);
    this.campaignUI.update(this.campaign, MAPS[this.currentMap].floorNumber);
    this.campaignWorld?.update([...this.campaign.state.interactions, ...this.campaign.journey.completed, ...this.campaign.journey.inspected]);
    this.hazards?.setDisabled(this.campaign.hasInteraction('f6-furnace-a') && this.campaign.hasInteraction('f6-furnace-b'));
    this.ensureCampaignEncounter();
  }

  private interactRoom(room: RouteRoom): void {
    const floor = MAPS[this.currentMap].floorNumber;
    const journey = this.campaign.journey;
    if (journey.completed.has(room.id)) {
      this.campaignUI.showDialogue(room.title + ' · Beacon already lit', [...room.intro, 'This chamber is clear. Your progress is saved.'], [
        { label: 'Continue exploring', onClick: () => {} },
        { label: 'Rest in town', onClick: () => this.transitionTo('outpost', 12) },
      ]);
      return;
    }
    if (journey.active(floor)?.id !== room.id) {
      this.campaignUI.showDialogue(room.title, ['Follow the light from the previous chamber first.', 'Current objective: ' + this.campaign.objective(floor)]);
      return;
    }
    if (!journey.ready(room)) {
      const remaining = roomTokens(room).filter(token => !journey.defeated.has(token)).length;
      this.campaignUI.showDialogue(room.title + ' · Beacon inactive', [
        ...room.intro,
        `${remaining} guardian targets remain.`,
        'Defeat every target, then come back here to light the beacon.',
      ]);
      return;
    }
    this.finishRoom(room);
  }

  private finishRoom(room: RouteRoom): void {
    if (!this.campaign.journey.complete(room)) return;
    this.player.gold += room.rewardGold;
    for (const id of ['smallHP', 'smallMP'] as const) this.inventory.addConsumable(id, Math.min(2, 99 - this.inventory.consumables[id]));
    this.refreshCampaign();
    this.saveGame();
    this.campaignUI.showDialogue(room.title + ' · Beacon lit', [room.challenge?.success ?? room.intro[room.intro.length - 1], 'Beacon lit · checkpoint saved.', `+${room.rewardGold} gold and travel supplies.`, 'The light points onward. You can visit Mira to compare equipment and use the forge; the dungeon gate returns you to your latest chamber.'], [
      { label: 'Follow the light', onClick: () => {} },
      { label: 'Rest in town', onClick: () => this.transitionTo('outpost', 12) },
    ]);
  }

  private checkpointX(floor: number): number {
    if (this.campaign.hasCleared(floor)) return MAPS[`floor${floor}` as MapId].spawnX;
    const room = this.campaign.journey.active(floor);
    const index = room ? ROUTES[floor].indexOf(room) : ROUTES[floor].length;
    if (index === 0) return MAPS[`floor${floor}` as MapId].spawnX;
    return room ? roomStart(floor, index) + 3 : MAPS[`floor${floor}` as MapId].bossX! - 12;
  }

  private ensureRouteEncounter(): void {
    const floor = MAPS[this.currentMap].floorNumber;
    if (!floor || !this.campaign.state.started) return;
    const room = this.campaign.journey.active(floor);
    if (!room) return;
    const index = ROUTES[floor].indexOf(room), start = roomStart(floor, index);
    const roomWidth = routeRoomWidth(floor);
    const wave = room.waves.findIndex((group, w) => group.some((_, i) => !this.campaign.journey.defeated.has(enemyToken(room, w, i))));
    if (wave < 0) return;
    const roomWaveGap = floor === 1
      ? Math.max(6, Math.floor((roomWidth - 10) / Math.max(1, room.waves.length - 1)))
      : room.waves.length > 2 ? 20 : 33;
    const waveX = start + (floor === 1 ? 6 : 17) + wave * roomWaveGap;
    if (this.player.x < waveX - 13 || this.player.x > start + roomWidth + 8) return;
    room.waves[wave].forEach((id, i) => {
      const token = enemyToken(room, wave, i);
      if (this.campaign.journey.defeated.has(token) || this.spawnedRouteEnemies.has(token)) return;
      this.spawnedRouteEnemies.add(token);
      const enemy = new Enemy(this.renderer.scene, id, waveX + i * 3.4, {
        dealDamageToPlayer: power => this.damagePlayer(power), onDeath: target => this.onEnemyDeath(target),
      }, floor, { passive: floor === 1, respawn: false });
      this.routeEnemies.set(enemy, token); this.enemies.push(enemy);
    });
  }

  private ensureCampaignEncounter(): void {
    const map = MAPS[this.currentMap];
    const floor = map.floorNumber;
    if (!floor || !map.boss) return;
    const guardian = floor === 8 && this.campaign.canChallengeGuardian();
    if (!guardian && (!this.campaign.canChallenge(floor) || this.campaign.hasCleared(floor))) return;
    const id = guardian ? 'abyssGuardian' : map.boss;
    if (this.enemies.some(e => e.monsterId === id)) return;
    const enemy = new Enemy(this.renderer.scene, id, guardian ? map.bossX! - 42 : map.bossX!, {
      dealDamageToPlayer: power => this.damagePlayer(power),
      onDeath: target => this.onEnemyDeath(target),
    }, floor, { passive: map.safe, boss: true, respawn: false });
    this.enemies.push(enemy);
    this.hud.showBanner(guardian ? 'THE LAST GUARDIAN AWAITS' : `${FLOOR_STORIES[floor].bossName.toUpperCase()} AWAITS`);
  }

  private completeEncounter(enemy: Enemy): void {
    const floor = MAPS[this.currentMap].floorNumber;
    const guardian = enemy.monsterId === 'abyssGuardian';
    const first = guardian ? this.campaign.defeatGuardian() : this.campaign.completeFloor(floor);
    if (!first) return;
    this.saveGame(); // Record defeat before the player can close, die or leave.
    const reward = guardian ? GUARDIAN_REWARD_ID : floorRewardId(floor);
    this.campaignUI.showDialogue(guardian ? 'The king’s final gift' : `${FLOOR_STORIES[floor].name} · Freed`, guardian ? GUARDIAN_DEFEATED : FLOOR_STORIES[floor].clear, [
      { label: `Claim guaranteed Tier ${guardian ? 8 : floor} gear`, onClick: () => this.claimCampaignReward(reward) },
      { label: 'Later · saved in journal', onClick: () => this.campaignUI.setOpen(false) },
    ]);
  }

  /** Reward claim and inventory change are one synchronous saved transaction. */
  private claimCampaignReward(id: string): void {
    if (!this.campaign.pendingRewards().includes(id)) return;
    const guardian = id === GUARDIAN_REWARD_ID;
    const tier = guardian ? 8 : Number(id.replace('floor-', ''));
    if (!Number.isInteger(tier) || tier < 1 || tier > 8) return;
    // Reserve enough room for every old equipped item or spare reward first.
    if (this.inventory.equipment.length > 56) {
      this.campaignUI.showDialogue('Reward safely stored', ['Make four spaces in your gear bag, then claim this reward from the Journal.', 'Your encounter, key and reward remain saved. Nothing is lost by returning to town or reloading.'], [
        { label: 'Open inventory', onClick: () => { this.campaignUI.setOpen(false); this.bagMenu.setOpen(true); } },
      ]);
      this.saveGame();
      return;
    }
    let improved = false;
    for (const slot of SLOT_ORDER) {
      const item = createItem(baseItemId(slot, tier), guardian ? 'epic' : 'rare');
      const old = this.equipment.equipped[slot];
      if (EquipmentManager.isUpgrade(item, old, this.equipment.enhance[slot])) {
        if (old) this.inventory.addEquipment(old);
        this.equipment.equipped[slot] = item;
        improved = true;
      } else this.inventory.addEquipment(item);
    }
    // A stronger legacy/rare build gets a real forge improvement instead of a forced downgrade.
    let forgeBonus = '';
    if (!improved) {
      const slot = [...SLOT_ORDER].sort((a, b) => this.equipment.enhance[a] - this.equipment.enhance[b]).find(s => this.equipment.enhance[s] < 10);
      if (slot) { this.equipment.enhance[slot]++; forgeBonus = ` A bonus enhancement was applied to ${slot}.`; }
      else forgeBonus = ' Your maxed build receives the forge-gold reserve instead.';
    }
    const gold = Math.round(500 * tier ** 1.3) + (guardian ? 3000 : 0);
    this.player.gold += gold;
    this.player.gainExp(Math.round(120 * tier ** 1.25));
    this.player.floorRelics?.acquire(`f${tier}`);
    for (const supply of ['smallHP', 'smallMP'] as const) this.inventory.addConsumable(supply, Math.min(4, 99 - this.inventory.consumables[supply]));
    this.campaign.claimReward(id);
    this.player.recomputeStats();
    this.syncEquipmentVisuals();
    this.saveGame();
    this.campaignUI.showDialogue('Reward claimed', [`Four ${guardian ? 'Epic' : 'Rare'} Tier ${tier} pieces received. Useful upgrades were equipped; your previous pieces remain in the bag.`, `+${gold} gold and a guaranteed floor relic.${forgeBonus}`, 'Open Inventory to compare your equipment. Slot enhancements remain with you when changing gear.'], [
      { label: 'Review equipment', onClick: () => { this.campaignUI.setOpen(false); this.bagMenu.setOpen(true); } },
      { label: 'Continue', onClick: () => this.campaignUI.setOpen(false) },
    ]);
    this.refreshCampaign();
  }

  // --- Save / settings ---

  /** Loads raw save data; returns the map to spawn on. */
  private applySave(save: SaveData | null): MapId {
    if (!save) return 'outpost';
    this.player.level = save.player.level;
    this.player.exp = save.player.exp;
    this.player.gold = save.player.gold;
    this.player.stats.str = save.stats.str;
    this.player.stats.agi = save.stats.agi;
    this.player.stats.crit = save.stats.crit;
    this.player.stats.int = save.stats.int;
    this.player.statPoints = save.stats.points;
    this.player.skillPoints = save.skills.points;
    this.player.skillSystemUnlocked = save.skills.unlocked;
    this.player.skillLevels = {
      power: save.skills.power,
      bolt: save.skills.bolt,
      heal: save.skills.heal,
    };
    this.inventory.deserialize(save.bag);
    this.equipment.deserialize(save.loadout);
    this.player.floorRelics?.deserialize(save.floorRelics);
    this.souls = { ...save.souls };
    this.pity = { ...save.pity };
    this.unlockedFloor = save.maps.unlockedFloor;
    this.campaign.deserialize(save.campaign, this.unlockedFloor);
    this.input.setBindings(save.bindings);
    this.autoAttack = save.settings.autoAttack;
    this.autoSkill = save.settings.autoSkill === true;
    this.syncCharmBonus();
    return save.maps.current;
  }

  /** Legacy Phase-1 charm relics stay passive. */
  private syncCharmBonus(): void {
    const inv = this.inventory.relics;
    this.player.setRelicBonus({
      str: inv.str ? RELIC_DEFS.str.statBonus : 0,
      agi: inv.agi ? RELIC_DEFS.agi.statBonus : 0,
      crit: inv.crit ? RELIC_DEFS.crit.statBonus : 0,
      int: inv.int ? RELIC_DEFS.int.statBonus : 0,
    });
  }

  /** Sync each equipped slot and its enhancement into the character's appearance. */
  private syncEquipmentVisuals(): void {
    const w = this.equipment.equipped.weapon;
    const wTier = w ? BASE_ITEMS[w.baseId].tier : 1;
    this.player.weaponTier = wTier;
    this.player.appearance.setWeaponTier(wTier);
    const a = this.equipment.equipped.armor;
    const aTier = a ? BASE_ITEMS[a.baseId].tier : 0;
    this.player.armorTier = aTier;
    this.player.appearance.setArmorTier(aTier);
    const boots = this.equipment.equipped.boots;
    this.player.appearance.setBootsTier(boots ? BASE_ITEMS[boots.baseId].tier : 0);
    this.player.appearance.setEnhancement(
      w ? this.equipment.enhance.weapon : 0,
      a ? this.equipment.enhance.armor : 0,
    );
  }

  /** Persist progress now; returns a status line for the pause menu. */
  private saveGame(): string {
    const ok = storeSave({
      version: SAVE_VERSION,
      savedAt: Date.now(),
      player: {
        level: this.player.level,
        exp: Math.floor(this.player.exp),
        gold: Math.floor(this.player.gold),
      },
      stats: { ...this.player.stats, points: this.player.statPoints },
      skills: { points: this.player.skillPoints, unlocked: this.player.skillSystemUnlocked, ...this.player.skillLevels },
      bag: this.inventory.serialize(),
      loadout: this.equipment.serialize(),
      floorRelics: this.player.floorRelics
        ? this.player.floorRelics.serialize()
        : { owned: [], active: [null, null, null] },
      souls: { ...this.souls },
      pity: { ...this.pity },
      maps: { current: this.currentMap, unlockedFloor: this.unlockedFloor },
      campaign: this.campaign.serialize(),
      settings: { autoAttack: this.autoAttack, autoSkill: this.autoSkill },
      bindings: this.input.getBindings(),
    });
    return ok ? `Saved ✓ ${new Date().toLocaleTimeString()}` : 'Save failed (storage unavailable)';
  }

  private setPaused(paused: boolean): void {
    if (paused === this.pauseMenu.isOpen()) return;
    this.input.clearQueues();
    this.autoWantsAttack = false;
    this.autoPending = null;
    this.statsMenu.setOpen(false);
    this.bagMenu.setOpen(false);
    this.shopMenu.setOpen(false);
    this.gateMenu.setOpen(false);
    this.campaignUI.setOpen(false);
    this.pauseMenu.setOpen(paused);
    if (paused) this.saveGame(); // silent autosave whenever the game is paused
  }

  // --- Map switching ---

  private canEnterMapDirectly(mapId: MapId): boolean {
    if (mapId === 'outpost') return true;
    const targetFloor = MAPS[mapId].floorNumber;
    const currentFloor = MAPS[this.currentMap].floorNumber;
    if (this.currentMap !== 'outpost' && targetFloor === currentFloor + 1) {
      return this.campaign.hasCleared(currentFloor);
    }
    return this.campaign.canEnter(targetFloor);
  }

  private transitionTo(mapId: MapId, spawnX?: number): void {
    this.hud.fadeThrough(() => this.loadMap(mapId, spawnX));
  }

  private clearFieldFx(): void {
    for (const fx of this.slashes) {
      this.renderer.scene.remove(fx.mesh);
      fx.mesh.geometry.dispose();
      fx.mesh.material.dispose();
    }
    this.slashes.length = 0;
    for (const p of this.particles) {
      this.renderer.scene.remove(p.mesh);
      p.mesh.material.dispose();
    }
    this.particles.length = 0;
    for (const s of this.shockwaves) {
      this.renderer.scene.remove(s.mesh);
      s.mesh.geometry.dispose();
      s.mesh.material.dispose();
    }
    this.shockwaves.length = 0;
    for (const r of this.rainSwords) {
      this.renderer.scene.remove(r.mesh);
      r.mesh.geometry.dispose();
      (r.mesh.material.map as THREE.Texture | null)?.dispose();
      r.mesh.material.dispose();
    }
    this.rainSwords.length = 0;
    this.scheduled.length = 0;
  }

  private loadMap(mapId: MapId, spawnX?: number, firstLoad = false): void {
    if (!this.canEnterMapDirectly(mapId)) mapId = 'outpost';
    this.campaignWorld?.dispose();
    this.hazards?.dispose();
    for (const npc of this.townspeople) npc.dispose();
    this.townspeople.length = 0;
    for (const e of this.enemies) e.dispose();
    this.enemies.length = 0;
    this.routeEnemies = new WeakMap();
    this.spawnedRouteEnemies.clear();
    this.pickups.clear();
    this.clearFieldFx();
    if (this.mira) {
      this.mira.dispose();
      this.mira = null;
    }
    if (this.floor) this.floor.dispose();

    const def = MAPS[mapId];
    this.background.setTheme(def.theme);
    this.currentMap = mapId;
    this.camera.setMapWidth(def.width);
    this.floor = new DungeonFloor(this.renderer.scene, {
      width: def.width,
      platforms: def.platforms,
      theme: def.theme,
      hutX: def.hutX,
      gateX: def.gateX,
      gateLabel: mapId === 'outpost' ? 'FORGOTTEN RUINS' : undefined,
      floorNumber: def.floorNumber,
    });
    this.campaignWorld = new CampaignWorld(this.renderer.scene, def, this.campaign.state.completed);
    this.background.setRestored(this.campaign.state.completed);
    this.hazards = new EncounterHazards(this.renderer.scene, def);

    if (mapId === 'outpost') {
      this.mira = new NPC(this.renderer.scene, { id: 'mira', name: 'Mira', title: 'Merchant', x: def.merchantX! });
      if (this.campaign.state.completed) {
        this.townspeople.push(new NPC(this.renderer.scene, { id: 'pip', name: 'Pip', title: 'Welcome home!', x: 20.5 }));
        this.townspeople.push(new NPC(this.renderer.scene, { id: 'orin', name: 'Orin', title: 'The light is back!', x: 23 }));
      }
    }

    const px = Math.min(def.width - 1, Math.max(1, spawnX ?? (def.floorNumber ? this.checkpointX(def.floorNumber) : def.spawnX)));
    this.player.x = px;
    this.player.y = GameConfig.groundY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.hp = this.player.maxHP;
    this.player.mp = this.player.maxMP;
    this.deathTimer = -1;

    for (const s of def.enemies) {
      this.enemies.push(
        new Enemy(this.renderer.scene, s.type, s.x, {
          dealDamageToPlayer: (power) => this.damagePlayer(power),
          onDeath: (enemy) => this.onEnemyDeath(enemy),
        }, def.floorNumber, { passive: def.safe }),
      );
    }
    // Completed chambers become optional farming grounds without repeating story rewards.
    if (def.floorNumber > 1 && this.campaign.hasCleared(def.floorNumber)) {
      ROUTES[def.floorNumber].forEach((room, index) => {
        room.waves[0].forEach((id, i) => this.enemies.push(new Enemy(this.renderer.scene, id, roomStart(def.floorNumber, index) + 18 + i * 5, {
          dealDamageToPlayer: power => this.damagePlayer(power), onDeath: enemy => this.onEnemyDeath(enemy),
        }, def.floorNumber, { respawn: true })));
      });
    }

    this.currentZone = '';
    this.camera.snap(px);
    const label = document.getElementById('floor-label');
    if (label) label.textContent = def.label;
    if (!firstLoad) this.hud.showBanner(def.label.toUpperCase());
    this.refreshCampaign();
    if (!firstLoad && def.floorNumber && !this.campaign.hasCleared(def.floorNumber)) {
      this.campaignUI.showDialogue(def.label, FLOOR_STORIES[def.floorNumber].arrival);
    }
    if (!firstLoad) this.saveGame();
  }

  // --- HUD helpers ---

  private initSkillBar(): void {
    this.hud.initSkillBar(
      SKILL_ORDER.map((id) => ({
        id, name: SKILL_DEFS[id].name, key: this.skillKeyLabel(id), manaCost: SKILL_DEFS[id].manaCost,
      })),
    );
  }

  private skillKeyLabel(id: SkillId): string {
    const action = id === 'power' ? 'skill1' : id === 'bolt' ? 'skill2' : 'skill3';
    const list = this.input.getBindings()[action];
    return list[0] ? prettyKey(list[0]) : '?';
  }

  private refreshHint(): void {
    const b = this.input.getBindings();
    updateHudActionKeys(b);
    const first = (list: string[]): string => (list[0] ? prettyKey(list[0]) : '—');
    this.hud.setHint(
      `${first(b.moveLeft)} / ${first(b.moveRight)} move • ${first(b.jump)} jump • ` +
        `${first(b.attack)} / Click attack • ${first(b.interact)} talk/enter` +
        `${this.autoAttack ? ' • AUTO-ATK ON' : ''}`,
    );
    this.hud.setSkillKeys(SKILL_ORDER.map((id) => this.skillKeyLabel(id)));
  }

  /** Face + queue an attack when a monster is in melee range (toggleable assist). */
  private applyAutoAttack(): void {
    this.autoWantsAttack = false;
    if (!this.autoAttack || !this.player.alive || this.input.moveAxis !== 0) return;
    let best: Enemy | null = null;
    let bestDist = Infinity;
    for (const enemy of this.enemies) {
      if (!enemy.isAlive()) continue;
      const adx = Math.abs(enemy.getCenterX() - this.player.x);
      const dy = Math.abs(enemy.getCenterY() - (this.player.y + 0.8));
      if (
        adx <= BalanceConfig.attackRange + 0.35 &&
        dy <= BalanceConfig.attackArcHeight + 0.5 &&
        adx < bestDist
      ) {
        bestDist = adx;
        best = enemy;
      }
    }
    if (best) {
      this.player.facing = best.getCenterX() >= this.player.x ? 1 : -1;
      this.autoWantsAttack = true;
    }
  }

  // --- Combat wiring ---

  private tryPlayerAttack(): void {
    if (!this.player.canAttack()) return;
    this.player.markAttacked();
    this.player.markCombat();
    this.spawnSlash(0.7, 0.65);

    meleeAttack({
      attackerX: this.player.x,
      attackerYFeet: this.player.y,
      attackerAttack: this.player.attack,
      attackerCritChance: this.player.critChance,
      attackerCritMult: this.player.critDamageMult,
      facing: this.player.facing,
      range: BalanceConfig.attackRange,
      arcHeight: BalanceConfig.attackArcHeight,
      targets: this.enemies,
      onHit: (target, damage, isCrit) => {
        this.spawnDamageText(target, damage, isCrit);
        const leech = damage * (this.player.lifesteal + (this.player.vampiric ? 0.02 : 0));
        if (leech >= 1 && this.player.alive) {
          this.player.hp = Math.min(this.player.maxHP, this.player.hp + Math.round(leech));
        }
      },
    });
  }

  private spawnDamageText(target: CombatTarget, damage: number, isCrit: boolean): void {
    this.hud.spawnFloatingText(
      target.getCenterX(),
      target.getCenterY() + 0.7,
      isCrit ? `${damage} CRIT!` : String(damage),
      isCrit ? 'crit' : 'enemy-damage',
    );
  }

  private damagePlayer(attackPower: number): void {
    if (MAPS[this.currentMap].safe || this.campaignUI.isOpen()) return;
    if (!this.player.alive) return;
    this.player.markCombat();
    if (Math.random() < this.player.dodgeChance) {
      this.hud.spawnFloatingText(this.player.x, this.player.y + 1.8, 'MISS', 'info');
      return;
    }
    // Enemies don't crit → critChance 0.
    const { damage } = calculateDamage(attackPower, this.player.defense, 0);
    const taken = this.player.takeDamage(damage);
    if (taken > 0) {
      this.hud.spawnFloatingText(this.player.x, this.player.y + 1.8, `-${taken}`, 'player-damage');
    }
  }

  private onEnemyDeath(enemy: Enemy): void {
    if (MAPS[this.currentMap].floorNumber === 0) {
      this.hud.spawnFloatingText(this.player.x, this.player.y + 2.2, 'Basic attack practiced · Speak with Mira', 'info');
      return;
    }
    const wasUnlocked = this.player.skillSystemUnlocked;
    const oldSkillPoints = this.player.skillPoints;
    const gold = Math.max(1, Math.round(enemy.goldReward * this.player.goldGainMult));
    this.player.gold += gold;
    this.hud.spawnFloatingText(enemy.x, enemy.y + 1.4, `+${gold} GOLD`, 'gold');
    this.hud.spawnFloatingText(enemy.x, enemy.y + 1.0, `+${enemy.expReward} EXP`, 'exp');
    if (this.player.gainExp(enemy.expReward)) {
      this.hud.showBanner(`LEVEL UP!  Lv ${this.player.level}`);
      this.hud.spawnFloatingText(
        this.player.x,
        this.player.y + 2.2,
        `Stat points ready (C)${this.player.skillPoints > oldSkillPoints ? ' • Skill point ready' : ''}`,
        'info',
      );
    }
    if (!wasUnlocked && this.player.skillSystemUnlocked) {
      this.hud.showSkillUnlock(() => this.openLearning());
      this.saveGame();
    }
    const floorNumber = MAPS[this.currentMap].floorNumber;
    if (enemy.isBoss) this.completeEncounter(enemy);
    else {
      this.campaign.recordKill(floorNumber);
      const token = this.routeEnemies.get(enemy);
      if (token) this.campaign.journey.record(token);
    }
    this.rollDrops(enemy);
    this.refreshCampaign();
    if (this.routeEnemies.has(enemy)) this.saveGame();
  }

  private rollDropSlot(): Slot {
    const w = EquipmentDrop.slotWeights;
    const r = Math.random();
    let acc = 0;
    for (const s of SLOT_ORDER) {
      acc += w[s];
      if (r <= acc) return s;
    }
    return 'weapon';
  }

  private rollRarity(): Rarity {
    const c = EquipmentDrop.rarityChances;
    const r = Math.random();
    let acc = 0;
    const order: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    for (const rarity of order) {
      acc += c[rarity];
      if (r <= acc) return rarity;
    }
    return 'common';
  }

  /** Monster drop rolls → physical pickups in the world. */
  private rollDrops(enemy: Enemy): void {
    const x = PickupManager.dropX(enemy.x, MAPS[this.currentMap].width);
    for (const id of Object.keys(PotionDrops) as Array<keyof typeof PotionDrops>) {
      if (chance(PotionDrops[id])) this.pickups.dropConsumable(id, x, enemy.y);
    }
    if (chance(EquipmentDrop.chance)) {
      const item = createItem(baseItemId(this.rollDropSlot(), Math.max(1, MAPS[this.currentMap].floorNumber)), this.rollRarity());
      this.pickups.dropEquipment(item, x, enemy.y);
      if (item.rarity === 'legendary') this.legendaryMoment(itemName(item), 'LEGENDARY DROP');
    }
    if (MAPS[this.currentMap].floorNumber > 0 && chance(FLOOR_RELIC_DROP)) {
      const id = `f${MAPS[this.currentMap].floorNumber}`;
      this.pickups.dropFloorRelic(id, x, enemy.y);
      this.legendaryMoment(FLOOR_RELICS[id].name, 'RARE RELIC FOUND');
    }
  }

  /** Legendary / relic drop ceremony: brief slow-mo + banner (combat never stops). */
  private legendaryMoment(_name: string, kind: string): void {
    this.hitstopT = 0.22;
    this.hud.showBanner(`✦ ${kind} ✦`);
  }

  private onPickupCollected(pickup: Pickup): boolean {
    // Keep a deliberate drop on the ground until the bag is closed, even if
    // movement or knockback brings the player back within collection range.
    if (pickup.playerDropped && this.bagMenu.isOpen()) return false;
    const px = pickup.x;
    const py = pickup.baseY + 0.6;
    if (pickup.kind === 'consumable' && pickup.consumableId) {
      if (!this.inventory.addConsumable(pickup.consumableId)) {
        this.hud.spawnFloatingText(px, py, 'Stack full — make room to collect', 'info');
        return false;
      }
      this.hud.spawnFloatingText(px, py, `+1 ${CONSUMABLES[pickup.consumableId].name}`, 'heal');
    } else if (pickup.kind === 'equipment' && pickup.item) {
      if (pickup.playerDropped) {
        if (!this.inventory.addEquipment(pickup.item)) {
          this.hud.spawnFloatingText(px, py, 'Bag full — make room to collect', 'info');
          return false;
        }
        this.hud.spawnFloatingText(px, py, `${itemName(pickup.item)} returned to bag`, 'info');
      } else {
        this.collectEquipment(pickup.item, px, py);
      }
    } else if (pickup.kind === 'floorRelic' && pickup.floorRelicId) {
      const id = pickup.floorRelicId;
      if (this.player.floorRelics?.acquire(id)) {
        this.player.recomputeStats();
        this.hud.spawnFloatingText(px, py, `${FLOOR_RELICS[id].name} — ${FLOOR_RELICS[id].description}`, 'crit');
      } else {
        this.player.gold += RELIC_ECHO_GOLD;
        this.hud.spawnFloatingText(px, py, `Relic echo → +${RELIC_ECHO_GOLD} GOLD`, 'gold');
      }
    }
    this.bagMenu.refresh();
    if (pickup.playerDropped) this.saveGame();
    return true;
  }

  /** Power-compared auto-equip (2% margin), else bagged, else sold. */
  private collectEquipment(item: ItemInstance, px: number, py: number): void {
    const slot = itemSlot(item);
    const equipped = this.equipment.equipped[slot];
    if (EquipmentManager.isUpgrade(item, equipped, this.equipment.enhance[slot])) {
      if (equipped && !this.inventory.addEquipment(equipped)) {
        this.player.gold += itemSellValue(equipped);
      }
      this.equipment.equipped[slot] = item;
      this.player.recomputeStats();
      this.syncEquipmentVisuals();
      this.hud.spawnFloatingText(px, py, `${item.rarity.toUpperCase()} ${itemName(item)} EQUIPPED!`, 'gold');
    } else if (!this.inventory.addEquipment(item)) {
      const price = itemSellValue(item);
      this.player.gold += price;
      this.hud.spawnFloatingText(px, py, `Bag full → +${price} GOLD`, 'gold');
    } else {
      this.hud.spawnFloatingText(px, py, `${item.rarity.toUpperCase()} ${itemName(item)} (BAG)`, 'gold');
    }
  }

  private equipItem(uid: number): void {
    const item = this.inventory.findEquipment(uid);
    if (!item) return;
    const slot = itemSlot(item);
    const current = this.equipment.equipped[slot];
    this.inventory.removeEquipment(uid);
    if (current) this.inventory.addEquipment(current);
    this.equipment.equipped[slot] = item;
    this.player.recomputeStats();
    this.syncEquipmentVisuals();
    this.hud.spawnFloatingText(this.player.x, this.player.y + 2.0, `${itemName(item)} EQUIPPED!`, 'gold');
  }

  private sellEquipment(uid: number): void {
    const item = this.inventory.findEquipment(uid);
    if (!item) return;
    if (
      (item.rarity === 'epic' || item.rarity === 'legendary') &&
      !window.confirm(`Sell ${itemName(item)} (${item.rarity.toUpperCase()})?`)
    ) {
      return;
    }
    const removed = this.inventory.removeEquipment(uid);
    if (removed) {
      this.player.gold += itemSellValue(removed);
      this.bagMenu.refresh();
    }
  }

  private sellConsumable(id: ConsumableId): void {
    const gained = this.inventory.sellConsumable(id);
    if (gained > 0) {
      this.player.gold += gained;
      this.bagMenu.refresh();
    }
  }

  /** Drop on a reachable surface beside the player, facing away from the stage edge. */
  private bagDropPosition(): { x: number; y: number } {
    const width = MAPS[this.currentMap].width;
    const forward = this.player.x + this.player.facing * 2.2;
    const x = Math.max(1, Math.min(width - 1,
      forward >= 1 && forward <= width - 1 ? forward : this.player.x - this.player.facing * 2.2));
    return { x, y: this.floor.surfaceYAt(x, this.player.y + 0.1) };
  }

  private dropBagConsumable(id: ConsumableId): void {
    if (!this.player.alive || !this.inventory.useConsumable(id)) return;
    const pos = this.bagDropPosition();
    this.pickups.dropConsumable(id, pos.x, pos.y, true);
    this.saveGame();
    this.hud.spawnFloatingText(pos.x, pos.y + 1.4, `Dropped 1 ${CONSUMABLES[id].name}`, 'info');
  }

  private dropBagEquipment(uid: number): void {
    if (!this.player.alive) return;
    const item = this.inventory.removeEquipment(uid);
    if (!item) return;
    const pos = this.bagDropPosition();
    this.pickups.dropEquipment(item, pos.x, pos.y, true);
    this.saveGame();
    this.hud.spawnFloatingText(pos.x, pos.y + 1.4, `Dropped ${itemName(item)}`, 'info');
  }

  private discardBagConsumable(id: ConsumableId): void {
    if (!this.inventory.useConsumable(id)) return;
    this.saveGame();
    this.hud.spawnFloatingText(this.player.x, this.player.y + 1.8, `Discarded 1 ${CONSUMABLES[id].name}`, 'info');
  }

  private discardBagEquipment(uid: number): void {
    const item = this.inventory.removeEquipment(uid);
    if (!item) return;
    this.saveGame();
    this.hud.spawnFloatingText(this.player.x, this.player.y + 1.8, `Discarded ${itemName(item)}`, 'info');
  }

  private healPlayer(fraction: number): number {
    const amount = Math.round(this.player.maxHP * fraction);
    this.player.hp = Math.min(this.player.maxHP, this.player.hp + amount);
    return amount;
  }

  private restoreMana(fraction: number): number {
    const amount = Math.round(this.player.maxMP * fraction);
    this.player.mp = Math.min(this.player.maxMP, this.player.mp + amount);
    return amount;
  }

  private useConsumable(id: ConsumableId): void {
    if (!this.player.alive || this.pauseMenu.isOpen()) return;
    if (id === 'returnStone') {
      if (this.currentMap !== 'outpost') {
        if (!this.inventory.useConsumable(id)) return;
        this.transitionTo('outpost', MAPS.outpost.gateX! - 2);
      } else {
        this.hud.spawnFloatingText(this.player.x, this.player.y + 1.8, 'Already in town', 'info');
      }
      this.bagMenu.refresh();
      return;
    }
    if (id === 'tonic') {
      if (this.player.tonicTime > 0 || !this.inventory.useConsumable(id)) return;
      this.player.useTonic();
      this.hud.spawnFloatingText(this.player.x, this.player.y + 1.8, 'TONIC! +10% ATK', 'gold');
      this.bagMenu.refresh();
      return;
    }
    if (id === 'speedTonic') {
      if (this.player.speedTonicTime > 0 || !this.inventory.useConsumable(id)) return;
      this.player.useSpeedTonic();
      this.hud.spawnFloatingText(this.player.x, this.player.y + 1.8, 'SWIFT! +10% MOVE', 'gold');
      this.bagMenu.refresh();
      return;
    }
    if (id === 'campMeal') {
      if (this.player.inCombat) {
        this.hud.spawnFloatingText(this.player.x, this.player.y + 1.8, 'Too dangerous to eat!', 'info');
        return;
      }
      if (this.player.hp >= this.player.maxHP && this.player.mp >= this.player.maxMP) return;
      if (!this.inventory.useConsumable(id)) return;
      const hp = this.healPlayer(0.6);
      const mp = this.restoreMana(0.6);
      this.hud.spawnFloatingText(this.player.x, this.player.y + 1.8, `+${hp} HP +${mp} MP`, 'heal');
      this.bagMenu.refresh();
      return;
    }
    if (id === 'ironShard') {
      this.hud.spawnFloatingText(this.player.x, this.player.y + 1.8, 'Saved for future recipes', 'info');
      return;
    }
    if (id === 'forgePowder') {
      if (this.equipment.forgeDiscount) {
        this.hud.spawnFloatingText(this.player.x, this.player.y + 1.8, 'Powder already active', 'info');
        return;
      }
      if (!this.inventory.useConsumable(id)) return;
      this.equipment.forgeDiscount = true;
      this.hud.spawnFloatingText(this.player.x, this.player.y + 1.8, 'POWDER BANKED: next enhance -15%', 'gold');
      this.bagMenu.refresh();
      return;
    }
    const isHP = id === 'smallHP' || id === 'largeHP';
    const fraction = id === 'smallHP' ? 0.25 : id === 'largeHP' ? 0.5 : id === 'smallMP' ? 0.3 : 0.6;
    if (isHP && this.player.hp >= this.player.maxHP) return;
    if (!isHP && this.player.mp >= this.player.maxMP) return;
    if (!this.inventory.useConsumable(id)) return;
    const amount = isHP ? this.healPlayer(fraction) : this.restoreMana(fraction);
    this.hud.spawnFloatingText(
      this.player.x,
      this.player.y + 1.8,
      `+${amount}${isHP ? '' : ' MP'}`,
      isHP ? 'heal' : 'mp',
    );
    this.bagMenu.refresh();
  }

  /** Hotkey 1: best HP potion. Hotkey 2: best MP potion. */
  private useBestPotion(hp: boolean): void {
    const ids: ConsumableId[] = hp ? ['largeHP', 'smallHP'] : ['largeMP', 'smallMP'];
    for (const id of ids) {
      if (this.inventory.consumables[id] > 0) {
        this.useConsumable(id);
        return;
      }
    }
  }

  // --- Skills ---

  private tryCastSkill(id: SkillId): void {
    const def = SKILL_DEFS[id];
    const level = this.player.skillLevels[id];
    if (!this.player.skillSystemUnlocked || level <= 0 || this.campaignUI.isOpen()) return;
    if (!this.player.alive || this.skillCds[id] > 0) return;
    if (id === 'heal' && this.player.berserkActive) return; // already raging
    if (!this.player.spendMana(def.manaCost)) {
      this.hud.spawnFloatingText(this.player.x, this.player.y + 2.0, 'NO MANA', 'info');
      return;
    }
    this.skillCds[id] = def.cooldown;
    if (this.currentMap === 'floor1') {
      this.campaign.interact('f1-practice');
      this.refreshCampaign();
    }
    this.player.markCombat();
    if (this.player.manaEcho && Math.random() < 0.15) {
      const refund = Math.round(def.manaCost / 2);
      this.player.mp = Math.min(this.player.maxMP, this.player.mp + refund);
      this.hud.spawnFloatingText(this.player.x, this.player.y + 2.3, `MANA ECHO +${refund}`, 'mp');
    }
    if (id === 'power') {
      this.castDashSlash(level);
    } else if (id === 'bolt') {
      this.castSwordRain(level);
    } else {
      this.castBerserk();
    }
  }

  /** Skill 1: dash forward, then land a triple slash. */
  private castDashSlash(level: number): void {
    this.player.startDash(this.player.facing);
    this.player.appearance.playSwing();
    this.camera.shake(0.2);
    this.spawnBurst(this.player.x, this.player.y + 0.9, 0xffffff, 8, 4, 0.35, 0.3);
    const mults = dashSlashMults(level);
    [0.1, 0.22, 0.34].forEach((delay, i) => {
      this.after(delay, () => {
        if (!this.player.alive) return;
        this.player.appearance.playSwing();
        this.spawnSlash(i === 2 ? 1.6 : 1.1);
        meleeAttack({
          attackerX: this.player.x,
          attackerYFeet: this.player.y,
          attackerAttack: this.player.attack * mults[i] * this.player.skillDamageMult,
          attackerCritChance: this.player.critChance,
          attackerCritMult: this.player.critDamageMult,
          facing: this.player.facing,
          range: BalanceConfig.attackRange + 0.4,
          arcHeight: BalanceConfig.attackArcHeight,
          targets: this.enemies,
          onHit: (target, damage, isCrit) => this.spawnDamageText(target, damage, isCrit),
        });
        if (i === 2) {
          this.camera.shake(0.3);
          this.spawnBurst(
            this.player.x + this.player.facing * 1.4,
            this.player.y + 0.9,
            0xffe45e,
            10,
            5,
            0.4,
            0.32,
          );
        }
      });
    });
  }

  /** Skill 2: swords rain over a wide area for (STR + INT) damage. */
  private castSwordRain(level: number): void {
    const facing = this.player.facing;
    const centerX = this.player.x + facing * 4;
    const halfWidth = 3.2;
    // Staggered falling swords (visuals use your equipped sword!).
    for (let i = 0; i < 9; i += 1) {
      const sx = centerX + (Math.random() * 2 - 1) * halfWidth;
      this.after(i * 0.06, () => this.spawnRainSword(sx));
    }
    // Damage lands once the sky starts falling.
    this.after(0.35, () => {
      const raw =
        (this.player.effStat('str') + this.player.effStat('int')) *
        swordRainMult(level) *
        this.player.skillDamageMult;
      const base = Math.max(1, Math.round(raw));
      for (const enemy of this.enemies) {
        if (!enemy.isAlive()) continue;
        const inX = Math.abs(enemy.getCenterX() - centerX) <= halfWidth + 0.5;
        const inY = Math.abs(enemy.getCenterY() - (this.player.y + 0.8)) <= 3;
        if (!inX || !inY) continue;
        const { damage, isCrit } = calculateDamage(
          base,
          enemy.getDefense(),
          this.player.critChance,
          this.player.critDamageMult,
        );
        enemy.applyHit(damage, isCrit, facing);
        this.spawnDamageText(enemy, damage, isCrit);
      }
    });
    this.camera.shake(0.5);
    this.hud.flashScreen('255,255,255', 0.45);
    this.spawnShockwave(centerX, this.player.y + 0.5, 0x9ecbff, 4);
    this.player.appearance.playSwing();
  }

  /** Skill 3: 15s berserk — body burns red, combat stats surge. */
  private castBerserk(): void {
    this.player.setBerserk(true, BERSERK_DURATION);
    this.camera.shake(0.4);
    this.hud.flashScreen('224,60,60', 0.5);
    this.spawnShockwave(this.player.x, this.player.y + 0.9, 0xe03c3c, 3.2);
    this.spawnBurst(this.player.x, this.player.y + 1.0, 0xff5050, 16, 5, 0.6, 0.4);
    this.hud.spawnFloatingText(this.player.x, this.player.y + 2.2, 'BERSERK!', 'crit');
  }

  /** Run a callback after a delay (respects pause — frozen while paused). */
  private after(delay: number, fn: () => void): void {
    this.scheduled.push({ t: delay, fn });
  }

  private updateScheduled(dt: number): void {
    for (let i = this.scheduled.length - 1; i >= 0; i -= 1) {
      const s = this.scheduled[i];
      s.t -= dt;
      if (s.t <= 0) {
        this.scheduled.splice(i, 1);
        s.fn();
      }
    }
  }

  private spawnRainSword(x: number): void {
    const mat = new THREE.MeshBasicMaterial({
      map: makeWeaponTexture(this.player.weaponTier),
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.2), mat);
    mesh.position.set(x, this.player.y + 7 + Math.random() * 2, Z_LAYERS.effect);
    mesh.rotation.z = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
    this.renderer.scene.add(mesh);
    this.rainSwords.push({ mesh, vy: -15, landed: -1 });
  }

  private updateRainSwords(dt: number): void {
    for (let i = this.rainSwords.length - 1; i >= 0; i -= 1) {
      const r = this.rainSwords[i];
      if (r.landed < 0) {
        r.mesh.position.y += r.vy * dt;
        if (r.mesh.position.y <= GameConfig.groundY + 0.5) {
          r.mesh.position.y = GameConfig.groundY + 0.5;
          r.landed = 0.35;
          this.spawnBurst(r.mesh.position.x, 0.3, 0xcfd8e3, 3, 2, 0.25, 0.22);
        }
      } else {
        r.landed -= dt;
        r.mesh.material.opacity = Math.max(0, r.landed / 0.35);
        if (r.landed <= 0) {
          this.renderer.scene.remove(r.mesh);
          r.mesh.geometry.dispose();
          (r.mesh.material.map as THREE.Texture | null)?.dispose();
          r.mesh.material.dispose();
          this.rainSwords.splice(i, 1);
        }
      }
    }
  }

  /** Queue an automated skill cast (0.2s human-like delay; manual stays better). */
  private queueAutoSkill(id: SkillId): void {
    if (!this.player.skillSystemUnlocked || this.player.skillLevels[id] <= 0) return;
    if (!this.autoPending) this.autoPending = { id, t: BalanceConfig.autoSkillDelay };
  }

  /** Auto-cast assist: open with Berserk, Dash Slash up close, Sword Rain at range. */
  private applyAutoSkill(): void {
    if (!this.autoSkill || !this.player.alive || !this.player.skillSystemUnlocked || this.autoPending) return;
    let best: Enemy | null = null;
    let bestDist = Infinity;
    for (const enemy of this.enemies) {
      if (!enemy.isAlive()) continue;
      const adx = Math.abs(enemy.getCenterX() - this.player.x);
      const dy = Math.abs(enemy.getCenterY() - (this.player.y + 0.8));
      if (adx <= 8.5 && dy <= 2.5 && adx < bestDist) {
        bestDist = adx;
        best = enemy;
      }
    }
    if (!best) return;
    if (this.input.moveAxis === 0) {
      this.player.facing = best.getCenterX() >= this.player.x ? 1 : -1;
    }
    if (
      this.player.skillLevels.heal > 0 && !this.player.berserkActive &&
      this.skillCds.heal <= 0 &&
      bestDist <= 6 &&
      this.player.mp >= SKILL_DEFS.heal.manaCost
    ) {
      this.queueAutoSkill('heal');
      return;
    }
    if (
      this.player.skillLevels.power > 0 && this.skillCds.power <= 0 &&
      bestDist <= BalanceConfig.attackRange + 1.6 &&
      this.player.mp >= SKILL_DEFS.power.manaCost
    ) {
      this.queueAutoSkill('power');
    } else if (this.player.skillLevels.bolt > 0 && this.skillCds.bolt <= 0 && this.player.mp >= SKILL_DEFS.bolt.manaCost) {
      this.queueAutoSkill('bolt');
    }
  }

  private toggleAutoSkill(): void {
    this.autoSkill = !this.autoSkill;
    this.hud.setAutoSkill(this.autoSkill);
  }

  private spawnSlash(scale = 1, opacity = 1): void {
    const mat = new THREE.MeshBasicMaterial({
      map: this.slashTexture,
      transparent: true,
      depthWrite: false,
      opacity,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.7 * scale, 1.7 * scale), mat);
    mesh.position.set(
      this.player.x + this.player.facing * 1.2,
      this.player.y + 0.9,
      Z_LAYERS.effect,
    );
    mesh.scale.x = this.player.facing;
    mesh.rotation.z = this.player.facing > 0 ? -0.4 : Math.PI + 0.4;
    this.renderer.scene.add(mesh);
    this.slashes.push({ mesh, life: 0, ttl: 0.18, opacity });
  }

  /** Particle burst tinted via material color (shared glow texture). */
  private spawnBurst(
    x: number,
    y: number,
    color: number,
    count: number,
    speed: number,
    ttl = 0.5,
    size = 0.35,
    grav = -6,
  ): void {
    for (let i = 0; i < count; i += 1) {
      const mat = new THREE.MeshBasicMaterial({
        map: this.particleTexture,
        color,
        transparent: true,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      mesh.position.set(x, y, Z_LAYERS.effect);
      mesh.scale.setScalar(size * (0.7 + Math.random() * 0.6));
      this.renderer.scene.add(mesh);
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v + speed * 0.3,
        life: 0,
        ttl: ttl * (0.7 + Math.random() * 0.6),
        grav,
      });
    }
  }

  private spawnShockwave(x: number, y: number, color: number, maxR = 3, ttl = 0.35): void {
    const mat = new THREE.MeshBasicMaterial({
      map: this.ringTexture,
      color,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.position.set(x, y, Z_LAYERS.effect);
    this.renderer.scene.add(mesh);
    this.shockwaves.push({ mesh, life: 0, ttl, maxR });
  }

  private updateFx(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.ttl) {
        this.renderer.scene.remove(p.mesh);
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.grav * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.material.opacity = 1 - p.life / p.ttl;
    }
    for (let i = this.shockwaves.length - 1; i >= 0; i -= 1) {
      const s = this.shockwaves[i];
      s.life += dt;
      if (s.life >= s.ttl) {
        this.renderer.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.mesh.material.dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }
      const t = s.life / s.ttl;
      const r = 0.3 + (s.maxR - 0.3) * (1 - Math.pow(1 - t, 2));
      s.mesh.scale.set(r * 2, r * 2, 1);
      s.mesh.material.opacity = 1 - t;
    }
  }

  // --- Interactables ---

  private updateInteract(): void {
    const map = MAPS[this.currentMap];
    const nearMira = this.mira !== null && Math.abs(this.player.x - this.mira.x) < INTERACT_RADIUS;
    const nearGate = map.gateX !== undefined && Math.abs(this.player.x - map.gateX) < INTERACT_RADIUS + 0.6;
    const nearNext = map.nextGateX !== undefined && Math.abs(this.player.x - map.nextGateX) < INTERACT_RADIUS + 0.6;
    const station = map.stations?.filter(s => Math.abs(this.player.x - s.x) < INTERACT_RADIUS && Math.abs(this.player.y - (s.y ?? 0)) < (s.id.includes('-note-') ? .55 : 1.3)).sort((a, b) => Math.abs(this.player.x - a.x) - Math.abs(this.player.x - b.x))[0];
    const modalOpen = this.anyPanelOpen();
    const nextFloor = map.floorNumber + 1;
    const canAdvance = map.floorNumber > 0 && map.floorNumber < 8 && this.canEnterMapDirectly(`floor${nextFloor}` as MapId);
    if (!modalOpen && this.player.alive) {
      if (nearMira) this.hud.showPrompt('Press E — Talk to Mira');
      else if (station) this.hud.showPrompt('Press E — ' + station.label);
      else if (nearGate || nearNext) this.hud.showPrompt(
        this.currentMap === 'outpost'
          ? 'Press E — Dungeon Gate'
          : canAdvance
            ? `Press E — Enter Floor ${nextFloor}`
            : 'Press E — Travel / return to town',
      );
      else this.hud.hidePrompt();
    } else this.hud.hidePrompt();
    if (!this.input.consumeAction('interact')) return;
    if (modalOpen) {
      this.shopMenu.setOpen(false); this.gateMenu.setOpen(false);
      this.statsMenu.setOpen(false); this.bagMenu.setOpen(false); this.campaignUI.setOpen(false);
      this.input.clearQueues();
    } else if (this.player.alive) {
      if (nearMira) this.talkToMira();
      else if (station) this.interactStation(station.id);
      else if (nearNext && canAdvance) this.transitionTo(`floor${nextFloor}` as MapId);
      else if (nearGate || nearNext) this.gateMenu.show(this.currentMap === 'outpost' ? 'enter' : 'leave', map.floorNumber);
    }
  }

  private anyPanelOpen(): boolean {
    return this.shopMenu.isOpen() || this.gateMenu.isOpen() || this.statsMenu.isOpen() || this.bagMenu.isOpen() || this.campaignUI.isOpen();
  }

  private updateSkillHud(): void {
    this.hud.updateSkillBar(SKILL_ORDER.map(id => ({
      level: this.player.skillLevels[id], maxLevel: SKILL_DEFS[id].maxLevel,
      cdLeft: this.skillCds[id], cdTotal: SKILL_DEFS[id].cooldown,
      affordable: this.player.mp >= SKILL_DEFS[id].manaCost,
    })), this.player.skillSystemUnlocked);
  }

  // --- Frame update ---

  private update(dtReal: number): void {
    if (this.input.consumePause()) {
      if (this.anyPanelOpen()) {
        // ESC closes panels first, pausing only when none are open.
        this.campaignUI.setOpen(false);
        this.statsMenu.setOpen(false);
        this.bagMenu.setOpen(false);
        this.shopMenu.setOpen(false);
        this.gateMenu.setOpen(false);
        this.input.clearQueues();
      } else {
        this.setPaused(!this.pauseMenu.isOpen());
      }
    }
    this.updateSkillHud();
    if (this.pauseMenu.isOpen()) return;
    if (this.input.consumeAction('stats')) { this.campaignUI.setOpen(false); this.statsMenu.toggle(); }
    if (this.input.consumeAction('inventory')) { this.campaignUI.setOpen(false); this.bagMenu.toggle(); }
    this.updateInteract();
    if (this.anyPanelOpen()) {
      this.input.clearQueues(); this.autoPending = null; this.autoWantsAttack = false; this.player.vx = 0;
      return;
    }

    // Legendary drop ceremony: brief slow-motion (combat never fully stops).
    let dt = dtReal;
    if (this.hitstopT > 0) {
      this.hitstopT -= dtReal;
      dt = dtReal * 0.06;
    }

    const wantAttack = this.controller.update();
    this.applyAutoAttack();
    this.applyAutoSkill();
    if (this.input.consumeAction('skill1')) {
      this.autoPending = null;
      this.tryCastSkill('power');
    }
    if (this.input.consumeAction('skill2')) {
      this.autoPending = null;
      this.tryCastSkill('bolt');
    }
    if (this.input.consumeAction('skill3')) {
      this.autoPending = null;
      this.tryCastSkill('heal');
    }
    if (this.input.consumeAction('useHp')) this.useBestPotion(true);
    if (this.input.consumeAction('useMp')) this.useBestPotion(false);
    this.player.update(dt, this.floor);
    this.ensureRouteEncounter();
    if (wantAttack || this.autoWantsAttack) this.tryPlayerAttack();
    this.autoWantsAttack = false;

    // Delayed automated skill casts (manual play stays slightly better).
    if (this.autoPending) {
      this.autoPending.t -= dt;
      if (this.autoPending.t <= 0) {
        const id = this.autoPending.id;
        this.autoPending = null;
        this.tryCastSkill(id);
      }
    }

    for (const enemy of this.enemies) {
      enemy.update(dt, this.player.x, this.player.y, this.player.alive, this.floor);
    }
    this.hazards.update(dt, this.player.x, this.player.y, power => this.damagePlayer(power));
    this.mira?.update(dt);
    for (const npc of this.townspeople) npc.update(dt);
    this.floor.update(dt);

    this.pickups.update(dt, this.player.x, this.player.y, (p) => this.onPickupCollected(p));
    this.updateScheduled(dt);
    this.updateRainSwords(dt);
    if (this.player.berserkActive && Math.random() < dt * 8) {
      this.spawnBurst(
        this.player.x + (Math.random() - 0.5) * 0.8,
        this.player.y + 0.6 + Math.random() * 0.8,
        0xff4040,
        1,
        1.5,
        0.4,
        0.3,
        2,
      );
    }

    for (const id of SKILL_ORDER) {
      if (this.skillCds[id] > 0) this.skillCds[id] = Math.max(0, this.skillCds[id] - dt);
    }

    // Slash effect fade-out.
    for (let i = this.slashes.length - 1; i >= 0; i -= 1) {
      const fx = this.slashes[i];
      fx.life += dt;
      const t = fx.life / fx.ttl;
      if (t >= 1) {
        this.renderer.scene.remove(fx.mesh);
        fx.mesh.geometry.dispose();
        fx.mesh.material.dispose();
        this.slashes.splice(i, 1);
      } else {
        fx.mesh.material.opacity = fx.opacity * (1 - t);
        const s = 0.85 + t * 0.45;
        fx.mesh.scale.set(this.player.facing * s, s, 1);
      }
    }
    this.updateFx(dt);

    // Dungeon zone tracking (Ruined Entrance → Slime Cavern → Collapsed Hall).
    const zones = MAPS[this.currentMap].zones;
    if (zones) {
      const zone = zones.find((z) => this.player.x >= z.x0 && this.player.x < z.x1);
      if (zone && zone.name !== this.currentZone) {
        this.currentZone = zone.name;
        this.hud.spawnFloatingText(this.player.x, this.player.y + 2.4, `— ${zone.name} —`, 'info');
      }
    }

    // Respawn at the current map's entrance (keep EXP/level/gear/relics).
    if (!this.player.alive && this.deathTimer < 0) {
      this.hud.showBanner('YOU DIED');
      this.deathTimer = 1.6;
    }
    if (this.deathTimer >= 0) {
      this.deathTimer -= dt;
      if (this.deathTimer < 0) {
        const f = MAPS[this.currentMap].floorNumber;
        this.player.respawn(f ? this.checkpointX(f) : MAPS[this.currentMap].spawnX);
      }
    }

    this.camera.follow(this.player.x, dt);
    this.background.update(this.camera.x, GameConfig.cameraY);

    this.hud.updatePlayer({
      hp: this.player.hp,
      maxHP: this.player.maxHP,
      mp: this.player.mp,
      maxMP: this.player.maxMP,
      level: this.player.level,
      exp: this.player.exp,
      expReq: this.player.expForNextLevel(),
      gold: this.player.gold,
    });
    this.updateSkillHud();
    if (this.player.berserkActive) {
      this.hud.showBuff(`BERSERK ${Math.max(1, Math.ceil(this.player.berserkTime))}s`);
    } else if (this.player.tonicTime > 0) {
      this.hud.showBuff(`TONIC ${Math.max(1, Math.ceil(this.player.tonicTime))}s`);
    } else if (this.player.speedTonicTime > 0) {
      this.hud.showBuff(`SWIFT ${Math.max(1, Math.ceil(this.player.speedTonicTime))}s`);
    } else {
      this.hud.hideBuff();
    }
    this.hud.updateFx(dt, this.projectPoint);

    this.saveTimer += dt;
    if (this.saveTimer >= Game.AUTOSAVE_INTERVAL) {
      this.saveTimer = 0;
      this.saveGame();
    }
  }
}
