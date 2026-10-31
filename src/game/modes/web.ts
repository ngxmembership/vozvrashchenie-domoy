import { BaseMode } from '../core/base'
import { Starfield } from '../core/fx'
import { sfx } from '../core/sound'
import { C, H, W, dist, rand, type ModeHud, type ModeOptions, type Vec } from '../core/types'
import { drawDoor, drawFragment, drawPlayer, drawSpider, drawTrap, drawWeb, type Fragment, type Spider, type Trap } from '../draw'

const PLAYER_R = 9
const CHARGE_TIME = 1.0
const TOKENS = 5
const LABELS = ['Сериал', 'Скидки', 'Лайки', 'Кредит']

export class WebMode extends BaseMode {
  starfield = new Starfield()
  player = { x: W / 2, y: H / 2, vx: 0, vy: 0 }
  awareness = 100
  spiders: Spider[] = []
  tokens: Fragment[] = []
  traps: Trap[] = []
  waves: (Vec & { r: number; max: number; strong: boolean })[] = []
  trail: Vec[] = []
  door: (Vec & { phase: number }) | null = null
  charging = false
  charge = 0
  invuln = 0
  spawnT = 0
  webTear = 0
  trapCool = 0
  hits = 0

  constructor(opts: ModeOptions) {
    super(opts)
    for (let i = 0; i < TOKENS; i++) this.tokens.push({ ...this.randPos(140), taken: false, phase: rand(0, 6) })
    for (const label of LABELS) {
      const a = rand(0, Math.PI * 2)
      this.traps.push({ ...this.randPos(180), vx: Math.cos(a) * 24, vy: Math.sin(a) * 24, r: 22, label, phase: rand(0, 6) })
    }
    for (let i = 0; i < 4; i++) this.spawnSpider()
    this.say('Соберите знаки памяти. Пауки уже чуют вас.')
  }

  randPos(min: number): Vec {
    for (let i = 0; i < 50; i++) {
      const p = { x: rand(50, W - 50), y: rand(50, H - 50) }
      if (dist(p, this.player) > min) return p
    }
    return { x: 60, y: 60 }
  }

  spawnSpider() {
    const side = Math.floor(Math.random() * 4)
    const x = side === 0 ? -20 : side === 1 ? W + 20 : rand(0, W)
    const y = side === 2 ? -20 : side === 3 ? H + 20 : rand(0, H)
    this.spiders.push({ x, y, vx: 0, vy: 0, stun: 0, phase: rand(0, 6) })
  }

  override onKeyDown(code: string) {
    if (code === 'Space') this.charging = true
  }
  override onKeyUp(code: string) {
    if (code === 'Space') this.release()
  }
  startCharge() {
    this.charging = true
  }

  release() {
    if (!this.charging) return
    this.charging = false
    const c = this.charge
    this.charge = 0
    if (c < 0.12 || this.done) return
    const p = this.player
    if (c >= 1 && this.awareness > 12) {
      this.awareness -= 10
      this.waves.push({ x: p.x, y: p.y, r: 10, max: 270, strong: true })
      let killed = 0
      this.spiders = this.spiders.filter((s) => {
        if (dist(s, p) < 270) {
          killed++
          this.fx.burst(s, C.goldLight, 20, 200)
          this.fx.burst(s, C.gray, 14, 160, { glow: false, gravity: 300 })
          return false
        }
        return true
      })
      this.webTear = Math.min(1, this.webTear + 0.2)
      this.fx.shake(12)
      this.fx.flash('#C8964A', 0.25)
      sfx.wave(true)
      if (killed > 0) {
        this.score += killed * killed * 50
        this.fx.text({ x: p.x, y: p.y - 30 }, killed > 1 ? `Разящий кулак x${killed}!` : '+50', C.goldLight, 22)
      }
      if (killed >= 3) this.achieve('triple')
      this.say(killed ? 'Сильная волна рвёт паутину!' : 'Сильная волна ушла в пустоту.')
    } else {
      this.waves.push({ x: p.x, y: p.y, r: 10, max: 150, strong: false })
      for (const s of this.spiders) if (dist(s, p) < 150) s.stun = 1.8
      this.spawnSpider()
      sfx.wave(false)
      this.say('Слабая волна оглушила пауков... и позвала новых.')
    }
  }

  override update(dt: number) {
    this.invuln = Math.max(0, this.invuln - dt)
    this.trapCool = Math.max(0, this.trapCool - dt)
    if (this.charging) this.charge = Math.min(1, this.charge + dt / CHARGE_TIME)
    const p = this.player
    let { x: dx, y: dy } = this.keyDir()
    if (dx === 0 && dy === 0 && this.pointerDown && this.pointer) {
      const d = dist(this.pointer, p)
      if (d > 6) {
        dx = (this.pointer.x - p.x) / d
        dy = (this.pointer.y - p.y) / d
      }
    }
    const len = Math.hypot(dx, dy) || 1
    let slow = this.charging ? 0.6 : 1

    for (const t of this.traps) {
      t.phase += dt
      t.x += t.vx * dt
      t.y += t.vy * dt
      if (t.x < t.r || t.x > W - t.r) t.vx *= -1
      if (t.y < t.r || t.y > H - t.r) t.vy *= -1
      const d = dist(t, p)
      const reach = t.r * 3.5
      if (d < reach && d > 0) {
        const pull = (1 - d / reach) * 150 * dt
        p.x += ((t.x - p.x) / d) * pull
        p.y += ((t.y - p.y) / d) * pull
      }
      if (d < t.r + PLAYER_R) {
        slow = 0.45
        this.awareness -= 14 * dt
        if (this.trapCool <= 0) {
          this.say(`Ловушка «${t.label}» вытягивает память.`)
          this.trapCool = 3
        }
      }
    }

    const speed = 235 * slow
    p.vx += ((dx / len) * speed - p.vx) * Math.min(1, dt * 10)
    p.vy += ((dy / len) * speed - p.vy) * Math.min(1, dt * 10)
    p.x = Math.max(PLAYER_R, Math.min(W - PLAYER_R, p.x + p.vx * dt))
    p.y = Math.max(PLAYER_R, Math.min(H - PLAYER_R, p.y + p.vy * dt))
    this.trail.push({ x: p.x, y: p.y })
    if (this.trail.length > 18) this.trail.shift()

    this.spawnT += dt
    if (this.spawnT > 7 && this.spiders.length < 8) {
      this.spawnT = 0
      this.spawnSpider()
    }
    for (const s of this.spiders) {
      s.phase += dt * 10
      if (s.stun > 0) {
        s.stun -= dt
        s.vx *= 0.9
        s.vy *= 0.9
      } else {
        const d = dist(s, p) || 1
        const wob = Math.sin(this.time * 2 + s.phase * 0.1) * 0.4
        const tx = (p.x - s.x) / d
        const ty = (p.y - s.y) / d
        const sp = 95 + this.score / 60
        s.vx += ((tx - ty * wob) * sp - s.vx) * Math.min(1, dt * 3)
        s.vy += ((ty + tx * wob) * sp - s.vy) * Math.min(1, dt * 3)
      }
      for (const o of this.spiders) {
        if (o === s) continue
        const d = dist(s, o)
        if (d < 26 && d > 0) {
          s.vx += ((s.x - o.x) / d) * 300 * dt
          s.vy += ((s.y - o.y) / d) * 300 * dt
        }
      }
      s.x += s.vx * dt
      s.y += s.vy * dt
      if (this.invuln <= 0 && dist(s, p) < PLAYER_R + 12) {
        this.awareness -= 15
        this.hits++
        this.invuln = 1.3
        const d = dist(s, p) || 1
        p.vx = ((p.x - s.x) / d) * 460
        p.vy = ((p.y - s.y) / d) * 460
        this.fx.burst(p, C.red, 16, 160)
        this.fx.shake(10)
        this.fx.hitStop(0.08)
        sfx.hurt()
        this.say('Инъекция паука! Память блокируется...')
      }
    }

    let taken = 0
    for (const f of this.tokens) {
      f.phase += dt
      if (!f.taken && dist(f, p) < PLAYER_R + 14) {
        f.taken = true
        this.awareness = Math.min(100, this.awareness + 6)
        this.score += 100
        sfx.pickup()
        this.fx.burst(f, C.goldLight, 22, 140)
        const n = this.tokens.filter((t) => t.taken).length
        if (n === 1 || n === 3 || n === 5) this.reveal(f)
        else this.fx.text(f, '+100', C.goldLight)
      }
      if (f.taken) taken++
    }
    if (!this.door && taken === TOKENS) {
      this.door = { ...this.randPos(220), phase: 0 }
      this.say('Память вернулась. Где-то появилась дверь...')
    }
    if (this.door) {
      this.door.phase += dt
      if (Math.abs(this.door.x - p.x) < 20 && Math.abs(this.door.y - p.y) < 30) {
        this.score += Math.round(this.awareness * 5)
        this.finish({ win: true, stars: this.hits === 0 ? 3 : this.hits <= 2 ? 2 : 1 })
        return
      }
    }

    for (const w of this.waves) w.r += (w.strong ? 540 : 380) * dt
    this.waves = this.waves.filter((w) => w.r < w.max)

    if (this.awareness <= 0) {
      this.awareness = 0
      this.finish({ win: false, stars: 0 })
    }
  }

  override draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = C.black
    ctx.fillRect(-20, -20, W + 40, H + 40)
    this.starfield.draw(ctx, this.time, -this.player.x * 0.05, -this.player.y * 0.05)
    drawWeb(ctx, W, H, this.webTear, this.time)
    for (const t of this.traps) drawTrap(ctx, t)
    for (const f of this.tokens) if (!f.taken) drawFragment(ctx, f)
    if (this.door) drawDoor(ctx, this.door)
    for (const w of this.waves) {
      ctx.strokeStyle = w.strong ? C.goldLight : C.parchment
      ctx.globalAlpha = 1 - w.r / w.max
      ctx.lineWidth = w.strong ? 5 : 2
      ctx.beginPath()
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    for (const s of this.spiders) drawSpider(ctx, s)
    drawPlayer(ctx, this.player, this.trail, this.charge, this.invuln, this.time)
  }

  override hud(): ModeHud {
    const n = this.tokens.filter((t) => t.taken).length
    return {
      ...this.hudBase(),
      progress: n / TOKENS,
      progressLabel: this.door ? 'Дверь открыта!' : `Знаки ${n}/${TOKENS}`,
      charge: this.charge,
      lives: Math.ceil(this.awareness / 20),
      maxLives: 5,
      hint: 'Пробел / кнопка «Волна»: коротко — оглушить, удерживать — сильная волна',
    }
  }
}
