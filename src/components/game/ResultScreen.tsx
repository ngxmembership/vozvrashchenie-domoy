import { useEffect } from 'react'
import { Award, Star } from 'lucide-react'
import { Button } from '../../lib/shadcn/button'
import { sfx } from '../../game/core/sound'
import type { EndResult } from '../../game/core/types'
import { ACHIEVEMENTS, CHAPTERS, type Chapter } from '../../game/lore'
import { goldButton, grayButton } from './Screens'

type Props = {
  chapter: Chapter
  chapterIdx: number
  endless: boolean
  result: EndResult
  best: number
  newRecord: boolean
  daily: boolean
  memories: { text: string; isNew: boolean }[]
  achievements: string[]
  remaining: number
  onNext: () => void
  onRetry: () => void
  onMap: () => void
}

export function ResultScreen(p: Props) {
  const { result } = p
  const next = CHAPTERS[p.chapterIdx + 1]
  const isFinale = !p.endless && result.win && p.chapterIdx === CHAPTERS.length - 1

  useEffect(() => {
    const timers = Array.from({ length: result.stars }, (_, i) => window.setTimeout(() => sfx.star(i), 500 + i * 350))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [result.stars])

  const title = p.endless
    ? `${result.distance ?? 0} метров`
    : isFinale
      ? 'Добро пожаловать домой!'
      : result.win
        ? 'Глава пройдена'
        : 'Вы снова уснули'

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 px-6 py-12 text-center animate-in fade-in zoom-in-95 duration-700">
      <p className="font-play text-sm uppercase tracking-[0.4em] text-[#926223]">
        {p.endless ? 'Бесконечная нора' : `Глава ${p.chapterIdx + 1} · ${p.chapter.title}`}
      </p>
      <h2 className={`font-forum text-5xl md:text-6xl ${result.win || p.endless ? 'text-[#DBD2C1]' : 'text-[#E82020]'}`}>{title}</h2>
      {isFinale && <p className="font-forum text-xl text-[#C8964A]">Занавес поднят. Иди домой и... люби свою семью.</p>}
      {!result.win && !p.endless && (
        <p className="font-forum text-lg text-[#A0A09F]">В большинстве ситуаций паниковать не имеешь права, в остальных — не имеет смысла.</p>
      )}

      {!p.endless && result.win && (
        <div className="flex gap-3">
          {[0, 1, 2].map((i) => (
            <Star
              key={i}
              style=undefined
              className={`h-12 w-12 animate-in zoom-in-0 spin-in-45 duration-500 fill-mode-both ${
                i < result.stars ? 'fill-[#C8964A] text-[#C8964A] drop-shadow-[0_0_12px_rgba(200,150,74,0.8)]' : 'text-[#5f6360]'
              }`}
            />
          ))}
        </div>
      )}

      <div className="font-play flex items-center gap-6 text-[#DBD2C1]">
        <span>
          Очки: <b className="text-[#C8964A]">{result.score}</b>
          {p.daily && <span className="ml-1 text-xs text-[#C8964A]">(x2 сон дня)</span>}
        </span>
        <span className="text-[#A0A09F]">
          Рекорд: {p.best}
          {p.endless ? ' м' : ''}
        </span>
        {p.newRecord && <span className="animate-pulse text-xs uppercase tracking-widest text-[#C8964A]">новый рекорд!</span>}
      </div>

      {p.memories.length > 0 && (
        <ul className="font-forum w-full space-y-2 border-y border-[#926223]/40 py-4 text-left">
          {p.memories.map((m, i) => (
            <li
              key={i}
              style=undefined
              className="flex gap-3 text-[#DBD2C1]/90 animate-in fade-in slide-in-from-left-4 duration-500 fill-mode-both"
            >
              <span className="text-[#926223]">ϟ</span>
              <span className="flex-1">{m.text}</span>
              {m.isNew && <span className="font-play self-center text-[10px] uppercase tracking-widest text-[#C8964A]">новое</span>}
            </li>
          ))}
        </ul>
      )}

      {p.achievements.length > 0 && (
        <div className="flex w-full flex-col gap-2">
          {p.achievements.map((id) => {
            const a = ACHIEVEMENTS.find((x) => x.id === id)
            if (!a) return null
            return (
              <div key={id} className="flex items-center gap-3 border border-[#C8964A]/60 bg-[#926223]/10 px-4 py-2 text-left animate-in fade-in zoom-in-95 duration-500">
                <Award className="h-6 w-6 text-[#C8964A]" />
                <div>
                  <p className="font-forum text-lg text-[#DBD2C1]">Озарение: {a.title}</p>
                  <p className="font-play text-xs text-[#A0A09F]">{a.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!p.endless && p.remaining > 0 && (
        <p className="font-play text-sm text-[#A0A09F]">
          В этой главе скрыто ещё <span className="text-[#C8964A]">{p.remaining}</span> фрагмент(ов) памяти — пройдите её снова.
        </p>
      )}
      {!p.endless && result.win && next && (
        <p className="font-play text-sm text-[#A0A09F]">
          Дальше: <span className="text-[#DBD2C1]">{next.title}</span> — новая механика «{next.mechanic}»
        </p>
      )}
      {isFinale && <p className="font-play text-sm text-[#C8964A]">Открыта бесконечная кроличья нора!</p>}

      <div className="flex flex-wrap justify-center gap-3 pt-2">
        {!p.endless && result.win && next && (
          <Button className={goldButton} onClick={p.onNext}>
            ДАЛЬШЕ
          </Button>
        )}
        <Button className={result.win && next && !p.endless ? grayButton : goldButton} onClick={p.onRetry}>
          {result.win ? 'ЕЩЁ РАЗ' : 'ПРОСНУТЬСЯ СНОВА'}
        </Button>
        <Button className={grayButton} onClick={p.onMap}>
          КАРТА
        </Button>
      </div>
    </div>
  )
}
