# DriveTracker

## What the app does

DriveTracker is a personal mobile web app (installed to the iPhone home screen) that:

- Records drives with GPS and motion sensors **while the app is open on screen**. iOS web apps cannot record in the background, so the screen is kept awake during recording.
- Stores everything locally on the device in IndexedDB. Nothing leaves the phone.
- Computes speed and G-forces from the recorded data.
- Lets the user save segments of drives as named favourite routes.
- Shows drives and routes on a map, or as a coloured line on a black background.
- Opens Google Maps (via a normal link) to navigate to a route's start.

## Stack

- React + TypeScript, built with Vite
- vite-plugin-pwa (installable, works offline)
- Dexie.js (IndexedDB wrapper)
- MapLibre GL JS with OpenFreeMap tiles (free, no API key)
- Browser APIs: Geolocation API, `devicemotion`, Screen Wake Lock API
- Vitest for tests
- React Router (`HashRouter`, so deep links work on GitHub Pages)
- Hosted on GitHub Pages, deployed by GitHub Actions on every push to `main`

## Rules

- Make small changes per step. Don't add features that weren't asked for.
- Briefly explain key decisions in plain language (the owner is a beginner).
- Store SI units internally: metres, m/s, m/s², millisecond timestamps. Convert only for display (km/h, g).
- Pure calculation code (no React, no browser APIs) goes in `src/lib`, with Vitest tests next to it (`*.test.ts`).
- Never add a backend, login, analytics, or any paid or API-key-based service. The app must cost nothing to run.
- Mobile Safari on iPhone is the main target. Respect safe areas (notch / home indicator) and keep the true black (`#000`) dark theme.
- `base` in `vite.config.ts` must match the GitHub repository name.

## Commands

- `npm run dev` — dev server (add `-- --host` to open it from a phone on the same Wi-Fi)
- `npm test` — run tests
- `npm run build` — type-check and build to `dist/`
- `npm run preview` — serve the built `dist/` locally
- `npm run icons` — regenerate the PNG app icons in `public/` from `public/favicon.svg`
