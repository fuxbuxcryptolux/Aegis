## Files changed

- `frontend/src/App.js`
- `frontend/src/pages/SideViewGame.jsx`
- `frontend/src/game/sideview/config.js`
- `frontend/src/game/sideview/rules.js`
- `frontend/src/game/sideview/enemySprites.js`
- `frontend/src/game/sideview/squad.js`
- `frontend/src/game/sideview/index.js`
- `frontend/src/game/sideview/rules.test.js`
- `SIDEVIEW_PROTOTYPE.md`
- `PR_DESCRIPTION.md`

## Architecture

The existing top-down `Game` page and `engine.js` remain the default production path. `App.js` mounts `SideViewGame` only when `?mode=sideview` is present, preserving authentication and leaving production save, cloud save, leaderboard, monetization, engagement, audio, perks, prestige, and Horde/Zero Hour integrations untouched.

The prototype has a separate canvas loop with three horizontal lanes, designated tower spots, real-time enemy movement, direct tower targeting, leaks, base damage, progressive waves, and every-fifth-wave bosses. `sideview/config.js` owns archetypes, all seven neon stat modifiers, tower spots, tower data, and the configurable squad roster. Pure rules derive runtime variants and waves. Procedural enemy silhouettes are shared between normal and enlarged boss rendering.

The squad is a configuration-driven test roster. Vanguard slows and damages frontline pressure, Ranger hits the lowest-health priority target, Arcanist applies area damage and slow, and Engineer repairs the keep. Commands use independent cooldowns, so the Horde continues moving while commands resolve.

## How to run

1. Start the existing frontend from `frontend` with `npm start`.
2. Authenticate as usual.
3. Open `http://localhost:3000/?mode=sideview`.
4. The normal top-down game remains at `http://localhost:3000/`.

## Tests

- `cd frontend && npm test -- --watchAll=false`: passed, 1 suite and 4 tests.
- `cd frontend && npm test -- --watchAll=false src/game/sideview/rules.test.js`: passed, 4 tests.
- `cd frontend && npm run build`: passed. CRA emitted only the existing `fs.F_OK` deprecation warning.

## Known limitations

- Prototype run state is in memory and intentionally does not write production saves.
- Tower attacks resolve as direct hits; projectile visuals and tower upgrades are not in this slice.
- Squad tactical timing uses independent cooldowns rather than a shared command budget.
- Recruitment is a configuration-driven test roster with no permanent economy.
- Horde/Zero Hour live-ops redesign remains out of scope.

## Design questions

- Is three-lane pressure more readable on mobile than the current route-based battlefield?
- Should squad commands share one tactical window budget or retain independent cooldowns?
- Which tower positions produce meaningful chokepoint decisions?
- Should neon variants gain one additional behavior beyond stat modification?
