# Artwork and style notes

Both basement backgrounds were created with the built-in image generation tool. The common direction is a warm, illustrated university interior: soft painted texture, ivory architecture, amber light, muted teal equipment, plants, straight-on side-scrolling composition and a clear walking area.

Final assets:
- `public/studio100/student-lab.png`: student gym (B1), 1672 × 941.
- `public/studio100/model-workshop.png`: robotic fabrication workshop (B2), 1672 × 941.

The two rooms use different functional materials (timber gym floor, concrete workshop floor) while retaining the same palette, lighting and illustration detail. Furniture for interaction is rendered in the game; labels and controls stay outside the paintings.


---

# Student Gym artwork

Generated with the built-in image_gen tool on 2026-09-13. Final asset replaces public/studio100/student-lab.png.

Use case: stylized-concept.
Asset type: final background painting for a warm 2D side-scrolling architecture student RPG. Generate a new student gym interior that visually belongs alongside a lovingly painted Melbourne university basement and a modern robotics fabrication lab.
Primary request: A beautiful welcoming basement gym where architecture students train physical power, endurance and agility. Output a single wide landscape 16:9 image, ideally 2048 by 1152.
Style/medium: polished hand-painted anime adventure game environment, sophisticated detailed environmental illustration with softly defined brush textures, subtly outlined architectural edges, rich believable materials and gentle light bloom. Cozy, grounded, appealing game art. Not photorealistic, not a 3D render, not vector art.
Composition: straight-on side view of one long room, back wall parallel to picture plane with only restrained shallow depth. A brass and dark-metal lift exit at the far left (around 8% width), generous high ivory walls with warm timber wall panels and a couple of slim exposed concrete columns; high narrow clerestory windows with soft blue-purple Melbourne evening light. Preserve spacious uncluttered walking floor along the entire lower 30% of the image, continuous edge to edge; all furniture and exercise equipment is arranged against the back wall in the upper 70%. The back wall meets the floor at approximately 65% image height.
Equipment: Left-of-centre a pair of compact muted-teal exercise bicycles and a treadmill; at centre a low beautifully organized rack of dumbbells with a wall mirror above it and a timber exercise bench tucked against the back wall; at about 69% image width a clearly identifiable strength-training area with a dark teal and warm tan hanging boxing bag, a squat rack, and small hand weights. On the far right a tidy stack of rolled yoga mats, water bottles on a shelf, and lockers. All equipment appropriate to a small stylish university gym, nothing futuristic or exaggerated. No people reflected in mirrors.
Lighting and palette: warm amber pendant lamps, soft honey light, warm ivory acoustic panels, caramel timber floor, restrained charcoal metal, muted teal padded equipment, touches of plant green. A few plants beside the lift and at the room edges to link it to the campus interiors. Warm wood and amber lighting must stay visually dominant, balanced with modern clean equipment.
Critical game constraints: no characters, no people, no sprites, no UI, no text, no logos, no labels, no lettering, no interface overlays. No drafting tools or crafting tables anywhere. No large foreground props; the bottom 30% is only gently textured clear timber/rubber walking floor with soft reflected light and subtle floor seams. Camera and lighting must look like a consistent handcrafted game background, not a gym advertisement.


---

# High-tech workshop replacement

Generated with built-in image_gen, 2026-09-13. Final asset: public/studio100/model-workshop.png. Output: C:/Users/natth/.codex/generated_images/01a099b1-01fc-7692-9d81-90addfb8df27/exec-44189a31-d01d-45ff-9173-69eae63e7daf.png.

The original PNG was inspected via an in-memory preview after the local image helper failed. The referenced_image_paths tool call also failed on the same ACL helper. Final generation used the following description with no file attachment.

Use case: stylized-concept / environment redesign.
Asset type: production background for a 2D side-scrolling cute campus adventure game, one seamless room, wide 16:9 image.
Create a high-tech university fabrication workshop with front-on side-scroller composition and coherent painterly game-art style.
Scene: an inviting advanced architecture maker lab in a basement. Warm ivory and brushed-metal cabinets, exposed ceiling services, small trailing plants and architecture models, warm amber pendant lights, restrained soft cyan/teal screens and machine indicator lighting.
Subject: articulated robotic fabrication arms behind a glass safety screen at the center-left rear bench; dual CAD computer monitors showing elegant building wireframes and an abstract AI node network (no readable words) near the middle; two clearly recognizable enclosed 3D printing machines, a large printer and a compact desktop printer, on the right rear cabinets, with visible spools, gantries and small architectural models inside. Keep equipment substantial, sophisticated, distinct and readable.
Composition: view straight toward the back wall with very mild depth, for a side-scrolling game. A full-height elevator exit at the far left. Ceiling/back wall and machines occupy the upper 68 to 70 percent. Floor-wall junction is horizontal at 70 percent of image height. The lower 30 percent is an unbroken, unobstructed warm grey polished concrete walking floor, flat and empty from left to right. Machinery and all desks remain against the back wall. No giant freestanding foreground table: a separate interactive station will be drawn by the game at runtime.
Style: highly finished hand-painted 2D game environment illustration with delicate dark outlines, warm cozy amber light, softly shaded surfaces and clear shapes, with a cozy illustrated adventure-game atmosphere. Grounded school workshop, not a spaceship. Rich painted texture but not photographic, not a 3D render. Consistent scale and a complete room, no crop of the floor.
Constraints: no people, no character sprites, no UI, no labels, no logos, no readable text, no arrows, no borders, no watermark. Never photorealistic, never flat vector art, never bright neon cyberpunk. Preserve wide 16:9 framing.
---

# Equipment and student life — 2026-09-14

The expanded release keeps the same warm illustrated setting: muted jade and teal, ivory paper, aged gold, timber, amber light and readable dark outlines. New shop items are everyday study, household and sporting objects exaggerated for combat. Their inventory icons and equipped appearances use the same drawing geometry and colors rather than separate illustrations.

Production sources:

- `src/studio100/ItemArt.ts`: 20 purchasable items plus the three supported legacy basics, native handle anchors, icon framing and gloves drawn over both fists. Items retain recognizable silhouettes at gameplay size and remain attached during physical moves.
- `src/studio100/StudioArt.ts`: shared `toolDrawing()` and cached `toolIcon()` entry points used by world props, characters, shop cards and backpack slots.
- `src/studio100/CharacterRenderer.ts`: the shared customizable student and instructor renderer, with equipment held at the actual grip. Empty quick slots do not display starter items.
- `src/studio100/StudentLifeArt.ts`: a transparent 256 × 160 homework laptop texture with a jade architectural CAD screen, warm casing, pencil and mug. It is drawn in code and appears at the apartment study station.
- `src/studio100/DailyActivityVisuals.ts`: sleeping overlay using the existing customized portrait with closed eyes, rotated onto the apartment's left pillow. The blanket occlusion reuses the original room pixels at their original coordinates, preserving painted folds and avoiding an extra flat blanket. The normal standing sprite is hidden during sleep.
- `src/studio100/StudioGame.ts`: restaurant shift movement into position behind the counter, activity progress feedback, room placement and transitions. The clerk uses the same student character renderer with a muted green outfit.

The shop now sells equipment directly; no word-entry invention interface is presented. Saved invention modifiers remain supported for older equipment. Activity feedback distinguishes Knowledge, XP and coins: a 14-day studio calendar, a 5-Knowledge pass, a 7-Knowledge High Distinction with 90 coins, homework worth 0.5 Knowledge, and restaurant shifts worth 45 coins. Two daily activities share a stamina budget. UI labels and live counters remain separate from environment paintings.

Environment assets for this release:

- `public/studio100/campus-restaurant.png`: 2172 × 724 continuous campus street, extending beyond accommodation to the restaurant.
- `public/studio100/restaurant-interior.png`: 1672 × 941 restaurant interior with a service counter and clear foreground walking floor.
- `public/studio100/apartment-interior.png`: existing 1774 × 887 apartment illustration, reused unchanged for the laptop and in-bed sleeping interactions.

Artwork checks are stored in the ignored development directory: `development/checkpoints/studio100/item-art-contact.png`, `apartment-laptop.png` and `apartment-sleep-preview.jpg`. The equipment sheet checks all 23 items at rest and attacking; 460 pose/attack combinations were checked against the 130 × 165 sprite boundary without clipping.


---

# Restaurant environment generation — 2026-09-14

Both environments were generated with the built-in image_gen tool. The following prompts are retained verbatim; requested dimensions in a prompt may differ from the actual generated output recorded below.

## Continuous campus street

Final asset: `public/studio100/campus-restaurant.png` (2172 × 724). Generated source: `C:/Users/natth/.codex/generated_images/01a092d4-ded8-7f61-b758-d0b0bdc95638/exec-de22fd66-3788-4984-a450-b5542d621116.png`.

```text
Use case: stylized-concept. Asset: a continuous extra-wide side-scrolling 2D game background. Generate a brand-new SINGLE CONTINUOUS PANORAMA of the game's Melbourne campus street with a Chinese noodle restaurant after the student accommodation. Preserve the same charming detailed hand-painted architectural illustration, clean fine outlines, violet peach Melbourne dusk, golden windows, sage plants, brick and stone materials, frontal street elevation perspective and uninterrupted level pavement. Desired canvas VERY WIDE 3840 by 864 pixels (about 4.44:1), not a normal landscape crop. Four destinations left to right: mysterious purple shop at x10% with archeddoor; RMIT Building100 DesignHub with iconic circular glass sunshades at x35%; modern brick student accommodation at x63%; cozy Chinese ramen/noodle restaurant at x88% with red lanterns, deep jade timber framing, warm lit windows, brass details, and open-visible service counter through glass. Each entry door centered at these approximate x percentages and doors reach the SAME ground line at y78%. Extend pavement naturally across entire lower22% with no obstacles in foreground walkway. Include a subtle Melbourne skyline and trees between buildings. The restaurant should look integrated in the same street, not a pasted-on panel. Keep the four described destinations clearly recognisable. Blank signboards above apartment entrance and restaurant; game will overlay readable names. NO text, no characters, no HUD, no UI, no watermark, no borders, no diptych, no seams. Paint the whole street as one coherent image. Preserve pleasing architectural proportions and same warm high-quality game art.
```

## Lucky Lantern Noodles interior

Final asset: `public/studio100/restaurant-interior.png` (1672 × 941). Generated source: `C:/Users/natth/.codex/generated_images/01a092d4-ded8-7f61-b758-d0b0bdc95638/exec-f39367fb-d6c5-49f5-a814-c854c8d97b8f.png`.

```text
Use case: stylized-concept. Asset type: playable Chinese ramen/noodle restaurant interior background for a side-scrolling 2D student-life RPG set in Melbourne. Brand-new artwork in a consistent warm hand-painted architectural game illustration style: detailed wood and brick textures, fine dark outlines, softly shaded objects, gentle cinematic warm golden lighting, muted jade-green accents and deep red lanterns, a cozy slightly magical everyday atmosphere. Wide16:9landscape, ideally2048x1152. FRONTAL elevation-like view at character eye level, very little tilted perspective, one single room. Leftmost12%: a clearly visible wooden glass entrydoor leading to violet Melbourne twilight, with hangingredlantern. Middle: a few diningtables and smallstools set BACK against the wall, shelves with ceramic noodle bowls, chopsticks, menu boards with subtle decorative marks, modest plants. Right65-90%: an obvious Chinese noodle restaurant cashier COUNTER with a compact cash register/cardterminal at about72%width, bowls,order slips, chopstickpots; behindcounter steamy noodle cookingstation,stockpots, stainlesssteel prep surfaces, warmwood shelves. NO people or characters: cashier will be a live game character added incode. Keep the entire bottom25% an OPEN unobstructed tiledfloor for character movement; counter backedge and allfixedfurniture base atabout74-77%imageheight, single consistent ground line. Strong readable shapes fitting cute chibi characters, restaurant looks like a place to work a part-time shift. No giant signage, nolegibletext, noHUD, nointerface, noborder, nowatermark. Same rich cozy lighting and delicate architectural illustration detail as the game's mysterious shop and campus scenes.
```
