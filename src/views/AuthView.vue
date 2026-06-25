<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import { PhGithubLogo, PhStudent } from '@phosphor-icons/vue'

const auth = useAuthStore()
const router = useRouter()

const isSignUp = ref(false)
const email = ref('')
const password = ref('')
const username = ref('')
const error = ref('')

async function handleSubmit() {
  error.value = ''
  try {
    if (isSignUp.value) {
      await auth.signUp(email.value, password.value, username.value)
    } else {
      await auth.signIn(email.value, password.value)
    }
    router.push('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Authentication failed'
  }
}

async function handleGitHub() {
  error.value = ''
  try {
    await auth.signInWithGitHub()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'GitHub sign-in failed'
  }
}
</script>

<template>
  <div class="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden ios-safe-top ios-safe-bottom">
    <!-- iOS 18-style mesh gradient background -->
    <div
      class="pointer-events-none absolute inset-0"
      aria-hidden="true"
      style="background:
        radial-gradient(ellipse at 20% 20%, rgba(0,122,255,0.25) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 30%, rgba(175,82,222,0.2) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 80%, rgba(52,199,89,0.15) 0%, transparent 50%),
        var(--color-system-grouped-bg)"
    />
    <div
      class="pointer-events-none absolute inset-0 dark:block hidden"
      aria-hidden="true"
      style="background:
        radial-gradient(ellipse at 20% 20%, rgba(10,132,255,0.2) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 30%, rgba(191,90,242,0.15) 0%, transparent 50%),
        var(--color-system-grouped-bg-dark)"
    />

    <div class="relative z-10 mb-8 text-center">
      <div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[22px] bg-system-blue shadow-lg shadow-system-blue/30">
        <PhStudent :size="40" weight="fill" class="text-white" />
      </div>
      <h1 class="text-large-title text-primary">Nexus</h1>
      <p class="text-subheadline mt-1 text-tertiary">Your Personal Student OS</p>
    </div>

    <!-- Glass card form -->
    <div
      class="material-glass relative z-10 w-full max-w-sm space-y-4 p-6 mx-4"
      :style="{ borderRadius: 'var(--radius-sheet)' }"
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

      <p v-if="error" class="text-footnote text-center text-system-red">{{ error }}</p>

      <IOSButton block variant="borderedProminent" :loading="auth.loading" @click="handleSubmit">
        {{ isSignUp ? 'Create Account' : 'Sign In' }}
      </IOSButton>

      <div class="relative py-2">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-[var(--color-separator)] dark:border-[var(--color-separator-dark)]" />
        </div>
        <div class="relative flex justify-center">
          <span class="material-glass px-3 text-footnote text-tertiary">or</span>
        </div>
      </div>

      <IOSButton block variant="borderedProminent" :loading="auth.loading" @click="handleGitHub">
        <PhGithubLogo :size="20" class="mr-2" weight="fill" />
        Continue with GitHub
      </IOSButton>

      <button
        type="button"
        class="w-full py-2 text-center text-subheadline text-system-blue press-scale"
        @click="isSignUp = !isSignUp"
      >
        {{ isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up" }}
      </button>
    </div>
  </div>
</template>
