export interface RangedAttack {
  range: number
  fireIntervalMs: number
  projectileSpeed: number
  projectileDamage: number
}

export interface EnemyDef {
  id: string
  name: string
  // Tint applied over the single zombie sprite to visually distinguish
  // types (no separate art per type yet). 0xffffff = no tint, natural
  // colors.
  color: number
  speed: number
  hp: number
  contactDamage: number
  xpValue: number
  // Survival time (ms) after which this type becomes eligible to spawn.
  unlocksAtMs: number
  // Present only for ranged types: holds position at range and fires
  // instead of closing to contact.
  ranged?: RangedAttack
}

export const ENEMY_DEFS: EnemyDef[] = [
  {
    id: 'walker',
    name: 'Walker',
    color: 0xffffff,
    speed: 80,
    hp: 20,
    contactDamage: 15,
    xpValue: 5,
    unlocksAtMs: 0,
  },
  {
    id: 'runner',
    name: 'Runner',
    color: 0xfff176,
    speed: 170,
    hp: 10,
    contactDamage: 10,
    xpValue: 5,
    unlocksAtMs: 20_000,
  },
  {
    id: 'brute',
    name: 'Brute',
    color: 0x8d6e63,
    speed: 45,
    hp: 70,
    contactDamage: 25,
    xpValue: 10,
    unlocksAtMs: 40_000,
  },
  {
    id: 'spitter',
    name: 'Spitter',
    color: 0xba68c8,
    speed: 60,
    hp: 15,
    contactDamage: 8,
    xpValue: 8,
    unlocksAtMs: 60_000,
    ranged: {
      range: 220,
      fireIntervalMs: 1800,
      projectileSpeed: 220,
      projectileDamage: 10,
    },
  },
]
