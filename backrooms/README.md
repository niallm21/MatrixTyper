# Backrooms Escape

An atmospheric, procedurally generated first-person survival/exploration game
built with **Three.js** and packaged for **Android** with **Capacitor**.

You have no-clipped into the Backrooms. Find the hidden **power fuses**, restore
power to the **EXIT**, then reach the exit door and escape — while avoiding the
thing that wanders the halls.

## Features

- **Procedurally generated level** every run — a recursive-backtracker maze
  opened into interconnected backrooms-style rooms, loops and pillars.
- **Atmospheric rendering** — procedurally generated mono-yellow wallpaper,
  damp carpet and drop-ceiling textures, fluorescent ceiling panels with a
  pooled dynamic light rig, exponential fog, flicker, vignette and film grain.
- **Sparse object clusters** — boxes, barrels, stacked chairs, shelving,
  pipes and wet-floor signs scattered across the level.
- **A real objective** — collect all fuses to power the exit, then escape.
- **A wandering entity** — roams the level and hunts you with gradient-based
  pathfinding when it sees you. Sprint to escape (watch your stamina).
- **Mobile-first controls** — virtual joystick + look-drag + run button on
  touch; WASD + mouse-look on desktop.
- **Fully offline** — all art and audio are synthesized procedurally, so the
  built APK has no runtime network dependencies.

## Run in a browser (development)

```bash
cd backrooms
npm install
npm run dev      # open the printed URL
```

## Build the Android APK

The APK is built in CI (`.github/workflows/build-backrooms-apk.yml`) because the
Android SDK / Google Maven are needed at build time. To build locally instead:

```bash
cd backrooms
npm install
npm run build
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk
```

## Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Move | WASD / arrows | left virtual stick |
| Look | mouse (click to capture) | drag right side |
| Run | Shift | RUN button |

Tech: Three.js, Vite, Capacitor (Android).
