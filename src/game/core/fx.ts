import { C, H, W, rand, type Vec } from './types'

type Particle = Vec & {
  vx: number
  vy: number
  life: number
  max: number
  color: string
  size: number
  gravity: number
  glow: boolean
}
type FloatText = Vec & { text: string; life: number; color: string; size: number }

/** Juice: particles, floating texts, screen shake, flashes and hit-stop. */
export class Fx {
  particles: Particle[] = []
  texts: FloatText[] = []
  shakeAmt = 0
  flashAlpha = 0
  flashColor = '#fff'
  freeze = 0

  burst(p: Vec, color: string, n: number, speed: number, opts: { gravity?: number; size?: number; glow?: boolean } = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2)
      const s = rand(speed * 0.25, speed)
      const max = rand(0.4, 1.1)
      this.particles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: max,
        max,
        color,
        size: rand(1, opts.size ?? 3),
        gravity: opts.gravity ?? 0,
        glow: opts.glow ?? true,
      })
    }
    if (this.particles.length > 900) this.particles.splice(0, this.particles.length - 900)
  }

  text(p: Vec, text: string, color: string = C.parchment, size = 18) {
    this.texts.push({ x: p.x, y: p.y, text, life: 1.2, color, size })
  }

  shake(amount: number) {
    this.shakeAmt = Math.max(this.shakeAmt, amount)
  }

  flash(color: string, alpha = 0.5) {
    this.flashColor = color
    this.flashAlpha = alpha
  }

  hitStop(sec: number) {
    this.freeze = Math.max(this.freeze, sec)
  }

  update(dt: number) {
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 30)
    this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2)
    for (const p of this.particles) {
      p.life -= dt
      p.vy += p.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= 0.97
      p.vy *= 0.97
    }
    this.particles = this.particles.filter((p) => p.life > 0)
    for (const t of this.texts) {
      t.life -= dt
      t.y -= 40 * dt
    }
    this.texts = this.texts.filter((t) => t.life > 0)
  }

  applyShake(ctx: CanvasRenderingContext2D) {
    if (this.shakeAmt > 0) ctx.translate(rand(-1, 1) * this.shakeAmt, rand(-1, 1) * this.shakeAmt)
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save()
    for (const p of this.particles) {
      ctx.globalCompositeOperation = p.glow ? 'lighter' : 'source-over'
      ctx.globalAlpha = Math.max(0, p.life / p.max)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.textAlign = 'center'
    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life * 1.5)
      ctx.font = `bold ${t.size}px Play, sans-serif`
      ctx.fillStyle = '#000'
      ctx.fillText(t.text, t.x + 1, t.y + 1)
      ctx.fillStyle = t.color
      ctx.fillText(t.text, t.x, t.y)
    }
    ctx.restore()
  }

  drawOverlay(ctx: CanvasRenderingContext2D) {
    if (this.flashAlpha > 0) {
      ctx.save()
      ctx.globalAlpha = this.flashAlpha
      ctx.fillStyle = this.flashColor
      ctx.fillRect(-20, -20, W + 40, H + 40)
      ctx.restore()
    }
  }
}

/** Three-layer parallax starfield. */
export class Starfield {
  stars: (Vec & { z: number; p: number })[] = []
  constructor(n = 140) {
    for (let i = 0; i < n; i++) this.stars.push({ x: rand(0, W), y: rand(0, H), z: rand(0.2, 1), p: rand(0, 6) })
  }
  draw(ctx: CanvasRenderingContext2D, time: number, ox = 0, oy = 0) {
    ctx.save()
    ctx.fillStyle = C.parchment
    for (const s of this.stars) {
      const x = (((s.x + ox * s.z) % W) + W) % W
      const y = (((s.y + oy * s.z) % H) + H) % H
      ctx.globalAlpha = (0.2 + 0.5 * Math.abs(Math.sin(time * 0.7 + s.p))) * s.z
      const size = s.z * 1.8
      ctx.fillRect(x, y, size, size)
    }
    ctx.restore()
  }
}

export function vignette(ctx: CanvasRenderingContext2D, strength = 0.75) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.65)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(0,0,0,${strength})`)
  ctx.fillStyle = g
  ctx.fillRect(-20, -20, W + 40, H + 40)
}

export function glowCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(${rgb},${alpha})`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

/** The "ϟ" bolt from the site's logo, drawn as a path. */
export function drawBolt(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1.5, s * 0.18)
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(x + s * 0.3, y - s)
  ctx.lineTo(x - s * 0.35, y + s * 0.05)
  ctx.lineTo(x + s * 0.3, y + s * 0.05)
  ctx.lineTo(x - s * 0.3, y + s)
  ctx.stroke()
  ctx.restore()
}
