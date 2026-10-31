/** Tiny synthesized sound engine (WebAudio, no external files). */
let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = false
let drone: { stop: () => void } | null = null

function ac(): AudioContext | null {
  if (muted) return null
  if (!ctx) {
    try {
      ctx = new AudioContext()
      master = ctx.createGain()
      master.gain.value = 0.35
      master.connect(ctx.destination)
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, slideTo?: number, delay = 0) {
  const a = ac()
  if (!a || !master) return
  const t = a.currentTime + delay
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g)
  g.connect(master)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function noise(dur: number, vol = 0.2, freq = 1200) {
  const a = ac()
  if (!a || !master) return
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const src = a.createBufferSource()
  src.buffer = buf
  const f = a.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = freq
  const g = a.createGain()
  g.gain.value = vol
  src.connect(f)
  f.connect(g)
  g.connect(master)
  src.start()
}

export const sfx = {
  click: () => tone(660, 0.06, 'triangle', 0.15),
  hit: () => tone(320 + Math.random() * 80, 0.08, 'square', 0.08),
  bounce: () => tone(520, 0.05, 'sine', 0.12),
  crack: () => noise(0.12, 0.25, 900),
  hurt: () => {
    tone(180, 0.3, 'sawtooth', 0.15, 60)
    noise(0.2, 0.15, 300)
  },
  chime: () => [880, 1108, 1318, 1760].forEach((f, i) => tone(f, 0.5, 'sine', 0.12, undefined, i * 0.07)),
  wave: (strong: boolean) => (strong ? tone(120, 0.6, 'sawtooth', 0.2, 40) : tone(400, 0.3, 'sine', 0.15, 200)),
  pickup: () => tone(990, 0.1, 'triangle', 0.12, 1480),
  wrong: () => tone(140, 0.25, 'square', 0.1, 90),
  win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.6, 'triangle', 0.14, undefined, i * 0.11)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.5, 'sine', 0.14, undefined, i * 0.16)),
  star: (i: number) => tone(784 * Math.pow(1.26, i), 0.35, 'triangle', 0.15),
}

export function startDrone(base = 55) {
  stopDrone()
  const a = ac()
  if (!a || !master) return
  const g = a.createGain()
  g.gain.value = 0
  g.gain.linearRampToValueAtTime(0.08, a.currentTime + 2)
  const f = a.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = 400
  const oscs = [base, base * 1.5, base * 2.01].map((fr) => {
    const o = a.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = fr
    o.connect(f)
    o.start()
    return o
  })
  f.connect(g)
  g.connect(master)
  drone = {
    stop: () => {
      const t = a.currentTime
      g.gain.cancelScheduledValues(t)
      g.gain.setValueAtTime(g.gain.value, t)
      g.gain.linearRampToValueAtTime(0, t + 0.8)
      oscs.forEach((o) => o.stop(t + 0.9))
    },
  }
}

export function stopDrone() {
  drone?.stop()
  drone = null
}

export function setMuted(m: boolean) {
  muted = m
  if (m) stopDrone()
}
