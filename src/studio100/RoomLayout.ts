import { CLASSROOM_PLATFORMS, STUDIO_GROUND, type ArenaPlatform } from './CombatMotion';
import type { Place } from './StudioState';

export interface RoomPoint { x:number; y:number }
export interface RoomSize { width:number; height:number }
export interface RoomLayout {
  width:number; height:number; minY:number; maxY:number; ground:number;
  scale:number; offset:RoomPoint;
  background:RoomSize & RoomPoint;
  leftBoundary:number; rightBoundary:number;
}
export interface FurniturePlatform extends ArenaPlatform {
  id:string;
  surface:'bed'|'chair'|'table'|'counter'|'step';
}
export const HOME_SCALE=.8;
const HOME_OFFSET_Y=5.5-5.6*HOME_SCALE;
const standard:RoomLayout={width:32,height:18,minY:0,maxY:18,ground:STUDIO_GROUND,scale:1,offset:{x:0,y:0},background:{width:32,height:18,x:16,y:9},leftBoundary:2,rightBoundary:30};
const home:RoomLayout={width:32*HOME_SCALE,height:18*HOME_SCALE,minY:HOME_OFFSET_Y,maxY:HOME_OFFSET_Y+18*HOME_SCALE,ground:STUDIO_GROUND,scale:HOME_SCALE,offset:{x:0,y:HOME_OFFSET_Y},background:{width:32*HOME_SCALE,height:18*HOME_SCALE,x:16*HOME_SCALE,y:9*HOME_SCALE+HOME_OFFSET_Y},leftBoundary:2,rightBoundary:32*HOME_SCALE-2};
const lobby:RoomLayout={...standard,width:96,rightBoundary:94,background:{width:96,height:32,x:48,y:13.15}};
export const ROOM_LAYOUTS:Readonly<Record<Place,RoomLayout>>={home,restaurant:standard,mystery:standard,lobby,studio:standard,foyer:standard,skills:standard,tools:standard};
export const roomLayout=(place:Place):RoomLayout=>ROOM_LAYOUTS[place];

/** Coordinates in the original illustration's 32×18 drawing space -> room world. */
export function roomPoint(place:Place,x:number,y:number):RoomPoint {
  const layout=roomLayout(place);return {x:x*layout.scale+layout.offset.x,y:y*layout.scale+layout.offset.y};
}
/** Inverse transform is used by foreground meshes so their UVs still match the source art. */
export function roomSourcePoint(place:Place,x:number,y:number):RoomPoint {
  const layout=roomLayout(place);return {x:(x-layout.offset.x)/layout.scale,y:(y-layout.offset.y)/layout.scale};
}
export function roomSize(place:Place,width:number,height:number):RoomSize {
  const scale=roomLayout(place).scale;return {width:width*scale,height:height*scale};
}
/** Cover without stretching or exposing an edge; centerX is then clamped while following the player. */
export function roomView(place:Place,aspect:number) {
  const layout=roomLayout(place),ratio=Number.isFinite(aspect)&&aspect>0?aspect:16/9;
  const width=Math.min(layout.width,layout.height*ratio),height=width/ratio;
  const bottom=Math.max(layout.minY,Math.min(layout.maxY-height,layout.ground-height*.2));
  return {width,height,bottom,top:bottom+height,minCenterX:width/2,maxCenterX:layout.width-width/2};
}

// Measured top edges in the actual source images, normalized into the same 32×18 art space.
// Side panels and vertical cupboard faces are deliberately not collision surfaces.
function surface(place:Place,id:string,kind:FurniturePlatform['surface'],imageWidth:number,imageHeight:number,x1:number,x2:number,top:number):FurniturePlatform {
  const left=roomPoint(place,x1/imageWidth*32,18-top/imageHeight*18),right=roomPoint(place,x2/imageWidth*32,18-top/imageHeight*18);
  return {id,surface:kind,x1:left.x,x2:right.x,y:left.y,kind:'desk'};
}
export const HOME_PLATFORMS:readonly FurniturePlatform[]=[
  surface('home','home-nightstand','step',1774,887,289,409,481),
  surface('home','home-bed','bed',1774,887,406,884,444),
  surface('home','home-chair','chair',1774,887,1085,1211,514),
  surface('home','home-desk','table',1774,887,916,1439,437),
  surface('home','home-kitchen-bench','counter',1774,887,1565,1774,421),
];
export const RESTAURANT_PLATFORMS:readonly FurniturePlatform[]=[
  surface('restaurant','noodle-left-stool','chair',1672,941,358,436,495),
  surface('restaurant','noodle-right-stool','chair',1672,941,573,647,496),
  surface('restaurant','noodle-left-table','table',1672,941,316,517,438),
  surface('restaurant','noodle-right-table','table',1672,941,553,727,439),
  surface('restaurant','noodle-counter-step','chair',1672,941,710,786,481),
  surface('restaurant','noodle-counter','counter',1672,941,818,1656,415),
];
export const MYSTERY_PLATFORMS:readonly FurniturePlatform[]=[
  surface('mystery','shop-book-crate','step',1774,887,731,906,519),
  surface('mystery','shop-display-table','table',1774,887,542,974,452),
  surface('mystery','shop-stool','chair',1774,887,1642,1694,497),
  surface('mystery','shop-counter','counter',1774,887,1082,1760,427),
];
export function placePlatforms(place:Place):readonly ArenaPlatform[] {
  return place==='home'?HOME_PLATFORMS:place==='restaurant'?RESTAURANT_PLATFORMS:place==='mystery'?MYSTERY_PLATFORMS:place==='studio'?CLASSROOM_PLATFORMS:[];
}
const homeChair=HOME_PLATFORMS.find(platform=>platform.id==='home-chair')!;
const laptop={...roomPoint('home',22.4,9.96),...roomSize('home',2.5,1.6)};
export const HOME_POINTS={
  spawn:{x:3.52,y:STUDIO_GROUND},
  exit:{...roomPoint('home',3.2,6.65),radiusX:2.25},
  sleep:{
    approach:{x:roomPoint('home',9,0).x,y:STUDIO_GROUND},
    wake:{x:roomPoint('home',10,0).x,y:STUDIO_GROUND},
    // Portrait stays the same world size as the player's head; only furniture is scaled.
    head:{...roomPoint('home',7.8,9.25),width:2.75,height:2.2},
    bed:HOME_PLATFORMS.find(platform=>platform.id==='home-bed')!,
  },
  homework:{
    seat:roomPoint('home',20.5,6.55),
    laptop,
    label:{x:laptop.x,y:laptop.y+1.15},
    // Reachable while standing on either the chair or desk. Vertical range excludes the walking floor.
    interact:{x:roomPoint('home',21.2,0).x,y:homeChair.y,radiusX:2.5,radiusY:2.6},
    chair:homeChair,
  },
} as const;
export const RESTAURANT_POINTS={spawn:{x:7,y:STUDIO_GROUND},exit:{x:3.2,y:STUDIO_GROUND+3.1},worker:{x:22,y:8.8},cashier:{x:25,y:8.8},counter:RESTAURANT_PLATFORMS.find(platform=>platform.id==='noodle-counter')!} as const;
export const MYSTERY_POINTS={spawn:{x:8,y:STUDIO_GROUND},exit:{x:3.2,y:STUDIO_GROUND+3.1},clerk:{x:24,y:STUDIO_GROUND},speech:{x:24,y:10.6},counter:MYSTERY_PLATFORMS.find(platform=>platform.id==='shop-counter')!} as const;
