/** Names and visual cues transcribed from the user's three supplied reference sheets.
 * These are playful game interpretations; dialogue and combat are fictional.
 */
export type TeacherLook = { hairStyle: 'short' | 'swept' | 'long' | 'bob' | 'bald' | 'curly'; hair: string; skin: string; coat: string; glasses: 'none' | 'square' | 'round' | 'red'; beard: 'none' | 'goatee' | 'beard' | 'full' | 'stubble' };
export interface Teacher extends TeacherLook { id: string; name: string; project: string; tool: 'pen' | 'ruler' | 'cup' }
const entries: [string,string,string,TeacherLook['hairStyle'],string,string,string,TeacherLook['glasses'],TeacherLook['beard']][] = [
  [
    "patrick",
    "Patrick",
    "Matter Vibrant: Selfie Edition",
    "short",
    "#272b2b",
    "#e5bd95",
    "#41484c",
    "square",
    "none"
  ],
  [
    "alisa",
    "Alisa",
    "AI Accelerated Architect",
    "long",
    "#694737",
    "#f0ceb1",
    "#514356",
    "none",
    "none"
  ],
  [
    "srivarenya",
    "Srivarenya",
    "Grounded Communities",
    "long",
    "#302e2d",
    "#bf9475",
    "#687c70",
    "none",
    "none"
  ],
  [
    "jimi",
    "Jimi",
    "Tite Haus",
    "swept",
    "#262c2b",
    "#d9b391",
    "#546e67",
    "none",
    "none"
  ],
  [
    "steven",
    "Steven",
    "Grounded Communities",
    "bald",
    "#292e2c",
    "#d8b594",
    "#4e5354",
    "square",
    "goatee"
  ],
  [
    "neil",
    "Neil",
    "Lyons Practice Studio: Free-Furb",
    "curly",
    "#a2a49b",
    "#ebc5a4",
    "#718278",
    "none",
    "none"
  ],
  [
    "nic",
    "Nic",
    "ReTectonics: Beijing Travelling Studio",
    "short",
    "#252c2e",
    "#eed3b6",
    "#394854",
    "none",
    "none"
  ],
  [
    "graham",
    "Graham",
    "Tite Haus",
    "bald",
    "#666a60",
    "#d2b99f",
    "#536758",
    "round",
    "beard"
  ],
  [
    "lauren_crockett",
    "Lauren",
    "Matter",
    "bob",
    "#8b7663",
    "#e5c3a6",
    "#7e6979",
    "none",
    "none"
  ],
  [
    "charles",
    "Charles",
    "Facadism",
    "short",
    "#51463b",
    "#dfc0a5",
    "#7b8277",
    "none",
    "stubble"
  ],
  [
    "peter",
    "Peter",
    "Instrument Architecture",
    "curly",
    "#c5c3b7",
    "#e5c6a9",
    "#6a645d",
    "round",
    "none"
  ],
  [
    "simon",
    "Simon",
    "Counter Errorism 4",
    "bald",
    "#8b6c45",
    "#e7c4a1",
    "#627587",
    "square",
    "full"
  ],
  [
    "rodney",
    "Rodney",
    "MARCH Practice Studio",
    "short",
    "#313331",
    "#ebc7a9",
    "#535961",
    "none",
    "stubble"
  ],
  [
    "carolyn",
    "Carolyn",
    "Yalukit Weelam 2.0",
    "curly",
    "#a49e89",
    "#bd9070",
    "#776552",
    "red",
    "none"
  ],
  [
    "meagan",
    "Meagan",
    "Cerulean Blue",
    "bob",
    "#8c7055",
    "#e9c7a7",
    "#708784",
    "none",
    "none"
  ],
  [
    "briony",
    "Briony",
    "Lyons Practice Studio: Free-Furb",
    "long",
    "#665545",
    "#efcfb2",
    "#667b72",
    "none",
    "none"
  ],
  [
    "yuchen",
    "Yuchen",
    "Cerulean Blue",
    "bob",
    "#312f29",
    "#e8c5a2",
    "#d4c5a3",
    "none",
    "none"
  ],
  [
    "lauren_garner",
    "Lauren",
    "Coburg Iterations",
    "bob",
    "#70513d",
    "#edc6a5",
    "#947c62",
    "none",
    "none"
  ],
  [
    "marc",
    "Marc",
    "Chameleon",
    "short",
    "#383632",
    "#e8c5a6",
    "#526359",
    "none",
    "none"
  ],
  [
    "tom",
    "Tom",
    "Scrape and Anti-scrape",
    "curly",
    "#433a31",
    "#dab08f",
    "#698078",
    "none",
    "stubble"
  ],
  [
    "bryn",
    "Bryn",
    "Customary Tenure",
    "curly",
    "#625a4b",
    "#e9cbb0",
    "#607c86",
    "square",
    "none"
  ],
  [
    "greg",
    "Greg",
    "ReTectonics: Beijing Travelling Studio",
    "swept",
    "#9b9c92",
    "#d9b899",
    "#4d5c6c",
    "round",
    "none"
  ],
  [
    "mark",
    "Mark",
    "The Melbourne Studio",
    "curly",
    "#3f4039",
    "#e5c4a4",
    "#65705b",
    "none",
    "none"
  ],
  [
    "olivia_odonnell",
    "Olivia",
    "Typical System",
    "long",
    "#5d554c",
    "#e5c7ae",
    "#8c7565",
    "none",
    "none"
  ],
  [
    "liam",
    "Liam",
    "Typical System",
    "bald",
    "#5d574d",
    "#e7c7a9",
    "#596770",
    "none",
    "stubble"
  ],
  [
    "caleb",
    "Caleb",
    "KTA Practice Studio: Housing Atlas",
    "short",
    "#292d2a",
    "#e4bd97",
    "#536a70",
    "none",
    "none"
  ],
  [
    "vicky",
    "Vicky",
    "Lyons Practice Studio: Free-Furb",
    "long",
    "#353733",
    "#dfb694",
    "#748173",
    "none",
    "none"
  ],
  [
    "steph",
    "Steph",
    "Matter",
    "long",
    "#b7a182",
    "#e9c9ac",
    "#84728b",
    "none",
    "none"
  ],
  [
    "caitlyn",
    "Caitlyn",
    "Mongrel Materials",
    "short",
    "#3b3a33",
    "#e1bea1",
    "#65766d",
    "none",
    "none"
  ],
  [
    "stasinos",
    "Stasinos",
    "Yalukit Weelam 2.0",
    "swept",
    "#827363",
    "#d6aa85",
    "#6b7d8b",
    "none",
    "stubble"
  ],
  [
    "paul",
    "Paul",
    "Never Waste a Good Crisis",
    "short",
    "#b9b8a9",
    "#e3c0a3",
    "#687265",
    "square",
    "none"
  ],
  [
    "olivia_peel",
    "Olivia",
    "KTA Practice Studio: Housing Atlas",
    "bob",
    "#655240",
    "#e8c7a6",
    "#a1886c",
    "none",
    "none"
  ],
  [
    "christine",
    "Christine",
    "Yalukit Weelam 2.0",
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

