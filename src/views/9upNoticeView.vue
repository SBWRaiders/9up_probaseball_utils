<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { marked } from 'marked'
import {
  Search,
  RefreshCw,
  ChevronDown,
  ExternalLink,
  Download,
  GitCommit,
  User,
  Package
} from 'lucide-vue-next'

interface GithubAsset {
  id: number
  name: string
  browser_download_url: string
  size: number
  download_count: number
}
interface GithubRelease {
  id: number
  tag_name: string
  name: string | null
  body: string | null
  draft: boolean
  prerelease: boolean
  created_at: string
  published_at: string | null
  html_url: string
  assets: GithubAsset[]
}
interface GithubCommit {
  sha: string
  commit: {
    message: string
    author: { name: string; email: string; date: string }
    committer: { name: string; email: string; date: string }
  }
  author: { login: string; avatar_url: string; html_url: string } | null
  committer: { login: string; avatar_url: string; html_url: string } | null
  html_url: string
}

const owner = 'SBWRaiders'
const repo = '9up_probaseball_utils'
const perPage = 10

const releases = ref<GithubRelease[]>([])
const commits = ref<GithubCommit[]>([])
const loading = ref(false)
const loadingCommits = ref(false)
const error = ref<string | null>(null)
const nextUrl = ref<string | null>(null)
const nextCommitUrl = ref<string | null>(null)
const aborter = ref<AbortController | null>(null)
const q = ref('')
const includePrereleases = ref(false)
const includeDrafts = ref(false)
const showCommits = ref(false)
const commitSidebarCollapsed = ref(false)
const expandedId = ref<number | null>(null)

const parseLinkHeader = (link: string | null): Record<string, string> => {
  const map: Record<string, string> = {}
  if (!link) return map
  for (const part of link.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/)
    if (match) map[match[2]] = match[1]
  }
  return map
}

const formatDate = (iso?: string | null): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

const formatRelativeTime = (iso: string): string => {
  const now = new Date()
  const date = new Date(iso)
  const diff = now.getTime() - date.getTime()
  const minute = 60 * 1000
  const hour = minute * 60
  const day = hour * 24
  const week = day * 7
  const month = day * 30
  if (diff < minute) return '방금 전'
  if (diff < hour) return `${Math.floor(diff / minute)}분 전`
  if (diff < day) return `${Math.floor(diff / hour)}시간 전`
  if (diff < week) return `${Math.floor(diff / day)}일 전`
  if (diff < month) return `${Math.floor(diff / week)}주 전`
  return `${Math.floor(diff / month)}개월 전`
}

const formatBytes = (bytes?: number): string => {
  if (bytes === undefined || bytes === null) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  const precision = n < 10 && i > 0 ? 1 : 0
  return `${n.toFixed(precision)} ${units[i]}`
}

const truncateCommitMessage = (message: string, maxLength = 50): string => {
  const firstLine = message.split('\n')[0]
  return firstLine.length > maxLength ? firstLine.slice(0, maxLength) + '...' : firstLine
}

const getCommitHash = (sha: string): string => sha.slice(0, 7)

marked.setOptions({ headerIds: false, mangle: false, breaks: true })
const renderMarkdown = (md: string | null): string => String(marked.parse(md ?? ''))

const fetchPage = async (url: string, replace = false) => {
  loading.value = true
  error.value = null
  try {
    aborter.value?.abort()
  } catch {}
  const controller = new AbortController()
  aborter.value = controller
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal
    })
    if (!res.ok) {
      if (res.status === 404) throw new Error('레포지터리를 찾을 수 없습니다.')
      if (res.status === 403 && res.headers.get('X-RateLimit-Remaining') === '0') {
        throw new Error('GitHub API 요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.')
      }
      throw new Error(`요청 실패 (${res.status})`)
    }
    const data: GithubRelease[] = await res.json()
    const linkMap = parseLinkHeader(res.headers.get('Link'))
    nextUrl.value = linkMap.next ?? null
    releases.value = replace ? data : [...releases.value, ...data]
    if (expandedId.value === null && releases.value.length) {
      expandedId.value = releases.value[0].id
    }
  } catch (e: any) {
    if (e?.name !== 'AbortError') error.value = e?.message ?? '요청 중 오류가 발생했습니다.'
  } finally {
    loading.value = false
  }
}

const fetchCommits = async (url: string, replace = false) => {
  if (!showCommits.value) return
  loadingCommits.value = true
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: aborter.value?.signal
    })
    if (!res.ok) throw new Error(`커밋 요청 실패 (${res.status})`)
    const data: GithubCommit[] = await res.json()
    const linkMap = parseLinkHeader(res.headers.get('Link'))
    nextCommitUrl.value = linkMap.next ?? null
    commits.value = replace ? data : [...commits.value, ...data]
  } catch (e: any) {
    if (e?.name !== 'AbortError') console.warn('커밋 로드 실패:', e?.message)
  } finally {
    loadingCommits.value = false
  }
}

const refresh = () => {
  releases.value = []
  commits.value = []
  nextUrl.value = null
  nextCommitUrl.value = null
  expandedId.value = null
  fetchPage(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=${perPage}`, true)
  if (showCommits.value) {
    fetchCommits(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=25`, true)
  }
}

const loadMore = async () => {
  if (!nextUrl.value || loading.value) return
  await fetchPage(nextUrl.value)
}

const loadMoreCommits = async () => {
  if (!nextCommitUrl.value || loadingCommits.value) return
  await fetchCommits(nextCommitUrl.value)
}

onMounted(() => refresh())
onBeforeUnmount(() => aborter.value?.abort())

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  let arr = releases.value.filter(r => (includeDrafts.value || !r.draft) && (includePrereleases.value || !r.prerelease))
  if (term) {
    arr = arr.filter(r =>
        r.tag_name.toLowerCase().includes(term) ||
        (r.name ?? '').toLowerCase().includes(term) ||
        (r.body ?? '').toLowerCase().includes(term)
    )
  }
  return arr
})

const filteredCommits = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return commits.value
  return commits.value.filter(c =>
      c.commit.message.toLowerCase().includes(term) ||
      c.commit.author.name.toLowerCase().includes(term) ||
      c.sha.toLowerCase().includes(term)
  )
})

const lastUpdated = computed(() => filtered.value[0]?.published_at || filtered.value[0]?.created_at)

const toggleExpand = (id: number) => {
  expandedId.value = expandedId.value === id ? null : id
}
const onAccordionKeydown = (e: KeyboardEvent, id: number) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    toggleExpand(id)
  }
}
</script>

<template>
  <div class="w-full max-w-[1400px] mx-auto p-2 sm:p-4">
    <div class="hidden lg:flex gap-4">
      <section class="flex-1 min-w-0 space-y-4">
        <header class="rounded-2xl border border-gray-200 bg-white/90 dark:bg-neutral-900/90 dark:border-neutral-700 shadow-sm p-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-neutral-900/70">
          <div class="min-w-0">
            <h2 class="text-lg sm:text-xl font-semibold text-gray-800 dark:text-neutral-100 truncate">공지 사항</h2>
            <p class="text-xs sm:text-sm text-gray-500 dark:text-neutral-400 mt-0.5">
              <a :href="`https://github.com/${owner}/${repo}/releases`" target="_blank" rel="noopener" class="underline underline-offset-2 hover:text-blue-600 dark:hover:text-blue-400">{{ owner }}/{{ repo }}</a>
              <span v-if="lastUpdated" class="ml-2 hidden sm:inline">· 최신 업데이트: {{ formatDate(lastUpdated) }}</span>
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button @click="refresh" class="px-3 py-1.5 rounded-xl border bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-sm hover:bg-gray-50 dark:hover:bg-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 flex items-center gap-2">
              <RefreshCw class="w-4 h-4" />
              새로고침
            </button>
          </div>
        </header>

        <div v-if="error" class="rounded-2xl border bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800/40 p-3 sm:p-4 flex items-start justify-between gap-3">
          <span class="text-sm">{{ error }}</span>
          <button @click="refresh" class="px-2 py-1 text-xs sm:text-sm rounded-lg border bg-white/90 dark:bg-transparent border-red-200 dark:border-red-700">재시도</button>
        </div>

        <div v-if="loading && releases.length === 0" class="space-y-3">
          <div v-for="n in 3" :key="n" class="p-4 rounded-2xl border bg-white/80 dark:bg-neutral-900/70 border-gray-200 dark:border-neutral-700 animate-pulse">
            <div class="h-4 w-40 bg-gray-200 dark:bg-neutral-700 rounded mb-3"></div>
            <div class="h-3 w-full bg-gray-200 dark:bg-neutral-700 rounded mb-2"></div>
            <div class="h-3 w-5/6 bg-gray-200 dark:bg-neutral-700 rounded"></div>
          </div>
        </div>

        <div v-else-if="filtered.length === 0" class="p-8 rounded-2xl border bg-white/90 dark:bg-neutral-900/90 border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-neutral-300 text-center">
          <Package class="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-neutral-600" />
          조건에 맞는 릴리즈가 없습니다.
        </div>

        <ul v-else class="space-y-3 sm:space-y-4">
          <li v-for="rel in filtered" :key="rel.id" class="rounded-2xl border bg-white/90 dark:bg-neutral-900/90 border-gray-200 dark:border-neutral-700 shadow-sm overflow-hidden">
            <button type="button" class="w-full text-left px-4 sm:px-5 py-3 sm:py-4 flex flex-wrap gap-3 items-start justify-between hover:bg-gray-50/70 dark:hover:bg-neutral-800/40" :aria-expanded="expandedId === rel.id" :aria-controls="`release-${rel.id}`" @click="toggleExpand(rel.id)" @keydown="onAccordionKeydown($event, rel.id)">
              <div class="min-w-0">
                <div class="flex items-center gap-2 min-w-0">
                  <a :href="rel.html_url" target="_blank" rel="noopener" class="font-semibold text-gray-800 dark:text-neutral-100 hover:underline truncate" @click.stop>{{ rel.tag_name }}</a>
                  <span v-if="rel.name" class="text-gray-500 dark:text-neutral-400 truncate">· {{ rel.name }}</span>
                </div>
                <div class="mt-1 text-xs text-gray-500 dark:text-neutral-400">발행: {{ formatDate(rel.published_at || rel.created_at) }}</div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span v-if="rel.prerelease" class="text-[11px] px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300/50">pre-release</span>
                <span v-if="rel.draft" class="text-[11px] px-2 py-1 rounded-full bg-gray-200 text-gray-800 dark:bg-neutral-700 dark:text-neutral-200 border border-gray-400/40">draft</span>
                <ChevronDown class="w-4 h-4 ml-1 transition-transform" :class="expandedId === rel.id ? 'rotate-180' : ''" />
              </div>
            </button>

            <div v-show="expandedId === rel.id" :id="`release-${rel.id}`" class="px-4 sm:px-5 pb-3 sm:pb-4 prose dark:prose-invert max-w-none prose-sm">
              <div v-html="renderMarkdown(rel.body)"></div>
            </div>

            <div v-if="rel.assets?.length && expandedId === rel.id" class="px-4 sm:px-5 pt-3 sm:pt-4 pb-4 border-t border-gray-100 dark:border-neutral-800">
              <h4 class="text-sm font-semibold text-gray-700 dark:text-neutral-200 mb-2">Assets</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a v-for="a in rel.assets" :key="a.id" :href="a.browser_download_url" target="_blank" rel="noopener" class="group flex items-center justify-between gap-3 px-3 py-2 rounded-xl border bg-gray-50/80 dark:bg-neutral-800/50 border-gray-200 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-700/60">
                  <div class="min-w-0">
                    <div class="font-medium text-sm text-gray-800 dark:text-neutral-100 truncate">{{ a.name }}</div>
                    <div class="text-xs text-gray-500 dark:text-neutral-400">{{ formatBytes(a.size) }} · 다운로드 {{ a.download_count.toLocaleString() }}</div>
                  </div>
                  <Download class="w-5 h-5 opacity-70 group-hover:opacity-100" />
                </a>
              </div>
            </div>
          </li>
        </ul>

        <div v-if="nextUrl && filtered.length" class="pt-2 flex justify-center">
          <button @click="loadMore" :disabled="loading" class="px-4 py-2 rounded-xl border bg-white/90 dark:bg-neutral-900/80 border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700/80 disabled:opacity-60">
            더 불러오기
          </button>
        </div>
      </section>

      <aside v-if="showCommits" class="w-80 flex-shrink-0 transition-all duration-300" :class="{ 'w-12': commitSidebarCollapsed }">
        <div class="top-4">
          <div class="rounded-2xl border border-gray-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90 shadow-sm overflow-hidden">
            <div class="p-4 border-b border-gray-100 dark:border-neutral-800">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <GitCommit class="w-5 h-5 text-gray-500" />
                  <h3 class="font-semibold text-gray-900 dark:text-neutral-100">최근 커밋</h3>
                  <span class="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-400">
                    {{ filteredCommits.length }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="!commitSidebarCollapsed" class="h-[calc(100vh-12rem)] overflow-y-auto">
              <div v-if="loadingCommits && commits.length === 0" class="p-4 space-y-3">
                <div v-for="n in 5" :key="n" class="flex items-center gap-3 animate-pulse">
                  <div class="w-8 h-8 bg-gray-300 dark:bg-neutral-600 rounded-full"></div>
                  <div class="flex-1 space-y-2">
                    <div class="h-3 w-3/4 bg-gray-200 dark:bg-neutral-700 rounded"></div>
                    <div class="h-2 w-1/2 bg-gray-200 dark:bg-neutral-700 rounded"></div>
                  </div>
                </div>
              </div>

              <div v-else-if="filteredCommits.length === 0" class="p-8 text-center">
                <GitCommit class="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p class="text-sm text-gray-600 dark:text-neutral-400">커밋이 없습니다</p>
              </div>

              <div v-else class="divide-y divide-gray-100 dark:divide-neutral-800">
                <div v-for="commit in filteredCommits" :key="commit.sha" class="p-4 hover:bg-gray-50 dark:hover:bg-neutral-800/40 transition-colors">
                  <div class="flex items-start gap-3">
                    <div v-if="commit.author" class="flex-shrink-0">
                      <img :src="commit.author.avatar_url" :alt="commit.author.login" class="w-8 h-8 rounded-full" />
                    </div>
                    <div v-else class="flex-shrink-0">
                      <div class="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center">
                        <User class="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-start justify-between gap-2">
                        <p class="text-sm font-medium text-gray-900 dark:text-neutral-100 leading-tight">
                          {{ truncateCommitMessage(commit.commit.message) }}
                        </p>
                        <a :href="commit.html_url" target="_blank" rel="noopener" class="flex-shrink-0 text-gray-400 hover:text-blue-500 transition-colors">
                          <ExternalLink class="w-3 h-3" />
                        </a>
                      </div>
                      <div class="flex items-center gap-2 mt-1">
                        <code class="text-xs font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-neutral-300 rounded">
                          {{ getCommitHash(commit.sha) }}
                        </code>
                        <span class="text-xs text-gray-500 dark:text-neutral-400">
                          {{ formatRelativeTime(commit.commit.author.date) }}
                        </span>
                      </div>
                      <div class="text-xs text-gray-600 dark:text-neutral-400 mt-1">
                        {{ commit.commit.author.name }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="nextCommitUrl" class="p-3 border-t border-gray-100 dark:border-neutral-800">
                <button @click="loadMoreCommits" :disabled="loadingCommits" class="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-50">
                  <span :class="{ 'animate-pulse': loadingCommits }">더 보기</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <div class="lg:hidden space-y-4">
      <header class="rounded-2xl border border-gray-200 bg-white/90 dark:bg-neutral-900/90 dark:border-neutral-700 shadow-sm p-4 sticky top-0 z-10 backdrop-blur">
        <div class="flex flex-col gap-2">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-neutral-100">공지 사항</h2>
          <p class="text-xs text-gray-500 dark:text-neutral-400">
            <a :href="`https://github.com/${owner}/${repo}/releases`" target="_blank" class="underline">{{ owner }}/{{ repo }}</a>
          </p>
          <button @click="refresh" class="self-start px-3 py-1.5 rounded-xl border bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-sm flex items-center gap-2">
            <RefreshCw class="w-4 h-4" />
            새로고침
          </button>
        </div>
      </header>

      <div class="rounded-2xl border border-gray-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90 shadow-sm p-3 space-y-3">
        <div class="relative">
          <Search class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input v-model="q" type="search" placeholder="검색..." class="w-full pl-9 pr-3 py-2 rounded-xl border bg-white/95 dark:bg-neutral-900/80 text-sm text-gray-800 dark:text-neutral-100 border-gray-200 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-blue-400/40" />
        </div>
        <div class="flex flex-wrap gap-2">
          <label class="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 cursor-pointer">
            <input type="checkbox" v-model="showCommits" @change="refresh" class="rounded border-gray-300 dark:border-neutral-600" />
            커밋
          </label>
          <label class="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 cursor-pointer">
            <input type="checkbox" v-model="includePrereleases" class="rounded border-gray-300 dark:border-neutral-600" />
            프리릴리즈
          </label>
          <label class="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 cursor-pointer">
            <input type="checkbox" v-model="includeDrafts" class="rounded border-gray-300 dark:border-neutral-600" />
            드래프트
          </label>
        </div>
      </div>

      <div v-if="loading && releases.length === 0" class="space-y-3">
        <div v-for="n in 3" :key="n" class="p-4 rounded-2xl border bg-white/80 dark:bg-neutral-900/70 border-gray-200 dark:border-neutral-700 animate-pulse">
          <div class="h-4 w-32 bg-gray-200 dark:bg-neutral-700 rounded mb-3"></div>
          <div class="h-3 w-full bg-gray-200 dark:bg-neutral-700 rounded mb-2"></div>
          <div class="h-3 w-3/4 bg-gray-200 dark:bg-neutral-700 rounded"></div>
        </div>
      </div>

      <div v-else-if="filtered.length === 0" class="p-8 rounded-2xl border bg-white/90 dark:bg-neutral-900/90 border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-neutral-300 text-center">
        <Package class="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-neutral-600" />
        <p class="text-sm">릴리즈가 없습니다.</p>
      </div>

      <div v-else class="space-y-3">
        <div v-for="rel in filtered" :key="rel.id" class="rounded-2xl border bg-white/90 dark:bg-neutral-900/90 border-gray-200 dark:border-neutral-700 shadow-sm overflow-hidden">
          <button type="button" class="w-full text-left p-4 flex justify-between items-start gap-3 hover:bg-gray-50/70 dark:hover:bg-neutral-800/40" @click="toggleExpand(rel.id)">
            <div class="min-w-0 flex-1">
              <h3 class="font-semibold text-gray-800 dark:text-neutral-100 truncate">{{ rel.tag_name }}</h3>
              <p v-if="rel.name" class="text-sm text-gray-500 dark:text-neutral-400 truncate mt-1">{{ rel.name }}</p>
              <p class="text-xs text-gray-500 dark:text-neutral-400 mt-1">{{ formatDate(rel.published_at || rel.created_at) }}</p>
            </div>
            <ChevronDown class="w-5 h-5 text-gray-400 transition-transform" :class="expandedId === rel.id ? 'rotate-180' : ''" />
          </button>
          <div v-show="expandedId === rel.id" class="px-4 pb-4 prose dark:prose-invert max-w-none prose-sm">
            <div v-html="renderMarkdown(rel.body)"></div>
          </div>
        </div>
      </div>

      <div v-if="showCommits && filteredCommits.length > 0" class="rounded-2xl border border-gray-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-gray-100 dark:border-neutral-800">
          <div class="flex items-center gap-2">
            <GitCommit class="w-5 h-5 text-gray-500" />
            <h3 class="font-semibold text-gray-900 dark:text-neutral-100">최근 커밋</h3>
            <span class="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-400">
              {{ filteredCommits.length }}
            </span>
          </div>
        </div>

        <div class="h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-neutral-800">
          <div v-for="commit in filteredCommits.slice(0, 10)" :key="commit.sha" class="p-3 hover:bg-gray-50 dark:hover:bg-neutral-800/30">
            <div class="flex items-start gap-3">
              <img v-if="commit.author" :src="commit.author.avatar_url" :alt="commit.author.login" class="w-6 h-6 rounded-full" />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-gray-900 dark:text-neutral-100 leading-tight">
                  {{ truncateCommitMessage(commit.commit.message, 40) }}
                </p>
                <div class="flex items-center gap-2 mt-1">
                  <code class="text-xs font-mono px-1 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded">{{ getCommitHash(commit.sha) }}</code>
                  <span class="text-xs text-gray-500">{{ formatRelativeTime(commit.commit.author.date) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.prose :where(p):not(:first-child){ margin-top:.5rem }
.prose :where(pre){ max-width:100%; overflow:auto }
header.sticky{ box-shadow:0 6px 10px -10px rgba(0,0,0,.25) }
.overflow-y-auto::-webkit-scrollbar{ width:6px }
.overflow-y-auto::-webkit-scrollbar-track{ background:transparent }
.overflow-y-auto::-webkit-scrollbar-thumb{ background:rgba(156,163,175,.5); border-radius:3px }
.overflow-y-auto::-webkit-scrollbar-thumb:hover{ background:rgba(156,163,175,.8) }
@media (max-width:640px){
  .prose{ font-size:.875rem }
  .prose :where(h1,h2,h3,h4){ font-size:1rem; margin-top:1rem; margin-bottom:.5rem }
}
</style>
