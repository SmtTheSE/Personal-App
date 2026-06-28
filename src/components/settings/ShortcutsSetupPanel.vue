<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCaptureStore } from '@/stores/capture'
import { useUiStore } from '@/stores/ui'
import { useAsyncAction } from '@/composables/useAsyncAction'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import { PhDeviceMobile, PhCopy, PhTrash } from '@phosphor-icons/vue'

const capture = useCaptureStore()
const ui = useUiStore()
const { run } = useAsyncAction()
const expanded = ref<'task' | 'session' | 'next' | null>('task')

const appOrigin = computed(() =>
  typeof window !== 'undefined' ? window.location.origin : 'https://YOUR-APP.vercel.app'
)

const activeToken = computed(() => capture.lastCreatedToken ?? 'nxs_YOUR_TOKEN_HERE')

async function generateToken() {
  await run(() => capture.createToken('Siri Shortcuts'), {
    successMessage: 'Token created — copy it now',
  })
}

async function revoke(id: string) {
  await run(() => capture.revokeToken(id), { successMessage: 'Token revoked' })
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    ui.showToast(`${label} copied`, 'success')
  } catch {
    ui.showToast('Copy failed', 'error')
  }
}

const shortcuts = computed(() => [
  {
    id: 'task' as const,
    title: 'Add task (Siri)',
    summary: 'Say what to capture → creates a Nexus task',
    steps: [
      'Shortcuts → + → New Shortcut',
      'Add "Ask for Input" (Text) — e.g. "What task?"',
      'Add "Get Contents of URL"',
      `URL: ${appOrigin.value}/api/capture/resource`,
      'Method: POST',
      'Headers: Authorization = Bearer ' + activeToken.value,
      'Request Body: JSON → {"type":"task","title":"[Ask for Input]"}',
      'Name it "Nexus Task" → Settings → Add to Siri',
    ],
    body: JSON.stringify({ type: 'task', title: 'Buy milk tomorrow' }, null, 2),
    curl: `curl -X POST '${appOrigin.value}/api/capture/resource' \\
  -H 'Authorization: Bearer ${activeToken.value}' \\
  -H 'Content-Type: application/json' \\
  -d '{"type":"task","title":"Buy milk tomorrow"}'`,
  },
  {
    id: 'session' as const,
    title: 'Log study session',
    summary: 'Log focus minutes from Shortcuts',
    steps: [
      'Ask for topic + minutes (or hardcode duration)',
      'POST to /api/analytics/session with your token',
    ],
    body: JSON.stringify({ topic: 'LeetCode practice', duration_mins: 25 }, null, 2),
    curl: `curl -X POST '${appOrigin.value}/api/analytics/session' \\
  -H 'Authorization: Bearer ${activeToken.value}' \\
  -H 'Content-Type: application/json' \\
  -d '{"topic":"LeetCode practice","duration_mins":25}'`,
  },
  {
    id: 'next' as const,
    title: "What's next? (Siri speak)",
    summary: 'Reads your top task + streak aloud',
    steps: [
      'Add "Get Contents of URL" → GET /api/plan/next',
      'Add "Get Dictionary Value" for key spoken_summary',
      'Add "Speak Text" with that value',
      'Trigger with "Hey Siri, what\'s next in Nexus?"',
    ],
    body: null,
    curl: `curl '${appOrigin.value}/api/plan/next' \\
  -H 'Authorization: Bearer ${activeToken.value}'`,
  },
])
</script>

<template>
  <IOSListItem title="Apple Shortcuts" subtitle="Capture tasks & ask Siri what's next">
    <template #icon>
      <PhDeviceMobile :size="22" class="text-system-purple" weight="fill" />
    </template>
    <template #trailing>
      <IOSButton size="sm" variant="bordered" :loading="capture.loading" @click="generateToken">
        Get API key
      </IOSButton>
    </template>
  </IOSListItem>

  <div class="space-y-3 px-4 py-2">
    <div v-if="capture.lastCreatedToken" class="surface-elevated rounded-2xl p-3">
      <p class="text-footnote font-medium text-system-orange">Copy your API key now — shown once</p>
      <code class="mt-2 block break-all text-caption-1">{{ capture.lastCreatedToken }}</code>
      <IOSButton size="sm" variant="bordered" class="mt-2" @click="copy(capture.lastCreatedToken!, 'API key')">
        <PhCopy :size="14" class="mr-1 inline" /> Copy key
      </IOSButton>
    </div>

    <p v-else-if="!capture.tokens.length" class="text-caption-1 text-tertiary">
      Generate an API key, then paste it into Shortcuts as <code>Authorization: Bearer nxs_…</code>
    </p>

    <div v-if="capture.tokens.length" class="space-y-1">
      <IOSListItem
        v-for="token in capture.tokens"
        :key="token.id"
        :title="token.label"
        :subtitle="`${token.token_prefix}… · ${token.last_used_at ? 'Active' : 'Unused'}`"
      >
        <template #trailing>
          <button type="button" class="p-2 text-system-red" @click="revoke(token.id)">
            <PhTrash :size="16" />
          </button>
        </template>
      </IOSListItem>
    </div>

    <div class="space-y-2">
      <button
        v-for="sc in shortcuts"
        :key="sc.id"
        type="button"
        class="surface-elevated w-full rounded-2xl p-3 text-left press-scale"
        @click="expanded = expanded === sc.id ? null : sc.id"
      >
        <p class="text-subheadline font-medium text-primary">{{ sc.title }}</p>
        <p class="text-caption-1 text-tertiary">{{ sc.summary }}</p>
      </button>

      <div v-if="expanded" class="surface-elevated space-y-3 rounded-2xl p-3 text-footnote">
        <template v-for="sc in shortcuts" :key="sc.id">
          <div v-show="expanded === sc.id">
            <p class="font-medium text-primary">Steps</p>
            <ol class="mt-1 list-decimal space-y-1 pl-4 text-tertiary">
              <li v-for="(step, i) in sc.steps" :key="i">{{ step }}</li>
            </ol>
            <p v-if="sc.body" class="mt-3 font-medium text-primary">JSON body</p>
            <pre v-if="sc.body" class="mt-1 overflow-x-auto rounded-lg bg-fill-tertiary p-2 text-caption-2">{{ sc.body }}</pre>
            <IOSButton size="sm" variant="bordered" class="mt-2" @click="copy(sc.curl, 'cURL example')">
              <PhCopy :size="14" class="mr-1 inline" /> Copy test command
            </IOSButton>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
