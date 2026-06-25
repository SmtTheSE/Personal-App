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
          path: 'tasks',
          name: 'tasks',
          component: () => import('@/views/TasksView.vue'),
          meta: { transition: 'tab-fade', isTab: true },
        },
        {
          path: 'projects',
          name: 'projects',
          component: () => import('@/views/ProjectsView.vue'),
          meta: { transition: 'tab-fade', isTab: true },
        },
        {
          path: 'projects/:id',
          name: 'project-detail',
          component: () => import('@/views/ProjectDetailView.vue'),
          meta: { transition: 'slide-push' },
        },
        {
          path: 'resources',
          name: 'resources',
          component: () => import('@/views/ResourcesView.vue'),
          meta: { transition: 'tab-fade', isTab: true },
        },
        {
          path: 'analytics',
          name: 'analytics',
          component: () => import('@/views/AnalyticsView.vue'),
          meta: { transition: 'tab-fade', isTab: true },
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
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

let previousRouteName: string | undefined

router.beforeEach(async (to, from) => {
  const auth = useAuthStore()

  if (!auth.initialized) {
    await auth.initialize()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'auth', query: { redirect: to.fullPath } }
  }

  if (to.meta.guest && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }

  // Dynamic transition: push vs pop for stack navigation
  if (to.meta.isTab && from.meta?.isTab) {
    to.meta.transition = 'tab-fade'
  } else if (
    from.name &&
    to.name &&
    !to.meta.isTab &&
    typeof from.name === 'string' &&
    typeof to.name === 'string'
  ) {
    const isPop = previousRouteName === to.name
    to.meta.transition = isPop ? 'slide-pop' : 'slide-push'
  }

  previousRouteName = from.name as string | undefined
})

export { TAB_ROUTES }
export default router
