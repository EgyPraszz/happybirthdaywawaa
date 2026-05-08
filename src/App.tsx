import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarDays,
  Copy,
  Pause,
  Play,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { sfx } from './lib/sfx'

type Theme = 'netflix'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function toLocalDateTimeValue(d: Date) {
  const yyyy = d.getFullYear()
  const mm = pad2(d.getMonth() + 1)
  const dd = pad2(d.getDate())
  const hh = pad2(d.getHours())
  const mi = pad2(d.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

function formatDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = s % 60
  return { days, hours, minutes, seconds }
}

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(' ')
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

const themes: Record<Theme, { ring: string }> = {
  netflix: { ring: 'focus-visible:ring-[#E50914]/60' },
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#E50914] text-black ring-1 ring-white/10">
        <span className="text-lg font-black">B</span>
      </div>
      <div className="leading-tight">
        <div className="text-[11px] uppercase tracking-[0.28em] text-white/55">BirthdayFlix</div>
        <div className="text-sm font-semibold tracking-tight text-white/90">Tonight. It’s your premiere.</div>
      </div>
    </div>
  )
}

export default function App() {
  // =========================
  // CONFIG (edit here in code)
  // =========================
  const name = 'Wawa'
  const age = 17
  // Keep it short. One line can hit harder.
  const message = 'Semoga semua hal baik pelan-pelan datang ke hidup kamu.'
  // Format: YYYY-MM-DDTHH:mm (local time)
  const dateTime = '2026-05-10T00:00'

  const [theme] = useState<Theme>('netflix')
  const [copied, setCopied] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(0.55)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const [surpriseOpen, setSurpriseOpen] = useState(false)
  const [endingActive, setEndingActive] = useState(false)

  const [intro, setIntro] = useState(true)
  const [introSkipped, setIntroSkipped] = useState(false)

  const [cursor, setCursor] = useState({ x: 0, y: 0 })
  const [cursorActive, setCursorActive] = useState(false)

  const [typed, setTyped] = useState('')
  const typingText =
    'Thank you for staying through every chapter.\n\nKarena beberapa ulang tahun dikenang bukan hanya karena harinya, tapi karena orang-orang di dalamnya. Semoga di umur yang baru ini kamu selalu dikelilingi hal-hal baik, dipertemukan dengan banyak kebahagiaan kecil, dan tetap kuat menjalani semua yang sedang kamu usahakan. Terima kasih sudah jadi seseorang yang hadir dan memberi warna di cerita ini.'

  const targetMs = useMemo(() => new Date(dateTime).getTime(), [dateTime])
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  // Opening cinematic (2–3s)
  useEffect(() => {
    let alive = true
    const run = async () => {
      try {
        await sfx('intro', 0.16)
      } catch {
        // ignore
      }
      window.setTimeout(() => {
        if (!alive) return
        // If user already started music in the intro, keep playing into the main page.
        setIntro(false)
      }, 2300)
    }
    run()
    return () => {
      alive = false
    }
  }, [])

  // Cursor spotlight
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setCursor({ x: e.clientX, y: e.clientY })
      setCursorActive(true)
    }
    const onLeave = () => setCursorActive(false)
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  // Typing effect + duck music when the letter is open
  useEffect(() => {
    const a = audioRef.current
    if (!surpriseOpen) {
      setTyped('')
      if (a) a.volume = clamp(volume, 0, 1)
      return
    }

    if (a) a.volume = clamp(volume * 0.22, 0, 1)

    let i = 0
    let raf = 0
    let last = performance.now()
    const step = (t: number) => {
      const dt = t - last
      last = t
      i += dt * 0.022
      const next = typingText.slice(0, Math.floor(i))
      setTyped(next)
      if (next.length < typingText.length) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [surpriseOpen, typingText, volume])

  const remaining = formatDuration(targetMs - now)
  const isNow = targetMs - now <= 0

  const shareText = useMemo(() => {
    const t = new Date(dateTime)
    const when = t.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })
    const headline = `Happy Birthday, ${name}.`
    const ageLine = age > 0 ? `\nTurning ${age}.` : ''
    return `${headline}${ageLine}\n\n${message}\n\nPremiere: ${when}`
  }, [name, age, message, dateTime])

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      // ignore
    }
  }

  const t = themes[theme]

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.loop = true
  }, [])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return

    const onTime = () => setCurrentTime(a.currentTime || 0)
    const onMeta = () => setDuration(a.duration || 0)
    const onEnded = () => setPlaying(false)

    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('durationchange', onMeta)
    a.addEventListener('ended', onEnded)

    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('durationchange', onMeta)
      a.removeEventListener('ended', onEnded)
    }
  }, [])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.muted = muted
  }, [muted])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.volume = clamp(volume, 0, 1)
  }, [volume])

  async function togglePlay() {
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.pause()
      setPlaying(false)
      return
    }
    try {
      await a.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  const particles = useMemo(() => {
    return Array.from({ length: 26 }).map((_, i) => {
      const left = ((i * 97) % 100) + (i % 3) * 0.7
      const top = ((i * 53) % 100) + ((i + 1) % 4) * 0.6
      const d = 5 + (i % 7)
      const size = i % 6 === 0 ? 3 : 2
      const o = 0.25 + (i % 5) * 0.08
      return { i, left, top, d, size, o }
    })
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const max = Math.max(1, el.scrollHeight - window.innerHeight)
      const p = window.scrollY / max
      setEndingActive(p > 0.74)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-dvh bg-black text-white">
      <AnimatePresence>
        {intro && (
          <motion.div
            className="fixed inset-0 z-[60] grid place-items-center bg-black"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="w-full max-w-lg px-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="text-center"
              >
                <div className="mx-auto mb-6 h-[2px] w-24 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full w-full bg-[#E50914]"
                    initial={{ x: '-100%' }}
                    animate={{ x: '0%' }}
                    transition={{ duration: 2.2, ease: 'linear' }}
                  />
                </div>
                <div className="text-[11px] uppercase tracking-[0.34em] text-white/55">
                  A special premiere is loading...
                </div>
                <div className="mt-4 text-3xl font-semibold tracking-tight text-white/92">
                  BirthdayFlix<span className="text-[#E50914]">.</span>
                </div>

                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={async () => {
                      void sfx('tick', 0.12)
                      await togglePlay()
                      setIntro(false)
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E50914] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(229,9,20,0.25)] hover:bg-[#F6121D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E50914]/60"
                  >
                    <Play className="h-4 w-4" />
                    Enter with music
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIntro(false)
                      setIntroSkipped(true)
                      void sfx('tick', 0.12)
                    }}
                    className="rounded-xl bg-white/8 px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/12 hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E50914]/60"
                  >
                    Skip intro
                  </button>
                </div>

                <div className="mt-4 text-xs text-white/45">Tip: iPhone blocks autoplaytap "Enter with music".</div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* background layers */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-black" />
        <div className="absolute inset-0 opacity-75 [background:radial-gradient(1200px_600px_at_50%_0%,rgba(229,9,20,0.22),transparent_60%)]" />
      </div>

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0">
          <motion.img
            src="/images/hero.jpg"
            alt="Cinematic hero"
            className="h-full w-full object-cover opacity-35"
            initial={{ scale: 1.08, y: 0 }}
            animate={{ scale: 1.15, y: -12 }}
            transition={{ duration: 34, ease: 'linear' }}
          />
        </div>
        <div className="ambient-gradient" />
        <div
          className={classNames(
            'red-glow transition-opacity duration-700',
            endingActive ? 'opacity-80' : 'opacity-100'
          )}
        />
        <div className="noise-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-black" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/45 to-black/88" />
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: endingActive ? 1 : 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/45 to-black" />
          <div className="absolute inset-0 opacity-70 [background:radial-gradient(900px_500px_at_50%_40%,rgba(229,9,20,0.30),transparent_62%)]" />
        </motion.div>

        {particles.map((p) => (
          <span
            key={p.i}
            className="particle"
            style={
              {
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: p.size,
                height: p.size,
                opacity: p.o,
                '--d': `${p.d}s`,
              } as React.CSSProperties
            }
          />
        ))}

        {Array.from({ length: 16 }).map((_, i) => (
          <span
            key={`s-${i}`}
            className="star"
            style={{
              left: `${(i * 61) % 100}%`,
              top: `${(i * 37) % 100}%`,
              opacity: 0.18 + (i % 6) * 0.06,
              transform: `scale(${0.8 + (i % 4) * 0.15})`,
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none fixed inset-0 z-10 hidden md:block">
        {cursorActive && (
          <div
            className="cursor-spot"
            style={{
              left: cursor.x - 220,
              top: cursor.y - 220,
              opacity: 0.55,
            }}
          />
        )}
      </div>

      <audio ref={audioRef} preload="auto" src="/audio/Stuck With U.mp3" />

      <header className="relative mx-auto w-full max-w-6xl px-5 py-6 md:py-8">
        <div className="flex items-center justify-between gap-4">
          <Brand />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className={classNames(
                'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold',
                'bg-[#E50914] text-white shadow-[0_10px_30px_rgba(229,9,20,0.25)] hover:bg-[#F6121D]',
                'focus-visible:outline-none focus-visible:ring-2',
                t.ring
              )}
              aria-pressed={playing}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? 'Pause' : 'Play'}
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-5 pb-14 md:pb-16">
        <section className="rounded-3xl border border-white/10 bg-black/35 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-md md:p-9">
          <div className="text-[11px] uppercase tracking-[0.32em] text-white/55">New release</div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 text-[42px] font-semibold tracking-tight md:text-6xl"
          >
            <span className="block text-white/92">Happy Birthday,</span>
            <span className="block">
              {name}
              <span className="text-[#E50914]">.</span>
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 flex flex-wrap items-center gap-2 text-sm text-white/70"
          >
            <span className="rounded-full bg-white/8 px-3 py-1 ring-1 ring-white/10">Turning {age}</span>
            <span className="rounded-full bg-white/8 px-3 py-1 ring-1 ring-white/10">Special</span>
            <span className="rounded-full bg-white/8 px-3 py-1 ring-1 ring-white/10">One night only</span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-[56ch] text-[15px] leading-[1.95] text-white/78 md:text-base"
          >
            <span className="italic text-white/82">Semoga semua hal baik</span>{' '}
            <span className="text-white/92 underline decoration-[#E50914]/60 decoration-2 underline-offset-4">
              pelan-pelan datang
            </span>{' '}
            <span className="text-white/78">ke hidup kamu.</span>
          </motion.p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={copyMessage}
              className={classNames(
                'inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold',
                'bg-white text-black hover:bg-white/90',
                'focus-visible:outline-none focus-visible:ring-2',
                t.ring
              )}
            >
              <Copy className="h-4 w-4" />
              {copied ? 'Copied' : 'Copy greeting'}
            </button>

            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className={classNames(
                'inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold',
                'bg-white/8 ring-1 ring-white/12 hover:bg-white/12',
                'focus-visible:outline-none focus-visible:ring-2',
                t.ring
              )}
              aria-pressed={muted}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {muted ? 'Unmute' : 'Mute'}
            </button>

            <button
              type="button"
              onClick={() => setSurpriseOpen(true)}
              className={classNames(
                'inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold',
                'bg-white/8 ring-1 ring-white/12 hover:bg-white/12',
                'focus-visible:outline-none focus-visible:ring-2',
                t.ring
              )}
            >
              <Sparkles className="h-4 w-4" />
              Open message
            </button>

            <div className="flex items-center gap-3 rounded-xl bg-white/6 px-4 py-3 ring-1 ring-white/10">
              <div className="text-xs uppercase tracking-[0.28em] text-white/55">Volume</div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-32 md:w-40"
                aria-label="Volume"
              />
            </div>
          </div>

          {/* music section */}
          <div className="mt-5 grid gap-3 md:grid-cols-[auto_1fr] md:items-center">
            <div className="flex items-center gap-3">
              <div className={classNames('vinyl', playing && 'playing')} aria-hidden="true" />
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-white/55">Now playing</div>
                <div className="mt-1 text-sm font-semibold text-white/88">Stuck With U</div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/6 p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between text-xs text-white/55">
                <div className="tabular-nums">{Math.floor(currentTime)}s</div>
                <div className="tabular-nums">{duration ? `${Math.floor(duration)}s` : '—'}</div>
              </div>
              <div className="mt-2">
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, duration || 1)}
                  step={0.1}
                  value={clamp(currentTime, 0, duration || 1)}
                  onChange={(e) => {
                    const a = audioRef.current
                    if (!a) return
                    a.currentTime = Number(e.target.value)
                    setCurrentTime(a.currentTime)
                  }}
                  className="w-full"
                  aria-label="Audio progress"
                />
              </div>
              {/* visualizer removed */}
            </div>
          </div>

          {/* countdown */}
          <div className="mt-8 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-white/6 p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-white/85">
                  <CalendarDays className="h-4 w-4" />
                  Countdown
                </div>
                <div className={classNames('text-xs', isNow ? 'text-white/85' : 'text-white/55')}>
                  {isNow ? 'The film has started.' : 'Premiere starts in…'}
                </div>
              </div>
              <div className="mt-2 text-[11px] uppercase tracking-[0.28em] text-white/45">Until your special moment</div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {(
                  [
                    { label: 'D', value: remaining.days },
                    { label: 'H', value: remaining.hours },
                    { label: 'M', value: remaining.minutes },
                    { label: 'S', value: remaining.seconds },
                  ] as const
                ).map((x) => (
                  <div key={x.label} className="rounded-xl bg-white/6 p-3 text-center ring-1 ring-white/10">
                    <div className="text-lg font-semibold tabular-nums text-white/92">{pad2(x.value)}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/45">{x.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white/6 p-4 ring-1 ring-white/10">
              <div className="text-xs uppercase tracking-[0.28em] text-white/55">Premiere</div>
              <div className="mt-2 text-sm font-semibold text-white/88">
                {new Date(dateTime).toLocaleString(undefined, {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}
              </div>
              <div className="mt-4 text-sm text-white/65">Press Play and enjoy the moment.</div>
            </div>
          </div>
        </section>

        {/* memory / gallery */}
        <motion.section
          className="mt-7 overflow-hidden rounded-3xl border border-white/10 bg-black/35 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-md"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative p-6 md:p-9">
            <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(900px_420px_at_20%_0%,rgba(229,9,20,0.26),transparent_60%)]" />
            <div className="relative">
              <div className="text-[11px] uppercase tracking-[0.32em] text-white/55">Memories</div>
              <div className="mt-4 text-2xl font-semibold tracking-tight text-white/92 md:text-3xl">
                Episodes<span className="text-[#E50914]">.</span>
              </div>
              <div className="mt-2 max-w-[70ch] text-sm leading-relaxed text-white/70">
                3 frames. 3 reasons to smile. (<span className="text-white/80"></span>.)
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {(
                  [
                    {
                      title: 'Episode I',
                      subtitle: 'Where It All Started',
                      src: '/images/memory-1.jpg',
                      tilt: '-rotate-2',
                    },
                    {
                      title: 'Episode II',
                      subtitle: 'Little Things We Keep',
                      src: '/images/memory-2.jpg',
                      tilt: 'rotate-1',
                    },
                    {
                      title: 'Episode III',
                      subtitle: 'Still My Favorite Scene',
                      src: '/images/memory-3.jpg',
                      tilt: '-rotate-1',
                    },
                  ] as const
                ).map((m) => (
                  <motion.div
                    key={m.title}
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className={classNames(
                      'group relative overflow-hidden rounded-3xl bg-white/5 ring-1 ring-white/10',
                      'shadow-[0_20px_60px_rgba(0,0,0,0.65)]'
                    )}
                  >
                    <div className={classNames('relative aspect-[4/5] transition-transform duration-500', m.tilt)}>
                      <img
                        src={m.src}
                        alt={m.subtitle}
                        className={classNames(
                          'h-full w-full object-cover opacity-90 transition duration-700',
                          'group-hover:scale-[1.06]'
                        )}
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/85" />
                    </div>
                    <div className="p-5">
                      <div className="text-[11px] uppercase tracking-[0.32em] text-white/55">{m.title}</div>
                      <div className="mt-2 text-base font-semibold text-white/90">{m.subtitle}</div>
                      <div className="mt-3 text-sm text-white/60">Hover for a closer look.</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* moment surprise / ending scene */}
        <div className="mt-7 rounded-3xl border border-white/10 bg-black/35 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-md md:p-9">
          <div className="text-[11px] uppercase tracking-[0.32em] text-white/55">Ending scene</div>
          <div className="mt-4 text-2xl font-semibold tracking-tight text-white/92 md:text-3xl">
            Thank you for being part of this story.
          </div>
          <div className="mt-3 max-w-[72ch] text-sm leading-relaxed text-white/70">
            When the lights go down and the day gets quiet, I hope you still feel loved — in the smallest
            details.
          </div>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/6 px-4 py-2 text-xs text-white/65 ring-1 ring-white/10">
            See you in the next chapter.
          </div>
        </div>

        <motion.div
          className="mt-7 overflow-hidden rounded-3xl border border-white/10 bg-black/35 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-md"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative p-6 md:p-9">
            <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(900px_420px_at_20%_0%,rgba(229,9,20,0.26),transparent_60%)]" />
            <div className="relative">
              <div className="text-[11px] uppercase tracking-[0.32em] text-white/55">Post-credits</div>
              <div className="mt-4 text-2xl font-semibold tracking-tight text-white/92 md:text-3xl">
                See you in chapter {age + 1}.
              </div>
              <div className="mt-3 max-w-[72ch] text-sm leading-relaxed text-white/70">
                If today feels like a premiere, then tomorrow is a sequel. Keep the good parts.
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className={classNames(
                    'rounded-xl px-4 py-3 text-sm font-semibold',
                    'bg-white/8 ring-1 ring-white/12 hover:bg-white/12',
                    'focus-visible:outline-none focus-visible:ring-2',
                    t.ring
                  )}
                >
                  Rewatch
                </button>
                <button
                  type="button"
                  onClick={() => setSurpriseOpen(true)}
                  className={classNames(
                    'rounded-xl px-4 py-3 text-sm font-semibold',
                    'bg-[#E50914] text-white shadow-[0_10px_30px_rgba(229,9,20,0.25)] hover:bg-[#F6121D]',
                    'focus-visible:outline-none focus-visible:ring-2',
                    t.ring
                  )}
                >
                  One more thing
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <AnimatePresence>
        {endingActive && (
          <motion.div
            className="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="rounded-full bg-black/55 px-4 py-2 text-xs text-white/70 ring-1 ring-white/10 backdrop-blur">
              Credits rolling  stay a bit longer.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {surpriseOpen && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/12 bg-[#0B0B0B] shadow-[0_40px_120px_rgba(0,0,0,0.8)]"
              role="dialog"
              aria-modal="true"
              aria-label="Open message"
            >
              <div className="relative p-7 md:p-9">
                <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(700px_300px_at_20%_0%,rgba(229,9,20,0.25),transparent_60%)]" />
                <div className="relative">
                  <div className="text-[11px] uppercase tracking-[0.32em] text-white/55">Private letter</div>
                  <div className="mt-4 text-2xl font-semibold tracking-tight text-white/92 md:text-3xl">
                    For {name}
                    <span className="text-[#E50914]">.</span>
                  </div>

                  <div className="mt-4 max-w-[62ch] whitespace-pre-line text-sm leading-[1.95] text-white/75">
                    {typed}
                    <span className="ml-1 inline-block w-[10px] align-middle">
                      <motion.span
                        className="inline-block h-4 w-[2px] bg-white/60"
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 0.9, repeat: Infinity }}
                      />
                    </span>
                  </div>

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSurpriseOpen(false)}
                      className={classNames(
                        'rounded-xl px-4 py-3 text-sm font-semibold',
                        'bg-white text-black hover:bg-white/90',
                        'focus-visible:outline-none focus-visible:ring-2',
                        t.ring
                      )}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={copyMessage}
                      className={classNames(
                        'inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold',
                        'bg-white/8 ring-1 ring-white/12 hover:bg-white/12',
                        'focus-visible:outline-none focus-visible:ring-2',
                        t.ring
                      )}
                    >
                      <Copy className="h-4 w-4" />
                      Copy greeting
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            <button
              type="button"
              onClick={() => setSurpriseOpen(false)}
              className="absolute inset-0 -z-10"
              aria-label="Close overlay"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
