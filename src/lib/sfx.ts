// Tiny procedural SFX (no external audio files needed)
// Uses WebAudio; safe fallback if AudioContext isn't available.

export type SfxName = 'intro' | 'tick'

function getCtx() {
  const Ctx = window.AudioContext || (window as any).webkitAudioContext
  if (!Ctx) return null
  return new Ctx()
}

let ctx: AudioContext | null = null

function ensureCtx() {
  if (!ctx) ctx = getCtx()
  return ctx
}

export async function sfx(name: SfxName, volume = 0.18) {
  const c = ensureCtx()
  if (!c) return
  if (c.state === 'suspended') {
    try {
      await c.resume()
    } catch {
      // ignore
    }
  }

  const t0 = c.currentTime
  const master = c.createGain()
  master.gain.value = Math.max(0, Math.min(1, volume))
  master.connect(c.destination)

  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain)
  gain.connect(master)

  if (name === 'tick') {
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(920, t0)
    osc.frequency.exponentialRampToValueAtTime(520, t0 + 0.06)
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08)
    osc.start(t0)
    osc.stop(t0 + 0.085)
    return
  }

  // intro: a short cinematic "ta-dum" style swell (not identical; just vibe)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(110, t0)
  osc.frequency.exponentialRampToValueAtTime(220, t0 + 0.22)
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(0.55, t0 + 0.08)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42)
  osc.start(t0)
  osc.stop(t0 + 0.45)

  // sparkle layer
  const o2 = c.createOscillator()
  const g2 = c.createGain()
  o2.type = 'triangle'
  o2.frequency.setValueAtTime(880, t0 + 0.06)
  o2.frequency.exponentialRampToValueAtTime(1320, t0 + 0.18)
  g2.gain.setValueAtTime(0.0001, t0 + 0.06)
  g2.gain.exponentialRampToValueAtTime(0.18, t0 + 0.09)
  g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22)
  o2.connect(g2)
  g2.connect(master)
  o2.start(t0 + 0.06)
  o2.stop(t0 + 0.24)
}
