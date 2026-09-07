<script setup lang="ts">
import {ref, onMounted, watch} from 'vue'
import { Star, ExternalLink, ChevronDown, ChevronUp} from 'lucide-vue-next'
import SideModal from './SideModal.vue'
import PlayerDetail from './PlayerDetail.vue'

const props = defineProps({
  items: {
    type: Array as () => Record<string, string>[],
    required: true
  },
  columns: {
    type: Array as () => string[],
    required: true
  }
})

interface TeamHistory {
  key: string
  name: string
  logo: string
}
interface TeamSetting {
  id: number
  history: TeamHistory[]
}

// 🌟 본사에서 넘어오는 throwBatting 번역 추가!
const head = {
  grade : '등급',
  rarity : '희귀도',
  name : '이름',
  team : '구단',
  year : '연도',
  position : '포지션',
  throwBatting : '투/타', // 🌟 이 부분이 핵심!
  pitchingType : '피칭타입',
  skill : '스킬',
  synergy : '시너지',
  open : '상세정보',
}

const teamData = ref<TeamSetting[]>([])

onMounted(async () => {
  const res = await fetch('/DB/setting.json')
  teamData.value = await res.json()
})

function findTeamLogoByKey(teamKey: string): string | null {
  for (const team of teamData.value) {
    for (const history of team.history) {
      if (history.key === teamKey) return history.logo
    }
  }
  return null
}

function findTeamLogoByName(teamKey: string): string | null {
  for (const team of teamData.value) {
    for (const history of team.history) {
      if (history.key === teamKey) return history.name
    }
  }
  return null
}

function parsePosition(value: string): string {
  try {
    const arr = JSON.parse(value)
    return Array.isArray(arr) ? arr.join(', ') : value
  } catch {
    return value
  }
}

function translatePitchingType(input: string): string {
  if (input === 'O') return '오버 핸드'
  if (input === 'U') return '언더 핸드'
  if (input === 'S') return '사이드 암'
  return input
}

const showModal = ref(false)
const selectedItem = ref<Record<string, any> | null>(null)

function openModal(item: Record<string, any>) {
  selectedItem.value = item
  showModal.value = true
}
watch(showModal, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
const expandedRowIndex = ref<number | null>(null)

function toggleExpanded(index: number) {
  expandedRowIndex.value = expandedRowIndex.value === index ? null : index
}

</script>

<template>
  <div v-if="items.length !=0" class="max-w-[1600px] w-full mx-auto p-2">
    <!-- 모바일/태블릿: 카드 리스트 -->
    <div class="grid gap-3 md:hidden">
      <article
          v-for="(item, index) in items"
          :key="'card-' + index"
          class="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md transition-shadow"
      >
        <div class="p-4 flex items-start gap-4">
          <div class="shrink-0 w-16 h-16 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center">
            <img
                :src="`/assets/logos/grade/${item.grade}.png`"
                :alt="item.grade"
                class="w-16 h-16 object-contain"
            />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-3">
              <h3 class="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate">
                {{ item.name }}
              </h3>
              <div class="flex gap-0.5 shrink-0">
                <Star
                    v-for="i in Number(item.rarity)"
                    :key="'m-star-' + i"
                    class="w-4 h-4 text-yellow-400"
                    fill="currentColor"
                />
              </div>
            </div>

            <div class="mt-1 flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-300">
              <div class="flex items-center gap-2">
                <img
                    :src="findTeamLogoByKey(item.team)"
                    :alt="item.team"
                    class="w-5 h-5 object-contain"
                />
                <span class="truncate">{{ findTeamLogoByName(item.team) }}</span>
              </div>
              <span class="text-neutral-300 dark:text-neutral-500">•</span>
              <span>{{ item.year || '해당 없음' }}</span>
            </div>

            <div class="mt-2 flex flex-wrap items-center gap-2">
              <span class="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                {{ parsePosition(item.position) }}
              </span>
              <!-- 🌟 모바일 카드에서도 throwBatting 본사 데이터 직접 사용 -->
              <span v-if="item.throwBatting" class="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                {{ item.throwBatting }}
              </span>
              <span v-if="item.pitchingType" class="px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200 border border-purple-200 dark:border-purple-800">
                {{ translatePitchingType(item.pitchingType) }}
              </span>
            </div>

            <div
                class="mt-3 w-full rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-2"
            >
              <p
                  class="text-sm text-neutral-800 dark:text-neutral-100 leading-snug whitespace-pre-line break-words"
                  :style="expandedRowIndex === index
                  ? {}
                  : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }"
              >
                {{ item.synergy }}
              </p>
              <button
                  v-if="(item.synergy || '').length > 40"
                  @click="toggleExpanded(index)"
                  :aria-expanded="expandedRowIndex === index"
                  class="mt-2 inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300 hover:text-blue-600 transition"
              >
                <component :is="expandedRowIndex === index ? ChevronUp : ChevronDown" class="w-3.5 h-3.5" />
                <span>{{ expandedRowIndex === index ? '접기' : '더보기' }}</span>
              </button>
            </div>

            <div class="mt-3 flex justify-end">
              <button
                  @click="openModal(item)"
                  class="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
              >
                <ExternalLink class="w-4 h-4" />
                상세보기
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>

    <!-- 데스크탑: 테이블 -->
    <div class="overflow-x-auto hidden md:block">
      <table class="min-w-full text-sm table-fixed rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
        <thead class="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold text-xs uppercase tracking-wide">
        <tr>
          <!-- 🌟 기둥 너비 조절: throwBatting을 100px로 깔끔하게 배치 -->
          <th
              v-for="col in columns"
              :key="'th-' + col"
              :class="[
                'border-b border-neutral-300 dark:border-neutral-700 whitespace-nowrap text-center h-[48px] px-3',
                col === 'grade' ? 'w-[80px]' :
                col === 'rarity' ? 'w-[100px]' :
                col === 'team' ? 'w-[180px]' :
                col === 'year' ? 'w-[100px]' :
                col === 'position' ? 'w-[120px]' :
                col === 'throwBatting' ? 'w-[100px]' : 
                col === 'pitchingType' ? 'w-[140px]' :
                col === 'synergy' ? 'w-[600px]' :
                col === 'open' ? 'w-[90px]' :
                'w-[140px]'
              ]"
          >
            <!-- 🌟 본사에서 등록한 head 객체의 한글 이름 렌더링 -->
            {{ head[col as keyof typeof head] || col }} 
          </th>
        </tr>
        </thead>
        <tbody>
        <tr
            v-for="(item, index) in items"
            :key="'row-' + index"
            :class="index % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-neutral-50 dark:bg-neutral-800/60'"
            class="hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
        >
          <td
              v-for="col in columns"
              :key="'td-' + col + '-' + index"
              :class="[
                'border-b border-neutral-200 dark:border-neutral-700 whitespace-nowrap align-middle text-sm text-neutral-800 dark:text-neutral-100 h-[56px] px-3',
                col === 'synergy' ? 'text-left' : 'text-center'
              ]"
          >
            <template v-if="col === 'grade'">
              <img
                  :src="`/assets/logos/grade/${item[col]}.png`"
                  :alt="item[col]"
                  class="w-[90px] mx-auto"
              />
            </template>

            <template v-else-if="col === 'rarity'">
              <div class="flex justify-center gap-0.5">
                <Star
                    v-for="i in Number(item[col])"
                    :key="'d-star-' + i"
                    class="w-4 h-4 text-yellow-400"
                    fill="currentColor"
                />
              </div>
            </template>

            <template v-else-if="col === 'team'">
              <div class="grid grid-cols-[50px_1fr] items-center w-[160px] mx-auto">
                <div class="w-[50px] h-[50px] flex items-center justify-center">
                  <img
                      :src="findTeamLogoByKey(item[col])"
                      :alt="item[col]"
                      class="w-[32px] h-[32px] object-contain"
                  />
                </div>
                <span class="text-sm leading-tight text-center">
                    {{ findTeamLogoByName(item[col]) }}
                  </span>
              </div>
            </template>

            <template v-else-if="col === 'year'">
              <span>{{ item[col] || '해당 없음' }}</span>
            </template>

            <template v-else-if="col === 'position'">
              <span>{{ parsePosition(item[col]) }}</span>
            </template>

            <!-- 🌟 데스크탑 테이블에서도 throwBatting 본사 데이터 직접 렌더링 -->
            <template v-else-if="col === 'throwBatting'">
              <span>{{ item[col] }}</span>
            </template>

            <template v-else-if="col === 'pitchingType'">
              <span>{{ translatePitchingType(item[col]) }}</span>
            </template>

            <template v-else-if="col === 'synergy'">
              <div
                  class="w-full text-left flex items-start justify-between gap-3 rounded-md bg-neutral-50 dark:bg-neutral-800 px-3 py-2 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-all duration-300"
              >
                <p
                    class="flex-1 text-sm text-neutral-800 dark:text-neutral-100 select-text whitespace-pre-line break-words leading-snug transition-all duration-300"
                    :style="expandedRowIndex === index
                      ? {}
                      : { display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }"
                >
                  {{ item[col] }}
                </p>

                <button
                    v-if="(item[col] || '').length > 25"
                    @click="toggleExpanded(index)"
                    :aria-expanded="expandedRowIndex === index"
                    class="text-neutral-500 hover:text-blue-600 transition-colors duration-150 mt-0.5 shrink-0 cursor-pointer focus:outline-none"
                    :title="expandedRowIndex === index ? '시너지 접기' : '시너지 전체 보기'"
                >
                  <component :is="expandedRowIndex === index ? ChevronUp : ChevronDown" class="w-4 h-4" />
                </button>
              </div>
            </template>

            <template v-else-if="col === 'open'">
              <button @click="openModal(item)" class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm">
                <ExternalLink class="w-4 h-4" />
                열기
              </button>
            </template>

            <template v-else>
              {{ item[col] }}
            </template>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <!-- 사이드 모달 -->
    <SideModal
        v-if="selectedItem"
        :show="showModal"
        :player="selectedItem"
        @update:show="val => showModal = val"
    >
      <PlayerDetail :player="selectedItem" />
    </SideModal>
  </div>
  <div v-else class="max-w-[1600px] w-full h-[700px] mx-auto p-2 text-center">
    <span class="text-xl font-bold">
      조건에 맞는 선수가 없어요.
    </span>
  </div>
</template>
