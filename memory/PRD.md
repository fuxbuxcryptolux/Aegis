# PRD — Aegis Rogue: Tower Defense RPG

## Original Problem Statement
Build a production-ready, fully-playable browser game "Aegis Rogue: Tower Defense RPG": 60fps HTML5 Canvas roguelike tower defense with hero skills, roguelike perk drafting, local save, online leaderboard, Web Audio SFX, and 5 built-in monetization placements (ad banners, death-revive rewarded ad, draft reroll & 2x loot rewarded ads, affiliate offerwall vault, SpawnTap Playtime SDK bridge).

## User Choices
- Database: **MongoDB** (instead of spec's SQLite) + FastAPI backend.
- Monetization: **placeholder + mock fallbacks** (no real ad IDs; swap-in ready).
- Leaderboard: **online leaderboard + local save**.
- Scope: **full core loop** (4 towers, hero + 3 skills, 20 waves, bosses, draft, all 5 monetization placements, auto-save).
- Sound: **Web Audio synthesized SFX** included.

## Architecture
- **Frontend**: React (CRA/craco), Tailwind, lucide-react, sonner. HTML5 Canvas engine (`src/game/engine.js`) framework-agnostic class driving 60fps rAF loop, rendered inside `src/pages/Game.jsx`. Modules: `config.js`, `audio.js` (Web Audio synth), `spawntap_adapter.js`, `storage.js`. UI components in `src/components/game/`.
- **Backend**: FastAPI (`server.py`) with MongoDB (motor). Routes: `/api/health`, `/api/leaderboard` (GET/POST), `/api/monetization/log` (GET/POST), `/api/monetization/summary`. UUID string ids, `_id` excluded, ISO datetimes.
- **Persistence**: LocalStorage auto-save every 3s (in-run state) + permanent meta (soul gems, prestige, best wave, name). Online leaderboard via backend.

## User Personas
- Casual mobile/desktop web gamer wanting a quick, replayable defense game.
- Publisher/monetization operator wanting native ad + offerwall + playtime-SDK hooks.

## Core Requirements (static)
- 60fps canvas: winding path, wave spawner, pathing, HP bars, status effects, projectiles, particles, floating combat text.
- 4 towers (Archer/Frost/Inferno/Tesla) with placement, upgrade, sell; range/target/projectile physics.
- Hero unit (tap/right-click to move, auto-attack) + 3 active skills with cooldowns.
- 20 waves, mega-boss every 5, roguelike 1-of-3 perk draft, prestige → soul gems.
- 5 monetization placements + SpawnTap SDK bridge with mock fallback.

## Implemented (2026-06)
- ✅ Full canvas engine: path, 4 creep types incl. boss, towers, hero, projectiles/chain/splash/frost pulse, particles, floating text, DPR-aware responsive scaling. [2026-06]
- ✅ HUD (HP bar, gold/gems/soul gems, wave indicator, speed 1x/2x/3x, pause, sound, vault, leaderboard). [2026-06]
- ✅ Tower drawer (build cards + costs, upgrade/sell panel, hero skill cooldown dock, Deploy/Next Wave). [2026-06]
- ✅ Roguelike draft modal (3 cards + rewarded-ad reroll). [2026-06]
- ✅ Defeat modal (rewarded-ad revive + forfeit→soul gems), Victory modal (rewarded 2x loot + New Game+). [2026-06]
- ✅ Affiliate Offerwall Vault (3 tabs: offers, SpawnTap playtime SDK w/ live status pill + timer + offerwall container, Prestige Forge). [2026-06]
- ✅ Ad banners top/bottom (rotating placeholders w/ AdSense/AdMob fallback slot ids). [2026-06]
- ✅ Rewarded-ad interstitial (5s countdown + claim) wired through SpawnTap adapter + backend logging. [2026-06]
- ✅ Web Audio synthesized SFX (shots, explosions, chains, boss, rewards, victory/defeat). [2026-06]
- ✅ LocalStorage auto-save + online leaderboard. [2026-06]
- ✅ Backend: leaderboard + monetization transaction logging (tested 100%). [2026-06]

## Backlog / Remaining
- P1: Real ad-network & SpawnTap credential injection (currently mock/placeholder by design).
- P2: Split `engine.js` into core/render/combat modules for maintainability.
- P2: Leaderboard pruning/TTL; per-difficulty boards.
- P2: More tower tiers, additional hero units, meta talent tree spending soul gems.
- P2: Guard SpawnTap adapter double-init under React StrictMode dev.

## Next Tasks
- Await user feedback after first playthrough; polish balancing or add requested content.
