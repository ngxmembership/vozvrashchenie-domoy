import { C as PALETTE } from './core/types'

type Vec = { x: number; y: number }
export type Spider = Vec & { vx: number; vy: number; stun: number; phase: number }
export type Fragment = Vec & { taken: boolean; phase: number }
export type Trap = Vec & { vx: number; vy: number; r: number; label: string; phase: number }

/** Spider web centred on the screen; tears (dashes) as strong waves hit it. */
export function drawWeb(ctx: CanvasRenderingContext2D, w: number, h: number, tear: number, time: number) {
  const cx = w / 2
  const cy = h / 2
  const maxR = Math.hypot(w, h) / 2
  ctx.save()
  ctx.strokeStyle = PALETTE.parchment
  ctx.globalAlpha = 0.16 * (1 - tear * 0.7)
  ctx.lineWidth = 1
  if (tear > 0) ctx.setLineDash([30 * (1 - tear) + 6, 10 + tear * 40])
  const spokes = 18
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 + Math.sin(time * 0.1) * 0.02
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR)
    ctx.stroke()
  }
  for (let r = 36; r < maxR; r += 38) {
    ctx.beginPath()
    for (let i = 0; i <= spokes; i++) {
      const a = (i / spokes) * Math.PI * 2
      const sag = r * 0.94
      const x = cx + Math.cos(a) * (i % 2 === 0 ? r : sag)
      const y = cy + Math.sin(a) * (i % 2 === 0 ? r : sag)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.restore()
}

export function drawTrap(ctx: CanvasRenderingContext2D, t: Trap) {
  const pulse = 1 + Math.sin(t.phase * 3) * 0.12
  ctx.save()
  const g = ctx.createRadialGradient(t.x, t.y, 2, t.x, t.y, t.r * 3.5)
  g.addColorStop(0, 'rgba(232,32,32,0.45)')
  g.addColorStop(0.3, 'rgba(232,32,32,0.12)')
  g.addColorStop(1, 'rgba(232,32,32,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(t.x, t.y, t.r * 3.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = PALETTE.red
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(t.x, t.y, t.r * pulse, 0, Math.PI * 2)
  ctx.stroke()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t.phase
    ctx.beginPath()
    ctx.arc(t.x + Math.cos(a) * t.r * 1.5, t.y + Math.sin(a) * t.r * 1.5, 4, a, a + Math.PI * 1.3)
    ctx.stroke()
  }
  ctx.fillStyle = PALETTE.parchment
  ctx.font = '13px Play, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(t.label, t.x, t.y)
  ctx.restore()
}

export function drawFragment(ctx: CanvasRenderingContext2D, f: Fragment) {
  const bob = Math.sin(f.phase * 2) * 3
  const y = f.y + bob
  ctx.save()
  const g = ctx.createRadialGradient(f.x, y, 1, f.x, y, 30)
  g.addColorStop(0, 'rgba(200,150,74,0.6)')
  g.addColorStop(1, 'rgba(200,150,74,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(f.x, y, 30, 0, Math.PI * 2)
  ctx.fill()
  ctx.translate(f.x, y)
  ctx.rotate(f.phase * 0.8)
  ctx.strokeStyle = PALETTE.goldLight
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, -11)
  ctx.lineTo(8, 0)
  ctx.lineTo(0, 11)
  ctx.lineTo(-8, 0)
  ctx.closePath()
  ctx.stroke()
  ctx.rotate(-f.phase * 0.8)
  ctx.strokeStyle = PALETTE.parchment
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(2, -6)
  ctx.lineTo(-2, 0)
  ctx.lineTo(2, 0)
  ctx.lineTo(-2, 6)
  ctx.stroke()
  ctx.restore()
}

export function drawDoor(ctx: CanvasRenderingContext2D, d: Vec & { phase: number }) {
  const pulse = 0.6 + Math.sin(d.phase * 3) * 0.3
  ctx.save()
  const g = ctx.createRadialGradient(d.x, d.y, 4, d.x, d.y, 90)
  g.addColorStop(0, `rgba(219,210,193,${0.5 * pulse})`)
  g.addColorStop(1, 'rgba(219,210,193,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(d.x, d.y, 90, 0, Math.PI * 2)
  ctx.fill()
  const w = 30
  const h = 50
  ctx.beginPath()
  ctx.moveTo(d.x - w / 2, d.y + h / 2)
  ctx.lineTo(d.x - w / 2, d.y - h / 2 + w / 2)
  ctx.arc(d.x, d.y - h / 2 + w / 2, w / 2, Math.PI, 0)
  ctx.lineTo(d.x + w / 2, d.y + h / 2)
  ctx.closePath()
  ctx.fillStyle = `rgba(255,240,210,${0.55 + pulse * 0.3})`
  ctx.fill()
  ctx.strokeStyle = PALETTE.goldLight
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.fillStyle = PALETTE.parchment
  ctx.font = '14px Forum, serif'
  ctx.textAlign = 'center'
  ctx.fillText('ДОМОЙ', d.x, d.y + h / 2 + 18)
  ctx.restore()
}

export function drawSpider(ctx: CanvasRenderingContext2D, s: Spider) {
  const stunned = s.stun > 0
  ctx.save()
  ctx.translate(s.x, s.y)
  ctx.rotate(Math.atan2(s.vy, s.vx) + Math.PI / 2)
  ctx.strokeStyle = stunned ? PALETTE.grayLight : PALETTE.gray
  ctx.lineWidth = 1.6
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 4; i++) {
      const base = -0.9 + i * 0.6
      const swing = Math.sin(s.phase + i * 1.3 + (side > 0 ? Math.PI : 0)) * 0.25
      const a = base + swing
      const kx = side * Math.cos(a) * 12
      const ky = Math.sin(a) * 12
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(kx, ky - 4)
      ctx.lineTo(kx * 1.7, ky * 1.7 + 4)
      ctx.stroke()
    }
  }
  ctx.fillStyle = stunned ? '#3a3c3b' : '#1a1a1a'
  ctx.strokeStyle = stunned ? PALETTE.grayLight : PALETTE.gold
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.ellipse(0, 5, 7, 9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, -6, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = stunned ? PALETTE.grayLight : PALETTE.red
  ctx.fillRect(-3, -9, 2, 2)
  ctx.fillRect(1, -9, 2, 2)
  ctx.strokeStyle = stunned ? PALETTE.grayLight : PALETTE.parchment
  ctx.beginPath()
  ctx.moveTo(0, -11)
  ctx.lineTo(0, -17)
  ctx.stroke()
  if (stunned) {
    ctx.fillStyle = PALETTE.parchment
    ctx.font = '10px Play, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('z', 8, -14)
  }
  ctx.restore()
}

export function drawPlayer(ctx: CanvasRenderingContext2D, p: Vec, trail: Vec[], charge: number, invuln: number, time: number) {
  ctx.save()
  trail.forEach((t, i) => {
    ctx.globalAlpha = (i / trail.length) * 0.35
    ctx.fillStyle = PALETTE.goldLight
    ctx.beginPath()
    ctx.arc(t.x, t.y, 2 + (i / trail.length) * 5, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = invuln > 0 && Math.floor(time * 14) % 2 === 0 ? 0.35 : 1
  const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 26)
  g.addColorStop(0, 'rgba(255,248,230,1)')
  g.addColorStop(0.35, 'rgba(219,210,193,0.7)')
  g.addColorStop(1, 'rgba(146,98,35,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(p.x, p.y, 26, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff8e6'
  ctx.beginPath()
  ctx.arc(p.x, p.y, 6, 0, Math.PI * 2)
  ctx.fill()
  if (charge > 0) {
    ctx.globalAlpha = 1
    ctx.strokeStyle = charge >= 1 ? PALETTE.goldLight : PALETTE.parchment
    ctx.lineWidth = charge >= 1 ? 3 : 2
    ctx.beginPath()
    ctx.arc(p.x, p.y, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * charge)
    ctx.stroke()
  }
  ctx.restore()
}
