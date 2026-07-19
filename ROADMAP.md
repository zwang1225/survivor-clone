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
    slot. Rarer/more complex, lower priority (Phase 6, stretch).
- **Passives are the actual prerequisite for evolutions, not a nice-to-have
  extra.** Evolution needs a second choice axis (stat items) to pair
  weapons against — building passives is phase 1, not optional groundwork.
- **Order of work, effort/impact ranked**: passives → evolutions →
  rarity-weighted choices → difficulty scaling → game-feel polish. Each
  phase should ship playable/testable on its own (headless-verified like
  the existing weapon system), not land as one giant PR.
- **Story: explicitly not a phase.** Genre reality check (2026-07-19) —
  Vampire Survivors and its clones succeed almost entirely on mechanical
  loop, not narrative. At most, flavor text on unlocks; never a real story
  system. Don't add a phase for this unless that assumption changes.
- **Enemy variety folded into Phase 4** (2026-07-19), not a separate
  effort — "difficulty scaling" alone (just bigger HP/spawn-rate numbers)
  is lower value than actually different enemy types. Every zombie today
  is mechanically identical; that's the bigger fun gap.
- **Maps added as Phase 7** (2026-07-19) — currently a fixed 800x600 empty
  arena. Real value (scrolling world, tile backgrounds, obstacles,
  eventually map-select) but higher effort and not required for the core
  loop to be fun, so it sits after the mechanical-depth phases.

## Phases

| Phase | Goal | Status |
| --- | --- | --- |
| 1 | Passive item pool — stat multipliers (move speed, damage, cooldown/fire-rate, pickup radius, max HP), same level-up choice mechanic as weapons, pool mixed with weapons in the 3-choice roll | not started |
| 2 | Weapon evolution — define 1 evolution pair per existing weapon (e.g. Pistol + a fire-rate passive maxed → evolved weapon), auto-detect condition met, offer/apply the evolved weapon replacing the base one | not started, blocked on 1 |
| 3 | Rarity-weighted level-up choices — common/uncommon/rare tiers on weapons+passives, weighted random instead of uniform shuffle | not started |
| 4 | Difficulty & enemy variety — new zombie types with distinct stats/behavior (fast+weak, slow+tanky, ranged), periodic elite spawns, plus spawn-rate/HP scaling with survival time | not started |
| 5 | Game-feel polish — hit-flash on zombie hit, camera shake on player damage, floating damage numbers, kill particle burst | not started |
| 6 (stretch) | Union merges — two maxed weapons combine into one, frees a slot | not started, low priority |
| 7 | Maps — scrolling world (camera follows player instead of fixed arena), tile backgrounds, obstacles; map-select as a later unlock layer once more than one map exists | not started |

## Open questions (revisit when we get there)

- Exact evolution pairings per weapon (which passive unlocks which
  evolution) — needs picking once Phase 1's passive list exists.
- Whether rarity/luck (Phase 3) should also affect regular XP-gem/drop
  rates, or stay scoped to level-up choices only.
- Whether difficulty scaling (Phase 4) needs a visible "wave" indicator in
  the HUD or should stay invisible/felt-not-seen.
- Exact new enemy types/stats for Phase 4 (fast/weak, slow/tanky, ranged,
  elite) — not designed yet, just named as a direction.
- Whether Phase 7's bigger scrolling world needs its own difficulty
  implications revisited (e.g. does spawn density need to scale with
  visible screen area vs. total world size).

Sources referenced when this roadmap was written: [Vampire Survivors
Evolution wiki](https://vampire.survivors.wiki/w/Evolution),
[PCGamesN weapon evolution guide](https://www.pcgamesn.com/vampire-survivors/weapon-evolutions).
