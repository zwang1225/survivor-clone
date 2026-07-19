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
leveling up offers a choice of 3 random weapon unlocks/upgrades from a
pool of 3 (pistol, shotgun, machine gun). Real sprite art for player/zombie
(see `public/assets/CREDITS.md`), everything else (bullets, gems) still
placeholder shapes. No persistence yet.
