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
leveling up offers a weighted-random choice of 3 from a combined pool of
weapons (pistol, shotgun, machine gun) and passives (Boots, Strength,
Quick Hands, Magnet, Vitality — see `src/passives.ts`), each tagged
common/uncommon/rare (`src/rarity.ts`) so rarer items show up less often.
Maxing a weapon and its paired passive (see `src/evolutions.ts`)
auto-evolves it into a stronger weapon (Deagle, Auto Shotgun, Minigun)
with a screen notice — no longer offered as a level-up choice once
evolved. Real sprite art for player/zombie (see `public/assets/CREDITS.md`),
everything else (bullets, gems) still placeholder shapes. No persistence
yet. See `ROADMAP.md` for what's next (enemy variety, maps).
