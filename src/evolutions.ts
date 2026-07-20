export interface EvolvedWeaponDef {
  id: string
  name: string
  color: number
  baseWeaponId: string
  requiredPassiveId: string
  damage: number
  fireIntervalMs: number
  projectileCount: number
  spreadDegrees: number
  // How many zombies a single projectile can hit before it's destroyed.
  // 1 matches the base weapons' behavior (no pierce).
  pierce: number
}

export const EVOLUTION_DEFS: EvolvedWeaponDef[] = [
  {
    id: 'deagle',
    name: 'Deagle',
    color: 0xffee58,
    baseWeaponId: 'pistol',
    requiredPassiveId: 'quick-hands',
    damage: 40,
    fireIntervalMs: 350,
    projectileCount: 1,
    spreadDegrees: 0,
    pierce: 3,
  },
  {
    id: 'auto-shotgun',
    name: 'Auto Shotgun',
    color: 0xff8a65,
    baseWeaponId: 'shotgun',
    requiredPassiveId: 'strength',
    damage: 12,
    fireIntervalMs: 250,
    projectileCount: 6,
    spreadDegrees: 45,
    pierce: 1,
  },
  {
    id: 'minigun',
    name: 'Minigun',
    color: 0x81c784,
    baseWeaponId: 'machinegun',
    requiredPassiveId: 'boots',
    damage: 8,
    fireIntervalMs: 70,
    projectileCount: 1,
    spreadDegrees: 12,
    pierce: 1,
  },
]
