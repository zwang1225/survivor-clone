import Phaser from 'phaser'

const WORLD_WIDTH = 800
const WORLD_HEIGHT = 600
const PLAYER_SPEED = 200
const ENEMY_SPEED = 80
const ENEMY_SPAWN_INTERVAL_MS = 1000
const FIRE_INTERVAL_MS = 400
const PROJECTILE_SPEED = 500
const PROJECTILE_LIFETIME_MS = 2000
const PLAYER_MAX_HP = 100
// Enemies die on contact rather than dealing repeated damage while
// overlapping -- avoids needing per-enemy damage-cooldown/knockback logic
// for a first playable prototype. Revisit once swarming behavior matters.
const ENEMY_CONTACT_DAMAGE = 15
const ENEMY_HP = 20
const PROJECTILE_DAMAGE = 10

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
  private enemies!: Phaser.Physics.Arcade.Group
  private projectiles!: Phaser.Physics.Arcade.Group
  private playerHp = PLAYER_MAX_HP
  private hpText!: Phaser.GameObjects.Text
  private killCount = 0
  private killText!: Phaser.GameObjects.Text
  private timeText!: Phaser.GameObjects.Text
  private survivedMs = 0
  private lastFiredAt = 0
  private isGameOver = false

  constructor() {
    super('game')
  }

  create(): void {
    this.makeCircleTexture('player-tex', 0x4fc3f7, 16)
    this.makeCircleTexture('enemy-tex', 0xef5350, 14)
    this.makeCircleTexture('bullet-tex', 0xffee58, 5)

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

    this.player = this.physics.add.sprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'player-tex')
    this.player.setCollideWorldBounds(true)

    this.enemies = this.physics.add.group()
    this.projectiles = this.physics.add.group()

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd

    this.time.addEvent({
      delay: ENEMY_SPAWN_INTERVAL_MS,
      loop: true,
      callback: () => this.spawnEnemy(),
    })

    this.physics.add.overlap(this.projectiles, this.enemies, (proj, enemy) =>
      this.onProjectileHitEnemy(proj as Phaser.Physics.Arcade.Sprite, enemy as Phaser.Physics.Arcade.Sprite)
    )
    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) =>
      this.onPlayerHitEnemy(enemy as Phaser.Physics.Arcade.Sprite)
    )

    this.hpText = this.add.text(8, 8, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' })
    this.killText = this.add.text(8, 28, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' })
    this.timeText = this.add.text(8, 48, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' })
    this.updateHud()
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) return

    this.survivedMs += delta
    this.movePlayer()
    this.chaseEnemies()
    this.autoFire(this.time.now)
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
    if (dir.lengthSq() > 0) dir.normalize()

    this.player.setVelocity(dir.x * PLAYER_SPEED, dir.y * PLAYER_SPEED)
  }

  private spawnEnemy(): void {
    if (this.isGameOver) return

    const edge = Phaser.Math.Between(0, 3)
    let x = 0
    let y = 0
    switch (edge) {
      case 0:
        x = Phaser.Math.Between(0, WORLD_WIDTH)
        y = -20
        break
      case 1:
        x = WORLD_WIDTH + 20
        y = Phaser.Math.Between(0, WORLD_HEIGHT)
        break
      case 2:
        x = Phaser.Math.Between(0, WORLD_WIDTH)
        y = WORLD_HEIGHT + 20
        break
      default:
        x = -20
        y = Phaser.Math.Between(0, WORLD_HEIGHT)
        break
    }

    const enemy = this.enemies.create(x, y, 'enemy-tex') as Phaser.Physics.Arcade.Sprite
    enemy.setData('hp', ENEMY_HP)
  }

  private chaseEnemies(): void {
    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Phaser.Physics.Arcade.Sprite
      const dir = new Phaser.Math.Vector2(this.player.x - enemy.x, this.player.y - enemy.y)
      if (dir.lengthSq() > 0) dir.normalize()
      enemy.setVelocity(dir.x * ENEMY_SPEED, dir.y * ENEMY_SPEED)
    })
  }

  private autoFire(now: number): void {
    if (now - this.lastFiredAt < FIRE_INTERVAL_MS) return

    const target = this.findNearestEnemy()
    if (!target) return
    this.lastFiredAt = now

    const dir = new Phaser.Math.Vector2(target.x - this.player.x, target.y - this.player.y)
    if (dir.lengthSq() === 0) return
    dir.normalize()

    const bullet = this.projectiles.create(this.player.x, this.player.y, 'bullet-tex') as Phaser.Physics.Arcade.Sprite
    bullet.setVelocity(dir.x * PROJECTILE_SPEED, dir.y * PROJECTILE_SPEED)
    this.time.delayedCall(PROJECTILE_LIFETIME_MS, () => bullet.destroy())
  }

  private findNearestEnemy(): Phaser.Physics.Arcade.Sprite | null {
    let nearest: Phaser.Physics.Arcade.Sprite | null = null
    let nearestDistSq = Infinity

    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Phaser.Physics.Arcade.Sprite
      const distSq = Phaser.Math.Distance.Squared(this.player.x, this.player.y, enemy.x, enemy.y)
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq
        nearest = enemy
      }
    })

    return nearest
  }

  private onProjectileHitEnemy(projectile: Phaser.Physics.Arcade.Sprite, enemy: Phaser.Physics.Arcade.Sprite): void {
    projectile.destroy()

    const hp = (enemy.getData('hp') as number) - PROJECTILE_DAMAGE
    if (hp <= 0) {
      enemy.destroy()
      this.killCount += 1
    } else {
      enemy.setData('hp', hp)
    }
  }

  private onPlayerHitEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    if (this.isGameOver) return

    enemy.destroy()
    this.playerHp = Math.max(0, this.playerHp - ENEMY_CONTACT_DAMAGE)
    if (this.playerHp <= 0) this.endGame()
  }

  private endGame(): void {
    this.isGameOver = true
    this.player.setVelocity(0, 0)
    this.enemies.getChildren().forEach((obj) => (obj as Phaser.Physics.Arcade.Sprite).setVelocity(0, 0))

    this.add
      .text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#ff5252',
      })
      .setOrigin(0.5)
  }

  private updateHud(): void {
    this.hpText.setText(`HP: ${this.playerHp}`)
    this.killText.setText(`Kills: ${this.killCount}`)
    this.timeText.setText(`Time: ${(this.survivedMs / 1000).toFixed(1)}s`)
  }
}
