<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAsyncAction } from '@/composables/useAsyncAction'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import { PhStudent } from '@phosphor-icons/vue'

const auth = useAuthStore()
const router = useRouter()
const { run } = useAsyncAction()

const username = ref(auth.profile?.username ?? auth.user?.email?.split('@')[0] ?? '')
const studyGoal = ref(String(auth.profile?.study_goal_mins ?? 120))
const saving = ref(false)

async function handleComplete() {
  saving.value = true
  const result = await run(
    () => auth.completeOnboarding(username.value, parseInt(studyGoal.value) || 120),
    { successMessage: 'Welcome to Nexus!' }
  )
  saving.value = false
  if (result) router.replace('/')
}
</script>

<template>
  <div class="flex min-h-dvh flex-col ios-safe-top ios-safe-bottom">
    <div class="flex flex-1 flex-col items-center justify-center px-6">
      <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-[22px] bg-[var(--color-system-blue)] shadow-lg">
        <PhStudent :size="40" weight="fill" class="text-white" />
      </div>
      <h1 class="text-large-title text-center text-primary">Welcome to Nexus</h1>
      <p class="text-subheadline mt-2 max-w-xs text-center text-tertiary">
        Pick a username and daily study goal to personalize your dashboard.
      </p>

      <div class="mt-8 w-full max-w-sm space-y-4">
        <IOSTextField
          v-model="username"
          label="Username"
          placeholder="your_username"
          clearable
        />
        <IOSTextField
          v-model="studyGoal"
          label="Daily study goal (minutes)"
          type="number"
          placeholder="120"
        />
        <IOSButton block variant="filled" :loading="saving" @click="handleComplete">
          Get Started
        </IOSButton>
      </div>
    </div>
  </div>
</template>
