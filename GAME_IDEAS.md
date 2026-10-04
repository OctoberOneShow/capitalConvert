# New game ideas for capitalConvert

The project already has 69 games across arcade action, board games, spatial
puzzles, procedural deduction, music, simulation and small campaigns. The next
games should add different decisions and ways to interact, rather than another
board with a different coat of paint.

These are original design proposals, not implemented games. The scope estimates
are relative to this project's plain JavaScript, offline browser setup:
**small** means one compact mechanic; **medium** adds a second system or AI;
**stretch** needs substantial physics, content or multiplayer work. None needs a
backend in its first version.

| Game | Area | What the player actually does | Distinctive twist | First playable version | Scope |
| --- | --- | --- | --- | --- | --- |
| **Gravity Badminton** | Sport / physics | Aim shots, reposition and defend a small court against an opponent. | Gravity changes toward a different wall after each rally; the court rotates with it. | One court, four gravity directions, one readable opponent, first to seven. | Medium |
| **Kitchen Relay** | Time management | Chop, cook and plate orders while choosing which station to service next. | Ingredients keep cooking while you move; rescuing one dish may spoil another. | Three stations, four recipes, a two-minute service, mouse and keyboard controls. | Medium |
| **Tether Salvage** | Space / physics | Attach a tow cable to wreckage and pull it into a recovery dock. | Cargo mass and cable tension change the handling; cut the cable to avoid being dragged into hazards. | Three cargo shapes, one tug, one dock, six small recovery scenes. | Medium |
| **Tiny Wrestlers** | Combat / local multiplayer | Circle an arena, feint, grab and shove an opponent over the edge. | A missed grab briefly exposes your balance, so timing and positioning outweigh button mashing. | Two fighters, three actions, one arena, solo AI or two players on one keyboard. | Medium |
| **Whale Parliament** | Diplomacy / strategy | Negotiate water routes among factions with competing priorities. | Promises affect later votes; a deal can pass today and cost you tomorrow's coalition. | Three factions, six rounds, visible priorities, offers built from fixed cards. | Medium |
| **Paradox Post** | Exploration / topology | Deliver parcels through a small building and learn its unusual connections. | Door destinations depend on the side you approach from; navigating requires understanding the space. | Eight rooms, three parcels, a route notebook, ten authored maps. | Medium |
| **Counterfeit Museum** | Observation / inference | Inspect exhibits, compare restoration records and decide which pieces are genuine. | Scratches, pigments and dates must agree; a convincing object can still have impossible provenance. | Six generated exhibits, three kinds of evidence, guaranteed consistent cases. | Medium |
| **Deep Freeze Expedition** | Survival / planning | Pack equipment, choose a route and manage warmth, food and fatigue. | Useful equipment has weight; the safest route may consume too much food. | A twelve-node map, six equipment items, forecast cards, one rescue destination. | Medium |
| **Morse Rescue** | Communication / decoding | Tune in to a stranded crew and decode short signals to choose rescue coordinates. | Noise hides parts of a message; spend limited battery on replay or infer from context. | Five missions, short signal vocabulary, audio plus an equivalent flashing-light mode. | Small |
| **Pocket Photographer** | Nature / timing | Frame shy creatures, focus and take a limited number of photographs. | A good image needs behavior, composition and timing together; startling animals changes their routes. | One pond, four species, ten shots, a contact sheet with explained scores. | Medium |
| **Auction Dungeon** | Economy / tactical combat | Bid for equipment, then use what you bought in a short dungeon encounter. | Opponents bid too, and winning every auction leaves no money for healing. | Three AI bidders, eight items, three encounters, revealed bids after each sale. | Medium |
| **Switchboard Duo** | Cooperative play | Two players coordinate switches to keep a failing machine operating. | Each player sees a different half of the instructions and must explain what they need. | Two adjacent control panels, six failures, shared keyboard or touch controls. | Medium |
| **Rule Thieves** | Abstract strategy | Move a few pieces to capture an objective on a tiny board. | Captured rule tokens change legal moves for both sides: diagonal movement, jumping or swapping. | A 5×5 board, four rule tokens, local two-player mode first. | Medium |
| **Tiny Blacksmith** | Craft / precision | Heat metal, choose hammer strikes and quench at the right moment. | The whole blade must reach a useful temperature; overheating one section can ruin an otherwise good shape. | Three blade patterns, five strike positions, visible heat bands, one furnace. | Medium |
| **Courtroom of Animals** | Narrative / argument | Question witnesses, present contradictions and build a closing argument. | Evidence strength and witness trust are separate; a correct claim can fail if you support it badly. | One ten-minute case, three witnesses, fixed evidence cards, several explained outcomes. | Medium |
| **Crosswind Kites** | Flight / competition | Steer a kite through gusts and capture floating ribbons. | Reel length changes your turning radius and the wind layers you can reach. | One windy sky, three wind layers, solo trials and a simple rival. | Medium |
| **Lost Language** | Linguistics / discovery | Infer an unfamiliar language from pictures, inscriptions and repeated phrases. | Grammar and word meanings emerge together; memorizing a translation list is insufficient. | Twelve invented words, two grammar rules, eight scenes, an editable hypothesis notebook. | Medium |
| **One-Minute Mayor** | City management | Place homes, utilities and transport to grow a compact town. | Every placement solves one need and creates another; neighborhoods react to what surrounds them. | A 6×6 city, five building types, ten turns, transparent scoring. | Medium |
| **Shadow Puppeteer** | Performance / spatial control | Manipulate a puppet and light source to tell a short story through silhouettes. | You control the projected shadow indirectly; distance from the lamp changes its scale and distortion. | Two joints, one movable light, six poses, free performance mode. | Stretch |
| **Ocean Archaeologist** | Exploration / reconstruction | Dive, survey a wreck and recover fragments before the air runs out. | Artifact placement reconstructs the wreck's history, so documenting context matters as much as collecting. | One wreck, ten artifacts, oxygen planning, a reconstruction screen. | Medium |
| **Tea House at Midnight** | Social simulation / story | Serve guests, listen to conversations and choose how to respond. | The same drink can comfort or offend depending on what you have learned about the guest. | Four recurring guests, three nights, six drinks, a relationship notebook. | Medium |
| **Blind Sculptor** | Spatial reasoning / accessibility | Feel a hidden object through limited cross-sections and reconstruct it from blocks. | Each probe costs a move; choose measurements that eliminate the most possibilities. | 3×3×3 block shapes, three probe axes, keyboard controls and textual slice descriptions. | Medium |
| **Pinball Courier** | Arcade / routing | Use flippers and switches to send a ball through delivery checkpoints. | Checkpoints must be visited in an order you choose; opening one route closes another. | One table, three deliveries, one ball, no campaign until the physics feels reliable. | Stretch |
| **Borrowed Bodies** | Adventure / asymmetric abilities | Temporarily inhabit different creatures to solve a small environment. | A moth can fly but cannot lift; a crab can move objects but cannot cross dry ground. | One room, three creatures, one exit, clearly previewed possession rules. | Medium |

## Three useful first prototypes

These choices deliberately explore three different experiences.

1. **Morse Rescue** — the smallest experiment. It adds communication and
   decoding, reuses the project's audio experience, and can remain fully playable
   with visual signals. Success means a player can decode the first mission from
   the built-in legend and knows why a coordinate was accepted or rejected.
2. **Gravity Badminton** — a sport with an immediate physical hook. Build one
   ordinary rally first, then add changing gravity. Success means players can
   predict a shot, return it and understand a lost point without reading a long
   explanation. Aim assist and slower play should be options.
3. **Courtroom of Animals** — a content-driven experiment in argument and
   character. Start with one complete case and fixed dialogue branches. Success
   means different arguments produce explainable outcomes and every required
   clue can be recovered without restarting the story.

**Switchboard Duo** is the strongest additional experiment if shared-device
multiplayer is a priority. Its first version should work locally and explain
which keys belong to each player.

## Integration notes

- Add new games through `game-registry.js` with an English/Chinese string pack,
  a short how-to guide and a labeled panel.
- Build one complete playable loop before adding level ladders, procedural
  generators or progression rewards.
- Timer and audio callbacks must belong to the current round and be cancelled
  on restart, tab switch and drawer close. Reset held controls too.
- Keep ordinary play available without persistent browser storage. Session
  progress can use `App.storage`; campaign records can use `App.createCampaign`.
- Design mouse/touch and keyboard controls together. Any audio-only clue needs
  an equivalent visual or textual way to receive it.
- Verify the specific risky mechanic: solvability for generated deductions,
  conservation and collision rules for physics, turn ownership for duels, and
  reachability for branching stories. A boot check alone is insufficient.
