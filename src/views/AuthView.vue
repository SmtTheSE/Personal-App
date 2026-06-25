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
  <div class="flex min-h-dvh flex-col items-center justify-center bg-ios-bg px-6 dark:bg-ios-bg-dark ios-safe-top ios-safe-bottom">
    <div class="mb-10 text-center">
      <div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[22px] bg-ios-blue shadow-lg shadow-ios-blue/30">
        <PhStudent :size="40" weight="fill" class="text-white" />
      </div>
      <h1 class="ios-large-title text-black dark:text-white">Nexus</h1>
      <p class="ios-subhead mt-1 text-ios-tertiary-label">Your Personal Student OS</p>
    </div>

    <div class="w-full max-w-sm space-y-4">
      <IOSTextField
        v-if="isSignUp"
        v-model="username"
        label="Username"
        placeholder="your_username"
      />
      <IOSTextField
        v-model="email"
        label="Email"
        type="email"
        placeholder="you@university.edu"
      />
      <IOSTextField
        v-model="password"
        label="Password"
        type="password"
        placeholder="••••••••"
      />

      <p v-if="error" class="ios-footnote text-center text-ios-red">{{ error }}</p>

      <IOSButton block :loading="auth.loading" @click="handleSubmit">
        {{ isSignUp ? 'Create Account' : 'Sign In' }}
      </IOSButton>

      <div class="relative py-2">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-ios-separator dark:border-ios-separator-dark" />
        </div>
        <div class="relative flex justify-center">
          <span class="bg-ios-bg px-3 ios-footnote text-ios-tertiary-label dark:bg-ios-bg-dark">or</span>
        </div>
      </div>

      <IOSButton variant="secondary" block :loading="auth.loading" @click="handleGitHub">
        <PhGithubLogo :size="20" class="mr-2" weight="fill" />
        Continue with GitHub
      </IOSButton>

      <button
        type="button"
        class="w-full py-2 text-center ios-subhead text-ios-blue"
        @click="isSignUp = !isSignUp"
      >
        {{ isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up" }}
      </button>
    </div>
  </div>
</template>
