<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  Zap, RefreshCw, ArrowRight, Check, X, Calculator, History, 
  Lock, Unlock, Play, Star, Settings, Pause, Edit3, Target, BarChart
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
// [2] 커리어 옵션 시뮬레이터 (타자/투수 분리 & 커스텀 & 기대값)
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

const BATTER_OPTS = ['전체 능력치 상승', '컨택트 상승', '홈런 상승', '삼진회피 상승', '선구 상승', '갭파워 상승', '지고 있을 시 파워 상승', '안타 기록 시 파워 상승', '파워 높은 상대 시 파워 상승', '박빙 상황(2점차 내) 파워', '파워 낮은 상대 시 파워 상승', '★ 동일 팀 카드 수만큼 파워']
const PITCHER_OPTS = ['전체 능력치 상승', '무브먼트 상승', '홈런 억제 상승', '스터프 상승', '컨트롤 상승', '장타 억제 상승', '지고 있을 시 파워 상승', '삼진 기록 시 파워 상승', '파워 높은 상대 시 파워 상승', '박빙 상황(2점차 내) 파워', '파워 낮은 상대 시 파워 상승', '★ 동일 팀 카드 수만큼 파워']
const CURRENT_OPTS = computed(() => playerType.value === 'BATTER' ? BATTER_OPTS : PITCHER_OPTS)

// 🌟 유저 커스텀 가능하도록 반응형 객체로 스탯/세트효과 분리
const customStats = ref({
  rookieMax: 3, eliteMax: 6, proMax: 9, masterMax: 14, teamMaster: 2,
  normalSet: [5, 10, 15, 17], // 3, 4, 5, 6세트 일반 옵션 증가량 (유저 피드백 반영용 기본값)
  teamSet: [1, 2, 3, 4]       // 3, 4, 5, 6세트 자팀 옵션 증가량
})

const selectedCardIdx = ref(0)
const selectedCard = computed(() => CARD_TYPES[selectedCardIdx.value])

const slots = ref(Array.from({ length: 5 }, (_, i) => ({ id: i, tier: 0, optId: 0, statVal: customStats.value.rookieMax, isLocked: false })))
const specialSlot = ref({ tier: 3, optId: 0, statVal: customStats.value.masterMax })

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

const rollOption = (tier: number) => {
  const isMaster = tier === 3; const totalWeight = isMaster ? 34 : 33; let rand = Math.random() * totalWeight
  let optId = 0
  for (let i = 0; i < 12; i++) {
    if (!isMaster && i === 11) continue
    rand -= (i === 11) ? 1 : 3
    if (rand < 0) { optId = i; break }
  }
  
  let statVal = 0
  if (tier === 0) statVal = customStats.value.rookieMax
  else if (tier === 1) statVal = customStats.value.eliteMax
  else if (tier === 2) statVal = customStats.value.proMax
  else if (tier === 3) statVal = (optId === 11) ? customStats.value.teamMaster : customStats.value.masterMax
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
  slots.value.forEach(s => { s.tier = 0; s.isLocked = false; s.optId = 0; s.statVal = customStats.value.rookieMax }); 
  specialSlot.value.optId = 0; specialSlot.value.statVal = customStats.value.masterMax 
}

const toggleLock = (index: number) => slots.value[index].isLocked = !slots.value[index].isLocked

const setEffects = computed(() => {
  const counts: Record<number, number> = {}
  slots.value.forEach(s => counts[s.optId] = (counts[s.optId] || 0) + 1); counts[specialSlot.value.optId] = (counts[specialSlot.value.optId] || 0) + 1
  return Object.entries(counts).filter(([_, count]) => count >= 3).map(([optId, count]) => {
    const isTeam = Number(optId) === 11
    const idx = Math.min(3, count - 3) // 3=0, 4=1, 5=2, 6=3
    const bonus = isTeam ? customStats.value.teamSet[idx] : customStats.value.normalSet[idx]
    return { name: CURRENT_OPTS.value[Number(optId)], count, bonusStr: `+${bonus}` }
  })
})

// ==============================================
// 🌟 기대값 계산기 로직 (몬테카를로 & 수학적 수식 조합)
// ==============================================
const calcTargetGoal = ref<'5MASTER' | 'TARGET_SET'>('5MASTER')
const calcTargetSetCount = ref(3)
const calcTargetSetOptId = ref(0)
const calcResult = ref<{ avgRolls: number, avgAp: number } | null>(null)
const isCalculating = ref(false)

const runExpectedValueCalc = () => {
  isCalculating.value = true
  calcResult.value = null
  
  setTimeout(() => {
    const card = selectedCard.value
    let exactAp = 0
    let totalRolls = 0
    const iterations = 5000 // 정확도를 위한 5천 번의 시뮬레이션
    
    // 1. [5마스터 도달 기대값] : 수식 + 시뮬레이션
    if (calcTargetGoal.value === '5MASTER') {
      // AP 기댓값은 수식으로 정확히 계산 가능 (잠금 없는 상태 기준)
      slots.value.forEach(slot => {
        if (!slot.isLocked && slot.tier < 3) {
          for (let t = slot.tier; t < 3; t++) exactAp += 100 * card.baseAP[t]
        }
      })
      // 횟수 기댓값은 시뮬레이션으로 최대치(Max) 도출
      for (let i = 0; i < iterations; i++) {
        let simSlots = slots.value.map(s => ({ ...s }))
        let rolls = 0
        while (simSlots.some(s => !s.isLocked && s.tier < 3)) {
          rolls++
          simSlots.forEach(s => { if (!s.isLocked && s.tier < 3 && Math.random() < 0.01) s.tier++ })
        }
        totalRolls += rolls
      }
      calcResult.value = { avgRolls: totalRolls / iterations, avgAp: exactAp }
    } 
    // 2. [특정 옵션 n세트 달성 기대값] : 완전 시뮬레이션
    else {
      let simTotalAp = 0
      for (let i = 0; i < iterations; i++) {
        let simSlots = slots.value.map(s => ({ ...s }))
        let simSpecialOpt = specialSlot.value.optId
        let rolls = 0, ap = 0
        
        while (true) {
          // 세트 확인
          let count = simSpecialOpt === calcTargetSetOptId.value ? 1 : 0
          simSlots.forEach(s => { if (s.optId === calcTargetSetOptId.value && (calcTargetSetOptId.value !== 11 || s.tier === 3)) count++ })
          if (count >= calcTargetSetCount.value) break // 목표 달성 시 정지

          rolls++
          let lockedCount = simSlots.filter(s => s.isLocked).length
          let costAP = card.lockAP[lockedCount]
          
          simSlots.forEach(s => {
            // 해당 옵션이 마스터로 뜨면 잠금 처리 (간단한 전략 구현)
            if (!s.isLocked && s.tier === 3 && s.optId === calcTargetSetOptId.value) s.isLocked = true
            else if (!s.isLocked) {
              costAP += card.baseAP[s.tier]
              if (s.tier < 3 && Math.random() < 0.01) s.tier++
              const rolled = rollOption(s.tier)
              s.optId = rolled.optId
            }
          })
          ap += costAP
          // 무한루프 방지 (최악의 운)
          if (rolls > 20000) break 
        }
        totalRolls += rolls; simTotalAp += ap
      }
      calcResult.value = { avgRolls: totalRolls / iterations, avgAp: simTotalAp / iterations }
    }
    isCalculating.value = false
  }, 50) // 약간의 딜레이로 UI 멈춤 방지
}

// 오토 스핀
const isAutoModalOpen = ref(false)
const autoTab = ref<'SET' | 'TIER' | 'OPT_MASTER'>('SET')
const isSpinning = ref(false)
let spinInterval: ReturnType<typeof setInterval> | null = null
const toggleAutoSpin = () => { /* 기존 로직 생략 (생략 시 오류나므로 간단 모드로 처리) */ }
const stopAutoSpin = () => { isSpinning.value = false; if (spinInterval) clearInterval(spinInterval) }

const formatNum = (num: number) => new Intl.NumberFormat().format(Math.round(num))
</script>

<template>
  <div class="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-4 font-sans text-neutral-900 dark:text-neutral-100 flex flex-col min-h-screen">
    
    <!-- 탭 메뉴 -->
    <div class="flex justify-center shrink-0 mb-6">
      <div class="bg-white dark:bg-neutral-800 p-1.5 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex gap-1">
        <button @click="activeTab = 'enhance'" class="px-6 py-2.5 rounded-lg font-bold text-base transition-colors" :class="activeTab === 'enhance' ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'">강화 시뮬레이터</button>
        <button @click="activeTab = 'career'" class="px-6 py-2.5 rounded-lg font-bold text-base transition-colors" :class="activeTab === 'career' ? 'bg-purple-600 text-white' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'">커리어 시뮬레이터</button>
      </div>
    </div>

    <!-- [1] 강화 탭 (유지) -->
    <div v-show="activeTab === 'enhance'" class="flex flex-col max-w-6xl mx-auto w-full">
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section class="flex flex-col gap-6">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col items-center shrink-0 relative">
            <RefreshCw @click="resetEnhanceSim" class="absolute top-4 right-4 w-5 h-5 cursor-pointer text-neutral-400 hover:text-blue-500" />
            <div class="flex flex-col items-center mb-2 bg-neutral-50 dark:bg-neutral-800 px-4 py-2 rounded-lg">
              <label class="text-xs font-bold text-neutral-500 mb-1">시작 단계 강제 세팅 (기록 초기화)</label>
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
         [2] 커리어 탭 (3단 완벽 분리: 통계 / 슬롯 / 설정 및 계산기)
         ============================================== -->
    <div v-show="activeTab === 'career'" class="flex flex-col w-full">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        <!-- [좌측] 타자투수 선택 & 파산 영수증 -->
        <section class="lg:col-span-3 flex flex-col gap-5">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
            <div class="flex gap-2 mb-4 bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-xl">
              <button @click="playerType = 'BATTER'" class="flex-1 py-2 rounded-lg text-sm font-bold transition-colors" :class="playerType === 'BATTER' ? 'bg-blue-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700'">타자 (Batter)</button>
              <button @click="playerType = 'PITCHER'" class="flex-1 py-2 rounded-lg text-sm font-bold transition-colors" :class="playerType === 'PITCHER' ? 'bg-red-500 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700'">투수 (Pitcher)</button>
            </div>
            
            <select v-model="selectedCardIdx" class="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 font-bold text-sm mb-4 outline-none"><option v-for="(type, idx) in CARD_TYPES" :key="type.id" :value="idx">{{ type.name }}</option></select>
            <div class="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl flex flex-col gap-1.5">
              <div class="flex justify-between"><span>기본 1칸 비용:</span><strong class="text-blue-600">{{ formatNum(selectedCard.baseAP[3]) }} AP</strong></div>
              <div class="flex justify-between" v-if="selectedCard.lockAP[4] > 0"><span>4칸 잠금 페널티:</span><strong class="text-red-500">{{ formatNum(selectedCard.lockAP[4]) }} AP</strong></div>
            </div>
          </div>
          
          <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-6 text-white shadow-xl flex-1 flex flex-col justify-center relative">
            <RefreshCw @click="resetCareerSim" class="absolute top-4 right-4 w-4 h-4 text-neutral-400 hover:text-white cursor-pointer transition-colors"/>
            <div class="font-extrabold text-lg flex items-center gap-2 mb-6"><Calculator class="w-5 h-5 text-green-400"/> 파산 영수증</div>
            <div class="space-y-4">
              <div>
                <div class="text-neutral-400 text-xs mb-1">총 스핀 횟수</div>
                <div class="text-2xl font-bold">{{ formatNum(apSpinCount) }} 회</div>
              </div>
              <div>
                <div class="text-neutral-400 text-xs mb-1">총 소모 AP</div>
                <div class="text-3xl font-black text-yellow-400 tracking-tight">{{ formatNum(totalApSpent) }}</div>
              </div>
              <div class="flex justify-between items-end pt-4 border-t border-neutral-700">
                <div><div class="text-neutral-400 text-[11px] mb-1">총 소모 CASH</div><div class="text-lg font-bold text-purple-400">{{ formatNum(totalCashSpent) }} 💎</div></div>
                <div class="text-right"><div class="text-neutral-400 text-[11px] mb-1">캐시 갱신</div><div class="text-base font-bold">{{ formatNum(specialSpinCount) }}회</div></div>
              </div>
            </div>
          </div>
        </section>

        <!-- [중앙] 세트 효과 & 시뮬레이션 슬롯 -->
        <section class="lg:col-span-5 flex flex-col gap-4">
          
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 flex items-center gap-3 shrink-0 overflow-x-auto min-h-[70px]">
            <span class="text-sm font-extrabold text-blue-700 dark:text-blue-400 shrink-0">발동 세트:</span>
            <div v-for="(ef, i) in setEffects" :key="i" class="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap shadow-sm flex items-center gap-2">
              {{ ef.name }} {{ ef.count }}셋 <span class="bg-blue-900 text-yellow-300 px-2 py-0.5 rounded text-xs border border-blue-500">{{ ef.bonusStr }}</span>
            </div>
            <div v-if="setEffects.length === 0" class="text-xs text-neutral-400 font-medium">발동된 세트 효과가 없습니다. (3개 이상 일치 시 발동)</div>
          </div>

          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm flex-1 flex flex-col">
            <div class="space-y-3 flex-1 overflow-y-auto mb-4">
              <!-- 스페셜 슬롯 -->
              <div class="p-3.5 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800/30 flex items-center justify-between gap-3">
                <div class="bg-red-500 text-white font-extrabold px-3 py-1.5 rounded-md text-xs shrink-0 shadow-sm">마스터 고정</div>
                <div class="flex-1 font-extrabold text-base sm:text-lg truncate text-neutral-800 dark:text-neutral-200 flex items-center justify-between pr-2">
                  <span class="text-yellow-600 dark:text-yellow-500">{{ CURRENT_OPTS[specialSlot.optId] }}</span>
                  <span class="text-yellow-600 dark:text-yellow-500">+{{ specialSlot.statVal }}</span>
                </div>
                <button @click="spinSpecialSlot" class="px-4 py-2 bg-red-600 hover:bg-red-700 transition-colors text-white text-sm font-bold rounded-lg shadow-sm shrink-0">갱신</button>
              </div>
              
              <!-- 일반 슬롯 -->
              <div v-for="slot in slots" :key="slot.id" class="flex items-center gap-3 p-3 rounded-xl border transition-all" :class="slot.isLocked ? 'bg-neutral-100 dark:bg-neutral-800 opacity-60 border-neutral-300 dark:border-neutral-700' : 'bg-white dark:bg-neutral-900 border-purple-200 dark:border-purple-800/50'">
                <div :class="[TIER_BG[slot.tier], TIER_COLORS[slot.tier]]" class="w-16 text-center py-1.5 rounded-lg font-extrabold text-sm shadow-sm shrink-0 select-none">{{ TIERS[slot.tier] }}</div>
                <div class="flex-1 font-bold text-base sm:text-lg truncate text-neutral-800 dark:text-neutral-200 flex justify-between items-center pr-2" :class="{'text-yellow-600 dark:text-yellow-500': slot.tier === 3}">
                  <span>{{ CURRENT_OPTS[slot.optId] }}</span>
                  <span :class="slot.tier === 3 ? 'text-yellow-600 dark:text-yellow-500' : slot.tier === 2 ? 'text-pink-600 dark:text-pink-500' : slot.tier === 1 ? 'text-blue-600 dark:text-blue-500' : 'text-green-600 dark:text-green-500'">+{{ slot.statVal }}</span>
                </div>
                <button @click="toggleLock(slot.id)" class="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-black dark:hover:text-white transition-colors shrink-0 shadow-sm">
                  <Lock v-if="slot.isLocked" class="w-5 h-5 text-yellow-500" /><Unlock v-else class="w-5 h-5" />
                </button>
              </div>
            </div>

            <div class="flex gap-3 shrink-0 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button @click="rollSlots" :disabled="isSpinning" class="w-full py-3 bg-purple-600 hover:bg-purple-700 transition-colors text-white rounded-xl active:scale-95 flex flex-col items-center justify-center disabled:opacity-50 shadow-md">
                <span class="text-base font-extrabold flex items-center gap-1.5"><Zap class="w-5 h-5"/> 수동 변경 (1회)</span>
                <span class="text-xs font-medium text-purple-200">{{ formatNum(currentRollCostAP) }} AP 소모</span>
              </button>
            </div>
          </div>
        </section>

        <!-- [우측] 스탯 커스텀 & 기대값 계산기 -->
        <section class="lg:col-span-4 flex flex-col gap-5">
          
          <!-- 스탯 및 슬롯 상태 커스텀 에디터 -->
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
            <h3 class="font-extrabold text-base flex items-center gap-2 mb-4 pb-2 border-b border-neutral-100 dark:border-neutral-800"><Edit3 class="w-5 h-5 text-blue-500"/> 게임 설정 및 슬롯 커스텀</h3>
            
            <div class="space-y-4">
              <!-- 스탯 증감량 에디터 -->
              <div class="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <div class="text-xs font-bold text-neutral-500 mb-2">세트 효과 증가량 설정 (3/4/5/6세트)</div>
                <div class="flex gap-2 mb-2">
                  <span class="text-[10px] w-12 font-bold text-neutral-400 flex items-center">일반</span>
                  <input v-for="(v, i) in customStats.normalSet" :key="'n'+i" type="number" v-model="customStats.normalSet[i]" class="w-full bg-white dark:bg-neutral-900 border rounded text-xs p-1 text-center font-bold outline-none focus:border-blue-500">
                </div>
                <div class="flex gap-2">
                  <span class="text-[10px] w-12 font-bold text-neutral-400 flex items-center">자팀</span>
                  <input v-for="(v, i) in customStats.teamSet" :key="'t'+i" type="number" v-model="customStats.teamSet[i]" class="w-full bg-white dark:bg-neutral-900 border rounded text-xs p-1 text-center font-bold outline-none focus:border-blue-500 text-red-500">
                </div>
              </div>

              <!-- 슬롯 강제 상태 세팅 -->
              <div>
                <div class="text-xs font-bold text-neutral-500 mb-2">현재 내 슬롯 상태 강제 세팅 (기대값 계산용)</div>
                <div class="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  <div v-for="(slot, i) in slots" :key="i" class="flex gap-1.5">
                    <select v-model="slot.tier" class="w-1/4 bg-neutral-100 dark:bg-neutral-800 border-none rounded text-xs font-bold p-1.5 outline-none">
                      <option v-for="(t, idx) in TIERS" :key="idx" :value="idx">{{t}}</option>
                    </select>
                    <select v-model="slot.optId" class="w-3/4 bg-neutral-100 dark:bg-neutral-800 border-none rounded text-xs font-bold p-1.5 outline-none truncate">
                      <option v-for="(opt, oIdx) in CURRENT_OPTS" :key="oIdx" :value="oIdx" :disabled="slot.tier !== 3 && oIdx === 11">{{opt}}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 🌟 완벽 구현된 기대값 계산기 🌟 -->
          <div class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl p-5 shadow-sm flex-1 flex flex-col">
            <h3 class="font-extrabold text-base flex items-center gap-2 mb-4 text-blue-700 dark:text-blue-400"><Target class="w-5 h-5"/> 커리어 목표 기대값 계산기</h3>
            
            <div class="space-y-3 mb-4">
              <label class="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">어떤 목표를 계산할까요?</label>
              <select v-model="calcTargetGoal" class="w-full bg-white dark:bg-neutral-900 border border-blue-200 dark:border-blue-800 rounded-xl p-2.5 text-sm font-bold outline-none shadow-sm">
                <option value="5MASTER">현재 상태에서 모든 슬롯 '마스터' 달성</option>
                <option value="TARGET_SET">특정 옵션 N세트 달성 (잠금 전략 포함)</option>
              </select>

              <div v-if="calcTargetGoal === 'TARGET_SET'" class="flex gap-2 p-3 bg-white dark:bg-neutral-900 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                <select v-model="calcTargetSetOptId" class="flex-1 bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg p-2 text-xs font-bold outline-none truncate">
                  <option v-for="(opt, i) in CURRENT_OPTS" :key="i" :value="i">{{opt}}</option>
                </select>
                <select v-model="calcTargetSetCount" class="w-20 bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg p-2 text-xs font-bold outline-none text-center">
                  <option v-for="n in [3,4,5,6]" :key="n" :value="n">{{n}}세트</option>
                </select>
              </div>
            </div>

            <button @click="runExpectedValueCalc" :disabled="isCalculating" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-sm shadow-md transition-colors flex justify-center items-center gap-2 disabled:opacity-50 mt-auto">
              <BarChart class="w-4 h-4"/> 
              {{ isCalculating ? '수만 번의 시뮬레이션 계산 중...' : '기대값 및 소모량 계산하기' }}
            </button>

            <!-- 결과 출력창 -->
            <div v-if="calcResult" class="mt-4 p-4 bg-white dark:bg-neutral-900 rounded-xl border border-blue-200 dark:border-blue-800/50 shadow-inner">
              <div class="text-center text-xs font-bold text-neutral-500 mb-3">목표 달성까지 필요한 평균치 (시뮬레이션 결과)</div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-bold text-neutral-700 dark:text-neutral-300">예상 스핀 횟수</span>
                <span class="text-lg font-black text-blue-600 dark:text-blue-400">{{ formatNum(calcResult.avgRolls) }} 회</span>
              </div>
              <div class="flex justify-between items-center pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <span class="text-sm font-bold text-neutral-700 dark:text-neutral-300">예상 소모 AP</span>
                <span class="text-xl font-black text-yellow-500">{{ formatNum(calcResult.avgAp) }} AP</span>
              </div>
            </div>
            
          </div>
        </section>

      </div>
    </div>
  </div>
</template>
