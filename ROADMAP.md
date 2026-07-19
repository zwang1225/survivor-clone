# Roadmap

Working title `survivor-clone` (Phaser + TypeScript + Vite). Core loop is
done: move, zombies spawn/chase, auto-fire weapons, XP gems, level-up
weapon choices (pistol/shotgun/machine gun, 3 max-level-5 weapons).

This roadmap is about making that loop actually *fun*, not just functional.
Reference: Vampire Survivors' progression design, researched 2026-07-19.

## Locked-in decisions

- **Reference model: Vampire Survivors' two-tier merge system.**
  - **Evolution**: a weapon at max level + a specific passive item (any
    level) → transforms into a new, stronger weapon.
  - **Union**: two specific weapons, both maxed → merge into one, freeing a
    slot. Rarer/more complex, lower priority (Phase 5, stretch).
- **Passives are the actual prerequisite for evolutions, not a nice-to-have
  extra.** Evolution needs a second choice axis (stat items) to pair
  weapons against — building passives is phase 1, not optional groundwork.
- **Order of work, effort/impact ranked**: passives → evolutions →
  rarity-weighted choices → difficulty scaling → game-feel polish. Each
  phase should ship playable/testable on its own (headless-verified like
  the existing weapon system), not land as one giant PR.

## Phases

| Phase | Goal | Status |
| --- | --- | --- |
| 1 | Passive item pool — stat multipliers (move speed, damage, cooldown/fire-rate, pickup radius, max HP), same level-up choice mechanic as weapons, pool mixed with weapons in the 3-choice roll | not started |
| 2 | Weapon evolution — define 1 evolution pair per existing weapon (e.g. Pistol + a fire-rate passive maxed → evolved weapon), auto-detect condition met, offer/apply the evolved weapon replacing the base one | not started, blocked on 1 |
| 3 | Rarity-weighted level-up choices — common/uncommon/rare tiers on weapons+passives, weighted random instead of uniform shuffle | not started |
| 4 | Difficulty scaling — zombie spawn interval shortens and HP/damage creep up with survival time; consider a tougher wave every ~60s | not started |
| 5 | Game-feel polish — hit-flash on zombie hit, camera shake on player damage, floating damage numbers, kill particle burst | not started |
| 6 (stretch) | Union merges — two maxed weapons combine into one, frees a slot | not started, low priority |

## Open questions (revisit when we get there)

- Exact evolution pairings per weapon (which passive unlocks which
  evolution) — needs picking once Phase 1's passive list exists.
- Whether rarity/luck (Phase 3) should also affect regular XP-gem/drop
  rates, or stay scoped to level-up choices only.
- Whether difficulty scaling (Phase 4) needs a visible "wave" indicator in
  the HUD or should stay invisible/felt-not-seen.

Sources referenced when this roadmap was written: [Vampire Survivors
Evolution wiki](https://vampire.survivors.wiki/w/Evolution),
[PCGamesN weapon evolution guide](https://www.pcgamesn.com/vampire-survivors/weapon-evolutions).
