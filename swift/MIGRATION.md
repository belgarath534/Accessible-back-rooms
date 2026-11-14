# Accessible Backrooms in Swift (version 1.6)

The whole game is being rebuilt in Swift on the `swift-rewrite` branch. The
web version (`www/`) keeps running the website (and is what 1.5 shipped);
when 1.6 is ready, the iPhone app switches to this one.

- `BackroomsCore/` – the rules, with no screen or sound. Tested on Linux and
  Mac with `swift test`.
- `App/` – the iPhone and iPad app (SwiftUI), generated with XcodeGen.
- `BackroomsCore/Sources/BackroomsCore/Resources/gamedata.json` – levels,
  monsters, texts and translations, exported once from the web version. From
  now on, edit it here.

The GitHub workflow "Swift iOS build" runs the tests and builds the app on
every push to this branch.

## Checklist

✅ done · 🟡 started · ⬜ not yet

### Foundation
- ✅ Maze generation (same recipe as the web version), seeded randomness
- ✅ Story levels 0 to 14 and extra levels 15 to 50 from the exported data
- ✅ Moving, turning, walls, paths text, look, listen, status
- ✅ Exit beacon in 3D, routes to the exit, "the exit is very close"
- ✅ Sanity drain, darkness, low sanity warnings, game over, try again
- ✅ Almond water, firecrackers, batteries, energy bars, flashlight, radio, rations (pickup)
- ✅ English and Portuguese narrator text (translation table)
- ✅ VoiceOver announcements, system voice narrator setting
- ✅ 3D HRTF sound for recordings and code-made sounds, level music
- ✅ Keyboard: arrows walk, shift+arrows turn, L listen, K look, D drink, S status, R repeat

### Still to move over
- 🟡 Item use: ✅ flashlight on/off, firecrackers, sprint, sneak, rations · ⬜ flares, traps, music box, Firesalt, glow sticks, compass, adrenaline, mystery bottle, pill, Moth Jelly, Cashew Water, wind chimes, camera
- ⬜ Hiding spots, marks (drop mark / find my mark)
- 🟡 Monsters: hunting and wandering done; every special behaviour still to port (Lookalike, Wall Crawler, Janitor, Static, Librarian, Watcher, Mannequin, Moths, Deep, Host, Chaser, Glitch, Jester, Toon, Hall Monitor, Party, Wretch, Frost, Mimic, Skin-Stealer lures)
- ⬜ Every monster's catch line and sound
- ⬜ Puzzles: breakers, code locks, keycards, memory valve, hazards, water
- ⬜ Ambience for every level type, beacon kinds, chase music, blackouts, scare events, hallucinations
- ⬜ Tapes, journal notes, Marcus, survivors, the Trader, Facelings
- ⬜ Skills, New Game Plus, hardcore, checkpoints and level select
- ⬜ Endless mode, daily challenge
- ⬜ Tutorial
- ⬜ Achievements, bestiary, journal, jukebox screens
- ⬜ Night Watch
- ⬜ Hunter mode, then multiplayer Hunter with Game Center
- ⬜ Game Center (achievements, leaderboards)
- ⬜ iCloud save sync
- ⬜ Voice commands (speech recognition) in English and Portuguese, custom words
- ⬜ Visual mode, the map and gold path, 3D view, level pictures
- ⬜ What's new, credits, settings (speed, volumes, ducking)
- ⬜ Codemagic TestFlight workflow for the Swift app
