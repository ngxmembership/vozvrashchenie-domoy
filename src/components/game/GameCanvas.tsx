import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Pause, Play, RotateCcw, Map as MapIcon, Waves } from 'lucide-react'
import type { BaseMode } from '../../game/core/base'
import { startDrone, stopDrone } from '../../game/core/sound'
import { H, W, type EndResult, type ModeHud } from '../../game/core/types'
import type { Chapter } from '../../game/lore'
import { WebMode, createMode } from '../../game/modes'
import { goldButton, grayButton } from './Screens'
import { Button } from '../../lib/shadcn/button'

type Props = {
  chapter: Chapter
  chapterIdx: number
  fragments: string[]
  endless: boolean
  onFragment: (text: string) => void
  onAchievement: (id: string) => void
  onEnd: (r: EndResult) => void
  onRestart: () => void
  onExit: () => void
}

const KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'])

export function GameCanvas(props: Props) {
  const { chapter, chapterIdx, endless } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modeRef = useRef<BaseMode | null>(null)
  const pausedRef = useRef(false)
  const cb = useRef(props)
  cb.current = props
  const [hud, setHud] = useState<ModeHud | null>(null)
  const [paused, setPaused] = useState(false)
  const [found, setFound] = useState<string[]>([])

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    let endTimer = 0
    const mode = createMode(chapter.id, {
      fragments: props.fragments,
      endless,
      events: {
        onFragment: (t) => {
          setFound((f) => [...f, t])
          cb.current.onFragment(t)
        },
        onAchievement: (id) => cb.current.onAchievement(id),
        onEnd: (r) => {
          endTimer = window.setTimeout(() => cb.current.onEnd(r), 1100)
        },
      },
    })
    modeRef.current = mode
    startDrone(chapter.drone)

    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!pausedRef.current) mode.step(dt)
      mode.render(ctx)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const hudTimer = window.setInterval(() => setHud(mode.hud()), 100)

    const down = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (!mode.done) setPaused((p) => !p)
        return
      }
      if (!KEYS.has(e.code)) return
      e.preventDefault()
      if (e.repeat) return
      mode.keys.add(e.code)
      mode.onKeyDown(e.code)
    }
    const up = (e: KeyboardEvent) => {
      mode.keys.delete(e.code)
      mode.onKeyUp(e.code)
    }
    const blur = () => {
      if (!mode.done) setPaused(true)
      mode.keys.clear()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(hudTimer)
      window.clearTimeout(endTimer)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      stopDrone()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toGame = (e: ReactPointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }

  const isWeb = modeRef.current instanceof WebMode
  const cursor = chapter.id === 'scenery' ? 'cursor-none' : chapter.id === 'circles' || chapter.id === 'magic' ? 'cursor-crosshair' : ''

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row">
      <div className="min-w-0 flex-1">
        <div className="font-play mb-2 flex flex-wrap items-center justify-between gap-3 text-sm text-[#A0A09F]">
          <div className="flex items-baseline gap-3">
            <span className="uppercase tracking-[0.3em] text-[#926223]">
              {endless ? 'Бесконечная нора' : `Глава ${chapterIdx + 1} · ${chapter.mechanic}`}
            </span>
            <span className="font-forum text-xl text-[#DBD2C1]">{chapter.title}</span>
          </div>
          <div className="flex items-center gap-4">
            {hud?.timeLeft !== undefined && (
              <span className={hud.timeLeft < 10 ? 'text-[#E82020] animate-pulse' : 'text-[#DBD2C1]'}>{Math.ceil(hud.timeLeft)} с</span>
            )}
            {hud?.lives !== undefined && (
              <span className="flex gap-1" aria-label={`Жизни: ${hud.lives}`}>
                {Array.from({ length: hud.maxLives ?? 3 }, (_, i) => (
                  <span key={i} className={i < (hud.lives ?? 0) ? 'text-[#C8964A]' : 'text-[#5f6360]/50'}>
                    ϟ
                  </span>
                ))}
              </span>
            )}
            <span className="text-[#DBD2C1]">{hud?.score ?? 0} очк.</span>
            <button type="button" aria-label="Пауза" onClick={() => setPaused((p) => !p)} className="text-[#A0A09F] hover:text-[#DBD2C1] transition-colors">
              <Pause className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mb-2 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden bg-[#5f6360]/40">
            <div className="h-full bg-[#C8964A] transition-all duration-300" style=undefined />
          </div>
          <span className="font-play min-w-28 text-right text-xs text-[#DBD2C1]">{hud?.progressLabel ?? ''}</span>
        </div>

        <div className="relative border border-[#926223]/60 shadow-[0_0_40px_rgba(146,98,35,0.15)]">
          <canvas
            ref={canvasRef}
            className={`block aspect-[8/5] w-full touch-none select-none ${cursor}`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              const m = modeRef.current
              if (!m || pausedRef.current) return
              const p = toGame(e)
              m.pointer = p
              m.pointerDown = true
              m.onPointerDown(p)
            }}
            onPointerMove={(e) => {
              const m = modeRef.current
              if (!m) return
              const p = toGame(e)
              m.pointer = p
              m.onPointerMove(p)
            }}
            onPointerUp={(e) => {
              const m = modeRef.current
              if (!m) return
              m.pointerDown = false
              m.onPointerUp(toGame(e))
            }}
            onContextMenu={(e) => e.preventDefault()}
          />
          {hud?.message && !paused && (
            <div className="font-forum pointer-events-none absolute inset-x-0 bottom-4 mx-auto w-fit max-w-[90%] animate-in fade-in bg-[#080808]/85 px-5 py-2 text-center text-lg text-[#DBD2C1] shadow-lg">
              {hud.message}
            </div>
          )}
          {paused && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#080808]/85 p-6 text-center">
              <h3 className="font-forum text-4xl text-[#DBD2C1]">Пауза</h3>
              <ul className="font-play space-y-1 text-sm text-[#A0A09F]">
                {chapter.howTo.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
              <div className="flex flex-wrap justify-center gap-3">
                <Button className={goldButton} onClick={() => setPaused(false)}>
                  <Play className="h-4 w-4" /> ДАЛЬШЕ
                </Button>
                <Button className={grayButton} onClick={props.onRestart}>
                  <RotateCcw className="h-4 w-4" /> ЗАНОВО
                </Button>
                <Button className={grayButton} onClick={props.onExit}>
                  <MapIcon className="h-4 w-4" /> КАРТА
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          {isWeb && (
            <>
              <button
                type="button"
                className="font-forum flex touch-none select-none items-center gap-2 border border-[#926223] px-4 py-2 tracking-[0.2em] text-[#DBD2C1] hover:bg-[#926223]/30"
                onPointerDown={() => (modeRef.current as WebMode | null)?.startCharge()}
                onPointerUp={() => (modeRef.current as WebMode | null)?.release()}
                onPointerLeave={() => (modeRef.current as WebMode | null)?.release()}
              >
                <Waves className="h-4 w-4" />
                ВОЛНА
              </button>
              <div className="h-2 w-32 overflow-hidden bg-[#5f6360]/40">
                <div
                  className={(hud?.charge ?? 0) >= 1 ? 'h-full bg-[#C8964A]' : 'h-full bg-[#DBD2C1]/70'}
                  style=undefined
                />
              </div>
            </>
          )}
          <span className="font-play text-xs text-[#A0A09F]">{hud?.hint}</span>
          <span className="font-play ml-auto text-xs text-[#5f6360]">Esc — пауза</span>
        </div>
      </div>

      <aside className="w-full border border-[#5f6360]/50 p-4 lg:w-72">
        <h3 className="font-forum mb-1 text-xl text-[#C8964A]">Вернувшаяся память</h3>
        <p className="font-play mb-3 text-xs text-[#A0A09F]">«{chapter.epigraph}»</p>
        {found.length === 0 ? (
          <p className="font-play text-sm text-[#A0A09F]">Пока пусто. Продвигайтесь — фрагменты откроются.</p>
        ) : (
          <ul className="font-forum space-y-2 text-[#DBD2C1]/90">
            {found.map((m, i) => (
              <li key={i} className="flex gap-2 text-sm leading-snug animate-in fade-in slide-in-from-right-4 duration-500">
                <span className="text-[#926223]">ϟ</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}
