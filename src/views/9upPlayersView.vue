<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, defineExpose } from 'vue'
import Papa from 'papaparse'
import PlayerTable from '@/components/table.vue'
import FilterPanel from '@/components/FilterPanel.vue'
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-vue-next'

/* =========================
   State
========================= */
const players = ref<Record<string, any>[]>([])
const filters = ref<Record<string, any>>({})

/* =========================
   Pagination
========================= */
const currentPage = ref(1)
const pageSize = 20

/* =========================
   Fields
========================= */
const inputFields = ['name', 'team', 'year', 'skill', 'synergy', 'excludedSynergy'] as const
const rarityField = 'rarity'
const fieldLabels: Record<string, string> = {
  grade: '등급',
  rarity: '레어도',
  name: '이름 (부분 일치)',
  team: '팀',
  year: '연도',
  position: '포지션',
  battingHand: '타격 유형',
  throwHand: '투구 유형',
  pitchingType: '투구 폼',
  skill: '스킬',
  synergy: '시너지 (정확 일치 AND)',
  excludedSynergy: '제외할 시너지 (NOT)',
  enhancedSkill: '강화 스킬',
  search: '이름/시너지 검색'
}

// 탭 제거 → 양쪽 필드 모두 노출
const selectFields = computed(() => [
  'grade',
  'position',
  'battingHand',
  'throwHand',
  'pitchingType',
  'skill',
  'search',
  'enhancedSkill',
] as const)

const allFields = computed(() => [...inputFields, ...selectFields.value, rarityField])

/* =========================
   Table Columns
========================= */
const columns = ref([
  'grade',
  'rarity',
  'name',
  'team',
  'year',
  'position',
  'battingHand',
  'throwHand',
  'pitchingType',
  'synergy',
  'open',
])

/* =========================
   Utils
========================= */
const CSV_SPLIT = /[,\u3001;、]+/
const lc = (s: unknown) => String(s ?? '').toLowerCase().trim()
const normText = (s: unknown) =>
    String(s ?? '')
        .normalize('NFKC')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()


const POSITION_ALIASES: Record<string, string> = {
  'b1': '1B', '1b': '1B', '1': '1B', '1루': '1B',
  'b2': '2B', '2b': '2B', '2': '2B', '2루': '2B',
  'b3': '3B', '3b': '3B', '3': '3B', '3루': '3B',
  'c': 'C', '포': 'C',
  'ss': 'SS', '유격': 'SS',
  'lf': 'LF', '좌익': 'LF',
  'cf': 'CF', '중견': 'CF',
  'rf': 'RF', '우익': 'RF',
  'sp': 'SP', '선발': 'SP',
  'rp': 'RP', '불펜': 'RP',
  'dh': 'DH', '지타': 'DH',
}

const normalizePosition = (position: any): string => {
  const str = String(position ?? '').replace(/['"\[\]]+/g, '').trim()
  if (!str) return ''
  const lower = str.toLowerCase()
  return POSITION_ALIASES[lower] ?? str.toUpperCase()
}

const toArray = (v: unknown, { allowComma = true }: { allowComma?: boolean } = {}) => {
  if (Array.isArray(v)) return v.map(x => String(x).replace(/[\[\]"'`]/g, '').trim()).filter(Boolean)
  if (typeof v === 'string') {
    const t = v.replace(/[\[\]"'`]/g, '').trim()
    const splitter = allowComma ? CSV_SPLIT : /[\u3001;、;]+/
    return t.split(splitter).map(s => s.trim()).filter(Boolean)
  }
  return [String(v ?? '').replace(/[\[\]"'`]/g, '').trim()].filter(Boolean)
}

const dedupeCI = (list: string[]) => {
  const seen = new Set<string>(); const out: string[] = []
  for (const s of list) { const k = s.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(s) } }
  return out
}

/* =========================
   Autocomplete / Options
========================= */
const nameOptions = computed(() =>
    Array.from(new Set(players.value.map(p => String(p.name || '').trim()))).filter(Boolean)
)

const synergyOptions = ref<string[]>([])

async function loadSynergyOptions() {
  try {
    const res = await fetch('/DB/synergys.json')
    if (res.ok) {
      const json = await res.json()
      const arr: string[] = Array.isArray(json)
          ? json.map((x: any) => (typeof x === 'string' ? x : x?.synergy)).filter(Boolean)
          : []
      synergyOptions.value = dedupeCI(arr.map(s => String(s).trim())).sort((a, b) => a.localeCompare(b))
      return
    }
  } catch { /* ignore */ }

  // fallback: CSV에서 추출
  const tokens: string[] = []
  for (const p of players.value) toArray(p.synergy).forEach(t => tokens.push(String(t)))
  synergyOptions.value = dedupeCI(tokens.map(s => s.trim())).sort((a, b) => a.localeCompare(b))
}

/* =========================
   Filter Options
========================= */
const filterOptions = computed(() => {
  const options: Record<string, Set<string>> = {}
  const fieldsToScan = [...selectFields.value, 'team', 'grade', 'skill'] as const

  for (const field of fieldsToScan) {
    options[field] = new Set<string>()
    for (const p of players.value) {
      const raw = p[field as string]
      if (raw == null || raw === '') continue

      if (field === 'position') {
        toArray(raw).forEach(v => options[field].add(normalizePosition(v)))
      } else if (field === 'enhancedSkill') {
        toArray(raw, { allowComma: false }).forEach(v => options[field].add(v))
      } else {
        toArray(raw).forEach(v => options[field].add(v))
      }
    }
  }

  const searchSet = new Set<string>()
  for (const p of players.value) {
    if (p.name) searchSet.add(String(p.name).trim())
    toArray(p.synergy).forEach(v => searchSet.add(v))
    toArray(p.team).forEach(v => searchSet.add(v))
    toArray(p.skill).forEach(v => searchSet.add(v))
  }
  options['searchSuggestions'] = searchSet
  const res = Object.fromEntries(
      Object.entries(options).map(([k, set]) => [k, [...set].sort((a, b) => a.localeCompare(b))])
  )
  
  // 가장 최신 팀 ID(대표 ID)만 남겨서 FilterPanel에서 로고를 정상적으로 불러올 수 있게 합니다.
  res['team'] = [
    'ssg',
    'kiwoom',
    'kia',
    'samsung',
    'doosan',
    'lotte',
    'lg',
    'hanwha',
    'nc',
    'kt',
    'hyundai',
    'sbw'
  ]
  return res
})

/* =========================
   Preprocessed players
========================= */
type Prepared = {
  raw: Record<string, any>
  nameNorm: string
  teamLc: string[]
  skillLc: string[]
  enhancedSkillLc: string[]
  positionLc: string[]
  yearsNum: number[]
  synergyNormSet: Set<string>
}

const preparedPlayers = computed<Prepared[]>(() =>
    players.value.map((p) => ({
      raw: p,
      nameNorm: normText(p.name),
      teamLc: toArray(p.team).map(lc),
      skillLc: toArray(p.skill).map(lc),
      enhancedSkillLc: toArray(p.enhancedSkill, { allowComma: false }).map(lc),
      positionLc: toArray(p.position).map(v => normalizePosition(v).toLowerCase()),
      yearsNum: toArray(p.year).map(n => Number(n)).filter(n => !Number.isNaN(n)),
      synergyNormSet: new Set(toArray(p.synergy).map(normText)),
    }))
)

/* =========================
   Filtering
========================= */
const filteredPlayers = computed(() => {
  return preparedPlayers.value
      .filter(({ raw: p, teamLc, skillLc, enhancedSkillLc, positionLc, yearsNum, nameNorm, synergyNormSet }) => {

        // 🌟 수정됨: 고졸+대졸 셔틀 동시보유 필터링 (쓰레기 문자/수식어 완벽 방어 엔진)
        if (filters.value.hsUniSynergyOnly) {
           const hasHs = Array.from(synergyNormSet).some(s => /(고|상고|공고|고등학교)(?:\s*\(.*?\))?[^가-힣a-zA-Z0-9]*$/.test(s));
           const hasUni = Array.from(synergyNormSet).some(s => /(대|대학교)(?:\s*\(.*?\))?[^가-힣a-zA-Z0-9]*$/.test(s));
           if (!hasHs || !hasUni) return false;
        }

        for (const field of allFields.value) {
          const selected = filters.value[field]
          if (!selected || (Array.isArray(selected) && selected.length === 0)) continue

          if (field === rarityField) {
            if (Number(p[field]) !== Number(selected)) return false
            continue
          }
          if (field === 'team') {
            // 대표 팀 ID를 선택하면 전신 구단까지 모두 포함하여 검색하도록 확장
            const teamExpand: Record<string, string[]> = {
              'ssg': ['ssg', 'sk'],
              'kiwoom': ['kiwoom', 'nexen'],
              'kia': ['kia', 'haitai'],
              'samsung': ['samsung'],
              'doosan': ['doosan', 'ob'],
              'lotte': ['lotte'],
              'lg': ['lg', 'mbc'],
              'hanwha': ['hanwha', 'binggrae'],
              'nc': ['nc'],
              'kt': ['kt'],
              'hyundai': ['hyundai', 'pacific', 'chungbo', 'sammi'],
              'sbw': ['sbw']
            }
            const isMatch = (selected as string[]).some(sel => {
              if (sel === 'all') return true;
              const targetTeams = teamExpand[sel] || [sel];
              return targetTeams.some(t => teamLc.includes(lc(t)));
            });
            if (!isMatch) return false;
            continue
          }
          if (field === 'year') {
            if (!(selected as string[]).some(sel => yearsNum.includes(Number(sel)))) return false
            continue
          }
          if (field === 'skill') {
            if (!(selected as string[]).every(sel => skillLc.includes(lc(sel)))) return false
            continue
          }
          if (field === 'enhancedSkill') {
            if (!(selected as string[]).every(sel => enhancedSkillLc.includes(lc(sel)))) return false
            continue
          }
          if (field === 'position') {
            if (!(selected as string[]).some(sel => positionLc.includes(normalizePosition(sel).toLowerCase()))) return false
            continue
          }
          // 🌟 이름 복합 검색 (쉼표=OR, 띄어쓰기=AND)
          if (field === 'name') {
             const searchGroups = String(selected).split(',').map(g => g.trim()).filter(Boolean)
                 .map(g => g.split(/\s+/).map(t => normText(t)).filter(Boolean));
             if (searchGroups.length > 0) {
                const isMatch = searchGroups.some(tokens => tokens.every(t => nameNorm.includes(t)));
                if (!isMatch) return false;
             }
             continue
          }
          // 🌟 시너지 복합 검색 (포함해야 하는 조건: AND)
          if (field === 'synergy') {
            if (Array.isArray(selected)) {
              const selectedTerms = selected.map(s => normText(String(s)));
              const hasAll = selectedTerms.every(term => 
                 Array.from(synergyNormSet).some(playerSyn => playerSyn.includes(term))
              );
              if (!hasAll) return false;
            } else {
              const rawSynergy = String(selected);
              const searchGroups = rawSynergy.split(',').map(g => g.trim()).filter(Boolean)
                   .map(g => g.split(/\s+/).map(t => normText(t)).filter(Boolean));
              
              if (searchGroups.length > 0) {
                 const hay = Array.from(synergyNormSet).join(' ');
                 const isMatch = searchGroups.some(tokens => tokens.every(t => hay.includes(t)));
                 if (!isMatch) return false;
              }
            }
            continue
          }

          // 🌟 시너지 제외 검색 (제외할 조건: NOT)
          if (field === 'excludedSynergy') {
            if (Array.isArray(selected)) {
              const excludedTerms = selected.map(s => normText(String(s)));
              const hasAny = excludedTerms.some(term => 
                 Array.from(synergyNormSet).some(playerSyn => playerSyn.includes(term))
              );
              // 제외 키워드가 하나라도 포함되어 있으면 즉시 검색 탈락!
              if (hasAny) return false; 
            } else {
              const rawExcluded = String(selected);
              const searchGroups = rawExcluded.split(',').map(g => g.trim()).filter(Boolean)
                   .map(g => g.split(/\s+/).map(t => normText(t)).filter(Boolean));
              
              if (searchGroups.length > 0) {
                 const hay = Array.from(synergyNormSet).join(' ');
                 // 제외 키워드 그룹에 하나라도 일치하면 검색 탈락!
                 const isMatch = searchGroups.some(tokens => tokens.every(t => hay.includes(t)));
                 if (isMatch) return false; 
              }
            }
            continue
          }

          // 기본 동일성 비교
          if (Array.isArray(selected)) {
            if (!(selected as unknown[]).map(String).includes(String(p[field]))) return false
          } else {
            if (String(p[field]) !== String(selected)) return false
          }
        }
        return true
      })
      .map(pp => pp.raw)
})
   
/* =========================
   Pagination (derived)
========================= */
const totalCount = computed(() => filteredPlayers.value.length)
const totalAll   = computed(() => players.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize)))
const paginatedPlayers = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredPlayers.value.slice(start, start + pageSize)
})
const pageStartIndex = computed(() => Math.max(0, (currentPage.value - 1) * pageSize))
const pageEndIndex = computed(() => Math.min(pageStartIndex.value + paginatedPlayers.value.length, totalCount.value))

const page = computed({
  get: () => currentPage.value,
  set: (v: number) => { currentPage.value = Math.min(Math.max(1, Math.trunc(v || 1)), totalPages.value) }
})
const goToPage = (pn: number) => { page.value = pn }

/* =========================
   Watchers
========================= */
watch(() => ({ ...filters.value }), () => { currentPage.value = 1 }, { deep: true })

/* =========================
   Load CSV (통합)
========================= */
onMounted(loadCsv)

async function loadCsv() {
  const path = '/DB/player_sorted.csv'
  const res = await fetch(path)
  const text = await res.text()

  const parsed: Record<string, any>[] = []
  Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      for (const row of results.data as any[]) parsed.push(row)
    }
  })

  players.value = parsed
  await nextTick()

  // 초기 필터: 등급 전체 선택, 나머지 기본값
  const grades = filterOptions.value.grade ?? []
  if (!Array.isArray(filters.value.grade) || filters.value.grade.length === 0) {
    filters.value.grade = grades
  }
  if (typeof filters.value.name !== 'string') filters.value.name = ''
  if (!Array.isArray(filters.value.synergy)) filters.value.synergy = []
  if (!Array.isArray(filters.value.search)) filters.value.search = []

  await loadSynergyOptions()
  currentPage.value = 1
}

/* =========================
   Expose counts
========================= */
defineExpose({ totalFiltered: totalCount, totalAll })
</script>

<template>
  <div class="min-h-screen space-y-8 font-sans">
    <!-- Filters -->
    <FilterPanel
        :all-fields="allFields"
        :select-fields="selectFields"
        :rarity-field="rarityField"
        :filter-options="filterOptions"
        :field-labels="fieldLabels"
        :synergy-options="synergyOptions"
        :name-options="nameOptions"
        v-model:filters="filters"
    />

    <!-- Table -->
    <PlayerTable :items="paginatedPlayers" :columns="columns" />

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="mt-6 flex flex-col items-center gap-3">
      <nav class="inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
        <button
            class="px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-l-md
                 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300
                 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:pointer-events-none
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            :disabled="page === 1"
            @click="goToPage(1)"
            aria-label="첫 페이지">
          <ChevronsLeft class="h-4 w-4" />
          <span class="sr-only">첫 페이지</span>
        </button>

        <button
            class="px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700
                 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300
                 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:pointer-events-none
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            :disabled="page === 1"
            @click="goToPage(page - 1)"
            aria-label="이전">
          <ChevronLeft class="h-4 w-4" />
          <span class="sr-only">이전</span>
        </button>

        <span
            class="px-4 py-2 text-sm border border-neutral-300 dark:border-neutral-700
                 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200">
          {{ page }} / {{ totalPages }}
        </span>

        <button
            class="px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700
                 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300
                 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:pointer-events-none
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            :disabled="page === totalPages"
            @click="goToPage(page + 1)"
            aria-label="다음">
          <ChevronRight class="h-4 w-4" />
          <span class="sr-only">다음</span>
        </button>

        <button
            class="px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-r-md
                 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300
                 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:pointer-events-none
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            :disabled="page === totalPages"
            @click="goToPage(totalPages)"
            aria-label="마지막 페이지">
          <ChevronsRight class="h-4 w-4" />
          <span class="sr-only">마지막 페이지</span>
        </button>
      </nav>

      <div class="text-xs text-neutral-500 dark:text-neutral-400">
        {{ totalCount ? (pageStartIndex + 1) : 0 }}–{{ pageEndIndex }} / {{ totalCount }}
      </div>
    </div>
  </div>
</template>
