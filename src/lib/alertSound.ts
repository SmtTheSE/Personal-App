let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    audioCtx = new Ctx()
  }
  return audioCtx
}

export function playAlertSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  void ctx.resume().then(() => {
    const now = ctx.currentTime
    const tones = [
      { freq: 880, start: 0, dur: 0.12 },
      { freq: 1174.66, start: 0.14, dur: 0.18 },
    ]

    for (const tone of tones) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = tone.freq
      gain.gain.setValueAtTime(0.0001, now + tone.start)
      gain.gain.exponentialRampToValueAtTime(0.25, now + tone.start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + tone.start)
      osc.stop(now + tone.start + tone.dur + 0.05)
    }
  }).catch(() => undefined)
}

export function showBrowserAlert(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, silent: false })
  } catch {
    // ignore — iOS PWA may not support Notification constructor
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}
