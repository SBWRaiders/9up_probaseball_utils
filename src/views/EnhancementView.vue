<script setup lang="ts">
import { ref, computed } from 'vue'
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

const currentLevel = ref(0) // 유저가 직접 변경할 수 있도록 v-model 연결
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
// [2] 커리어 옵션 시뮬레이터 (세부 수치 완벽 적용)
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
  { id: 6, name: '지고 있을 시, 파워 상승' }, { id: 7, name: '기록 시 (안타/삼진) 파워 상승' }, { id: 8, name: '파워 높은 카드 상대 시' },
  { id: 9, name: '박빙 상황(2점차 내) 파워' }, { id: 10, name: '파워 낮은 카드 상대 시' }, { id: 11, name: '★ 동일 팀 카드 수만큼' }
]

const selectedCardIdx = ref(0)
const selectedCard = computed(() => CARD_TYPES[selectedCardIdx.value])
// 옵션 데이터에 세부 수치(statVal) 추가
const slots = ref(Array.from({ length: 5 }, (_, i) => ({ id: i, tier: 0, optId: 0, statVal: 3, isLocked: false })))
const specialSlot = ref({ tier: 3, optId: 0, statVal: 14 })

const totalApSpent = ref(0)
const totalCashSpent = ref(0)
const specialSpinCount = ref(0)
const apSpinCount = ref(0)

const globalSetTier = ref(0) // 잠금 해제된 슬롯 일괄 등급 변경용

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

// 옵션 굴리기 (아이디와 함께 세부 수치도 계산)
const rollOption = (tier: number) => {
  const isMaster = tier === 3; const totalWeight = isMaster ? 34 : 33; let rand = Math.random() * totalWeight
  let optId = 0
  for (let i = 0; i < OPTIONS.length; i++) {
    if (!isMaster && i === 11) continue
    rand -= (i === 11) ? 1 : 3
    if (rand < 0) { optId = i; break }
  }
  
  // 등급에 따른 세부 수치(Stat Value) 결정 로직
  let statVal = 0
  if (tier === 0) statVal = [1, 2, 3][Math.floor(Math.random() * 3)] // 루키
  else if (tier === 1) statVal = [4, 5, 6][Math.floor(Math.random() * 3)] // 엘리트
  else if (tier === 2) statVal = [7, 8, 9][Math.floor(Math.random() * 3)] // 프로
  else if (tier === 3) {
    if (optId === 11) statVal = 2 // 자팀 옵션은 고정 +2
    else statVal = [12, 13, 14][Math.floor(Math.random() * 3)] // 마스터 12~14
  }
  return { optId, statVal }
}

// 무료로 현재 잠금 안 된 슬롯들 시작 등급 세팅하기
const applyGlobalTier = () => {
  slots.value.forEach(slot => {
    if (!slot.isLocked) {
      slot.tier = globalSetTier.value
      const rolled = rollOption(slot.tier)
      slot.optId = rolled.optId
      slot.statVal = rolled.statVal
    }
  })
}

const rollSlots = () => {
  const card = selectedCard.value; let lockedCount = slots.value.filter(s => s.isLocked).length
  if (lockedCount === 5) return
  let costAP = card.lockAP[lockedCount]; let costCash = card.lockCash[lockedCount]
  slots.value.forEach(slot => {
    if (!slot.isLocked) {
      costAP += card.baseAP[slot.tier]; if (slot.tier < 3 && Math.random() < 0.01) slot.tier++
      const rolled = rollOption(slot.tier)
      slot.optId = rolled.optId
      slot.statVal = rolled.statVal
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

// 세트 효과 디테일 계산 (3,4,5,6 세트에 따른 보너스 수치)
const setEffects = computed(() => {
  const counts: Record<number, number> = {}
  slots.value.forEach(s => counts[s.optId] = (counts[s.optId] || 0) + 1)
  counts[specialSlot.value.optId] = (counts[specialSlot.value.optId] || 0) + 1
  return Object.entries(counts).filter(([_, count]) => count >= 3).map(([optId, count]) => {
    const isTeam = Number(optId) === 11
    let bonus = 0
    if (isTeam) {
      bonus = count === 3 ? 1 : count === 4 ? 2 : count === 5 ? 3 : 4 // 자팀 세트 수치
    } else {
      bonus = count === 3 ? 5 : count === 4 ? 10 : count === 5 ? 15 : 20 // 일반 옵션 세트 수치
    }
    return { name: OPTIONS[Number(optId)].name, count, bonusStr: `+${bonus}` }
  })
})

// ==============================================
// 🌟 오토 모달 로직 
// ==============================================
const isAutoModalOpen = ref(false)
const autoTab = ref<'SET' | 'TIER' | 'OPT_MASTER' | 'OPT_PRO' | 'OPT_ELITE' | 'OPT_ROOKIE'>('OPT_MASTER')
const setTargetCount = ref(3) 
const setTargetOpts = ref<number[]>([]) 
const tierTargetTier = ref(3) 
const tierTargetCount = ref(1) 
const optTargetOpts = ref<number[]>([]) 

const isSpinning = ref(false)
let spinInterval: ReturnType<typeof setInterval> | null = null

const toggleOpt = (targetArray: any, id: number) => {
  const idx = targetArray.indexOf(id)
  if (idx > -1) targetArray.splice(idx, 1); else targetArray.push(id)
}
const toggleAllOpts = (targetArray: any, tier: number) => {
  const availableOpts = tier === 3 ? OPTIONS.map(o => o.id) : OPTIONS.filter(o => o.id !== 11).map(o => o.id)
  if (targetArray.length === availableOpts.length) targetArray.splice(0, targetArray.length)
  else { targetArray.splice(0, targetArray.length); targetArray.push(...availableOpts) }
}
const checkAutoStopCondition = () => {
  const unlockedSlots = slots.value.filter(s => !s.isLocked)
  if (unlockedSlots.length === 0) return true
  if (autoTab.value === 'SET') {
    if (setTargetOpts.value.length === 0) return false
    const counts: Record<number, number> = {}
    slots.value.forEach(s => counts[s.optId] = (counts[s.optId] || 0) + 1); counts[specialSlot.value.optId] = (counts[specialSlot.value.optId] || 0) + 1
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
    if (autoTab.value === 'SET' && setTargetOpts.value.length === 0) return alert("목표 옵션을 선택해주세요.")
    if (autoTab.value.startsWith('OPT_') && optTargetOpts.value.length === 0) return alert("목표 옵션을 선택해주세요.")
    isAutoModalOpen.value = false; isSpinning.value = true
    spinInterval = setInterval(() => { rollSlots(); if (checkAutoStopCondition() || totalApSpent.value > 1500000000) stopAutoSpin() }, 35) 
  }
}
const stopAutoSpin = () => { isSpinning.value = false; if (spinInterval) clearInterval(spinInterval) }
const formatNum = (num: number) => new Intl.NumberFormat().format(num)
</script>

<template>
  <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 font-sans text-neutral-900 dark:text-neutral-100 flex flex-col min-h-screen">
    
    <!-- 최상단 탭 -->
    <div class="flex justify-center shrink-0 mb-6">
      <div class="bg-white dark:bg-neutral-800 p-1.5 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex gap-1">
        <button @click="activeTab = 'enhance'" class="px-5 py-2.5 rounded-lg font-bold text-base transition-colors" :class="activeTab === 'enhance' ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'">강화 시뮬레이터</button>
        <button @click="activeTab = 'career'" class="px-5 py-2.5 rounded-lg font-bold text-base transition-colors" :class="activeTab === 'career' ? 'bg-purple-600 text-white' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'">커리어 시뮬레이터</button>
      </div>
    </div>

    <!-- ==============================================
         [1] 강화 탭
         ============================================== -->
    <div v-show="activeTab === 'enhance'" class="flex flex-col">
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- 왼쪽 패널 -->
        <section class="flex flex-col gap-6">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col items-center shrink-0 relative">
            <RefreshCw @click="resetEnhanceSim" class="absolute top-4 right-4 w-5 h-5 cursor-pointer text-neutral-400 hover:text-blue-500" />
            
            <!-- 🌟 유저 요청: 시작 단계 설정 기능 추가 -->
            <div class="flex flex-col items-center mb-2 bg-neutral-50 dark:bg-neutral-800 px-4 py-2 rounded-lg">
              <label class="text-xs font-bold text-neutral-500 mb-1">시작 강화 단계 강제 세팅</label>
              <select v-model="currentLevel" @change="failStack=0; totalCardsUsed=0;" class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md px-4 py-1 text-sm font-bold outline-none text-center">
                <option v-for="n in (MAX_LEVEL+1)" :key="n-1" :value="n-1">+{{n-1}}부터 시작</option>
              </select>
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
        
        <!-- 오른쪽 표 -->
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
                    <td class="py-3 font-medium text-neutral-700 dark:text-neutral-300">+{{idx}}➔+{{idx+1}}</td>
                    <td>{{(prob*100).toFixed(1)}}%</td>
                    <td>{{expectedValues[idx].toFixed(1)}}</td>
                    <td class="font-extrabold text-blue-600">{{(1 + expectedValues.slice(0, idx + 1).reduce((a, b) => a + b, 0)).toFixed(1)}}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>


    <!-- ==============================================
         [2] 커리어 탭
         ============================================== -->
    <div v-show="activeTab === 'career'" class="flex flex-col">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- 왼쪽 패널 -->
        <section class="lg:col-span-4 flex flex-col gap-6">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
            <select v-model="selectedCardIdx" class="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 font-bold text-base mb-4 outline-none"><option v-for="(type, idx) in CARD_TYPES" :key="type.id" :value="idx">{{ type.name }}</option></select>
            <div class="text-sm text-neutral-500 bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl flex flex-col gap-1 mb-4">
              <div class="flex justify-between"><span>기본 1칸:</span><strong class="text-blue-600">{{ formatNum(selectedCard.baseAP[3]) }}</strong></div>
              <div class="flex justify-between" v-if="selectedCard.lockAP[4] > 0"><span>4칸 잠금 페널티:</span><strong class="text-red-500">{{ formatNum(selectedCard.lockAP[4]) }}</strong></div>
            </div>

            <!-- 🌟 유저 요청: 시작 등급 세팅 기능 추가 -->
            <div class="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
              <label class="text-xs font-bold text-neutral-500 mb-2 block">잠금 해제된 슬롯 시작 등급 강제 세팅</label>
              <div class="flex gap-2">
                <select v-model="globalSetTier" class="flex-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg px-2 text-sm font-bold outline-none">
                  <option v-for="(t, i) in TIERS" :key="i" :value="i">{{t}}</option>
                </select>
                <button @click="applyGlobalTier" class="px-4 py-2 bg-neutral-800 text-white rounded-lg text-sm font-bold hover:bg-black transition-colors">일괄 적용</button>
              </div>
            </div>
          </div>
          
          <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-6 text-white shadow-xl h-fit shrink-0">
            <div class="flex justify-between items-center mb-6"><span class="font-extrabold text-lg flex items-center gap-2"><Calculator class="w-5 h-5 text-green-400"/> 파산 영수증</span><RefreshCw @click="resetCareerSim" class="w-4 h-4 text-neutral-400 hover:text-white cursor-pointer transition-colors"/></div>
            <div class="space-y-4">
              <div><div class="text-neutral-400 text-xs mb-1">총 AP 소모</div><div class="text-3xl font-black text-yellow-400 tracking-tight">{{ formatNum(totalApSpent) }}</div></div>
              <div class="flex justify-between items-end pt-4 border-t border-neutral-700">
                <div><div class="text-neutral-400 text-xs mb-1">CASH 소모</div><div class="text-xl font-bold text-purple-400">{{ formatNum(totalCashSpent) }} 💎</div></div>
                <div class="text-right"><div class="text-neutral-400 text-xs mb-1">캐시 갱신</div><div class="text-lg font-bold">{{ formatNum(specialSpinCount) }}회</div></div>
              </div>
            </div>
          </div>
        </section>

        <!-- 오른쪽 패널 -->
        <section class="lg:col-span-8 flex flex-col gap-4">
          
          <!-- 🌟 유저 요청: 세트 효과 보너스 수치까지 자세하게 표기 -->
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 flex items-center gap-3 shrink-0 overflow-x-auto min-h-[60px]">
            <span class="text-sm font-bold text-blue-700 dark:text-blue-400 shrink-0">적용된 세트:</span>
            <div v-for="(ef, i) in setEffects" :key="i" class="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap shadow-sm flex items-center gap-2">
              {{ ef.name }} {{ ef.count }}셋 <span class="bg-blue-800 text-yellow-300 px-2 py-0.5 rounded-full text-xs border border-blue-500">{{ ef.bonusStr }}</span>
            </div>
            <div v-if="setEffects.length === 0" class="text-sm text-neutral-400">적용된 세트 효과가 없습니다. (3개 이상 시 발동)</div>
          </div>

          <!-- 슬롯 영역 -->
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm flex-1 flex flex-col">
            <div class="space-y-3 flex-1 overflow-y-auto mb-4">
              <!-- 스페셜 고정 슬롯 -->
              <div class="p-3.5 bg-red-50 dark:bg-red-900/10 rounded-xl border-2 border-red-200 dark:border-red-800/30 flex items-center justify-between gap-3">
                <div class="bg-red-500 text-white font-extrabold px-3 py-1 rounded text-sm shrink-0">고정</div>
                <div class="flex-1 font-extrabold text-base sm:text-lg truncate text-neutral-800 dark:text-neutral-200 flex items-center justify-between pr-4">
                  <span>{{ OPTIONS[specialSlot.optId].name }}</span>
                  <span class="text-red-500">+{{ specialSlot.statVal }}</span>
                </div>
                <button @click="spinSpecialSlot" class="px-4 py-2 bg-red-600 hover:bg-red-700 transition-colors text-white text-sm font-bold rounded-lg shadow-sm shrink-0">캐시갱신</button>
              </div>
              
              <!-- 🌟 유저 요청: 각 옵션 우측에 상세 능력치(+12 등) 완벽 표기 -->
              <div v-for="slot in slots" :key="slot.id" class="flex items-center gap-3 p-3 rounded-xl border transition-all" :class="slot.isLocked ? 'bg-neutral-100 dark:bg-neutral-800 opacity-60 border-neutral-300 dark:border-neutral-700' : 'bg-white dark:bg-neutral-900 border-purple-200 dark:border-purple-800/50'">
                <div :class="[TIER_BG[slot.tier], TIER_COLORS[slot.tier]]" class="w-16 text-center py-1.5 rounded-lg font-extrabold text-sm shadow-sm shrink-0">{{ TIERS[slot.tier] }}</div>
                <div class="flex-1 font-bold text-base sm:text-lg truncate text-neutral-800 dark:text-neutral-200 flex justify-between items-center pr-4" :class="{'text-red-500 dark:text-red-400': slot.tier === 3}">
                  <span>{{ OPTIONS[slot.optId].name }}</span>
                  <span :class="slot.tier === 3 ? 'text-red-500' : slot.tier === 2 ? 'text-purple-500' : slot.tier === 1 ? 'text-blue-500' : 'text-green-500'">+{{ slot.statVal }}</span>
                </div>
                <button @click="toggleLock(slot.id)" class="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-black dark:hover:text-white transition-colors shrink-0">
                  <Lock v-if="slot.isLocked" class="w-5 h-5 text-yellow-500" /><Unlock v-else class="w-5 h-5" />
                </button>
              </div>
            </div>

            <!-- 하단 돌리기 버튼 -->
            <div class="flex gap-3 shrink-0 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button @click="rollSlots" :disabled="isSpinning" class="w-1/2 py-3 bg-purple-600 hover:bg-purple-700 transition-colors text-white rounded-xl active:scale-95 flex flex-col items-center justify-center disabled:opacity-50 shadow-md">
                <span class="text-base font-extrabold flex items-center gap-1.5"><Zap class="w-5 h-5"/> 수동 변경 (1회)</span>
                <span class="text-xs font-medium text-purple-200">{{ formatNum(currentRollCostAP) }} AP 소모</span>
              </button>
              
              <button v-if="!isSpinning" @click="isAutoModalOpen = true" class="w-1/2 py-3 bg-neutral-800 hover:bg-black dark:bg-neutral-700 dark:hover:bg-neutral-600 transition-colors text-white font-extrabold rounded-xl flex items-center justify-center gap-2 text-base shadow-md">
                <Settings class="w-5 h-5"/> 자동 설정
              </button>
              <button v-else @click="stopAutoSpin" class="w-1/2 py-3 bg-red-500 hover:bg-red-600 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 text-base shadow-md animate-pulse">
                <Pause class="w-5 h-5"/> 정지 (가챠중)
              </button>
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
                  <input type="checkbox" @change="toggleAllOpts(setTargetOpts, 3)" :checked="setTargetOpts.length === OPTIONS.length" class="accent-cyan-500">전체 선택
                </label>
              </div>
              <div class="space-y-1">
                <label v-for="opt in OPTIONS" :key="opt.id" class="flex items-center gap-2 p-2 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer border-b border-neutral-100 dark:border-neutral-800">
                  <input type="checkbox" :checked="setTargetOpts.includes(opt.id)" @change="toggleOpt(setTargetOpts, opt.id)" class="w-4 h-4 accent-cyan-500">
                  <span class="text-sm font-semibold">{{ opt.name }}</span>
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
                <input type="checkbox" @change="toggleAllOpts(optTargetOpts, autoTab === 'OPT_MASTER' ? 3 : 0)" :checked="optTargetOpts.length === (autoTab === 'OPT_MASTER' ? OPTIONS.length : OPTIONS.length - 1)" class="accent-cyan-500">전체 선택
              </label>
            </div>
            <label v-for="opt in OPTIONS" :key="opt.id" class="flex items-center gap-3 p-2 border-b border-neutral-100 dark:border-neutral-800 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors" :class="{'opacity-40 pointer-events-none': autoTab !== 'OPT_MASTER' && opt.id === 11}">
              <input type="checkbox" :checked="optTargetOpts.includes(opt.id)" @change="toggleOpt(optTargetOpts, opt.id)" class="w-4 h-4 accent-cyan-500">
              <span class="text-sm font-bold">{{ opt.name }}</span>
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
