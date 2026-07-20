export type PassiveStat = 'moveSpeed' | 'damage' | 'cooldown' | 'magnetRadius' | 'maxHp'

export interface PassiveDef {
  id: string
  name: string
  description: string
  stat: PassiveStat
  // Percentage stats (moveSpeed/damage/cooldown) are fractional deltas
  // applied as 1 + effectPerLevel * level. Flat stats (magnetRadius/maxHp)
  // are added directly.
  effectPerLevel: number
  maxLevel: number
}

export const PASSIVE_DEFS: PassiveDef[] = [
  {
    id: 'boots',
    name: 'Boots',
    description: '+8% move speed',
    stat: 'moveSpeed',
    effectPerLevel: 0.08,
    maxLevel: 5,
  },
  {
    id: 'strength',
    name: 'Strength',
    description: '+10% weapon damage',
    stat: 'damage',
    effectPerLevel: 0.1,
    maxLevel: 5,
  },
  {
    id: 'quick-hands',
    name: 'Quick Hands',
    description: '-8% weapon cooldown',
    stat: 'cooldown',
    effectPerLevel: -0.08,
    maxLevel: 5,
  },
  {
    id: 'magnet',
    name: 'Magnet',
    description: '+25 pickup radius',
    stat: 'magnetRadius',
    effectPerLevel: 25,
    maxLevel: 5,
  },
  {
    id: 'vitality',
    name: 'Vitality',
    description: '+20 max HP',
    stat: 'maxHp',
    effectPerLevel: 20,
    maxLevel: 5,
  },
]
