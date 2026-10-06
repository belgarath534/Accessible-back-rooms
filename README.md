# Accessible Backrooms

An accessible, voice-controlled audio horror game set in the Backrooms. Everything is spoken and played as sound, so it can be played with your voice, a screen reader, a keyboard or touch.

Play it online: https://backrooms-audio-game.netlify.app

Current version: **0.23.2**. Available in English and Brazilian Portuguese, including voice commands.

## Versions

- **0.23.2**: artwork for Levels 3, 4 and 5.
- **0.23.1**: bug sweep before 1.0; fixed game buttons overflowing on small phones.
- **0.23**: the Librarian stops to listen (freeze or it hears you), Partygoers hum and sing happy birthday, Hounds hunt in packs, Smilers giggle in the dark, new jumpscares and screams that depend on the monster, real shush sound.
- **0.22**: four new random events (ringing phone, stampede, gas leak, something coming), Halloween event (Oct 24 to Nov 1: candy, trick-or-treaters), a birthday surprise on October 9, three new achievements.
- **0.21.1**: solving a puzzle opens a secret shortcut near the exit.
- **0.21**: level artwork with spoken descriptions (describe command and button), bestiary portraits as they arrive; first pictures for Levels 0 to 2.
- **0.20.2**: on Nightmare and in Hardcore the game no longer reminds you of the door code.
- **0.20.1**: the door keypad understands codes said many ways (four seventy two, enter the code, bare numbers at the door) and reminds you of the numbers you found.
- **0.20**: five new handmade extra levels: 18 The School Halls, 19 The Dead Mall, 20 The Last Train, 21 Motion, 22 The Server Farm, each with a new monster, mechanic, music, achievement and bestiary entry.
- **0.19**: iCloud backup on iPhone (automatic, plus Back up and Restore buttons in Settings), using the capacitor-icloud-sync plugin.
- **0.18**: skills (choose one every few levels, two earned by playing), the Trader (barter almond water), Moth Jelly, Cashew Water, wind chime, disposable camera.
- **0.17**: six survival items (Firesalt, glow sticks, compass, adrenaline shot, mystery bottle, strange pill); item buttons only appear when you have the item.
- **0.16**: jukebox with every song (unlocked as you play) and each level’s ambience.
- **0.15**: monster footsteps with a different sound per creature, clearer player footsteps, bestiary with survival tips and sound previews.
- **0.14**: handmade extra levels (Hospital, Endless Hotel, Frozen Field) with three new monsters, seeded daily challenge with streaks.
- **0.13**: keypad code puzzle (Office), sound memory puzzle (Poolrooms), the Host boss in the Frontrooms.
- **0.12**: survivors (some are Skin-Stealers in disguise), journal with fifteen notes.
- **0.11**: narrator volume and music ducking, custom voice words, Hardcore mode, New Game Plus.
- **0.10.2**: Safari audio session set to playback (play-and-record with voice commands), music wakes right after each spoken line.
- **0.10.1**: audio wakes back up after iOS pauses it for the microphone; gentler speech recognition restarts.
- **0.10**: new items (Royal Rations, flares, bear traps, wind-up music boxes), story log shows the last five messages and is readable by VoiceOver, history command.
- **0.9.1**: every story level has its own music (new tracks for the Office and the Suburbs), four new tracks for extra levels.
- **0.9**: sound-order puzzles (Electrical Station, Carnival, Silent Library), idle monsters stalk you from any distance, gentler sanity drain in the dark, fixes found by fuzz testing.
- **0.8**: story levels numbered 0 to 14 with no gaps ("Level 5 of 14"), extra levels after the story (Level 15 and up, endless and saved; handmade ones go in the EXTRAS list), two new achievements.
- **0.7**: levels in ascending order with "chapter N of 15", rewritten story links, tapes renumbered in finding order, new app icon, saves resume at the first unplayed level.
- **0.6.2**: iPhone app ready: native voice commands and vibration through Capacitor plugins, sound plays with the silent switch on; fixed the wall bump sound.
- **0.6.1**: new menu music ("The Dread", picked by players), no buzzing or screams on the menu, new Frontrooms music ("Unnatural Situation").
- **0.6**: the story grows to 15 levels with a real ending (the Endless City, the Silent Library, the Carnival, the Frontrooms), four new monsters, 3D graphics (three.js, switchable to classic), level select, tapes kept between runs, new menu music, three new achievements.
- **0.5.1**: stronger firecrackers (longer lure, you hear monsters rush to the bang, auto-aims down an open path).
- **0.5**: tutorial, hiding spots, Level 4 (the Abandoned Office) with the Clump, Level 9 (the Suburbs) with the Window Watchers, retry buttons, four new achievements.
- **0.4**: 3D sound, endless mode, two new levels (Electrical Station, Thalassophobia), eight tapes and a secret ending, markers, achievements.
- **0.3**: main and pause menus, settings, seven levels, new monsters and items, difficulty modes, checkpoints, Portuguese language.
- **0.2**: recorded sounds and music, jump scares, blackouts, choice of voice or buttons.
- **0.1**: first version, three levels, voice commands, spoken narration and screen reader support.

## Project layout

- `www/index.html` – the game (HTML, CSS and JavaScript in one file)
- `www/js/r3d.js` – the optional 3D view; `www/js/three.min.js` – three.js (MIT)
- `www/audio/` – music and sound effects

The `www` folder is the web root, ready to be used as the `webDir` of a Capacitor project.

## Running locally

Serve the `www` folder with any static web server, for example:

```sh
npx serve www
```

Opening `index.html` directly from disk will not load the audio files in most browsers.

## Notes for the iOS app

- Browser speech recognition (`webkitSpeechRecognition`) is not reliable inside the iOS web view. Use a native speech recognition plugin such as `@capacitor-community/speech-recognition` for voice commands in the app.
- The app needs microphone and speech recognition usage descriptions in `Info.plist`.

## Credits

Music by Kevin MacLeod (incompetech.com): "Dark Hallway", "Unseen Horrors", "Dark Fog", "Penumbra", "Gathering Darkness", "Lightless Dawn", "Long Note Four", "Echoes of Time v2", "Spider Eyes", "Ossuary 6 - Air", "The Dread", "Night of Chaos", "Hush", "Unnatural Situation", "Oppressive Gloom", "Ghost Story", "Darkling", "Ghostpocalypse - 7 Master", "Ghost Processional" and "Static Motion", "The House of Leaves", "Bathed in the Light", "Dark Times", "Monkeys Spinning Monkeys", "Anguish". 3D graphics use three.js (MIT license). Licensed under Creative Commons: By Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/).

Sound effects from OpenGameArt.org:

- "Female Screams" by congusbongus, CC BY 3.0
- "Long deep impact" by ROHHSA, CC BY-SA 4.0
- "Horror Cinema 2" and "Horror Cinema 4" by Cadere Sounds, CC BY-SA 3.0
- Public domain (CC0): "Monster Snarls" by darsycho; "80 CC0 creature SFX" by rubberduck; "Ghost breath", "Ghost monster voice" and "4 atmospheric ghostly loops" by qubodup; "Heartbeat sounds" by bart; "16 monster growls" by starninjas; "Horror scream" by Vinrax; "Evil screech", "Group giggling" and "Evil cackle laugh" by Nocturnal_Vanguard; "Do you remember laughter" by Supergeek; "Frequency static" by bretbernhoft; "Bubble sound effects" by BMacZero

The audio files were trimmed, converted to mono MP3 and loudness-normalized for the game. The files adapted from CC BY-SA sources (`impact.mp3`, `sting.mp3`, `riser.mp3`) are shared under the same licenses as their originals.

Inspired by the Backrooms, a shared internet legend, and the community wiki that grew around it.

## Voice acting

The game plays recorded voice lines when they exist, and falls back to the device's text-to-speech when they do not. Put MP3 files in `www/audio/voice/en/` and `www/audio/voice/pt/` and list them in `www/audio/voice/manifest.json`, for example `{"en":["tape1","tape2"],"pt":["tape1"]}`.

Line ids: `tape1` to `tape8`, `lure1` to `lure5` (Skin-Stealer), `radio1` to `radio3`, `whisper1` to `whisper5`, `marcus1` to `marcus4` and `marcusFound`.

## iPhone app (Capacitor)

The `ios/` folder is a Capacitor 7 project (app ID `com.accessible.backrooms`, change it in `capacitor.config.json` and Xcode if you want a different one).

- Voice commands use `@capacitor-community/speech-recognition`, vibration uses `@capacitor/haptics`. In a normal browser the game uses the Web Speech API instead.
- `Info.plist` has the microphone and speech recognition permission texts.
- `AppDelegate.swift` sets the audio session to playback, so sound works with the silent switch on and mixes with VoiceOver.
- `codemagic.yaml` builds an unsigned IPA, the same way as Dungeon Descent. After changing `www/`, run `npx cap sync ios`.
- iCloud backup uses `capacitor-icloud-sync` (0.2.0 or newer). The game code is already in `www/`; it does nothing until the plugin is installed. To turn it on: `npm install capacitor-icloud-sync@^0.2.0`, `npx cap sync ios`, then in Xcode add the iCloud capability with CloudKit and a container (this needs the paid Apple Developer account). The website ignores iCloud and hides the buttons.

More sound effects from Freesound.org, all CC0: child giggle (RaspberryTickle), Imp Laugh (scorpion67890), Insane girl laughter (mvVoiceActing), Weird Creepy Phased Laughter (DanJFilms), Shush! (OwlStorm), sh sound effect (connerdrake98), sssh (elliedixon), Jump scare sound 3 (dangthaiduy007), Intense Jumpscare (Unaxete), Jumpscare 1 (zombyKlr), Demonic Woman Scream (nick121087), Creepy Ghost Scream (epicdude959), Monster Screech (thegoose09).
