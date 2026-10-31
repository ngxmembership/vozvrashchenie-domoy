import { BaseMode } from '../core/base'
import { glowCircle } from '../core/fx'
import { sfx } from '../core/sound'
import { C, H, W, rand, type ModeHud, type ModeOptions, type Vec } from '../core/types'

const TIME = 60
const LENS = 95
const PROPS = 7

type Kind = 'sun' | 'moon' | 'mountain' | 'tree' | 'cloud' | 'bird'
type Obj = Vec & { kind: Kind; s: number; prop: boolean; found: boolean; vx: number; depth: number; seed: number }

const HIT: Record<Kind, number> = { sun: 50, moon: 38, mountain: 90, tree: 38, cloud: 55, bird: 26 }

export class SceneryMode extends BaseMode {
  objs: Obj[] = []
  timeLeft = TIME
  found = 0
  mistakes = 0
  lens: Vec = { x: W / 2, y: H / 2 }

  constructor(opts: ModeOptions) {
    super(opts)
    const add = (kind: Kind, x: number, y: number, s: number, depth: number, vx = 0) =>
      this.objs.push({ kind, x, y, s, prop: false, found: false, vx, depth, seed: rand(0, 6) })
    add('sun', rand(640, 840), rand(110, 170), 1, 0.01)
    add('moon', rand(120, 300), rand(90, 150), 1, 0.01)
    for (let i = 0; i < 4; i++) add('cloud', rand(0, W), rand(70, 220), rand(0.8, 1.3), 0.02, rand(8, 18))
    add('mountain', 190, 420, rand(0.9, 1.1), 0.03)
    add('mountain', 480, 420, rand(1.1, 1.3), 0.03)
    add('mountain', 790, 420, rand(0.9, 1.1), 0.03)
    for (let i = 0; i < 6; i++) add('tree', 70 + i * 165 + rand(-30, 30), rand(470, 540), rand(0.8, 1.2), 0.07)
    for (let i = 0; i < 3; i++) add('bird', rand(0, W), rand(200, 300), 1, 0.04, rand(30, 60))
    const shuffled = [...this.objs].sort(() => Math.random() - 0.5)
    shuffled.slice(0, PROPS).forEach((o) => (o.prop = true))
    this.say('Найдите декорации. Линза показывает изнанку мира.')
  }

  pos(o: Obj): Vec {
    const ox = (this.lens.x - W / 2) * o.depth
    const oy = (this.lens.y - H / 2) * o.depth
    return { x: o.x - ox, y: o.y - oy }
  }

  override onPointerMove(p: Vec) {
    this.lens = p
  }

  override onPointerDown(p: Vec) {
    this.lens = p
    let best: Obj | null = null
    let bestD = Infinity
    for (const o of this.objs) {
      const q = this.pos(o)
      const r = HIT[o.kind] * o.s
      const d = Math.hypot(q.x - p.x, q.y - (o.kind === 'mountain' ? p.y + 80 : o.kind === 'tree' ? p.y + 40 : p.y)) / r
      if (d < 1 && d < bestD && !o.found) {
        best = o
        bestD = d
      }
    }
    if (!best) return
    if (best.prop) {
      best.found = true
      this.found++
      const gained = 100 + Math.round(this.timeLeft * 3)
      this.score += gained
      this.fx.text(p, `Декорация! +${gained}`, C.goldLight, 20)
      this.fx.burst(p, C.goldLight, 30, 200)
      this.fx.shake(5)
      sfx.crack()
      if (this.found === 2 || this.found === 4 || this.found === PROPS) this.reveal(p)
      if (this.found >= PROPS) {
        if (this.mistakes === 0) this.achieve('seer')
        const stars = this.mistakes === 0 && this.timeLeft >= 15 ? 3 : this.mistakes <= 2 ? 2 : 1
        this.score += Math.round(this.timeLeft * 15)
        this.finish({ win: true, stars })
      }
    } else {
      this.mistakes++
      this.timeLeft -= 4
      this.fx.text(p, 'Это настоящее... −4 с', C.red)
      this.fx.shake(6)
      sfx.wrong()
    }
  }

  override update(dt: number) {
    this.timeLeft -= dt
    if (this.timeLeft <= 0) {
      this.timeLeft = 0
      this.finish({ win: false, stars: 0 })
      return
    }
    for (const o of this.objs) {
      if (o.vx) {
        o.x += o.vx * dt
        if (o.x > W + 80) o.x = -80
      }
      if (o.kind === 'bird') o.y += Math.sin(this.time * 2 + o.seed) * 0.3
    }
  }

  drawObj(ctx: CanvasRenderingContext2D, o: Obj, wire: boolean) {
    const p = this.pos(o)
    const s = o.s
    const blue = 'rgba(127,167,201,0.75)'
    ctx.save()
    ctx.translate(p.x, p.y)
    const flat = wire && o.prop
    if (flat) {
      ctx.strokeStyle = '#8a6a3a'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, o.kind === 'tree' || o.kind === 'mountain' ? 50 : 130)
      ctx.stroke()
      ctx.setLineDash([6, 4])
    }
    ctx.strokeStyle = flat ? C.goldLight : blue
    ctx.lineWidth = flat ? 2.5 : 1.5
    switch (o.kind) {
      case 'sun':
        if (!wire) {
          glowCircle(ctx, 0, 0, 110, '255,200,120', 0.35)
          ctx.fillStyle = '#ffd27a'
          ctx.beginPath()
          ctx.arc(0, 0, 40 * s, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, 40 * s, 0, Math.PI * 2)
          ctx.stroke()
        }
        break
      case 'moon':
        if (!wire) {
          glowCircle(ctx, 0, 0, 70, '230,225,210', 0.2)
          ctx.fillStyle = '#e8e2d0'
          ctx.beginPath()
          ctx.arc(0, 0, 28 * s, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = 'rgba(0,0,0,0.12)'
          for (const [x, y, r] of [[-8, -6, 6], [9, 4, 4], [-2, 10, 3]]) {
            ctx.beginPath()
            ctx.arc(x!, y!, r!, 0, Math.PI * 2)
            ctx.fill()
          }
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, 28 * s, 0, Math.PI * 2)
          ctx.stroke()
        }
        break
      case 'cloud': {
        const blobs = [[-30, 0, 20], [-8, -10, 26], [18, -2, 22], [36, 6, 14]]
        ctx.fillStyle = 'rgba(219,210,193,0.18)'
        for (const [x, y, r] of blobs) {
          ctx.beginPath()
          ctx.arc(x! * s, y! * s, r! * s, 0, Math.PI * 2)
          if (wire) ctx.stroke()
          else ctx.fill()
        }
        break
      }
      case 'mountain': {
        ctx.beginPath()
        ctx.moveTo(-180 * s, 0)
        ctx.lineTo(-20 * s, -190 * s)
        ctx.lineTo(10 * s, -170 * s)
        ctx.lineTo(180 * s, 0)
        ctx.closePath()
        if (wire) ctx.stroke()
        else {
          const g = ctx.createLinearGradient(0, -190 * s, 0, 0)
          g.addColorStop(0, '#2c2722')
          g.addColorStop(1, '#121110')
          ctx.fillStyle = g
          ctx.fill()
          ctx.fillStyle = 'rgba(219,210,193,0.7)'
          ctx.beginPath()
          ctx.moveTo(-20 * s, -190 * s)
          ctx.lineTo(-48 * s, -156 * s)
          ctx.lineTo(-10 * s, -165 * s)
          ctx.lineTo(10 * s, -170 * s)
          ctx.lineTo(32 * s, -150 * s)
          ctx.closePath()
          ctx.fill()
        }
        break
      }
      case 'tree': {
        ctx.fillStyle = '#141a12'
        for (let i = 0; i < 3; i++) {
          ctx.beginPath()
          ctx.moveTo(0, (-90 + i * 22) * s)
          ctx.lineTo(28 * s, (-40 + i * 22) * s)
          ctx.lineTo(-28 * s, (-40 + i * 22) * s)
          ctx.closePath()
          if (wire) ctx.stroke()
          else ctx.fill()
        }
        if (!wire) {
          ctx.fillStyle = '#2a1d12'
          ctx.fillRect(-4 * s, 4 * s, 8 * s, 18 * s)
        }
        break
      }
      case 'bird': {
        if (!wire) ctx.strokeStyle = '#d8cfbe'
        ctx.lineWidth = 2
        ctx.beginPath()
        const f = Math.sin(this.time * 8 + o.seed) * 5
        ctx.moveTo(-12, f)
        ctx.quadraticCurveTo(-5, -4, 0, 0)
        ctx.quadraticCurveTo(5, -4, 12, f)
        ctx.stroke()
        break
      }
    }
    ctx.setLineDash([])
    if (o.found) {
      ctx.strokeStyle = C.red
      ctx.lineWidth = 3
      const r = Math.min(HIT[o.kind] * 0.5, 30)
      const oy = o.kind === 'mountain' ? -80 : o.kind === 'tree' ? -40 : 0
      ctx.beginPath()
      ctx.moveTo(-r, oy - r)
      ctx.lineTo(r, oy + r)
      ctx.moveTo(r, oy - r)
      ctx.lineTo(-r, oy + r)
      ctx.stroke()
    }
    ctx.restore()
  }

  drawWorld(ctx: CanvasRenderingContext2D, wire: boolean) {
    if (wire) {
      ctx.fillStyle = '#08121d'
      ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = 'rgba(127,167,201,0.13)'
      ctx.lineWidth = 1
      for (let x = 0; x < W; x += 24) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
      for (let y = 0; y < H; y += 24) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, '#070a12')
      g.addColorStop(0.65, '#2b2116')
      g.addColorStop(1, '#0d0b09')
      ctx.fillStyle = g
      ctx.fillRect(-20, -20, W + 40, H + 40)
    }
    const order: Kind[] = ['sun', 'moon', 'cloud', 'bird', 'mountain', 'tree']
    for (const k of order) for (const o of this.objs) if (o.kind === k) this.drawObj(ctx, o, wire)
    if (!wire) {
      ctx.fillStyle = '#0b0a08'
      ctx.fillRect(-20, 520 - (this.lens.y - H / 2) * 0.07, W + 40, 120)
    }
  }

  override draw(ctx: CanvasRenderingContext2D) {
    this.drawWorld(ctx, false)
    ctx.save()
    ctx.beginPath()
    ctx.arc(this.lens.x, this.lens.y, LENS, 0, Math.PI * 2)
    ctx.clip()
    this.drawWorld(ctx, true)
    ctx.restore()
    ctx.save()
    ctx.shadowColor = C.goldLight
    ctx.shadowBlur = 16
    ctx.strokeStyle = C.goldLight
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(this.lens.x, this.lens.y, LENS, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
    ctx.strokeStyle = 'rgba(219,210,193,0.4)'
    ctx.beginPath()
    ctx.moveTo(this.lens.x - 8, this.lens.y)
    ctx.lineTo(this.lens.x + 8, this.lens.y)
    ctx.moveTo(this.lens.x, this.lens.y - 8)
    ctx.lineTo(this.lens.x, this.lens.y + 8)
    ctx.stroke()
  }

  override hud(): ModeHud {
    return {
      ...this.hudBase(),
      progress: this.found / PROPS,
      progressLabel: `Декорации ${this.found}/${PROPS}`,
      timeLeft: this.timeLeft,
      hint: `Ошибок: ${this.mistakes}  ·  кликните по декорации внутри линзы`,
    }
  }
}
