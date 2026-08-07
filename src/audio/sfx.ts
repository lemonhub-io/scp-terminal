let ctx: AudioContext | null = null

function getCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') {
    return null
  }
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

export function ensureAudio(): AudioContext | null {
  const Ctor = getCtor()
  if (!Ctor) {
    return null
  }
  if (!ctx) {
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

function tone(
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType,
  volume: number,
  slideTo?: number,
): void {
  if (!ctx) {
    return
  }
  const now = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, now)
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration)
  }
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(volume, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration + 0.02)
}

export function playPowerOn(): void {
  const c = ensureAudio()
  if (!c) {
    return
  }
  tone(70, 0, 0.4, 'sine', 0.26, 200)
  tone(880, 0.08, 0.12, 'sine', 0.1)
  tone(1320, 0.2, 0.16, 'sine', 0.09, 880)
}

export function playTick(): void {
  const c = ensureAudio()
  if (!c) {
    return
  }
  tone(1500, 0, 0.03, 'triangle', 0.022)
}

export function playKeyClick(): void {
  const c = ensureAudio()
  if (!c) {
    return
  }
  tone(1150, 0, 0.035, 'triangle', 0.03)
}

export function playKeyFunc(): void {
  const c = ensureAudio()
  if (!c) {
    return
  }
  tone(700, 0, 0.045, 'triangle', 0.026)
}

export function playBootDone(): void {
  const c = ensureAudio()
  if (!c) {
    return
  }
  tone(660, 0, 0.14, 'sine', 0.15)
  tone(990, 0.16, 0.22, 'sine', 0.15)
}
