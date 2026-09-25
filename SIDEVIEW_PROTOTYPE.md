# Neon Side-View Prototype

## Launch

The production top-down mode remains the default. After starting the frontend and authenticating, open:

`http://localhost:3000/?mode=sideview`

The prototype uses local in-memory run state and does not alter production saves, gems, prestige, leaderboard, auth, monetization, Horde, or Zero Hour systems.

## Architecture

- `frontend/src/game/sideview/config.js` centralizes lane geometry, tower spots, squad roster, archetypes, and all seven neon gameplay modifiers.
- `frontend/src/game/sideview/rules.js` contains pure variant derivation, progressive wave generation, lane movement, and command state helpers.
- `frontend/src/game/sideview/enemySprites.js` draws deterministic procedural silhouettes with neon outlines; bosses reuse the same shapes at enlarged scale.
- `frontend/src/game/sideview/squad.js` owns configurable squad cooldowns and command acceptance.
- `frontend/src/pages/SideViewGame.jsx` is the reversible canvas vertical slice. It reuses tower-style targeting concepts without modifying `frontend/src/game/engine.js`.
- `frontend/src/App.js` selects the prototype only when `mode=sideview` is present. The default route continues to mount the existing game.

## Validation

- Focused tests: `cd frontend && npm test -- --watchAll=false src/game/sideview/rules.test.js`
- Production build: `cd frontend && npm run build`

## Known limitations

- Prototype runs are intentionally in-memory and are not persisted.
- Tower attacks resolve as direct hits; projectile visuals and tower upgrade/specialization UI are not included yet.
- Squad tactical windows are represented by per-unit cooldowns while combat remains real-time.
- Recruitment is a configuration-driven test roster with no permanent economy or currency.
- Horde/Zero Hour live-ops timing remains owned by the production mode and is not redesigned here.

## Design questions for playtesting

- Is three-lane pressure more readable than the current route-based battlefield on a phone?
- Should the player command a single squad action per tactical window, or use independent cooldowns as in this slice?
- Which tower positions create meaningful chokepoint choices without making lanes feel solved?
- Should colors remain pure stat subtypes, or gain one additional readable behavior later?
