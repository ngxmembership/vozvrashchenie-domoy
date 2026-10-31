import { BaseMode } from '../core/base'
import { glowCircle } from '../core/fx'
import { sfx } from '../core/sound'
import { C, H, W, clamp, dist, rand, type ModeHud, type ModeOptions, type Vec } from '../core/types'

const N = 380
const RUNES_TO_WIN = 3
const TIME = 90

type P = Vec & { vx: number; vy: number; locked: boolean; tx: number; ty: number; tone: number }
type RunePoint = Vec & { filled: boolean }
type Rune = { name: string; pts: RunePoint[]; done: number; cx: number; cy: number }

function sample(lines: [number, number][][], scale: number, cx: number, cy: number, spacing = 12): RunePoint[] {
  const out: RunePoint[] = []
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      const [ax, ay] = line[i - 1]!
      const [bx, by] = line[i]!
      const len = Math.hypot(bx - ax, by - ay) * scale
      const n = Math.max(1, Math.round(len / spacing))
      for (let k = 0; k < n; k++) {
        const t = k / n
        out.push({ x: cx + (ax + (bx - ax) * t) * scale, y: cy + (ay + (by - ay) * t) * scale, filled: false })
      }
    }
  }
  return out
}

const circle = (): [number, number][] =>
  Array.from({ length: 33 }, (_, i) => [Math.cos((i / 32) * Math.PI * 2), Math.sin((i / 32) * Math.PI * 2)] as [number, number])

const SHAPES: { name: string; lines: [number, number][][] }[] = [
  { name: 'Круг', lines: [circle()] },
  { name: 'Штатив', lines: [[[0, -1], [-0.9, 0.8], [0.9, 0.8], [0, -1]], [[0, -1], [0, 0.8]]] },
  { name: 'Молния ϟ', lines: [[[0.35, -1], [-0.4, 0.05], [0.4, 0.05], [-0.35, 1]]] },
  {
    name: 'Око',
    lines: [
      [[-1, 0], [-0.5, -0.5], [0.5, -0.5], [1, 0], [0.5, 0.5], [-0.5, 0.5], [-1, 0]],
      circle().map(([x, y]) => [x * 0.28, y * 0.28] as [number, number]),
    ],
  },
  { name: 'Дверь', lines: [[[-0.6, 1], [-0.6, -0.3], [-0.42, -0.75], [0, -0.95], [0.42, -0.75], [0.6, -0.3], [0.6, 1], [-0.6, 1]]] },
]

export class MagicMode extends BaseMode {
  ps: P[] = []
  rune: Rune | null = null
  runesDone = 0
  order = [...SHAPES].sort(() => Math.random() - 0.5)
  hole = { x: W / 2, y: H / 2, r: 26 }
  focus: Vec = { x: W / 2, y: H / 2 }
  timeLeft = TIME
  lost = 0
  spawnT = 0
  releaseT = 0

  constructor(opts: ModeOptions) {
    super(opts)
    for (let i = 0; i < N; i++) this.addParticle(rand(0, W), rand(0, H))
    this.nextRune()
    this.say('Соберите энергию мыслью и уплотните её в руну')
  }

  addParticle(x: number, y: number) {
    this.ps.push({ x, y, vx: rand(-20, 20), vy: rand(-20, 20), locked: false, tx: 0, ty: 0, tone: Math.random() })
  }

  nextRune() {
    const shape = this.order[this.runesDone % this.order.length]!
    const cx = rand(220, W - 220)
    const cy = rand(170, H - 170)
    this.rune = { name: shape.name, pts: sample(shape.lines, 95, cx, cy), done: 0, cx, cy }
  }

  active(): boolean {
    const k = this.keyDir()
    return this.pointerDown || k.x !== 0 || k.y !== 0
  }

  override update(dt: number) {
    this.timeLeft -= dt
    if (this.timeLeft <= 0) {
      this.timeLeft = 0
      this.finish({ win: false, stars: 0 })
      return
    }
    const k = this.keyDir()
    if (this.pointer && this.pointerDown) this.focus = { ...this.pointer }
    else if (k.x || k.y) {
      this.focus.x = clamp(this.focus.x + k.x * 320 * dt, 0, W)
      this.focus.y = clamp(this.focus.y + k.y * 320 * dt, 0, H)
    }
    const on = this.active()

    const t = this.time * 0.25
    this.hole.x = W / 2 + Math.sin(t * 1.3) * (W * 0.36)
    this.hole.y = H / 2 + Math.sin(t * 2.1 + 1) * (H * 0.3)

    this.spawnT += dt
    if (this.spawnT > 0.5 && this.ps.length < N) {
      this.spawnT = 0
      for (let i = 0; i < 4; i++) this.addParticle(Math.random() < 0.5 ? 0 : W, rand(0, H))
    }

    const damp = Math.pow(0.25, dt)
    const rune = this.rune
    const survivors: P[] = []
    for (const p of this.ps) {
      if (p.locked) {
        p.vx += (p.tx - p.x) * 40 * dt
        p.vy += (p.ty - p.y) * 40 * dt
        p.vx *= Math.pow(0.02, dt)
        p.vy *= Math.pow(0.02, dt)
      } else {
        const a = Math.sin(p.x * 0.008 + this.time * 0.4) * Math.cos(p.y * 0.008 - this.time * 0.3) * Math.PI * 2
        p.vx += Math.cos(a) * 30 * dt
        p.vy += Math.sin(a) * 30 * dt
        if (on) {
          const d = dist(p, this.focus) || 1
          const f = Math.min(1400, 160000 / (d + 60))
          p.vx += ((this.focus.x - p.x) / d) * f * dt - ((this.focus.y - p.y) / d) * f * 0.35 * dt
          p.vy += ((this.focus.y - p.y) / d) * f * dt + ((this.focus.x - p.x) / d) * f * 0.35 * dt
        }
        const hd = dist(p, this.hole) || 1
        if (hd < 150) {
          const f = 26000 / (hd + 10)
          p.vx += ((this.hole.x - p.x) / hd) * f * dt
          p.vy += ((this.hole.y - p.y) / hd) * f * dt
        }
        if (hd < 16) {
          this.lost++
          continue
        }
        p.vx *= damp
        p.vy *= damp
        if (rune && this.releaseT <= 0) {
          for (const rp of rune.pts) {
            if (!rp.filled && Math.abs(rp.x - p.x) < 10 && Math.abs(rp.y - p.y) < 10) {
              rp.filled = true
              rune.done++
              p.locked = true
              p.tx = rp.x
              p.ty = rp.y
              break
            }
          }
        }
      }
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (!p.locked) {
        if (p.x < -40) p.x = W + 40
        if (p.x > W + 40) p.x = -40
        if (p.y < -40) p.y = H + 40
        if (p.y > H + 40) p.y = -40
      }
      survivors.push(p)
    }
    this.ps = survivors

    if (rune && this.releaseT <= 0 && rune.done >= rune.pts.length * 0.9) {
      this.runesDone++
      this.score += 400 + Math.round(this.timeLeft * 4)
      rune.pts.forEach((rp) => (rp.filled = true))
      this.fx.shake(10)
      this.fx.hitStop(0.1)
      this.fx.text({ x: rune.cx, y: rune.cy - 120 }, `${rune.name} уплотнена!`, C.goldLight, 24)
      this.reveal({ x: rune.cx, y: rune.cy })
      this.releaseT = 1.4
      if (this.runesDone >= RUNES_TO_WIN) {
        if (this.lost < 100) this.achieve('mage')
        this.score += Math.round(this.timeLeft * 10)
        this.finish({ win: true, stars: this.timeLeft >= 40 ? 3 : this.timeLeft >= 20 ? 2 : 1 })
        return
      }
    }
    if (this.releaseT > 0) {
      this.releaseT -= dt
      if (this.releaseT <= 0) {
        for (const p of this.ps)
          if (p.locked) {
            p.locked = false
            p.vx = rand(-250, 250)
            p.vy = rand(-250, 250)
          }
        sfx.wave(false)
        this.nextRune()
      }
    }
  }

  override draw(ctx: CanvasRenderingContext2D) {
    const g = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.7)
    g.addColorStop(0, '#16111c')
    g.addColorStop(1, '#060508')
    ctx.fillStyle = g
    ctx.fillRect(-20, -20, W + 40, H + 40)

    const rune = this.rune
    if (rune) {
      if (this.releaseT > 0) glowCircle(ctx, rune.cx, rune.cy, 180, '255,230,170', 0.35 * (this.releaseT / 1.4))
      for (const rp of rune.pts) {
        ctx.fillStyle = rp.filled ? C.goldLight : 'rgba(219,210,193,0.25)'
        ctx.beginPath()
        ctx.arc(rp.x, rp.y, rp.filled ? 3 : 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = 'rgba(219,210,193,0.5)'
      ctx.font = '16px Forum, serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${rune.name} — ${Math.round((rune.done / rune.pts.length) * 100)}%`, rune.cx, rune.cy + 125)
    }

    ctx.save()
    ctx.translate(this.hole.x, this.hole.y)
    glowCircle(ctx, 0, 0, 150, '232,32,32', 0.08)
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(160,160,159,${0.35 - i * 0.1})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, 30 + i * 12, this.time * (3 - i), this.time * (3 - i) + 4)
      ctx.stroke()
    }
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(0, 0, this.hole.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = C.red
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const p of this.ps) {
      const sp = Math.min(1, Math.hypot(p.vx, p.vy) / 400)
      ctx.fillStyle = p.locked
        ? 'rgba(255,220,150,0.9)'
        : p.tone > 0.5
          ? `rgba(200,150,74,${0.5 + sp * 0.4})`
          : `rgba(219,210,193,${0.4 + sp * 0.4})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.locked ? 2.6 : 1.8, 0, Math.PI * 2)
      ctx.fill()
    }
    if (this.active()) glowCircle(ctx, this.focus.x, this.focus.y, 60, '200,150,74', 0.25)
    ctx.restore()
  }

  override hud(): ModeHud {
    return {
      ...this.hudBase(),
      progress: this.runesDone / RUNES_TO_WIN,
      progressLabel: `Руны ${this.runesDone}/${RUNES_TO_WIN}`,
      timeLeft: this.timeLeft,
      hint: `Энергия: ${this.ps.length}  ·  поглощено воронкой: ${this.lost}`,
    }
  }
}
