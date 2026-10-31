import { Fx, vignette } from './fx'
import { sfx } from './sound'
import type { EndResult, ModeHud, ModeOptions, Vec } from './types'

/** Shared plumbing for all chapter mini-games. */
export abstract class BaseMode {
  fx = new Fx()
  time = 0
  score = 0
  done = false
  message = ''
  messageTimer = 0
  keys = new Set<string>()
  pointer: Vec | null = null
  pointerDown = false
  protected opts: ModeOptions
  protected fragIdx = 0
  private achieved = new Set<string>()

  constructor(opts: ModeOptions) {
    this.opts = opts
  }

  get endless() {
    return this.opts.endless
  }

  say(text: string, dur = 3.5) {
    this.message = text
    this.messageTimer = dur
  }

  /** Reveal the next memory fragment of this run. */
  reveal(at: Vec) {
    const text = this.opts.fragments[this.fragIdx]
    this.fragIdx++
    this.fx.burst(at, '#C8964A', 40, 220)
    this.fx.flash('#DBD2C1', 0.25)
    sfx.chime()
    if (!text) return
    this.opts.events.onFragment(text)
    this.say(text, 5)
  }

  achieve(id: string) {
    if (this.achieved.has(id)) return
    this.achieved.add(id)
    this.opts.events.onAchievement(id)
  }

  finish(result: Omit<EndResult, 'score'> & { score?: number }) {
    if (this.done) return
    this.done = true
    if (result.win) {
      sfx.win()
      this.fx.flash('#fff6e0', 0.7)
    } else {
      sfx.lose()
      this.fx.flash('#000', 0.6)
    }
    this.opts.events.onEnd({ ...result, score: result.score ?? Math.round(this.score) })
  }

  step(dt: number) {
    this.messageTimer = Math.max(0, this.messageTimer - dt)
    this.fx.update(dt)
    if (this.fx.freeze > 0) {
      this.fx.freeze -= dt
      return
    }
    this.time += dt
    if (!this.done) this.update(dt)
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.save()
    this.fx.applyShake(ctx)
    this.draw(ctx)
    this.fx.draw(ctx)
    ctx.restore()
    vignette(ctx, 0.6)
    this.fx.drawOverlay(ctx)
  }

  hudBase(): Pick<ModeHud, 'score' | 'message'> {
    return { score: Math.round(this.score), message: this.messageTimer > 0 ? this.message : '' }
  }

  onPointerDown(_p: Vec) {}
  onPointerMove(_p: Vec) {}
  onPointerUp(_p: Vec) {}
  onKeyDown(_code: string) {}
  onKeyUp(_code: string) {}

  /** Normalised direction from WASD / arrows. */
  keyDir(): Vec {
    const k = this.keys
    return {
      x: (k.has('ArrowRight') || k.has('KeyD') ? 1 : 0) - (k.has('ArrowLeft') || k.has('KeyA') ? 1 : 0),
      y: (k.has('ArrowDown') || k.has('KeyS') ? 1 : 0) - (k.has('ArrowUp') || k.has('KeyW') ? 1 : 0),
    }
  }

  abstract update(dt: number): void
  abstract draw(ctx: CanvasRenderingContext2D): void
  abstract hud(): ModeHud
}
