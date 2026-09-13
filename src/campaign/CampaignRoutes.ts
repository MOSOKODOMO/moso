/**
 * Authored campaign chambers. Game owns room checkpoints, individual wave kills,
 * clue choices and one-time rewards; this file is deterministic content only.
 * Every enemy here is a normal monster. Floor 1 must retain the map's passive
 * rule. Wrong choices should allow a clue-guided retry, without a timer,
 * resource penalty, repeated wave or rare-drop requirement.
 */
import type { MonsterId } from '../config/EnemyConfig';

export interface RouteChallenge {
  prompt: string;
  clue: string;
  choices: string[];
  /** Zero-based index. */
  answer: number;
  success: string;
}
export interface RouteRoom {
  id: string;
  title: string;
  intro: string[];
  waves: MonsterId[][];
  challenge?: RouteChallenge;
  rewardGold: number;
}
const room = (
  id: string, title: string, intro: string[], waves: MonsterId[][],
  rewardGold: number, challenge?: RouteChallenge,
): RouteRoom => ({ id, title, intro, waves, rewardGold, ...(challenge ? { challenge } : {}) });
const choice = (
  prompt: string, clue: string, choices: string[], answer: number, success: string,
): RouteChallenge => ({ prompt, clue, choices, answer, success });

export const ROUTES: Record<number, RouteRoom[]> = {
  1: [
    room('f1-room1', 'Sunlit Practice Yard', [
      'Mira has tied a green ribbon to the ruined gate: “Take your time. These creatures cannot hurt you.”',
      'Practise basic attacks on the slimes, then approach the second little group. Character level 3 opens your choice of a first skill; you do not need to choose it now.',
    ], [['slime', 'slime'], ['slime', 'slime']], 6),
    room('f1-room2', 'The Gardener’s Steps', [
      'Mushrooms have grown through the steps of an old kitchen garden. A wooden sign explains why the village once left this corner wild.',
      'The first group stays near the path; the second mixes slimes and mushrooms. Try changing your distance without worrying about damage.',
    ], [['mushroom', 'slime'], ['mushroom', 'slime', 'slime']], 7, choice(
      'Which instruction belongs on the repaired garden sign?',
      'The gardener wrote: “Leave the living roots in place. Brush away the loose stones so rain can reach them.”',
      ['Pull out every root', 'Clear the loose stones', 'Cover the soil with metal'], 1,
      'Water finds the old channel again. The garden’s little crystal lamp answers with a pale flicker.',
    )),
    room('f1-room3', 'Ribbon Bridge', [
      'Blue ribbons mark the old footbridge. Harmless bats drift between its supports while mushrooms wait below.',
      'Compare a target above you with one on the ground. Jumping and landing safely matter more than rushing through a crowd.',
    ], [['bat', 'mushroom'], ['bat', 'slime', 'mushroom']], 8, choice(
      'A faded trail chart shows three routes. Which is the marked village route?',
      'The chart says the village path is marked with blue ribbons; red dots mark an abandoned mine and white crosses mark fallen trees.',
      ['The red-dotted mine trail', 'The white-crossed clearing', 'The blue-ribbon path'], 2,
      'You restore the village marker. A family once used this bridge to carry food into the ruins.',
    )),
    room('f1-room4', 'The Lantern Keeper’s Nook', [
      'An empty lantern hangs over a stone bench. Its keeper left a note about the village crystal, long before anyone noticed it fading.',
      'Finish the two small groups, then inspect the lantern. If you have reached level 3, open Stats and choose whichever first skill you prefer.',
    ], [['slime', 'mushroom', 'slime'], ['bat', 'slime']], 9, choice(
      'What should be placed in the lantern’s empty socket?',
      'The socket has a three-pointed shape. The note warns that a round coin fits loosely and a square stone blocks the shutter.',
      ['The three-pointed crystal shard', 'A round copper coin', 'A square paving stone'], 0,
      'The shutter opens around the shard. A thread of light points toward the soldier’s marker.',
    )),
    room('f1-room5', 'Skill Blossom Clearing', [
      'Three flowers are painted on the clearing’s wall: a cutting wind, falling stars and a bright heart. None is marked as the right choice.',
      'This is a safe place to try a learned skill. Your chosen skill keeps its own hotbar slot; the other slots stay empty until you learn them.',
    ], [['slime', 'slime', 'mushroom'], ['bat', 'mushroom', 'slime']], 10),
    room('f1-room6', 'The Soldier’s Picnic', [
      'A child’s cup sits beside a soldier’s rusted badge. The last patrol stopped here to share food with families leaving the kingdom.',
      'The final little groups are still harmless. Beyond them waits the gentle giant slime and the missing half of the soldier’s seal.',
    ], [['mushroom', 'slime', 'bat'], ['slime', 'mushroom', 'slime']], 12, choice(
      'How should the two halves of the old badge be joined?',
      'One half reads “Protect the…” and the other reads “…people before the crown.” Their broken edges form a single arch.',
      ['Put the crown above the people', 'Join the arch: protect the people before the crown', 'Replace both halves with a new order'], 1,
      'The joined words reveal the patrol’s purpose. The seal belongs to a promise, not a treasure chest.',
    )),
  ],

  2: [
    room('f2-room1', 'Quiet Ossuary', [
      'The first crypt sentries turn slowly when they see you. Their weapons rise well before a strike lands.',
      'Meet one skeleton at a time and watch each slow wind-up. After both ground sentries, a single bat lets you practise following a flying target without another attacker beside it.',
    ], [['skeleton'], ['skeleton'], ['bat']], 12),
    room('f2-room2', 'The Roll of Names', [
      'A roll of names lists guards and villagers together. Three carved ledgers stand beneath it, but only one matches the final evacuation.',
      'The sentries repeat the names as if waiting for an answer that never came.',
    ], [['skeleton', 'bat'], ['skeleton', 'skeleton', 'bat']], 13, choice(
      'Which ledger records everyone who left through this passage?',
      'The roll lists Ada, Bram and Ceri. One ledger omits Ceri; another adds Doran, who was assigned to the western tunnel.',
      ['Ada, Bram, Doran', 'Ada, Bram, Ceri', 'Ada and Bram only'], 1,
      'You return the complete roll to the stand. One of the distant marching rhythms falls silent.',
    )),
    room('f2-room3', 'Empty Barracks', [
      'Blankets remain folded beside shields that nobody returned to collect. The soldiers were ordered to make room for children, not another patrol.',
      'A ground-only group lets you read the slow attacks. The next introduces a bat without adding another heavy front line.',
    ], [['skeleton', 'skeleton'], ['bat', 'skeleton', 'bat']], 14, choice(
      'Which room assignment follows the quartermaster’s note?',
      '“Give the warm inner room to the youngest evacuees. Guards may sleep beside the outer door.”',
      ['Guards inside; children at the door', 'Leave the inner room empty', 'Children inside; guards at the outer door'], 2,
      'The barracks memory settles. A folded blanket carries the same green thread as Mira’s ribbon.',
    )),
    room('f2-room4', 'Lantern Watch', [
      'The watch lantern has three shutters. Its keeper used them to distinguish a warning from an evacuation signal.',
      'Bats interrupt the watch route while skeletons hold the path. Choose one target, finish it, and open space before pursuing the next.',
    ], [['bat', 'skeleton', 'bat'], ['skeleton', 'skeleton']], 15, choice(
      'Which shutter signal tells the families that the passage is clear?',
      'The keeper’s card says: one open shutter means “wait”; two mean “danger”; all three mean “passage clear.”',
      ['Open all three shutters', 'Open one shutter', 'Open two shutters'], 0,
      'Three small beams cross the crypt. The old signal finally reaches the other end of the watch.',
    )),
    room('f2-room5', 'The Broken Supply Line', [
      'The crypt’s last supply cart never reached the barracks. Its manifest shows medicine under the flour sacks.',
      'Two separated guard groups keep this corridor occupied. Watch the recovering skeleton before moving toward the bat behind it.',
    ], [['skeleton', 'bat'], ['skeleton', 'skeleton', 'bat']], 16),
    room('f2-room6', 'Messenger’s Rest', [
      'A messenger’s echo still clutches an unsigned order. He would not leave until someone confirmed which commander had sent it.',
      'The order’s seal survived; the ink below it has almost vanished. Its three symbols provide the missing direction.',
    ], [['skeleton', 'skeleton', 'bat'], ['bat', 'skeleton']], 17, choice(
      'Which route should receive the messenger’s order?',
      'The intact seal shows a bone arch, a lantern and two steps down. The northern route has no arch; the east route climbs upward.',
      ['The northern open tunnel', 'The descending crypt route beneath the bone arch', 'The eastern climbing stair'], 1,
      'The messenger lowers his hand. The captain’s order is on its way at last.',
    )),
    room('f2-room7', 'Captain’s Muster', [
      'The captain’s company was never defeated here. It simply kept waiting after the families had gone.',
      'The first group guards the muster board; the second circles its lower edge. Read the last order before entering the captain’s rest.',
    ], [['skeleton', 'skeleton', 'bat'], ['skeleton', 'bat', 'skeleton']], 18, choice(
      'What release should be added beneath the captain’s last order?',
      'The order says to hold until every family has crossed. The repaired roll and three-shutter signal confirm the passage is empty and clear.',
      ['Hold the passage forever', 'Pursue the departed families', 'The evacuation is complete; stand down'], 2,
      'The ink glows once. The captain can now hear the release you came to deliver.',
    )),
    room('f2-room8', 'The Spare Signal Gate', [
      'A side passage beyond the muster board leads to a second evacuation gate. Its signal failed when the messenger’s lamp cracked, leaving two groups of guards on opposite sides.',
      'Clear each guard group separately. The replacement shutter must tell the waiting patrol where the families actually went, rather than simply repeat the old all-clear.',
    ], [['skeleton', 'bat'], ['skeleton', 'skeleton']], 18, choice(
      'Which replacement signal matches the evacuation record?',
      'The brass card assigns amber to the north stair and blue to the south ramp. The final roll says the north stair collapsed before all five families used the south ramp.',
      ['Blue: the south ramp', 'Amber: the north stair', 'Alternate both signals without choosing a route'], 0,
      'The blue shutter lights the ramp marker. The separated patrols can stop guarding an exit that nobody could use.',
    )),
    room('f2-room9', 'The Handover Alcove', [
      'The next alcove holds a captain’s receipt and a porter’s tally. They describe the same evacuation with different groupings, which the crypt’s clerk mistook for missing people.',
      'A bat distracts the first guard pair; the second group waits beside the tally shelf. Compare people, not the number of carts, before completing the handover.',
    ], [['skeleton', 'skeleton', 'bat'], ['skeleton', 'bat']], 19, choice(
      'Which handover total agrees with both records?',
      'The captain recorded four walkers and two children. The porter recorded two carts carrying one child each, with four adults walking beside them. Nobody appears on both tallies twice.',
      ['Four people; carts count as luggage', 'Six people transferred to the surface', 'Eight people; add each cart as another passenger'], 1,
      'Six names fill the handover line. The clerk’s echo finally closes a case that had remained open for generations.',
    )),
    room('f2-room10', 'The Returned Watch Token', [
      'The inner approach requires the watch token that should have returned with the last patrol. Three lost tokens bear marks from different posts.',
      'The final guards come in two short groups. Recovering the right token completes the release message without claiming that every abandoned object belonged to a missing soldier.',
    ], [['skeleton', 'bat'], ['skeleton', 'skeleton', 'bat']], 20, choice(
      'Which token belongs to the patrol released at this gate?',
      'The gate register identifies the south-ramp watch by a lantern on its front and two notches on its edge. One token has a lantern and one notch; another has a shield and two.',
      ['The shield with two notches', 'The lantern with one notch', 'The lantern with two notches'], 2,
      'The token fits the register. The crypt’s evacuation record is complete, leaving only the command still binding its captain.',
    )),
  ],

  3: [
    room('f3-room1', 'Redstone Descent', [
      'The cavern’s red veins pulse toward the lower passages. Cavern pups spring across the path while bats patrol above them.',
      'Let a lunge pass before answering. The second wave reverses the balance, giving you more moving targets overhead.',
    ], [['fang', 'fang', 'bat'], ['bat', 'fang', 'bat']], 18),
    room('f3-room2', 'Surveyor’s Shelf', [
      'A surveyor marked the ledges with footprints and wing strokes. The marks describe the creatures that nested here before the crystals changed.',
      'Clear the shelf in two groups and compare how ground and flying targets move.',
    ], [['bat', 'bat'], ['fang', 'bat', 'fang']], 19, choice(
      'Which observation belongs in the surveyor’s unfinished row?',
      'The row is headed “Moves above the path without landing.” Footprints belong to pups; wing strokes belong to bats.',
      ['Wing strokes: bats', 'Footprints: pups', 'Neither creature moves'], 0,
      'The survey record is complete. Its margin points to a narrow maintenance channel beneath the roost.',
    )),
    room('f3-room3', 'The Dry Channel', [
      'Water once cooled the red crystals through this channel. The miners closed the wrong valve when the glow first turned crimson.',
      'Pups occupy the drained path and bats shelter beside the pipes. The valve chart is still readable after the route is clear.',
    ], [['fang', 'bat', 'fang'], ['fang', 'fang']], 20, choice(
      'Which valve restores cooling without feeding the red conduit?',
      'Valve A joins the crimson power pipe. Valve B reaches the blue cooling channel. Valve C ends in a broken tank.',
      ['Valve A', 'Valve B', 'Valve C'], 1,
      'Cool water enters the channel. The nearest crystal dims, and the main conduit becomes easier to trace.',
    )),
    room('f3-room4', 'Echo Roost', [
      'A miner’s whistle echoes from the hanging stone. It was used to clear bats from the work ledges without collapsing the cave.',
      'The first wave is airborne; the next adds a lunging pup. Keep track of the target you are following before changing height.',
    ], [['bat', 'bat', 'bat'], ['fang', 'bat', 'bat']], 21),
    room('f3-room5', 'Three Veins Crossing', [
      'Three crystal veins meet around an old inspection wheel. Only one carries energy toward the royal heart; the others return unused power.',
      'The crossing attracts creatures from both levels of the cavern. Finish the nearer group before studying the arrows.',
    ], [['fang', 'fang', 'bat'], ['bat', 'fang', 'bat']], 22, choice(
      'Which vein should be disconnected from the crossing?',
      'Vein I has arrows pointing up to the surface. Vein II circles the cooling pool. Vein III points down toward the heart symbol.',
      ['Vein I', 'Vein II', 'Vein III'], 2,
      'The descending vein disconnects. A low growl rises from the hollow below, no longer strengthened by that feed.',
    )),
    room('f3-room6', 'The Miners’ Table', [
      'A meal was abandoned beside a map of the lower cavern. The miners argued about whether the beast was attacking them or guarding its nest.',
      'Pups rush along the low path while bats gather at the table’s broken canopy.',
    ], [['fang', 'bat'], ['fang', 'fang', 'bat']], 24, choice(
      'Which conclusion is supported by the miners’ notes?',
      '“It charged whenever the red pipe brightened. When the pipe went dark, it returned to the nest and ignored us.”',
      ['The red energy was driving its attacks', 'It always attacked without a cause', 'It was obeying a written royal order'], 0,
      'You mark the beast as another victim of the power network. The goal is to break its hold, not destroy its home.',
    )),
    room('f3-room7', 'Fang Hollow Approach', [
      'The cooling water and disconnected vein meet at the edge of the hollow. The beast’s shadow no longer fills the entire wall.',
      'Two mixed groups ask you to combine target choice with space after a lunge. The maintenance wing beyond them leads to the central conduit.',
    ], [['fang', 'fang', 'bat'], ['bat', 'fang', 'fang']], 25, choice(
      'Which order safely isolates the hollow’s power feed?',
      'The service note reads: “Cooling must flow before the descending vein is cut. Isolate the central feed only after both are ready.”',
      ['Cut the central feed before opening cooling', 'Cooling, descending vein, then central feed', 'Close cooling and reconnect the descending vein'], 1,
      'The isolation wheel locks in place. The hollow is ready for your confrontation with the Blood Fang Beast.',
    )),
    room('f3-room8', 'The Upper Nest Bypass', [
      'Maintenance steps rise beyond the hollow. A later repair sent warm runoff beneath the roost instead of around its nesting shelf.',
      'The first group is mostly airborne; the next brings pups onto the low path. Clear enough space to read the route plate without chasing one target into another.',
    ], [['bat', 'bat', 'fang'], ['fang', 'bat']], 25, choice(
      'Which bypass keeps the cooling return away from the nest?',
      'The plate shows Route A under the occupied nest, Route B around the empty outer shelf and Route C back into the crimson feed. All three reach the same lower junction eventually.',
      ['Route A beneath the nest', 'Route B around the empty shelf', 'Route C through the crimson feed'], 1,
      'The return shifts to the outer shelf. The nest keeps its shelter while the lower cooling junction receives the water it needs.',
    )),
    room('f3-room9', 'The Survey Pins', [
      'Survey pins identify a pipe replaced after a cave-in. Its joints are sound, but someone copied a backward direction marker from an obsolete drawing.',
      'Pups hold the inspection area; bats cross the second group. Use the dated repair note and the present arrow together before accepting the drawing.',
    ], [['fang', 'fang'], ['bat', 'fang', 'bat']], 26, choice(
      'Which correction does the repair evidence support?',
      'The oldest drawing sends water east. The dated repair note says the replacement must send it west to the new basin. The fresh pipe’s arrow still points east; its joints are unbroken.',
      ['Break the sound replacement pipe', 'Ignore the newer basin and follow the oldest drawing', 'Turn the fresh pipe’s direction marker west'], 2,
      'The corrected marker agrees with the replacement basin. The next repairer will not repeat the mistake simply because an older drawing looks official.',
    )),
    room('f3-room10', 'The Sleeping Vein', [
      'The approach wing contains a crystal vein glowing after its supply is cut. An apprentice mistook its glow for a failed shutdown.',
      'The defenders arrive as two mixed groups. Read the inspection measurements before deciding whether a faint glow means active power or stored warmth.',
    ], [['fang', 'bat', 'fang'], ['bat', 'bat', 'fang']], 27, choice(
      'What does the inspection card say about the remaining glow?',
      'The inlet gauge reads zero flow, the return is open and the crystal grows dimmer between successive recorded readings. The card labels this combination “stored energy draining safely.”',
      ['Leave the isolated vein draining through its open return', 'Reopen the crimson inlet because any glow means failure', 'Seal the return to trap the remaining energy'], 0,
      'The vein stays isolated and continues to fade. You reach the beast’s chamber without feeding it anew out of fear.',
    )),
  ],

  4: [
    room('f4-room1', 'Whispering Index', [
      'The library index still offers directions to readers who died generations ago. Its pagekeepers mark the ground before their spells arrive.',
      'Move away from the visible mark, then close the distance. A later wisp introduces a second source of warnings.',
    ], [['mage', 'ghost'], ['ghost', 'mage', 'ghost']], 24, choice(
      'Which shelf holds the earliest record of the royal heart?',
      'The index assigns construction records to Copper, royal speeches to Silver and later disaster reports to Black.',
      ['Silver: speeches', 'Black: disaster reports', 'Copper: construction records'], 2,
      'A drawer opens beneath the copper mark. The king’s first sketch shows a shelter, not a weapon.',
    )),
    room('f4-room2', 'The Margin Stair', [
      'Notes crowd every stair-side shelf. The scholar corrected his own conclusions whenever another record contradicted them.',
      'Ghosts drift through the first group. The second adds one pagekeeper, so choose whether to clear the nearer body or the source of distant marks.',
    ], [['ghost', 'ghost', 'bat'], ['mage', 'ghost']], 25),
    room('f4-room3', 'Gallery of False Dates', [
      'Three versions of the same report disagree about when the heart first failed. The original paper can be recognized without trusting its title.',
      'The sentries guard the copied reports as fiercely as the real one.',
    ], [['mage', 'ghost'], ['mage', 'mage', 'ghost']], 26, choice(
      'Which report was written before the disaster?',
      'The original is dated before the winter evacuation and describes a working village beacon. Both later copies mention an already dark beacon.',
      ['The report describing a working beacon before evacuation', 'The copy describing the dark beacon after evacuation', 'The undated copy saying the beacon had always been dark'], 0,
      'The original confirms the heart once helped the village. Something changed after it was connected to the deeper network.',
    )),
    room('f4-room4', 'Reading Room of Two Voices', [
      'The king’s words and the engineer’s reply are written on opposite sides of a long table. Read both before deciding what they meant.',
      'Two staged groups of wisps and pagekeepers occupy the room. Their overlapping marks are an invitation to reposition, not stand still and trade damage.',
    ], [['ghost', 'mage', 'ghost'], ['mage', 'ghost', 'mage']], 27, choice(
      'Which summary includes both sides of the exchange?',
      'The king asked for warmth for his people. The engineer warned that an unknown voice was answering from below the heart.',
      ['The king ordered the village abandoned', 'A protective project was exposed to an unknown influence', 'The engineer reported that no power source existed'], 1,
      'The two pages fit together. The darkness exploited a wish to protect the kingdom.',
    )),
    room('f4-room5', 'Astral Lens Workshop', [
      'The library’s lens splits light into three paths. Its maker left one simple rule for showing conduits rather than decorations.',
      'A pagekeeper and its wisps guard the workbench; another pair emerges beside the unfinished lens.',
    ], [['mage', 'ghost', 'ghost'], ['mage', 'ghost']], 29, choice(
      'Which lens setting reveals the energy network?',
      'The maker labelled the clear pane “stone,” the gold pane “paint,” and the blue pane “moving energy.”',
      ['Clear pane', 'Gold pane', 'Blue pane'], 2,
      'Blue lines appear through the floor. They connect the fortress relay, both furnaces and the royal throne.',
    )),
    room('f4-room6', 'The Sealed Appendix', [
      'An appendix lists the people who tried to shut the project down. The scholar hid it behind a false account of his own success.',
      'The first wave emphasizes pagekeepers; the second emphasizes wisps. Change your target priority with the group rather than following one habit.',
    ], [['mage', 'mage'], ['ghost', 'ghost', 'mage']], 30),
    room('f4-room7', 'Scholar’s Unfinished Proof', [
      'At the archive door, the scholar left a proof with its final line missing. The evidence is gathered in the room’s own reading card.',
      'The archive defenders arrive in two small groups. Its authentication annex holds further evidence the Phantom Scholar tried to erase.',
    ], [['ghost', 'mage', 'ghost'], ['mage', 'ghost', 'mage']], 32, choice(
      'Which conclusion follows from the reading card?',
      'The village loses light when the deep network draws power. Disconnecting a conduit weakens that draw. Destroying the village lamp would remove its remaining light.',
      ['Disconnect the deep power network to protect the village lamp', 'Destroy the village lamp to make more light', 'Increase the network’s draw'], 0,
      'The completed proof breaks the archive’s false seal. The scholar must now face the evidence he hid.',
    )),
    room('f4-room8', 'The Watermarked Annex', [
      'The archive opens into an authentication wing. The scholar hid copies with impressive seals, hoping readers would choose authority over evidence.',
      'A wisp group crosses the first shelf; a pagekeeper joins the next. Compare the watermark, date and source note before treating any page as the original.',
    ], [['ghost', 'ghost'], ['mage', 'ghost', 'bat']], 32, choice(
      'Which page matches the archive’s original-making record?',
      'The workshop log says originals used reed watermarks before the evacuation. Page A has a crown watermark; B has reeds but a later copy date; C has reeds and the pre-evacuation date.',
      ['Page A with the crown watermark', 'Page B copied after evacuation', 'Page C with reeds and the earlier date'], 2,
      'The original enters the evidence folder. The archive’s confidence now rests on its source rather than the size of its seal.',
    )),
    room('f4-room9', 'The Missing Footnote', [
      'An engineer’s warning was shortened until it sounded like approval. The omitted footnote survives on a loose strip carried between two catalogues.',
      'The first encounter emphasizes pagekeepers; the second adds moving wisps. After creating space, read the claim and the footnote as a single statement.',
    ], [['mage', 'mage'], ['ghost', 'mage', 'ghost']], 33, choice(
      'Which summary restores the warning’s actual meaning?',
      'The main line reads “The heart may continue operating.” Its footnote adds “only while the deep inlet remains isolated; reconnecting it invites the unknown voice back into the circuit.”',
      ['Operation is conditional on keeping the deep inlet isolated', 'The engineer approved every possible connection', 'The footnote says the village return must be removed'], 0,
      'The restored condition changes the record from permission to a safeguard. The scholar can no longer hide behind a convenient quotation.',
    )),
    room('f4-room10', 'The Witness Concordance', [
      'The final annex compares two witnesses: a village beacon keeper and an underground engineer. Neither could see the whole event alone.',
      'Three short encounter groups alternate wisps and pagekeepers. Assemble the shared sequence instead of choosing whichever witness sounds more certain.',
    ], [['ghost', 'mage'], ['mage', 'bat'], ['ghost', 'ghost']], 34, choice(
      'Which sequence is supported by both witness records?',
      'The keeper records a dim beacon after the third bell. The engineer records the deep inlet reopening at the third bell, followed by an unfamiliar command. Neither reports a broken village lamp.',
      ['The village lamp broke before the inlet changed', 'The inlet reopened, an unknown command appeared, then the beacon dimmed', 'Both witnesses say nothing changed at the third bell'], 1,
      'The concordance joins cause and consequence without inventing a broken lamp. Its evidence accompanies you to the scholar’s final ward.',
    )),
  ],

  5: [
    room('f5-room1', 'The Sentry Vestibule', [
      'Iron sentries keep their guard while winding up, then expose their joints after a heavy strike.',
      'The first pair gives room to observe. The next group places an ordinary soldier beside a sentry so you can create space before committing to the guarded target.',
    ], [['armored', 'armored'], ['skeleton', 'armored', 'skeleton']], 30),
    room('f5-room2', 'Quartermaster’s Locks', [
      'The fortress stores tools by their purpose rather than their value. Three keys remain, but only one opens the maintenance rack.',
      'The rack was meant for workers who kept the defenses safe, not for officers collecting trophies.',
    ], [['armored', 'skeleton'], ['armored', 'mage']], 31, choice(
      'Which key belongs to the maintenance rack?',
      'The inventory lists the sword-mark key for weapons, the cup-mark key for rations and the wrench-mark key for repair tools.',
      ['The sword-mark key', 'The wrench-mark key', 'The cup-mark key'], 1,
      'The repair rack opens. An unfinished ward breaker waits beside its assembly card.',
    )),
    room('f5-room3', 'The Cold Anvil', [
      'A broad anvil carries the imprint of a three-toothed tool. The smith stopped before fitting its insulated handle.',
      'Clear a pair of guards, then a second group with a pagekeeper. The marked spell can be avoided while the heavy sentry recovers.',
    ], [['armored', 'skeleton'], ['mage', 'armored', 'skeleton']], 33, choice(
      'Which handle completes the ward breaker safely?',
      'The assembly card says the tool touches a live conduit. Dry ceramic insulates; bare iron and copper both conduct its energy.',
      ['Bare copper', 'Bare iron', 'Dry ceramic'], 2,
      'The ceramic handle locks into the tool. You can now work on the relay without becoming part of its circuit.',
    )),
    room('f5-room4', 'The Shield Gallery', [
      'The gallery celebrates defenders who stood aside to let civilians pass. Later officers changed the plaques to praise unbroken lines instead.',
      'One wave is mostly ordinary soldiers; the next is guarded sentries. Their different recovery windows reward a change of pace.',
    ], [['skeleton', 'skeleton', 'armored'], ['armored', 'armored']], 35),
    room('f5-room5', 'Relay Inspection Bay', [
      'The relay has a source socket, a village return and an abyss feed. The ward breaker can remove one link without smashing the machine.',
      'A pagekeeper defends the inspection chart while sentries hold the approach.',
    ], [['mage', 'armored'], ['armored', 'skeleton', 'mage']], 36, choice(
      'Which link should be removed from the relay?',
      'The chart marks V as the village return, S as the local source and A as the feed descending to the abyss. Only the descending feed must stop.',
      ['Link A', 'Link V', 'Link S and V together'], 0,
      'The abyss feed disconnects while the village return stays intact. You have interrupted the theft without destroying the way home.',
    )),
    room('f5-room6', 'The Engineer’s Test', [
      'An engineer’s recorded voice asks a final question before accepting the new relay setting. She feared that someone would mistake silence for a repair.',
      'The guards here arrive in three short pairs, leaving space to read each combination rather than facing a single crowded pile.',
    ], [['armored', 'skeleton'], ['mage', 'skeleton'], ['armored', 'mage']], 38, choice(
      'Which result demonstrates that the relay is safely isolated?',
      'The intended result is no power descending to the abyss while the village return indicator still glows. All-dark indicators could mean a broken return.',
      ['Every indicator is dark', 'Abyss indicator dark; village return lit', 'Abyss indicator brighter than before'], 1,
      'The test records a safe isolation. The engineer’s voice thanks the next worker for checking the whole circuit.',
    )),
    room('f5-room7', 'Warden’s Stair', [
      'The warden can still hear an alarm from a disconnected circuit. Its guards have never learned the difference between a fault and an intruder.',
      'Open a space among the stair’s mixed groups, then inspect the repair wing before facing the warden’s longer recovery windows.',
    ], [['armored', 'skeleton', 'mage'], ['armored', 'armored', 'skeleton']], 40, choice(
      'What report should be sent to the warden?',
      'The maintenance record shows the abyss feed isolated, the village return intact and no evacuation still inside the fortress.',
      ['The village return must be destroyed', 'Every worker is an intruder', 'The dangerous feed is isolated; stand down for maintenance'], 2,
      'The stair accepts the maintenance report. The warden’s remaining command must be broken in person.',
    )),
    room('f5-room8', 'The Hammer Calibration Hall', [
      'A work hall branches from the warden’s stair. Its relay hammer can loosen a stuck latch, but the correct head must fit without bending the insulated housing around it.',
      'A guarded pair controls the first rack. The second group adds a pagekeeper behind a lighter soldier, asking you to change target priority before reading the gauge.',
    ], [['armored', 'armored'], ['mage', 'skeleton', 'armored']], 40, choice(
      'Which hammer head meets the latch specification?',
      'The gauge requires a two-unit face with an insulated collar. Head A is two units with a bare collar; B is three units insulated; C is two units insulated.',
      ['Head A', 'Head B', 'Head C'], 2,
      'The calibrated head releases the latch without damaging its housing. Careful repair opens a route brute force would have destroyed.',
    )),
    room('f5-room9', 'The Paired Relay Works', [
      'Two relays share one return line. An unfinished repair ticket warns that disconnecting the wrong common link would silence both the dangerous circuit and the village beacon.',
      'The work floor is guarded in three short pairs. Deal with each combination before tracing the circuit labels through the repair drawing.',
    ], [['armored', 'skeleton'], ['mage', 'armored'], ['skeleton', 'mage']], 41, choice(
      'Which link isolates only the dangerous circuit?',
      'Link R is shared by both relays and leads to the village. Link A serves only the abyss relay. Link L serves only the local maintenance lamps. The fault is in the abyss branch.',
      ['Disconnect Link A; preserve R and L', 'Disconnect the shared Link R', 'Disconnect only the local Link L'], 0,
      'The faulty branch is isolated while the common return and work lights remain intact. The two relays can now be inspected separately.',
    )),
    room('f5-room10', 'The Last Repair Signature', [
      'The inner guard post accepts a maintenance report only if two independent checks agree. One inspector checked the hammer housing; another measured the repaired relay’s output.',
      'The final approach groups pair recovery windows with marked spells. The report should give the next worker measurements, not promises that machinery never fails.',
    ], [['armored', 'mage', 'skeleton'], ['armored', 'ghost']], 42, choice(
      'Which report is ready for the next worker to sign?',
      'The housing inspection says “insulation intact.” The output test says “abyss branch zero; village return live.” Report A includes both; B omits the return reading; C claims every branch is zero.',
      ['Report C: every branch is zero', 'Report A: intact insulation and both measured outputs', 'Report B: insulation only'], 1,
      'The signed repair leaves a clear handover. You enter the warden’s approach with evidence that the fortress is safer than when you arrived.',
    )),
  ],

  6: [
    room('f6-room1', 'Cooling Intake', [
      'The furnaces are hot, but their service instructions were written for people who needed to return home safely.',
      'Ember sprites mark or stomp before their attacks land. Watch the warning and leave yourself a clear route along the floor.',
    ], [['flame', 'flame'], ['flame', 'bat', 'flame']], 36),
    room('f6-room2', 'The Maintenance Ledger', [
      'The ledger records three coolant deliveries. One was clean, one was contaminated and one never arrived.',
      'A sentry guards the ledger while sprites occupy the channel it describes.',
    ], [['armored', 'flame'], ['flame', 'flame', 'bat']], 37, choice(
      'Which coolant tank is approved for the intake?',
      'Tank 1 is marked “oil contamination.” Tank 2 is marked “empty.” Tank 3 is marked “clean water, seal intact.”',
      ['Tank 1', 'Tank 2', 'Tank 3'], 2,
      'Clean coolant enters the intake. The service channel becomes available without disabling the village return.',
    )),
    room('f6-room3', 'Western Feed House', [
      'The western furnace feeds a hungry red line. Its shutoff must be separated from the cooling pump that keeps the housing safe.',
      'Two mixed groups defend different parts of the machinery. Finish the nearer threat before following a sprite toward the next guard.',
    ], [['flame', 'armored', 'flame'], ['armored', 'flame']], 38, choice(
      'Which control shuts the western energy feed without stopping cooling?',
      'The red lever is labelled “power feed”; the blue wheel is labelled “coolant circulation.” The instruction says cooling remains on during shutdown.',
      ['Close the red power-feed lever; leave the blue wheel open', 'Close the blue coolant wheel only', 'Open both controls fully'], 0,
      'The western feed falls quiet while coolant still moves through its housing.',
    )),
    room('f6-room4', 'Ash Bridge Stores', [
      'Spare bridge panels were stored above the ash channel. Their inspection tags matter more than how bright their metal looks.',
      'Bats cross over the first group; guarded workers hold the next. Pick a route that keeps a marked attack from blocking your retreat.',
    ], [['bat', 'flame', 'bat'], ['armored', 'flame', 'armored']], 39, choice(
      'Which spare panel should be selected from the store record?',
      'Panel A is shiny but cracked. Panel B is dull, uncracked and rated for furnace heat. Panel C is wooden packing material.',
      ['Panel A', 'Panel B', 'Panel C'], 1,
      'The sound panel is assigned to the service bridge. The old workers valued a safe repair over an impressive shine.',
    )),
    room('f6-room5', 'Eastern Pressure Gallery', [
      'The east gallery repeats the west furnace’s layout in reverse. Labels, rather than position, identify the controls.',
      'The first group is made of sprites; the next adds a slow sentry. Avoid copying a route blindly when the encounter changes.',
    ], [['flame', 'flame', 'flame'], ['flame', 'armored', 'bat']], 41),
    room('f6-room6', 'Eastern Feed House', [
      'A pressure card lists the state of the eastern furnace after the western feed was shut. One final valve must close to stop the draw.',
      'Three small groups occupy the feed house. Each adds a different distraction while keeping the number of simultaneous threats manageable.',
    ], [['flame', 'bat'], ['armored', 'flame'], ['flame', 'flame']], 42, choice(
      'Which valve completes the eastern shutdown?',
      'The card says the west feed is already closed, both coolant paths are open and the east red feed is still open.',
      ['Close both coolant paths', 'Reopen the west feed', 'Close the east red feed'], 2,
      'Both power feeds are shut. The furnaces no longer strengthen the royal heart.',
    )),
    room('f6-room7', 'The Workers’ Bell', [
      'The shift bell is not an alarm. Its plaque asks the final worker to confirm that nobody has been left inside before locking the lower gate.',
      'Sprites linger near the bell while a pair of sentries keeps the gate controls.',
    ], [['flame', 'flame', 'bat'], ['armored', 'armored']], 44, choice(
      'Which record is sufficient to close the work shift?',
      'The attendance slate lists six workers. Six exit marks are present, and the maintenance report confirms both power feeds are shut.',
      ['All six workers accounted for; both feeds shut', 'Only the western feed matters', 'The bell can replace the attendance check'], 0,
      'The final shift is recorded as complete. The workers’ bell rings for rest rather than another emergency.',
    )),
    room('f6-room8', 'Ember Cradle', [
      'The beast’s cradle was built around a furnace heart that no longer burns. It still lashes out at the command echo trapped inside it.',
      'The cradle guards combine grounded sentries, sprites and a bat. Use what you learned about marks and recovery before inspecting the cooling wing.',
    ], [['armored', 'flame', 'bat'], ['flame', 'armored', 'flame']], 46, choice(
      'What should the final cradle control preserve?',
      'The shutdown card says: “Keep the cooled housing and return line intact. Remove only the command feed holding the beast.”',
      ['Break the cooling housing', 'Disconnect the command feed and preserve the return line', 'Reconnect both furnace feeds'], 1,
      'The command feed loosens. You can confront the Ember Beast without restarting the furnaces.',
    )),
    room('f6-room9', 'The Coolant Balancing Wing', [
      'A cooling wing lies beneath the cradle’s service bridge. Its two return channels must share the remaining water without restarting either furnace feed.',
      'Sprites occupy the channels while a sentry holds the balancing board. The task is to distribute the recorded supply, not wait for a hidden timer or a lucky valve movement.',
    ], [['flame', 'flame', 'armored'], ['bat', 'flame', 'armored']], 46, choice(
      'Which allocation satisfies the cooling board?',
      'Six units are available. The west housing needs at least two and the east needs at least three; one spare unit may remain in reserve. Neither housing needs extra power.',
      ['Five west, one east', 'Two west, three east, one in reserve', 'One west, five east'], 1,
      'Both housings meet their cooling requirement and retain a reserve. The maintenance bridge no longer depends on an overheated single channel.',
    )),
    room('f6-room10', 'The Vent Inspector’s Gallery', [
      'The gallery distinguishes a relief vent from an energy inlet. A careless renovation painted both red, so color cannot identify the safe control.',
      'The first group combines sprites and bats; the second introduces an armored guard. Read the flow arrows and the service labels before moving a control.',
    ], [['flame', 'bat', 'flame'], ['armored', 'flame']], 47, choice(
      'Which control releases trapped pressure without feeding the heart?',
      'The left control’s arrow points inward from the abyss pipe. The center control points outward to a sealed catch vessel rated for heat. The right control is the village water intake.',
      ['Open the left abyss inlet', 'Close the village water intake', 'Open the center relief to its rated catch vessel'], 2,
      'The relief path accepts the trapped pressure while the abyss inlet stays shut. The old red paint no longer confuses the service record.',
    )),
    room('f6-room11', 'The Emergency Handover', [
      'The final furnace station records the safe state for the next worker. Repairs must outlive their maker, so every setting needs evidence.',
      'Three small groups guard the shelves. Select a handover that preserves safety and the channel carrying light home.',
    ], [['flame', 'armored'], ['bat', 'flame'], ['armored', 'flame']], 48, choice(
      'Which instruction should remain for the next shift?',
      'Both energy feeds are closed, cooling returns are open and the relief vessel is within its marked limit. The board warns that a closed cooling return can trap heat even when the feeds are off.',
      ['Keep feeds closed, check the relief vessel, and preserve open cooling returns', 'Close every return because the feeds are already off', 'Restart a feed to test whether the beast wakes'], 0,
      'The next shift inherits a usable safety record. The cooled cradle can now be approached without undoing the workers’ final shutdown.',
    )),
  ],

  7: [
    room('f7-room1', 'The Lower City Gate', [
      'The fallen city’s gate bears the names of the craftspeople who built it. The king’s name is smaller than theirs.',
      'Guards and wisps share the approach. A moving mark should not draw you straight into a sentry’s raised weapon.',
    ], [['skeleton', 'armored', 'ghost'], ['armored', 'ghost']], 44),
    room('f7-room2', 'Breadmakers’ Square', [
      'A memory of the last bread queue repeats in the empty square. The palace had enough flour, but an officer ordered it withheld.',
      'The quartermaster’s account shows what the king actually authorized.',
    ], [['ghost', 'skeleton', 'ghost'], ['armored', 'skeleton', 'mage']], 45, choice(
      'Which ration order matches the king’s signed account?',
      'The account says “Send the palace reserve to the public ovens.” A later unsigned margin says to keep it for officers.',
      ['Keep all flour for officers', 'Burn the reserve before evacuation', 'Release the palace reserve to the public ovens'], 2,
      'The public order is restored to the memory. The square remembers bread being shared, not a locked palace store.',
    )),
    room('f7-room3', 'The Garden of Names', [
      'Small stones in the royal garden name people the king failed to bring back from an earlier winter.',
      'Two groups guard opposite parts of the garden. The names ask for a careful reading rather than another promise of invulnerability.',
    ], [['armored', 'ghost'], ['ghost', 'ghost', 'mage']], 46, choice(
      'Which promise is consistent with the garden inscription?',
      'The inscription says “Remember each life. Do not turn people into a price for the crown’s survival.”',
      ['Protect the people even when the crown must yield', 'Protect the crown at any human cost', 'Erase the names to hide the failure'], 0,
      'The garden’s light steadies. The royal oath will not accept people as fuel for a symbol.',
    )),
    room('f7-room4', 'Council of Empty Chairs', [
      'Three council records describe the decision to build the heart. None alone tells the whole story.',
      'A pagekeeper holds the records behind a sentry. You can clear the supporting threat first or wait for the sentry’s opening.',
    ], [['mage', 'armored', 'skeleton'], ['mage', 'ghost', 'armored']], 48, choice(
      'Which summary includes the council’s evidence without inventing an excuse?',
      'The records say the winter threatened lives, the heart initially warmed homes and the engineer later warned about a new voice in its conduits.',
      ['The heart was built only as a weapon', 'A rescue project worked, then became dangerous when the warning was ignored', 'There was never a warning'], 1,
      'The council account admits both the good intention and the failure to listen. The throne’s defense weakens.',
    )),
    room('f7-room5', 'The Standard Bearer’s Walk', [
      'A torn royal standard marks the route used by the last returning patrol. Its bearer turned back to help the final family rather than preserve the flag.',
      'The first wave is mostly guards. The second mixes ghosts and a caster, changing the safe places to stand.',
    ], [['armored', 'skeleton', 'armored'], ['ghost', 'mage', 'ghost']], 50),
    room('f7-room6', 'Oathstone Court', [
      'The royal oath is carved into three joined stones. The middle stone has turned, changing the meaning of the sentence.',
      'Short, staged groups guard the court. Read the whole sentence before deciding how to restore it.',
    ], [['armored', 'ghost'], ['mage', 'skeleton'], ['armored', 'ghost']], 52, choice(
      'Which middle line restores the oath?',
      'The first stone says “No crown is worth more…” and the last says “…entrusted to its care.” The old rubbing includes the words “than one life.”',
      ['Than all the gold', 'Than the power', 'Than one life'], 2,
      'The oath reads clearly again: no crown is worth more than one life entrusted to its care.',
    )),
    room('f7-room7', 'The King’s Last Message', [
      'A message intended for the surface never left the throne hall. Its final line was covered by the command that possessed the king.',
      'The remaining guards defend the false command. Keep one escape route open when a ghost marks the floor beside a sentry.',
    ], [['ghost', 'armored', 'ghost'], ['mage', 'armored', 'skeleton']], 54, choice(
      'Which reply answers the message rather than the possessing command?',
      'The king wrote “If I cannot leave, bring my people’s light home.” The command stamped over it reads “Feed the heart; abandon the surface.”',
      ['We will bring the light home', 'We will abandon the surface', 'We will feed the heart more lives'], 0,
      'The original message shines through the stamp. The king can hear a reply meant for him.',
    )),
    room('f7-room8', 'The Uncrowned Threshold', [
      'The throne doors ask for neither wealth nor a title. They ask whether the bearer of the soldier’s seal remembers what it was for.',
      'Two groups combine the city’s guards and pagekeepers. The threshold opens toward the refuge court; beyond it, the king remains trapped in an unending command.',
    ], [['armored', 'mage', 'ghost'], ['armored', 'skeleton', 'mage']], 56, choice(
      'What purpose should be declared at the threshold?',
      'The soldier’s badge, the garden and the oath all place people before the crown. The king’s message asks for their light to be returned.',
      ['Take the crown and keep the stolen light', 'Free the king and return the people’s light', 'Erase the kingdom so nobody remembers'], 1,
      'The threshold opens to the oath rather than a claimant. Your battle is for the king’s freedom, not his throne.',
    )),
    room('f7-room9', 'The Petitioners’ Refuge', [
      'Behind the throne threshold, a refuge keeps the memories of people who never reached the public ovens. A court clerk changed their requests into accusations of disloyalty.',
      'Wisps and guards defend the altered petitions in separate groups. Recover what each person actually asked for before deciding how the court should have answered.',
    ], [['ghost', 'armored', 'skeleton'], ['mage', 'ghost']], 56, choice(
      'Which response addresses the petition’s actual request?',
      'The original asks for medicine for an injured parent and permission to reach the south ramp. The added heading “demands the crown” contradicts those words.',
      ['Charge the family with taking the throne', 'Keep the ramp closed until the heading is obeyed', 'Provide medicine and access to the evacuation ramp'], 2,
      'The petition is restored as a request for help. The refuge remembers a family’s needs instead of the accusation written over them.',
    )),
    room('f7-room10', 'The Divided Court', [
      'Two court attendants left conflicting reports about the evacuation order. A dispatch register reveals why both once described the same day honestly.',
      'A caster-backed guard group is followed by roaming wisps. Compare the order of the entries rather than assuming that disagreement proves one attendant lied.',
    ], [['mage', 'armored', 'skeleton'], ['ghost', 'ghost', 'armored']], 57, choice(
      'Which explanation fits the dated dispatch register?',
      'The morning report says the ramp is closed for inspection. The register records inspection finished at noon. The afternoon report says families are crossing the ramp. Neither report claims to describe the whole day.',
      ['The ramp changed from closed to open after the inspection', 'One report must be forged because the states differ', 'The inspection never finished'], 0,
      'The court restores the sequence instead of condemning a witness. A truthful account can include a change of circumstances.',
    )),
    room('f7-room11', 'The Refuge Keeper’s Oath', [
      'The refuge keeper asked the king to return its master key before entering the heart chamber. It protected people outside the palace, whoever held the throne.',
      'The final approach groups mix guarded bodies and marked spells. Read its purpose before reaching the king.',
    ], [['armored', 'ghost'], ['mage', 'armored', 'skeleton']], 58, choice(
      'Where does the keeper’s record say the master key belongs?',
      'The record says a refuge must remain accessible if the crown falls. The public steward has the evacuation roll; the sealed throne vault can be opened only by a living monarch.',
      ['Seal it inside the throne vault', 'Return it to the public steward with the evacuation roll', 'Throw it into the heart so nobody can use it'], 1,
      'The refuge key returns to the people responsible for its doors. The king can be freed without making his absence another prison.',
    )),
  ],

  8: [
    room('f8-room1', 'The Last Descent', [
      'The final seal opens a path into the stolen light. Shadows imitate the defenders of every floor you have crossed.',
      'A mixed first group checks your target choice. The next pairs a caster with a guarded body; answer the warnings before committing to damage.',
    ], [['fang', 'ghost', 'armored'], ['mage', 'armored', 'flame']], 52),
    room('f8-room2', 'The Returning Channels', [
      'Three channels meet beneath the final gate. One returns power to the village, one feeds the abyss and one is a broken loop.',
      'The channel markings repeat symbols recorded earlier, but the reading card includes their meanings so memory alone is not required.',
    ], [['ghost', 'mage', 'ghost'], ['armored', 'flame', 'bat']], 54, choice(
      'Which channel must remain intact during purification?',
      'The lantern symbol marks the village return. The downward thorn marks the abyss feed. The closed circle marks a broken loop.',
      ['The downward thorn channel', 'The closed-circle channel', 'The lantern return channel'], 2,
      'You mark the village return for protection. Purification will send light home rather than scatter it into the rock.',
    )),
    room('f8-room3', 'Hall of Borrowed Commands', [
      'The abyss repeats orders taken from the captain, warden and king. Each order loses its original condition when spoken by the darkness.',
      'Three short pairs keep the hall varied: a lunging body, a marked spell, then a guarded opening.',
    ], [['fang', 'bat'], ['mage', 'ghost'], ['armored', 'flame']], 56, choice(
      'Which order has been stripped of its original stopping condition?',
      'The captain ordered “Hold until the families pass.” The abyss repeats only “Hold forever.” The completed evacuation is recorded on the same card.',
      ['“Hold forever” ignores the completed evacuation', 'The captain ordered endless fighting from the start', 'The families never entered the passage'], 0,
      'The borrowed command breaks into separate words. The abyss cannot turn a temporary duty into an eternal one here.',
    )),
    room('f8-room4', 'The Weight of the Crown', [
      'A balance measures two ideas: the crown’s survival and the lives under its care. It was designed as a final test for the royal heart’s keeper.',
      'The defenders mix pressure from above with guarded bodies below. Do not let a dramatic target pull you past a safer opening.',
    ], [['armored', 'ghost', 'mage'], ['flame', 'armored', 'ghost']], 58, choice(
      'Which principle should guide the balance?',
      'The oath supplied beside it says: “No crown is worth more than one life entrusted to its care.”',
      ['The crown outweighs every life', 'A life under its care outweighs the crown', 'The two may be traded for more power'], 1,
      'The balance settles on the people’s side. The royal heart recognizes the purpose its maker intended.',
    )),
    room('f8-room5', 'The Quiet Armory', [
      'Behind the ward lies equipment the king prepared for a successor who might repair his mistake. It is protected by the Last Guardian.',
      'Clear these sentries without mistaking the armory for the final battle. The guardian’s guaranteed Tier 8 reward must be received before the Abyss Lord.',
    ], [['armored', 'armored', 'mage'], ['ghost', 'flame', 'armored']], 60),
    room('f8-room6', 'The Guardian’s Terms', [
      'The guardian’s inscription explains why it will challenge you. Strength alone is not its condition; the equipment must be used to complete the repair.',
      'The final armory patrols arrive in small groups. Their mix recalls the recovery, movement and target choices you have practised.',
    ], [['armored', 'ghost'], ['mage', 'flame'], ['armored', 'fang']], 62, choice(
      'Which statement accepts the guardian’s terms?',
      '“Receive the tools before entering the inner gate. Preserve the return channel. Use the tools to release the stolen light.”',
      ['Skip the tools and seal the return channel', 'Sell the tools before claiming them', 'Receive the tools and use them to return the light'], 2,
      'The guardian accepts your purpose. Its challenge will release the prepared equipment rather than consume it.',
    )),
    room('f8-room7', 'The Unbroken Return', [
      'The abyss has placed a false repair instruction beside the true one. One would end the flow by destroying everything; the other would restore its direction.',
      'Two mixed groups guard the inspection stand. Read the consequence of each instruction, not just its promise of a quick end.',
    ], [['mage', 'ghost', 'armored'], ['flame', 'armored', 'fang']], 66, choice(
      'Which repair preserves the village’s future?',
      'Instruction A isolates the abyss feed and leaves the lantern return intact. Instruction B shatters both channels, so no light can reach the village.',
      ['Follow Instruction A', 'Follow Instruction B', 'Reconnect the furnaces and increase the draw'], 0,
      'The safe repair is recorded beside the core approach. The way home remains part of the plan.',
    )),
    room('f8-room8', 'Heartward Threshold', [
      'Beyond the threshold lies the will that twisted every command below the village. The royal seal is warm, carrying the promise you followed from the harmless ruins.',
      'These patrols guard the inner inspection ring. Complete its checks and the guardian’s challenge, prepare the Tier 8 reward, then confront the Abyss Lord.',
    ], [['armored', 'mage', 'ghost'], ['flame', 'fang', 'armored']], 70, choice(
      'Which final sequence follows the repair plan?',
      'The guardian’s terms require receiving the tools first. The repair card says defeat the shadow before purifying the core, then return the light through the protected channel.',
      ['Purify first, destroy the return, then seek the tools', 'Receive the guardian’s tools, defeat the shadow, purify the core, return home', 'Leave the core controlled and take the crown'], 1,
      'The threshold holds the complete plan. The next victory must end the theft of light, not replace its ruler.',
    )),
    room('f8-room9', 'The Outer Ward Release', [
      'The heartward threshold opens into an inspection ring. Its ward copied the Iron Warden’s safety order but omitted the repair crew’s release condition.',
      'A guarded group holds the release panel while a second combines flying and lunging threats. Check the record before assuming resistance means the repair is wrong.',
    ], [['armored', 'mage', 'flame'], ['ghost', 'fang', 'bat']], 70, choice(
      'Which condition legitimately releases this outer ward?',
      'The original order reads “Hold until the abyss feed is isolated and the village return is verified.” The panel records feed isolated and return verified; it does not require a new royal claimant.',
      ['Both recorded safety conditions are met; release the repair passage', 'Wait for someone to claim the crown', 'Reconnect the feed to restore the original alarm'], 0,
      'The ward releases a passage for repair rather than conquest. The final ring no longer mistakes a completed safeguard for an endless command.',
    )),
    room('f8-room10', 'The Homeward Lens', [
      'A homeward lens tests where the released light will travel. Its three reflections look equally bright, but only one follows a channel that still reaches the village.',
      'The first encounter emphasizes distant marks; the next adds a sentry and a sprite. Once there is room to inspect, follow the full route in the lens card.',
    ], [['mage', 'ghost', 'mage'], ['armored', 'flame', 'ghost']], 72, choice(
      'Which reflection follows a continuous homeward channel?',
      'Reflection A enters a sealed loop. B crosses the preserved lantern return and reaches the village beacon. C enters the disconnected furnace feed and stops at its closed valve.',
      ['Reflection A', 'Reflection B', 'Reflection C'], 1,
      'The lens is aligned with the preserved return. The plan now includes a verified destination, not just an escape from the abyss.',
    )),
    room('f8-room11', 'The Keeper’s Inventory', [
      'The guardian inventoried the repair tools and their responsibilities. A forged amendment claims the tools also transfer ownership of the stolen light.',
      'Three groups combine earlier attack lessons. Read the inventory’s scope before accepting anything the abyss has added to its margins.',
    ], [['armored', 'ghost'], ['mage', 'flame'], ['fang', 'armored']], 74, choice(
      'Which conclusion is supported by the guardian’s original inventory?',
      'The inventory transfers equipment “for the repair of the heart.” A separate line states the light belongs to the communities from which it was drawn. The ownership amendment uses a different seal.',
      ['The tools make their bearer owner of the village', 'The forged amendment overrules both original lines', 'The tools authorize repair; the light must return to its communities'], 2,
      'The false amendment is set aside. Receiving the guardian’s equipment will not turn the repairer into another collector of stolen power.',
    )),
    room('f8-room12', 'The Final Return Path', [
      'The last station gathers three promises: safe feed isolation, useful tools and a home for the released light.',
      'Finish the patrols, review the verified states, then face the guardian and prepare its guaranteed equipment before confronting the Abyss Lord.',
    ], [['armored', 'mage', 'ghost'], ['flame', 'armored', 'fang']], 76, choice(
      'Which final report preserves every verified part of the repair?',
      'The abyss feed is isolated, the lantern return reaches the village and the guardian will release tools before the inner battle. Purification can begin only after the shadow controlling the core is defeated.',
      ['Keep isolation and return intact; receive tools, defeat the shadow, then purify', 'Destroy the return to make the purification shorter', 'Enter without the tools and reconnect the abyss feed'], 0,
      'The report is complete. The remaining battles have a clear purpose: release the heart’s command and send its light home through the path you preserved.',
    )),
  ],
};
