export interface WeaponDef {
  id: string
  name: string
  color: number
  baseDamage: number
  damagePerLevel: number
  baseFireIntervalMs: number
  fireIntervalMsPerLevel: number
  baseProjectileCount: number
  projectileCountPerLevel: number
  spreadDegrees: number
  maxLevel: number
}

export const WEAPON_DEFS: WeaponDef[] = [
  {
    id: 'pistol',
    name: 'Pistol',
    color: 0xffee58,
    baseDamage: 10,
    damagePerLevel: 4,
    baseFireIntervalMs: 450,
    fireIntervalMsPerLevel: -30,
    baseProjectileCount: 1,
    projectileCountPerLevel: 0,
    spreadDegrees: 0,
    maxLevel: 5,
  },
  {
    id: 'shotgun',
    name: 'Shotgun',
    color: 0xff8a65,
    baseDamage: 6,
    damagePerLevel: 2,
    baseFireIntervalMs: 800,
    fireIntervalMsPerLevel: -40,
    baseProjectileCount: 3,
    projectileCountPerLevel: 1,
    spreadDegrees: 35,
    maxLevel: 5,
  },
  {
    id: 'machinegun',
    name: 'Machine Gun',
    color: 0x81c784,
    baseDamage: 4,
    damagePerLevel: 1,
    baseFireIntervalMs: 180,
    fireIntervalMsPerLevel: -15,
    baseProjectileCount: 1,
    projectileCountPerLevel: 0,
    spreadDegrees: 8,
    maxLevel: 5,
  },
]

export function weaponDamageAtLevel(def: WeaponDef, level: number): number {
  return def.baseDamage + def.damagePerLevel * (level - 1)
}

export function weaponFireIntervalAtLevel(def: WeaponDef, level: number): number {
  return Math.max(80, def.baseFireIntervalMs + def.fireIntervalMsPerLevel * (level - 1))
}

export function weaponProjectileCountAtLevel(def: WeaponDef, level: number): number {
  return def.baseProjectileCount + def.projectileCountPerLevel * (level - 1)
}
