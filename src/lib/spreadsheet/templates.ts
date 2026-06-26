import type { SpreadsheetDoc, SpreadsheetTemplate } from '@/types/spreadsheet'

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export interface TemplateMeta {
  id: SpreadsheetTemplate
  title: string
  icon: string
  description: string
}

export const TEMPLATE_CATALOG: TemplateMeta[] = [
  {
    id: 'semester',
    title: 'Semester GPA',
    icon: '🎓',
    description: 'Courses, credits & grades with auto GPA + at-risk flags',
  },
  {
    id: 'assignments',
    title: 'Assignment Tracker',
    icon: '📋',
    description: 'Due dates, days-left formulas & overdue automation',
  },
  {
    id: 'interview',
    title: 'Interview Log',
    icon: '💻',
    description: 'Problems, revisit dates & review-due automation',
  },
  {
    id: 'study_budget',
    title: 'Study Budget',
    icon: '⏱️',
    description: 'Daily planned vs actual minutes with delta formulas',
  },
  {
    id: 'custom',
    title: 'Blank Sheet',
    icon: '📊',
    description: 'Empty grid — add your own columns & automations',
  },
]

export function createTemplateDoc(template: SpreadsheetTemplate): SpreadsheetDoc {
  switch (template) {
    case 'semester':
      return createSemesterTemplate()
    case 'assignments':
      return createAssignmentsTemplate()
    case 'interview':
      return createInterviewTemplate()
    case 'study_budget':
      return createStudyBudgetTemplate()
    default:
      return createBlankTemplate()
  }
}

function createBlankTemplate(): SpreadsheetDoc {
  const sheetId = id('sheet')
  const colA = id('col')
  const colB = id('col')
  return {
    activeSheetId: sheetId,
    sheets: [
      {
        id: sheetId,
        name: 'Sheet 1',
        columns: [
          { id: colA, name: 'Name', type: 'text', width: 140 },
          { id: colB, name: 'Value', type: 'text', width: 120 },
        ],
        rows: [{ id: id('row'), cells: { [colA]: '', [colB]: '' } }],
        automations: [],
      },
    ],
  }
}

function createSemesterTemplate(): SpreadsheetDoc {
  const sheetId = id('sheet')
  const c = {
    course: id('col'),
    credits: id('col'),
    grade: id('col'),
    points: id('col'),
    status: id('col'),
  }

  return {
    activeSheetId: sheetId,
    sheets: [
      {
        id: sheetId,
        name: 'Courses',
        columns: [
          { id: c.course, name: 'Course', type: 'text', width: 160 },
          { id: c.credits, name: 'Credits', type: 'number', width: 72 },
          { id: c.grade, name: 'Grade %', type: 'number', width: 80 },
          {
            id: c.points,
            name: 'Points',
            type: 'formula',
            formula: `$${c.grade} * $${c.credits} / 100`,
            readOnly: true,
            width: 80,
          },
          { id: c.status, name: 'Status', type: 'select', options: ['On Track', 'At Risk', 'Excellent'], width: 100 },
        ],
        rows: [
          { id: id('row'), cells: { [c.course]: 'Data Structures', [c.credits]: 3, [c.grade]: 88, [c.status]: 'On Track' } },
          { id: id('row'), cells: { [c.course]: 'Machine Learning', [c.credits]: 3, [c.grade]: 72, [c.status]: 'On Track' } },
        ],
        automations: [
          {
            id: id('auto'),
            name: 'Flag at-risk (<60%)',
            enabled: true,
            trigger: 'on_change',
            watchColumn: c.grade,
            condition: { column: c.grade, op: 'lt', value: '60' },
            action: { type: 'set', targetColumn: c.status, value: 'At Risk' },
          },
          {
            id: id('auto'),
            name: 'Flag excellent (≥90%)',
            enabled: true,
            trigger: 'on_change',
            watchColumn: c.grade,
            condition: { column: c.grade, op: 'gte', value: '90' },
            action: { type: 'set', targetColumn: c.status, value: 'Excellent' },
          },
          {
            id: id('auto'),
            name: 'Default on track',
            enabled: true,
            trigger: 'on_change',
            watchColumn: c.grade,
            condition: { column: c.grade, op: 'gte', value: '60' },
            action: { type: 'set', targetColumn: c.status, value: 'On Track' },
          },
        ],
      },
    ],
  }
}

function createAssignmentsTemplate(): SpreadsheetDoc {
  const sheetId = id('sheet')
  const c = {
    task: id('col'),
    course: id('col'),
    due: id('col'),
    days: id('col'),
    status: id('col'),
    priority: id('col'),
  }

  return {
    activeSheetId: sheetId,
    sheets: [
      {
        id: sheetId,
        name: 'Assignments',
        columns: [
          { id: c.task, name: 'Assignment', type: 'text', width: 160 },
          { id: c.course, name: 'Course', type: 'text', width: 100 },
          { id: c.due, name: 'Due Date', type: 'date', width: 110 },
          {
            id: c.days,
            name: 'Days Left',
            type: 'formula',
            formula: `DAYS_UNTIL($${c.due})`,
            readOnly: true,
            width: 80,
          },
          {
            id: c.status,
            name: 'Status',
            type: 'select',
            options: ['Todo', 'In Progress', 'Done', 'Overdue'],
            width: 110,
          },
          {
            id: c.priority,
            name: 'Priority',
            type: 'select',
            options: ['low', 'medium', 'high'],
            width: 90,
          },
        ],
        rows: [
          { id: id('row'), cells: { [c.task]: 'Problem Set 4', [c.course]: 'Algorithms', [c.due]: '', [c.status]: 'Todo', [c.priority]: 'high' } },
        ],
        automations: [
          {
            id: id('auto'),
            name: 'Mark overdue',
            enabled: true,
            trigger: 'on_load',
            condition: { column: c.days, op: 'lt', value: '0' },
            action: { type: 'set', targetColumn: c.status, value: 'Overdue' },
          },
          {
            id: id('auto'),
            name: 'Sync done → Nexus task',
            enabled: false,
            trigger: 'on_change',
            watchColumn: c.status,
            condition: { column: c.status, op: 'eq', value: 'Done' },
            action: { type: 'create_task', titleColumn: c.task, dueColumn: c.due, priorityColumn: c.priority },
          },
        ],
      },
    ],
  }
}

function createInterviewTemplate(): SpreadsheetDoc {
  const sheetId = id('sheet')
  const c = {
    title: id('col'),
    diff: id('col'),
    topic: id('col'),
    solved: id('col'),
    revisit: id('col'),
    reviewIn: id('col'),
    flag: id('col'),
  }

  return {
    activeSheetId: sheetId,
    sheets: [
      {
        id: sheetId,
        name: 'Problems',
        columns: [
          { id: c.title, name: 'Problem', type: 'text', width: 150 },
          {
            id: c.diff,
            name: 'Difficulty',
            type: 'select',
            options: ['easy', 'medium', 'hard'],
            width: 90,
          },
          { id: c.topic, name: 'Topic', type: 'text', width: 100 },
          { id: c.solved, name: 'Solved', type: 'date', width: 100 },
          { id: c.revisit, name: 'Revisit', type: 'date', width: 100 },
          {
            id: c.reviewIn,
            name: 'Days to Review',
            type: 'formula',
            formula: `DAYS_UNTIL($${c.revisit})`,
            readOnly: true,
            width: 100,
          },
          {
            id: c.flag,
            name: 'Review',
            type: 'select',
            options: ['—', 'Due', 'OK'],
            width: 80,
          },
        ],
        rows: [{ id: id('row'), cells: { [c.title]: 'Two Sum', [c.diff]: 'easy', [c.topic]: 'Arrays', [c.flag]: '—' } }],
        automations: [
          {
            id: id('auto'),
            name: 'Mark review due',
            enabled: true,
            trigger: 'on_load',
            condition: { column: c.reviewIn, op: 'lte', value: '0' },
            action: { type: 'set', targetColumn: c.flag, value: 'Due' },
          },
          {
            id: id('auto'),
            name: 'Clear flag when OK',
            enabled: true,
            trigger: 'on_load',
            condition: { column: c.reviewIn, op: 'gt', value: '0' },
            action: { type: 'set', targetColumn: c.flag, value: 'OK' },
          },
        ],
      },
    ],
  }
}

function createStudyBudgetTemplate(): SpreadsheetDoc {
  const sheetId = id('sheet')
  const c = {
    day: id('col'),
    planned: id('col'),
    actual: id('col'),
    delta: id('col'),
    subject: id('col'),
  }

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return {
    activeSheetId: sheetId,
    sheets: [
      {
        id: sheetId,
        name: 'Weekly',
        columns: [
          { id: c.day, name: 'Day', type: 'text', width: 64 },
          { id: c.planned, name: 'Planned (min)', type: 'number', width: 100 },
          { id: c.actual, name: 'Actual (min)', type: 'number', width: 100 },
          {
            id: c.delta,
            name: 'Delta',
            type: 'formula',
            formula: `$${c.actual} - $${c.planned}`,
            readOnly: true,
            width: 72,
          },
          { id: c.subject, name: 'Focus Area', type: 'text', width: 120 },
        ],
        rows: days.map((day) => ({
          id: id('row'),
          cells: { [c.day]: day, [c.planned]: 120, [c.actual]: 0, [c.subject]: '' },
        })),
        automations: [],
      },
    ],
  }
}
