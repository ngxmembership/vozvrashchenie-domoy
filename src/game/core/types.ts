export const W = 960
export const H = 600

export type Vec = { x: number; y: number }

export type EndResult = {
  win: boolean
  score: number
  stars: number
  /** Extra stat, e.g. distance in metres for the rabbit hole. */
  distance?: number
}

export type ModeEvents = {
  onFragment: (text: string) => void
  onAchievement: (id: string) => void
  onEnd: (result: EndResult) => void
}

export type ModeOptions = {
  fragments: string[]
  events: ModeEvents
  endless: boolean
}

export type ModeHud = {
  score: number
  progress: number
  progressLabel: string
  lives?: number
  maxLives?: number
  timeLeft?: number
  charge?: number
  hint: string
  message: string
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a)
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1))
export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y)
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!

export const C = {
  black: '#080808',
  parchment: '#DBD2C1',
  gold: '#926223',
  goldLight: '#C8964A',
  gray: '#5f6360',
  grayLight: '#A0A09F',
  red: '#E82020',
  sky: '#7FA7C9',
}
