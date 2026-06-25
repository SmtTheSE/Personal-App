<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAsyncAction } from '@/composables/useAsyncAction'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import { PhGithubLogo, PhStudent } from '@phosphor-icons/vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const { run } = useAsyncAction()

const isSignUp = ref(false)
const email = ref('')
const password = ref('')
const username = ref('')
const error = ref('')
const info = ref('')

async function handleSubmit() {
  error.value = ''
  info.value = ''

  if (!email.value.trim() || !password.value) {
    error.value = 'Email and password are required'
    return
  }

  if (isSignUp.value && username.value.trim().length < 2) {
    error.value = 'Username must be at least 2 characters'
    return
  }

  try {
    if (isSignUp.value) {
      const data = await auth.signUp(email.value.trim(), password.value, username.value.trim())
      if (!data.session) {
        info.value = 'Check your email to confirm your account, then sign in.'
        isSignUp.value = false
        return
      }
    } else {
      await auth.signIn(email.value.trim(), password.value)
    }

    const redirect = (route.query.redirect as string) || '/'
    if (auth.needsOnboarding) {
      await router.push('/onboarding')
    } else {
      await router.push(redirect)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Authentication failed'
  }
}

async function handleGitHub() {
  error.value = ''
  await run(() => auth.signInWithGitHub())
}
</script>

<template>
  <div class="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden ios-safe-top ios-safe-bottom">
    <div
      class="pointer-events-none absolute inset-0"
      aria-hidden="true"
      style="background:
        radial-gradient(ellipse at 20% 20%, rgba(0,122,255,0.25) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 30%, rgba(175,82,222,0.2) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 80%, rgba(52,199,89,0.15) 0%, transparent 50%),
        var(--color-system-grouped-bg)"
    />

    <div class="relative z-10 mb-8 text-center">
      <div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[22px] bg-[var(--color-system-blue)] shadow-lg">
        <PhStudent :size="40" weight="fill" class="text-white" />
      </div>
      <h1 class="text-large-title text-primary">Nexus</h1>
      <p class="text-subheadline mt-1 text-tertiary">Your Personal Student OS</p>
    </div>

    <form
      class="material-glass relative z-10 mx-4 w-full max-w-sm space-y-4 p-6"
      :style="{ borderRadius: 'var(--radius-sheet)' }"
      @submit.prevent="handleSubmit"
    >
      <IOSTextField
        v-if="isSignUp"
        v-model="username"
        label="Username"
        placeholder="your_username"
        clearable
      />
      <IOSTextField v-model="email" label="Email" type="email" placeholder="you@university.edu" clearable />
      <IOSTextField v-model="password" label="Password" type="password" placeholder="••••••••" />

      <p v-if="error" class="text-footnote text-center text-[var(--color-system-red)]">{{ error }}</p>
      <p v-if="info" class="text-footnote text-center text-[var(--color-system-blue)]">{{ info }}</p>

      <IOSButton type="submit" block variant="filled" :loading="auth.loading">
        {{ isSignUp ? 'Create Account' : 'Sign In' }}
      </IOSButton>

      <div class="relative py-2">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-[var(--color-separator)]" />
        </div>
        <div class="relative flex justify-center">
          <span class="material-glass px-3 text-footnote text-tertiary">or</span>
        </div>
      </div>

      <IOSButton type="button" block variant="bordered" :loading="auth.loading" @click="handleGitHub">
        <PhGithubLogo :size="20" class="mr-2" weight="fill" />
        Continue with GitHub
      </IOSButton>

      <button
        type="button"
        class="w-full py-2 text-center text-subheadline text-[var(--color-system-blue)] press-scale"
        @click="isSignUp = !isSignUp"
      >
        {{ isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up" }}
      </button>
    </form>
  </div>
</template>
