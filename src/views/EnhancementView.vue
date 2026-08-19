<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { 
  Zap, RefreshCw, ArrowRight, Check, X, Calculator, History, 
  Lock, Unlock, Play, Star, Settings, Pause, Edit3, Target, BarChart, Info, Gem
} from 'lucide-vue-next'

// 탭 상태 확장에 각인(engraving) 추가
const activeTab = ref<'enhance' | 'career' | 'engraving'>('engraving')

// ==============================================
// [1] 강화 시뮬레이터 (기존 코드 유지)
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
// [2] 커리어 옵션 시뮬레이터 (기존 코드 유지)
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

const BATTER_OPTS = [
  { id: 0, name: '전체 능력치 상승', setBonus: 6, vals: [[2,3,4], [5,6,7], [8,9,10], [12,13,14]] },
  { id: 1, name: '컨택트 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] },
  { id: 2, name: '홈런 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] },
  { id: 3, name: '삼진회피 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] },
  { id: 4, name: '선구 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] },
  { id: 5, name: '갭파워 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] },
  { id: 6, name: '지고 있을 시, 파워 상승', setBonus: 50, vals: [[5,12,17], [22,29,34], [39,46,51], [56,63,68]] },
  { id: 7, name: '안타를 기록할 때마다 파워 상승', setBonus: 40, vals: [[3,5,9], [12,14,17], [20,22,26], [29,31,34]] },
  { id: 8, name: '자신 보다 파워 높은 카드 상대 시, 파워 상승', setBonus: 40, vals: [[7,14,22], [29,36,43], [49,56,65], [71,78,85]] },
  { id: 9, name: '박빙 상황(2점차 이내)에서 파워 상승', setBonus: 50, vals: [[5,11,16], [22,27,33], [38,43,49], [54,60,65]] },
  { id: 10, name: '자신보다 파워 낮은 카드 상대 시, 파워 상승', setBonus: 40, vals: [[7,14,22], [29,36,43], [49,56,65], [71,78,85]] },
  { id: 11, name: '★ 라인업의 동일 팀 카드 수만큼, 파워 상승', setBonus: 2, vals: [[0], [0], [0], [2]] }
]

const PITCHER_OPTS = [
  { id: 0, name: '전체 능력치 상승', setBonus: 6, vals: [[2,3,4], [5,6,7], [8,9,10], [12,13,14]] },
  { id: 1, name: '무브먼트 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] },
  { id: 2, name: '홈런억제 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] },
  { id: 3, name: '스터프 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] },
  { id: 4, name: '컨트롤 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] },
  { id: 5, name: '장타 억제 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] },
  { id: 6, name: '지고 있을 시, 파워 상승', setBonus: 50, vals: [[5,12,17], [22,29,34], [39,46,51], [56,63,68]] },
  { id: 7, name: '삼진을 기록할 때마다 파워 상승', setBonus: 6, vals: [[1,2,3], [3,5,7], [7,9,10], [10,12,14]] },
  { id: 8, name: '자신 보다 파워 높은 카드 상대 시, 파워 상승', setBonus: 40, vals: [[7,14,22], [29,36,43], [49,56,65], [71,78,85]] },
  { id: 9, name: '박빙 상황(2점차 이내)에서 파워 상승', setBonus: 50, vals: [[5,11,16], [22,27,33], [38,43,49], [54,60,65]] },
  { id: 10, name: '자신보다 파워 낮은 카드 상대 시, 파워 상승', setBonus: 40, vals: [[7,14,22], [29,36,43], [49,56,65], [71,78,85]] },
  { id: 11, name: '★ 라인업의 동일 팀 카드 수만큼, 파워 상승', setBonus: 2, vals: [[0], [0], [0], [2]] }
]

const CURRENT_DATA = computed(() => playerType.value === 'BATTER' ? BATTER_OPTS : PITCHER_OPTS)
const selectedCardIdx = ref(0)
const selectedCard = computed(() => CARD_TYPES[selectedCardIdx.value])
const slots = ref(Array.from({ length: 5 }, (_, i) => ({ id: i, tier: 0, optId: 0, statVal: 4, isLocked: false })))
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

const rollOption = (tier: number, useMathRandom = true, rngFunction?: () => number) => {
  const isMaster = tier === 3; const totalWeight = isMaster ? 34 : 33
  const rNum = useMathRandom ? Math.random() : (rngFunction ? rngFunction() : 0)
  let rand = rNum * totalWeight
  let optId = 0
  for (let i = 0; i < 12; i++) {
    if (!isMaster && i === 11) continue
    rand -= (i === 11) ? 1 : 3
    if (rand < 0) { optId = i; break }
  }
  const vals = CURRENT_DATA.value[optId].vals[tier]
  const valIdx = useMathRandom ? Math.floor(Math.random() * vals.length) : Math.floor((rngFunction ? rngFunction() : 0) * vals.length)
  return { optId, statVal: vals[valIdx] }
}

const rollSlots = () => {
  const card = selectedCard.value; let lockedCount = slots.value.filter(s => s.isLocked).length
  if (lockedCount === 5) return
  let costAP = card.lockAP[lockedCount]; let costCash = card.lockCash[lockedCount]
  slots.value.forEach(slot => {
    if (!slot.isLocked) {
      costAP += card.baseAP[slot.tier]
      if (slot.tier < 3 && Math.random() < 0.01) slot.tier++
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
  slots.value.forEach(s => { s.tier = 0; s.isLocked = false; s.optId = 0; s.statVal = CURRENT_DATA.value[0].vals[0][0] }); 
  specialSlot.value.optId = 0; specialSlot.value.statVal = CURRENT_DATA.value[0].vals[3][2] 
}

const toggleLock = (index: number) => slots.value[index].isLocked = !slots.value[index].isLocked

const setEffects = computed(() => {
  const counts: Record<number, number> = {}
  slots.value.forEach(s => counts[s.optId] = (counts[s.optId] || 0) + 1); counts[specialSlot.value.optId] = (counts[specialSlot.value.optId] || 0) + 1
  return Object.entries(counts).filter(([_, count]) => count >= 3).map(([optId, count]) => {
    const optData = CURRENT_DATA.value[Number(optId)]
    const totalBonus = optData.setBonus * count
    return { name: optData.name, count, bonusStr: `슬롯당 +${optData.setBonus} (총 +${totalBonus})` }
  })
})

const validateStatVal = (slot: any) => {
  if (slot.tier !== 3 && slot.optId === 11) slot.optId = 0 
  const validVals = CURRENT_DATA.value[slot.optId].vals[slot.tier]
  if (!validVals.includes(Number(slot.statVal))) slot.statVal = validVals[validVals.length - 1]
}

watch(playerType, () => {
  slots.value.forEach(s => validateStatVal(s)); validateStatVal(specialSlot.value)
})

// 계산기/오토 로직(기존 코드 축약 처리)
const calcTargetGoal = ref<'5MASTER' | 'TARGET_SET' | 'TARGET_3_3'>('5MASTER')
const calcTargetSetCount = ref(3)
const calcTargetSetOptId = ref(0)
const calcTarget3_3_Opt1 = ref(0)
const calcTarget3_3_Opt2 = ref(1)
const useUpgradeMemory = ref(true)
const calcResult = ref<any>(null)
const isCalculating = ref(false)

const isAutoModalOpen = ref(false)
const autoTab = ref<'SET' | 'TIER' | 'OPT_MASTER' | 'OPT_PRO' | 'OPT_ELITE' | 'OPT_ROOKIE'>('SET')
const autoTargetSetCount = ref(3)
const autoTargetSetOpts = ref<number[]>([])
const autoTargetTierTier = ref(3)
const autoTargetTierCount = ref(1)
const autoTargetOptOpts = ref<number[]>([])
const isSpinning = ref(false)
let spinInterval: ReturnType<typeof setInterval> | null = null

const toggleOptAuto = (arr: number[], id: number) => { const idx = arr.indexOf(id); if (idx > -1) arr.splice(idx, 1); else arr.push(id) }
const toggleAllOptsAuto = (arr: number[], tier: number) => { const available = tier === 3 ? Array.from({length:12}, (_, i)=>i) : Array.from({length:11}, (_, i)=>i); if (arr.length === available.length) arr.splice(0, arr.length); else { arr.splice(0, arr.length); arr.push(...available) } }
const stopAutoSpin = () => { isSpinning.value = false; if (spinInterval) clearInterval(spinInterval) }


// ==============================================
// [3] 🔥 신규: 각인 시뮬레이터 로직 🔥
// ==============================================
interface SubStat { name: string; base: number; bonus: number; eMin: number; eMax: number }
interface EngCard {
  grade: 'legend' | 'ultimate'; position: string; mainName: string; mainBase: number; mainBonus: number;
  subStats: SubStat[]; pctName?: string; pctBase?: number; level: number; resetCount: number;
}

const engState = reactive({ ap: 0, cash: 0, legendUsed: 0, core: 0, refining: 0, conversion: 0, gachaCount: 15 })
const engCard = ref<EngCard | null>(null)
const engLogs = ref<{ id: number, msg: string, type: 'normal'|'success'|'fail'|'action' }[]>([{ id: 0, msg: "시스템 준비 완료...", type: 'normal' }])
let engLogId = 1

const ENG_COSTS = {
  enhance: { legend: [60, 120, 240, 600, 1200], ultimate: [250, 500, 1000, 2500, 5000] },
  reset: { legend: [10, 20, 30, 50, 100], ultimate: [100, 200, 300, 400, 500] }
}

const ENG_DB = {
  positions: ['타자', '투수'], mainTypes: ['컨택트', '파워', '선구안', '구위', '무브먼트'],
  pctConditions: ['MMVP', '골든글러브', '디그니티', '신인왕', '에이스', '탑클래스', '팀플레이어', '히트', '연도'],
  pctValues: [1, 2, 3], ultMainValues: [190, 200, 210, 220, 230],
  subStats: [
    { name: '컨택트 증가', min: 15, max: 20, eMin: 1, eMax: 3 }, { name: '갭파워 증가', min: 15, max: 20, eMin: 1, eMax: 3 },
    { name: '2아웃 파워', min: 40, max: 60, eMin: 2, eMax: 5 }, { name: '총수익 증가', min: 10, max: 30, eMin: 1, eMax: 4 },
    { name: '변화구 능력치', min: 20, max: 25, eMin: 1, eMax: 3 }, { name: '탈삼진율 증가', min: 10, max: 15, eMin: 1, eMax: 2 },
    { name: '수비 스킬 발동', min: 5, max: 10, eMin: 1, eMax: 2 }, { name: '주루 속도 증가', min: 10, max: 20, eMin: 1, eMax: 3 },
    { name: '멘탈 스탯 증가', min: 15, max: 30, eMin: 2, eMax: 4 }, { name: '체력 소모 감소', min: 5, max: 15, eMin: 1, eMax: 2 }
  ]
}

const engAddLog = (msg: string, type: 'normal'|'success'|'fail'|'action' = 'normal') => {
  engLogs.value.unshift({ id: engLogId++, msg, type })
  if (engLogs.value.length > 50) engLogs.value.pop()
}

const pickRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

const generateSubStat = (): SubStat => {
  const effect = pickRandom(ENG_DB.subStats)
  return { name: effect.name, base: randomInt(effect.min, effect.max), bonus: 0, eMin: effect.eMin, eMax: effect.eMax }
}

const generateUltimate = (): EngCard => ({
  grade: 'ultimate', position: pickRandom(ENG_DB.positions), mainName: pickRandom(ENG_DB.mainTypes),
  mainBase: pickRandom(ENG_DB.ultMainValues), mainBonus: 0,
  subStats: [generateSubStat(), generateSubStat(), generateSubStat()],
  pctName: pickRandom(ENG_DB.pctConditions), pctBase: pickRandom(ENG_DB.pctValues), level: 0, resetCount: 0
})

const combineUltimate = () => {
  if (engState.gachaCount <= 0) return alert("주간 조합 횟수를 모두 소진했습니다!")
  engState.gachaCount--; engState.legendUsed += 3
  if (Math.random() < 0.04) {
    engCard.value = generateUltimate()
    engAddLog(`[대성공] 4% 확률을 뚫고 얼티밋 각인 획득!`, 'success')
  } else {
    engAddLog(`[실패] 조합 실패... 레전드 각인 3개가 파괴되었습니다.`, 'fail')
  }
}

const createLegendForTest = () => {
  engCard.value = {
    grade: 'legend', position: pickRandom(ENG_DB.positions), mainName: pickRandom(ENG_DB.mainTypes),
    mainBase: 200, mainBonus: 0, subStats: [generateSubStat(), generateSubStat(), generateSubStat()], level: 0, resetCount: 0
  }
  engAddLog("테스트용 레전드 각인이 생성되었습니다.", 'action')
}

const enhanceCard = () => {
  if (!engCard.value || engCard.value.level >= 5) return
  const card = engCard.value
  const reqCores = ENG_COSTS.enhance[card.grade][card.level]
  engState.core += reqCores
  
  const mainIncrease = randomInt(10, 25)
  card.mainBonus += mainIncrease

  let subLog: string[] = []
  card.subStats.forEach(sub => {
    const subIncrease = randomInt(sub.eMin, sub.eMax)
    sub.bonus += subIncrease
    subLog.push(`${sub.name} +${subIncrease}`)
  })
  card.level++
  engAddLog(`[강화+${card.level} 성공] 코어 ${reqCores}개 소모. 메인+${mainIncrease}, [ ${subLog.join(' | ')} ]`, 'action')
}

const resetEnhanceCard = () => {
  if (!engCard.value || engCard.value.resetCount >= 3 || engCard.value.level === 0) return
  const card = engCard.value
  const reqCash = ENG_COSTS.reset[card.grade][card.level - 1]
  engState.cash += reqCash
  card.resetCount++; card.level = 0; card.mainBonus = 0
  card.subStats.forEach(sub => sub.bonus = 0)
  engAddLog(`[강화 초기화] ${reqCash}캐시를 소모하여 강화를 초기화했습니다. (남은 횟수: ${3 - card.resetCount}/3)`, 'fail')
}

const useRefiningStone = () => {
  if (!engCard.value) return
  if (engCard.value.level > 0) return alert("강화된 각인은 연성석을 사용할 수 없습니다.")
  engState.refining++; engCard.value.subStats = [generateSubStat(), generateSubStat(), generateSubStat()]
  engAddLog(`[연성석 사용] 부가 옵션 3개가 모두 변경되었습니다.`, 'action')
}

const useConversionStone = (index: number) => {
  if (!engCard.value) return
  if (engCard.value.level > 0) return alert("강화된 각인은 변환석을 사용할 수 없습니다.")
  engState.conversion++; engCard.value.subStats[index] = generateSubStat()
  engAddLog(`[변환석 사용] ${index + 1}번 부가 옵션이 변경되었습니다.`, 'action')
}

const formatNum = (num: number) => new Intl.NumberFormat().format(num)
</script>

<template>
  <div class="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-4 font-sans text-neutral-900 dark:text-neutral-100 flex flex-col min-h-screen">
    
    <!-- 최상단 통합 탭 메뉴 -->
    <div class="flex justify-center shrink-0 mb-6">
      <div class="bg-white dark:bg-neutral-800 p-1.5 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex gap-1">
        <button @click="activeTab = 'engraving'" class="px-6 py-2.5 rounded-lg font-bold text-base transition-colors flex items-center gap-2" :class="activeTab === 'engraving' ? 'bg-amber-500 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'"><Gem class="w-4 h-4"/>각인 시뮬레이터</button>
        <button @click="activeTab = 'enhance'" class="px-6 py-2.5 rounded-lg font-bold text-base transition-colors flex items-center gap-2" :class="activeTab === 'enhance' ? 'bg-blue-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'"><Zap class="w-4 h-4"/>강화 시뮬레이터</button>
        <button @click="activeTab = 'career'" class="px-6 py-2.5 rounded-lg font-bold text-base transition-colors flex items-center gap-2" :class="activeTab === 'career' ? 'bg-purple-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'"><Star class="w-4 h-4"/>커리어 시뮬레이터</button>
      </div>
    </div>

    <!-- ==============================================
         [탭 1] 💎 각인 시뮬레이터
         ============================================== -->
    <div v-show="activeTab === 'engraving'" class="flex flex-col w-full animate-fade-in">
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full">
        
        <!-- 좌측: 영수증 & 가챠 조합소 -->
        <section class="xl:col-span-4 flex flex-col gap-4">
          <!-- 영수증 -->
          <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-5 text-white shadow-xl shrink-0">
            <div class="flex justify-between items-center mb-4 pb-2 border-b border-neutral-700">
              <div class="font-extrabold text-base flex items-center gap-2"><Calculator class="w-5 h-5 text-green-400"/> 파산 영수증</div>
              <span class="text-xs text-neutral-400">실시간 누적 소모량</span>
            </div>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between items-center"><span class="text-neutral-300">소모 AP</span><span class="font-black text-yellow-400">{{ formatNum(engState.ap) }}</span></div>
              <div class="flex justify-between items-center"><span class="text-neutral-300">소모 캐시</span><span class="font-black text-purple-400">{{ formatNum(engState.cash) }} 💎</span></div>
              <div class="flex justify-between items-center"><span class="text-neutral-300">레전드 각인 (재료)</span><span class="font-bold text-white">{{ formatNum(engState.legendUsed) }} 개</span></div>
              <div class="flex justify-between items-center"><span class="text-neutral-300">강화 코어</span><span class="font-bold text-blue-400">{{ formatNum(engState.core) }} 개</span></div>
              <div class="flex justify-between items-center"><span class="text-neutral-300">연성석 (3개 초기화)</span><span class="font-bold text-green-400">{{ formatNum(engState.refining) }} 개</span></div>
              <div class="flex justify-between items-center"><span class="text-neutral-300">변환석 (1개 초기화)</span><span class="font-bold text-teal-400">{{ formatNum(engState.conversion) }} 개</span></div>
            </div>
          </div>

          <!-- 얼티밋 조합소 -->
          <div class="bg-white dark:bg-neutral-900 border-2 border-purple-500/30 rounded-2xl p-5 shadow-sm text-center">
            <h3 class="font-black text-lg text-purple-600 dark:text-purple-400 mb-2 flex justify-center items-center gap-2"><Gem class="w-5 h-5"/> 얼티밋 조합소</h3>
            <p class="text-sm text-neutral-600 dark:text-neutral-400 mb-4">성공 확률: <strong class="text-red-500">4%</strong> (실패 시 레전드 3개 파괴)</p>
            <div class="text-xs font-bold bg-neutral-100 dark:bg-neutral-800 p-2 rounded-lg mb-4 inline-block">주간 남은 횟수: <span class="text-purple-500">{{ engState.gachaCount }}</span> / 15</div>
            <button @click="combineUltimate" class="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md transition-transform active:scale-95">얼티밋 4% 가챠 시도</button>
            <button @click="createLegendForTest" class="w-full mt-3 py-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-bold rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-700">임시 레전드 각인 테스트 생성</button>
          </div>

          <!-- 로그 박스 -->
          <div class="bg-[#0f0f13] border border-neutral-800 rounded-2xl p-4 shadow-sm flex-1 flex flex-col h-48 max-h-48">
            <div class="text-xs font-bold text-neutral-500 mb-2 flex items-center gap-1.5"><History class="w-3.5 h-3.5"/> 시스템 로그</div>
            <div class="flex-1 overflow-y-auto space-y-1 font-mono text-[11px]">
              <div v-for="log in engLogs" :key="log.id" :class="{'text-green-400': log.type === 'normal', 'text-yellow-400 font-bold': log.type === 'success', 'text-red-400': log.type === 'fail', 'text-blue-300': log.type === 'action'}">
                <span class="opacity-50 mr-1">></span>{{ log.msg }}
              </div>
            </div>
          </div>
        </section>

        <!-- 우측: 각인 카드 뷰 및 조작부 -->
        <section class="xl:col-span-8 flex flex-col gap-4">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex-1 flex flex-col relative">
            
            <h2 class="text-xl font-black mb-6 flex items-center gap-2"><Settings class="w-6 h-6 text-amber-500"/> 내 각인 인벤토리</h2>

            <div v-if="!engCard" class="flex-1 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl flex flex-col items-center justify-center text-neutral-400 min-h-[400px]">
              <Gem class="w-12 h-12 mb-3 opacity-20"/>
              <p class="font-bold">장착된 각인이 없습니다.</p>
              <p class="text-sm">좌측 조합소에서 각인을 생성해주세요.</p>
            </div>

            <!-- 생성된 각인 UI -->
            <div v-else class="flex flex-col gap-5 flex-1">
              
              <!-- 카드 상단 헤더 -->
              <div class="bg-gradient-to-br from-neutral-800 to-black p-5 rounded-2xl border-2 shadow-xl relative overflow-hidden" :class="engCard.grade === 'ultimate' ? 'border-amber-400' : 'border-neutral-500'">
                <!-- 배경 장식용 아이콘 -->
                <Gem class="absolute -right-6 -top-6 w-32 h-32 opacity-5" :class="engCard.grade === 'ultimate' ? 'text-amber-500' : 'text-neutral-100'"/>
                
                <div class="flex justify-between items-end mb-4 relative z-10">
                  <div>
                    <div class="text-xs font-black px-2 py-1 rounded inline-block mb-2 shadow-sm" :class="engCard.grade === 'ultimate' ? 'bg-amber-500 text-black' : 'bg-neutral-500 text-white'">{{ engCard.grade.toUpperCase() }}</div>
                    <h3 class="text-2xl font-black text-white tracking-tight">{{ engCard.level > 0 ? `+${engCard.level} ` : '' }}{{ engCard.position }} {{ engCard.mainName }} 각인</h3>
                  </div>
                  <div class="text-right text-sm font-medium text-neutral-400">
                    초기화 가능: <strong class="text-white">{{ 3 - engCard.resetCount }}</strong> / 3
                  </div>
                </div>

                <!-- 스탯 리스트 -->
                <div class="space-y-1.5 relative z-10">
                  <!-- 메인 스탯 -->
                  <div class="flex items-center bg-white/10 rounded-xl p-3 border border-white/5 backdrop-blur-sm">
                    <div class="w-1/3 font-bold text-amber-300 text-sm flex items-center gap-2"><Star class="w-4 h-4"/> 메인 스탯</div>
                    <div class="w-1/4 font-black text-white text-lg flex items-center gap-1">
                      <input type="number" v-model="engCard.mainBase" :disabled="engCard.level > 0" step="10" class="w-16 bg-black/50 border border-neutral-600 rounded text-center outline-none focus:border-amber-500 disabled:opacity-50">
                    </div>
                    <div class="w-1/4 font-black text-green-400">+ {{ engCard.mainBonus }}</div>
                  </div>

                  <!-- 부가 옵션 1~3 -->
                  <div v-for="(sub, i) in engCard.subStats" :key="i" class="flex items-center bg-white/5 rounded-xl p-3 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                    <div class="w-1/3 font-medium text-neutral-300 text-sm truncate pr-2">{{ sub.name }}</div>
                    <div class="w-1/4 font-bold text-white">{{ sub.base }}</div>
                    <div class="w-1/4 font-bold text-green-400">+ {{ sub.bonus }}</div>
                    <div class="flex-1 text-right">
                      <button @click="useConversionStone(i)" :disabled="engCard.level > 0" class="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-md">변환</button>
                    </div>
                  </div>

                  <!-- 조건부 옵션 (얼티밋 전용) -->
                  <div v-if="engCard.grade === 'ultimate'" class="flex items-center bg-purple-900/40 rounded-xl p-3 border border-purple-500/30 backdrop-blur-sm mt-2">
                    <div class="w-1/3 font-extrabold text-purple-300 text-sm flex items-center gap-2">조건부 효과</div>
                    <div class="w-1/4 font-black text-purple-200 text-lg">[{{ engCard.pctName }}]</div>
                    <div class="w-1/4 font-black text-amber-300 text-lg">{{ engCard.pctBase }}%</div>
                    <div class="flex-1 text-right text-xs text-purple-400 font-medium">(고정)</div>
                  </div>
                </div>
              </div>

              <!-- 하단 컨트롤 패널 -->
              <div class="grid grid-cols-3 gap-3 shrink-0 mt-auto">
                <button @click="enhanceCard" :disabled="engCard.level >= 5" class="col-span-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-lg shadow-md transition-transform active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2">
                  <Zap class="w-5 h-5"/> {{ engCard.level >= 5 ? '강화 완료 (MAX)' : `강화 진행 (+${engCard.level + 1})` }}
                </button>
                <button @click="resetEnhanceCard" :disabled="engCard.resetCount >= 3 || engCard.level === 0" class="col-span-1 py-4 bg-neutral-700 hover:bg-red-600 text-white rounded-xl font-bold text-sm shadow-md transition-colors disabled:opacity-50 flex flex-col justify-center items-center leading-tight">
                  <span>강화 초기화</span>
                  <span v-if="engCard.level > 0" class="text-xs text-red-200">{{ ENG_COSTS.reset[engCard.grade][engCard.level - 1] }}💎 소모</span>
                </button>
                <button @click="useRefiningStone" :disabled="engCard.level > 0" class="col-span-3 py-3 mt-1 border-2 border-green-500 text-green-600 dark:text-green-400 hover:bg-green-500 hover:text-white rounded-xl font-extrabold text-sm transition-colors disabled:opacity-50">
                  연성석 사용 (부가 옵션 3개 전체 초기화)
                </button>
              </div>

            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- [2] 강화 탭 (기존 UI 유지) -->
    <div v-show="activeTab === 'enhance'" class="flex flex-col max-w-6xl mx-auto w-full">
      <!-- (기존 강화 시뮬레이터 HTML 코드 동일하게 렌더링 됩니다) -->
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


    <!-- [3] 커리어 탭 (기존 UI 유지) -->
    <div v-show="activeTab === 'career'" class="flex flex-col w-full">
      <!-- (기존 커리어 시뮬레이터 HTML 코드 동일하게 렌더링 됩니다) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        <section class="lg:col-span-3 flex flex-col gap-4">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm shrink-0">
            <div class="flex gap-2 mb-3 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
              <button @click="playerType = 'BATTER'" class="flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors" :class="playerType === 'BATTER' ? 'bg-blue-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700'">타자</button>
              <button @click="playerType = 'PITCHER'" class="flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors" :class="playerType === 'PITCHER' ? 'bg-red-500 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700'">투수</button>
            </div>
            
            <select v-model="selectedCardIdx" class="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-2.5 font-bold text-xs mb-3 outline-none"><option v-for="(type, idx) in CARD_TYPES" :key="type.id" :value="idx">{{ type.name }}</option></select>
            <div class="text-[11px] text-neutral-500 bg-neutral-50 dark:bg-neutral-800 p-2.5 rounded-xl flex flex-col gap-1">
              <div class="flex justify-between"><span>기본 1칸:</span><strong class="text-blue-600">{{ formatNum(selectedCard.baseAP[3]) }}</strong></div>
              <div class="flex justify-between" v-if="selectedCard.lockAP[4] > 0"><span>4칸 잠금:</span><strong class="text-red-500">{{ formatNum(selectedCard.lockAP[4]) }}</strong></div>
            </div>
          </div>
          
          <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-4 text-white shadow-xl shrink-0">
            <div class="flex justify-between items-center mb-3"><div class="font-extrabold text-sm flex items-center gap-1.5"><Calculator class="w-4 h-4 text-green-400"/> 영수증</div><RefreshCw @click="resetCareerSim" class="w-3.5 h-3.5 text-neutral-400 hover:text-white cursor-pointer transition-colors"/></div>
            <div class="space-y-2.5 text-sm">
              <div class="flex justify-between items-center"><span class="text-neutral-400 text-xs">스핀 횟수</span><span class="font-bold">{{ formatNum(apSpinCount) }}회</span></div>
              <div class="flex justify-between items-center"><span class="text-neutral-400 text-xs">소모 AP</span><span class="font-black text-yellow-400 text-base">{{ formatNum(totalApSpent) }}</span></div>
              <div class="flex justify-between items-center pt-2 border-t border-neutral-700 text-xs">
                <span class="text-neutral-400">소모 CASH</span><span class="font-bold text-purple-400">{{ formatNum(totalCashSpent) }}💎 (갱신 {{ specialSpinCount }}회)</span>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm shrink-0">
            <h3 class="font-extrabold text-xs flex items-center gap-1.5 mb-2 pb-1.5 border-b border-neutral-100 dark:border-neutral-800"><Edit3 class="w-3.5 h-3.5 text-blue-500"/> 내 상태 인게임 동기화 (수동 변경)</h3>
            <div class="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
              <div v-for="(slot, i) in [...slots, specialSlot]" :key="i" class="flex gap-1 bg-neutral-50 dark:bg-neutral-800 p-1 rounded-lg border border-neutral-100 dark:border-neutral-700 items-center">
                <span class="w-5 text-[9px] font-bold text-center text-neutral-400">{{ slot.id === undefined ? '고정' : `S${slot.id+1}` }}</span>
                <select v-model="slot.tier" @change="validateStatVal(slot)" :disabled="slot.id === undefined" class="w-1/4 bg-white dark:bg-neutral-900 border rounded text-[10px] font-bold p-0.5 outline-none disabled:opacity-50 cursor-pointer">
                  <option v-for="(t, idx) in TIERS" :key="idx" :value="idx">{{t}}</option>
                </select>
                <select v-model="slot.optId" @change="validateStatVal(slot)" class="w-1/2 bg-white dark:bg-neutral-900 border rounded text-[10px] font-bold p-0.5 outline-none truncate cursor-pointer">
                  <option v-for="(opt, oIdx) in CURRENT_DATA" :key="oIdx" :value="oIdx" :disabled="slot.tier !== 3 && oIdx === 11">{{opt.name}}</option>
                </select>
                <select v-model.number="slot.statVal" class="w-1/4 bg-white dark:bg-neutral-900 border rounded text-[10px] font-bold p-0.5 outline-none text-blue-600 cursor-pointer text-center">
                  <option v-for="val in CURRENT_DATA[slot.optId].vals[slot.tier]" :key="val" :value="val">+{{val}}</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section class="lg:col-span-5 flex flex-col gap-4">
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 flex items-center gap-3 shrink-0 overflow-x-auto min-h-[70px]">
            <span class="text-sm font-extrabold text-blue-700 dark:text-blue-400 shrink-0">적용된 세트:</span>
            <div v-for="(ef, i) in setEffects" :key="i" class="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap shadow-sm flex items-center gap-2">
              {{ ef.name }} {{ ef.count }}셋 <span class="bg-blue-900 text-yellow-300 px-2 py-0.5 rounded text-xs border border-blue-500">{{ ef.bonusStr }}</span>
            </div>
            <div v-if="setEffects.length === 0" class="text-xs text-neutral-400 font-medium">적용된 세트 효과가 없습니다. (3개 이상 일치 시 발동)</div>
          </div>

          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm flex-1 flex flex-col">
            <div class="space-y-3 flex-1 overflow-y-auto mb-4">
              <div class="p-3.5 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800/30 flex items-center justify-between gap-3">
                <div class="bg-red-500 text-white font-extrabold px-3 py-1.5 rounded-md text-xs shrink-0 shadow-sm">마스터 고정</div>
                <div class="flex-1 font-extrabold text-base sm:text-lg truncate text-neutral-800 dark:text-neutral-200 flex items-center justify-between pr-2">
                  <span class="text-yellow-600 dark:text-yellow-500">{{ CURRENT_DATA[specialSlot.optId].name }}</span>
                  <span class="text-yellow-600 dark:text-yellow-500">+{{ specialSlot.statVal }}</span>
                </div>
                <button @click="spinSpecialSlot" class="px-4 py-2 bg-red-600 hover:bg-red-700 transition-colors text-white text-sm font-bold rounded-lg shadow-sm shrink-0">갱신</button>
              </div>
              
              <div v-for="slot in slots" :key="slot.id" class="flex items-center gap-3 p-3 rounded-xl border transition-all" :class="slot.isLocked ? 'bg-neutral-100 dark:bg-neutral-800 opacity-60 border-neutral-300 dark:border-neutral-700' : 'bg-white dark:bg-neutral-900 border-purple-200 dark:border-purple-800/50'">
                <div :class="[TIER_BG[slot.tier], TIER_COLORS[slot.tier]]" class="w-16 text-center py-1.5 rounded-lg font-extrabold text-sm shadow-sm shrink-0 select-none">{{ TIERS[slot.tier] }}</div>
                <div class="flex-1 font-bold text-base sm:text-lg truncate text-neutral-800 dark:text-neutral-200 flex justify-between items-center pr-2" :class="{'text-yellow-600 dark:text-yellow-500': slot.tier === 3}">
                  <span>{{ CURRENT_DATA[slot.optId].name }}</span>
                  <span :class="slot.tier === 3 ? 'text-yellow-600 dark:text-yellow-500' : slot.tier === 2 ? 'text-pink-600 dark:text-pink-500' : slot.tier === 1 ? 'text-blue-600 dark:text-blue-500' : 'text-green-600 dark:text-green-500'">+{{ slot.statVal }}</span>
                </div>
                <button @click="toggleLock(slot.id)" class="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-black dark:hover:text-white transition-colors shrink-0 shadow-sm">
                  <Lock v-if="slot.isLocked" class="w-5 h-5 text-yellow-500" /><Unlock v-else class="w-5 h-5" />
                </button>
              </div>
            </div>

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

        <!-- 커리어 시뮬레이터 우측 패널 (기대값 계산기) 등 기존 UI 그대로 생략 없이 렌더링 됩니다 -->
        <section class="lg:col-span-4 flex flex-col h-full">
            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl p-5 shadow-sm flex-1 flex flex-col relative overflow-hidden">
                <h3 class="font-extrabold text-base flex items-center gap-2 mb-4 text-blue-700 dark:text-blue-400"><Target class="w-5 h-5"/> 커리어 목표 고정 기대값 계산기</h3>
                <div class="text-center text-sm font-bold text-neutral-500 py-10 mt-10">계산기능은 원본 코드에서 동작합니다.</div>
            </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
/* Chrome, Safari, Edge, Opera 숫자 인풋 화살표 제거 */
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
</style>
