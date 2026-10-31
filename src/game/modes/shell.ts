import { BaseMode } from '../core/base'
import { Starfield, drawBolt, glowCircle } from '../core/fx'
import { sfx } from '../core/sound'
import { C, W, H, pick, rand, type ModeHud, type ModeOptions } from '../core/types'

const CX = W / 2
const CY = H / 2
const PR = 262
const SUN_R = 34
const BALL_R = 6
const RINGS = [
  { r0: 60, r1: 86, n: 10, hp: 2, speed: 0.22 },
  { r0: 94, r1: 120, n: 14, hp: 2, speed: -0.17 },
  { r0: 128, r1: 154, n: 18, hp: 1, speed: 0.13 },
  { r0: 162, r1: 188, n: 22, hp: 1, speed: -0.09 },
]
const TAU = Math.PI * 2
const wrap = (a: number) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI

type Brick = { ring: number; idx: number; hp: number; max: number; hitT: number }
type Ball = { x: number; y: number; vx: number; vy: number; stuck: boolean; trail: { x: number; y: number }[] }
type Drop = { a: number; r: number; kind: 'multi' | 'wide' | 'slow' }

export class ShellMode extends BaseMode {
  stars = new Starfield()
  bricks: Brick[] = []
  rot = RINGS.map(() => 0)
  balls: Ball[] = []
  drops: Drop[] = []
  paddle = -Math.PI / 2
  halfWidth = 0.32
  wideT = 0
  lives = 3
  livesLost = 0
  sunHits = 0
  sunPulse = 0
  speed = 330
  usePointer = false

  constructor(opts: ModeOptions) {
    super(opts)
    RINGS.forEach((r, ring) => {
      for (let idx = 0; idx < r.n; idx++) this.bricks.push({ ring, idx, hp: r.hp, max: r.hp, hitT: 0 })
    })
    this.spawnStuck()
    this.say('Скорлупа запечатала светило. Пробейте её!')
  }

  spawnStuck() {
    this.balls = [{ x: 0, y: 0, vx: 0, vy: 0, stuck: true, trail: [] }]
  }

  launch() {
    for (const b of this.balls) {
      if (!b.stuck) continue
      b.stuck = false
      const a = this.paddle + Math.PI + rand(-0.25, 0.25)
      b.vx = Math.cos(a) * this.speed
      b.vy = Math.sin(a) * this.speed
      sfx.bounce()
    }
  }

  override onPointerMove(p: { x: number; y: number }) {
    this.usePointer = true
    this.pointer = p
  }
  override onPointerDown(p: { x: number; y: number }) {
    this.usePointer = true
    this.pointer = p
    this.launch()
  }
  override onKeyDown(code: string) {
    if (code === 'Space') this.launch()
    if (code.startsWith('Arrow') || code === 'KeyA' || code === 'KeyD') this.usePointer = false
  }

  brickAngles(b: Brick) {
    const ring = RINGS[b.ring]!
    const step = TAU / ring.n
    const a0 = this.rot[b.ring]! + b.idx * step + 0.03
    return { a0, a1: a0 + step - 0.06, ring }
  }

  override update(dt: number) {
    RINGS.forEach((r, i) => (this.rot[i] = this.rot[i]! + r.speed * dt))
    this.sunPulse = Math.max(0, this.sunPulse - dt)
    this.wideT = Math.max(0, this.wideT - dt)
    const targetWidth = this.wideT > 0 ? 0.55 : 0.32
    this.halfWidth += (targetWidth - this.halfWidth) * Math.min(1, dt * 6)

    if (this.usePointer && this.pointer) {
      const target = Math.atan2(this.pointer.y - CY, this.pointer.x - CX)
      const d = wrap(target - this.paddle)
      this.paddle += Math.sign(d) * Math.min(Math.abs(d), 9 * dt)
    } else {
      const k = this.keyDir()
      this.paddle += (k.x || -k.y) * 3.6 * dt
    }

    for (const b of this.bricks) b.hitT = Math.max(0, b.hitT - dt)

    for (const ball of this.balls) {
      if (ball.stuck) {
        ball.x = CX + Math.cos(this.paddle) * (PR - 16)
        ball.y = CY + Math.sin(this.paddle) * (PR - 16)
        continue
      }
      const sp = Math.hypot(ball.vx, ball.vy)
      const steps = Math.ceil((sp * dt) / 4)
      for (let s = 0; s < steps; s++) this.stepBall(ball, dt / steps)
      ball.trail.push({ x: ball.x, y: ball.y })
      if (ball.trail.length > 12) ball.trail.shift()
    }
    const before = this.balls.length
    this.balls = this.balls.filter((b) => b.stuck || Math.hypot(b.x - CX, b.y - CY) < PR + 40)
    if (before > 0 && this.balls.length === 0) {
      this.lives--
      this.livesLost++
      sfx.hurt()
      this.fx.shake(10)
      this.fx.flash('#E82020', 0.3)
      if (this.lives <= 0) {
        this.finish({ win: false, stars: 0 })
        return
      }
      this.say('Шар потерян в темноте...')
      this.spawnStuck()
    }

    for (const d of this.drops) d.r += 110 * dt
    this.drops = this.drops.filter((d) => {
      if (d.r >= PR - 10 && d.r <= PR + 10 && Math.abs(wrap(d.a - this.paddle)) < this.halfWidth + 0.05) {
        this.applyDrop(d)
        return false
      }
      return d.r < PR + 30
    })
  }

  applyDrop(d: Drop) {
    sfx.pickup()
    const p = { x: CX + Math.cos(d.a) * PR, y: CY + Math.sin(d.a) * PR }
    this.fx.burst(p, C.goldLight, 16, 140)
    if (d.kind === 'wide') {
      this.wideT = 10
      this.fx.text(p, 'ШИРЕ', C.goldLight)
    } else if (d.kind === 'slow') {
      for (const b of this.balls) {
        b.vx *= 0.75
        b.vy *= 0.75
      }
      this.fx.text(p, 'ТИШЕ', C.parchment)
    } else {
      const extra: Ball[] = []
      for (const b of this.balls) {
        if (b.stuck || this.balls.length + extra.length >= 5) continue
        const a = Math.atan2(b.vy, b.vx) + 0.5
        const sp = Math.hypot(b.vx, b.vy)
        extra.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, stuck: false, trail: [] })
      }
      this.balls.push(...extra)
      this.fx.text(p, 'ВОЛНЫ x2', C.goldLight)
    }
  }

  stepBall(ball: Ball, dt: number) {
    const px = ball.x
    const py = ball.y
    const pr = Math.hypot(px - CX, py - CY)
    ball.x += ball.vx * dt
    ball.y += ball.vy * dt
    const dx = ball.x - CX
    const dy = ball.y - CY
    const r = Math.hypot(dx, dy) || 1
    const nx = dx / r
    const ny = dy / r
    const vr = ball.vx * nx + ball.vy * ny
    const a = Math.atan2(dy, dx)

    const reflectRadial = () => {
      ball.vx -= 2 * vr * nx
      ball.vy -= 2 * vr * ny
    }

    if (r < SUN_R + BALL_R && vr < 0) {
      reflectRadial()
      this.hitSun(ball)
      return
    }

    for (let i = 0; i < RINGS.length; i++) {
      const ring = RINGS[i]!
      if (r < ring.r0 - BALL_R || r > ring.r1 + BALL_R) continue
      const step = TAU / ring.n
      const rel = (((a - this.rot[i]!) % TAU) + TAU) % TAU
      const idx = Math.floor(rel / step)
      const brick = this.bricks.find((b) => b.ring === i && b.idx === idx && b.hp > 0)
      if (!brick) continue
      const wasOutside = pr < ring.r0 - BALL_R || pr > ring.r1 + BALL_R
      if (wasOutside) reflectRadial()
      else {
        const tx = -ny
        const ty = nx
        const vt = ball.vx * tx + ball.vy * ty
        ball.vx -= 2 * vt * tx
        ball.vy -= 2 * vt * ty
      }
      ball.x = px
      ball.y = py
      this.hitBrick(brick, ball)
      return
    }

    if (vr > 0 && r > PR - 8 && r < PR + 8) {
      const d = wrap(a - this.paddle)
      if (Math.abs(d) < this.halfWidth + 0.04) {
        this.speed = Math.min(540, this.speed + 6)
        const out = a + Math.PI + (d / this.halfWidth) * 0.85
        ball.vx = Math.cos(out) * this.speed
        ball.vy = Math.sin(out) * this.speed
        ball.x = CX + nx * (PR - 9)
        ball.y = CY + ny * (PR - 9)
        sfx.bounce()
        this.fx.burst(ball, C.goldLight, 6, 80)
      }
    }
  }

  hitBrick(brick: Brick, ball: Ball) {
    brick.hp--
    brick.hitT = 0.15
    sfx.hit()
    if (brick.hp <= 0) {
      sfx.crack()
      this.score += 10 * (brick.ring + 1)
      this.fx.burst(ball, C.grayLight, 18, 160, { glow: false, gravity: 0 })
      this.fx.burst(ball, C.goldLight, 8, 120)
      this.fx.shake(3)
      this.fx.text(ball, `+${10 * (brick.ring + 1)}`, C.parchment, 14)
      if (Math.random() < 0.16) {
        const a = Math.atan2(ball.y - CY, ball.x - CX)
        this.drops.push({ a, r: Math.hypot(ball.x - CX, ball.y - CY), kind: pick(['multi', 'wide', 'slow'] as const) })
      }
    }
  }

  hitSun(ball: Ball) {
    this.sunHits++
    this.sunPulse = 1
    this.score += 200
    this.fx.hitStop(0.12)
    this.fx.shake(14)
    this.fx.burst(ball, '#fff3d0', 50, 300)
    this.reveal({ x: CX, y: CY })
    if (this.sunHits >= 3) {
      if (this.livesLost === 0) this.achieve('shell_clean')
      this.finish({ win: true, stars: this.livesLost === 0 ? 3 : this.livesLost === 1 ? 2 : 1 })
    } else this.say(`Свет пробивается! ${this.sunHits}/3`)
  }

  override draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = C.black
    ctx.fillRect(-20, -20, W + 40, H + 40)
    this.stars.draw(ctx, this.time, this.time * 3, 0)

    const intensity = 0.55 + this.sunHits * 0.15 + this.sunPulse * 0.4
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    glowCircle(ctx, CX, CY, 300, '255,230,170', 0.35 * intensity)
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU + this.time * 0.05
      ctx.strokeStyle = `rgba(255,236,190,${0.08 * intensity})`
      ctx.lineWidth = 10
      ctx.beginPath()
      ctx.moveTo(CX, CY)
      ctx.lineTo(CX + Math.cos(a) * 320, CY + Math.sin(a) * 320)
      ctx.stroke()
    }
    ctx.restore()
    glowCircle(ctx, CX, CY, SUN_R * 2, '255,250,230', 0.9)
    ctx.fillStyle = '#fffaf0'
    ctx.beginPath()
    ctx.arc(CX, CY, SUN_R * (0.8 + this.sunPulse * 0.2), 0, TAU)
    ctx.fill()

    for (const b of this.bricks) {
      if (b.hp <= 0) continue
      const { a0, a1, ring } = this.brickAngles(b)
      ctx.beginPath()
      ctx.arc(CX, CY, ring.r1, a0, a1)
      ctx.arc(CX, CY, ring.r0, a1, a0, true)
      ctx.closePath()
      const shade = b.hp < b.max ? 38 : 52 - b.ring * 4
      ctx.fillStyle = b.hitT > 0 ? '#DBD2C1' : `hsl(30, 6%, ${shade}%)`
      ctx.fill()
      ctx.strokeStyle = 'rgba(146,98,35,0.9)'
      ctx.lineWidth = 1
      ctx.stroke()
      if (b.hp < b.max) {
        const m = (a0 + a1) / 2
        ctx.strokeStyle = '#111'
        ctx.beginPath()
        ctx.moveTo(CX + Math.cos(m - 0.05) * ring.r0, CY + Math.sin(m - 0.05) * ring.r0)
        ctx.lineTo(CX + Math.cos(m + 0.03) * (ring.r0 + 12), CY + Math.sin(m + 0.03) * (ring.r0 + 12))
        ctx.lineTo(CX + Math.cos(m - 0.02) * ring.r1, CY + Math.sin(m - 0.02) * ring.r1)
        ctx.stroke()
      }
    }

    ctx.strokeStyle = 'rgba(219,210,193,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(CX, CY, PR, 0, TAU)
    ctx.stroke()
    ctx.save()
    ctx.shadowColor = C.goldLight
    ctx.shadowBlur = 18
    ctx.strokeStyle = C.goldLight
    ctx.lineWidth = 10
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(CX, CY, PR, this.paddle - this.halfWidth, this.paddle + this.halfWidth)
    ctx.stroke()
    ctx.restore()

    for (const d of this.drops) {
      const x = CX + Math.cos(d.a) * d.r
      const y = CY + Math.sin(d.a) * d.r
      glowCircle(ctx, x, y, 18, '200,150,74', 0.6)
      drawBolt(ctx, x, y, 9, C.parchment)
    }

    for (const b of this.balls) {
      b.trail.forEach((t, i) => {
        ctx.globalAlpha = (i / b.trail.length) * 0.4
        ctx.fillStyle = C.goldLight
        ctx.beginPath()
        ctx.arc(t.x, t.y, BALL_R * (i / b.trail.length), 0, TAU)
        ctx.fill()
      })
      ctx.globalAlpha = 1
      glowCircle(ctx, b.x, b.y, 18, '255,240,210', 0.7)
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(b.x, b.y, BALL_R, 0, TAU)
      ctx.fill()
    }
  }

  override hud(): ModeHud {
    return {
      ...this.hudBase(),
      progress: this.sunHits / 3,
      progressLabel: `Светило ${this.sunHits}/3`,
      lives: this.lives,
      maxLives: 3,
      hint: this.balls.some((b) => b.stuck) ? 'Клик или пробел — запустить шар' : 'Мышь / стрелки — двигать дугу',
    }
  }
}
