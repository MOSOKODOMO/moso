# Fight Your Way — Architecture Journey

A cute Melbourne architecture-student adventure with nine studios, two ways to pass, playful classroom brawls, and a climb from the campus street into the Melbourne sky.

Create your student, balance class, homework and restaurant shifts, and rest in your apartment. The shared character rig uses compact proportions and articulated walking, running, jumping, landing and combat poses for students, teachers and Mika. Customize hair, face, clothing, trouser/shoe/backpack colours and accessories, including caps and beanies; preview movement and items, undo edits, or compare your saved look. Building 100 has its lobby on G, Studios 1–9 on L1–L9, the Student Gym on B1 and the Model Workshop on B2. Patrik teaches Studio 1. Completing Studio 9 unlocks exhibition duels with all 33 teachers. Later studios increase teacher health, damage, speed and tactical variety.

The outdoor calendar shows Monday–Sunday and alternates Semester 1 and Semester 2 every 14 in-game days, then repeats. Classes are closed on Saturdays and Sundays; the gym, workshop, restaurant and apartment remain available. Each studio also keeps its own 14-day study calendar. Submit at 5 Knowledge for a pass, or keep studying to 7 Knowledge for a High Distinction and a one-time 90-coin reward. Winning an instructor duel also passes the studio. Days after fourteen are catch-up days; unfinished work and earned Knowledge are kept.

## Student life

| Activity | Time | Reward |
| --- | --- | --- |
| Sit through class | 16 seconds | +1 Knowledge and +15 XP |
| Use the apartment laptop for homework | 12 seconds | +0.5 Knowledge and +8 XP |
| Work at Lucky Lantern Noodles | 15 seconds | +45 coins |

Up to two completed activities share each day's stamina budget. Each costs half the maximum stamina recorded when the first activity finishes, so a level-up cannot change the price halfway through the day. Class and homework can each be completed once per studio per day; restaurant work can fill either or both activity slots. Movement or jumping cancels an unfinished activity without spending stamina or awarding partial rewards. Ordinary classes award learning and XP; restaurant shifts are the repeatable source of coins.

Walk right past student accommodation to find Lucky Lantern Noodles. Two seated customers eat at the restaurant tables. Walking stays in front of the cashier counter; starting a shift hops your character behind it. At home, jump onto the chair or desk on the right to reach the laptop; sleeping places your customized character on the bed's pillow, under the existing blanket, restores stamina and starts a new day.

The apartment uses a smaller, consistent furniture scale. Beds, chairs, tables and counters in the apartment, restaurant and mysterious shop are jumpable; press S or the down control to drop to a lower surface. Outdoor planters, shop and restaurant roofs, Building 100 ledges, foyer displays and the archive frame are climbable too. Continue up the extended tower to cloud platforms, hot-air balloon baskets and balloon crowns; the camera follows upward. Students sketch in weekday classrooms, and nearby campus groups chat about student life. Knowledge and studio completion appear only inside Building 100. Other scenes show the weekday and semester.

## Equipment and upgrades

New students start unarmed with 90 coins, an empty backpack and three empty quick slots. Talk to Mika inside the mysterious shop to buy equipment directly. The 20-item catalog contains a hardcover book, knuckle gloves, baseball bat, umbrella, drawing board, mechanical pencil, scale ruler, paintbrush, stapler, eraser, tape measure, tape dispenser, water bottle, desk lamp, rolled poster, tennis racket, frying pan, skateboard, loaded backpack and calculator. Each has matching handheld artwork, attack stats and an equipment skill. Basic attacks, physical moves and equipped skills work across every room; decorative bystanders are not combat targets.

Purchases stay in your backpack; use its loadout controls to choose your three quick slots. B2 modifies owned equipment through level-ups, enhancement and one embedded relic. B1 training uses stamina: endurance improves maximum stamina and movement speed, while strength improves every attack. Training endurance raises the maximum without refilling current stamina. Gym machines, benches and racks are jumpable. Pick up loose dumbbells and a barbell with E, then use E or Space to throw them; weights bounce, settle and can be picked up again. The punching bag reacts to punches, kicks, equipment skills and thrown objects with a damped swing. Loose gym weights do not enter the paid inventory.

Word-based invention is no longer offered in the shop. Valid earlier studio completions, paid legacy equipment, invention modifiers and upgrades are retained when loading older saves. The old pen, ruler and cup remain supported for those saved items and classroom props.

The nine studios are Foundations, Form & Space, Material & Texture, Structure & Balance, Light & Shadow, Dwelling & Place, City & Context, Composition & Detail, and The Grand Atelier. The professor archive uses original architecture themes.

## Play

Desktop: A/D or arrows move, W jumps, S drops through platforms, Space attacks, K uppercuts, L jump-kicks, Shift dodges, and E interacts or grabs/throws classroom or gym objects. 1/2/3 select quick slots, R uses the equipped item's skill, I opens the backpack, and M opens the floor directory only while standing in front of either lift in the Building 100 lobby. Exit classrooms through the far-left door to fade back to the ground-floor lobby. Escape opens the Menu, where you can save, restart, change key bindings and adjust graphics or sound.

Phones: stand in front of either Building 100 lobby lift and tap its door to choose a floor. Use the on-screen movement, jump, interaction and attack controls, plus the equipment-skill and backpack buttons. Physical-move buttons sit above the movement controls. Both portrait and landscape layouts are supported. Add the page to your home screen for a standalone window. An internet connection is required; offline play is not provided.

Progress is stored in this browser on this device. It does not sync between devices or automatically transfer from the local preview to the online game.

## Development

Run `npm ci`, then `npm run dev`. Run `npm run build` for the static release. The original farming game remains available at `?mode=farm` and has a separate save.

## GitHub Pages

Target repository: https://github.com/MOSOKODOMO/moso

In repository Settings → Pages, select GitHub Actions. Pushing to `main` runs the included build and deployment workflow. All game asset paths support the `/moso/` project path.

The workflow follows [GitHub's Pages deployment guide](https://docs.github.com/en/get-started/start-your-journey/deploying-your-website-automatically).

## Credits

Original illustrated environments and code-drawn characters. Teacher characters use sound-alike first-name aliases. Their dialogue, physical moves and duels are fictional, playful interpretations; this game is not an official RMIT product.
