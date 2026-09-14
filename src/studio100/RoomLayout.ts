import { CLASSROOM_PLATFORMS, STUDIO_GROUND, type ArenaPlatform } from './CombatMotion';
import { SKY_PLATFORMS, CAMPUS_MAX_Y } from './CampusSky';
import { GYM_PLATFORMS } from './GymLayout';
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
  surface:'bed'|'chair'|'table'|'counter'|'step'|'planter'|'ledge'|'roof'|'display'|'frame'|'bench';
}
export const HOME_SCALE=.8;
const HOME_OFFSET_Y=5.5-5.6*HOME_SCALE;
const standard:RoomLayout={width:32,height:18,minY:0,maxY:18,ground:STUDIO_GROUND,scale:1,offset:{x:0,y:0},background:{width:32,height:18,x:16,y:9},leftBoundary:2,rightBoundary:30};
const home:RoomLayout={width:32*HOME_SCALE,height:18*HOME_SCALE,minY:HOME_OFFSET_Y,maxY:HOME_OFFSET_Y+18*HOME_SCALE,ground:STUDIO_GROUND,scale:HOME_SCALE,offset:{x:0,y:HOME_OFFSET_Y},background:{width:32*HOME_SCALE,height:18*HOME_SCALE,x:16*HOME_SCALE,y:9*HOME_SCALE+HOME_OFFSET_Y},leftBoundary:2,rightBoundary:32*HOME_SCALE-2};
const lobby:RoomLayout={...standard,width:96,minY:-2.85,maxY:CAMPUS_MAX_Y,rightBoundary:94,background:{width:96,height:32,x:48,y:13.15}};
export const ROOM_LAYOUTS:Readonly<Record<Place,RoomLayout>>={home,restaurant:standard,mystery:standard,lobby,studio:standard,foyer:standard,skills:standard,tools:standard};
export const roomLayout=(place:Place):RoomLayout=>ROOM_LAYOUTS[place];

/** Coordinates in the original illustration's 32×18 drawing space -> room world. */
export function roomPoint(place:Place,x:number,y:number):RoomPoint {
  const layout=roomLayout(place);return {x:x*layout.scale+layout.offset.x,y:y*layout.scale+layout.offset.y};
}
/** Pixel coordinates follow the rendered background bounds, including the 96×32 campus panorama. */
export function roomImagePoint(place:Place,x:number,y:number,imageWidth:number,imageHeight:number):RoomPoint {
  const art=roomLayout(place).background;
  return {x:art.x-art.width/2+x/imageWidth*art.width,y:art.y+art.height/2-y/imageHeight*art.height};
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
  const left=roomImagePoint(place,x1,top,imageWidth,imageHeight),right=roomImagePoint(place,x2,top,imageWidth,imageHeight);
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
// Outdoor coordinates are measured on campus-restaurant.png (2172×724), not a 32×18 room.
const campusSurface=(id:string,kind:FurniturePlatform['surface'],x1:number,x2:number,top:number)=>surface('lobby',id,kind,2172,724,x1,x2,top);
export const CAMPUS_PLATFORMS:readonly (FurniturePlatform|typeof SKY_PLATFORMS[number])[]=[
  ...SKY_PLATFORMS,
  campusSurface('campus-shop-left-pot','planter',194,215,558),
  campusSurface('campus-shop-right-pot','planter',291,313,558),
  campusSurface('campus-shop-window-pot','planter',382,406,558),
  campusSurface('campus-shop-left-sill','ledge',92,198,544),
  campusSurface('campus-shop-right-sill','ledge',320,396,544),
  campusSurface('campus-shop-left-transom','ledge',97,202,452),
  campusSurface('campus-shop-right-transom','ledge',317,398,452),
  campusSurface('campus-shop-cornice','roof',77,440,363),
  campusSurface('campus-building-planter','planter',668,718,524),
  campusSurface('campus-building-entry-transom','ledge',669,1022,453),
  campusSurface('campus-building-canopy','roof',628,1070,382),
  campusSurface('campus-building-lower-terrace','ledge',879,1056,268),
  campusSurface('campus-building-upper-terrace','ledge',879,1056,175),
  campusSurface('campus-home-left-planter','planter',1202,1394,529),
  campusSurface('campus-home-right-planter','planter',1544,1718,524),
  campusSurface('campus-home-left-lamp-bracket','ledge',1385,1402,443),
  campusSurface('campus-home-right-lamp-bracket','ledge',1543,1561,443),
  campusSurface('campus-home-canopy-left','roof',1317,1376,382),
  campusSurface('campus-home-left-elevated-planter','planter',1248,1317,391),
  campusSurface('campus-home-right-elevated-planter','planter',1645,1718,391),
  campusSurface('campus-home-canopy-center','roof',1376,1568,367),
  campusSurface('campus-home-canopy-right','roof',1568,1643,382),
  ...[[1248,1317],[1379,1428],[1528,1578],[1645,1718]].flatMap(([x1,x2],index)=>[
    campusSurface('campus-home-window-'+index+'-lower-sill','ledge',x1,x2,340),
    campusSurface('campus-home-window-'+index+'-concrete-planter','planter',x1,x2,239),
    campusSurface('campus-home-window-'+index+'-upper-sill','ledge',x1,x2,182),
    campusSurface('campus-home-window-'+index+'-header','ledge',x1,x2,99),
  ]),
  campusSurface('campus-noodles-left-pot','planter',1784,1809,560),
  campusSurface('campus-noodles-right-pot','planter',2118,2144,554),
  campusSurface('campus-noodles-serving-sill','ledge',1934,2119,532),
  campusSurface('campus-noodles-lower-lantern-rail','ledge',1766,2158,446),
  campusSurface('campus-noodles-upper-lantern-rail','ledge',1773,2145,420),
  campusSurface('campus-noodles-roof-eave','roof',1766,2147,363),
  campusSurface('campus-noodles-roof-ridge','roof',1784,2132,325),
];
export const FOYER_PLATFORMS:readonly FurniturePlatform[]=[
  surface('foyer','foyer-left-round-planter','planter',1774,887,411,493,540),
  surface('foyer','foyer-left-wide-planter','planter',1774,887,493,638,560),
  surface('foyer','foyer-left-tall-planter','planter',1774,887,637,663,514),
  surface('foyer','foyer-middle-planter','planter',1774,887,871,923,526),
  surface('foyer','foyer-right-planter','planter',1774,887,1144,1200,525),
  surface('foyer','foyer-model-plinth','display',1774,887,1224,1511,506),
  surface('foyer','foyer-model-glass','display',1774,887,1224,1511,397),
  surface('foyer','foyer-archive-frame','frame',1774,887,1576,1683,309),
  surface('foyer','foyer-right-low-planter','planter',1774,887,1514,1570,561),
  surface('foyer','foyer-right-bench','bench',1774,887,1574,1774,558),
];
export function placePlatforms(place:Place):readonly ArenaPlatform[] {
  return place==='skills'?GYM_PLATFORMS:place==='lobby'?CAMPUS_PLATFORMS:place==='foyer'?FOYER_PLATFORMS:place==='home'?HOME_PLATFORMS:place==='restaurant'?RESTAURANT_PLATFORMS:place==='mystery'?MYSTERY_PLATFORMS:place==='studio'?CLASSROOM_PLATFORMS:[];
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
