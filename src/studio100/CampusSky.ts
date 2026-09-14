import * as THREE from 'three';
import type { ArenaPlatform } from './CombatMotion';

export interface SkyPlatform extends ArenaPlatform {
  id:string;
  surface:'ledge'|'roof'|'cloud'|'balloon';
}
export const CAMPUS_MAX_Y=68;
export const CAMPUS_SKY_ART={width:96,height:36,x:48,y:42,bottom:24,top:60} as const;
const platform=(id:string,surface:SkyPlatform['surface'],x1:number,x2:number,y:number):SkyPlatform=>({id,surface,x1,x2,y,kind:'desk'});

/** Stable landing surfaces match the painted ledges, cloud crowns and wicker basket rails. */
export const SKY_PLATFORMS:readonly SkyPlatform[]=[
  platform('sky-building-lower-wide','ledge',27.75,46.75,17.305),
  platform('sky-building-upper-wide','ledge',27.75,46.75,21.415),
  platform('sky-building-join','ledge',27.75,46.75,25.05),
  ...[28.65,32.6,36.55,40.6,44.7].map((y,index)=>platform('sky-building-storey-'+(index+1),'ledge',25.25,46.25,y)),
  platform('sky-building-roof','roof',25.25,46.25,49),
  platform('sky-cloud-east-lower','cloud',46.9,52.3,52.8),
  platform('sky-balloon-east-basket','balloon',54.65,57.35,56.5),
  platform('sky-cloud-east-upper','cloud',59.3,64.7,60.2),
  platform('sky-cloud-west-lower','cloud',19.1,24.5,52.8),
  platform('sky-balloon-west-basket','balloon',14.75,17.45,56.5),
  platform('sky-cloud-west-upper','cloud',7.3,12.7,60.2),
  platform('sky-balloon-east-crown','balloon',55.4,56.6,63.15),
  platform('sky-balloon-west-crown','balloon',15.5,16.7,63.15),
];

type SkyMesh=THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;
const asset=(name:string)=>new URL('studio100/'+name,document.baseURI).href;

/** Generated upper panorama preserves the existing street and continues into a climbable sky. */
export class CampusSky {
  private readonly root=new THREE.Group();
  private readonly meshes:SkyMesh[]=[];
  private readonly textures:THREE.Texture[]=[];
  private readonly clouds:SkyMesh[]=[];

  constructor(scene:THREE.Scene,lowerCampusTexture?:THREE.Texture) {
    const upper=this.load('campus-upper-sky.png');
    const cloud=this.load('sky-cloud-platform.png');
    const balloon=this.load('sky-balloon-platform.png');
    const lower=lowerCampusTexture??this.load('campus-restaurant.png');
    const {width,height,x,y,bottom}=CAMPUS_SKY_ART;
    // Vertex alpha blends only the new layer's bottom five units over the original roofline.
    const upperGeometry=new THREE.PlaneGeometry(width,height,96,72),uv=upperGeometry.getAttribute('uv');
    const colors=new Float32Array(uv.count*4);
    for(let n=0;n<uv.count;n++){
      const worldY=bottom+uv.getY(n)*height,worldX=uv.getX(n)*width;
      // Keep windows and circular shades opaque across the join; only open sky gets a long blend.
      const onTower=worldX>=23&&worldX<=48;
      const t=THREE.MathUtils.clamp(onTower?(worldY-24.52)/.5:(worldY-bottom)/5.15,0,1);
      colors.set([1,1,1,t*t*(3-2*t)],n*4);
    }
    upperGeometry.setAttribute('color',new THREE.BufferAttribute(colors,4));
    const upperMesh=this.add(upperGeometry,new THREE.MeshBasicMaterial({map:upper,transparent:true,vertexColors:true,depthWrite:false}),x,y,-9.7);
    upperMesh.name='Campus upper tower and Melbourne sky';
    // Reflect the cloud-only uppermost strip to cover the camera's extra headroom exactly.
    // This uses the same generated art; there is no flat-colour backdrop or duplicate tower.
    const capGeometry=new THREE.PlaneGeometry(96,CAMPUS_MAX_Y-60),capUV=capGeometry.getAttribute('uv');
    for(let n=0;n<capUV.count;n++)capUV.setY(n,1-capUV.getY(n)*(CAMPUS_MAX_Y-60)/height);
    this.add(capGeometry,new THREE.MeshBasicMaterial({map:upper,depthWrite:false}),48,(60+CAMPUS_MAX_Y)/2,-9.7);

    // Broaden the two existing terraces and bridge into the added storeys using the original
    // canopy's actual painted metal/concrete edge. The lower street artwork remains untouched.
    for(const landing of SKY_PLATFORMS.slice(0,3)){
      const geometry=new THREE.PlaneGeometry(landing.x2-landing.x1,.49),edgeUV=geometry.getAttribute('uv');
      for(let n=0;n<edgeUV.count;n++)edgeUV.setXY(n,(628+edgeUV.getX(n)*442)/2172,1-(382+(1-edgeUV.getY(n))*11)/724);
      this.add(geometry,new THREE.MeshBasicMaterial({map:lower,depthWrite:false}), (landing.x1+landing.x2)/2,landing.y-.245,-.4);
    }
    for(const landing of SKY_PLATFORMS.filter(p=>p.surface==='cloud')){
      // Generated crown is about 32.5% down its transparent sprite canvas.
      const w=7.2,h=2.4,center=(landing.x1+landing.x2)/2;
      const mesh=this.add(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:cloud,transparent:true,depthWrite:false}),center,landing.y+(.325-.5)*h,-.4);
      mesh.name=landing.id;this.clouds.push(mesh);
    }
    for(const landing of SKY_PLATFORMS.filter(p=>p.surface==='balloon'&&p.id.endsWith('-basket'))){
      // The basket's upper rail is at native image row1275/1536; its landing height never moves.
      const w=5.5,h=8.25,center=(landing.x1+landing.x2)/2;
      const mesh=this.add(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:balloon,transparent:true,depthWrite:false}),center,landing.y+(1275/1536-.5)*h,-.3);
      mesh.name=landing.id;
    }
    this.root.visible=false;scene.add(this.root);
  }

  setVisible(visible:boolean):void {this.root.visible=visible;}
  update(time:number):void {
    if(!this.root.visible||!Number.isFinite(time))return;
    // Only opacity breathes; no visual motion can shift a surface away from its collider.
    this.clouds.forEach((mesh,index)=>{mesh.material.opacity=.97+Math.sin(time*.45+index)*.025;});
  }
  private load(name:string):THREE.Texture {
    const texture=new THREE.TextureLoader().load(asset(name));texture.colorSpace=THREE.SRGBColorSpace;
    texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;this.textures.push(texture);return texture;
  }
  private add(geometry:THREE.PlaneGeometry,material:THREE.MeshBasicMaterial,x:number,y:number,z:number):SkyMesh {
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);this.root.add(mesh);this.meshes.push(mesh);return mesh;
  }
  dispose():void {
    this.root.removeFromParent();for(const mesh of this.meshes){mesh.geometry.dispose();mesh.material.dispose();}
    for(const texture of this.textures)texture.dispose();this.meshes.length=0;this.textures.length=0;
  }
}
