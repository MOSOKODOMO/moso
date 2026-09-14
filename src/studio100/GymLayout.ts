import type { ArenaPlatform } from './CombatMotion';
/** Top edges of the gym equipment, in the room's 32 by 18 world space. */
export const GYM_PLATFORMS:readonly ArenaPlatform[]=[
 {x1:3.81,x2:4.56,y:6.70,kind:'desk'}, {x1:5.88,x2:6.62,y:6.71,kind:'desk'},
 {x1:8.56,x2:10.99,y:4.74,kind:'desk'}, {x1:9.72,x2:10.74,y:8.30,kind:'desk'},
 {x1:11.98,x2:16.06,y:6.43,kind:'desk'}, {x1:16.19,x2:18.56,y:5.15,kind:'desk'},
 {x1:19.90,x2:21.49,y:7.04,kind:'desk'}, {x1:24.69,x2:26.85,y:5.39,kind:'desk'},
 {x1:23.80,x2:27.20,y:7.50,kind:'desk'},
 {x1:28.10,x2:29.70,y:9.62,kind:'desk'}, {x1:29.72,x2:31.78,y:9.94,kind:'desk'},
];
export const GYM_BAG={x:22.39,anchorY:11.27,length:4.75,width:1.45,height:3.55};
export const GYM_WEIGHT_SPAWNS=[{kind:'dumbbell',x:13,y:3.90},{kind:'dumbbell',x:18.5,y:3.90},{kind:'barbell',x:25,y:4.05}] as const;
