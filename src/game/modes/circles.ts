import { BaseMode } from '../core/base'
import { glowCircle } from '../core/fx'
import { sfx } from '../core/sound'
import { C, H, W, clamp, dist, rand, type ModeHud, type ModeOptions, type Vec } from '../core/types'

const TARGET = 15
const TIME = 70

type Thing = Vec & { vx: number; vy: number; rot: number; vr: number; s: number; kind: 'eight' | 'drop' | 'time' }
type Ring = Vec & { r: number; life: number; acc: number }

function inPoly(p: Vec, poly: Vec[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!
    const b = poly[j]!
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

export class CirclesMode extends BaseMode {
  things: Thing[] = []
  path: Vec[] = []
  rings: Ring[] = []
  caught = 0
  timeLeft = TIME
  bestAcc = 0
  lastAcc = 0
  bonusT = 6

  constructor(opts: ModeOptions) {
    super(opts)
    for (let i = 0; i < 6; i++) this.spawn('eight', true)
    for (let i = 0; i < 3; i++) this.spawn('drop', true)
    this.say('Обведите ложные бесконечности кругом')
  }

  spawn(kind: Thing['kind'], inside = false) {
    const a = rand(0, Math.PI * 2)
    const sp = kind === 'eight' ? rand(40, 80) + this.caught * 3 : rand(30, 60)
    const x = inside ? rand(80, W - 80) : Math.random() < 0.5 ? -30 : W + 30
    const y = rand(80, H - 80)
    this.things.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: rand(0, 6), vr: rand(-1, 1), s: rand(0.8, 1.2), kind })
  }

  override onPointerDown(p: Vec) {
    this.path = [p]
  }
  override onPointerMove(p: Vec) {
    if (!this.pointerDown) return
    const last = this.path[this.path.length - 1]
    if (!last || dist(last, p) > 4) this.path.push(p)
  }
  override onPointerUp() {
    this.evaluate()
    this.path = []
  }

  evaluate() {
    const pts = this.path
    if (pts.length < 14) return
    const first = pts[0]!
    const last = pts[pts.length - 1]!
    const c = pts.reduce((s, p) => ({ x: s.x + p.x / pts.length, y: s.y + p.y / pts.length }), { x: 0, y: 0 })
    const radii = pts.map((p) => dist(p, c))
    const mean = radii.reduce((s, r) => s + r, 0) / radii.length
    const std = Math.sqrt(radii.reduce((s, r) => s + (r - mean) ** 2, 0) / radii.length)
    let sweep = 0
    for (let i = 1; i < pts.length; i++) {
      const a0 = Math.atan2(pts[i - 1]!.y - c.y, pts[i - 1]!.x - c.x)
      const a1 = Math.atan2(pts[i]!.y - c.y, pts[i]!.x - c.x)
      let d = a1 - a0
      if (d > Math.PI) d -= Math.PI * 2
      if (d < -Math.PI) d += Math.PI * 2
      sweep += d
    }
    if (Math.abs(sweep) < Math.PI * 1.6 || dist(first, last) > mean * 0.9) {
      this.fx.text(c, 'Круг не замкнут', C.grayLight)
      sfx.wrong()
      return
    }
    const acc = clamp(1 - (std / mean) * 2.4, 0, 1)
    this.lastAcc = acc
    this.bestAcc = Math.max(this.bestAcc, acc)
    const pct = Math.round(acc * 100)
    if (acc < 0.6) {
      this.fx.text(c, `${pct}% — криво!`, C.red, 22)
      this.say('Кривой круг не держит. Восьмёрки выскользнули.')
      sfx.wrong()
      for (const t of this.things)
        if (t.kind === 'eight' && dist(t, c) < mean * 1.5) {
          t.vx *= 2.2
          t.vy *= 2.2
        }
      return
    }
    this.rings.push({ x: c.x, y: c.y, r: mean, life: 1, acc })
    if (acc >= 0.95) this.achieve('circle95')
    let n = 0
    let drops = 0
    let bonuses = 0
    this.things = this.things.filter((t) => {
      if (!inPoly(t, pts)) return true
      if (t.kind === 'eight') {
        n++
        this.fx.burst(t, C.goldLight, 26, 180)
        this.fx.burst(t, C.grayLight, 12, 120, { glow: false })
      } else if (t.kind === 'time') {
        bonuses++
        this.fx.burst(t, '#fff3d0', 34, 200)
        this.fx.text(t, '+5 с', C.goldLight, 26)
      } else {
        drops++
        this.fx.burst(t, C.sky, 26, 160)
      }
      return false
    })
    if (bonuses > 0) {
      this.timeLeft += 5 * bonuses
      this.bonusT = 8
      this.fx.flash('#C8964A', 0.2)
      sfx.chime()
      this.say('Песочные часы! +5 секунд')
    }
    if (drops > 0) {
      this.timeLeft -= 5 * drops
      this.fx.shake(8)
      sfx.hurt()
      this.say('Вы поймали каплю океана! −5 секунд')
      for (let i = 0; i < drops; i++) this.spawn('drop')
    }
    if (n > 0) {
      const gained = Math.round(50 * n * n * (0.5 + acc))
      this.score += gained
      this.fx.text(c, `${pct}%  +${gained}${n > 1 ? `  x${n}` : ''}`, C.goldLight, 24)
      this.fx.shake(4 + n * 2)
      sfx.pickup()
      const before = this.caught
      this.caught += n
      for (const m of [5, 10, 15]) if (before < m && this.caught >= m) this.reveal(c)
      if (this.caught >= TARGET) {
        const stars = this.timeLeft >= 25 ? 3 : this.timeLeft >= 10 ? 2 : 1
        this.score += Math.round(this.timeLeft * 20)
        this.finish({ win: true, stars })
      }
    } else {
      this.fx.text(c, `${pct}% — пусто`, C.parchment)
    }
  }

  override update(dt: number) {
    this.timeLeft -= dt
    if (this.timeLeft <= 0) {
      this.timeLeft = 0
      this.finish({ win: false, stars: 0 })
      return
    }
    const eights = this.things.filter((t) => t.kind === 'eight').length
    if (eights < Math.min(7, TARGET - this.caught + 2) && Math.random() < dt * 1.5) this.spawn('eight')
    if (!this.things.some((t) => t.kind === 'time')) {
      this.bonusT -= dt
      if (this.bonusT <= 0) {
        this.spawn('time')
        this.bonusT = 8
      }
    }

    const tip = this.pointerDown ? this.path[this.path.length - 1] : undefined
    for (const t of this.things) {
      if (tip && t.kind === 'eight') {
        const d = dist(t, tip)
        if (d < 110 && d > 0) {
          t.vx += ((t.x - tip.x) / d) * 90 * dt
          t.vy += ((t.y - tip.y) / d) * 90 * dt
        }
      }
      for (const o of this.things) {
        if (o === t) continue
        const d = dist(t, o)
        if (d < 50 && d > 0) {
          t.vx += ((t.x - o.x) / d) * 40 * dt
          t.vy += ((t.y - o.y) / d) * 40 * dt
        }
      }
      const sp = Math.hypot(t.vx, t.vy)
      const max = t.kind === 'eight' ? 150 : 80
      if (sp > max) {
        t.vx *= max / sp
        t.vy *= max / sp
      }
      t.x += t.vx * dt
      t.y += t.vy * dt
      t.rot += t.vr * dt
      if ((t.x < 30 && t.vx < 0) || (t.x > W - 30 && t.vx > 0)) t.vx *= -1
      if ((t.y < 30 && t.vy < 0) || (t.y > H - 30 && t.vy > 0)) t.vy *= -1
    }
    for (const r of this.rings) r.life -= dt * 0.8
    this.rings = this.rings.filter((r) => r.life > 0)
  }

  override draw(ctx: CanvasRenderingContext2D) {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#06090c')
    g.addColorStop(1, '#0d1418')
    ctx.fillStyle = g
    ctx.fillRect(-20, -20, W + 40, H + 40)
    ctx.save()
    ctx.strokeStyle = 'rgba(127,167,201,0.07)'
    ctx.lineWidth = 2
    for (let i = 0; i < 14; i++) {
      ctx.beginPath()
      for (let x = 0; x <= W; x += 20) {
        const y = 30 + i * 42 + Math.sin(x * 0.012 + this.time * 0.8 + i) * 10 + Math.sin(x * 0.03 - this.time + i * 2) * 4
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.restore()

    for (const r of this.rings) {
      ctx.save()
      ctx.globalAlpha = r.life
      ctx.shadowColor = C.goldLight
      ctx.shadowBlur = 20
      ctx.strokeStyle = C.goldLight
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(r.x, r.y, r.r * (1 + (1 - r.life) * 0.3), 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    for (const t of this.things) {
      ctx.save()
      ctx.translate(t.x, t.y)
      if (t.kind === 'eight') {
        glowCircle(ctx, 0, 0, 34, '232,32,32', 0.12)
        ctx.rotate(Math.sin(t.rot) * 0.4)
        ctx.font = `${Math.round(48 * t.s)}px Forum, serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = C.grayLight
        ctx.fillText('∞', 0, 0)
      } else if (t.kind === 'time') {
        const pulse = 1 + Math.sin(this.time * 4) * 0.08
        glowCircle(ctx, 0, 0, 36 * pulse, '200,150,74', 0.4)
        ctx.rotate(Math.sin(t.rot) * 0.3)
        ctx.scale(t.s * pulse, t.s * pulse)
        ctx.strokeStyle = C.goldLight
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(-10, -15)
        ctx.lineTo(10, -15)
        ctx.lineTo(-10, 15)
        ctx.lineTo(10, 15)
        ctx.closePath()
        ctx.stroke()
        ctx.fillStyle = 'rgba(219,210,193,0.85)'
        const sand = (this.time * 0.3) % 1
        ctx.beginPath()
        ctx.moveTo(-8 * (1 - sand), -13 + 13 * sand)
        ctx.lineTo(8 * (1 - sand), -13 + 13 * sand)
        ctx.lineTo(0, 0)
        ctx.closePath()
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(-8 * sand, 13)
        ctx.lineTo(8 * sand, 13)
        ctx.lineTo(0, 13 - 11 * sand)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = C.goldLight
        ctx.font = 'bold 12px Play, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('+5', 0, 30)
      } else {
        glowCircle(ctx, 0, 0, 30, '127,167,201', 0.25)
        ctx.rotate(Math.sin(t.rot) * 0.2)
        ctx.fillStyle = 'rgba(127,167,201,0.85)'
        ctx.beginPath()
        ctx.moveTo(0, -16 * t.s)
        ctx.bezierCurveTo(10 * t.s, -2 * t.s, 10 * t.s, 10 * t.s, 0, 10 * t.s)
        ctx.bezierCurveTo(-10 * t.s, 10 * t.s, -10 * t.s, -2 * t.s, 0, -16 * t.s)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.beginPath()
        ctx.arc(-3 * t.s, 2 * t.s, 2.5 * t.s, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    if (this.path.length > 1) {
      ctx.save()
      ctx.shadowColor = C.parchment
      ctx.shadowBlur = 12
      ctx.strokeStyle = C.parchment
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      this.path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
      ctx.stroke()
      ctx.restore()
    }
  }

  override hud(): ModeHud {
    return {
      ...this.hudBase(),
      progress: this.caught / TARGET,
      progressLabel: `Восьмёрки ${this.caught}/${TARGET}`,
      timeLeft: this.timeLeft,
      hint:
        this.lastAcc > 0
          ? `Последний круг: ${Math.round(this.lastAcc * 100)}%  ·  лучший: ${Math.round(this.bestAcc * 100)}%`
          : 'Зажмите и обведите ∞',
    }
  }
}
