import { BookOpen, Flame, Infinity as InfinityIcon, Lock, Star, Volume2, VolumeX } from 'lucide-react'
import type { Save } from '../../game/core/storage'
import { ACHIEVEMENTS, CHAPTERS, TOTAL_FRAGMENTS } from '../../game/lore'
import { ReportButton } from './Screens'

const POS = [
  { x: 50, y: 12 },
  { x: 33, y: 31 },
  { x: 67, y: 31 },
  { x: 20, y: 54 },
  { x: 50, y: 52 },
  { x: 80, y: 54 },
  { x: 50, y: 80 },
]

type Props = {
  save: Save
  daily: number
  onPick: (idx: number) => void
  onEndless: () => void
  onCodex: () => void
  onToggleSound: () => void
}

export function MapScreen({ save, daily, onPick, onEndless, onCodex, onToggleSound }: Props) {
  const totalStars = CHAPTERS.reduce((n, c) => n + (save.stars[c.id] ?? 0), 0)
  const endlessOpen = (save.stars['rabbit'] ?? 0) > 0
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 animate-in fade-in duration-700">
      <div className="font-play mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="Память" value={`${save.memories.length}/${TOTAL_FRAGMENTS}`} pct={save.memories.length / TOTAL_FRAGMENTS} />
        <Stat label="Звёзды" value={`${totalStars}/${CHAPTERS.length * 3}`} pct={totalStars / (CHAPTERS.length * 3)} />
        <Stat label="Озарения" value={`${save.achievements.length}/${ACHIEVEMENTS.length}`} pct={save.achievements.length / ACHIEVEMENTS.length} />
        <div className="flex items-center justify-between border border-[#5f6360]/50 px-3 py-2">
          <span className="flex items-center gap-2 text-[#A0A09F]">
            <Flame className="h-4 w-4 text-[#C8964A]" />
            Дней подряд
          </span>
          <span className="text-lg text-[#DBD2C1]">{save.streak}</span>
        </div>
      </div>

      <div className="relative mx-auto aspect-[16/11] w-full max-w-3xl">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <path d="M50 0 Q52 5 50 10" stroke="#926223" strokeWidth="0.6" fill="none" />
          {POS.slice(1).map((p, i) => {
            const prev = POS[i]!
            const lit = i + 1 <= save.unlocked
            return (
              <line
                key={i}
                x1={prev.x}
                y1={prev.y}
                x2={p.x}
                y2={p.y}
                stroke={lit ? '#C8964A' : '#5f6360'}
                strokeOpacity={lit ? 0.7 : 0.3}
                strokeWidth="0.3"
                strokeDasharray={lit ? '0' : '1 1'}
              />
            )
          })}
        </svg>
        {CHAPTERS.map((c, i) => {
          const pos = POS[i]!
          const locked = i > save.unlocked
          const stars = save.stars[c.id] ?? 0
          const isDaily = i === daily && !locked
          return (
            <button
              key={c.id}
              type="button"
              disabled={locked}
              onClick={() => onPick(i)}
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, animationDelay: `${i * 80}ms` }}
              className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 animate-in fade-in zoom-in-50 duration-500 fill-mode-both disabled:cursor-not-allowed"
            >
              <span
                className={
                  'relative flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all duration-300 md:h-20 md:w-20 ' +
                  (locked
                    ? 'border-[#5f6360]/50 bg-[#111]'
                    : 'border-[#926223] bg-[radial-gradient(circle_at_35%_30%,#3a2a18,#0d0a07)] group-hover:scale-110 group-hover:shadow-[0_0_36px_rgba(200,150,74,0.6)]') +
                  (i === save.unlocked && !locked ? ' shadow-[0_0_30px_rgba(200,150,74,0.5)]' : '')
                }
              >
                {i === save.unlocked && !locked && (
                  <span className="pointer-events-none absolute -inset-2 rounded-full border-2 border-[#C8964A]/70 animate-ping [animation-duration:2s]" />
                )}
                {locked ? <Lock className="h-5 w-5 text-[#5f6360]" /> : <span className="font-forum text-2xl text-[#DBD2C1]">{i + 1}</span>}
                {isDaily && (
                  <span className="font-play absolute -right-3 -top-2 rounded-sm bg-[#C8964A] px-1.5 text-[10px] font-bold uppercase text-[#080808]">
                    x2
                  </span>
                )}
              </span>
              <span className={`font-forum whitespace-nowrap text-sm md:text-base ${locked ? 'text-[#5f6360]' : 'text-[#DBD2C1]'}`}>{c.title}</span>
              <span className="font-play text-[10px] uppercase tracking-widest text-[#926223]">{locked ? '???' : c.mechanic}</span>
              {!locked && (
                <span className="flex gap-0.5">
                  {[0, 1, 2].map((s) => (
                    <Star key={s} className={`h-3 w-3 ${s < stars ? 'fill-[#C8964A] text-[#C8964A]' : 'text-[#5f6360]'}`} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          disabled={!endlessOpen}
          onClick={onEndless}
          className="font-forum flex items-center gap-2 border border-[#926223] px-5 py-2 tracking-[0.2em] text-[#DBD2C1] transition-colors hover:bg-[#926223]/30 disabled:cursor-not-allowed disabled:border-[#5f6360]/40 disabled:text-[#5f6360]"
        >
          {endlessOpen ? <InfinityIcon className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          БЕСКОНЕЧНАЯ НОРА
          {endlessOpen && save.endlessBest > 0 && <span className="font-play text-xs text-[#C8964A]">рекорд {save.endlessBest} м</span>}
        </button>
        <button
          type="button"
          onClick={onCodex}
          className="font-forum flex items-center gap-2 border border-[#5f6360] px-5 py-2 tracking-[0.2em] text-[#A0A09F] transition-colors hover:bg-[#5f6360]/30 hover:text-[#DBD2C1]"
        >
          <BookOpen className="h-4 w-4" />
          КНИГА ПАМЯТИ
        </button>
        <button
          type="button"
          aria-label={save.muted ? 'Включить звук' : 'Выключить звук'}
          onClick={onToggleSound}
          className="border border-[#5f6360] p-2.5 text-[#A0A09F] transition-colors hover:text-[#DBD2C1]"
        >
          {save.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <ReportButton />
      </div>
      {!endlessOpen && <p className="font-play mt-3 text-center text-xs text-[#5f6360]">Бесконечная нора откроется после 7-й главы</p>}
    </div>
  )
}

function Stat({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div className="border border-[#5f6360]/50 px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-[#A0A09F]">{label}</span>
        <span className="text-[#DBD2C1]">{value}</span>
      </div>
      <div className="mt-1.5 h-1 bg-[#5f6360]/30">
        <div className="h-full bg-[#C8964A] transition-all duration-700" style={{ width: `${Math.min(100, pct * 100)}%` }} />
      </div>
    </div>
  )
}
