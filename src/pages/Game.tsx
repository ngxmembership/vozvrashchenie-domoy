import { useEffect, useRef, useState } from 'react'
import { CodexScreen } from '../components/game/Codex'
import { GameCanvas } from '../components/game/GameCanvas'
import { MapScreen } from '../components/game/MapScreen'
import { ResultScreen } from '../components/game/ResultScreen'
import { ChapterScreen, IntroScreen, SleepScreen } from '../components/game/Screens'
import { setMuted } from '../game/core/sound'
import { dailyChapter, loadSave, pickFragments, progressAchievements, touchDay, writeSave, type Save } from '../game/core/storage'
import type { EndResult } from '../game/core/types'
import { CHAPTERS } from '../game/lore'
import '../game/game.css'

type Phase = 'intro' | 'sleep' | 'map' | 'chapter' | 'playing' | 'result' | 'codex'
const RABBIT = CHAPTERS.length - 1

export default function Game() {
  const [save, setSave] = useState<Save>(() => touchDay(loadSave()).save)
  const saveRef = useRef(save)
  saveRef.current = save
  const [phase, setPhase] = useState<Phase>('intro')
  const [idx, setIdx] = useState(0)
  const [endless, setEndless] = useState(false)
  const [runKey, setRunKey] = useState(0)
  const [runFragments, setRunFragments] = useState<string[]>([])
  const [runFound, setRunFound] = useState<string[]>([])
  const [runAch, setRunAch] = useState<string[]>([])
  const [result, setResult] = useState<{ r: EndResult; best: number; newRecord: boolean } | null>(null)
  const prevMemories = useRef<string[]>([])

  const persist = (fn: (s: Save) => Save) => {
    setSave((prev) => {
      const next = fn(prev)
      writeSave(next)
      return next
    })
  }

  useEffect(() => {
    writeSave(save)
    setMuted(save.muted)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const daily = dailyChapter(save)
  const chapter = CHAPTERS[endless ? RABBIT : idx] ?? CHAPTERS[0]!
  const isDaily = !endless && idx === daily

  const play = (chapterIdx: number, isEndless: boolean) => {
    setIdx(chapterIdx)
    setEndless(isEndless)
    setRunFragments(pickFragments(saveRef.current, isEndless ? RABBIT : chapterIdx, 3))
    prevMemories.current = saveRef.current.memories
    setRunFound([])
    setRunAch([])
    setRunKey((k) => k + 1)
    setPhase('playing')
  }

  const addAchievement = (id: string) => {
    if (saveRef.current.achievements.includes(id)) return
    setRunAch((a) => (a.includes(id) ? a : [...a, id]))
    persist((s) => (s.achievements.includes(id) ? s : { ...s, achievements: [...s.achievements, id] }))
  }

  const onEnd = (r: EndResult) => {
    const s0 = saveRef.current
    const score = isDaily ? r.score * 2 : r.score
    const final = { ...r, score }
    const prevBest = endless ? s0.endlessBest : (s0.best[chapter.id] ?? 0)
    const value = endless ? (r.distance ?? 0) : score
    const newRecord = value > prevBest && (r.win || endless)
    let next: Save = { ...s0, plays: s0.plays + 1 }
    if (endless) next.endlessBest = Math.max(s0.endlessBest, r.distance ?? 0)
    else if (r.win) {
      next.stars = { ...s0.stars, [chapter.id]: Math.max(s0.stars[chapter.id] ?? 0, r.stars) }
      next.best = { ...s0.best, [chapter.id]: Math.max(prevBest, score) }
      next.unlocked = Math.min(CHAPTERS.length - 1, Math.max(s0.unlocked, idx + 1))
    }
    const extra = progressAchievements(next)
    if (extra.length) {
      next = { ...next, achievements: [...next.achievements, ...extra] }
      setRunAch((a) => [...a, ...extra.filter((x) => !a.includes(x))])
    }
    writeSave(next)
    setSave(next)
    setResult({ r: final, best: Math.max(prevBest, value), newRecord })
    setPhase('result')
  }

  return (
    <div className="asgard-bg min-h-screen w-full overflow-x-hidden text-[#DBD2C1]">
      <header className="flex items-center justify-between border-b border-[#926223]/40 px-6 py-3">
        <button
          type="button"
          onClick={() => setPhase(save.plays > 0 ? 'map' : 'intro')}
          className="font-forum text-xl text-[#DBD2C1] transition-colors hover:text-[#C8964A]"
        >
          Возвращен<span className="text-[#926223]">ϟ</span>е домой
        </button>
        <span className="font-play hidden text-xs uppercase tracking-[0.3em] text-[#A0A09F] sm:block">
          Семь снов · {save.memories.length} фрагментов памяти
        </span>
      </header>

      {phase === 'intro' && (
        <IntroScreen hasProgress={save.plays > 0} onHome={() => setPhase(save.plays > 0 ? 'map' : 'chapter')} onSleep={() => setPhase('sleep')} />
      )}
      {phase === 'sleep' && <SleepScreen onWake={() => setPhase('intro')} />}
      {phase === 'map' && (
        <MapScreen
          save={save}
          daily={daily}
          onPick={(i) => {
            setIdx(i)
            setEndless(false)
            setPhase('chapter')
          }}
          onEndless={() => play(RABBIT, true)}
          onCodex={() => setPhase('codex')}
          onToggleSound={() => {
            setMuted(!save.muted)
            persist((s) => ({ ...s, muted: !s.muted }))
          }}
        />
      )}
      {phase === 'codex' && <CodexScreen save={save} onBack={() => setPhase('map')} />}
      {phase === 'chapter' && (
        <ChapterScreen index={idx} chapter={chapter} daily={isDaily} onStart={() => play(idx, false)} onBack={() => setPhase('map')} />
      )}
      {phase === 'playing' && (
        <GameCanvas
          key={runKey}
          chapter={chapter}
          chapterIdx={idx}
          fragments={runFragments}
          endless={endless}
          onFragment={(t) => {
            setRunFound((f) => (f.includes(t) ? f : [...f, t]))
            persist((s) => (s.memories.includes(t) ? s : { ...s, memories: [...s.memories, t] }))
          }}
          onAchievement={addAchievement}
          onEnd={onEnd}
          onRestart={() => play(idx, endless)}
          onExit={() => setPhase('map')}
        />
      )}
      {phase === 'result' && result && (
        <ResultScreen
          chapter={chapter}
          chapterIdx={idx}
          endless={endless}
          result={result.r}
          best={result.best}
          newRecord={result.newRecord}
          daily={isDaily}
          memories={runFound.map((text) => ({ text, isNew: !prevMemories.current.includes(text) }))}
          achievements={runAch}
          remaining={chapter.fragments.filter((f) => !save.memories.includes(f)).length}
          onNext={() => {
            setIdx(idx + 1)
            setPhase('chapter')
          }}
          onRetry={() => play(idx, endless)}
          onMap={() => setPhase('map')}
        />
      )}
    </div>
  )
}
