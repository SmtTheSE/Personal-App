import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { TAB_ROUTES } from '@/design/constants'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/auth',
      name: 'auth',
      component: () => import('@/views/AuthView.vue'),
      meta: { guest: true, transition: 'fade' },
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('@/views/OnboardingView.vue'),
      meta: { requiresAuth: true, onboarding: true, transition: 'fade' },
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { transition: 'tab-fade', isTab: true },
        },
        {
          path: 'calendar',
          name: 'calendar',
          component: () => import('@/views/CalendarView.vue'),
          meta: { transition: 'tab-fade', isTab: true },
        },
        {
          path: 'tasks',
          name: 'tasks',
          component: () => import('@/views/TasksView.vue'),
          meta: { transition: 'tab-fade', isTab: true },
        },
        {
          path: 'focus',
          name: 'focus',
          component: () => import('@/views/FocusView.vue'),
          meta: { transition: 'tab-fade', isTab: true },
        },
        {
          path: 'exams/:id',
          name: 'exam-detail',
          component: () => import('@/views/ExamDetailView.vue'),
          meta: { transition: 'slide-push' },
        },
        {
          path: 'projects',
          name: 'projects',
          component: () => import('@/views/ProjectsView.vue'),
          meta: { transition: 'tab-fade', isTab: true },
        },
        {
          path: 'library',
          name: 'library',
          component: () => import('@/views/LibraryView.vue'),
          meta: { transition: 'tab-fade', isTab: true },
        },
        {
          path: 'resources',
          redirect: '/library',
        },
        {
          path: 'notes/:id',
          name: 'note-detail',
          component: () => import('@/views/NoteDetailView.vue'),
          meta: { transition: 'slide-push' },
        },
        {
          path: 'projects/:id',
          name: 'project-detail',
          component: () => import('@/views/ProjectDetailView.vue'),
          meta: { transition: 'slide-push' },
        },
        {
          path: 'analytics',
          name: 'analytics',
          component: () => import('@/views/AnalyticsView.vue'),
          meta: { transition: 'slide-push' },
        },
        {
          path: 'deployments',
          name: 'deployments',
          component: () => import('@/views/DeploymentsView.vue'),
          meta: { transition: 'slide-push' },
        },
        {
          path: 'google-calendar',
          name: 'google-calendar',
          component: () => import('@/views/GoogleCalendarView.vue'),
          meta: { transition: 'slide-push' },
        },
        {
          path: 'interview',
          name: 'interview',
          component: () => import('@/views/InterviewView.vue'),
          meta: { transition: 'slide-push' },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          meta: { transition: 'slide-push' },
        },
        {
          path: 'sheets',
          name: 'sheets',
          component: () => import('@/views/SheetsHubView.vue'),
          meta: { transition: 'slide-push' },
        },
        {
          path: 'sheets/:id',
          name: 'sheet-editor',
          component: () => import('@/views/SpreadsheetEditorView.vue'),
          meta: { transition: 'slide-push' },
        },
        {
          path: 'data-cleaning',
          name: 'data-cleaning',
          component: () => import('@/views/DataCleaningHubView.vue'),
          meta: { transition: 'slide-push' },
        },
        {
          path: 'data-cleaning/:id',
          name: 'data-cleaning-session',
          component: () => import('@/views/DataCleaningSessionView.vue'),
          meta: { transition: 'slide-push' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.initialized) {
    await auth.initialize()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'auth', query: { redirect: to.fullPath } }
  }

  if (to.meta.guest && auth.isAuthenticated) {
    return auth.needsOnboarding ? { name: 'onboarding' } : { name: 'dashboard' }
  }

  if (
    auth.isAuthenticated &&
    auth.needsOnboarding &&
    !to.meta.onboarding &&
    to.name !== 'auth'
  ) {
    return { name: 'onboarding' }
  }

  if (to.name === 'onboarding' && auth.isAuthenticated && !auth.needsOnboarding) {
    return { name: 'dashboard' }
  }

  if (to.meta.isTab && router.currentRoute.value.meta?.isTab) {
    to.meta.transition = 'tab-fade'
  }
})

export { TAB_ROUTES }
export default router
