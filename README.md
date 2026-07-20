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
0 HP ends the run. Kills drop XP gems (auto-collected when you get close);
leveling up offers a choice of 3 from a combined pool of weapons (pistol,
shotgun, machine gun) and passives (Boots, Strength, Quick Hands, Magnet,
Vitality — see `src/passives.ts`). Real sprite art for player/zombie (see
`public/assets/CREDITS.md`), everything else (bullets, gems) still
placeholder shapes. No persistence yet. See `ROADMAP.md` for what's next
(weapon evolutions, enemy variety, maps).
