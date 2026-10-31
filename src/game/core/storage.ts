import { CHAPTERS, TOTAL_FRAGMENTS } from '../lore'

export type Save = {
  unlocked: number
  stars: Record<string, number>
  best: Record<string, number>
  memories: string[]
  achievements: string[]
  plays: number
  streak: number
  lastDay: string
  endlessBest: number
  muted: boolean
}

const KEY = 'asgard-save-v1'

const empty = (): Save => ({
  unlocked: 0,
  stars: {},
  best: {},
  memories: [],
  achievements: [],
  plays: 0,
  streak: 0,
  lastDay: '',
  endlessBest: 0,
  muted: false,
})

export function loadSave(): Save {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    return { ...empty(), ...(JSON.parse(raw) as Partial<Save>) }
  } catch {
    return empty()
  }
}

export function writeSave(s: Save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // storage unavailable — progress lives only in memory
  }
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10)

/** Updates the daily streak; returns the new save and whether it's a new day. */
export function touchDay(s: Save): { save: Save; newDay: boolean } {
  const today = dayKey(new Date())
  if (s.lastDay === today) return { save: s, newDay: false }
  const yesterday = dayKey(new Date(Date.now() - 86400000))
  const streak = s.lastDay === yesterday ? s.streak + 1 : 1
  const save = { ...s, lastDay: today, streak }
  if (streak >= 3 && !save.achievements.includes('streak3')) save.achievements = [...save.achievements, 'streak3']
  return { save, newDay: true }
}

/** Index of today's "dream of the day" chapter among unlocked ones. */
export function dailyChapter(s: Save): number {
  const today = dayKey(new Date())
  let h = 0
  for (const ch of today) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % (Math.min(s.unlocked, CHAPTERS.length - 1) + 1)
}

/** Pick fragments for a run: unseen ones first, then random. */
export function pickFragments(s: Save, chapterIdx: number, n: number): string[] {
  const all = CHAPTERS[chapterIdx]?.fragments ?? []
  const unseen = all.filter((f) => !s.memories.includes(f))
  const seen = all.filter((f) => s.memories.includes(f)).sort(() => Math.random() - 0.5)
  return [...unseen.sort(() => Math.random() - 0.5), ...seen].slice(0, n)
}

/** Derived achievements that depend on overall progress. */
export function progressAchievements(s: Save): string[] {
  const out: string[] = []
  if (s.memories.length >= TOTAL_FRAGMENTS / 2) out.push('half')
  if (s.memories.length >= TOTAL_FRAGMENTS) out.push('all')
  if (CHAPTERS.every((c) => (s.stars[c.id] ?? 0) >= 3)) out.push('ace')
  if ((s.stars['shell'] ?? 0) > 0) out.push('first')
  if ((s.stars['rabbit'] ?? 0) > 0) out.push('home')
  return out.filter((a) => !s.achievements.includes(a))
}
