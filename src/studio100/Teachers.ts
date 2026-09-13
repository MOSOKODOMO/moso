/** Visual cues come from the user's reference sheets; display names use sound-alike first-name aliases.
 * These are playful game interpretations; dialogue and combat are fictional.
 */
export type TeacherLook = { hairStyle: 'short' | 'swept' | 'long' | 'bob' | 'bald' | 'curly'; hair: string; skin: string; coat: string; glasses: 'none' | 'square' | 'round' | 'red'; beard: 'none' | 'goatee' | 'beard' | 'full' | 'stubble' };
export interface Teacher extends TeacherLook { id: string; name: string; project: string; tool: 'pen' | 'ruler' | 'cup' }
const entries: [string,string,string,TeacherLook['hairStyle'],string,string,string,TeacherLook['glasses'],TeacherLook['beard']][] = [
  [
    "patrick",
    "Patrik",
    "Foundations",
    "short",
    "#272b2b",
    "#e5bd95",
    "#41484c",
    "square",
    "none"
  ],
  [
    "alisa",
    "Aleesa",
    "Form & Space",
    "long",
    "#694737",
    "#f0ceb1",
    "#514356",
    "none",
    "none"
  ],
  [
    "srivarenya",
    "Srivarenia",
    "The Human Scale",
    "long",
    "#302e2d",
    "#bf9475",
    "#687c70",
    "none",
    "none"
  ],
  [
    "jimi",
    "Jimmi",
    "Order & Proportion",
    "swept",
    "#262c2b",
    "#d9b391",
    "#546e67",
    "none",
    "none"
  ],
  [
    "steven",
    "Steevan",
    "City & Context",
    "bald",
    "#292e2c",
    "#d8b594",
    "#4e5354",
    "square",
    "goatee"
  ],
  [
    "neil",
    "Neel",
    "Material & Texture",
    "curly",
    "#a2a49b",
    "#ebc5a4",
    "#718278",
    "none",
    "none"
  ],
  [
    "nic",
    "Nikk",
    "Geometry & Rhythm",
    "short",
    "#252c2e",
    "#eed3b6",
    "#394854",
    "none",
    "none"
  ],
  [
    "graham",
    "Grayam",
    "The Courtyard",
    "bald",
    "#666a60",
    "#d2b99f",
    "#536758",
    "round",
    "beard"
  ],
  [
    "lauren_crockett",
    "Loren",
    "Light & Shadow",
    "bob",
    "#8b7663",
    "#e5c3a6",
    "#7e6979",
    "none",
    "none"
  ],
  [
    "charles",
    "Charls",
    "Surface & Depth",
    "short",
    "#51463b",
    "#dfc0a5",
    "#7b8277",
    "none",
    "stubble"
  ],
  [
    "peter",
    "Peeter",
    "Structure & Balance",
    "curly",
    "#c5c3b7",
    "#e5c6a9",
    "#6a645d",
    "round",
    "none"
  ],
  [
    "simon",
    "Saimon",
    "Thresholds",
    "bald",
    "#8b6c45",
    "#e7c4a1",
    "#627587",
    "square",
    "full"
  ],
  [
    "rodney",
    "Rodnee",
    "Rooms & Routes",
    "short",
    "#313331",
    "#ebc7a9",
    "#535961",
    "none",
    "stubble"
  ],
  [
    "carolyn",
    "Karolyn",
    "Place & Memory",
    "curly",
    "#a49e89",
    "#bd9070",
    "#776552",
    "red",
    "none"
  ],
  [
    "meagan",
    "Meegan",
    "Colour & Atmosphere",
    "bob",
    "#8c7055",
    "#e9c7a7",
    "#708784",
    "none",
    "none"
  ],
  [
    "briony",
    "Bryonee",
    "Making & Craft",
    "long",
    "#665545",
    "#efcfb2",
    "#667b72",
    "none",
    "none"
  ],
  [
    "yuchen",
    "Yuchenn",
    "The Garden Room",
    "bob",
    "#312f29",
    "#e8c5a2",
    "#d4c5a3",
    "none",
    "none"
  ],
  [
    "lauren_garner",
    "Lauryn",
    "Dwelling & Place",
    "bob",
    "#70513d",
    "#edc6a5",
    "#947c62",
    "none",
    "none"
  ],
  [
    "marc",
    "Maark",
    "Pattern & Variation",
    "short",
    "#383632",
    "#e8c5a6",
    "#526359",
    "none",
    "none"
  ],
  [
    "tom",
    "Tomm",
    "Solid & Void",
    "curly",
    "#433a31",
    "#dab08f",
    "#698078",
    "none",
    "stubble"
  ],
  [
    "bryn",
    "Brinn",
    "The Everyday City",
    "curly",
    "#625a4b",
    "#e9cbb0",
    "#607c86",
    "square",
    "none"
  ],
  [
    "greg",
    "Gregg",
    "Lines & Layers",
    "swept",
    "#9b9c92",
    "#d9b899",
    "#4d5c6c",
    "round",
    "none"
  ],
  [
    "mark",
    "Marq",
    "Streets & Squares",
    "curly",
    "#3f4039",
    "#e5c4a4",
    "#65705b",
    "none",
    "none"
  ],
  [
    "olivia_odonnell",
    "Olivya",
    "Ground & Landscape",
    "long",
    "#5d554c",
    "#e5c7ae",
    "#8c7565",
    "none",
    "none"
  ],
  [
    "liam",
    "Leeam",
    "Public & Private",
    "bald",
    "#5d574d",
    "#e7c7a9",
    "#596770",
    "none",
    "stubble"
  ],
  [
    "caleb",
    "Kayleb",
    "The Small House",
    "short",
    "#292d2a",
    "#e4bd97",
    "#536a70",
    "none",
    "none"
  ],
  [
    "vicky",
    "Vikki",
    "Shelter & Comfort",
    "long",
    "#353733",
    "#dfb694",
    "#748173",
    "none",
    "none"
  ],
  [
    "steph",
    "Steff",
    "Composition & Detail",
    "long",
    "#b7a182",
    "#e9c9ac",
    "#84728b",
    "none",
    "none"
  ],
  [
    "caitlyn",
    "Kaitlyn",
    "Reuse & Renewal",
    "short",
    "#3b3a33",
    "#e1bea1",
    "#65766d",
    "none",
    "none"
  ],
  [
    "stasinos",
    "Stassinoss",
    "Edges & Boundaries",
    "swept",
    "#827363",
    "#d6aa85",
    "#6b7d8b",
    "none",
    "stubble"
  ],
  [
    "paul",
    "Pawl",
    "Scale & Measure",
    "short",
    "#b9b8a9",
    "#e3c0a3",
    "#687265",
    "square",
    "none"
  ],
  [
    "olivia_peel",
    "Olyvia",
    "The Urban Block",
    "bob",
    "#655240",
    "#e8c7a6",
    "#a1886c",
    "none",
    "none"
  ],
  [
    "christine",
    "Kristeen",
    "The Grand Atelier",
    "long",
    "#352f2b",
    "#d9ae8b",
    "#5b6f79",
    "none",
    "none"
  ]
];
export const TEACHERS: Teacher[] = entries.map(([id,name,project,hairStyle,hair,skin,coat,glasses,beard],i)=>({id,name,project,hairStyle,hair,skin,coat,glasses,beard,tool: i%3===0?'pen':i%3===1?'ruler':'cup'}));
export const teacherById = (id: string): Teacher => TEACHERS.find(t=>t.id===id) ?? TEACHERS[0];
export function assignTeachers(random: () => number = Math.random): string[] {
 const pool = TEACHERS.slice(1).map(t=>t.id);
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 return ['patrick',...pool.slice(0,8)];
}
export function sanitizeAssignments(raw: unknown, fallback: string[]): string[] {
 const values=Array.isArray(raw)?raw:[], used=new Set(['patrick']), result=['patrick'];
 for(let i=1;i<9;i++){
  const candidate=values[i];
  const id=typeof candidate==='string' && TEACHERS.some(t=>t.id===candidate) && !used.has(candidate) ? candidate : [...fallback,...TEACHERS.map(t=>t.id)].find(id=>!used.has(id))!;
  result.push(id);used.add(id);
 }
 return result;
}

