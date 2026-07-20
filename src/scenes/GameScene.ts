import Phaser from 'phaser'
import {
  WEAPON_DEFS,
  type WeaponDef,
  weaponDamageAtLevel,
  weaponFireIntervalAtLevel,
  weaponProjectileCountAtLevel,
} from '../weapons'
import { PASSIVE_DEFS, type PassiveDef } from '../passives'
import { EVOLUTION_DEFS, type EvolvedWeaponDef } from '../evolutions'
import { RARITY_WEIGHTS, RARITY_LABELS } from '../rarity'
import { ENEMY_DEFS, type EnemyDef } from '../enemies'

const WORLD_WIDTH = 800
const WORLD_HEIGHT = 600
const PLAYER_SPEED = 200
const PROJECTILE_SPEED = 500
const PROJECTILE_LIFETIME_MS = 2000
const PLAYER_BASE_MAX_HP = 100
// Zombies die on contact rather than dealing repeated damage while
// overlapping -- avoids needing per-zombie damage-cooldown/knockback logic
// for a first playable prototype. Revisit once swarming behavior matters.
const XP_GEM_BASE_MAGNET_RADIUS = 90
const XP_GEM_MAGNET_SPEED = 300
const STARTING_WEAPON_ID = 'pistol'
// Cooldown reduction from passives can't push fire interval to zero/negative.
const MIN_COOLDOWN_MULTIPLIER = 0.3

// Spawn interval shrinks as survival time increases, down to a floor.
const BASE_SPAWN_INTERVAL_MS = 1000
const MIN_SPAWN_INTERVAL_MS = 350
const SPAWN_INTERVAL_DECAY_PER_SEC = 5

const ELITE_INTERVAL_MS = 45_000
const ELITE_HP_MULTIPLIER = 3
const ELITE_SPEED_MULTIPLIER = 1.2
const ELITE_CONTACT_MULTIPLIER = 1.5
const ELITE_XP_MULTIPLIER = 4
const ELITE_SCALE = 1.6

function xpRequiredForLevel(level: number): number {
  return 20 + (level - 1) * 15
}

type LevelUpChoice =
  | { kind: 'weapon'; def: WeaponDef; nextLevel: number; isNew: boolean }
  | { kind: 'passive'; def: PassiveDef; nextLevel: number; isNew: boolean }

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
  private zombies!: Phaser.Physics.Arcade.Group
  private projectiles!: Phaser.Physics.Arcade.Group
  private enemyProjectiles!: Phaser.Physics.Arcade.Group
  private xpGems!: Phaser.Physics.Arcade.Group

  private lastZombieSpawnAt = 0
  private lastEliteSpawnAt = 0

  private playerMaxHp = PLAYER_BASE_MAX_HP
  private playerHp = PLAYER_BASE_MAX_HP
  private playerLevel = 1
  private playerXp = 0
  private ownedWeapons = new Map<string, number>()
  private weaponCooldowns = new Map<string, number>()
  private ownedPassives = new Map<string, number>()
  private ownedEvolvedWeapons = new Set<string>()

  // Aggregated from ownedPassives by recomputePassiveEffects(). Percentage
  // stats are multipliers (1 = no effect); magnetRadiusBonus is additive.
  private moveSpeedMultiplier = 1
  private damageMultiplier = 1
  private cooldownMultiplier = 1
  private magnetRadiusBonus = 0

  private hpText!: Phaser.GameObjects.Text
  private killText!: Phaser.GameObjects.Text
  private timeText!: Phaser.GameObjects.Text
  private levelText!: Phaser.GameObjects.Text

  private killCount = 0
  private survivedMs = 0
  private isGameOver = false
  private isPausedForLevelUp = false

  constructor() {
    super('game')
  }

  preload(): void {
    this.load.image('player-tex', '/assets/player.png')
    this.load.image('zombie-tex', '/assets/zombie.png')
  }

  create(): void {
    this.makeCircleTexture('bullet-tex', 0xffffff, 5)
    this.makeCircleTexture('enemy-bullet-tex', 0xe91e63, 4)
    this.makeCircleTexture('gem-tex', 0x4fc3f7, 6)

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

    this.player = this.physics.add.sprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'player-tex')
    this.player.setCollideWorldBounds(true)

    this.ownedWeapons.set(STARTING_WEAPON_ID, 1)

    this.zombies = this.physics.add.group()
    this.projectiles = this.physics.add.group()
    this.enemyProjectiles = this.physics.add.group()
    this.xpGems = this.physics.add.group()

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd

    // Spawn timing is driven from update() (see updateSpawning) instead of
    // a fixed time.addEvent loop, since the interval now shrinks over
    // survival time.
    this.lastZombieSpawnAt = this.time.now
    this.lastEliteSpawnAt = this.time.now

    this.physics.add.overlap(this.projectiles, this.zombies, (proj, zombie) =>
      this.onProjectileHitZombie(proj as Phaser.Physics.Arcade.Sprite, zombie as Phaser.Physics.Arcade.Sprite)
    )
    this.physics.add.overlap(this.player, this.zombies, (_player, zombie) =>
      this.onPlayerHitZombie(zombie as Phaser.Physics.Arcade.Sprite)
    )
    this.physics.add.overlap(this.player, this.xpGems, (_player, gem) =>
      this.onPlayerCollectGem(gem as Phaser.Physics.Arcade.Sprite)
    )
    this.physics.add.overlap(this.player, this.enemyProjectiles, (_player, proj) =>
      this.onPlayerHitByProjectile(proj as Phaser.Physics.Arcade.Sprite)
    )

    this.hpText = this.add.text(8, 8, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' })
    this.levelText = this.add.text(8, 28, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' })
    this.killText = this.add.text(8, 48, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' })
    this.timeText = this.add.text(8, 68, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' })
    this.updateHud()
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver || this.isPausedForLevelUp) return

    this.survivedMs += delta
    this.movePlayer()
    this.updateZombieBehavior(this.time.now)
    this.attractXpGems()
    this.autoFireWeapons(this.time.now)
    this.updateSpawning(this.time.now)
    this.updateHud()
  }

  private makeCircleTexture(key: string, color: number, radius: number): void {
    const g = this.add.graphics()
    g.fillStyle(color, 1)
    g.fillCircle(radius, radius, radius)
    g.generateTexture(key, radius * 2, radius * 2)
    g.destroy()
  }

  private movePlayer(): void {
    const left = this.cursors.left.isDown || this.wasd.A.isDown
    const right = this.cursors.right.isDown || this.wasd.D.isDown
    const up = this.cursors.up.isDown || this.wasd.W.isDown
    const down = this.cursors.down.isDown || this.wasd.S.isDown

    const dir = new Phaser.Math.Vector2((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0))
    if (dir.lengthSq() > 0) {
      dir.normalize()
      this.player.setRotation(Math.atan2(dir.y, dir.x))
    }

    const speed = PLAYER_SPEED * this.moveSpeedMultiplier
    this.player.setVelocity(dir.x * speed, dir.y * speed)
  }

  private updateSpawning(now: number): void {
    const survivedSec = this.survivedMs / 1000
    const spawnInterval = Math.max(MIN_SPAWN_INTERVAL_MS, BASE_SPAWN_INTERVAL_MS - survivedSec * SPAWN_INTERVAL_DECAY_PER_SEC)
    if (now - this.lastZombieSpawnAt >= spawnInterval) {
      this.lastZombieSpawnAt = now
      this.spawnZombie()
    }

    if (now - this.lastEliteSpawnAt >= ELITE_INTERVAL_MS) {
      this.lastEliteSpawnAt = now
      this.spawnEliteZombie()
    }
  }

  private eligibleEnemyDefs(): EnemyDef[] {
    return ENEMY_DEFS.filter((def) => this.survivedMs >= def.unlocksAtMs)
  }

  private randomEdgePosition(): { x: number; y: number } {
    const edge = Phaser.Math.Between(0, 3)
    switch (edge) {
      case 0:
        return { x: Phaser.Math.Between(0, WORLD_WIDTH), y: -20 }
      case 1:
        return { x: WORLD_WIDTH + 20, y: Phaser.Math.Between(0, WORLD_HEIGHT) }
      case 2:
        return { x: Phaser.Math.Between(0, WORLD_WIDTH), y: WORLD_HEIGHT + 20 }
      default:
        return { x: -20, y: Phaser.Math.Between(0, WORLD_HEIGHT) }
    }
  }

  private spawnZombie(): void {
    if (this.isGameOver) return

    const def = Phaser.Utils.Array.GetRandom(this.eligibleEnemyDefs())
    const { x, y } = this.randomEdgePosition()

    const zombie = this.zombies.create(x, y, 'zombie-tex') as Phaser.Physics.Arcade.Sprite
    zombie.setTint(def.color)
    zombie.setData('def', def)
    zombie.setData('hp', def.hp)
    zombie.setData('isElite', false)
  }

  private spawnEliteZombie(): void {
    if (this.isGameOver) return

    const def = Phaser.Utils.Array.GetRandom(this.eligibleEnemyDefs())
    const { x, y } = this.randomEdgePosition()

    const zombie = this.zombies.create(x, y, 'zombie-tex') as Phaser.Physics.Arcade.Sprite
    zombie.setTint(def.color)
    zombie.setScale(ELITE_SCALE)
    zombie.setData('def', def)
    zombie.setData('hp', Math.round(def.hp * ELITE_HP_MULTIPLIER))
    zombie.setData('isElite', true)
    this.showEliteSpawnNotice(def)
  }

  private showEliteSpawnNotice(def: EnemyDef): void {
    const text = this.add
      .text(WORLD_WIDTH / 2, 150, `Elite ${def.name} incoming!`, {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ff5252',
      })
      .setOrigin(0.5)

    this.tweens.add({
      targets: text,
      alpha: 0,
      duration: 2500,
      onComplete: () => text.destroy(),
    })
  }

  private updateZombieBehavior(now: number): void {
    this.zombies.getChildren().forEach((obj) => {
      const zombie = obj as Phaser.Physics.Arcade.Sprite
      const def = zombie.getData('def') as EnemyDef
      const dir = new Phaser.Math.Vector2(this.player.x - zombie.x, this.player.y - zombie.y)
      const distance = dir.length()

      if (def.ranged && distance <= def.ranged.range) {
        zombie.setVelocity(0, 0)
        if (dir.lengthSq() > 0) zombie.setRotation(Math.atan2(dir.y, dir.x))

        const lastFired = (zombie.getData('lastFiredAt') as number) ?? 0
        if (now - lastFired >= def.ranged.fireIntervalMs) {
          zombie.setData('lastFiredAt', now)
          this.fireZombieProjectile(zombie, def.ranged, dir)
        }
        return
      }

      if (dir.lengthSq() > 0) {
        dir.normalize()
        zombie.setRotation(Math.atan2(dir.y, dir.x))
      }

      const isElite = zombie.getData('isElite') as boolean
      const speed = def.speed * (isElite ? ELITE_SPEED_MULTIPLIER : 1)
      zombie.setVelocity(dir.x * speed, dir.y * speed)
    })
  }

  private fireZombieProjectile(zombie: Phaser.Physics.Arcade.Sprite, ranged: NonNullable<EnemyDef['ranged']>, dir: Phaser.Math.Vector2): void {
    const normalized = dir.clone().normalize()
    const proj = this.enemyProjectiles.create(zombie.x, zombie.y, 'enemy-bullet-tex') as Phaser.Physics.Arcade.Sprite
    proj.setData('damage', ranged.projectileDamage)
    proj.setVelocity(normalized.x * ranged.projectileSpeed, normalized.y * ranged.projectileSpeed)
    this.time.delayedCall(PROJECTILE_LIFETIME_MS, () => proj.destroy())
  }

  private attractXpGems(): void {
    const radius = XP_GEM_BASE_MAGNET_RADIUS + this.magnetRadiusBonus

    this.xpGems.getChildren().forEach((obj) => {
      const gem = obj as Phaser.Physics.Arcade.Sprite
      const distSq = Phaser.Math.Distance.Squared(this.player.x, this.player.y, gem.x, gem.y)
      if (distSq > radius * radius) {
        gem.setVelocity(0, 0)
        return
      }
      const dir = new Phaser.Math.Vector2(this.player.x - gem.x, this.player.y - gem.y)
      if (dir.lengthSq() > 0) dir.normalize()
      gem.setVelocity(dir.x * XP_GEM_MAGNET_SPEED, dir.y * XP_GEM_MAGNET_SPEED)
    })
  }

  private autoFireWeapons(now: number): void {
    for (const [weaponId, level] of this.ownedWeapons) {
      const def = WEAPON_DEFS.find((w) => w.id === weaponId)
      if (!def) continue

      const lastFired = this.weaponCooldowns.get(weaponId) ?? 0
      const interval = weaponFireIntervalAtLevel(def, level) * this.cooldownMultiplier
      if (now - lastFired < interval) continue

      const target = this.findNearestZombie()
      if (!target) continue

      this.weaponCooldowns.set(weaponId, now)
      this.fireWeapon(def, level, target)
    }

    for (const evoId of this.ownedEvolvedWeapons) {
      const def = EVOLUTION_DEFS.find((e) => e.id === evoId)
      if (!def) continue

      const lastFired = this.weaponCooldowns.get(evoId) ?? 0
      const interval = def.fireIntervalMs * this.cooldownMultiplier
      if (now - lastFired < interval) continue

      const target = this.findNearestZombie()
      if (!target) continue

      this.weaponCooldowns.set(evoId, now)
      this.fireEvolvedWeapon(def, target)
    }
  }

  private fireWeapon(def: WeaponDef, level: number, target: Phaser.Physics.Arcade.Sprite): void {
    const damage = Math.round(weaponDamageAtLevel(def, level) * this.damageMultiplier)
    const projectileCount = weaponProjectileCountAtLevel(def, level)
    this.fireSpread(target, def.color, damage, projectileCount, def.spreadDegrees, 1)
  }

  private fireEvolvedWeapon(def: EvolvedWeaponDef, target: Phaser.Physics.Arcade.Sprite): void {
    const damage = Math.round(def.damage * this.damageMultiplier)
    this.fireSpread(target, def.color, damage, def.projectileCount, def.spreadDegrees, def.pierce)
  }

  private fireSpread(
    target: Phaser.Physics.Arcade.Sprite,
    color: number,
    damage: number,
    projectileCount: number,
    spreadDegrees: number,
    pierce: number
  ): void {
    const baseDir = new Phaser.Math.Vector2(target.x - this.player.x, target.y - this.player.y)
    if (baseDir.lengthSq() === 0) return
    baseDir.normalize()

    const spreadRad = Phaser.Math.DegToRad(spreadDegrees)

    for (let i = 0; i < projectileCount; i++) {
      const t = projectileCount === 1 ? 0 : i / (projectileCount - 1) - 0.5
      const dir = baseDir.clone().rotate(spreadRad * t)
      this.spawnProjectile(dir, color, damage, pierce)
    }
  }

  private spawnProjectile(dir: Phaser.Math.Vector2, color: number, damage: number, pierce: number): void {
    const bullet = this.projectiles.create(this.player.x, this.player.y, 'bullet-tex') as Phaser.Physics.Arcade.Sprite
    bullet.setTint(color)
    bullet.setData('damage', damage)
    bullet.setData('pierce', pierce)
    bullet.setData('hitZombies', new Set<Phaser.Physics.Arcade.Sprite>())
    bullet.setVelocity(dir.x * PROJECTILE_SPEED, dir.y * PROJECTILE_SPEED)
    this.time.delayedCall(PROJECTILE_LIFETIME_MS, () => bullet.destroy())
  }

  private findNearestZombie(): Phaser.Physics.Arcade.Sprite | null {
    let nearest: Phaser.Physics.Arcade.Sprite | null = null
    let nearestDistSq = Infinity

    this.zombies.getChildren().forEach((obj) => {
      const zombie = obj as Phaser.Physics.Arcade.Sprite
      const distSq = Phaser.Math.Distance.Squared(this.player.x, this.player.y, zombie.x, zombie.y)
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq
        nearest = zombie
      }
    })

    return nearest
  }

  private onProjectileHitZombie(projectile: Phaser.Physics.Arcade.Sprite, zombie: Phaser.Physics.Arcade.Sprite): void {
    // Arcade overlap fires every frame two bodies overlap, not once --
    // without this, a piercing projectile would hit the same zombie
    // repeatedly for as long as they're touching instead of passing
    // through it once.
    const hitZombies = projectile.getData('hitZombies') as Set<Phaser.Physics.Arcade.Sprite>
    if (hitZombies.has(zombie)) return
    hitZombies.add(zombie)

    const damage = projectile.getData('damage') as number
    const hp = (zombie.getData('hp') as number) - damage
    if (hp <= 0) {
      const def = zombie.getData('def') as EnemyDef
      const isElite = zombie.getData('isElite') as boolean
      const xpValue = Math.round(def.xpValue * (isElite ? ELITE_XP_MULTIPLIER : 1))
      this.spawnXpGem(zombie.x, zombie.y, xpValue)
      zombie.destroy()
      this.killCount += 1
    } else {
      zombie.setData('hp', hp)
    }

    const pierceRemaining = (projectile.getData('pierce') as number) - 1
    if (pierceRemaining <= 0) {
      projectile.destroy()
    } else {
      projectile.setData('pierce', pierceRemaining)
    }
  }

  private onPlayerHitZombie(zombie: Phaser.Physics.Arcade.Sprite): void {
    if (this.isGameOver) return

    const def = zombie.getData('def') as EnemyDef
    const isElite = zombie.getData('isElite') as boolean
    const damage = Math.round(def.contactDamage * (isElite ? ELITE_CONTACT_MULTIPLIER : 1))

    zombie.destroy()
    this.playerHp = Math.max(0, this.playerHp - damage)
    if (this.playerHp <= 0) this.endGame()
  }

  private onPlayerHitByProjectile(projectile: Phaser.Physics.Arcade.Sprite): void {
    if (this.isGameOver) return

    const damage = projectile.getData('damage') as number
    projectile.destroy()
    this.playerHp = Math.max(0, this.playerHp - damage)
    if (this.playerHp <= 0) this.endGame()
  }

  private spawnXpGem(x: number, y: number, value: number): void {
    const gem = this.xpGems.create(x, y, 'gem-tex') as Phaser.Physics.Arcade.Sprite
    gem.setData('value', value)
  }

  private onPlayerCollectGem(gem: Phaser.Physics.Arcade.Sprite): void {
    const value = gem.getData('value') as number
    gem.destroy()
    this.gainXp(value)
  }

  private gainXp(amount: number): void {
    this.playerXp += amount

    while (this.playerXp >= xpRequiredForLevel(this.playerLevel)) {
      this.playerXp -= xpRequiredForLevel(this.playerLevel)
      this.playerLevel += 1

      const choices = this.rollLevelUpChoices(3)
      if (choices.length > 0) {
        this.showLevelUpChoices(choices)
        break
      }
    }
  }

  private rollLevelUpChoices(count: number): LevelUpChoice[] {
    const pool: LevelUpChoice[] = []

    for (const def of WEAPON_DEFS) {
      // A weapon that's already evolved shouldn't be re-offerable as a
      // fresh unlock -- it's gone from ownedWeapons (see applyEvolution),
      // which would otherwise make currentLevel read back as 0.
      const hasEvolved = EVOLUTION_DEFS.some((e) => e.baseWeaponId === def.id && this.ownedEvolvedWeapons.has(e.id))
      if (hasEvolved) continue

      const currentLevel = this.ownedWeapons.get(def.id) ?? 0
      if (currentLevel >= def.maxLevel) continue
      pool.push({ kind: 'weapon', def, nextLevel: currentLevel + 1, isNew: currentLevel === 0 })
    }
    for (const def of PASSIVE_DEFS) {
      const currentLevel = this.ownedPassives.get(def.id) ?? 0
      if (currentLevel >= def.maxLevel) continue
      pool.push({ kind: 'passive', def, nextLevel: currentLevel + 1, isNew: currentLevel === 0 })
    }

    return this.pickWeighted(pool, count)
  }

  // Weighted sampling without replacement: repeatedly roll against the
  // remaining pool's total weight, removing each pick so it can't be
  // chosen twice. Rare items are still possible, just less likely --
  // this replaces the old uniform Phaser.Utils.Array.Shuffle.
  private pickWeighted(pool: LevelUpChoice[], count: number): LevelUpChoice[] {
    const remaining = [...pool]
    const picked: LevelUpChoice[] = []

    while (picked.length < count && remaining.length > 0) {
      const totalWeight = remaining.reduce((sum, choice) => sum + RARITY_WEIGHTS[choice.def.rarity], 0)
      let roll = Math.random() * totalWeight
      let index = remaining.length - 1

      for (let i = 0; i < remaining.length; i++) {
        roll -= RARITY_WEIGHTS[remaining[i].def.rarity]
        if (roll <= 0) {
          index = i
          break
        }
      }

      picked.push(remaining[index])
      remaining.splice(index, 1)
    }

    return picked
  }

  private showLevelUpChoices(choices: LevelUpChoice[]): void {
    this.isPausedForLevelUp = true
    // update() bailing out on isPausedForLevelUp only stops us from
    // re-issuing velocities -- it doesn't stop Arcade Physics from
    // continuing to integrate whatever velocity zombies/projectiles
    // already had, and doesn't stop the zombie-spawn timer. Pause both
    // for a real freeze.
    this.physics.pause()
    this.time.paused = true

    const container = document.getElementById('level-up-choices')!
    container.innerHTML = ''
    choices.forEach((choice) => {
      const button = document.createElement('button')
      button.className = `level-up-choice level-up-choice--${choice.def.rarity}`
      const rarityLabel = RARITY_LABELS[choice.def.rarity]
      const statusLabel = choice.isNew ? 'New!' : `Level ${choice.nextLevel}`
      const description = choice.kind === 'passive' ? `<br><small>${choice.def.description}</small>` : ''
      button.innerHTML = `<span class="rarity-label">${rarityLabel}</span><br><strong>${choice.def.name}</strong><br>${statusLabel}${description}`
      button.addEventListener('click', () => this.applyLevelUpChoice(choice))
      container.appendChild(button)
    })

    document.getElementById('level-up-overlay')!.classList.remove('hidden')
  }

  private applyLevelUpChoice(choice: LevelUpChoice): void {
    if (choice.kind === 'weapon') {
      this.ownedWeapons.set(choice.def.id, choice.nextLevel)
    } else {
      this.ownedPassives.set(choice.def.id, choice.nextLevel)
      this.recomputePassiveEffects()
    }
    this.checkForEvolutions()

    document.getElementById('level-up-overlay')!.classList.add('hidden')
    this.isPausedForLevelUp = false
    this.physics.resume()
    this.time.paused = false
    this.updateHud()
  }

  // Evolutions apply automatically the moment their conditions are met
  // (base weapon maxed + required passive maxed), not offered as a random
  // choice -- matches the genre convention this is modeled on.
  private checkForEvolutions(): void {
    for (const evo of EVOLUTION_DEFS) {
      if (this.ownedEvolvedWeapons.has(evo.id)) continue

      const weaponDef = WEAPON_DEFS.find((w) => w.id === evo.baseWeaponId)
      const passiveDef = PASSIVE_DEFS.find((p) => p.id === evo.requiredPassiveId)
      if (!weaponDef || !passiveDef) continue

      const weaponLevel = this.ownedWeapons.get(evo.baseWeaponId) ?? 0
      const passiveLevel = this.ownedPassives.get(evo.requiredPassiveId) ?? 0
      if (weaponLevel >= weaponDef.maxLevel && passiveLevel >= passiveDef.maxLevel) {
        this.applyEvolution(evo)
      }
    }
  }

  private applyEvolution(evo: EvolvedWeaponDef): void {
    this.ownedWeapons.delete(evo.baseWeaponId)
    this.ownedEvolvedWeapons.add(evo.id)
    this.showEvolutionNotice(evo)
  }

  private showEvolutionNotice(evo: EvolvedWeaponDef): void {
    const text = this.add
      .text(WORLD_WIDTH / 2, 120, `${evo.name} unlocked!`, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#ffd54f',
      })
      .setOrigin(0.5)

    this.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      duration: 2000,
      onComplete: () => text.destroy(),
    })
  }

  private recomputePassiveEffects(): void {
    let moveSpeedMult = 1
    let damageMult = 1
    let cooldownMult = 1
    let magnetBonus = 0
    let maxHpBonus = 0

    for (const [id, level] of this.ownedPassives) {
      const def = PASSIVE_DEFS.find((p) => p.id === id)
      if (!def) continue

      switch (def.stat) {
        case 'moveSpeed':
          moveSpeedMult += def.effectPerLevel * level
          break
        case 'damage':
          damageMult += def.effectPerLevel * level
          break
        case 'cooldown':
          cooldownMult += def.effectPerLevel * level
          break
        case 'magnetRadius':
          magnetBonus += def.effectPerLevel * level
          break
        case 'maxHp':
          maxHpBonus += def.effectPerLevel * level
          break
      }
    }

    this.moveSpeedMultiplier = moveSpeedMult
    this.damageMultiplier = damageMult
    this.cooldownMultiplier = Math.max(MIN_COOLDOWN_MULTIPLIER, cooldownMult)
    this.magnetRadiusBonus = magnetBonus

    const newMaxHp = PLAYER_BASE_MAX_HP + maxHpBonus
    const hpGain = newMaxHp - this.playerMaxHp
    this.playerMaxHp = newMaxHp
    if (hpGain > 0) this.playerHp = Math.min(this.playerMaxHp, this.playerHp + hpGain)
  }

  private endGame(): void {
    this.isGameOver = true
    this.player.setVelocity(0, 0)
    this.zombies.getChildren().forEach((obj) => (obj as Phaser.Physics.Arcade.Sprite).setVelocity(0, 0))

    this.add
      .text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#ff5252',
      })
      .setOrigin(0.5)
  }

  private updateHud(): void {
    this.hpText.setText(`HP: ${this.playerHp}/${this.playerMaxHp}`)
    this.levelText.setText(`Lv ${this.playerLevel}  XP: ${this.playerXp}/${xpRequiredForLevel(this.playerLevel)}`)
    this.killText.setText(`Kills: ${this.killCount}`)
    this.timeText.setText(`Time: ${(this.survivedMs / 1000).toFixed(1)}s`)
  }
}
