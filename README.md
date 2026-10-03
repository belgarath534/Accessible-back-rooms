# Accessible Backrooms

An accessible, voice-controlled audio horror game set in the Backrooms. Everything is spoken and played as sound, so it can be played with your voice, a screen reader, a keyboard or touch.

Play it online: https://backrooms-audio-game.netlify.app

Current version: **0.6**. Available in English and Brazilian Portuguese, including voice commands.

## Versions

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

Music by Kevin MacLeod (incompetech.com): "Dark Hallway", "Unseen Horrors", "Dark Fog", "Penumbra", "Gathering Darkness", "Lightless Dawn", "Long Note Four", "Echoes of Time v2", "Spider Eyes", "Ossuary 6 - Air", "Static Motion", "Night of Chaos", "Hush" and "Anguish". 3D graphics use three.js (MIT license). Licensed under Creative Commons: By Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/).

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
