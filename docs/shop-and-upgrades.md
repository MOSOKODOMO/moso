# Shop and upgrade direction

Shop and upgrade notes for Fight Your Way to Architecture. The drawing board, scale ruler and mechanical pencil below remain planned.

Implemented: Mika offers Invent with words in the mysterious shop. B2 selects a weapon, levels it up (+4 attack power per level), enhances it (up to 15% shorter attack cooldown), or embeds one relic. Ink gives +3 weapon damage, Prism gives +15% reach, and Gale gives 10% shorter attack cooldown. Embedding costs 80 coins including the relic; replacing it costs 80 coins. B1 training costs 40–80 stamina per rank: endurance grants +20 maximum stamina and +4% movement speed; strength grants +3 damage to all attacks.

Mika sells unusual equipment in the mysterious shop. B2 fabricates and upgrades equipment. B1 trains the student's stamina and physical strength. Keeping each room's purpose distinct makes the system easier to learn.

| Item | Basic action | Special action | B2 upgrades | Trade-off |
| --- | --- | --- | --- | --- |
| Drawing board | Short shield bash | Hold to block frontal attacks; blocking consumes stamina | Reinforced surface, stronger bash, lighter frame | Strong defence, short reach |
| Scale ruler | Long swinging strike | Extend for a straight thrust, then retract during a cooldown | Telescoping reach, quicker retraction, impact joint | Good spacing, slow recovery after a miss |
| Mechanical pencil | Fire a piece of graphite lead | Aimed charged shot | Lead magazine, feed speed, reinforced tip | Ranged pressure, needs a short reload |

Start with one special action per item. Use the existing attack button for the basic action and one equipment-action slot for the special. Keep uppercut, kick and dodge as physical moves. Test the drawing board first: blocking introduces the largest change to combat, because it must distinguish direction, stamina cost, projectiles and knockback.

A small catalogue is the simplest implementation. Each tool has a stable id, price, damage, reach, recovery, upgrade rank and one allowed special. Reuse the current projectiles, hit effects and save data migration. Set prices only after comparing earnings from classes and studio victories; avoid selling a tool whose best upgrade removes all its weaknesses.

## Inventing with words

Mika offers a local recipe builder for pen, ruler and cup in the mysterious shop. It interprets a few handling words, keeps fixed silhouettes and saves one variant per tool. It is not connected to an AI service.

Three implementation options:

1. Expand local recipes: immediate results, no service bill, predictable balance; limited interpretations and silhouettes. Recommended first step.
2. AI-assisted blueprint: a server interprets a phrase into an approved base tool, appearance modifiers and one allowed effect. The game calculates stats and price. Better variety, but adds hosting, request costs and failure handling.
3. Generate entirely new images and behaviours: greatest freedom, highest cost and complexity, hardest to animate and keep fair. Defer.

For an AI-assisted version, show a blueprint preview before charging in-game coins, allow cancellation, validate every field on the server, cap stats, and fall back to local recipes when generation is unavailable. Never execute generated code. Use approved components for the playable item so an invented drawing board still blocks consistently and holds at the correct grip point.

GitHub Pages serves the static game; real AI generation needs a separate server endpoint. Keep credentials there, add a small per-player request allowance and a shared spending cap. No paid AI service has been connected or provisioned by this update.

References: [GitHub Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) and [OpenAI API authentication](https://platform.openai.com/docs/api-reference/introduction).
