import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { differenceInCalendarDays, parseISO, isFuture, startOfDay } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { enqueueCalendarSync } from '@/lib/calendar/syncClient'
import type { Exam, ExamColor, ExamPrepItem } from '@/types'

export const useExamsStore = defineStore('exams', () => {
  const exams = ref<Exam[]>([])
  const prepItems = ref<ExamPrepItem[]>([])
  const loading = ref(false)

  const upcomingExams = computed(() =>
    [...exams.value]
      .filter((e) => isFuture(parseISO(e.exam_at)) || differenceInCalendarDays(parseISO(e.exam_at), new Date()) === 0)
      .sort((a, b) => parseISO(a.exam_at).getTime() - parseISO(b.exam_at).getTime())
  )

  const nextExam = computed(() => upcomingExams.value[0] ?? null)

  function daysUntil(exam: Exam) {
    return differenceInCalendarDays(startOfDay(parseISO(exam.exam_at)), startOfDay(new Date()))
  }

  function prepForExam(examId: string) {
    return prepItems.value
      .filter((p) => p.exam_id === examId)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  function prepProgress(examId: string) {
    const items = prepForExam(examId)
    if (!items.length) return 0
    return Math.round((items.filter((i) => i.completed).length / items.length) * 100)
  }

  async function fetchExams() {
    loading.value = true
    try {
      const [examsRes, prepRes] = await Promise.all([
        supabase.from('exams').select('*').order('exam_at', { ascending: true }),
        supabase.from('exam_prep_items').select('*').order('sort_order', { ascending: true }),
      ])
      if (examsRes.error) throw examsRes.error
      if (prepRes.error) throw prepRes.error
      exams.value = examsRes.data ?? []
      prepItems.value = prepRes.data ?? []
    } finally {
      loading.value = false
    }
  }

  function getExamById(id: string) {
    return exams.value.find((e) => e.id === id)
  }

  async function createExam(exam: {
    title: string
    course?: string
    exam_at: string
    location?: string
    notes?: string
    color?: ExamColor
    prepTitles?: string[]
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('exams')
      .insert({
        user_id: user.id,
        title: exam.title,
        course: exam.course ?? null,
        exam_at: exam.exam_at,
        location: exam.location ?? null,
        notes: exam.notes ?? null,
        color: exam.color ?? 'blue',
      })
      .select()
      .single()

    if (error) throw error
    exams.value.push(data)

    const defaults = exam.prepTitles ?? ['Review lecture notes', 'Practice problems', 'Formula sheet', 'Mock test']
    for (let i = 0; i < defaults.length; i++) {
      await createPrepItem(data.id, defaults[i], i)
    }
    enqueueCalendarSync('upsert', 'exam', data.id)
    return data
  }

  async function createPrepItem(examId: string, title: string, sortOrder?: number) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const order = sortOrder ?? prepForExam(examId).length

    const { data, error } = await supabase
      .from('exam_prep_items')
      .insert({ user_id: user.id, exam_id: examId, title, sort_order: order })
      .select()
      .single()

    if (error) throw error
    prepItems.value.push(data)
    return data
  }

  async function togglePrepItem(id: string) {
    const item = prepItems.value.find((p) => p.id === id)
    if (!item) return

    const { data, error } = await supabase
      .from('exam_prep_items')
      .update({ completed: !item.completed })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    const idx = prepItems.value.findIndex((p) => p.id === id)
    if (idx !== -1) prepItems.value[idx] = data
    return data
  }

  async function deleteExam(id: string) {
    const { error } = await supabase.from('exams').delete().eq('id', id)
    if (error) throw error
    exams.value = exams.value.filter((e) => e.id !== id)
    prepItems.value = prepItems.value.filter((p) => p.exam_id !== id)
    enqueueCalendarSync('delete', 'exam', id)
  }

  return {
    exams,
    prepItems,
    loading,
    upcomingExams,
    nextExam,
    daysUntil,
    prepForExam,
    prepProgress,
    fetchExams,
    getExamById,
    createExam,
    createPrepItem,
    togglePrepItem,
    deleteExam,
  }
})
