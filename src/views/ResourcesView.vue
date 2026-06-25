<script setup lang="ts">
import { ref } from 'vue'
import { useResourcesStore } from '@/stores/resources'
import NavBar from '@/components/layout/NavBar.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSSheet from '@/components/ui/IOSSheet.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import IOSTextArea from '@/components/ui/IOSTextArea.vue'
import { PhPlus, PhStar, PhLink } from '@phosphor-icons/vue'
import type { ResourceType } from '@/types'

const resourcesStore = useResourcesStore()

const showSheet = ref(false)
const title = ref('')
const url = ref('')
const type = ref<ResourceType>('article')
const tags = ref('')
const notes = ref('')

const types: ResourceType[] = ['article', 'paper', 'tutorial', 'video', 'book', 'tool', 'other']

const typeIcons: Record<ResourceType, string> = {
  article: '📄',
  paper: '📑',
  tutorial: '📚',
  video: '🎬',
  book: '📖',
  tool: '🔧',
  other: '📌',
}

async function addResource() {
  if (!title.value.trim()) return
  await resourcesStore.createResource({
    title: title.value.trim(),
    url: url.value || undefined,
    type: type.value,
    tags: tags.value ? tags.value.split(',').map((t) => t.trim()).filter(Boolean) : [],
    notes: notes.value || undefined,
  })
  title.value = ''
  url.value = ''
  type.value = 'article'
  tags.value = ''
  notes.value = ''
  showSheet.value = false
}
function openResourceUrl(link: string | null) {
  if (link) window.open(link, '_blank')
}
</script>

<template>
  <div>
    <NavBar title="Resource Vault" large>
      <div class="px-4 pb-3">
        <input
          v-model="resourcesStore.searchQuery"
          type="search"
          placeholder="Search resources..."
          class="w-full rounded-[10px] bg-black/5 px-4 py-2.5 ios-subhead text-black outline-none placeholder:text-ios-tertiary-label dark:bg-white/10 dark:text-white"
        />
      </div>
      <div class="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide">
        <button
          type="button"
          class="shrink-0 rounded-full px-3 py-1 ios-caption font-medium transition-colors"
          :class="!resourcesStore.activeTag ? 'bg-ios-blue text-white' : 'bg-black/5 text-black dark:bg-white/10 dark:text-white'"
          @click="resourcesStore.activeTag = null"
        >
          All
        </button>
        <button
          v-for="tag in resourcesStore.allTags"
          :key="tag"
          type="button"
          class="shrink-0 rounded-full px-3 py-1 ios-caption font-medium transition-colors"
          :class="resourcesStore.activeTag === tag ? 'bg-ios-blue text-white' : 'bg-black/5 text-black dark:bg-white/10 dark:text-white'"
          @click="resourcesStore.activeTag = tag"
        >
          {{ tag }}
        </button>
      </div>
      <div class="flex justify-end px-4 pb-2">
        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full bg-ios-blue text-white" @click="showSheet = true">
          <PhPlus :size="20" weight="bold" />
        </button>
      </div>
    </NavBar>

    <div class="px-4 py-4">
      <IOSListGroup v-if="resourcesStore.filteredResources.length">
        <IOSListItem
          v-for="resource in resourcesStore.filteredResources"
          :key="resource.id"
          :title="resource.title"
          :subtitle="resource.type"
          @click="openResourceUrl(resource.url)"
        >
          <template #icon>
            <span class="text-lg">{{ typeIcons[resource.type] }}</span>
          </template>
          <template #trailing>
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click.stop="resourcesStore.toggleFavorite(resource.id)"
              >
                <PhStar
                  :size="18"
                  :weight="resource.is_favorite ? 'fill' : 'regular'"
                  :class="resource.is_favorite ? 'text-ios-orange' : 'text-ios-tertiary-label'"
                />
              </button>
              <PhLink v-if="resource.url" :size="16" class="text-ios-tertiary-label" />
            </div>
          </template>
        </IOSListItem>
      </IOSListGroup>

      <div v-else class="py-16 text-center">
        <p class="ios-subhead text-ios-tertiary-label">No resources saved</p>
        <IOSButton class="mt-4" @click="showSheet = true">Save your first resource</IOSButton>
      </div>
    </div>

    <IOSSheet :open="showSheet" title="Save Resource" @close="showSheet = false">
      <div class="space-y-4">
        <IOSTextField v-model="title" label="Title" placeholder="Resource name" />
        <IOSTextField v-model="url" label="URL" placeholder="https://..." />
        <div class="space-y-1">
          <label class="ios-footnote font-medium uppercase tracking-wide text-ios-tertiary-label px-1">Type</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="t in types"
              :key="t"
              type="button"
              class="rounded-full px-3 py-1 ios-caption font-medium capitalize transition-colors"
              :class="type === t ? 'bg-ios-blue text-white' : 'bg-black/5 dark:bg-white/10'"
              @click="type = t"
            >
              {{ t }}
            </button>
          </div>
        </div>
        <IOSTextField v-model="tags" label="Tags" placeholder="ml, python, react (comma-separated)" />
        <IOSTextArea v-model="notes" label="Notes" placeholder="Key takeaways..." />
        <IOSButton block @click="addResource">Save Resource</IOSButton>
      </div>
    </IOSSheet>
  </div>
</template>
