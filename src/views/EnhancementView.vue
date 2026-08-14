<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { 
  Zap, RefreshCw, ArrowRight, Check, X, Calculator, History, 
  Lock, Unlock, Play, Star, Settings, Pause, Edit3, Info
} from 'lucide-vue-next'

const activeTab = ref<'enhance' | 'career'>('career')

// ==============================================
// [1] 강화 시뮬레이터 (기존 로직 유지)
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


// ==============================================
// [2] 커리어 옵션 시뮬레이터 (타자/투수 분리 및 세부 로직)
// ==============================================
const playerType = ref<'BATTER' | 'PITCHER'>('BATTER')

const TIERS = ['루키', '엘리트', '프로', '마스터']
const TIER_COLORS = ['text-green-600 dark:text-green-500', 'text-blue-600 dark:text-blue-500', 'text-pink-600 dark:text-pink-500', 'text-yellow-600 dark:text-yellow-500']
const TIER_BG = ['bg-green-100 dark:bg-green-900/30', 'bg-blue-100 dark:bg-blue-900/30', 'bg-pink-100 dark:bg-pink-900/30', 'bg-yellow-100 dark:bg-yellow-900/30']

const CARD_TYPES = [
  { id: 0, name: 'SEA, ASG, POS', baseAP: [1000, 2000, 10000, 50000], lockAP: [0, 30000, 150000, 500000, 1000000], lockCash: [0, 0, 0, 0, 0] },
  { id: 1, name: 'TEAM, MMVP', baseAP: [10000, 20000, 50000, 250000], lockAP: [0, 50000, 250000, 900000, 2000000], lockCash: [0, 0, 0, 0, 0] },
  { id: 2, name: 'ROY (신인왕)', baseAP: [30000, 60000, 150000, 750000], lockAP: [0, 50000, 250000, 900000, 2000000], lockCash: [0, 0, 0, 0, 0] },
  { id: 3, name: 'HIT, ACE, GG, GGY', baseAP: [30000, 60000, 150000, 750000], lockAP: [0, 0, 0, 0, 0], lockCash: [0, 5, 15, 50, 100] },
  { id: 4, name: 'TOP, DGN', baseAP: [40000, 80000, 200000, 1000000], lockAP: [0, 0, 0, 0, 0], lockCash: [0, 5, 15, 50, 100] }
]

// 타자/투수 옵션 분리
const BATTER_OPTS = ['전체 능력치 상승', '컨택트 상승', '홈런 상승', '삼진회피 상승', '선구 상승', '갭파워 상승', '지고 있을 시 파워 상승', '안타 기록 시 파워 상승', '파워 높은 상대 시 파워 상승', '박빙 상황(2점차 내) 파워', '파워 낮은 상대 시 파워 상승', '★ 동일 팀 카드 수만큼 파워']
const PITCHER_OPTS = ['전체 능력치 상승', '무브먼트 상승', '홈런 억제 상승', '스터프 상승', '컨트롤 상승', '장타 억제 상승', '지고 있을 시 파워 상승', '삼진 기록 시 파워 상승', '파워 높은 상대 시 파워 상승', '박빙 상황(2점차 내) 파워', '파워 낮은 상대 시 파워 상승', '★ 동일 팀 카드 수만큼 파워']
const CURRENT_OPTS = computed(() => playerType.value === 'BATTER' ? BATTER_OPTS : PITCHER_OPTS)

const selectedCardIdx = ref(0)
const selectedCard = computed(() => CARD_TYPES[selectedCardIdx.value])

// 스탯 밸류 매핑 (루키, 엘리트, 프로, 마스터)
const STAT_VALUES = [
  [1, 2, 3], // 루키
  [4, 5, 6], // 엘리트
  [7, 8, 9], // 프로
  [12, 13, 14] // 마스터 (자팀은 고정 2)
]

const slots = ref(Array.from({ length: 5 }, (_, i) => ({ id: i, tier: 0, optId: 0, statVal: 3, isLocked: false })))
const specialSlot = ref({ tier: 3, optId: 0, statVal: 14 })

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

// 인게임 디테일 세트 효과 수치 로직
const getSetBonus = (optId: number, count: number) => {
  if (count < 3) return 0
  const idx = count - 3 // 3셋=0, 4셋=1, 5셋=2, 6셋=3
  if (optId === 0) return [3, 5, 7, 10][idx] // 전체능력치
  if (optId >= 1 && optId <= 5) return [5, 8, 12, 17][idx] // 개별스탯
  if (optId >= 6 && optId <= 10) return [6, 10, 14, 18][idx] // 조건부 파워
  if (optId === 11) return [1, 2, 3, 4][idx] // 동일 팀
  return 0
}

const rollOption = (tier: number) => {
  const isMaster = tier === 3; const totalWeight = isMaster ? 34 : 33; let rand = Math.random() * totalWeight
  let optId = 0
  for (let i = 0; i < 12; i++) {
    if (!isMaster && i === 11) continue
    rand -= (i === 11) ? 1 : 3
    if (rand < 0) { optId = i; break }
  }
  let statVal = STAT_VALUES[tier][Math.floor(Math.random() * 3)]
  if (tier === 3 && optId === 11) statVal = 2 // 자팀 고정
  return { optId, statVal }
}

const rollSlots = () => {
  const card = selectedCard.value; let lockedCount = slots.value.filter(s => s.isLocked).length
  if (lockedCount === 5) return
  let costAP = card.lockAP[lockedCount]; let costCash = card.lockCash[lockedCount]
  slots.value.forEach(slot => {
    if (!slot.isLocked) {
      costAP += card.baseAP[slot.tier]; if (slot.tier < 3 && Math.random() < 0.01) slot.tier++
      const rolled = rollOption(slot.tier)
      slot.optId = rolled.optId; slot.statVal = rolled.statVal
    }
  })
  totalApSpent.value += costAP; totalCashSpent.value += costCash; apSpinCount.value++
}

const spinSpecialSlot = () => { 
  const rolled = rollOption(3); specialSlot.value.optId = rolled.optId; specialSlot.value.statVal = rolled.statVal
  specialSpinCount.value++ 
}

const resetCareerSim = () => { 
  totalApSpent.value = 0; totalCashSpent.value = 0; apSpinCount.value = 0; specialSpinCount.value = 0; 
  slots.value.forEach(s => { s.tier = 0; s.isLocked = false; s.optId = 0; s.statVal = 3 }); 
  specialSlot.value.optId = 0; specialSlot.value.statVal = 14 
}
const toggleLock = (index: number) => slots.value[index].isLocked = !slots.value[index].isLocked

const setEffects = computed(() => {
  const counts: Record<number, number> = {}
  slots.value.forEach(s => counts[s.optId] = (counts[s.optId] || 0) + 1)
  counts[specialSlot.value.optId] = (counts[specialSlot.value.optId] || 0) + 1
  return Object.entries(counts).filter(([_, count]) => count >= 3).map(([optId, count]) => {
    const bonus = getSetBonus(Number(optId), count)
    return { name: CURRENT_OPTS.value[Number(optId)], count, bonusStr: `+${bonus}` }
  })
})

// ==============================================
// 🌟 오토 모달 로직 
// ==============================================
const isAutoModalOpen = ref(false)
const autoTab = ref<'SET' | 'TIER' | 'OPT_MASTER' | 'OPT_PRO' | 'OPT_ELITE' | 'OPT_ROOKIE'>('OPT_MASTER')
const setTargetCount = ref(3); const setTargetOpts = ref<number[]>([]) 
const tierTargetTier = ref(3); const tierTargetCount = ref(1) 
const optTargetOpts = ref<number[]>([]) 

const isSpinning = ref(false)
let spinInterval: ReturnType<typeof setInterval> | null = null

const toggleOpt = (targetArray: any, id: number) => { const idx = targetArray.indexOf(id); if (idx > -1) targetArray.splice(idx, 1); else targetArray.push(id) }
const toggleAllOpts = (targetArray: any, tier: number) => {
  const availableOpts = tier === 3 ? Array.from({length:12}, (_, i)=>i) : Array.from({length:11}, (_, i)=>i)
  if (targetArray.length === availableOpts.length) targetArray.splice(0, targetArray.length)
  else { targetArray.splice(0, targetArray.length); targetArray.push(...availableOpts) }
}
const checkAutoStopCondition = () => {
  const unlockedSlots = slots.value.filter(s => !s.isLocked)
  if (unlockedSlots.length === 0) return true
  if (autoTab.value === 'SET') {
    if (setTargetOpts.value.length === 0) return false
    const counts: Record<number, number> = {}; slots.value.forEach(s => counts[s.optId] = (counts[s.optId] || 0) + 1); counts[specialSlot.value.optId] = (counts[specialSlot.value.optId] || 0) + 1
    return setTargetOpts.value.some(optId => (counts[optId] || 0) >= setTargetCount.value)
  } 
  if (autoTab.value === 'TIER') return unlockedSlots.filter(s => s.tier >= tierTargetTier.value).length >= tierTargetCount.value
  if (autoTab.value.startsWith('OPT_')) {
    if (optTargetOpts.value.length === 0) return false
    const targetTier = autoTab.value === 'OPT_MASTER' ? 3 : autoTab.value === 'OPT_PRO' ? 2 : autoTab.value === 'OPT_ELITE' ? 1 : 0
    return unlockedSlots.some(s => s.tier === targetTier && optTargetOpts.value.includes(s.optId))
  }
  return false
}
const toggleAutoSpin = () => {
  if (isSpinning.value) stopAutoSpin()
  else {
    if (slots.value.every(s => s.isLocked)) return alert("모든 슬롯이 잠겨있습니다.")
    isAutoModalOpen.value = false; isSpinning.value = true
    spinInterval = setInterval(() => { rollSlots(); if (checkAutoStopCondition() || totalApSpent.value > 1500000000) stopAutoSpin() }, 35) 
  }
}
const stopAutoSpin = () => { isSpinning.value = false; if (spinInterval) clearInterval(spinInterval) }
const formatNum = (num: number) => new Intl.NumberFormat().format(num)

// 커스텀 에디터 값 보정 로직
const validateStatVal = (slot: any) => {
  const isSpecial = slot.id === undefined
  const tier = slot.tier
  const optId = slot.optId
  if (tier === 3 && optId === 11) slot.statVal = 2
  else {
    const validVals = STAT_VALUES[tier]
    if (!validVals.includes(slot.statVal)) slot.statVal = validVals[validVals.length - 1]
  }
}
</script>

<template>
  <div class="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-4 font-sans text-neutral-900 dark:text-neutral-100 flex flex-col min-h-screen">
    
    <!-- 최상단 탭 -->
    <div class="flex justify-center shrink-0 mb-6">
      <div class="bg-white dark:bg-neutral-800 p-1.5 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex gap-1">
        <button @click="activeTab = 'enhance'" class="px-5 py-2.5 rounded-lg font-bold text-base transition-colors" :class="activeTab === 'enhance' ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'">강화 시뮬레이터</button>
        <button @click="activeTab = 'career'" class="px-5 py-2.5 rounded-lg font-bold text-base transition-colors" :class="activeTab === 'career' ? 'bg-purple-600 text-white' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'">커리어 시뮬레이터</button>
      </div>
    </div>

    <!-- ==============================================
         [1] 강화 탭 (유지)
         ============================================== -->
    <div v-show="activeTab === 'enhance'" class="flex flex-col max-w-6xl mx-auto w-full">
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section class="flex flex-col gap-6">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col items-center shrink-0 relative">
            <RefreshCw @click="resetEnhanceSim" class="absolute top-4 right-4 w-5 h-5 cursor-pointer text-neutral-400 hover:text-blue-500" />
            <div class="flex flex-col items-center mb-2 bg-neutral-50 dark:bg-neutral-800 px-4 py-2 rounded-lg">
              <label class="text-xs font-bold text-neutral-500 mb-1">시작 단계 강제 세팅</label>
              <select v-model="currentLevel" @change="failStack=0; totalCardsUsed=0; logs=[]" class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md px-4 py-1 text-sm font-bold outline-none text-center hover:border-blue-500 transition-colors cursor-pointer"><option v-for="n in (MAX_LEVEL+1)" :key="n-1" :value="n-1">+{{n-1}}부터 시작</option></select>
            </div>
            <div class="flex items-center gap-4 text-5xl font-black my-3">
              <span :class="currentLevel >= MAX_LEVEL ? 'text-yellow-500' : 'text-neutral-400'">+{{ currentLevel }}</span>
              <ArrowRight v-if="currentLevel < MAX_LEVEL" class="w-6 h-6 text-neutral-300" />
              <span v-if="currentLevel < MAX_LEVEL" class="text-blue-500">+{{ currentLevel + 1 }}</span>
            </div>
            <div class="text-lg font-bold mb-4">{{ (currentRealProb * 100).toFixed(1) }}% <span class="text-sm text-neutral-400 font-normal">(기본{{(currentBaseProb*100).toFixed(1)}}%)</span></div>
            <button @click="tryEnhance" :disabled="currentLevel >= MAX_LEVEL" class="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"><Zap class="w-5 h-5"/> 강화 시도</button>
          </div>
          <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col h-[400px] shadow-sm">
            <div class="font-bold text-base px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-t-2xl"><History class="w-4 h-4"/> 강화 기록</div>
            <div class="flex-1 overflow-y-auto p-3 space-y-2">
              <div v-for="log in logs" :key="log.id" class="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-100 dark:border-neutral-800 text-sm">
                <span :class="log.type === 'success' ? 'text-blue-600 font-bold' : 'text-red-500 font-medium'">+{{log.from}} ➔ +{{log.to}}</span>
                <span class="text-neutral-500">{{ (log.prob * 100).toFixed(1) }}% <span class="mx-1">|</span> {{log.count}}장</span>
              </div>
              <div v-if="logs.length === 0" class="text-center text-neutral-400 py-10 text-sm">기록이 없습니다.</div>
            </div>
          </div>
        </section>
        
        <section class="flex flex-col gap-6">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm flex items-center justify-between shrink-0">
            <div class="flex gap-3 w-1/2">
              <select v-model="calcStartLevel" class="w-1/2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2 font-medium"><option v-for="n in MAX_LEVEL" :key="n" :value="n-1">+{{n-1}}</option></select>
              <select v-model="calcTargetLevel" class="w-1/2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2 font-medium"><option v-for="n in MAX_LEVEL" :key="n" :value="n">+{{n}}</option></select>
            </div>
            <div class="text-3xl font-black text-blue-600">{{ calculatedExpectedCards > 0 ? calculatedExpectedCards.toFixed(1) : '0' }} <span class="text-base font-medium text-neutral-500">장</span></div>
          </div>
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm flex-1">
            <div class="overflow-y-auto h-full max-h-[600px]">
              <table class="w-full text-center text-sm sm:text-base">
                <thead class="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-10 font-bold">
                  <tr><th class="py-3.5">단계</th><th>확률</th><th>1업</th><th>누적 필요</th></tr>
                </thead>
                <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                  <tr v-for="(prob, idx) in BASE_PROBS" :key="idx" class="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td class="py-3 font-medium text-neutral-700 dark:text-neutral-300">+{{idx}}➔+{{idx+1}}</td><td>{{(prob*100).toFixed(1)}}%</td><td>{{expectedValues[idx].toFixed(1)}}</td><td class="font-extrabold text-blue-600">{{(1 + expectedValues.slice(0, idx + 1).reduce((a, b) => a + b, 0)).toFixed(1)}}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>


    <!-- ==============================================
         [2] 커리어 탭 (3단 분리: 통계 / 슬롯 / 커스텀&기대값)
         ============================================== -->
    <div v-show="activeTab === 'career'" class="flex flex-col w-full">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        <!-- [왼쪽] 타자/투수 선택 & 파산 영수증 -->
        <section class="lg:col-span-3 flex flex-col gap-5">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
            <div class="flex gap-2 mb-4 bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-xl">
              <button @click="playerType = 'BATTER'" class="flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors" :class="playerType === 'BATTER' ? 'bg-blue-500 text-white shadow-sm' : 'text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700'">타자 (Batter)</button>
              <button @click="playerType = 'PITCHER'" class="flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors" :class="playerType === 'PITCHER' ? 'bg-red-500 text-white shadow-sm' : 'text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700'">투수 (Pitcher)</button>
            </div>
            
            <select v-model="selectedCardIdx" class="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 font-bold text-sm mb-4 outline-none"><option v-for="(type, idx) in CARD_TYPES" :key="type.id" :value="idx">{{ type.name }}</option></select>
            <div class="text-[13px] text-neutral-500 bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl flex flex-col gap-1">
              <div class="flex justify-between"><span>기본 1칸:</span><strong class="text-blue-600">{{ formatNum(selectedCard.baseAP[3]) }}</strong></div>
              <div class="flex justify-between" v-if="selectedCard.lockAP[4] > 0"><span>4칸 잠금 페널티:</span><strong class="text-red-500">{{ formatNum(selectedCard.lockAP[4]) }}</strong></div>
            </div>
          </div>
          
          <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-5 text-white shadow-xl flex-1 flex flex-col justify-center relative">
            <RefreshCw @click="resetCareerSim" class="absolute top-4 right-4 w-4 h-4 text-neutral-400 hover:text-white cursor-pointer transition-colors"/>
            <div class="font-extrabold text-lg flex items-center gap-2 mb-6"><Calculator class="w-5 h-5 text-green-400"/> 영수증</div>
            <div class="space-y-4">
              <div>
                <div class="text-neutral-400 text-xs mb-1">총 스핀 횟수</div>
                <div class="text-xl font-bold">{{ formatNum(apSpinCount) }} 회</div>
              </div>
              <div>
                <div class="text-neutral-400 text-xs mb-1">총 AP 소모</div>
                <div class="text-2xl font-black text-yellow-400 tracking-tight">{{ formatNum(totalApSpent) }}</div>
              </div>
              <div class="flex justify-between items-end pt-4 border-t border-neutral-700">
                <div><div class="text-neutral-400 text-[10px] mb-1">CASH 소모</div><div class="text-lg font-bold text-purple-400">{{ formatNum(totalCashSpent) }}</div></div>
                <div class="text-right"><div class="text-neutral-400 text-[10px] mb-1">스페셜 갱신</div><div class="text-base font-bold">{{ formatNum(specialSpinCount) }}회</div></div>
              </div>
            </div>
          </div>
        </section>

        <!-- [중앙] 세트 효과 & 시뮬레이션 슬롯 -->
        <section class="lg:col-span-5 flex flex-col gap-4">
          
          <!-- 세트 현황 (보너스 수치 포함) -->
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 flex items-center gap-3 shrink-0 overflow-x-auto min-h-[60px]">
            <span class="text-sm font-bold text-blue-700 dark:text-blue-400 shrink-0">세트:</span>
            <div v-for="(ef, i) in setEffects" :key="i" class="bg-blue-600 text-white px-2.5 py-1 rounded-lg text-sm font-bold whitespace-nowrap shadow-sm flex items-center gap-2">
              {{ ef.name }} {{ ef.count }}셋 <span class="bg-blue-800 text-yellow-300 px-1.5 py-0.5 rounded text-[11px] border border-blue-500">{{ ef.bonusStr }}</span>
            </div>
            <div v-if="setEffects.length === 0" class="text-xs text-neutral-400">발동된 세트 효과가 없습니다.</div>
          </div>

          <!-- 메인 슬롯 영역 -->
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex-1 flex flex-col">
            <div class="space-y-2 flex-1 overflow-y-auto mb-4">
              <!-- 스페셜 슬롯 -->
              <div class="p-2.5 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800/30 flex items-center justify-between gap-3">
                <div class="bg-red-500 text-white font-extrabold px-2.5 py-1 rounded text-xs shrink-0">고정</div>
                <div class="flex-1 font-extrabold text-sm sm:text-base truncate text-neutral-800 dark:text-neutral-200 flex items-center justify-between pr-2">
                  <span class="text-yellow-600 dark:text-yellow-500">{{ CURRENT_OPTS[specialSlot.optId] }}</span>
                  <span class="text-yellow-600 dark:text-yellow-500">+{{ specialSlot.statVal }}</span>
                </div>
                <button @click="spinSpecialSlot" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 transition-colors text-white text-xs font-bold rounded-lg shadow-sm shrink-0">갱신</button>
              </div>
              
              <!-- 일반 AP 슬롯 -->
              <div v-for="slot in slots" :key="slot.id" class="flex items-center gap-2 p-2 rounded-xl border transition-all" :class="slot.isLocked ? 'bg-neutral-100 dark:bg-neutral-800 opacity-60 border-neutral-300 dark:border-neutral-700' : 'bg-white dark:bg-neutral-900 border-purple-200 dark:border-purple-800/50'">
                <!-- 인게임 UI 흉내: 등급 클릭 안함 (우측 에디터에서 관리) -->
                <div :class="[TIER_BG[slot.tier], TIER_COLORS[slot.tier]]" class="w-14 text-center py-1 rounded-lg font-extrabold text-xs shadow-sm shrink-0">{{ TIERS[slot.tier] }}</div>
                <div class="flex-1 font-bold text-sm sm:text-base truncate text-neutral-800 dark:text-neutral-200 flex justify-between items-center pr-2" :class="{'text-yellow-600 dark:text-yellow-500': slot.tier === 3}">
                  <span>{{ CURRENT_OPTS[slot.optId] }}</span>
                  <span :class="slot.tier === 3 ? 'text-yellow-600 dark:text-yellow-500' : slot.tier === 2 ? 'text-pink-600 dark:text-pink-500' : slot.tier === 1 ? 'text-blue-600 dark:text-blue-500' : 'text-green-600 dark:text-green-500'">+{{ slot.statVal }}</span>
                </div>
                <button @click="toggleLock(slot.id)" class="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-black dark:hover:text-white transition-colors shrink-0">
                  <Lock v-if="slot.isLocked" class="w-4 h-4 text-yellow-500" /><Unlock v-else class="w-4 h-4" />
                </button>
              </div>
            </div>

            <div class="flex gap-2 shrink-0 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button @click="rollSlots" :disabled="isSpinning" class="w-1/2 py-2.5 bg-purple-600 hover:bg-purple-700 transition-colors text-white rounded-xl active:scale-95 flex flex-col items-center justify-center disabled:opacity-50 shadow-md">
                <span class="text-sm font-extrabold flex items-center gap-1.5"><Zap class="w-4 h-4"/> 1회 변경</span>
                <span class="text-[10px] font-medium text-purple-200">{{ formatNum(currentRollCostAP) }} AP</span>
              </button>
              
              <button v-if="!isSpinning" @click="isAutoModalOpen = true" class="w-1/2 py-2.5 bg-neutral-800 hover:bg-black dark:bg-neutral-700 dark:hover:bg-neutral-600 transition-colors text-white font-extrabold rounded-xl flex items-center justify-center gap-2 text-sm shadow-md"><Settings class="w-4 h-4"/> 자동 설정</button>
              <button v-else @click="stopAutoSpin" class="w-1/2 py-2.5 bg-red-500 hover:bg-red-600 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 text-sm shadow-md animate-pulse"><Pause class="w-4 h-4"/> 정지 (가챠중)</button>
            </div>
          </div>
        </section>

        <!-- [우측] 슬롯 커스텀 에디터 & 기대값 표 -->
        <section class="lg:col-span-4 flex flex-col gap-5">
          
          <!-- 슬롯 수동 에디터 -->
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm">
            <h3 class="font-extrabold text-sm flex items-center gap-2 mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-800"><Edit3 class="w-4 h-4 text-blue-500"/> 슬롯 수동 커스텀 (인게임 상태 복사)</h3>
            
            <div class="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              <div v-for="(slot, i) in [...slots, specialSlot]" :key="i" class="bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg border border-neutral-100 dark:border-neutral-700 flex flex-col gap-1.5">
                <div class="text-[10px] font-bold text-neutral-400 pl-1">{{ slot.id === undefined ? '고정 마스터 슬롯' : `슬롯 ${slot.id + 1}` }}</div>
                <div class="flex gap-1.5">
                  <select v-model="slot.tier" @change="validateStatVal(slot)" :disabled="slot.id === undefined" class="w-1/4 bg-white dark:bg-neutral-900 border rounded text-[11px] font-bold p-1 outline-none disabled:opacity-50">
                    <option v-for="(t, idx) in TIERS" :key="idx" :value="idx">{{t}}</option>
                  </select>
                  <select v-model="slot.optId" @change="validateStatVal(slot)" class="w-1/2 bg-white dark:bg-neutral-900 border rounded text-[11px] font-bold p-1 outline-none truncate">
                    <option v-for="(opt, oIdx) in CURRENT_OPTS" :key="oIdx" :value="oIdx" :disabled="slot.tier !== 3 && oIdx === 11">{{opt}}</option>
                  </select>
                  <select v-model="slot.statVal" class="w-1/4 bg-white dark:bg-neutral-900 border rounded text-[11px] font-bold p-1 outline-none text-blue-600">
                    <option v-if="slot.tier===3 && slot.optId===11" :value="2">+2</option>
                    <option v-else v-for="val in STAT_VALUES[slot.tier]" :key="val" :value="val">+{{val}}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- 커리어 옵션 기대값 가이드 -->
          <div class="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-2xl p-4 shadow-sm flex-1">
            <h3 class="font-extrabold text-sm flex items-center gap-2 mb-3 text-blue-700 dark:text-blue-400"><Info class="w-4 h-4"/> 커리어 확률 & 기대값 가이드</h3>
            <div class="space-y-3 text-xs text-neutral-700 dark:text-neutral-300">
              <div class="p-2 bg-white dark:bg-neutral-900 rounded-lg shadow-sm">
                <div class="font-bold text-blue-600 dark:text-blue-400 mb-1">📈 승급 확률 (1칸 기준)</div>
                <ul class="list-disc pl-4 space-y-1">
                  <li>루키 ➔ 엘리트 : <strong class="text-neutral-900 dark:text-white">평균 100회</strong> (1%)</li>
                  <li>엘리트 ➔ 프로 : <strong class="text-neutral-900 dark:text-white">평균 100회</strong> (1%)</li>
                  <li>프로 ➔ 마스터 : <strong class="text-neutral-900 dark:text-white">평균 100회</strong> (1%)</li>
                  <li>루키 ➔ 마스터 (누적) : <strong class="text-red-500">평균 300회</strong> 소요</li>
                </ul>
              </div>
              <div class="p-2 bg-white dark:bg-neutral-900 rounded-lg shadow-sm">
                <div class="font-bold text-blue-600 dark:text-blue-400 mb-1">🎯 옵션 저격 확률 (마스터 기준)</div>
                <ul class="list-disc pl-4 space-y-1">
                  <li>일반 특정 옵션 1개 등장 : <strong class="text-neutral-900 dark:text-white">평균 약 11.3회</strong> (3/34)</li>
                  <li>★ 동일 팀(자팀) 옵션 1개 등장 : <strong class="text-red-500">평균 34회</strong> (1/34 극악)</li>
                </ul>
              </div>
              <div class="p-2 bg-white dark:bg-neutral-900 rounded-lg shadow-sm">
                <div class="font-bold text-blue-600 dark:text-blue-400 mb-1">💡 5칸 동시 굴리기 팁</div>
                <p class="leading-relaxed">
                  5칸을 잠금 없이 돌릴 경우, 모두 마스터에 도달하려면 독립 시행이므로 <strong class="text-red-500">평균 약 700~800회</strong>의 스핀이 필요합니다. 1마스터 4루키가 떴다면, 과감히 마스터를 잠그고 페널티를 감수하며 올리는 것이 정신건강에 이로울 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  </div>

  <!-- 🌟 자동 승급 모달 🌟 -->
  <div v-if="isAutoModalOpen" class="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm">
    <div class="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-[550px] overflow-hidden flex flex-col text-neutral-800 dark:text-neutral-200">
      <div class="bg-cyan-500 p-4 text-center text-white font-extrabold text-xl">자동 승급 옵션 설정</div>
      <div class="text-xs text-center p-2 text-neutral-500 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">선택한 설정이 적용될 때까지 옵션 변경이 시도됩니다.</div>
      
      <div class="flex h-[380px]">
        <div class="w-[110px] bg-neutral-800 p-2 flex flex-col gap-1.5 shrink-0">
          <button @click="autoTab = 'SET'" class="py-3 text-sm font-bold text-white rounded-md transition-colors" :class="autoTab === 'SET' ? 'bg-cyan-500 shadow-md' : 'bg-neutral-700 hover:bg-neutral-600'">세트 도달</button>
          <button @click="autoTab = 'TIER'" class="py-3 text-sm font-bold text-white rounded-md transition-colors" :class="autoTab === 'TIER' ? 'bg-cyan-500 shadow-md' : 'bg-neutral-700 hover:bg-neutral-600'">등급 도달</button>
          <button @click="autoTab = 'OPT_MASTER'" class="py-3 text-sm font-bold text-white rounded-md transition-colors" :class="autoTab === 'OPT_MASTER' ? 'bg-cyan-500 shadow-md' : 'bg-neutral-700 hover:bg-neutral-600'">마스터</button>
          <button @click="autoTab = 'OPT_PRO'" class="py-3 text-sm font-bold text-white rounded-md transition-colors" :class="autoTab === 'OPT_PRO' ? 'bg-cyan-500 shadow-md' : 'bg-neutral-700 hover:bg-neutral-600'">프로</button>
          <button @click="autoTab = 'OPT_ELITE'" class="py-3 text-sm font-bold text-white rounded-md transition-colors" :class="autoTab === 'OPT_ELITE' ? 'bg-cyan-500 shadow-md' : 'bg-neutral-700 hover:bg-neutral-600'">엘리트</button>
          <button @click="autoTab = 'OPT_ROOKIE'" class="py-3 text-sm font-bold text-white rounded-md transition-colors" :class="autoTab === 'OPT_ROOKIE' ? 'bg-cyan-500 shadow-md' : 'bg-neutral-700 hover:bg-neutral-600'">루키</button>
        </div>
        
        <div class="flex-1 p-5 overflow-y-auto bg-white dark:bg-neutral-900">
          <div v-if="autoTab === 'SET'" class="space-y-6">
            <div>
              <h3 class="font-extrabold text-sm mb-3 text-cyan-600">몇 세트를 원하시나요? (고정옵션 포함)</h3>
              <div class="flex gap-4">
                <label v-for="n in [3,4,5,6]" :key="n" class="flex flex-col items-center gap-1.5 cursor-pointer">
                  <input type="radio" :value="n" v-model="setTargetCount" class="w-5 h-5 accent-cyan-500">
                  <span class="text-sm font-bold">{{n}}개</span>
                </label>
              </div>
            </div>
            <div>
              <div class="flex justify-between items-center mb-3">
                <h3 class="font-extrabold text-sm text-cyan-600">원하는 세트 옵션 선택</h3>
                <label class="text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                  <input type="checkbox" @change="toggleAllOpts(setTargetOpts, 3)" :checked="setTargetOpts.length === 12" class="accent-cyan-500">전체 선택
                </label>
              </div>
              <div class="space-y-1">
                <label v-for="(opt, i) in CURRENT_OPTS" :key="i" class="flex items-center gap-2 p-2 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer border-b border-neutral-100 dark:border-neutral-800">
                  <input type="checkbox" :checked="setTargetOpts.includes(i)" @change="toggleOpt(setTargetOpts, i)" class="w-4 h-4 accent-cyan-500">
                  <span class="text-sm font-semibold">{{ opt }}</span>
                </label>
              </div>
            </div>
          </div>

          <div v-if="autoTab === 'TIER'" class="space-y-6">
            <div>
              <h3 class="font-extrabold text-sm mb-3 text-cyan-600">원하는 목표 등급 선택</h3>
              <select v-model="tierTargetTier" class="w-full p-2.5 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm font-bold bg-white dark:bg-neutral-800 outline-none">
                <option :value="3">마스터</option><option :value="2">프로</option><option :value="1">엘리트</option>
              </select>
            </div>
            <div>
              <h3 class="font-extrabold text-sm mb-3 text-cyan-600">해당 등급을 몇 개 띄울까요? (잠금 제외)</h3>
              <div class="flex gap-4">
                <label v-for="n in [1,2,3,4,5]" :key="n" class="flex flex-col items-center gap-1.5 cursor-pointer">
                  <input type="radio" :value="n" v-model="tierTargetCount" class="w-5 h-5 accent-cyan-500">
                  <span class="text-sm font-bold">{{n}}개</span>
                </label>
              </div>
            </div>
          </div>

          <div v-if="autoTab.startsWith('OPT_')" class="space-y-2 pb-4">
            <div class="flex justify-between items-center mb-3 sticky top-0 bg-white dark:bg-neutral-900 py-1 z-10">
              <span class="text-sm font-extrabold text-cyan-600">{{ autoTab === 'OPT_MASTER' ? '마스터' : autoTab === 'OPT_PRO' ? '프로' : autoTab === 'OPT_ELITE' ? '엘리트' : '루키' }} 옵션 선택</span>
              <label class="text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                <input type="checkbox" @change="toggleAllOpts(optTargetOpts, autoTab === 'OPT_MASTER' ? 3 : 0)" :checked="optTargetOpts.length === (autoTab === 'OPT_MASTER' ? 12 : 11)" class="accent-cyan-500">전체 선택
              </label>
            </div>
            <label v-for="(opt, i) in CURRENT_OPTS" :key="i" class="flex items-center gap-3 p-2 border-b border-neutral-100 dark:border-neutral-800 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors" :class="{'opacity-40 pointer-events-none': autoTab !== 'OPT_MASTER' && i === 11}">
              <input type="checkbox" :checked="optTargetOpts.includes(i)" @change="toggleOpt(optTargetOpts, i)" class="w-4 h-4 accent-cyan-500">
              <span class="text-sm font-bold">{{ opt }}</span>
            </label>
          </div>
        </div>
      </div>
      
      <div class="p-4 bg-neutral-100 dark:bg-neutral-800 flex justify-between items-center shrink-0 border-t border-neutral-200 dark:border-neutral-700">
        <button @click="isAutoModalOpen = false" class="px-6 py-2.5 text-sm font-bold bg-neutral-300 dark:bg-neutral-600 hover:bg-neutral-400 dark:hover:bg-neutral-500 rounded-lg transition-colors">취소</button>
        <button @click="toggleAutoSpin" class="px-10 py-2.5 text-base font-extrabold bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg shadow-md transition-colors">시작</button>
      </div>
    </div>
  </div>
</template>
