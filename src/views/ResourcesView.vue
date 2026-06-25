<script setup lang="ts">
import { ref } from 'vue'
import { useResourcesStore } from '@/stores/resources'
import { useAsyncAction } from '@/composables/useAsyncAction'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSSheet from '@/components/ui/IOSSheet.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import IOSTextArea from '@/components/ui/IOSTextArea.vue'
import IOSSearchBar from '@/components/ui/IOSSearchBar.vue'
import IOSEmptyState from '@/components/ui/IOSEmptyState.vue'
import IOSChip from '@/components/ui/IOSChip.vue'
import IOSContextMenu from '@/components/ui/IOSContextMenu.vue'
import { PhPlus, PhStar, PhLink, PhBookmarkSimple } from '@phosphor-icons/vue'
import type { ResourceType } from '@/types'

const resourcesStore = useResourcesStore()
const { run } = useAsyncAction()

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

function faviconUrl(link: string | null): string | null {
  if (!link) return null
  try {
    const host = new URL(link).hostname
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`
  } catch {
    return null
  }
}

function openResourceUrl(link: string | null) {
  if (link) window.open(link, '_blank', 'noopener')
}

async function addResource() {
  if (!title.value.trim()) return
  const result = await run(
    () =>
      resourcesStore.createResource({
        title: title.value.trim(),
        url: url.value || undefined,
        type: type.value,
        tags: tags.value ? tags.value.split(',').map((t) => t.trim()).filter(Boolean) : [],
        notes: notes.value || undefined,
      }),
    { successMessage: 'Resource saved' }
  )
  if (!result) return
  title.value = ''
  url.value = ''
  type.value = 'article'
  tags.value = ''
  notes.value = ''
  showSheet.value = false
}
</script>

<template>
  <PageShell>
    <template #header>
      <NavBar title="Resource Vault" large>
        <IOSSearchBar v-model="resourcesStore.searchQuery" placeholder="Search resources..." />
        <div class="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide">
          <IOSChip label="All" :selected="!resourcesStore.activeTag" @click="resourcesStore.activeTag = null" />
          <IOSChip
            v-for="tag in resourcesStore.allTags"
            :key="tag"
            :label="tag"
            color="blue"
            :selected="resourcesStore.activeTag === tag"
            @click="resourcesStore.activeTag = tag"
          />
        </div>
        <div class="flex justify-end px-4 pb-2">
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full bg-system-blue text-white press-scale"
            aria-label="Save resource"
            @click="showSheet = true"
          >
            <PhPlus :size="20" weight="bold" />
          </button>
        </div>
      </NavBar>
    </template>

    <div class="py-4">
      <IOSListGroup v-if="resourcesStore.filteredResources.length" :inset="false">
        <IOSContextMenu
          v-for="resource in resourcesStore.filteredResources"
          :key="resource.id"
          :items="[
            { id: 'fav', label: resource.is_favorite ? 'Unfavorite' : 'Favorite', onSelect: () => resourcesStore.toggleFavorite(resource.id) },
            { id: 'open', label: 'Open Link', onSelect: () => openResourceUrl(resource.url) },
            { id: 'del', label: 'Delete', destructive: true, onSelect: () => resourcesStore.deleteResource(resource.id) },
          ]"
        >
          <IOSListItem
            :title="resource.title"
            :subtitle="resource.type"
            @click="openResourceUrl(resource.url)"
          >
            <template #icon>
              <img
                v-if="faviconUrl(resource.url)"
                :src="faviconUrl(resource.url)!"
                class="h-6 w-6 rounded"
                alt=""
              />
              <span v-else class="text-lg">{{ typeIcons[resource.type] }}</span>
            </template>
            <template #trailing>
              <div class="flex items-center gap-2">
                <PhStar
                  :size="18"
                  :weight="resource.is_favorite ? 'fill' : 'regular'"
                  :class="resource.is_favorite ? 'text-system-orange' : 'text-tertiary'"
                />
                <PhLink v-if="resource.url" :size="16" class="text-tertiary" />
              </div>
            </template>
          </IOSListItem>
        </IOSContextMenu>
      </IOSListGroup>

      <IOSEmptyState
        v-else
        title="No resources saved"
        subtitle="Bookmark articles, papers, and tutorials"
        :icon="PhBookmarkSimple"
      >
        <IOSButton @click="showSheet = true">Save Resource</IOSButton>
      </IOSEmptyState>
    </div>

    <IOSSheet :open="showSheet" title="Save Resource" @close="showSheet = false">
      <div class="space-y-4">
        <IOSTextField v-model="title" label="Title" placeholder="Resource name" clearable />
        <IOSTextField v-model="url" label="URL" placeholder="https://..." />
        <div class="space-y-2">
          <label class="text-section-header px-1">Type</label>
          <div class="flex flex-wrap gap-2">
            <IOSChip
              v-for="t in types"
              :key="t"
              :label="t"
              :selected="type === t"
              @click="type = t"
            />
          </div>
        </div>
        <IOSTextField v-model="tags" label="Tags" placeholder="ml, python (comma-separated)" />
        <IOSTextArea v-model="notes" label="Notes" placeholder="Key takeaways..." />
        <IOSButton type="button" block variant="filled" @click="addResource">Save Resource</IOSButton>
      </div>
    </IOSSheet>
  </PageShell>
</template>
