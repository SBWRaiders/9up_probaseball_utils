<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  Zap, RefreshCw, ArrowRight, Check, X, Calculator, History, 
  Lock, Unlock, Play, Star 
} from 'lucide-vue-next'

// ==========================================
// 탭 상태 관리 (강화 시뮬 vs 커리어 옵션)
// ==========================================
const activeTab = ref<'enhance' | 'career'>('career') // 기본 화면을 커리어로 하려면 'career', 강화로 하려면 'enhance'

// ==========================================
// [1] 강화 시뮬레이터 상태 및 로직
// ==========================================
const BASE_PROBS = [
  1.0, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 
  0.075, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05
]
const FAIL_BONUS = 0.025
const MAX_LEVEL = 15

const currentLevel = ref(0)
const failStack = ref(0)
const totalCardsUsed = ref(0)
const logs = ref<{ id: number, type: 'success' | 'fail', from: number, to: number, prob: number, count: number }[]>([])
let logId = 0

const currentBaseProb = computed(() => BASE_PROBS[currentLevel.value] ?? 0.05)
const currentRealProb = computed(() => Math.min(1.0, currentBaseProb.value + failStack.value * FAIL_BONUS))

const tryEnhance = () => {
  if (currentLevel.value >= MAX_LEVEL) return
  totalCardsUsed.value++
  const r = Math.random()
  const success = r <= currentRealProb.value

  logs.value.unshift({
    id: logId++,
    type: success ? 'success' : 'fail',
    from: currentLevel.value,
    to: success ? currentLevel.value + 1 : currentLevel.value,
    prob: currentRealProb.value,
    count: totalCardsUsed.value
  })

  if (logs.value.length > 100) logs.value.pop()

  if (success) {
    currentLevel.value++
    failStack.value = 0 
  } else {
    failStack.value++
  }
}

const resetEnhanceSim = () => {
  currentLevel.value = 0
  failStack.value = 0
  totalCardsUsed.value = 0
  logs.value = []
}

const expectedValues = computed(() => {
  return BASE_PROBS.map((prob) => {
    let expectedTries = 0
    let reachProb = 1.0
    for (let k = 1; k < 100; k++) {
      const currentTryProb = Math.min(1.0, prob + (k - 1) * FAIL_BONUS)
      expectedTries += k * reachProb * currentTryProb
      reachProb *= (1 - currentTryProb)
      if (reachProb <= 0) break
    }
    return expectedTries
  })
})

const calcStartLevel = ref(0)
const calcTargetLevel = ref(15)

const calculatedExpectedCards = computed(() => {
  const start = calcStartLevel.value
  const target = calcTargetLevel.value
  if (start >= target) return 0
  let total = 0
  for (let i = start; i < target; i++) total += expectedValues.value[i]
  return total
})

// ==========================================
// [2] 커리어 옵션 상태 및 로직
// ==========================================
const TIERS = ['루키', '엘리트', '프로', '마스터']
const TIER_COLORS = ['text-green-500', 'text-blue-500', 'text-purple-500', 'text-red-500']
const TIER_BG = ['bg-green-100', 'bg-blue-100', 'bg-purple-100', 'bg-red-100']

const CARD_TYPES = [
  { id: 0, name: 'SEA, ASG, POS', baseAP: [1000, 2000, 10000, 50000], lockAP: [0, 30000, 150000, 500000, 1000000], lockCash: [0, 0, 0, 0, 0] },
  { id: 1, name: 'TEAM, MMVP', baseAP: [10000, 20000, 50000, 250000], lockAP: [0, 50000, 250000, 900000, 2000000], lockCash: [0, 0, 0, 0, 0] },
  { id: 2, name: 'ROY (신인왕)', baseAP: [30000, 60000, 150000, 750000], lockAP: [0, 50000, 250000, 900000, 2000000], lockCash: [0, 0, 0, 0, 0] },
  { id: 3, name: 'HIT, ACE, GG, GGY', baseAP: [30000, 60000, 150000, 750000], lockAP: [0, 0, 0, 0, 0], lockCash: [0, 5, 15, 50, 100] },
  { id: 4, name: 'TOP, DGN', baseAP: [40000, 80000, 200000, 1000000], lockAP: [0, 0, 0, 0, 0], lockCash: [0, 5, 15, 50, 100] }
]

const OPTIONS = [
  { id: 0, name: '전체 능력치 상승' },
  { id: 1, name: '컨택트/무브먼트 상승' },
  { id: 2, name: '홈런/홈런억제 상승' },
  { id: 3, name: '삼진회피/스터프 상승' },
  { id: 4, name: '선구/컨트롤 상승' },
  { id: 5, name: '갭파워/장타억제 상승' },
  { id: 6, name: '지고 있을 시, 파워 상승' },
  { id: 7, name: '기록 시 (안타/삼진) 파워 상승' },
  { id: 8, name: '자신보다 파워 높은 카드 상대 시' },
  { id: 9, name: '박빙 상황(2점차 이내)에서' },
  { id: 10, name: '자신보다 파워 낮은 카드 상대 시' },
  { id: 11, name: '★ 동일 팀 카드 수만큼 (마스터 전용)' }
]

const selectedCardIdx = ref(0)
const selectedCard = computed(() => CARD_TYPES[selectedCardIdx.value])

const slots = ref(Array.from({ length: 5 }, (_, i) => ({ id: i, tier: 0, optId: 0, isLocked: false })))
const specialSlot = ref({ tier: 3, optId: 0 })

const totalApSpent = ref(0)
const totalCashSpent = ref(0)
const specialSpinCount = ref(0)
const apSpinCount = ref(0)

// 🌟 현재 상태에서 1회 클릭 시 5칸이 합산되어 소모될 예상 비용 계산
const currentRollCostAP = computed(() => {
  const card = selectedCard.value
  let lockedCount = slots.value.filter(s => s.isLocked).length
  if (lockedCount === 5) return 0

  let cost = card.lockAP[lockedCount]
  slots.value.forEach(slot => {
    if (!slot.isLocked) cost += card.baseAP[slot.tier] // 5칸 각각의 등급 비용을 모두 합산!
  })
  return cost
})

const currentRollCostCash = computed(() => {
  const lockedCount = slots.value.filter(s => s.isLocked).length
  return lockedCount === 5 ? 0 : selectedCard.value.lockCash[lockedCount]
})

const rollOption = (tier: number) => {
  const isMaster = tier === 3
  const totalWeight = isMaster ? 34 : 33
  let rand = Math.random() * totalWeight
  for (let i = 0; i < OPTIONS.length; i++) {
    if (!isMaster && i === 11) continue
    const weight = (i === 11) ? 1 : 3
    rand -= weight
    if (rand < 0) return i
  }
  return 0
}

const rollSlots = (count = 1) => {
  const card = selectedCard.value
  let lockedCount = slots.value.filter(s => s.isLocked).length
  if (lockedCount === 5) return

  for (let c = 0; c < count; c++) {
    let costAP = card.lockAP[lockedCount]
    let costCash = card.lockCash[lockedCount]

    // 잠기지 않은 5칸 전체가 한 번에 돌아감!
    slots.value.forEach(slot => {
      if (!slot.isLocked) {
        costAP += card.baseAP[slot.tier] // 각 슬롯의 현재 등급에 맞는 비용을 합산
        if (slot.tier < 3 && Math.random() < 0.01) slot.tier++
        slot.optId = rollOption(slot.tier)
      }
    })

    totalApSpent.value += costAP
    totalCashSpent.value += costCash
    apSpinCount.value++
  }
}

const spinSpecialSlot = () => {
  specialSlot.value.optId = rollOption(3)
  specialSpinCount.value++
}

const autoTargetMode = ref<'ANY_MASTER' | 'SPECIFIC'>('ANY_MASTER')
const autoTargetOptId = ref(0)
const isSpinning = ref(false)

const startAutoSpin = () => {
  if (slots.value.every(s => s.isLocked)) return alert("모든 슬롯이 잠겨있습니다!")
  isSpinning.value = true
  
  setTimeout(() => {
    let limit = 50000
    while(limit > 0) {
      rollSlots(1)
      limit--
      const hit = slots.value.some(s => {
        if (s.isLocked || s.tier !== 3) return false
        return autoTargetMode.value === 'ANY_MASTER' ? true : s.optId === autoTargetOptId.value
      })
      if (hit) break
    }
    if (limit === 0) alert("50,000번을 돌렸지만 목표 옵션이 나오지 않았습니다.")
    isSpinning.value = false
  }, 100)
}

const resetCareerSim = () => {
  totalApSpent.value = 0
  totalCashSpent.value = 0
  apSpinCount.value = 0
  specialSpinCount.value = 0
  slots.value.forEach(s => { s.tier = 0; s.isLocked = false; s.optId = 0 })
  specialSlot.value.optId = 0
}

const toggleLock = (index: number) => slots.value[index].isLocked = !slots.value[index].isLocked

const setEffects = computed(() => {
  const counts: Record<number, number> = {}
  slots.value.forEach(s => counts[s.optId] = (counts[s.optId] || 0) + 1)
  counts[specialSlot.value.optId] = (counts[specialSlot.value.optId] || 0) + 1
  return Object.entries(counts).filter(([_, count]) => count >= 3).map(([optId, count]) => ({
    name: OPTIONS[Number(optId)].name, count
  }))
})

const requiredMonthsForSpecial = computed(() => (specialSpinCount.value / 9).toFixed(1))
const formatNum = (num: number) => new Intl.NumberFormat().format(num)
</script>

<template>
  <div class="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 font-sans text-neutral-900 dark:text-neutral-100 min-h-screen pb-20">
    
    <!-- 최상단 탭 메뉴 -->
    <div class="flex justify-center mb-8">
      <div class="bg-white dark:bg-neutral-800 p-1.5 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex gap-2">
        <button 
          @click="activeTab = 'enhance'"
          class="px-6 py-2.5 rounded-xl font-bold transition-all"
          :class="activeTab === 'enhance' ? 'bg-blue-600 text-white shadow-md' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'"
        >
          강화 시뮬레이터
        </button>
        <button 
          @click="activeTab = 'career'"
          class="px-6 py-2.5 rounded-xl font-bold transition-all"
          :class="activeTab === 'career' ? 'bg-purple-600 text-white shadow-md' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'"
        >
          커리어 옵션 시뮬레이터
        </button>
      </div>
    </div>

    <!-- ==============================================
         [1] 강화 시뮬레이터 화면 (기존)
         ============================================== -->
    <div v-show="activeTab === 'enhance'" class="space-y-12">
      <header class="text-center space-y-2">
        <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight">강화 시뮬레이터 & 기대값</h1>
        <p class="text-neutral-500 dark:text-neutral-400">실패 시 확률 증가(2.5%)가 적용된 리얼 시뮬레이터입니다.</p>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- 실전 시뮬레이터 패널 -->
        <section class="space-y-6">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col items-center relative overflow-hidden">
            <div class="absolute top-4 right-4 flex items-center gap-1 text-sm font-semibold text-neutral-400">
              <RefreshCw @click="resetEnhanceSim" class="w-5 h-5 cursor-pointer hover:text-blue-500 transition-colors" />
            </div>
            <div class="text-center space-y-4 my-8">
              <div class="flex items-center justify-center gap-4 text-5xl font-black">
                <span :class="currentLevel >= MAX_LEVEL ? 'text-yellow-500' : 'text-neutral-400'">+{{ currentLevel }}</span>
                <ArrowRight v-if="currentLevel < MAX_LEVEL" class="w-8 h-8 text-neutral-300" />
                <span v-if="currentLevel < MAX_LEVEL" class="text-blue-500">+{{ currentLevel + 1 }}</span>
              </div>
              <div v-if="currentLevel < MAX_LEVEL" class="space-y-1">
                <p class="text-2xl font-bold text-neutral-800 dark:text-neutral-100">성공 확률: {{ (currentRealProb * 100).toFixed(1) }}%</p>
                <p v-if="failStack > 0" class="text-sm font-medium text-red-500">(기본 {{ (currentBaseProb * 100).toFixed(1) }}% + 실패 보너스 {{ (failStack * FAIL_BONUS * 100).toFixed(1) }}%)</p>
                <p v-else class="text-sm font-medium text-neutral-400">기본 확률 {{ (currentBaseProb * 100).toFixed(1) }}%</p>
              </div>
              <div v-else class="text-2xl font-bold text-yellow-500 pt-4">MAX LEVEL 도달! 🎉</div>
            </div>
            <button @click="tryEnhance" :disabled="currentLevel >= MAX_LEVEL" class="w-full sm:w-2/3 py-4 rounded-xl flex items-center justify-center gap-2 text-lg font-bold text-white transition-all transform active:scale-95 disabled:opacity-50" :class="currentLevel >= MAX_LEVEL ? 'bg-neutral-300 dark:bg-neutral-800' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30'">
              <Zap class="w-6 h-6" />
              {{ currentLevel >= MAX_LEVEL ? '최고 레벨 (15강)' : '강화 시도 (카드 1장 소모)' }}
            </button>
            <div class="mt-6 text-neutral-500 font-medium">
              현재까지 소모된 강화 재료: <span class="text-neutral-800 dark:text-neutral-200 font-bold">{{ totalCardsUsed }}</span> 장
            </div>
          </div>

          <!-- 강화 기록 -->
          <div class="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-4 h-64 overflow-y-auto border border-neutral-200 dark:border-neutral-800">
            <div class="flex items-center gap-2 mb-3 px-2 text-neutral-700 dark:text-neutral-300 font-semibold"><History class="w-5 h-5" /> 강화 기록</div>
            <div class="space-y-2">
              <div v-for="log in logs" :key="log.id" class="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-sm">
                <div class="flex items-center gap-3">
                  <span v-if="log.type === 'success'" class="bg-blue-100 text-blue-600 p-1 rounded-md"><Check class="w-4 h-4"/></span>
                  <span v-else class="bg-red-100 text-red-600 p-1 rounded-md"><X class="w-4 h-4"/></span>
                  <span class="font-medium">+{{ log.from }} ➔ +{{ log.to }}</span>
                </div>
                <div class="text-neutral-400 text-xs text-right">확률 {{ (log.prob * 100).toFixed(1) }}%<br/><span class="text-neutral-300">누적 {{ log.count }}장</span></div>
              </div>
              <div v-if="logs.length === 0" class="text-center text-neutral-400 py-10 text-sm">아직 시도한 기록이 없습니다.</div>
            </div>
          </div>
        </section>

        <!-- 오른쪽 계산기 및 표 패널 -->
        <section class="space-y-6">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
            <div class="flex items-center gap-2 mb-6 font-bold text-xl"><Calculator class="w-6 h-6 text-blue-500" /> 목표 레벨 필요 카드 계산기</div>
            <div class="flex items-center gap-4 mb-6">
              <div class="flex-1">
                <label class="block text-sm font-medium text-neutral-500 mb-1">시작 레벨</label>
                <select v-model="calcStartLevel" class="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500">
                  <option v-for="n in MAX_LEVEL" :key="`start-${n-1}`" :value="n-1">+{{ n-1 }}</option>
                </select>
              </div>
              <ArrowRight class="w-6 h-6 text-neutral-300 mt-6" />
              <div class="flex-1">
                <label class="block text-sm font-medium text-neutral-500 mb-1">목표 레벨</label>
                <select v-model="calcTargetLevel" class="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500">
                  <option v-for="n in MAX_LEVEL" :key="`target-${n}`" :value="n">+{{ n }}</option>
                </select>
              </div>
            </div>
            <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 text-center">
              <div class="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-1">평균적으로 필요한 강화 전용 카드 수</div>
              <div class="text-3xl font-black text-blue-700 dark:text-blue-300">
                {{ calculatedExpectedCards > 0 ? calculatedExpectedCards.toFixed(3) : '0.000' }} <span class="text-base font-normal">장</span>
              </div>
            </div>
          </div>
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm text-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-center whitespace-nowrap">
                <thead class="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 text-neutral-500">
                  <tr>
                    <th class="py-3 px-4 font-semibold">강화 단계</th>
                    <th class="py-3 px-4 font-semibold">기본 확률</th>
                    <th class="py-3 px-4 font-semibold">1업 기대값</th>
                    <th class="py-3 px-4 font-semibold">누적 필요 수 (베이스 +1)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                  <tr v-for="(prob, idx) in BASE_PROBS" :key="idx" class="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td class="py-2.5 px-4 font-medium">+{{ idx }} ➔ +{{ idx + 1 }}</td>
                    <td class="py-2.5 px-4">{{ (prob * 100).toFixed(1) }}%</td>
                    <td class="py-2.5 px-4">{{ expectedValues[idx].toFixed(3) }}</td>
                    <td class="py-2.5 px-4 text-blue-600 dark:text-blue-400 font-semibold">
                      {{ (1 + expectedValues.slice(0, idx + 1).reduce((a, b) => a + b, 0)).toFixed(3) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>


    <!-- ==============================================
         [2] 커리어 옵션 시뮬레이터 화면 (신규)
         ============================================== -->
    <div v-show="activeTab === 'career'" class="space-y-8">
      
      <header class="text-center space-y-2 mb-8">
        <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight">커리어 옵션 시뮬레이터</h1>
        <p class="text-neutral-500 dark:text-neutral-400">자팀 5세트는 과연 뜰 것인가? 극한의 확률과 재화 소모를 체험하세요.</p>
      </header>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <!-- [왼쪽] 카드 세팅 및 통계 -->
        <section class="space-y-6">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
            <h2 class="text-lg font-bold flex items-center gap-2 mb-4"><Star class="w-5 h-5 text-yellow-500"/> 카드 등급 선택</h2>
            <select v-model="selectedCardIdx" class="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-lg">
              <option v-for="(type, idx) in CARD_TYPES" :key="type.id" :value="idx">{{ type.name }}</option>
            </select>
            <div class="mt-4 text-sm text-neutral-500 bg-neutral-50 dark:bg-neutral-800 p-3 rounded-lg">
              마스터 기본 1칸 비용: <strong class="text-blue-500">{{ formatNum(selectedCard.baseAP[3]) }} AP</strong><br/>
              잠금 페널티 (4칸 잠금 시): 
              <strong v-if="selectedCard.lockAP[4] > 0" class="text-red-500">{{ formatNum(selectedCard.lockAP[4]) }} AP</strong>
              <strong v-if="selectedCard.lockCash[4] > 0" class="text-purple-500">{{ formatNum(selectedCard.lockCash[4]) }} CASH</strong>
            </div>
          </div>

          <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 dark:from-black dark:to-neutral-900 rounded-2xl p-6 text-white shadow-xl">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-lg font-bold flex items-center gap-2"><Calculator class="w-5 h-5 text-green-400"/> 파산 영수증</h2>
              <button @click="resetCareerSim" class="text-neutral-400 hover:text-white transition-colors flex items-center gap-1 text-sm"><RefreshCw class="w-4 h-4"/>초기화</button>
            </div>
            
            <div class="space-y-4">
              <div>
                <div class="text-neutral-400 text-sm mb-1">소모된 총 AP (골드)</div>
                <div class="text-3xl font-black text-yellow-400">{{ formatNum(totalApSpent) }}</div>
              </div>
              <div>
                <div class="text-neutral-400 text-sm mb-1">소모된 총 CASH (잠금용)</div>
                <div class="text-2xl font-bold text-purple-400">{{ formatNum(totalCashSpent) }} 💎</div>
              </div>
              <div class="pt-4 border-t border-neutral-700">
                <div class="text-neutral-400 text-sm mb-1">6번째 스페셜 슬롯 갱신 횟수</div>
                <div class="text-xl font-bold">{{ formatNum(specialSpinCount) }} 번</div>
                <div class="text-xs text-neutral-500 mt-1">현실 시간: 대략 <span class="text-red-400 font-bold">{{ requiredMonthsForSpecial }} 개월</span> 소요 (월 9회 기준)</div>
              </div>
            </div>
          </div>
        </section>

        <!-- [중앙 & 우측] 슬롯 및 매크로 구역 -->
        <section class="xl:col-span-2 space-y-6">
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 flex flex-col justify-center min-h-[100px]">
            <h3 class="text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">활성화된 세트 효과 (3개 이상)</h3>
            <div v-if="setEffects.length > 0" class="flex flex-wrap gap-2">
              <div v-for="(effect, i) in setEffects" :key="i" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm flex items-center gap-2">
                {{ effect.name }}
                <span class="bg-blue-800 text-blue-100 text-xs px-2 py-0.5 rounded-full">{{ effect.count }}세트</span>
              </div>
            </div>
            <div v-else class="text-neutral-400 text-sm">아직 3개 이상 모인 옵션이 없습니다.</div>
          </div>

          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
            
            <div class="mb-8 p-4 bg-red-50/50 dark:bg-red-900/10 rounded-xl border-2 border-red-200 dark:border-red-800/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div class="flex-1 w-full flex items-center gap-4">
                <div class="bg-red-500 text-white font-black px-3 py-1.5 rounded-md text-sm whitespace-nowrap">스페셜 (고정)</div>
                <div class="text-lg font-bold text-neutral-800 dark:text-neutral-200">{{ OPTIONS[specialSlot.optId].name }}</div>
              </div>
              <button @click="spinSpecialSlot" class="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shrink-0 shadow-md">
                캐시 갱신
              </button>
            </div>

            <div class="space-y-3 mb-6">
              <div v-for="slot in slots" :key="slot.id" 
                   class="flex items-center gap-3 p-3 rounded-xl border transition-all"
                   :class="slot.isLocked ? 'bg-neutral-100 border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700 opacity-80' : 'bg-white border-purple-200 dark:bg-neutral-900 dark:border-purple-800/50'">
                <div :class="[TIER_BG[slot.tier], TIER_COLORS[slot.tier]]" class="w-20 text-center py-1.5 rounded-md font-extrabold text-sm shadow-sm">
                  {{ TIERS[slot.tier] }}
                </div>
                <div class="flex-1 font-bold truncate text-neutral-800 dark:text-neutral-200" :class="{'text-red-500 dark:text-red-400': slot.tier === 3}">
                  {{ OPTIONS[slot.optId].name }}
                </div>
                <button @click="toggleLock(slot.id)" 
                        class="p-2.5 rounded-lg transition-colors border"
                        :class="slot.isLocked ? 'bg-neutral-800 border-neutral-700 text-yellow-400' : 'bg-white border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 text-neutral-400 hover:text-purple-500'">
                  <Lock v-if="slot.isLocked" class="w-5 h-5" />
                  <Unlock v-else class="w-5 h-5" />
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- 버튼에 5칸이 합산된 비용을 즉시 표시! -->
              <button @click="rollSlots(1)" 
                      class="py-3 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/30 text-white rounded-xl transition-transform active:scale-95 flex flex-col items-center justify-center gap-0.5">
                <span class="text-lg font-extrabold flex items-center gap-2"><Zap class="w-5 h-5"/> 수동 변경 (1회)</span>
                <span class="text-sm font-medium text-purple-200">
                  이번 소모: 
                  <strong class="text-white">{{ formatNum(currentRollCostAP) }} AP</strong>
                  <template v-if="currentRollCostCash > 0"> + <strong class="text-white">{{ formatNum(currentRollCostCash) }} 캐시</strong></template>
                </span>
              </button>

              <div class="flex flex-col gap-2 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <div class="flex items-center gap-2">
                  <select v-model="autoTargetMode" class="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg p-2 text-sm outline-none flex-1 font-semibold">
                    <option value="ANY_MASTER">아무 마스터 등급 시 정지</option>
                    <option value="SPECIFIC">특정 마스터 옵션 지정</option>
                  </select>
                </div>
                <div class="flex gap-2">
                  <select v-if="autoTargetMode === 'SPECIFIC'" v-model="autoTargetOptId" class="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg p-2 text-sm outline-none font-semibold truncate">
                    <option v-for="opt in OPTIONS" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
                  </select>
                  <button @click="startAutoSpin" :disabled="isSpinning"
                          class="flex-1 bg-neutral-800 hover:bg-black dark:bg-neutral-700 dark:hover:bg-neutral-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                    <Play class="w-4 h-4"/> 
                    {{ isSpinning ? '진행 중...' : '오토 스핀' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
