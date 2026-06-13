# Liberty Clone

A tiny **3D open-world driving sandbox** in the spirit of GTA — built with
[Three.js](https://threejs.org/) and packaged for Android with
[Capacitor](https://capacitorjs.com/).

It's deliberately small and self-contained: a procedurally generated city,
drivable cars, wandering pedestrians, collectible cash, a wanted system, a
minimap, and full touch controls. Everything is made from primitives, so there
are no assets to download and the APK stays tiny.

## Play

- **Move:** on-screen joystick (left) or `WASD` / arrow keys
- **Enter / exit a car:** `ENTER` button or `F`
- **Brake / handbrake:** `BRAKE` button or `Space`
- **Switch camera:** `CAM` button or `C`
- Grab the glowing **cash**, drive around, cause a little chaos. Hitting
  pedestrians raises your **wanted level** (it decays over time).

## Run locally (in a browser)

```sh
npm install
npm run dev
```

## Build the Android APK

The APK is built in CI (`.github/workflows/android-build.yml`) because an
Android build needs the Android SDK and Google's Maven repository. To build
locally with an Android SDK installed:

```sh
npm install
npm run build
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk
```
