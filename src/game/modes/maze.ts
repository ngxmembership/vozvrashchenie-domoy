import { BaseMode } from '../core/base'
import { glowCircle } from '../core/fx'
import { sfx } from '../core/sound'
import { C, H, W, dist, pick, rand, type ModeHud, type ModeOptions, type Vec } from '../core/types'

const CELL = 46
const COLS = 20
const ROWS = 12
const OX = (W - COLS * CELL) / 2
const OY = (H - ROWS * CELL) / 2
const T = 6
const PR = 10
const LABELS = ['Сериал', 'Скидки', 'Лайки', 'Кредит', 'Шоу', 'Новости']

type Cell = { n: boolean; e: boolean; s: boolean; w: boolean }
type Rect = { x: number; y: number; w: number; h: number }
type Hunter = Vec & { cx: number; cy: number; tx: number; ty: number; px: number; py: number; spin: number }
type Spot = { cx: number; cy: number }

const center = (cx: number, cy: number): Vec => ({ x: OX + cx * CELL + CELL / 2, y: OY + cy * CELL + CELL / 2 })
const key = (s: Spot) => `${s.cx},${s.cy}`

export class MazeMode extends BaseMode {
  grid: Cell[][] = []
  rects: Rect[] = []
  player = { ...center(0, 0) }
  keysLeft: Spot[] = []
  keysGot = 0
  fakeDoors: Spot[] = []
  door: Spot = { cx: COLS - 1, cy: ROWS - 1 }
  traps: (Spot & { label: string; cool: number })[] = []
  hunters: Hunter[] = []
  lives = 3
  livesLost = 0
  invuln = 0
  stun = 0
  elapsed = 0
  trail: Vec[] = []

  constructor(opts: ModeOptions) {
    super(opts)
    this.generate()
    this.say('Тьма. Ищите ключи памяти — их свет пробивается сквозь стены.')
  }

  generate() {
    this.grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ n: true, e: true, s: true, w: true })))
    const seen = new Set<string>(['0,0'])
    const stack: Spot[] = [{ cx: 0, cy: 0 }]
    while (stack.length) {
      const cur = stack[stack.length - 1]!
      const opts = this.dirs(cur).filter((d) => !seen.has(key(d)))
      if (!opts.length) {
        stack.pop()
        continue
      }
      const nx = pick(opts)
      this.carve(cur, nx)
      seen.add(key(nx))
      stack.push(nx)
    }
    for (let i = 0; i < 28; i++) {
      const c = { cx: Math.floor(rand(0, COLS)), cy: Math.floor(rand(0, ROWS)) }
      this.carve(c, pick(this.dirs(c)))
    }
    this.buildRects()

    const distMap = this.bfs({ cx: 0, cy: 0 })
    const deadEnds: (Spot & { d: number })[] = []
    for (let cy = 0; cy < ROWS; cy++)
      for (let cx = 0; cx < COLS; cx++) {
        const c = this.grid[cy]![cx]!
        const open = [c.n, c.e, c.s, c.w].filter((w) => !w).length
        const isEnd = cx === this.door.cx && cy === this.door.cy
        if (open === 1 && !isEnd && (cx > 2 || cy > 2)) deadEnds.push({ cx, cy, d: distMap.get(key({ cx, cy })) ?? 0 })
      }
    deadEnds.sort(() => Math.random() - 0.5)
    const far = [...deadEnds.filter((d) => d.d > 10), ...deadEnds.filter((d) => d.d <= 10)]
    while (far.length < 5) far.push({ cx: Math.floor(rand(5, COLS - 1)), cy: Math.floor(rand(0, ROWS - 1)), d: 0 })
    this.keysLeft = far.slice(0, 3)
    this.fakeDoors = far.slice(3, 5)
    const used = new Set([...this.keysLeft, ...this.fakeDoors, this.door].map(key))
    for (let i = 0; i < 5; i++) {
      for (let tries = 0; tries < 20; tries++) {
        const s = { cx: Math.floor(rand(2, COLS)), cy: Math.floor(rand(0, ROWS)) }
        if (!used.has(key(s))) {
          used.add(key(s))
          this.traps.push({ ...s, label: LABELS[i % LABELS.length]!, cool: 0 })
          break
        }
      }
    }
    for (let i = 0; i < 3; i++) this.spawnHunter()
  }

  spawnHunter() {
    for (let tries = 0; tries < 50; tries++) {
      const cx = Math.floor(rand(4, COLS))
      const cy = Math.floor(rand(0, ROWS))
      const p = center(cx, cy)
      if (dist(p, this.player) < 300) continue
      this.hunters.push({ ...p, cx, cy, tx: cx, ty: cy, px: cx, py: cy, spin: rand(0, 6) })
      return
    }
  }

  dirs(c: Spot): Spot[] {
    const out: Spot[] = []
    if (c.cy > 0) out.push({ cx: c.cx, cy: c.cy - 1 })
    if (c.cx < COLS - 1) out.push({ cx: c.cx + 1, cy: c.cy })
    if (c.cy < ROWS - 1) out.push({ cx: c.cx, cy: c.cy + 1 })
    if (c.cx > 0) out.push({ cx: c.cx - 1, cy: c.cy })
    return out
  }

  carve(a: Spot, b: Spot) {
    const A = this.grid[a.cy]![a.cx]!
    const B = this.grid[b.cy]![b.cx]!
    if (b.cx > a.cx) {
      A.e = false
      B.w = false
    } else if (b.cx < a.cx) {
      A.w = false
      B.e = false
    } else if (b.cy > a.cy) {
      A.s = false
      B.n = false
    } else {
      A.n = false
      B.s = false
    }
  }

  open(c: Spot): Spot[] {
    const g = this.grid[c.cy]![c.cx]!
    const out: Spot[] = []
    if (!g.n) out.push({ cx: c.cx, cy: c.cy - 1 })
    if (!g.e) out.push({ cx: c.cx + 1, cy: c.cy })
    if (!g.s) out.push({ cx: c.cx, cy: c.cy + 1 })
    if (!g.w) out.push({ cx: c.cx - 1, cy: c.cy })
    return out
  }

  bfs(from: Spot) {
    const d = new Map<string, number>([[key(from), 0]])
    const q = [from]
    while (q.length) {
      const c = q.shift()!
      const cd = d.get(key(c))!
      for (const n of this.open(c)) {
        if (!d.has(key(n))) {
          d.set(key(n), cd + 1)
          q.push(n)
        }
      }
    }
    return d
  }

  buildRects() {
    this.rects = []
    for (let cy = 0; cy < ROWS; cy++)
      for (let cx = 0; cx < COLS; cx++) {
        const c = this.grid[cy]![cx]!
        const x = OX + cx * CELL
        const y = OY + cy * CELL
        if (c.n) this.rects.push({ x: x - T / 2, y: y - T / 2, w: CELL + T, h: T })
        if (c.w) this.rects.push({ x: x - T / 2, y: y - T / 2, w: T, h: CELL + T })
        if (cx === COLS - 1 && c.e) this.rects.push({ x: x + CELL - T / 2, y: y - T / 2, w: T, h: CELL + T })
        if (cy === ROWS - 1 && c.s) this.rects.push({ x: x - T / 2, y: y + CELL - T / 2, w: CELL + T, h: T })
      }
  }

  collide(p: Vec) {
    for (const r of this.rects) {
      const cx = Math.max(r.x, Math.min(p.x, r.x + r.w))
      const cy = Math.max(r.y, Math.min(p.y, r.y + r.h))
      const dx = p.x - cx
      const dy = p.y - cy
      const d = Math.hypot(dx, dy)
      if (d < PR && d > 0) {
        p.x += (dx / d) * (PR - d)
        p.y += (dy / d) * (PR - d)
      }
    }
  }

  cellOf(p: Vec): Spot {
    return {
      cx: Math.max(0, Math.min(COLS - 1, Math.floor((p.x - OX) / CELL))),
      cy: Math.max(0, Math.min(ROWS - 1, Math.floor((p.y - OY) / CELL))),
    }
  }

  override update(dt: number) {
    this.elapsed += dt
    this.invuln = Math.max(0, this.invuln - dt)
    this.stun = Math.max(0, this.stun - dt)
    const p = this.player

    let { x: dx, y: dy } = this.keyDir()
    if (dx === 0 && dy === 0 && this.pointerDown && this.pointer) {
      const d = dist(this.pointer, p)
      if (d > 8) {
        dx = (this.pointer.x - p.x) / d
        dy = (this.pointer.y - p.y) / d
      }
    }
    const len = Math.hypot(dx, dy) || 1
    const sp = this.stun > 0 ? 0 : 175
    p.x += (dx / len) * sp * dt
    this.collide(p)
    p.y += (dy / len) * sp * dt
    this.collide(p)
    this.trail.push({ x: p.x, y: p.y })
    if (this.trail.length > 14) this.trail.shift()
    const pc = this.cellOf(p)

    this.keysLeft = this.keysLeft.filter((k) => {
      if (dist(center(k.cx, k.cy), p) < 20) {
        this.keysGot++
        this.score += 150
        this.reveal(center(k.cx, k.cy))
        if (this.keysGot === 2) this.spawnHunter()
        if (this.keysGot === 3) this.say('Все ключи собраны. Настоящая дверь открыта — в дальнем углу.')
        return false
      }
      return true
    })

    for (const t of this.traps) {
      t.cool = Math.max(0, t.cool - dt)
      if (t.cool <= 0 && dist(center(t.cx, t.cy), p) < 18) {
        t.cool = 4
        this.stun = 1.2
        this.score = Math.max(0, this.score - 50)
        this.fx.shake(6)
        this.fx.burst(p, C.red, 20, 140)
        sfx.wrong()
        this.say(`Крючок «${t.label}» вцепился в разум. −50`)
      }
    }

    for (const f of this.fakeDoors) {
      if (dist(center(f.cx, f.cy), p) < 18) {
        const to = center(Math.floor(rand(0, 6)), Math.floor(rand(0, ROWS)))
        this.fx.burst(p, C.red, 30, 200)
        p.x = to.x
        p.y = to.y
        this.fx.flash('#E82020', 0.35)
        this.fx.shake(10)
        sfx.hurt()
        this.say('Фальшивая дверь! Матрица создаёт фальшивые цели.')
      }
    }

    if (this.keysGot >= 3 && dist(center(this.door.cx, this.door.cy), p) < 20) {
      if (this.livesLost === 0) this.achieve('maze_clean')
      this.score += Math.max(0, Math.round(600 - this.elapsed * 4))
      this.finish({ win: true, stars: this.livesLost === 0 ? 3 : this.livesLost === 1 ? 2 : 1 })
      return
    }

    const chase = this.bfs(pc)
    const hsp = 90 + this.keysGot * 12
    for (const h of this.hunters) {
      h.spin += dt * 4
      const tgt = center(h.tx, h.ty)
      const d = dist(h, tgt)
      if (d < 2) {
        h.px = h.cx
        h.py = h.cy
        h.cx = h.tx
        h.cy = h.ty
        const opts = this.open({ cx: h.cx, cy: h.cy })
        const mine = chase.get(key({ cx: h.cx, cy: h.cy })) ?? 99
        let next: Spot | undefined
        if (mine < 7) next = opts.find((o) => (chase.get(key(o)) ?? 99) < mine)
        if (!next) {
          const fwd = opts.filter((o) => o.cx !== h.px || o.cy !== h.py)
          next = pick(fwd.length ? fwd : opts)
        }
        h.tx = next.cx
        h.ty = next.cy
      } else {
        h.x += ((tgt.x - h.x) / d) * Math.min(d, hsp * dt)
        h.y += ((tgt.y - h.y) / d) * Math.min(d, hsp * dt)
      }
      if (this.invuln <= 0 && dist(h, p) < PR + 12) {
        this.lives--
        this.livesLost++
        this.invuln = 1.6
        this.fx.shake(12)
        this.fx.flash('#E82020', 0.4)
        this.fx.burst(p, C.red, 30, 200)
        this.fx.hitStop(0.1)
        sfx.hurt()
        if (this.lives <= 0) {
          this.finish({ win: false, stars: 0 })
          return
        }
        this.say('Крюк вцепился в разум! Бегите!')
      }
    }
  }

  drawDoor(ctx: CanvasRenderingContext2D, s: Spot, locked: boolean) {
    const c = center(s.cx, s.cy)
    const pulse = 0.6 + Math.sin(this.time * 3) * 0.3
    if (!locked) glowCircle(ctx, c.x, c.y, 50, '219,210,193', 0.4 * pulse)
    ctx.beginPath()
    ctx.moveTo(c.x - 11, c.y + 16)
    ctx.lineTo(c.x - 11, c.y - 5)
    ctx.arc(c.x, c.y - 5, 11, Math.PI, 0)
    ctx.lineTo(c.x + 11, c.y + 16)
    ctx.closePath()
    ctx.fillStyle = locked ? '#1d1b19' : `rgba(255,240,210,${0.6 + pulse * 0.3})`
    ctx.fill()
    ctx.strokeStyle = C.goldLight
    ctx.lineWidth = 2
    ctx.stroke()
    if (locked) {
      ctx.fillStyle = C.goldLight
      ctx.fillRect(c.x - 4, c.y, 8, 7)
      ctx.beginPath()
      ctx.arc(c.x, c.y, 3.5, Math.PI, 0)
      ctx.stroke()
    }
  }

  drawKey(ctx: CanvasRenderingContext2D, c: Vec) {
    const bob = Math.sin(this.time * 3 + c.x) * 3
    ctx.save()
    ctx.translate(c.x, c.y + bob)
    glowCircle(ctx, 0, 0, 24, '200,150,74', 0.6)
    ctx.strokeStyle = C.goldLight
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(-6, 0, 5, 0, Math.PI * 2)
    ctx.moveTo(-1, 0)
    ctx.lineTo(10, 0)
    ctx.moveTo(6, 0)
    ctx.lineTo(6, 5)
    ctx.moveTo(10, 0)
    ctx.lineTo(10, 5)
    ctx.stroke()
    ctx.restore()
  }

  override draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#0b0a09'
    ctx.fillRect(-20, -20, W + 40, H + 40)

    for (const t of this.traps) {
      const c = center(t.cx, t.cy)
      glowCircle(ctx, c.x, c.y, 34, '232,32,32', t.cool > 0 ? 0.1 : 0.3)
      ctx.strokeStyle = C.red
      ctx.lineWidth = 1.5
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + this.time
        ctx.beginPath()
        ctx.arc(c.x + Math.cos(a) * 9, c.y + Math.sin(a) * 9, 4, a, a + 4)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(219,210,193,0.8)'
      ctx.font = '10px Play, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(t.label, c.x, c.y + 19)
    }
    for (const f of this.fakeDoors) this.drawDoor(ctx, f, false)
    this.drawDoor(ctx, this.door, this.keysGot < 3)

    ctx.fillStyle = '#3a3532'
    for (const r of this.rects) ctx.fillRect(r.x, r.y, r.w, r.h)
    ctx.fillStyle = 'rgba(146,98,35,0.5)'
    for (const r of this.rects) ctx.fillRect(r.x, r.y, r.w, 1.5)

    for (const k of this.keysLeft) this.drawKey(ctx, center(k.cx, k.cy))

    for (const h of this.hunters) {
      ctx.save()
      ctx.translate(h.x, h.y)
      glowCircle(ctx, 0, 0, 26, '232,32,32', 0.35)
      ctx.rotate(Math.sin(h.spin) * 0.6)
      ctx.strokeStyle = '#c9c4bb'
      ctx.lineWidth = 3.5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(0, -14)
      ctx.lineTo(0, 4)
      ctx.arc(-6, 4, 6, 0, Math.PI * 0.95)
      ctx.stroke()
      ctx.fillStyle = C.red
      ctx.fillRect(-2, -16, 4, 4)
      ctx.restore()
    }

    const p = this.player
    this.trail.forEach((t, i) => {
      ctx.globalAlpha = (i / this.trail.length) * 0.3
      ctx.fillStyle = C.goldLight
      ctx.beginPath()
      ctx.arc(t.x, t.y, 2 + (i / this.trail.length) * 4, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = this.invuln > 0 && Math.floor(this.time * 14) % 2 === 0 ? 0.3 : 1
    glowCircle(ctx, p.x, p.y, 22, '255,240,210', 0.9)
    ctx.fillStyle = this.stun > 0 ? C.red : '#fff8e6'
    ctx.beginPath()
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    const fog = ctx.createRadialGradient(p.x, p.y, 40, p.x, p.y, 175)
    fog.addColorStop(0, 'rgba(0,0,0,0)')
    fog.addColorStop(1, 'rgba(3,3,3,0.96)')
    ctx.fillStyle = fog
    ctx.fillRect(-20, -20, W + 40, H + 40)

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const k of this.keysLeft) {
      const c = center(k.cx, k.cy)
      glowCircle(ctx, c.x, c.y, 40 + Math.sin(this.time * 2) * 6, '200,150,74', 0.35)
    }
    if (this.keysGot >= 3) {
      const c = center(this.door.cx, this.door.cy)
      glowCircle(ctx, c.x, c.y, 60, '219,210,193', 0.4)
    }
    for (const h of this.hunters) {
      ctx.fillStyle = 'rgba(232,32,32,0.7)'
      ctx.fillRect(h.x - 4, h.y - 16, 3, 3)
      ctx.fillRect(h.x + 1, h.y - 16, 3, 3)
    }
    ctx.restore()
  }

  override hud(): ModeHud {
    return {
      ...this.hudBase(),
      progress: this.keysGot / 3,
      progressLabel: `Ключи ${this.keysGot}/3`,
      lives: this.lives,
      maxLives: 3,
      hint: this.keysGot >= 3 ? 'Дверь открыта — правый нижний угол' : 'WASD / стрелки или зажмите мышь',
    }
  }
}
