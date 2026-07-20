# survivor-clone

2D top-down survival game (Vampire Survivors-like), Phaser + TypeScript + Vite.
Working title, not a final name.

## Run locally

```
npm install
npm run dev
```

WASD/arrow keys to move. Auto-fires at the nearest enemy.

## Current state

Move, zombies spawn and chase, auto-fire kills them, contact costs HP,
0 HP ends the run. Four enemy types (see `src/enemies.ts`): Walker
(baseline, from the start), Runner (fast/weak, unlocks at 20s), Brute
(slow/tanky, 40s), Spitter (holds range and shoots back, 60s). An elite
(bigger, tankier, more XP) spawns every 45s from whatever types are
unlocked. Spawn rate climbs from 1000ms down to a 350ms floor as survival
time passes.

Kills drop XP gems (auto-collected when you get close); leveling up
offers a weighted-random choice of 3 from a combined pool of weapons
(pistol, shotgun, machine gun) and passives (Boots, Strength, Quick Hands,
Magnet, Vitality — see `src/passives.ts`), each tagged common/uncommon/rare
(`src/rarity.ts`) so rarer items show up less often. Maxing a weapon and
its paired passive (see `src/evolutions.ts`) auto-evolves it into a
stronger weapon (Deagle, Auto Shotgun, Minigun) with a screen notice — no
longer offered as a level-up choice once evolved.

Real sprite art for player/zombie (see `public/assets/CREDITS.md`),
everything else (bullets, gems, enemy variety tints) still placeholder
shapes/colors. No persistence yet. See `ROADMAP.md` for what's next
(game-feel polish, maps).
