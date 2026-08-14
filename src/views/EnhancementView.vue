<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  Zap, RefreshCw, ArrowRight, Check, X, Calculator, History, 
  Lock, Unlock, Play, Star 
} from 'lucide-vue-next'

const activeTab = ref<'enhance' | 'career'>('career')

// [1] 강화 시뮬레이터
const BASE_PROBS = [1.0, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.075, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05]
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
    id: logId++, type: success ? 'success' : 'fail', from: currentLevel.value,
    to: success ? currentLevel.value + 1 : currentLevel.value,
    prob: currentRealProb.value, count: totalCardsUsed.value
  })

  if (logs.value.length > 50) logs.value.pop()
  if (success) { currentLevel.value++; failStack.value = 0 } else { failStack.value++ }
}

const resetEnhanceSim = () => { currentLevel.value = 0; failStack.value = 0; totalCardsUsed.value = 0; logs.value = [] }

const expectedValues = computed(() => {
  return BASE_PROBS.map((prob) => {
    let expectedTries = 0; let reachProb = 1.0;
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
  if (calcStartLevel.value >= calcTargetLevel.value) return 0
  let total = 0
  for (let i = calcStartLevel.value; i < calcTargetLevel.value; i++) total += expectedValues.value[i]
  return total
})

// [2] 커리어 옵션
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
  { id: 0, name: '전체 능력치 상승' }, { id: 1, name: '컨택트/무브먼트 상승' }, { id: 2, name: '홈런/홈런억제 상승' },
  { id: 3, name: '삼진회피/스터프 상승' }, { id: 4, name: '선구/컨트롤 상승' }, { id: 5, name: '갭파워/장타억제 상승' },
  { id: 6, name: '지고 있을 시, 파워 상승' }, { id: 7, name: '기록 시 (안타/삼진) 파워 상승' }, { id: 8, name: '자신보다 파워 높은 카드 상대 시' },
  { id: 9, name: '박빙 상황(2점차 이내)에서' }, { id: 10, name: '자신보다 파워 낮은 카드 상대 시' }, { id: 11, name: '★ 동일 팀 카드 수만큼' }
]

const selectedCardIdx = ref(0)
const selectedCard = computed(() => CARD_TYPES[selectedCardIdx.value])

const slots = ref(Array.from({ length: 5 }, (_, i) => ({ id: i, tier: 0, optId: 0, isLocked: false })))
const specialSlot = ref({ tier: 3, optId: 0 })

const totalApSpent = ref(0)
const totalCashSpent = ref(0)
const specialSpinCount = ref(0)
const apSpinCount = ref(0)

const currentRollCostAP = computed(() => {
  const card = selectedCard.value; let lockedCount = slots.value.filter(s => s.isLocked).length
  if (lockedCount === 5) return 0
  let cost = card.lockAP[lockedCount]
  slots.value.forEach(slot => { if (!slot.isLocked) cost += card.baseAP[slot.tier] })
  return cost
})

const currentRollCostCash = computed(() => {
  const lockedCount = slots.value.filter(s => s.isLocked).length
  return lockedCount === 5 ? 0 : selectedCard.value.lockCash[lockedCount]
})

const rollOption = (tier: number) => {
  const isMaster = tier === 3; const totalWeight = isMaster ? 34 : 33; let rand = Math.random() * totalWeight
  for (let i = 0; i < OPTIONS.length; i++) {
    if (!isMaster && i === 11) continue
    rand -= (i === 11) ? 1 : 3
    if (rand < 0) return i
  }
  return 0
}

const rollSlots = (count = 1) => {
  const card = selectedCard.value; let lockedCount = slots.value.filter(s => s.isLocked).length
  if (lockedCount === 5) return
  for (let c = 0; c < count; c++) {
    let costAP = card.lockAP[lockedCount]; let costCash = card.lockCash[lockedCount]
    slots.value.forEach(slot => {
      if (!slot.isLocked) {
        costAP += card.baseAP[slot.tier]; if (slot.tier < 3 && Math.random() < 0.01) slot.tier++
        slot.optId = rollOption(slot.tier)
      }
    })
    totalApSpent.value += costAP; totalCashSpent.value += costCash; apSpinCount.value++
  }
}

const spinSpecialSlot = () => { specialSlot.value.optId = rollOption(3); specialSpinCount.value++ }

const autoTargetMode = ref<'ANY_MASTER' | 'SPECIFIC'>('ANY_MASTER')
const autoTargetOptId = ref(0)
const isSpinning = ref(false)

const startAutoSpin = () => {
  if (slots.value.every(s => s.isLocked)) return alert("모든 슬롯이 잠겨있습니다!")
  isSpinning.value = true
  setTimeout(() => {
    let limit = 50000
    while(limit > 0) {
      rollSlots(1); limit--
      if (slots.value.some(s => !s.isLocked && s.tier === 3 && (autoTargetMode.value === 'ANY_MASTER' || s.optId === autoTargetOptId.value))) break
    }
    if (limit === 0) alert("50,000번 돌렸지만 안 나왔습니다.")
    isSpinning.value = false
  }, 50)
}

const resetCareerSim = () => {
  totalApSpent.value = 0; totalCashSpent.value = 0; apSpinCount.value = 0; specialSpinCount.value = 0
  slots.value.forEach(s => { s.tier = 0; s.isLocked = false; s.optId = 0 }); specialSlot.value.optId = 0
}

const toggleLock = (index: number) => slots.value[index].isLocked = !slots.value[index].isLocked

const setEffects = computed(() => {
  const counts: Record<number, number> = {}
  slots.value.forEach(s => counts[s.optId] = (counts[s.optId] || 0) + 1)
  counts[specialSlot.value.optId] = (counts[specialSlot.value.optId] || 0) + 1
  return Object.entries(counts).filter(([_, count]) => count >= 3).map(([optId, count]) => ({ name: OPTIONS[Number(optId)].name, count }))
})

const requiredMonthsForSpecial = computed(() => (specialSpinCount.value / 9).toFixed(1))
const formatNum = (num: number) => new Intl.NumberFormat().format(num)
</script>

<template>
  <!-- 🌟 전체적인 여백(space-y, padding 등)을 압축해서 스크롤을 방지했습니다 🌟 -->
  <div class="max-w-6xl mx-auto font-sans text-neutral-900 dark:text-neutral-100">
    
    <!-- 탭 메뉴 (크기와 여백 축소) -->
    <div class="flex justify-center mb-4">
      <div class="bg-white dark:bg-neutral-800 p-1 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex gap-1">
        <button @click="activeTab = 'enhance'" class="px-5 py-2 rounded-lg font-bold transition-all text-sm"
          :class="activeTab === 'enhance' ? 'bg-blue-600 text-white shadow' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'">
          강화 시뮬레이터
        </button>
        <button @click="activeTab = 'career'" class="px-5 py-2 rounded-lg font-bold transition-all text-sm"
          :class="activeTab === 'career' ? 'bg-purple-600 text-white shadow' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'">
          커리어 옵션 시뮬레이터
        </button>
      </div>
    </div>

    <!-- ==============================================
         [1] 강화 시뮬레이터 화면
         ============================================== -->
    <div v-show="activeTab === 'enhance'" class="space-y-4">
      <header class="text-center space-y-1">
        <h1 class="text-2xl font-extrabold tracking-tight">강화 시뮬레이터 & 기대값</h1>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">실패 시 확률 증가(2.5%)가 적용된 리얼 시뮬레이터입니다.</p>
      </header>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <!-- 왼쪽 패널 -->
        <section class="space-y-4">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm flex flex-col items-center relative">
            <div class="absolute top-3 right-3"><RefreshCw @click="resetEnhanceSim" class="w-4 h-4 cursor-pointer text-neutral-400 hover:text-blue-500" /></div>
            
            <div class="text-center space-y-2 my-4">
              <div class="flex items-center justify-center gap-3 text-4xl font-black">
                <span :class="currentLevel >= MAX_LEVEL ? 'text-yellow-500' : 'text-neutral-400'">+{{ currentLevel }}</span>
                <ArrowRight v-if="currentLevel < MAX_LEVEL" class="w-6 h-6 text-neutral-300" />
                <span v-if="currentLevel < MAX_LEVEL" class="text-blue-500">+{{ currentLevel + 1 }}</span>
              </div>
              <div v-if="currentLevel < MAX_LEVEL" class="space-y-0.5">
                <p class="text-lg font-bold text-neutral-800 dark:text-neutral-100">성공 확률: {{ (currentRealProb * 100).toFixed(1) }}%</p>
                <p v-if="failStack > 0" class="text-xs font-medium text-red-500">(기본 {{ (currentBaseProb * 100).toFixed(1) }}% + 페널티 {{ (failStack * FAIL_BONUS * 100).toFixed(1) }}%)</p>
                <p v-else class="text-xs font-medium text-neutral-400">기본 확률 {{ (currentBaseProb * 100).toFixed(1) }}%</p>
              </div>
              <div v-else class="text-lg font-bold text-yellow-500 pt-2">MAX LEVEL 도달! 🎉</div>
            </div>
            
            <button @click="tryEnhance" :disabled="currentLevel >= MAX_LEVEL" class="w-full sm:w-3/4 py-3 rounded-lg flex items-center justify-center gap-2 text-base font-bold text-white transition-all transform active:scale-95 disabled:opacity-50" :class="currentLevel >= MAX_LEVEL ? 'bg-neutral-300 dark:bg-neutral-800' : 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/30'">
              <Zap class="w-5 h-5" /> {{ currentLevel >= MAX_LEVEL ? '최고 레벨 (15강)' : '강화 시도 (카드 1장 소모)' }}
            </button>
            <div class="mt-3 text-sm text-neutral-500 font-medium">소모된 강화 재료: <span class="text-neutral-800 dark:text-neutral-200 font-bold">{{ totalCardsUsed }}</span> 장</div>
          </div>

          <!-- 강화 기록 (높이 압축) -->
          <div class="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3 h-40 overflow-y-auto border border-neutral-200 dark:border-neutral-800">
            <div class="flex items-center gap-1.5 mb-2 px-1 text-neutral-700 dark:text-neutral-300 text-sm font-semibold"><History class="w-4 h-4" /> 강화 기록</div>
            <div class="space-y-1.5">
              <div v-for="log in logs" :key="log.id" class="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-xs">
                <div class="flex items-center gap-2">
                  <span v-if="log.type === 'success'" class="text-blue-500"><Check class="w-3.5 h-3.5"/></span>
                  <span v-else class="text-red-500"><X class="w-3.5 h-3.5"/></span>
                  <span class="font-medium">+{{ log.from }} ➔ +{{ log.to }}</span>
                </div>
                <div class="text-neutral-400 text-right">확률 {{ (log.prob * 100).toFixed(1) }}% <span class="text-neutral-300">| {{ log.count }}장</span></div>
              </div>
              <div v-if="logs.length === 0" class="text-center text-neutral-400 py-4 text-xs">기록이 없습니다.</div>
            </div>
          </div>
        </section>

        <!-- 오른쪽 표 패널 (높이 압축) -->
        <section class="space-y-4">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm flex items-center justify-between gap-4">
            <div class="flex items-center gap-3 w-1/2">
              <div class="w-full">
                <label class="block text-xs font-medium text-neutral-500 mb-0.5">시작 레벨</label>
                <select v-model="calcStartLevel" class="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md p-1.5 text-sm outline-none"><option v-for="n in MAX_LEVEL" :key="`start-${n-1}`" :value="n-1">+{{ n-1 }}</option></select>
              </div>
              <ArrowRight class="w-4 h-4 text-neutral-300 mt-4 shrink-0" />
              <div class="w-full">
                <label class="block text-xs font-medium text-neutral-500 mb-0.5">목표 레벨</label>
                <select v-model="calcTargetLevel" class="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md p-1.5 text-sm outline-none"><option v-for="n in MAX_LEVEL" :key="`target-${n}`" :value="n">+{{ n }}</option></select>
              </div>
            </div>
            <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center w-1/2">
              <div class="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-0.5">필요 카드(기대값)</div>
              <div class="text-xl font-black text-blue-700 dark:text-blue-300">{{ calculatedExpectedCards > 0 ? calculatedExpectedCards.toFixed(2) : '0.00' }} <span class="text-xs font-normal">장</span></div>
            </div>
          </div>

          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm text-xs">
            <div class="overflow-x-auto">
              <table class="w-full text-center whitespace-nowrap">
                <thead class="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 text-neutral-500">
                  <tr><th class="py-1.5 px-2">단계</th><th class="py-1.5 px-2">확률</th><th class="py-1.5 px-2">1업 기대값</th><th class="py-1.5 px-2">누적 (베이스+1)</th></tr>
                </thead>
                <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                  <tr v-for="(prob, idx) in BASE_PROBS" :key="idx" class="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td class="py-1 px-2 font-medium">+{{ idx }}➔+{{ idx + 1 }}</td>
                    <td class="py-1 px-2">{{ (prob * 100).toFixed(1) }}%</td><td class="py-1 px-2">{{ expectedValues[idx].toFixed(2) }}</td>
                    <td class="py-1 px-2 text-blue-600 dark:text-blue-400 font-semibold">{{ (1 + expectedValues.slice(0, idx + 1).reduce((a, b) => a + b, 0)).toFixed(2) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>


    <!-- ==============================================
         [2] 커리어 옵션 시뮬레이터 화면
         ============================================== -->
    <div v-show="activeTab === 'career'" class="space-y-4">
      
      <header class="text-center space-y-1">
        <h1 class="text-2xl font-extrabold tracking-tight">커리어 옵션 시뮬레이터</h1>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">자팀 5세트는 과연 뜰 것인가? 극한의 확률과 재화 소모를 체험하세요.</p>
      </header>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <!-- [왼쪽] 카드 세팅 및 통계 -->
        <section class="space-y-4">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm">
            <h2 class="text-base font-bold flex items-center gap-1.5 mb-3"><Star class="w-4 h-4 text-yellow-500"/> 카드 등급 선택</h2>
            <select v-model="selectedCardIdx" class="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-sm mb-3">
              <option v-for="(type, idx) in CARD_TYPES" :key="type.id" :value="idx">{{ type.name }}</option>
            </select>
            <div class="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-800 p-2 rounded-lg leading-relaxed">
              마스터 기본 1칸: <strong class="text-blue-500">{{ formatNum(selectedCard.baseAP[3]) }} AP</strong><br/>
              4칸 잠금 시 페널티: <strong v-if="selectedCard.lockAP[4] > 0" class="text-red-500">{{ formatNum(selectedCard.lockAP[4]) }} AP</strong>
              <strong v-if="selectedCard.lockCash[4] > 0" class="text-purple-500">{{ formatNum(selectedCard.lockCash[4]) }} CASH</strong>
            </div>
          </div>

          <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 dark:from-black dark:to-neutral-900 rounded-xl p-4 text-white shadow-lg">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-base font-bold flex items-center gap-1.5"><Calculator class="w-4 h-4 text-green-400"/> 영수증</h2>
              <button @click="resetCareerSim" class="text-neutral-400 hover:text-white transition-colors flex items-center gap-1 text-xs"><RefreshCw class="w-3 h-3"/>초기화</button>
            </div>
            <div class="space-y-3">
              <div>
                <div class="text-neutral-400 text-xs mb-0.5">총 AP (골드)</div>
                <div class="text-2xl font-black text-yellow-400">{{ formatNum(totalApSpent) }}</div>
              </div>
              <div>
                <div class="text-neutral-400 text-xs mb-0.5">총 CASH (잠금용)</div>
                <div class="text-xl font-bold text-purple-400">{{ formatNum(totalCashSpent) }} 💎</div>
              </div>
              <div class="pt-3 border-t border-neutral-700">
                <div class="flex justify-between items-end">
                  <div>
                    <div class="text-neutral-400 text-xs mb-0.5">스페셜 갱신 횟수</div>
                    <div class="text-base font-bold">{{ formatNum(specialSpinCount) }} 번</div>
                  </div>
                  <div class="text-[10px] text-neutral-500">대략 <span class="text-red-400 font-bold">{{ requiredMonthsForSpecial }} 개월</span> 소요 (월 9회)</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- [중앙 & 우측] 슬롯 구역 -->
        <section class="xl:col-span-2 space-y-4">
          
          <!-- 세트효과 전광판 -->
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 flex flex-col justify-center min-h-[60px]">
            <h3 class="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1.5">활성화된 세트 효과 (3개 이상)</h3>
            <div v-if="setEffects.length > 0" class="flex flex-wrap gap-1.5">
              <div v-for="(effect, i) in setEffects" :key="i" class="bg-blue-600 text-white px-2.5 py-1 rounded-md font-bold text-xs flex items-center gap-1.5 shadow-sm">
                {{ effect.name }} <span class="bg-blue-800 text-blue-100 text-[10px] px-1.5 py-0.5 rounded-full">{{ effect.count }}셋</span>
              </div>
            </div>
            <div v-else class="text-neutral-400 text-xs">아직 3개 이상 모인 옵션이 없습니다.</div>
          </div>

          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm">
            
            <!-- 캐시 슬롯 -->
            <div class="mb-4 p-2.5 bg-red-50/50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800/30 flex items-center justify-between gap-2">
              <div class="flex flex-1 items-center gap-2">
                <div class="bg-red-500 text-white font-bold px-2 py-1 rounded text-xs whitespace-nowrap">스페셜(고정)</div>
                <div class="text-sm font-bold text-neutral-800 dark:text-neutral-200 truncate">{{ OPTIONS[specialSlot.optId].name }}</div>
              </div>
              <button @click="spinSpecialSlot" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md shadow-sm shrink-0">캐시 갱신</button>
            </div>

            <!-- AP 슬롯들 -->
            <div class="space-y-2 mb-4">
              <div v-for="slot in slots" :key="slot.id" 
                   class="flex items-center gap-2 p-2 rounded-lg border transition-all"
                   :class="slot.isLocked ? 'bg-neutral-100 border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700 opacity-70' : 'bg-white border-purple-200 dark:bg-neutral-900 dark:border-purple-800/50'">
                <div :class="[TIER_BG[slot.tier], TIER_COLORS[slot.tier]]" class="w-14 text-center py-1 rounded font-extrabold text-[11px] shadow-sm">{{ TIERS[slot.tier] }}</div>
                <div class="flex-1 font-bold text-sm truncate text-neutral-800 dark:text-neutral-200" :class="{'text-red-500 dark:text-red-400': slot.tier === 3}">{{ OPTIONS[slot.optId].name }}</div>
                <button @click="toggleLock(slot.id)" class="p-1.5 rounded-md border"
                        :class="slot.isLocked ? 'bg-neutral-800 border-neutral-700 text-yellow-400' : 'bg-white border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 text-neutral-400'">
                  <Lock v-if="slot.isLocked" class="w-4 h-4" /><Unlock v-else class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- 하단 액션 구역 -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button @click="rollSlots(1)" class="py-2.5 bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-500/30 text-white rounded-lg active:scale-95 flex flex-col items-center justify-center gap-0.5">
                <span class="text-sm font-extrabold flex items-center gap-1.5"><Zap class="w-4 h-4"/> 수동 변경 (1회)</span>
                <span class="text-[11px] text-purple-200 font-medium">이번 소모: <strong class="text-white">{{ formatNum(currentRollCostAP) }} AP</strong>
                  <template v-if="currentRollCostCash > 0"> + <strong class="text-white">{{ formatNum(currentRollCostCash) }} 💎</strong></template>
                </span>
              </button>

              <div class="flex flex-col gap-1.5 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <select v-model="autoTargetMode" class="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-md p-1.5 text-xs outline-none font-semibold">
                  <option value="ANY_MASTER">아무 마스터 등급 시 멈춤</option>
                  <option value="SPECIFIC">특정 마스터 옵션 지정</option>
                </select>
                <div class="flex gap-1.5 h-[30px]">
                  <select v-if="autoTargetMode === 'SPECIFIC'" v-model="autoTargetOptId" class="flex-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-md px-1.5 text-xs outline-none font-semibold truncate">
                    <option v-for="opt in OPTIONS" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
                  </select>
                  <button @click="startAutoSpin" :disabled="isSpinning" class="px-3 bg-neutral-800 hover:bg-black dark:bg-neutral-700 dark:hover:bg-neutral-600 text-white text-xs font-bold rounded-md flex items-center justify-center gap-1 transition-colors disabled:opacity-50" :class="{'w-full': autoTargetMode === 'ANY_MASTER'}">
                    <Play class="w-3 h-3"/> {{ isSpinning ? '가챠중' : '오토스핀' }}
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
