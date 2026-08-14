<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { 
  Zap, RefreshCw, ArrowRight, Check, X, Calculator, History, 
  Lock, Unlock, Play, Star, Settings, Pause 
} from 'lucide-vue-next'

const activeTab = ref<'enhance' | 'career'>('career')

// ==============================================
// [1] 강화 시뮬레이터 
// ==============================================
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
  logs.value.unshift({ id: logId++, type: success ? 'success' : 'fail', from: currentLevel.value, to: success ? currentLevel.value + 1 : currentLevel.value, prob: currentRealProb.value, count: totalCardsUsed.value })
  if (logs.value.length > 30) logs.value.pop()
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


// ==============================================
// [2] 커리어 옵션 (인게임 오토 로직 적용)
// ==============================================
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

const rollSlots = () => {
  const card = selectedCard.value; let lockedCount = slots.value.filter(s => s.isLocked).length
  if (lockedCount === 5) return
  let costAP = card.lockAP[lockedCount]; let costCash = card.lockCash[lockedCount]
  slots.value.forEach(slot => {
    if (!slot.isLocked) {
      costAP += card.baseAP[slot.tier]; if (slot.tier < 3 && Math.random() < 0.01) slot.tier++
      slot.optId = rollOption(slot.tier)
    }
  })
  totalApSpent.value += costAP; totalCashSpent.value += costCash; apSpinCount.value++
}

const spinSpecialSlot = () => { specialSlot.value.optId = rollOption(3); specialSpinCount.value++ }
const resetCareerSim = () => { totalApSpent.value = 0; totalCashSpent.value = 0; apSpinCount.value = 0; specialSpinCount.value = 0; slots.value.forEach(s => { s.tier = 0; s.isLocked = false; s.optId = 0 }); specialSlot.value.optId = 0 }
const toggleLock = (index: number) => slots.value[index].isLocked = !slots.value[index].isLocked

const setEffects = computed(() => {
  const counts: Record<number, number> = {}
  slots.value.forEach(s => counts[s.optId] = (counts[s.optId] || 0) + 1)
  counts[specialSlot.value.optId] = (counts[specialSlot.value.optId] || 0) + 1
  return Object.entries(counts).filter(([_, count]) => count >= 3).map(([optId, count]) => ({ name: OPTIONS[Number(optId)].name, count }))
})

// ==============================================
// 🌟 인게임 오토(자동 돌리기) 상세 모달 & 로직 🌟
// ==============================================
const isAutoModalOpen = ref(false)
const autoTab = ref<'SET' | 'TIER' | 'OPTS'>('OPTS')
const autoTargetTier = ref(3) // 3: 마스터, 2: 프로 등 (OPTS 탭용)

// 설정값들
const setTargetCount = ref(3) // 세트 도달 (몇 개?)
const tierTargetTier = ref(3) // 등급 도달 (어떤 등급?)
const tierTargetCount = ref(1) // 등급 도달 (몇 개?)
const selectedOpts = ref<number[]>([]) // 선택된 옵션들 (복수 선택 가능)

// 애니메이션 구동 변수
const isSpinning = ref(false)
let spinInterval: ReturnType<typeof setInterval> | null = null

const toggleOpt = (id: number) => {
  const idx = selectedOpts.value.indexOf(id)
  if (idx > -1) selectedOpts.value.splice(idx, 1)
  else selectedOpts.value.push(id)
}

const toggleAllOpts = () => {
  if (selectedOpts.value.length === OPTIONS.length) selectedOpts.value = []
  else selectedOpts.value = OPTIONS.map(o => o.id)
}

// 오토 스탑 조건 검사기
const checkAutoStopCondition = () => {
  const unlockedSlots = slots.value.filter(s => !s.isLocked)
  if (unlockedSlots.length === 0) return true

  if (autoTab.value === 'SET') {
    // 세트 도달 (잠금 포함 전체 슬롯 기준)
    const counts: Record<number, number> = {}
    slots.value.forEach(s => counts[s.optId] = (counts[s.optId] || 0) + 1)
    counts[specialSlot.value.optId] = (counts[specialSlot.value.optId] || 0) + 1
    return Object.values(counts).some(count => count >= setTargetCount.value)
  } 
  
  if (autoTab.value === 'TIER') {
    // 등급 도달 (잠기지 않은 슬롯 중)
    const hitCount = unlockedSlots.filter(s => s.tier >= tierTargetTier.value).length
    return hitCount >= tierTargetCount.value
  }

  if (autoTab.value === 'OPTS') {
    // 특정 옵션 & 특정 등급 도달 (잠기지 않은 슬롯 중)
    if (selectedOpts.value.length === 0) return false
    return unlockedSlots.some(s => s.tier >= autoTargetTier.value && selectedOpts.value.includes(s.optId))
  }
  return false
}

const toggleAutoSpin = () => {
  if (isSpinning.value) {
    stopAutoSpin()
  } else {
    if (slots.value.every(s => s.isLocked)) return alert("모든 슬롯이 잠겨있습니다.")
    if (autoTab.value === 'OPTS' && selectedOpts.value.length === 0) return alert("옵션을 1개 이상 선택해주세요.")
    isAutoModalOpen.value = false
    isSpinning.value = true
    
    // 속도 조절 (너무 빠르지 않게 15ms 간격으로 시각적 갱신)
    spinInterval = setInterval(() => {
      rollSlots()
      if (checkAutoStopCondition() || totalApSpent.value > 1000000000) { // 안전장치 (10억AP)
        stopAutoSpin()
      }
    }, 20) 
  }
}

const stopAutoSpin = () => {
  isSpinning.value = false
  if (spinInterval) clearInterval(spinInterval)
}

const formatNum = (num: number) => new Intl.NumberFormat().format(num)
</script>

<template>
  <div class="w-full max-w-7xl mx-auto px-2 sm:px-4 py-2 font-sans text-neutral-900 dark:text-neutral-100 h-screen flex flex-col overflow-hidden">
    
    <!-- 최상단 탭 -->
    <div class="flex justify-center shrink-0 mb-3">
      <div class="bg-white dark:bg-neutral-800 p-1 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 flex gap-1">
        <button @click="activeTab = 'enhance'" class="px-4 py-1.5 rounded-md font-bold text-sm" :class="activeTab === 'enhance' ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'">강화 시뮬레이터</button>
        <button @click="activeTab = 'career'" class="px-4 py-1.5 rounded-md font-bold text-sm" :class="activeTab === 'career' ? 'bg-purple-600 text-white' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'">커리어 시뮬레이터</button>
      </div>
    </div>

    <!-- ==============================================
         [1] 강화 탭 (크기 대폭 압축)
         ============================================== -->
    <div v-show="activeTab === 'enhance'" class="flex-1 overflow-hidden flex flex-col">
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 h-full">
        <!-- 왼쪽 패널 -->
        <section class="flex flex-col gap-4 h-full">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm flex flex-col items-center shrink-0 relative">
            <RefreshCw @click="resetEnhanceSim" class="absolute top-3 right-3 w-4 h-4 cursor-pointer text-neutral-400" />
            <div class="flex items-center gap-3 text-4xl font-black my-2">
              <span :class="currentLevel >= MAX_LEVEL ? 'text-yellow-500' : 'text-neutral-400'">+{{ currentLevel }}</span>
              <ArrowRight v-if="currentLevel < MAX_LEVEL" class="w-5 h-5 text-neutral-300" />
              <span v-if="currentLevel < MAX_LEVEL" class="text-blue-500">+{{ currentLevel + 1 }}</span>
            </div>
            <div class="text-sm font-bold">{{ (currentRealProb * 100).toFixed(1) }}% <span class="text-xs text-neutral-400 font-normal">(기본{{(currentBaseProb*100).toFixed(1)}}%)</span></div>
            <button @click="tryEnhance" :disabled="currentLevel >= MAX_LEVEL" class="mt-3 w-3/4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"><Zap class="w-4 h-4"/> 강화 시도</button>
          </div>
          <div class="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3 flex-1 overflow-y-auto border border-neutral-200 dark:border-neutral-800">
            <div class="font-bold text-xs mb-2 px-1 flex items-center gap-1"><History class="w-3 h-3"/> 기록</div>
            <div class="space-y-1.5">
              <div v-for="log in logs" :key="log.id" class="flex justify-between p-2 bg-white dark:bg-neutral-900 rounded-md border text-xs">
                <span :class="log.type === 'success' ? 'text-blue-500' : 'text-red-500'">+{{log.from}} ➔ +{{log.to}}</span>
                <span class="text-neutral-400">{{ (log.prob * 100).toFixed(1) }}% | {{log.count}}장</span>
              </div>
            </div>
          </div>
        </section>
        <!-- 오른쪽 표 -->
        <section class="flex flex-col gap-4 h-full">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm flex items-center justify-between shrink-0">
            <div class="flex gap-2 w-1/2">
              <select v-model="calcStartLevel" class="w-1/2 bg-neutral-50 dark:bg-neutral-800 border rounded p-1 text-xs"><option v-for="n in MAX_LEVEL" :key="n" :value="n-1">+{{n-1}}</option></select>
              <select v-model="calcTargetLevel" class="w-1/2 bg-neutral-50 dark:bg-neutral-800 border rounded p-1 text-xs"><option v-for="n in MAX_LEVEL" :key="n" :value="n">+{{n}}</option></select>
            </div>
            <div class="text-xl font-black text-blue-600">{{ calculatedExpectedCards > 0 ? calculatedExpectedCards.toFixed(1) : '0' }} <span class="text-xs font-normal text-neutral-500">장</span></div>
          </div>
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden flex-1 overflow-y-auto shadow-sm text-xs">
            <table class="w-full text-center whitespace-nowrap">
              <thead class="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 sticky top-0">
                <tr><th class="py-2">단계</th><th>확률</th><th>1업</th><th>누적 필요</th></tr>
              </thead>
              <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                <tr v-for="(prob, idx) in BASE_PROBS" :key="idx"><td class="py-1.5">+{{idx}}➔+{{idx+1}}</td><td>{{(prob*100).toFixed(1)}}%</td><td>{{expectedValues[idx].toFixed(1)}}</td><td class="font-bold text-blue-500">{{(1 + expectedValues.slice(0, idx + 1).reduce((a, b) => a + b, 0)).toFixed(1)}}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>


    <!-- ==============================================
         [2] 커리어 탭 (한 화면 압축 + 인게임 오토)
         ============================================== -->
    <div v-show="activeTab === 'career'" class="flex-1 overflow-hidden flex flex-col">
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-4 h-full">
        
        <!-- 왼쪽 패널 (3칸) -->
        <section class="xl:col-span-4 flex flex-col gap-4 h-full">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm shrink-0">
            <select v-model="selectedCardIdx" class="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2 font-bold text-sm mb-3"><option v-for="(type, idx) in CARD_TYPES" :key="type.id" :value="idx">{{ type.name }}</option></select>
            <div class="text-[11px] text-neutral-500 bg-neutral-50 dark:bg-neutral-800 p-2 rounded flex justify-between">
              <span>기본: <strong class="text-blue-500">{{ formatNum(selectedCard.baseAP[3]) }}</strong></span>
              <span v-if="selectedCard.lockAP[4] > 0">페널티: <strong class="text-red-500">{{ formatNum(selectedCard.lockAP[4]) }}</strong></span>
            </div>
          </div>
          <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-xl p-4 text-white shadow-md flex-1 flex flex-col justify-center">
            <div class="flex justify-between items-center mb-4"><span class="font-bold text-sm">영수증</span><RefreshCw @click="resetCareerSim" class="w-3.5 h-3.5 text-neutral-400 cursor-pointer"/></div>
            <div class="space-y-4">
              <div><div class="text-neutral-400 text-[10px]">총 AP 소모</div><div class="text-2xl font-black text-yellow-400">{{ formatNum(totalApSpent) }}</div></div>
              <div class="flex justify-between items-end">
                <div><div class="text-neutral-400 text-[10px]">CASH 소모</div><div class="text-lg font-bold text-purple-400">{{ formatNum(totalCashSpent) }}</div></div>
                <div class="text-right"><div class="text-neutral-400 text-[10px]">캐시 갱신</div><div class="text-lg font-bold">{{ formatNum(specialSpinCount) }}회</div></div>
              </div>
            </div>
          </div>
        </section>

        <!-- 오른쪽 패널 (9칸) -->
        <section class="xl:col-span-8 flex flex-col gap-4 h-full">
          <!-- 세트 현황 -->
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-2.5 flex items-center min-h-[40px] shrink-0 gap-2 overflow-x-auto">
            <span class="text-xs font-bold text-blue-600 shrink-0">세트:</span>
            <div v-for="(ef, i) in setEffects" :key="i" class="bg-blue-600 text-white px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap">{{ ef.name }} ({{ ef.count }})</div>
          </div>

          <!-- 슬롯 영역 -->
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 shadow-sm flex-1 flex flex-col justify-between">
            <div class="space-y-1.5 flex-1 overflow-y-auto pr-1">
              <div class="p-2 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800/30 flex items-center justify-between gap-2">
                <div class="bg-red-500 text-white font-bold px-2 py-0.5 rounded text-[10px]">고정</div>
                <div class="flex-1 font-bold text-sm truncate">{{ OPTIONS[specialSlot.optId].name }}</div>
                <button @click="spinSpecialSlot" class="px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded">캐시갱신</button>
              </div>
              <div v-for="slot in slots" :key="slot.id" class="flex items-center gap-2 p-1.5 rounded-lg border" :class="slot.isLocked ? 'bg-neutral-100 opacity-60' : 'bg-white'">
                <div :class="[TIER_BG[slot.tier], TIER_COLORS[slot.tier]]" class="w-12 text-center py-0.5 rounded font-extrabold text-[10px]">{{ TIERS[slot.tier] }}</div>
                <div class="flex-1 font-bold text-sm truncate" :class="{'text-red-500': slot.tier === 3}">{{ OPTIONS[slot.optId].name }}</div>
                <button @click="toggleLock(slot.id)" class="p-1.5 rounded bg-neutral-100 border text-neutral-400 hover:text-black"><Lock v-if="slot.isLocked" class="w-4 h-4" /><Unlock v-else class="w-4 h-4" /></button>
              </div>
            </div>

            <!-- 하단 버튼 영역 -->
            <div class="flex gap-2 mt-3 shrink-0">
              <button @click="rollSlots" :disabled="isSpinning" class="w-1/2 py-2 bg-purple-600 text-white rounded-lg active:scale-95 flex flex-col items-center justify-center disabled:opacity-50">
                <span class="text-sm font-bold flex items-center gap-1"><Zap class="w-4 h-4"/> 1회 변경</span>
                <span class="text-[9px] font-normal text-purple-200">{{ formatNum(currentRollCostAP) }} AP 소모</span>
              </button>
              
              <button v-if="!isSpinning" @click="isAutoModalOpen = true" class="w-1/2 py-2 bg-neutral-800 hover:bg-black text-white font-bold rounded-lg flex items-center justify-center gap-1 text-sm"><Settings class="w-4 h-4"/> 자동 설정</button>
              <button v-else @click="stopAutoSpin" class="w-1/2 py-2 bg-red-500 text-white font-bold rounded-lg flex items-center justify-center gap-1 text-sm animate-pulse"><Pause class="w-4 h-4"/> 정지 (가챠중)</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>

  <!-- 🌟 자동 승급 옵션 설정 모달 (인게임 완벽 재현) 🌟 -->
  <div v-if="isAutoModalOpen" class="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
    <div class="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-[500px] overflow-hidden flex flex-col text-neutral-800 dark:text-neutral-200">
      <div class="bg-cyan-500 p-3 text-center text-white font-bold text-lg">자동 승급 옵션 설정</div>
      <div class="text-xs text-center p-2 text-neutral-500 bg-neutral-50 dark:bg-neutral-800 border-b">선택한 설정이 적용될 때까지 옵션 변경이 시도됩니다.</div>
      
      <div class="flex h-[300px]">
        <!-- 모달 좌측 탭 -->
        <div class="w-[100px] bg-neutral-800 p-2 flex flex-col gap-1">
          <button @click="autoTab = 'SET'" class="py-2 text-xs font-bold text-white clip-button" :class="autoTab === 'SET' ? 'bg-cyan-500' : 'bg-neutral-700'">세트 도달</button>
          <button @click="autoTab = 'TIER'" class="py-2 text-xs font-bold text-white clip-button" :class="autoTab === 'TIER' ? 'bg-cyan-500' : 'bg-neutral-700'">등급 도달</button>
          <button @click="autoTab = 'OPTS'; autoTargetTier = 3" class="py-2 text-xs font-bold text-white clip-button" :class="autoTab === 'OPTS' && autoTargetTier === 3 ? 'bg-cyan-500' : 'bg-neutral-700'">마스터</button>
          <button @click="autoTab = 'OPTS'; autoTargetTier = 2" class="py-2 text-xs font-bold text-white clip-button" :class="autoTab === 'OPTS' && autoTargetTier === 2 ? 'bg-cyan-500' : 'bg-neutral-700'">프로</button>
        </div>
        
        <!-- 모달 우측 내용 -->
        <div class="flex-1 p-4 overflow-y-auto relative">
          
          <!-- 세트 도달 설정 -->
          <div v-if="autoTab === 'SET'" class="space-y-4">
            <h3 class="font-bold text-sm mb-2">원하는 세트 개수 선택</h3>
            <div class="flex gap-2 justify-center">
              <label v-for="n in [2,3,4,5]" :key="n" class="flex flex-col items-center gap-1 cursor-pointer">
                <input type="radio" :value="n" v-model="setTargetCount" class="w-5 h-5 accent-cyan-500">
                <span class="text-xs font-bold">{{n}}개</span>
              </label>
            </div>
            <p class="text-[10px] text-neutral-500 text-center mt-4">* 잠긴 슬롯 포함, 아무 옵션이나 세트 개수 달성 시 정지</p>
          </div>

          <!-- 등급 도달 설정 -->
          <div v-if="autoTab === 'TIER'" class="space-y-4">
            <h3 class="font-bold text-sm mb-2">원하는 목표 등급 선택</h3>
            <select v-model="tierTargetTier" class="w-full p-2 border rounded text-sm mb-4 bg-white dark:bg-neutral-800">
              <option :value="3">마스터</option><option :value="2">프로</option><option :value="1">엘리트</option>
            </select>
            <h3 class="font-bold text-sm mb-2">몇 개 띄울까요?</h3>
            <div class="flex gap-2 justify-center">
              <label v-for="n in [1,2,3,4,5]" :key="n" class="flex flex-col items-center gap-1 cursor-pointer">
                <input type="radio" :value="n" v-model="tierTargetCount" class="w-4 h-4 accent-cyan-500">
                <span class="text-xs font-bold">{{n}}개</span>
              </label>
            </div>
          </div>

          <!-- 상세 옵션 선택 (마스터/프로) -->
          <div v-if="autoTab === 'OPTS'" class="space-y-2 pb-8">
            <div class="flex justify-between items-center mb-2">
              <span class="text-xs font-bold text-cyan-600">{{ TIERS[autoTargetTier] }} 옵션 선택</span>
              <label class="text-xs font-bold flex items-center gap-1 cursor-pointer"><input type="checkbox" @change="toggleAllOpts" :checked="selectedOpts.length === OPTIONS.length" class="accent-cyan-500">전체</label>
            </div>
            <label v-for="opt in OPTIONS" :key="opt.id" class="flex items-center gap-2 p-1.5 border-b border-neutral-100 dark:border-neutral-800 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800">
              <input type="checkbox" :checked="selectedOpts.includes(opt.id)" @change="toggleOpt(opt.id)" class="w-4 h-4 accent-cyan-500">
              <span class="text-[11px] font-bold" :class="{'text-neutral-400': autoTargetTier !== 3 && opt.id === 11}">{{ opt.name }}</span>
            </label>
          </div>

        </div>
      </div>
      
      <!-- 하단 버튼 -->
      <div class="p-3 bg-neutral-100 dark:bg-neutral-800 flex justify-between items-center shrink-0">
        <button @click="isAutoModalOpen = false" class="px-4 py-1.5 text-xs font-bold bg-neutral-300 dark:bg-neutral-700 rounded">취소</button>
        <button @click="toggleAutoSpin" class="px-8 py-1.5 text-sm font-bold bg-cyan-500 text-white rounded shadow">시작</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 인게임 버튼 스타일 흉내내기 (사선 깎임 효과 대신 둥근 테두리 활용) */
.clip-button {
  transition: background-color 0.2s;
  border-radius: 4px;
}
/* 전체 레이아웃 스크롤 차단 */
:global(body) {
  overflow: hidden;
}
</style>
