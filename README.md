# Sermon Flow (Windows) — v1.1

Sermon Flow is a Windows desktop app for churches:
- Slides mode (PowerPoint-clicker style next/prev)
- Bible mode (search + project)
- Verse overlay over slides, auto-return after 60 seconds
- Translation switching hotkeys: F1 KJV, F2 NKJV, F3 NLT (default), F4 GNT
- Projector shows: Book/Chapter/Verse + Translation + Verse text
- Subtle, readable background images (blur + dark overlay)

## Quick run (local)
1) Install Node.js LTS
2) In this folder:
   - `npm install`
   - `npm start`

## Build installer (local)
- `npm run dist`
The installer will appear under `dist/`.

## GitHub auto-build (recommended)
This repo includes:
`.github/workflows/windows-installer.yml`

On GitHub:
Actions → Build Windows Installer → Run workflow → download the artifact.
