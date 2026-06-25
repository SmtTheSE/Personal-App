<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDark } from '@vueuse/core'
import { useAuthStore } from '@/stores/auth'
import NavBar from '@/components/layout/NavBar.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import { PhMoon, PhSun, PhSignOut, PhUser, PhTarget } from '@phosphor-icons/vue'

const auth = useAuthStore()
const router = useRouter()
const isDark = useDark()

const username = ref(auth.profile?.username ?? '')
const studyGoal = ref(String(auth.profile?.study_goal_mins ?? 120))
const saving = ref(false)

async function saveProfile() {
  saving.value = true
  try {
    await auth.updateProfile({
      username: username.value,
      study_goal_mins: parseInt(studyGoal.value) || 120,
    })
  } finally {
    saving.value = false
  }
}

async function handleSignOut() {
  await auth.signOut()
  router.push('/auth')
}
</script>

<template>
  <div>
    <NavBar title="Settings" large show-back />

    <div class="space-y-6 px-4 py-4">
      <section>
        <p class="ios-footnote mb-2 px-1 font-semibold uppercase tracking-wide text-ios-tertiary-label">Profile</p>
        <div class="space-y-3">
          <div class="space-y-1">
            <label class="ios-footnote font-medium uppercase tracking-wide text-ios-tertiary-label px-1">Username</label>
            <div class="flex items-center gap-3 rounded-[10px] bg-black/5 px-4 py-3 dark:bg-white/10">
              <PhUser :size="20" class="text-ios-tertiary-label" />
              <input
                v-model="username"
                class="flex-1 bg-transparent ios-subhead text-black outline-none dark:text-white"
              />
            </div>
          </div>
          <IOSTextField v-model="studyGoal" label="Daily Study Goal (minutes)" type="number" />
          <IOSButton block :loading="saving" @click="saveProfile">Save Profile</IOSButton>
        </div>
      </section>

      <section>
        <p class="ios-footnote mb-2 px-1 font-semibold uppercase tracking-wide text-ios-tertiary-label">Appearance</p>
        <IOSListGroup>
          <IOSListItem title="Dark Mode" @click="isDark = !isDark">
            <template #icon>
              <component :is="isDark ? PhMoon : PhSun" :size="22" />
            </template>
            <template #trailing>
              <div
                class="relative h-7 w-12 rounded-full transition-colors"
                :class="isDark ? 'bg-ios-green' : 'bg-black/20'"
              >
                <div
                  class="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform"
                  :class="isDark ? 'translate-x-5' : 'translate-x-0.5'"
                />
              </div>
            </template>
          </IOSListItem>
        </IOSListGroup>
      </section>

      <section>
        <p class="ios-footnote mb-2 px-1 font-semibold uppercase tracking-wide text-ios-tertiary-label">Account</p>
        <IOSListGroup>
          <IOSListItem :subtitle="auth.user?.email ?? ''" title="Email">
            <template #icon>
              <PhTarget :size="22" />
            </template>
          </IOSListItem>
        </IOSListGroup>
      </section>

      <IOSButton variant="destructive" block @click="handleSignOut">
        <PhSignOut :size="18" class="mr-2" />
        Sign Out
      </IOSButton>

      <p class="text-center ios-caption text-ios-tertiary-label">Nexus v1.0 · Student OS</p>
    </div>
  </div>
</template>
