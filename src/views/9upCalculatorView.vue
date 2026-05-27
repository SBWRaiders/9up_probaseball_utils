<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import Papa from 'papaparse'
import { Search, Calculator, Star, Shield, Zap, TrendingUp, X } from 'lucide-vue-next'

type Raw = Record<string, any>

const isLoading = ref(true)
const players = ref<Raw[]>([])
const searchQuery = ref('')
const selectedPlayer = ref<Raw | null>(null)

// 엑셀 계산기 스타일의 스탯 상태 (타자용, 투수용)
const batterStats = reactive({
  contact: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '컨택' },
  gapPower: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '갭파워' },
  homeRunPower: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '홈런파워' },
  plateDiscipline: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '선구' },
  strikeoutAvoidance: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '삼진회피' },
  stealing: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '도루' },
  baseRunning: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '주루' },
  defense: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '수비' },
})

const pitcherStats = reactive({
  movement: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '무브먼트' },
  longHitSup: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '장타억제' },
  hrSup: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '홈런억제' },
  control: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '컨트롤' },
  stuff: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '스터프' },
  defense: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '수비' },
  pitchLimit: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '한계투구' },
  runnerCtrl: { base: 0, enhance: 0, skill: 0, synergy: 0, label: '주자견제' },
})

const isPitcher = computed(() => {
  if (!selectedPlayer.value) return false
  const pos = String(selectedPlayer.value.position || '').toUpperCase()
  return pos.includes('SP') || pos.includes('RP') || !!selectedPlayer.value.movement
})

// 데이터 불러오기
onMounted(async () => {
  try {
    const response = await fetch('/DB/player_sorted.csv', { cache: 'no-store' })
    const csvText = await response.text()
    const result: Raw[] = []
    Papa.parse(csvText, {
      header: true, skipEmptyLines: true,
      complete: ({ data }) => (data as Raw[]).forEach(row => result.push(row))
    })
    players.value = result
  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
})

// 검색 필터링
const filteredPlayers = computed(() => {
  if (!searchQuery.value.trim()) return []
  const query = searchQuery.value.toLowerCase().trim()
  return players.value.filter(p => 
    String(p.name || '').toLowerCase().includes(query) ||
    String(p.team || '').toLowerCase().includes(query)
  ).slice(0, 50)
})

// 선수 선택 시 기본 스탯 연동
const selectPlayer = (p: Raw) => {
  selectedPlayer.value = p
  searchQuery.value = ''
  
  // 모든 스탯 초기화
  Object.values(batterStats).forEach(stat => { stat.base=0; stat.enhance=0; stat.skill=0; stat.synergy=0 })
  Object.values(pitcherStats).forEach(stat => { stat.base=0; stat.enhance=0; stat.skill=0; stat.synergy=0 })
  
  if (isPitcher.value) {
    pitcherStats.movement.base = Number(p.movement || 0)
    pitcherStats.longHitSup.base = Number(p.longHitSuppression || 0)
    pitcherStats.hrSup.base = Number(p.homeRunSuppression || 0)
    pitcherStats.control.base = Number(p.control || 0)
    pitcherStats.stuff.base = Number(p.stuff || 0)
    pitcherStats.defense.base = Number(p.defense || 0)
    pitcherStats.pitchLimit.base = Number(p.pitchLimit || 0)
    pitcherStats.runnerCtrl.base = Number(p.runnerControl || 0)
  } else {
    batterStats.contact.base = Number(p.contact || 0)
    batterStats.gapPower.base = Number(p.gapPower || 0)
    batterStats.homeRunPower.base = Number(p.homeRunPower || 0)
    batterStats.plateDiscipline.base = Number(p.plateDiscipline || 0)
    batterStats.strikeoutAvoidance.base = Number(p.strikeoutAvoidance || 0)
    batterStats.stealing.base = Number(p.stealing || 0)
    batterStats.baseRunning.base = Number(p.baseRunning || 0)
    batterStats.defense.base = Number(p.defense || 0)
  }
}

// 스탯 총합 계산기 (각 행의 최종합)
const getStatTotal = (stat: { base: number, enhance: number, skill: number, synergy: number }) => {
  return stat.base + (stat.enhance || 0) + (stat.skill || 0) + (stat.synergy || 0)
}

// 파워(종합 OVR) 계산기
const totalPower = computed(() => {
  let baseSum = 0, enhanceSum = 0, skillSum = 0, synergySum = 0, finalSum = 0
  
  const stats = isPitcher.value ? Object.values(pitcherStats) : Object.values(batterStats)
  
  stats.forEach(s => {
    baseSum += s.base
    enhanceSum += (s.enhance || 0)
    skillSum += (s.skill || 0)
    synergySum += (s.synergy || 0)
    finalSum += getStatTotal(s)
  })
  
  return { baseSum, enhanceSum, skillSum, synergySum, finalSum }
})

// 유틸: 텍스트 배열화
const getArray = (str: any) => {
  if (!str) return []
  return String(str).split(',').map(s => s.trim()).filter(Boolean)
}
</script>

<template>
  <div class="bg-neutral-50 dark:bg-neutral-900 min-h-screen transition-colors p-4 lg:p-8">
    <div class="max-w-[1400px] mx-auto">
      <!-- 헤더 -->
      <header class="mb-6 flex items-center gap-3">
        <div class="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20">
          <Calculator class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">스탯 계산기</h1>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">엑셀 없이 웹에서 편하게 선수의 최종 스탯과 종합 파워를 계산해보세요.</p>
        </div>
      </header>

      <div v-if="isLoading" class="flex h-64 items-center justify-center">
        <div class="animate-spin rounded-full border-4 border-neutral-300 dark:border-neutral-600 border-t-blue-600 h-10 w-10"></div>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- 왼쪽: 선수 검색 -->
        <div class="lg:col-span-4 flex flex-col gap-6">
          <section class="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-5">
            <h2 class="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
              <Search class="w-4 h-4 text-blue-500" /> 선수 찾기
            </h2>
            <div class="relative mb-4">
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="이름이나 팀명으로 검색..." 
                class="w-full pl-10 pr-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors text-neutral-900 dark:text-neutral-100"
              />
              <Search class="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <button v-if="searchQuery" @click="searchQuery = ''" class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                <X class="w-4 h-4" />
              </button>
            </div>
            
            <div v-if="searchQuery && filteredPlayers.length > 0" class="max-h-[400px] overflow-y-auto space-y-2 pr-2">
              <button 
                v-for="p in filteredPlayers" :key="p.id" 
                @click="selectPlayer(p)"
                class="w-full text-left p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-neutral-700/50 transition-all flex items-center gap-4"
              >
                <img :src="`/assets/logos/grade/${p.grade || 'C'}.png`" class="w-10 h-10 object-contain" />
                <div>
                  <div class="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    {{ p.name }} <span class="text-xs font-normal bg-neutral-100 dark:bg-neutral-600 px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-300">{{ p.position }}</span>
                  </div>
                  <div class="text-xs text-neutral-500 mt-1">{{ p.team }} · {{ p.year }}</div>
                </div>
              </button>
            </div>
            <div v-else-if="searchQuery && filteredPlayers.length === 0" class="text-center py-10 text-neutral-500 text-sm">
              검색 결과가 없습니다.
            </div>
          </section>

          <!-- 선택된 선수 스킬/시너지 힌트 정보 -->
          <section v-if="selectedPlayer" class="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-5">
            <h2 class="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
              <Zap class="w-4 h-4 text-amber-500" /> 스킬 및 시너지 정보
            </h2>
            <div class="space-y-4">
              <div>
                <h3 class="text-xs font-bold text-neutral-400 dark:text-neutral-500 mb-2 uppercase tracking-wider">보유 시너지</h3>
                <div class="flex flex-wrap gap-1.5">
                  <span v-for="syn in getArray(selectedPlayer.synergy)" :key="syn" class="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs rounded-lg">{{ syn }}</span>
                  <span v-if="!getArray(selectedPlayer.synergy).length" class="text-xs text-neutral-400">없음</span>
                </div>
              </div>
              <div class="h-px w-full bg-neutral-100 dark:bg-neutral-700"></div>
              <div>
                <h3 class="text-xs font-bold text-neutral-400 dark:text-neutral-500 mb-2 uppercase tracking-wider">기본 스킬</h3>
                <div class="flex flex-wrap gap-1.5">
                  <span v-for="skill in getArray(selectedPlayer.skill)" :key="skill" class="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600 text-xs rounded-lg">{{ skill }}</span>
                  <span v-if="!getArray(selectedPlayer.skill).length" class="text-xs text-neutral-400">없음</span>
                </div>
              </div>
              <div class="h-px w-full bg-neutral-100 dark:bg-neutral-700"></div>
              <div>
                <h3 class="text-xs font-bold text-neutral-400 dark:text-neutral-500 mb-2 uppercase tracking-wider">강화 스킬</h3>
                <div class="flex flex-wrap gap-1.5">
                  <span v-for="eskill in getArray(selectedPlayer.enhancedSkill)" :key="eskill" class="px-2.5 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-medium rounded-lg">{{ eskill }}</span>
                  <span v-if="!getArray(selectedPlayer.enhancedSkill).length" class="text-xs text-neutral-400">없음</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- 오른쪽: 엑셀 형태 스탯 계산기 -->
        <div class="lg:col-span-8 flex flex-col gap-6">
          <section v-if="selectedPlayer" class="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <!-- 선수 요약 헤더 -->
            <div class="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex items-center gap-6">
              <img :src="`/assets/logos/grade/${selectedPlayer.grade || 'C'}.png`" class="w-16 h-16 object-contain bg-white/10 rounded-xl p-2" />
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="px-2 py-0.5 bg-white/20 rounded text-xs font-semibold tracking-wide">{{ isPitcher ? '투수' : '타자' }}</span>
                  <span class="px-2 py-0.5 bg-white/20 rounded text-xs font-semibold tracking-wide">{{ selectedPlayer.position }}</span>
                  <span class="text-blue-100 text-sm ml-2">{{ selectedPlayer.team }} · {{ selectedPlayer.year }}</span>
                </div>
                <h2 class="text-3xl font-extrabold flex items-center gap-3">
                  {{ selectedPlayer.name }}
                  <div class="flex text-amber-300">
                    <Star v-for="n in Number(selectedPlayer.rarity || 0)" :key="n" class="w-4 h-4" fill="currentColor" />
                  </div>
                </h2>
              </div>
              <div class="text-right flex flex-col items-end">
                <span class="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">종합 파워 (총합)</span>
                <span class="text-4xl font-black tabular-nums">{{ totalPower.finalSum }}</span>
              </div>
            </div>

            <!-- 계산기 테이블 -->
            <div class="p-6">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <TrendingUp class="w-5 h-5 text-blue-500" /> 세부 스탯 수동 계산기
                </h3>
              </div>

              <div class="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
                <table class="w-full text-sm text-center border-collapse">
                  <thead>
                    <tr class="bg-neutral-100 dark:bg-neutral-700/80 text-neutral-600 dark:text-neutral-300">
                      <th class="p-3 border-b border-r border-neutral-200 dark:border-neutral-700 font-semibold w-1/6">스탯 항목</th>
                      <th class="p-3 border-b border-r border-neutral-200 dark:border-neutral-700 font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10 w-1/6">DB 기본 스탯</th>
                      <th class="p-3 border-b border-r border-neutral-200 dark:border-neutral-700 font-semibold w-1/6">강화/훈련 (+)</th>
                      <th class="p-3 border-b border-r border-neutral-200 dark:border-neutral-700 font-semibold w-1/6">스킬 (+)</th>
                      <th class="p-3 border-b border-r border-neutral-200 dark:border-neutral-700 font-semibold w-1/6">시너지 (+)</th>
                      <th class="p-3 border-b border-neutral-200 dark:border-neutral-700 font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10 w-1/6">최종 스탯</th>
                    </tr>
                  </thead>
                  
                  <tbody>
                    <!-- 반복 렌더링 영역 (타자/투수에 따라 다름) -->
                    <template v-if="!isPitcher">
                      <tr v-for="(statObj, key) in batterStats" :key="key" class="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                        <td class="p-3 border-r border-neutral-200 dark:border-neutral-700 font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-50/50 dark:bg-neutral-700/20">
                          {{ statObj.label }}
                        </td>
                        <td class="p-3 border-r border-neutral-200 dark:border-neutral-700 font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/5">
                          {{ statObj.base }}
                        </td>
                        <td class="p-2 border-r border-neutral-200 dark:border-neutral-700">
                          <input type="number" v-model.number="statObj.enhance" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow" />
                        </td>
                        <td class="p-2 border-r border-neutral-200 dark:border-neutral-700">
                          <input type="number" v-model.number="statObj.skill" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow" />
                        </td>
                        <td class="p-2 border-r border-neutral-200 dark:border-neutral-700">
                          <input type="number" v-model.number="statObj.synergy" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow" />
                        </td>
                        <td class="p-3 font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/5">
                          {{ getStatTotal(statObj) }}
                        </td>
                      </tr>
                    </template>

                    <template v-else>
                      <tr v-for="(statObj, key) in pitcherStats" :key="key" class="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                        <td class="p-3 border-r border-neutral-200 dark:border-neutral-700 font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-50/50 dark:bg-neutral-700/20">
                          {{ statObj.label }}
                        </td>
                        <td class="p-3 border-r border-neutral-200 dark:border-neutral-700 font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/5">
                          {{ statObj.base }}
                        </td>
                        <td class="p-2 border-r border-neutral-200 dark:border-neutral-700">
                          <input type="number" v-model.number="statObj.enhance" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow" />
                        </td>
                        <td class="p-2 border-r border-neutral-200 dark:border-neutral-700">
                          <input type="number" v-model.number="statObj.skill" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow" />
                        </td>
                        <td class="p-2 border-r border-neutral-200 dark:border-neutral-700">
                          <input type="number" v-model.number="statObj.synergy" class="w-full px-2 py-1.5 text-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow" />
                        </td>
                        <td class="p-3 font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/5">
                          {{ getStatTotal(statObj) }}
                        </td>
                      </tr>
                    </template>
                  </tbody>

                  <!-- 파워 (총합) 요약 로우 -->
                  <tfoot class="bg-neutral-100 dark:bg-neutral-700/50">
                    <tr>
                      <td class="p-4 border-r border-neutral-200 dark:border-neutral-700 font-extrabold text-neutral-900 dark:text-neutral-100 uppercase tracking-widest text-base bg-blue-100/50 dark:bg-blue-900/20">
                        파워 (총합)
                      </td>
                      <td class="p-4 border-r border-neutral-200 dark:border-neutral-700 font-bold text-blue-700 dark:text-blue-300 bg-blue-100/30 dark:bg-blue-900/10 text-base tabular-nums">
                        {{ totalPower.baseSum }}
                      </td>
                      <td class="p-4 border-r border-neutral-200 dark:border-neutral-700 font-bold text-neutral-700 dark:text-neutral-300 tabular-nums">
                        +{{ totalPower.enhanceSum }}
                      </td>
                      <td class="p-4 border-r border-neutral-200 dark:border-neutral-700 font-bold text-neutral-700 dark:text-neutral-300 tabular-nums">
                        +{{ totalPower.skillSum }}
                      </td>
                      <td class="p-4 border-r border-neutral-200 dark:border-neutral-700 font-bold text-neutral-700 dark:text-neutral-300 tabular-nums">
                        +{{ totalPower.synergySum }}
                      </td>
                      <td class="p-4 font-black text-xl text-indigo-700 dark:text-indigo-400 bg-indigo-100/50 dark:bg-indigo-900/20 tabular-nums">
                        {{ totalPower.finalSum }}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div class="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <Shield class="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>선수를 검색해서 클릭하면 <strong>세부 기본 스탯 8종이 자동으로 채워집니다.</strong> 추가로 얻는 보너스(훈련/스킬/시너지)를 빈칸에 입력하면 각 항목의 최종 스탯과 가장 아래에 있는 <strong>종합 파워(OVR)</strong>가 실시간으로 완벽하게 합산되어 계산됩니다.</p>
              </div>
            </div>
          </section>

          <!-- 초기 안내 화면 -->
          <section v-else class="h-full bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center p-10 text-center min-h-[500px]">
            <div class="w-20 h-20 bg-blue-50 dark:bg-neutral-700 rounded-full flex items-center justify-center mb-6">
              <Calculator class="w-10 h-10 text-blue-500" />
            </div>
            <h2 class="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">선수를 선택해주세요</h2>
            <p class="text-neutral-500 dark:text-neutral-400 max-w-md">
              왼쪽 검색창에서 스탯을 계산할 선수를 찾아 클릭하면, 해당 선수의 모든 세부 스탯과 파워(총합)를 계산할 수 있는 테이블이 열립니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 입력창 스피너(화살표) 숨기기 */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
}
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
.dark ::-webkit-scrollbar-thumb { background: #475569; }
.dark ::-webkit-scrollbar-thumb:hover { background: #64748b; }
</style>
