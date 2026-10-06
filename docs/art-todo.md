# Artwork still to make

ElevenLabs free plan: 3 images a day (model gpt-image-2, 1 generation each).
Every prompt ends with this style line:

> Style: atmospheric found-footage horror digital painting, liminal and unsettling, subtle film grain, muted desaturated colors, cinematic lighting. No text, no words, no gore.

Save as `www/img/<key>.jpg` (960x540, `ffmpeg -vf scale=960:540 -q:v 5`), then add the key with an English and Portuguese description to `ART` (levels) or `MONART` (monsters) in `www/index.html`. Describe what is actually in the picture.

Done: lvl0, lvl1, lvl2, lvl3, lvl4, lvl5.

## Levels (key: prompt)
- lvl6: Thalassophobia. Flooded underground hall, black still water, narrow wet walkways, dim green light on the water, a huge vague shape far beneath the surface.
- lvl7: The Suburbs. Empty suburban street at dusk, identical houses forever, all windows dark except one with a pale face against the glass, flickering streetlights.
- lvl8: The Endless City. Empty city street at night, dark skyscrapers, broken traffic lights blinking yellow, abandoned cars, fog between buildings.
- lvl9: The Poolrooms. Endless white-tiled rooms with shallow glowing turquoise pools, bright soft light, archways repeating forever, eerily calm.
- lvl10: Fun. A party room, grey balloons, faded streamers, a rotting birthday cake on a table, party hats on empty chairs, a music box, cheerful but wrong.
- lvl11: The Carnival. Abandoned night carnival, dark carousel, striped tents, a lone brass bell on a post, string lights half dead.
- lvl12: The Silent Library. Endless towering bookshelves in dim lamplight, dust in the air, a tall thin figure far down an aisle.
- lvl13: Run For Your Life. A long red-lit corridor with sirens, debris on the floor, motion blur, something enormous at the far end.
- lvl14: The Frontrooms. A normal family living room at night that feels wrong, too many doors, family photos with blank faces, a TV playing static.
- last: The Last Room. A small quiet room with a single wooden door glowing with warm light at the edges, everything else dark.
- x15: The Hospital. Long white hospital hallway, half the lights dead, an empty gurney, a wheelchair, a heart monitor glowing green in a room.
- x16: The Endless Hotel. Red carpet hallway with gold doors and strange room numbers, a room service tray outside a door, an elevator at the end.
- x17: The Frozen Field. Snowy field at night, endless snow, wind, a lone frozen lamppost, a small cabin with warm firelight far away.
- x18: The School Halls. School hallway with lockers, waxed floor, empty classrooms, clocks all showing the same time, a music room door.
- x19: The Dead Mall. Dark abandoned mall, dusty escalator, store windows with mannequins, a fountain in the food court.
- x20: The Last Train. Subway platform, tiled walls, a train waiting with doors open and lights on, dark tunnels both ways.
- x21: Motion. A bright hand-drawn cartoon world of green hills and a smiling sun that feels wrong, a painted door on a wall.
- x22: The Server Farm. Endless rows of server racks with blinking lights, cables, cold blue light, a single terminal screen glowing.

## Monsters (key: prompt, as a portrait in a dark Backrooms hallway)
- mon_smiler: only a huge glowing white grin and two white eyes in total darkness.
- mon_hound: a gaunt black dog-like creature, too many joints, low to the ground, white eyes.
- mon_howler: a tall thin black humanoid with a gaping round mouth, red glowing eyes.
- mon_skin: a tall figure wearing a human-like face that does not fit, uncanny smile.
- mon_clump: a huge wet mass of arms, hands and mouths filling a corridor.
- mon_party: a yellow figure with a smiley face drawn on, party hat, holding a balloon.
- mon_moths: a swarm of giant pale moths around a flickering light.
- mon_watcher: a pale face pressed against a dark window, staring.
- mon_deep: an enormous dark shape with glowing eyes under black water.
- mon_face: a calm humanoid with a smooth blank face and no features (harmless).
- mon_wretch: an emaciated grey person with empty eyes, ragged clothes.
- mon_jester: a jester in purple and red with bells and a painted grin.
- mon_librarian: a very tall blind figure in a long dark coat, finger to its lips.
- mon_chaser: something enormous and dark filling the end of a red-lit hallway.
- mon_mimic: a familiar-looking smiling silhouette in a doorway, the smile too wide.
- mon_host: a huge heavy shape made of many shadows, standing in a family home.
- mon_survivor: a tired lost person with a backpack and a flashlight.
- mon_patient: a bandaged figure lurching off a hospital gurney.
- mon_bellhop: a smiling hotel bellhop in a red uniform with a tray, eyes too dark.
- mon_frost: a frozen humanoid covered in ice, walking through snow.
- mon_hallmon: a tall figure in a school sash with a whistle, sneakers, no face.
- mon_mannequin: a pale store mannequin with its head turned, in a dark mall.
- mon_crawler: a long pale creature on subway rails, many limbs.
- mon_toon: a grinning rubber-hose cartoon character with pie-cut eyes, wrong.
- mon_glitch: a human shape made of static and colored glitch stripes.
- mon_trader: a friendly wanderer with a big bag of bottles.
- mon_marcus: a tired man in an old jacket holding a tape recorder.
- title: Title art for the main menu: endless yellow Backrooms hallway, a lone figure seen from behind.
