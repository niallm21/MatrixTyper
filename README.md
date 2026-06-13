# MatrixTyper

A lightweight, distraction-free Matrix-style writing app built with Tauri.

MatrixTyper keeps the idle writing surface deliberately minimal: black screen, phosphor text, no persistent tool clutter. Menus and search are summoned only when needed.

## Features

- Minimal fullscreen writing surface
- Matrix phosphor themes and adjustable glow
- Plain text and encrypted `.mtx` saves
- Draft recovery and optional autosave
- Keyboard-native headings with `# `, `## `, `Ctrl+1`, `Ctrl+2`, and `Ctrl+0`
- Matrix divider with `--- `
- Summoned search with `Ctrl+F`
- Matrix rain easter egg
- Plain-text paste sanitization so external site styling cannot leak into the editor

## Development

```sh
npm install
npm run dev
```

## Checks

```sh
npm test
```

## Build

```sh
npm run build
```

The current tested standalone build is `MatrixTyper-Standalone-V16.exe`, kept locally as a build artifact rather than committed to source control.
