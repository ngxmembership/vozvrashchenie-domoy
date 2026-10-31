import { BaseMode } from '../core/base'
import { drawBolt, glowCircle } from '../core/fx'
import { sfx } from '../core/sound'
import { C, H, W, clamp, dist, pick, rand, type ModeHud, type ModeOptions, type Vec } from '../core/types'

const GOAL_M = 1000
const PY = 170
type Kind = 'clock' | 'card' | 'cup' | 'hook' | 'bar' | 'spark'
type Ob = Vec & { kind: Kind; r: number; rot: number; vr: number; gapX: number; gapW: number; hit: boolean }

export class RabbitMode extends BaseMode {
  px = W / 2
  vx = 0
  depth = 0
  speed = 220
  obs: Ob[] = []
  spawnT = 0
  lives = 3
  livesLost = 0
  invuln = 0
  combo = 0
  trail: Vec[] = []
  milestones: number[]

  constructor(opts: ModeOptions) {
    super(opts)
    this.milestones = opts.endless ? [300, 900, 1600] : [250, 550, 850]
    this.say(opts.endless ? 'Бесконечная нора. Как глубоко вы упадёте?' : 'Падение в кроличью нору. Долетите до занавеса!')
  }

  get metres() {
    return Math.floor(this.depth / 10)
  }

  margin(yScreen: number, side: number) {
    const y = yScreen + this.depth
    const narrow = Math.min(90, this.depth / 300)
    return 110 + narrow + Math.sin(y * 0.0035 + side * 2) * 55 + Math.sin(y * 0.011 + side) * 22
  }

  spawn() {
    const m = this.metres
    const l = this.margin(H + 40, 0)
    const r = W - this.margin(H + 40, 1)
    const base = { y: H + 50, rot: rand(0, 6), vr: rand(-3, 3), gapX: 0, gapW: 0, hit: false }
    const roll = Math.random()
    if (m > 120 && roll < 0.18) {
      const gapW = Math.max(120, 200 - m / 12)
      this.obs.push({ ...base, kind: 'bar', x: 0, r: 12, gapX: rand(l + gapW / 2 + 10, r - gapW / 2 - 10), gapW })
      return
    }
    if (roll < 0.45) {
      const x0 = rand(l + 40, r - 40)
      for (let i = 0; i < 5; i++) this.obs.push({ ...base, kind: 'spark', x: x0 + Math.sin(i * 0.8) * 40, y: H + 50 + i * 34, r: 12 })
      return
    }
    const kind = pick(['clock', 'card', 'cup', 'hook'] as const)
    this.obs.push({ ...base, kind, x: rand(l + 30, r - 30), r: kind === 'hook' ? 20 : kind === 'clock' ? 26 : 22 })
  }

  override update(dt: number) {
    this.invuln = Math.max(0, this.invuln - dt)
    this.speed = 220 + Math.min(380, this.depth * 0.025)
    this.depth += this.speed * dt

    const k = this.keyDir()
    let ax = k.x * 2200
    if (!k.x && this.pointer && this.pointerDown) ax = clamp((this.pointer.x - this.px) * 25, -2600, 2600)
    this.vx += ax * dt
    this.vx *= Math.pow(0.08, dt)
    this.px += this.vx * dt
    const l = this.margin(PY, 0) + 12
    const r = W - this.margin(PY, 1) - 12
    if (this.px < l) {
      this.px = l
      this.vx = Math.abs(this.vx) * 0.6
      this.fx.burst({ x: this.px, y: PY }, C.goldLight, 5, 80)
    }
    if (this.px > r) {
      this.px = r
      this.vx = -Math.abs(this.vx) * 0.6
      this.fx.burst({ x: this.px, y: PY }, C.goldLight, 5, 80)
    }
    this.trail.push({ x: this.px, y: PY })
    if (this.trail.length > 16) this.trail.shift()
    for (const t of this.trail) t.y -= this.speed * dt

    this.spawnT -= dt
    if (this.spawnT <= 0) {
      this.spawn()
      this.spawnT = Math.max(0.35, 0.95 - this.metres / 1500)
    }

    const me = { x: this.px, y: PY }
    for (const o of this.obs) {
      o.y -= this.speed * dt
      o.rot += o.vr * dt
      if (o.hit) continue
      if (o.kind === 'spark') {
        if (dist(o, me) < 22) {
          o.hit = true
          this.combo++
          this.score += 10 * Math.min(10, this.combo)
          sfx.pickup()
          this.fx.burst(o, C.goldLight, 8, 90)
          if (this.combo % 5 === 0) this.fx.text(o, `x${Math.min(10, this.combo)}`, C.goldLight)
        }
        continue
      }
      const hit = o.kind === 'bar' ? Math.abs(o.y - PY) < 14 && Math.abs(this.px - o.gapX) > o.gapW / 2 - 8 : dist(o, me) < o.r + 8
      if (hit && this.invuln <= 0) {
        o.hit = true
        this.lives--
        this.livesLost++
        this.combo = 0
        this.invuln = 1.5
        this.fx.shake(12)
        this.fx.hitStop(0.1)
        this.fx.flash('#E82020', 0.35)
        this.fx.burst(me, C.red, 24, 200)
        sfx.hurt()
        if (this.lives <= 0) {
          if (this.endless && this.metres >= 2000) this.achieve('deep')
          this.finish({ win: this.endless, stars: 0, distance: this.metres, score: Math.round(this.score + this.metres) })
          return
        }
        this.say('Удар! Держитесь середины норы.')
      }
    }
    this.obs = this.obs.filter((o) => o.y > -80 && !(o.kind === 'spark' && o.hit))

    while (this.milestones.length && this.metres >= this.milestones[0]!) {
      this.milestones.shift()
      this.reveal(me)
    }
    if (this.endless && this.metres >= 2000) this.achieve('deep')
    if (!this.endless && this.metres >= GOAL_M) {
      this.score += this.metres + this.lives * 200
      this.finish({ win: true, stars: this.livesLost === 0 ? 3 : this.livesLost === 1 ? 2 : 1, distance: this.metres })
    }
  }

  override draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#070605'
    ctx.fillRect(-20, -20, W + 40, H + 40)
    ctx.save()
    const cx = W / 2 + (this.px - W / 2) * -0.15
    const cy = H * 0.8
    for (let i = 0; i < 14; i++) {
      const z = (i * 70 - ((this.depth * 0.6) % 70) + 70 * 14) % (70 * 14)
      const s = 1 - z / (70 * 14)
      const rr = 20 + Math.pow(s, 3) * 900
      ctx.strokeStyle = `rgba(146,98,35,${0.05 + s * 0.15})`
      ctx.lineWidth = 1 + s * 3
      ctx.beginPath()
      ctx.ellipse(cx, cy, rr, rr * 0.7, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    glowCircle(ctx, cx, cy, 120, '255,236,190', 0.12)
    ctx.restore()

    ctx.strokeStyle = 'rgba(219,210,193,0.08)'
    ctx.lineWidth = 1
    for (let i = 0; i < 20; i++) {
      const x = (i * 97 + this.depth * 0.3) % W
      const y = H - ((this.depth * (1 + (i % 3)) + i * 140) % (H + 200)) + 100
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + 40 + (i % 3) * 30)
      ctx.stroke()
    }

    for (const side of [0, 1]) {
      ctx.beginPath()
      ctx.moveTo(side === 0 ? -20 : W + 20, -20)
      for (let y = -20; y <= H + 20; y += 20) {
        const m = this.margin(y, side)
        ctx.lineTo(side === 0 ? m : W - m, y)
      }
      ctx.lineTo(side === 0 ? -20 : W + 20, H + 20)
      ctx.closePath()
      const g = ctx.createLinearGradient(side === 0 ? 0 : W, 0, side === 0 ? 200 : W - 200, 0)
      g.addColorStop(0, '#0d0a07')
      g.addColorStop(1, '#2a1f15')
      ctx.fillStyle = g
      ctx.fill()
      ctx.strokeStyle = 'rgba(200,150,74,0.5)'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    for (const o of this.obs) this.drawOb(ctx, o)

    this.trail.forEach((t, i) => {
      ctx.globalAlpha = (i / this.trail.length) * 0.4
      ctx.fillStyle = C.goldLight
      ctx.beginPath()
      ctx.arc(t.x, t.y, 2 + (i / this.trail.length) * 5, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = this.invuln > 0 && Math.floor(this.time * 14) % 2 === 0 ? 0.3 : 1
    glowCircle(ctx, this.px, PY, 28, '255,240,210', 0.9)
    ctx.fillStyle = '#fff8e6'
    ctx.beginPath()
    ctx.arc(this.px, PY, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    if (!this.endless) {
      const t = clamp((this.metres - 940) / 60, 0, 1)
      if (t > 0) {
        for (const side of [0, 1]) {
          const w = (W / 2) * t
          const x = side === 0 ? 0 : W - w
          const g = ctx.createLinearGradient(x, 0, x + w, 0)
          g.addColorStop(0, '#5a0c0c')
          g.addColorStop(0.5, '#a51616')
          g.addColorStop(1, '#5a0c0c')
          ctx.fillStyle = g
          ctx.fillRect(x, 0, w, H)
        }
      }
    }
  }

  drawOb(ctx: CanvasRenderingContext2D, o: Ob) {
    if (o.kind === 'bar') {
      const l = this.margin(o.y, 0)
      const r = W - this.margin(o.y, 1)
      ctx.fillStyle = '#8f1414'
      ctx.fillRect(l, o.y - 10, o.gapX - o.gapW / 2 - l, 20)
      ctx.fillRect(o.gapX + o.gapW / 2, o.y - 10, r - (o.gapX + o.gapW / 2), 20)
      ctx.fillStyle = C.goldLight
      ctx.fillRect(l, o.y - 12, o.gapX - o.gapW / 2 - l, 3)
      ctx.fillRect(o.gapX + o.gapW / 2, o.y - 12, r - (o.gapX + o.gapW / 2), 3)
      return
    }
    ctx.save()
    ctx.translate(o.x, o.y)
    ctx.globalAlpha = o.hit ? 0.3 : 1
    switch (o.kind) {
      case 'spark':
        glowCircle(ctx, 0, 0, 18, '200,150,74', 0.6)
        drawBolt(ctx, 0, 0, 8, C.parchment)
        break
      case 'clock':
        ctx.fillStyle = '#d9cdb3'
        ctx.strokeStyle = C.gold
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(0, 0, o.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.strokeStyle = '#111'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(Math.cos(o.rot * 3) * 16, Math.sin(o.rot * 3) * 16)
        ctx.moveTo(0, 0)
        ctx.lineTo(Math.cos(o.rot * 0.5) * 10, Math.sin(o.rot * 0.5) * 10)
        ctx.stroke()
        break
      case 'card':
        ctx.rotate(o.rot)
        ctx.fillStyle = '#efe7d6'
        ctx.fillRect(-15, -22, 30, 44)
        ctx.strokeStyle = C.gold
        ctx.strokeRect(-15, -22, 30, 44)
        ctx.fillStyle = C.red
        ctx.font = '18px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('♥', 0, 0)
        break
      case 'cup':
        ctx.rotate(o.rot)
        ctx.fillStyle = '#cfc6b4'
        ctx.beginPath()
        ctx.moveTo(-16, -12)
        ctx.lineTo(16, -12)
        ctx.lineTo(11, 14)
        ctx.lineTo(-11, 14)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = '#cfc6b4'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(18, 0, 7, -Math.PI / 2, Math.PI / 2)
        ctx.stroke()
        break
      case 'hook':
        ctx.rotate(Math.sin(o.rot) * 0.7)
        glowCircle(ctx, 0, 0, 30, '232,32,32', 0.3)
        ctx.strokeStyle = '#c9c4bb'
        ctx.lineWidth = 4
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(0, -60)
        ctx.lineTo(0, 6)
        ctx.arc(-8, 6, 8, 0, Math.PI)
        ctx.stroke()
        break
    }
    ctx.restore()
  }

  override hud(): ModeHud {
    return {
      ...this.hudBase(),
      progress: this.endless ? 0 : Math.min(1, this.metres / GOAL_M),
      progressLabel: this.endless ? `${this.metres} м` : `${this.metres} / ${GOAL_M} м`,
      lives: this.lives,
      maxLives: 3,
      hint: `Серия искр: ${this.combo}  ·  стрелки / A-D или зажмите мышь`,
    }
  }
}
