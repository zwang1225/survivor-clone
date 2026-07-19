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

Core loop only: move, enemies spawn and chase, auto-attack kills them,
contact with an enemy costs HP, 0 HP ends the run. No persistence, no
upgrades, no art assets yet (placeholder colored circles).
