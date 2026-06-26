import { ref, computed, onUnmounted } from 'vue'
import { FOCUS_PRESETS } from '@/design/constants'
import { useHaptics } from '@/composables/useHaptics'
import type { SessionType } from '@/types'

export type TimerPhase = 'focus' | 'shortBreak' | 'longBreak'

const PHASE_TO_SESSION: Record<TimerPhase, SessionType> = {
  focus: 'focus',
  shortBreak: 'short_break',
  longBreak: 'long_break',
}

const PHASE_MINUTES: Record<TimerPhase, number> = {
  focus: FOCUS_PRESETS.focus,
  shortBreak: FOCUS_PRESETS.shortBreak,
  longBreak: FOCUS_PRESETS.longBreak,
}

export function useFocusTimer() {
  const { trigger } = useHaptics()

  const phase = ref<TimerPhase>('focus')
  const topic = ref('Deep work')
  const projectId = ref<string | null>(null)
  const totalSeconds = ref(PHASE_MINUTES.focus * 60)
  const remainingSeconds = ref(totalSeconds.value)
  const isRunning = ref(false)
  const completedFocusSessions = ref(0)
  let intervalId: ReturnType<typeof setInterval> | null = null

  const progress = computed(() => 1 - remainingSeconds.value / totalSeconds.value)
  const displayTime = computed(() => {
    const m = Math.floor(remainingSeconds.value / 60)
    const s = remainingSeconds.value % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  })

  const phaseLabel = computed(() => {
    if (phase.value === 'focus') return 'Focus'
    if (phase.value === 'shortBreak') return 'Short Break'
    return 'Long Break'
  })

  function setPhase(next: TimerPhase) {
    pause()
    phase.value = next
    totalSeconds.value = PHASE_MINUTES[next] * 60
    remainingSeconds.value = totalSeconds.value
  }

  function start() {
    if (isRunning.value) return
    isRunning.value = true
    trigger('light')
    intervalId = setInterval(() => {
      if (remainingSeconds.value <= 0) {
        onComplete()
        return
      }
      remainingSeconds.value--
    }, 1000)
  }

  function pause() {
    isRunning.value = false
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function reset() {
    pause()
    remainingSeconds.value = totalSeconds.value
  }

  function onComplete() {
    pause()
    trigger('success')

    if (phase.value === 'focus') {
      completedFocusSessions.value++
      if (completedFocusSessions.value % 4 === 0) {
        setPhase('longBreak')
      } else {
        setPhase('shortBreak')
      }
    } else {
      setPhase('focus')
    }
  }

  function getSessionType(): SessionType {
    return PHASE_TO_SESSION[phase.value]
  }

  function getElapsedMinutes(): number {
    return Math.max(1, Math.round((totalSeconds.value - remainingSeconds.value) / 60))
  }

  onUnmounted(pause)

  return {
    phase,
    topic,
    projectId,
    totalSeconds,
    remainingSeconds,
    isRunning,
    completedFocusSessions,
    progress,
    displayTime,
    phaseLabel,
    setPhase,
    start,
    pause,
    reset,
    getSessionType,
    getElapsedMinutes,
  }
}
