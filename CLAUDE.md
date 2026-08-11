# BKKxCulture site conventions

This repo is the dedicated source for bkk.nonarkara.org's Culture site.
The live deploy currently still runs from the `Nonarkara/BKKx` monorepo
(which also owns `edge-proxy/`, the custom-domain binding, and the
Minecraft world manifests/releases) — see the README's "Where this
deploys from" section before assuming a change here is live. The
operational digital twin at atlas.nonarkara.org is a fully separate
system: `Nonarkara/bkk-3d-atlas`, its own repo, its own Worker.

- `npm run dev` starts the local vinext server.
- `npm run build` creates the Cloudflare Worker bundle in `dist/`.
- Keep walkthrough data in `app/walkthrough.tsx` until a third independent view needs it.
- Do not commit Minecraft world binaries into the website bundle. Link GitHub Release assets.
- Use `#c9ff38` only for signals, selected state and primary actions — and
  only on the dark Console surfaces (`/worlds`, `/atlas/*`). The Editorial
  register surfaces use one accent, the oxide seal `#8c2f23`.
- The site typeface is **Sao Chingcha** (self-hosted, `public/fonts/`,
  three weights, declared in `globals.css`). IBM Plex Sans Thai is its
  fallback; JetBrains Mono carries coordinates and block numbers. Never
  Inter/Roboto/Poppins/Montserrat/Open Sans/Lato.
- Preserve keyboard access and reduced-motion behavior when adding interactions.
- D1 stores aggregate pageviews only; never collect IP addresses or credentials.

## The new front door (2026-08-11)

The 3D map IS the homepage. `app/page.tsx` renders a thin Editorial shell
that hosts a dark Console iframe of `/atlas/historic-core?embed=1` — a
path on THIS domain, never `https://atlas.nonarkara.org`. Pointing the
iframe at the atlas domain is what made bkk.nonarkara.org look like the
atlas to its owner; keep it relative. The
nine heritage quarters are quick-jump chips in the side panel that fly
the iframe to a precise center+zoom (atlas accepts `?at=lng,lat,zoom`).
The two Minecraft worlds are side offers in the masthead, not a section.

The Editorial register content (the 571 Fine Arts Department
monuments, the nine quarters, the seven walks) lives at `/heritage`
now, and at the drill-down pages `/areas/[slug]` and `/walks/[slug]`.
Anyone who saved the old URL `/heritage` (which used to redirect
to `/`) now lands on the actual register page.

The deliberate visual split is **Editorial frames, Console focus**:
the shell chrome stays in the bkk Editorial register (paper, Sao
Chingcha type, oxide seal accent); the iframe
shows the dark CONSOLE atlas (ink, signal yellow for buildings,
amber for Buzz, alarm red for live incidents). Two design systems
deliberately held apart — the bkk shell's job is to frame the atlas,
not to compete with it.

**Hardcoded for the future**: no BKKx surface shall look templated.
Every page is a unique implementation inside the Axiom Design Core
presets — the Editorial preset for the register, the Console preset
for the atlas, the heritage shell for the bridge. If a new page
arrives looking generic, that is a bug.
