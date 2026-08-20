<script setup lang="ts">
import { ref, computed, watch, reactive, onMounted, nextTick } from 'vue'
import { 
  Zap, RefreshCw, ArrowRight, Check, X, Calculator, History, 
  Lock, Unlock, Play, Star, Settings, Pause, Edit3, Target, BarChart, Info, Gem, RefreshCcw, Plus, Trash2, Search
} from 'lucide-vue-next'

const activeTab = ref<'enhance' | 'career' | 'engraving'>('career')

// ==============================================
// 🌟 Chart.js 동적 로딩
// ==============================================
let ChartObj: any = null
onMounted(() => {
  if ((window as any).Chart) {
    ChartObj = (window as any).Chart
  } else {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js'
    script.onload = () => { ChartObj = (window as any).Chart }
    document.head.appendChild(script)
  }
})

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
// [2] 커리어 옵션 시뮬레이터 (기본 데이터)
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
  slots.value.forEach(slot => { cost += card.baseAP[slot.tier] })
  return cost
})

const rollOption = (tier: number) => {
  const isMaster = tier === 3; const totalWeight = isMaster ? 34 : 33
  let rand = Math.random() * totalWeight
  let optId = 0
  for (let i = 0; i < 12; i++) {
    if (!isMaster && i === 11) continue
    rand -= (i === 11) ? 1 : 3
    if (rand < 0) { optId = i; break }
  }
  const vals = CURRENT_DATA.value[optId].vals[tier]
  const valIdx = Math.floor(Math.random() * vals.length)
  return { optId, statVal: vals[valIdx] }
}

const rollSlots = () => {
  const card = selectedCard.value; let lockedCount = slots.value.filter(s => s.isLocked).length
  if (lockedCount === 5) return
  let costAP = card.lockAP[lockedCount]; let costCash = card.lockCash[lockedCount]
  slots.value.forEach(slot => {
    costAP += card.baseAP[slot.tier] 
    if (!slot.isLocked) {
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

// ==============================================
// 🌟 [UI 구현] 커리어 인게임 자동 스핀 (조건부 정지) 로직
// ==============================================
const isSpinning = ref(false)
const isAutoModalOpen = ref(false)
const autoSpinInterval = ref<any>(null)

const autoMenuTab = ref<'set'|'tier'|'master'|'pro'|'elite'|'rookie'>('set')

const autoState = reactive({
  setTargetOptions: [] as number[],
  tierTargetMaster: 0,
  tierTargetPro: 0,
  tierTargetElite: 0,
  masterOptions: [] as number[],
  proOptions: [] as number[],
  eliteOptions: [] as number[],
  rookieOptions: [] as number[]
})

const isAllChecked = (tabOptions: number[]) => tabOptions.length === CURRENT_DATA.value.length
const toggleAll = (tab: 'set'|'master'|'pro'|'elite'|'rookie', isChecked: boolean) => {
  const allIds = CURRENT_DATA.value.map(opt => opt.id)
  if (tab === 'set') autoState.setTargetOptions = isChecked ? [...allIds] : []
  if (tab === 'master') autoState.masterOptions = isChecked ? [...allIds] : []
  if (tab === 'pro') autoState.proOptions = isChecked ? [...allIds] : []
  if (tab === 'elite') autoState.eliteOptions = isChecked ? [...allIds] : []
  if (tab === 'rookie') autoState.rookieOptions = isChecked ? [...allIds] : []
}

const getTierCount = (tierIdx: number) => slots.value.filter(s => s.tier >= tierIdx).length 

const checkAutoStopCondition = () => {
  const unlockedSlots = slots.value.filter(s => !s.isLocked)
  if (unlockedSlots.length === 0) return true 

  if (autoState.setTargetOptions.length > 0) {
     for (const ef of setEffects.value) {
       const optId = CURRENT_DATA.value.findIndex(o => o.name === ef.name)
       if (autoState.setTargetOptions.includes(optId)) return true
     }
  }

  if (autoState.tierTargetMaster > 0 && getTierCount(3) >= autoState.tierTargetMaster) return true
  if (autoState.tierTargetPro > 0 && getTierCount(2) >= autoState.tierTargetPro) return true
  if (autoState.tierTargetElite > 0 && getTierCount(1) >= autoState.tierTargetElite) return true

  if (autoState.masterOptions.length > 0) {
    if (unlockedSlots.some(s => s.tier === 3 && autoState.masterOptions.includes(s.optId))) return true
  }
  if (autoState.proOptions.length > 0) {
    if (unlockedSlots.some(s => s.tier === 2 && autoState.proOptions.includes(s.optId))) return true
  }
  if (autoState.eliteOptions.length > 0) {
    if (unlockedSlots.some(s => s.tier === 1 && autoState.eliteOptions.includes(s.optId))) return true
  }
  if (autoState.rookieOptions.length > 0) {
    if (unlockedSlots.some(s => s.tier === 0 && autoState.rookieOptions.includes(s.optId))) return true
  }

  return false
}

const startAutoSpin = () => {
  const isAnySet = autoState.setTargetOptions.length > 0 || 
                   autoState.tierTargetMaster > 0 || autoState.tierTargetPro > 0 || autoState.tierTargetElite > 0 ||
                   autoState.masterOptions.length > 0 || autoState.proOptions.length > 0 || autoState.eliteOptions.length > 0 || autoState.rookieOptions.length > 0;
  
  if (!isAnySet) {
    alert("자동 승급 옵션 또는 목표 등급을 하나 이상 설정해주세요.")
    return
  }

  isAutoModalOpen.value = false
  isSpinning.value = true
  autoSpinInterval.value = setInterval(() => {
    if (!isSpinning.value) {
      clearInterval(autoSpinInterval.value)
      return
    }
    rollSlots()
    if (checkAutoStopCondition()) stopAutoSpin()
  }, 300)
}

const stopAutoSpin = () => {
  isSpinning.value = false
  if (autoSpinInterval.value) { clearInterval(autoSpinInterval.value); autoSpinInterval.value = null }
}

// ==============================================
// 🔥 [강력한 정밀 시뮬레이터 4.3] (존버 메타 & 통계 분리 완벽 적용)
// ==============================================

const calcTargetType = ref<'OPTION' | 'TIER'>('OPTION')
const requireAllMaster = ref(true) 
const calcPresets = ref<{id: number, optId: number, count: number}[]>([ { id: Date.now(), optId: 0, count: 3 } ])
const addCalcPreset = () => { if(calcPresets.value.length < 3) calcPresets.value.push({ id: Date.now(), optId: 0, count: 3 }) }
const removeCalcPreset = (idx: number) => { calcPresets.value.splice(idx, 1) }

const calcTierTarget = ref({ tier: 3, count: 5 }) 
const useSpecialSlot = ref(true)     
const calcLockStrategy = ref(1)      
const userMemories = ref({ elite: 0, pro: 0, master: 0 }) 
const calcIterations = ref(10000)    

const simRawResults = ref<any[]>([])
const calcResult = ref<any>(null)
const isCalculating = ref(false)
const chartCanvas = ref<HTMLCanvasElement | null>(null)
let chartInstance: any = null

const resultViewMode = ref<'TOP10' | 'AVG' | 'BOT90'>('AVG')
const userSpentAp = ref<number | null>(null)
const myLuckPercentile = ref<number | null>(null)
const luckTitle = ref('')

const renderChart = (data: number[]) => {
  if (!ChartObj || !chartCanvas.value) return
  if (chartInstance) chartInstance.destroy()

  const p99 = data[Math.floor(data.length * 0.99)] || data[data.length - 1]
  const filteredData = data.filter(d => d <= p99)
  const min = filteredData[0] || 0; const max = filteredData[filteredData.length - 1] || 1
  const binCount = 40; const binSize = (max - min) / binCount || 1
  const bins = Array(binCount).fill(0)
  
  filteredData.forEach(val => { let idx = Math.floor((val - min) / binSize); if (idx >= binCount) idx = binCount - 1; bins[idx]++ })

  const labels = bins.map((_, i) => formatNum(Math.round(min + (i + 0.5) * binSize)))
  let cdfSum = 0
  const cdf = bins.map(count => { cdfSum += count; return (cdfSum / data.length) * 100 })

  chartInstance = new ChartObj(chartCanvas.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { type: 'line', label: '누적 달성률 (%)', data: cdf, borderColor: '#4f46e5', backgroundColor: '#4f46e5', borderWidth: 2, yAxisID: 'y-cdf', tension: 0.3, pointRadius: 0, fill: false },
        { type: 'bar', label: '해당 구간 인원', data: bins, backgroundColor: 'rgba(99, 102, 241, 0.5)', borderColor: 'rgba(99, 102, 241, 1)', borderWidth: 1, yAxisID: 'y-freq', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', callbacks: { title: (ctx:any) => `AP 소모: ${ctx[0].label}`, label: (ctx:any) => ctx.datasetIndex === 0 ? `누적 달성률: ${ctx.raw.toFixed(2)}%` : `이 구간 달성자: ${ctx.raw}명` } } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 6, font: { size: 10 } } },
        'y-freq': { type: 'linear', position: 'left', display: false, beginAtZero: true },
        'y-cdf': { type: 'linear', position: 'right', beginAtZero: true, max: 100, grid: { drawOnChartArea: false }, ticks: { font: { size: 10 }, callback: (v:any) => v + '%' } }
      }
    }
  })
}

const runExpectedValueCalc = () => {
  if (calcTargetType.value === 'OPTION' && calcPresets.value.length === 0) return alert("목표 옵션을 1개 이상 추가해주세요.")
  
  isCalculating.value = true; calcResult.value = null; myLuckPercentile.value = null; userSpentAp.value = null
  
  setTimeout(() => {
    const card = selectedCard.value
    const iterations = calcIterations.value
    const results = []
    
    for (let i = 0; i < iterations; i++) {
      let tempSlots = slots.value.map(s => ({ ...s }))
      let spOpt = specialSlot.value.optId
      let r = 0, ap = 0, cash = 0, sr = 0
      
      let mems = { e: userMemories.value.elite, p: userMemories.value.pro, m: userMemories.value.master }

      let requiredCounts: Record<number, number> = {}
      if (calcTargetType.value === 'OPTION') {
        calcPresets.value.forEach(p => { requiredCounts[p.optId] = (requiredCounts[p.optId] || 0) + p.count })
      }
      let targetIds = Object.keys(requiredCounts).map(Number)

      if (calcTargetType.value === 'OPTION' && useSpecialSlot.value && targetIds.length > 0) {
        if (!targetIds.includes(spOpt)) {
          while (true) {
            sr++; let rolled = rollOption(3); spOpt = rolled.optId
            if (targetIds.includes(spOpt)) break
          }
        }
      }

      // 🔥 [핵심 로직] 이미 잠긴 슬롯이 있거나, 1개 전략이면 허들은 이미 넘은 상태 (마무리 모드)
      let hasBrokenHurdle = tempSlots.some(s => s.isLocked) || calcLockStrategy.value <= 1;

      while (true) {
        let c0 = tempSlots.filter(s => s.tier === 0).length;
        let c1 = tempSlots.filter(s => s.tier === 1).length;
        let c2 = tempSlots.filter(s => s.tier === 2).length;

        if (c0 > 0 && c0 <= mems.e) {
          for (let s of tempSlots) { if (s.tier === 0) { s.tier = 1; s.optId = rollOption(1).optId; mems.e--; } }
          c0 = 0; c1 = tempSlots.filter(s => s.tier === 1).length;
        }
        if (c0 === 0 && c1 > 0 && c1 <= mems.p) {
          for (let s of tempSlots) { if (s.tier === 1) { s.tier = 2; s.optId = rollOption(2).optId; mems.p--; } }
          c1 = 0; c2 = tempSlots.filter(s => s.tier === 2).length;
        }
        if (c0 === 0 && c1 === 0 && c2 > 0 && c2 <= mems.m) {
          for (let s of tempSlots) { if (s.tier === 2) { s.tier = 3; s.optId = rollOption(3).optId; mems.m--; } }
        }

        if (calcTargetType.value === 'TIER') {
          const tTier = calcTierTarget.value.tier; const tCount = calcTierTarget.value.count
          if (tempSlots.filter(s => s.tier >= tTier).length >= tCount) break
          
          let loopAp = card.lockAP[0]
          for (let s of tempSlots) { 
             loopAp += card.baseAP[s.tier]; 
             if (s.tier < 3 && Math.random() < 0.01) s.tier++ 
          }
          ap += loopAp; r++
          if (r > 50000) break
        } 
        else {
          let allMaster = tempSlots.every(s => s.tier === 3);
          
          let currentCounts: Record<number, number> = {}
          if (useSpecialSlot.value && targetIds.includes(spOpt)) currentCounts[spOpt] = 1 
          for (let s of tempSlots) {
            if (!requireAllMaster.value || s.tier === 3) {
              currentCounts[s.optId] = (currentCounts[s.optId] || 0) + 1
            }
          }

          let allMet = true
          for (let opt in requiredCounts) { 
            if ((currentCounts[opt] || 0) < requiredCounts[opt]) { allMet = false; break } 
          }
          if (requireAllMaster.value && !allMaster) allMet = false;

          if (allMet) break 

          let isTierPhase = requireAllMaster.value && !allMaster;

          if (isTierPhase) {
            tempSlots.forEach(s => s.isLocked = false);
          } else {
            let needed: Record<number, number> = {}
            for (let opt in requiredCounts) {
              let lockedCount = tempSlots.filter(s => s.isLocked && s.optId === Number(opt) && (!requireAllMaster.value || s.tier === 3)).length
              let spCount = (useSpecialSlot.value && spOpt === Number(opt)) ? 1 : 0
              needed[opt] = requiredCounts[opt] - lockedCount - spCount
            }

            let validTargets = tempSlots.filter(s => !s.isLocked && needed[s.optId] > 0 && (!requireAllMaster.value || s.tier === 3))

            // 🔥 [존버 전략 로직] 허들을 넘었으면 즉시 1개 모드, 아니면 세팅값 유지
            let currentStrategy = hasBrokenHurdle ? 1 : calcLockStrategy.value;

            if (validTargets.length >= currentStrategy) {
              hasBrokenHurdle = true; // 문턱(허들)을 부수고 존버 성공!
              
              // 대박(초과)이 터졌더라도 needed(필요 목표치) 한도 내에서 싹 다 잠금! (개이득)
              for (let s of validTargets) {
                if (needed[s.optId] > 0) { 
                  s.isLocked = true; 
                  needed[s.optId]--; 
                }
              }
            }
          }

          let lockedCount = tempSlots.filter(s => s.isLocked).length
          let loopAp = card.lockAP[lockedCount]
          let loopCash = card.lockCash[lockedCount]

          for (let s of tempSlots) {
            loopAp += card.baseAP[s.tier] 
            if (!s.isLocked) {
              if (s.tier < 3 && Math.random() < 0.01) s.tier++
              const rolled = rollOption(s.tier)
              s.optId = rolled.optId
            }
          }

          ap += loopAp; cash += loopCash; r++
          if (r > 60000) break 
        }
      }
      results.push({ ap, cash, sr, r })
    }
    
    // 운세 판독기를 위해 원본 결과를 AP 기준으로 정렬 저장
    simRawResults.value = [...results].sort((a, b) => a.ap - b.ap)
    
    // 🔥 [수정됨] AP, CASH, SR(교체 메모리) 통계를 각각 완벽히 독립적으로 분리하여 줄세움
    const apList = [...results].map(r => r.ap).sort((a, b) => a - b)
    const cashList = [...results].map(r => r.cash).sort((a, b) => a - b)
    const srList = [...results].map(r => r.sr).sort((a, b) => a - b)

    const avgIdx = Math.floor(iterations * 0.5)
    const top10Idx = Math.floor(iterations * 0.1)
    const bot90Idx = Math.floor(iterations * 0.9)
    
    // 1회 성공 확률은 시도 횟수(r)의 평균값을 기준으로 계산
    const rList = [...results].map(x => x.r).sort((a, b) => a - b)
    const oneTryProb = rList[avgIdx] > 0 ? (1 / rList[avgIdx]) * 100 : 0

    const extractStat = (idx: number) => ({ 
      ap: apList[idx], 
      cash: cashList[idx], 
      sr: srList[idx] 
    })

    calcResult.value = { avg: extractStat(avgIdx), top10: extractStat(top10Idx), bot90: extractStat(bot90Idx), oneTryProb }
    
    isCalculating.value = false; resultViewMode.value = 'AVG'
    nextTick(() => { renderChart(apList) }) // 차트는 AP 분포도를 그림

  }, 100)
}

const checkMyLuck = () => {
  if (!userSpentAp.value || simRawResults.value.length === 0) return alert("시뮬레이션을 먼저 가동한 후 AP를 입력해주세요.")
  const ap = userSpentAp.value
  let rankIndex = simRawResults.value.findIndex(r => r.ap >= ap)
  if (rankIndex === -1) rankIndex = simRawResults.value.length
  
  const pct = (rankIndex / simRawResults.value.length) * 100
  myLuckPercentile.value = parseFloat(pct.toFixed(2))
  
  if (pct <= 5) luckTitle.value = "기만 멈춰! 초특급 비틱 💎"
  else if (pct <= 20) luckTitle.value = "될놈될! 꽤 운이 좋네요 🍀"
  else if (pct <= 50) luckTitle.value = "평타 쳤습니다! 무난하네요 👍"
  else if (pct <= 85) luckTitle.value = "조금 억까 당하셨군요... 🥲"
  else luckTitle.value = "흑우 등장... 에프가 사랑합니다 😭"
}


// ==============================================
// 🔥 각인 시뮬레이터 로직
// ==============================================
const engPlayerType = ref<'BATTER' | 'PITCHER'>('BATTER')

interface SubStat { name: string; base: number; bonus: number; eMin: number; eMax: number; enhanceCount: number }
interface EngCard {
  grade: 'legend' | 'ultimate'; position: string; mainName: string; mainBase: number; mainBonus: number;
  subStats: SubStat[]; pctName?: string; pctBase?: number; level: number; resetCount: number;
}

const engState = reactive({ ap: 0, cash: 0, legendUsed: 0, core: 0, refining: 0, conversion: 0, gachaCount: 15 })
const engCard = ref<EngCard | null>(null)
const engLogs = ref<{ id: number, msg: string, type: 'normal'|'success'|'fail'|'action' }[]>([{ id: 0, msg: "시스템 준비 완료...", type: 'normal' }])
let engLogId = 1

const ENG_COSTS = { enhance: { legend: [60, 120, 240, 600, 1200], ultimate: [250, 500, 1000, 2500, 5000] }, reset: { legend: [10, 20, 30, 50, 100], ultimate: [100, 200, 300, 400, 500] } }

const ENG_DB = computed(() => {
  const isBatter = engPlayerType.value === 'BATTER'
  const createStat = (name: string, uMin: number, uMax: number, uEmin: number, uEmax: number, lMin: number, lMax: number, lEmin: number, lEmax: number) => ({ name, ult: { min: uMin, max: uMax, eMin: uEmin, eMax: uEmax }, leg: { min: lMin, max: lMax, eMin: lEmin, eMax: lEmax } })
  const common7to13 = [ createStat('수비 능력치 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('지고 있을 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('박빙 상황(2점차 이내)에서 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('자신보다 파워 높은 카드 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('자신보다 파워 낮은 카드 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('2아웃 상황에서 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10) ]
  const batterSub = [ createStat('전체 능력치 상승', 3, 5, 1, 3, 2, 3, 1, 2), createStat('컨택트 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8), createStat('갭파워 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8), createStat('홈런 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8), createStat('선구 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8), createStat('삼진회피 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8), ...common7to13, createStat('구종 스킬 가진 투수 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('출루 시 주루 상승', 25, 40, 5, 7, 15, 25, 3, 5), createStat('다른 핸드타입의 투수 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('주자가 2루 또는 3루에 있을 경우, 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('타점 기록 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('주자 없을 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('상대 팀 선발을 상대시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('경기 1회~4회까지만 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('경기 5회~9회까지만 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('경기 총 수익 증가', 5, 7, 2, 4, 3, 5, 1, 3) ]
  const pitcherSub = [ createStat('전체 능력치 상승', 3, 5, 1, 3, 2, 3, 1, 2), createStat('무브먼트 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8), createStat('장타 억제 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8), createStat('홈런 억제 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8), createStat('컨트롤 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8), createStat('스터프 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8), ...common7to13, createStat('클린업 타순을 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('주자 있을 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('같은 핸드타입의 타자 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('한계투구 능력치 상승', 10, 15, 3, 5, 6, 10, 3, 4), createStat('실점한 이닝에 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('등판 후 첫 타자 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('1선발, 2선발로 기용 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('경기 1회~4회까지만 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('경기 5회~9회까지만 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('경기 총 수익 증가', 5, 7, 2, 4, 3, 5, 1, 3) ]
  return { positions: [isBatter ? '타자' : '투수'], mainTypes: isBatter ? ['컨택트', '갭파워', '홈런', '선구', '삼진회피'] : ['무브먼트', '장타 억제', '홈런 억제', '컨트롤', '스터프'], pctConditions: ['MMVP', '골든글러브', '디그니티', '신인왕', '에이스', '탑클래스', '팀플레이어', '히트', '연도(골글)'], pctValues: [1, 2, 3], ultMainValues: [190, 200, 210, 220, 230], subStats: isBatter ? batterSub : pitcherSub }
})

const pickRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const generateSubStat = (grade: 'legend' | 'ultimate', enhanceCount: number = 0): SubStat => {
  const effect = pickRandom(ENG_DB.value.subStats); const stats = grade === 'ultimate' ? effect.ult : effect.leg; const base = randomInt(stats.min, stats.max)
  let bonus = 0; for (let i = 0; i < enhanceCount; i++) bonus += randomInt(stats.eMin, stats.eMax)
  return { name: effect.name, base, bonus, eMin: stats.eMin, eMax: stats.eMax, enhanceCount }
}
const engAddLog = (msg: string, type: 'normal'|'success'|'fail'|'action' = 'normal') => { engLogs.value.unshift({ id: engLogId++, msg, type }); if (engLogs.value.length > 50) engLogs.value.pop() }

const drawLegend = () => { engPlayerType.value = Math.random() < 0.5 ? 'BATTER' : 'PITCHER'; engCard.value = { grade: 'legend', position: engPlayerType.value === 'BATTER' ? '타자' : '투수', mainName: pickRandom(ENG_DB.value.mainTypes), mainBase: 200, mainBonus: 0, subStats: [generateSubStat('legend', 0), generateSubStat('legend', 0), generateSubStat('legend', 0)], level: 0, resetCount: 0 }; engAddLog(`[레전드 획득] ${engCard.value.position} ${engCard.value.mainName} 레전드 각인을 뽑았습니다!`, 'action') }
const drawUltimate = () => { engPlayerType.value = Math.random() < 0.5 ? 'BATTER' : 'PITCHER'; engCard.value = { grade: 'ultimate', position: engPlayerType.value === 'BATTER' ? '타자' : '투수', mainName: pickRandom(ENG_DB.value.mainTypes), mainBase: pickRandom(ENG_DB.value.ultMainValues), mainBonus: 0, subStats: [generateSubStat('ultimate', 0), generateSubStat('ultimate', 0), generateSubStat('ultimate', 0)], pctName: pickRandom(ENG_DB.value.pctConditions), pctBase: pickRandom(ENG_DB.value.pctValues), level: 0, resetCount: 0 }; engAddLog(`[얼티밋 획득] ${engCard.value.position} ${engCard.value.mainName} 얼티밋 각인을 뽑았습니다!`, 'action') }
const combineUltimate = () => { if (engState.gachaCount <= 0) { engAddLog(`[경고] 주간 조합 횟수(15회)를 모두 소진했습니다. 초기화 후 시도해주세요.`, 'fail'); return }; engState.gachaCount--; engState.legendUsed += 3; if (Math.random() < 0.04) { engPlayerType.value = Math.random() < 0.5 ? 'BATTER' : 'PITCHER'; engCard.value = { grade: 'ultimate', position: engPlayerType.value === 'BATTER' ? '타자' : '투수', mainName: pickRandom(ENG_DB.value.mainTypes), mainBase: pickRandom(ENG_DB.value.ultMainValues), mainBonus: 0, subStats: [generateSubStat('ultimate', 0), generateSubStat('ultimate', 0), generateSubStat('ultimate', 0)], pctName: pickRandom(ENG_DB.value.pctConditions), pctBase: pickRandom(ENG_DB.value.pctValues), level: 0, resetCount: 0 }; engAddLog(`[대성공] 4% 확률을 뚫고 얼티밋 조합에 성공했습니다!`, 'success') } else { engAddLog(`[실패] 조합 실패... 레전드 각인 3개가 파괴되었습니다.`, 'fail') } }
const resetGachaLimit = () => { engState.gachaCount = 15; engAddLog(`[시스템] 주간 조합 가능 횟수가 15회로 초기화되었습니다.`, 'action') }
const enhanceCard = () => { 
  if (!engCard.value || engCard.value.level >= 5) return; 
  const card = engCard.value; const reqCores = ENG_COSTS.enhance[card.grade][card.level]; engState.core += reqCores; 
  const mainIncrease = randomInt(card.grade === 'ultimate' ? 10 : 10, card.grade === 'ultimate' ? 25 : 20); 
  card.mainBonus += mainIncrease; const targetSubIndex = Math.floor(Math.random() * 3); const targetSub = card.subStats[targetSubIndex]; const subIncrease = randomInt(targetSub.eMin, targetSub.eMax); targetSub.bonus += subIncrease; targetSub.enhanceCount++; card.level++; engAddLog(`[강화+${card.level} 성공] 메인+${mainIncrease}, [ ${targetSubIndex+1}번 부가옵션(${targetSub.name}) +${subIncrease} ] 상승!`, 'action') 
}
const resetEnhanceCard = () => { if (!engCard.value || engCard.value.resetCount >= 3 || engCard.value.level === 0) return; const card = engCard.value; const reqCash = ENG_COSTS.reset[card.grade][card.level - 1]; engState.cash += reqCash; card.resetCount++; card.level = 0; card.mainBonus = 0; card.subStats.forEach(sub => { sub.bonus = 0; sub.enhanceCount = 0 }); engAddLog(`[강화 초기화] ${reqCash}캐시 소모로 강화를 초기화했습니다. (남은 횟수: ${3 - card.resetCount}/3)`, 'fail') }
const useRefiningStone = () => { if (!engCard.value) return; if (engCard.value.level > 0) { engAddLog(`[경고] 강화된 각인(+${engCard.value.level})에는 연성석을 사용할 수 없습니다. 초기화 후 사용하세요.`, 'fail'); return }; engState.refining++; engCard.value.subStats = [generateSubStat(engCard.value.grade, 0), generateSubStat(engCard.value.grade, 0), generateSubStat(engCard.value.grade, 0)]; engAddLog(`[연성석 사용] 부가 옵션 3개가 모두 변경되었습니다.`, 'action') }
const useConversionStone = (index: number) => { if (!engCard.value) return; engState.conversion++; engCard.value.subStats[index] = generateSubStat(engCard.value.grade, engCard.value.subStats[index].enhanceCount); engAddLog(`[변환석 사용] ${index + 1}번 부가 옵션이 변경되었습니다.`, 'action') }
const updateSubStatRanges = (sub: SubStat) => { const found = ENG_DB.value.subStats.find(s => s.name === sub.name); if (found && engCard.value) { const stats = engCard.value.grade === 'ultimate' ? found.ult : found.leg; sub.eMin = stats.eMin; sub.eMax = stats.eMax } }
const formatNum = (num: number) => new Intl.NumberFormat().format(num)
</script>

<template>
  <div class="w-full mx-auto px-2 sm:px-4 py-4 font-sans text-neutral-900 dark:text-neutral-100 flex flex-col min-h-screen relative">
    
    <!-- 🌟 [모달] 커리어 자동 스핀 설정 (인게임 완벽 복제) 🌟 -->
    <div v-if="isAutoModalOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div class="bg-white dark:bg-[#1a1b1e] rounded-xl w-full max-w-[600px] shadow-2xl border border-blue-200/50 dark:border-blue-900/30 flex flex-col overflow-hidden">
        
        <!-- 모달 헤더 -->
        <div class="bg-gradient-to-b from-blue-400 to-cyan-500 p-3.5 flex justify-between items-center text-white shadow-sm">
          <div class="w-8"></div> <!-- 밸런스용 빈 공간 -->
          <h3 class="font-extrabold text-[15px] tracking-wide text-center flex-1">자동 승급 옵션 설정</h3>
          <button @click="isAutoModalOpen = false" class="text-white hover:text-blue-100 transition-colors w-8 flex justify-end"><X class="w-5 h-5"/></button>
        </div>
        
        <!-- 서브 텍스트 -->
        <div class="text-center py-3 bg-white dark:bg-[#1a1b1e] border-b border-neutral-100 dark:border-neutral-800">
          <p class="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 leading-tight">
            잠금 상태를 제외한 모든 커리어 승급 옵션이<br>
            선택한 등급 및 옵션의 설정이 적용될 때까지 변경이 시도됩니다.
          </p>
        </div>

        <!-- 메인 콘텐츠 영역 (좌측 탭 + 우측 상세) -->
        <div class="flex h-[340px] bg-neutral-50 dark:bg-[#151619]">
          
          <!-- 좌측 탭 메뉴 -->
          <div class="w-[120px] bg-neutral-100 dark:bg-[#1f2024] flex flex-col p-2 gap-1.5 border-r border-neutral-200 dark:border-neutral-800 shrink-0">
            <button v-for="(label, key) in { set: '세트 도달', tier: '등급 도달', master: '마스터', pro: '프로', elite: '엘리트', rookie: '루키' }" :key="key" 
                    @click="autoMenuTab = key as any"
                    class="py-2.5 px-2 rounded font-extrabold text-[12px] transition-all text-center border relative"
                    :class="autoMenuTab === key ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-blue-400 shadow-md translate-x-1' : 'bg-white dark:bg-[#2a2b30] text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-[#303136]'">
              {{ label }}
              <!-- 활성화된 탭 우측 포인트 디자인 -->
              <div v-if="autoMenuTab === key" class="absolute -right-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-l-[6px] border-l-cyan-500"></div>
            </button>
          </div>
          
          <!-- 우측 상세 내용 -->
          <div class="flex-1 p-0 flex flex-col bg-white dark:bg-[#1a1b1e] relative">
            
            <!-- [전체 선택] 헤더 (등급 도달 탭 제외) -->
            <div v-if="autoMenuTab !== 'tier'" class="flex justify-end p-2 border-b border-neutral-100 dark:border-neutral-800 absolute top-0 right-0 left-0 bg-white/90 dark:bg-[#1a1b1e]/90 backdrop-blur z-10">
               <label class="flex items-center gap-1.5 cursor-pointer px-2">
                 <span class="text-[11px] font-bold text-neutral-500">전체</span>
                 <input type="checkbox" :checked="autoMenuTab === 'set' ? isAllChecked(autoState.setTargetOptions) : autoMenuTab === 'master' ? isAllChecked(autoState.masterOptions) : autoMenuTab === 'pro' ? isAllChecked(autoState.proOptions) : autoMenuTab === 'elite' ? isAllChecked(autoState.eliteOptions) : isAllChecked(autoState.rookieOptions)" 
                        @change="(e) => toggleAll(autoMenuTab as any, (e.target as HTMLInputElement).checked)"
                        class="w-3.5 h-3.5 accent-cyan-500 rounded cursor-pointer">
               </label>
            </div>

            <!-- 내용 스크롤 영역 -->
            <div class="flex-1 overflow-y-auto px-4 pb-4 pt-10">
              
              <!-- 탭 1: 등급 도달 -->
              <div v-if="autoMenuTab === 'tier'" class="space-y-6 pt-2">
                <div class="space-y-3">
                  <div class="font-extrabold text-sm text-neutral-800 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-1">마스터 <span class="text-[9px] font-normal text-neutral-400 ml-1">(순수 마스터 개수)</span></div>
                  <div class="flex gap-4 px-2">
                    <label v-for="n in 5" :key="n" class="flex items-center gap-1.5 cursor-pointer group">
                      <span class="text-xs font-bold text-neutral-600 dark:text-neutral-400 group-hover:text-cyan-500">{{n}}개</span>
                      <input type="checkbox" :checked="autoState.tierTargetMaster === n" @change="autoState.tierTargetMaster = (autoState.tierTargetMaster === n ? 0 : n)" class="w-4 h-4 accent-cyan-500 rounded cursor-pointer">
                    </label>
                  </div>
                </div>
                <div class="space-y-3">
                  <div class="font-extrabold text-sm text-neutral-800 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-1">프로 <span class="text-[9px] font-normal text-neutral-400 ml-1">(프로+마스터 포함)</span></div>
                  <div class="flex gap-4 px-2">
                    <label v-for="n in 5" :key="n" class="flex items-center gap-1.5 cursor-pointer group">
                      <span class="text-xs font-bold text-neutral-600 dark:text-neutral-400 group-hover:text-cyan-500">{{n}}개</span>
                      <input type="checkbox" :checked="autoState.tierTargetPro === n" @change="autoState.tierTargetPro = (autoState.tierTargetPro === n ? 0 : n)" class="w-4 h-4 accent-cyan-500 rounded cursor-pointer">
                    </label>
                  </div>
                </div>
                <div class="space-y-3">
                  <div class="font-extrabold text-sm text-neutral-800 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-1">엘리트 <span class="text-[9px] font-normal text-neutral-400 ml-1">(엘리트+프로+마스터 포함)</span></div>
                  <div class="flex gap-4 px-2">
                    <label v-for="n in 5" :key="n" class="flex items-center gap-1.5 cursor-pointer group">
                      <span class="text-xs font-bold text-neutral-600 dark:text-neutral-400 group-hover:text-cyan-500">{{n}}개</span>
                      <input type="checkbox" :checked="autoState.tierTargetElite === n" @change="autoState.tierTargetElite = (autoState.tierTargetElite === n ? 0 : n)" class="w-4 h-4 accent-cyan-500 rounded cursor-pointer">
                    </label>
                  </div>
                </div>
              </div>

              <!-- 탭 2~6: 옵션 리스트 (세트, 마스터, 프로, 엘리트, 루키) -->
              <div v-else class="flex flex-col gap-0.5">
                 <label v-for="opt in CURRENT_DATA" :key="opt.id" class="flex justify-between items-center py-2 px-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded cursor-pointer group border-b border-neutral-100 dark:border-neutral-800/50 last:border-0">
                   <span class="text-[12px] font-bold text-neutral-700 dark:text-neutral-300 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">{{ opt.name }}</span>
                   
                   <input v-if="autoMenuTab === 'set'" type="checkbox" :value="opt.id" v-model="autoState.setTargetOptions" class="w-4 h-4 accent-cyan-500 rounded cursor-pointer">
                   <input v-else-if="autoMenuTab === 'master'" type="checkbox" :value="opt.id" v-model="autoState.masterOptions" class="w-4 h-4 accent-cyan-500 rounded cursor-pointer">
                   <input v-else-if="autoMenuTab === 'pro'" type="checkbox" :value="opt.id" v-model="autoState.proOptions" class="w-4 h-4 accent-cyan-500 rounded cursor-pointer">
                   <input v-else-if="autoMenuTab === 'elite'" type="checkbox" :value="opt.id" v-model="autoState.eliteOptions" class="w-4 h-4 accent-cyan-500 rounded cursor-pointer">
                   <input v-else-if="autoMenuTab === 'rookie'" type="checkbox" :value="opt.id" v-model="autoState.rookieOptions" class="w-4 h-4 accent-cyan-500 rounded cursor-pointer">
                 </label>
              </div>

            </div>
          </div>
        </div>

        <!-- 하단 시작 버튼 영역 -->
        <div class="p-3 bg-neutral-100 dark:bg-[#1f2024] border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center px-6">
          <span class="text-[10px] font-bold text-neutral-500">재화 부족 시 자동 종료 됩니다.</span>
          <button @click="startAutoSpin" class="px-10 py-2.5 bg-gradient-to-b from-teal-400 to-cyan-600 hover:from-teal-300 hover:to-cyan-500 text-white font-extrabold text-[13px] rounded-sm shadow-md transition-all active:scale-95 tracking-widest border border-cyan-300/30">
            시작
          </button>
        </div>
      </div>
    </div>

    <!-- 탭 메뉴 -->
    <div class="flex justify-center shrink-0 mb-4">
      <div class="bg-white dark:bg-neutral-800 p-1.5 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex gap-1">
        <button @click="activeTab = 'engraving'" class="px-6 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2" :class="activeTab === 'engraving' ? 'bg-amber-500 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'"><Gem class="w-4 h-4"/>각인 시뮬레이터</button>
        <button @click="activeTab = 'enhance'" class="px-6 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2" :class="activeTab === 'enhance' ? 'bg-blue-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'"><Zap class="w-4 h-4"/>강화 시뮬레이터</button>
        <button @click="activeTab = 'career'" class="px-6 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2" :class="activeTab === 'career' ? 'bg-purple-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'"><Star class="w-4 h-4"/>커리어 시뮬레이터</button>
      </div>
    </div>

    <!-- [탭 1] 각인 시뮬레이터 -->
    <div v-show="activeTab === 'engraving'" class="flex flex-col w-full animate-fade-in max-w-[1600px] mx-auto">
      <div class="flex justify-center mb-5">
        <div class="bg-white dark:bg-neutral-900 p-1.5 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 flex gap-1 w-64">
          <button @click="engPlayerType = 'BATTER'" class="flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors" :class="engPlayerType === 'BATTER' ? 'bg-blue-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'">타자 각인</button>
          <button @click="engPlayerType = 'PITCHER'" class="flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors" :class="engPlayerType === 'PITCHER' ? 'bg-red-500 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'">투수 각인</button>
        </div>
      </div>
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-5 w-full">
        <section class="xl:col-span-3 flex flex-col gap-4">
          <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-5 text-white shadow-xl shrink-0"><div class="flex justify-between items-center mb-3 pb-2 border-b border-neutral-700"><div class="font-extrabold text-sm flex items-center gap-2"><Calculator class="w-4 h-4 text-green-400"/> 파산 영수증</div><span class="text-[10px] text-neutral-400">실시간 누적 소모량</span></div><div class="space-y-2.5 text-xs"><div class="flex justify-between items-center"><span class="text-neutral-300">소모 AP</span><span class="font-black text-yellow-400">{{ formatNum(engState.ap) }}</span></div><div class="flex justify-between items-center"><span class="text-neutral-300">소모 캐시</span><span class="font-black text-purple-400">{{ formatNum(engState.cash) }} 💎</span></div><div class="flex justify-between items-center"><span class="text-neutral-300">레전드 각인 (재료)</span><span class="font-bold text-white">{{ formatNum(engState.legendUsed) }} 개</span></div><div class="flex justify-between items-center"><span class="text-neutral-300">강화 코어</span><span class="font-bold text-blue-400">{{ formatNum(engState.core) }} 개</span></div><div class="flex justify-between items-center"><span class="text-neutral-300">연성석 (3개 변경)</span><span class="font-bold text-green-400">{{ formatNum(engState.refining) }} 개</span></div><div class="flex justify-between items-center"><span class="text-neutral-300">변환석 (1개 변경)</span><span class="font-bold text-teal-400">{{ formatNum(engState.conversion) }} 개</span></div></div></div>
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3"><h3 class="font-extrabold text-xs border-b border-neutral-100 dark:border-neutral-800 pb-2">🎰 각인 획득소</h3><button @click="drawLegend" class="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold shadow-md transition-transform active:scale-95 text-xs">레전드 각인 뽑기</button><button @click="drawUltimate" class="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-md transition-transform active:scale-95 text-xs">얼티밋 각인 뽑기 (확정)</button><div class="border-t border-neutral-100 dark:border-neutral-800 pt-3 mt-1"><div class="flex justify-between items-center mb-2"><span class="text-[11px] font-bold text-purple-600 dark:text-purple-400">얼티밋 조합 (4%)</span><span class="text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-bold">주간 <span class="text-purple-500">{{ engState.gachaCount }}</span>/15</span></div><button @click="combineUltimate" class="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md transition-transform active:scale-95 text-xs mb-2">조합 시도 (재료 3개 소모)</button><button @click="resetGachaLimit" class="w-full py-1.5 border border-purple-200 dark:border-purple-800/50 text-purple-600 dark:text-purple-400 text-[10px] font-bold rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex justify-center items-center gap-1"><RefreshCcw class="w-3 h-3"/> 횟수 15회 강제 초기화</button></div></div>
          <div class="bg-[#0f0f13] border border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-col h-[160px]"><div class="text-[11px] font-bold text-neutral-500 mb-2 flex items-center gap-1.5"><History class="w-3.5 h-3.5"/> 시스템 로그</div><div class="flex-1 overflow-y-auto space-y-1 font-mono text-[10px]"><div v-for="log in engLogs" :key="log.id" :class="{'text-green-400': log.type === 'normal', 'text-yellow-400 font-bold': log.type === 'success', 'text-red-400': log.type === 'fail', 'text-blue-300': log.type === 'action'}"><span class="opacity-50 mr-1">></span>{{ log.msg }}</div></div></div>
        </section>
        <section class="xl:col-span-9 flex flex-col gap-4">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
            <div class="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm flex flex-col relative"><h2 class="text-lg font-black mb-4 flex items-center gap-2"><Settings class="w-5 h-5 text-amber-500"/> 내 각인 인벤토리</h2><div v-if="!engCard" class="flex-1 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl flex flex-col items-center justify-center text-neutral-400 min-h-[400px]"><Gem class="w-12 h-12 mb-3 opacity-20"/><p class="font-bold text-sm">장착된 각인이 없습니다.</p><p class="text-xs">좌측 획득소에서 각인을 생성해주세요.</p></div><div v-else class="flex flex-col gap-4 flex-1"><div class="bg-gradient-to-br from-neutral-800 to-black p-6 rounded-2xl border-2 shadow-xl relative overflow-hidden flex-1 flex flex-col min-h-[420px]" :class="engCard.grade === 'ultimate' ? 'border-amber-400' : 'border-neutral-500'"><Gem class="absolute -right-6 -top-6 w-40 h-40 opacity-5" :class="engCard.grade === 'ultimate' ? 'text-amber-500' : 'text-neutral-100'"/><div class="flex justify-between items-end mb-4 relative z-10"><div><div class="text-[10px] font-black px-2 py-1 rounded inline-block mb-1 shadow-sm" :class="engCard.grade === 'ultimate' ? 'bg-amber-500 text-black' : 'bg-neutral-500 text-white'">{{ engCard.grade.toUpperCase() }}</div><h3 class="text-2xl font-black text-white tracking-tight">{{ engCard.level > 0 ? `+${engCard.level} ` : '' }}{{ engCard.position }} {{ engCard.mainName }} 각인</h3></div><div class="text-right text-xs font-medium text-neutral-400">초기화 가능: <strong class="text-white">{{ 3 - engCard.resetCount }}</strong> / 3</div></div><div class="space-y-3 relative z-10 mt-2 mb-4 flex-1"><div class="flex items-center bg-white/10 rounded-xl p-3 border border-white/5 backdrop-blur-sm"><div class="w-2/5 font-bold text-amber-300 text-sm flex items-center gap-1.5"><Star class="w-4 h-4"/> 메인 스탯</div><div class="w-1/4 font-black text-white text-base">{{ engCard.mainBase }}</div><div class="flex-1 font-black text-green-400 text-right text-base">+ {{ engCard.mainBonus }}</div></div><div v-for="(sub, i) in engCard.subStats" :key="i" class="flex items-center bg-white/5 rounded-xl p-3 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors"><div class="w-2/5 font-medium text-neutral-300 text-[13px] truncate pr-2">{{ sub.name }}</div><div class="w-1/4 font-bold text-white text-sm">{{ sub.base }}</div><div class="w-1/4 font-bold text-green-400 text-sm">+ {{ sub.bonus }}</div><div class="flex-1 text-right"><button @click="useConversionStone(i)" class="px-2 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold rounded shadow-sm">변환</button></div></div><div v-if="engCard.grade === 'ultimate'" class="flex items-center bg-purple-900/40 rounded-xl p-3 border border-purple-500/30 backdrop-blur-sm mt-3"><div class="w-2/5 font-extrabold text-purple-300 text-[13px] flex items-center gap-1.5">조건부 효과</div><div class="w-1/4 font-black text-purple-200 text-sm">[{{ engCard.pctName }}]</div><div class="flex-1 text-right font-black text-amber-300 text-sm">{{ engCard.pctBase }}% (고정)</div></div></div></div><div class="grid grid-cols-3 gap-3 shrink-0 mt-auto"><button @click="enhanceCard" :disabled="engCard.level >= 5" class="col-span-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-base shadow-md transition-transform active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2"><Zap class="w-5 h-5"/> {{ engCard.level >= 5 ? '강화 완료' : `강화 진행 (+${engCard.level + 1})` }}</button><button @click="resetEnhanceCard" :disabled="engCard.resetCount >= 3 || engCard.level === 0" class="col-span-1 py-4 bg-neutral-700 hover:bg-red-600 text-white rounded-xl font-bold text-[11px] shadow-md transition-colors disabled:opacity-50 flex flex-col justify-center items-center leading-tight"><span>초기화</span><span v-if="engCard.level > 0" class="text-[10px] text-red-200 mt-1">{{ ENG_COSTS.reset[engCard.grade][engCard.level - 1] }}💎</span></button><button @click="useRefiningStone" :disabled="engCard.level > 0" class="col-span-3 py-3 mt-1 border-2 border-green-500 text-green-600 dark:text-green-400 hover:bg-green-500 hover:text-white rounded-xl font-extrabold text-[13px] transition-colors disabled:opacity-50 disabled:border-neutral-600 disabled:text-neutral-500 disabled:bg-transparent">연성석 사용 (부가 옵션 3개 전체 변경 / 0강 전용)</button></div></div></div>
            <div class="lg:col-span-5 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 shadow-sm flex flex-col relative overflow-y-auto">
              <h3 class="font-extrabold text-sm flex items-center gap-1.5 mb-3 text-blue-700 dark:text-blue-400 border-b border-blue-200 dark:border-blue-800/50 pb-2"><Edit3 class="w-4 h-4"/> 내 인게임 각인 수동 세팅 (에디터)</h3>
              <div v-if="!engCard" class="text-xs text-neutral-500 text-center py-10">각인이 먼저 생성되어야 수정할 수 있습니다.</div>
              <div v-else class="space-y-3">
                <div class="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm text-xs">
                  <div class="font-bold text-neutral-500 mb-2">기본 정보</div>
                  <div class="grid grid-cols-3 gap-2">
                    <div>
                      <label class="block text-[10px] text-neutral-400 mb-1">등급 변경</label>
                      <select v-model="engCard.grade" class="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded p-1.5 font-bold outline-none"><option value="legend">레전드</option><option value="ultimate">얼티밋</option></select>
                    </div>
                    <div>
                      <label class="block text-[10px] text-neutral-400 mb-1">현재 단계</label>
                      <select v-model.number="engCard.level" class="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded p-1.5 font-bold text-blue-600 outline-none"><option v-for="n in 6" :key="n-1" :value="n-1">+{{n-1}}강</option></select>
                    </div>
                    <div>
                      <label class="block text-[10px] text-neutral-400 mb-1">초기화 사용(최대3)</label>
                      <select v-model.number="engCard.resetCount" class="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded p-1.5 font-bold text-red-500 outline-none"><option v-for="n in 4" :key="n-1" :value="n-1">{{n-1}}회 사용</option></select>
                    </div>
                  </div>
                </div>
                
                <div class="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm text-xs"><div class="font-bold text-amber-500 mb-2">메인 옵션 (고유)</div><div class="grid grid-cols-12 gap-2 items-center"><select v-model="engCard.mainName" class="col-span-6 bg-neutral-50 dark:bg-neutral-800 border-none rounded p-1.5 font-bold outline-none"><option v-for="name in ENG_DB.mainTypes" :key="name" :value="name">{{name}}</option></select><input type="number" v-model.number="engCard.mainBase" class="col-span-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded p-1.5 text-center font-bold outline-none" placeholder="기본"><input type="number" v-model.number="engCard.mainBonus" class="col-span-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-1.5 text-center font-bold text-green-600 outline-none" placeholder="추가"></div></div>
                <div class="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm text-xs"><div class="font-bold text-neutral-500 mb-2">부가 옵션 3종</div><div class="space-y-2"><div v-for="(sub, i) in engCard.subStats" :key="i" class="grid grid-cols-12 gap-2 items-center"><select v-model="sub.name" @change="updateSubStatRanges(sub)" class="col-span-6 bg-neutral-50 dark:bg-neutral-800 border-none rounded p-1.5 font-bold outline-none truncate"><option v-for="opt in ENG_DB.subStats" :key="opt.name" :value="opt.name">{{opt.name}}</option></select><input type="number" v-model.number="sub.base" class="col-span-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded p-1.5 text-center font-bold outline-none" placeholder="기본"><input type="number" v-model.number="sub.bonus" class="col-span-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-1.5 text-center font-bold text-green-600 outline-none" placeholder="추가"></div></div></div>
                <div v-if="engCard.grade === 'ultimate'" class="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-purple-200 dark:border-purple-800 shadow-sm text-xs"><div class="font-bold text-purple-500 mb-2">조건부 옵션 (얼티밋)</div><div class="grid grid-cols-12 gap-2 items-center"><select v-model="engCard.pctName" class="col-span-8 bg-purple-50 dark:bg-purple-900/20 border-none rounded p-1.5 font-bold text-purple-700 dark:text-purple-300 outline-none"><option v-for="c in ENG_DB.pctConditions" :key="c" :value="c">{{c}}</option></select><select v-model.number="engCard.pctBase" class="col-span-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded p-1.5 font-bold text-center text-amber-500 outline-none"><option v-for="v in ENG_DB.pctValues" :key="v" :value="v">{{v}}%</option></select></div></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- [탭 2] 강화 시뮬레이터 -->
    <div v-show="activeTab === 'enhance'" class="flex flex-col max-w-6xl mx-auto w-full animate-fade-in">
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

    <!-- [탭 3] 커리어 탭 -->
    <div v-show="activeTab === 'career'" class="flex flex-col w-full animate-fade-in">
      <div class="grid grid-cols-1 xl:grid-cols-[240px_minmax(350px,2fr)_minmax(280px,1.2fr)_minmax(280px,1.2fr)] gap-3 w-full">
        
        <!-- [1구역] 조작부 -->
        <section class="flex flex-col gap-3">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm shrink-0">
            <div class="flex gap-2 mb-3 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
              <button @click="playerType = 'BATTER'" class="flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors" :class="playerType === 'BATTER' ? 'bg-blue-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700'">타자</button>
              <button @click="playerType = 'PITCHER'" class="flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors" :class="playerType === 'PITCHER' ? 'bg-red-500 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700'">투수</button>
            </div>
            
            <select v-model="selectedCardIdx" class="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-2 font-bold text-xs mb-3 outline-none"><option v-for="(type, idx) in CARD_TYPES" :key="type.id" :value="idx">{{ type.name }}</option></select>
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
                <span class="text-neutral-400">소모 CASH</span><span class="font-bold text-purple-400">{{ formatNum(totalCashSpent) }}💎 (교체 메모리: {{ specialSpinCount }}개)</span>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex-1 flex flex-col">
            <h3 class="font-extrabold text-xs flex items-center gap-1.5 mb-2 pb-1.5 border-b border-neutral-100 dark:border-neutral-800"><Edit3 class="w-3.5 h-3.5 text-blue-500"/> 내 상태 인게임 동기화 (수동)</h3>
            <div class="space-y-1.5 flex-1 overflow-y-auto pr-1">
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

        <!-- [2구역] 슬롯 메인창 -->
        <section class="flex flex-col gap-3">
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 flex items-center gap-3 shrink-0 overflow-x-auto min-h-[64px]">
            <span class="text-sm font-extrabold text-blue-700 dark:text-blue-400 shrink-0">적용된 세트:</span>
            <div v-for="(ef, i) in setEffects" :key="i" class="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-bold whitespace-nowrap shadow-sm flex items-center gap-2">
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
                  <span class="truncate pr-2">{{ CURRENT_DATA[slot.optId].name }}</span>
                  <span :class="slot.tier === 3 ? 'text-yellow-600 dark:text-yellow-500 shrink-0' : slot.tier === 2 ? 'text-pink-600 dark:text-pink-500 shrink-0' : slot.tier === 1 ? 'text-blue-600 dark:text-blue-500 shrink-0' : 'text-green-600 dark:text-green-500 shrink-0'">+{{ slot.statVal }}</span>
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

        <!-- [3구역] 정밀 통계 설정 (계산기 폼) -->
        <section class="flex flex-col h-full">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex-1 flex flex-col relative overflow-hidden">
            <h3 class="font-extrabold text-sm flex items-center gap-1.5 mb-2 text-blue-600 dark:text-blue-400"><Target class="w-4 h-4"/> 커리어 정밀 기대값 설정</h3>
            <div class="text-[10px] font-bold text-neutral-500 mb-3 bg-neutral-50 dark:bg-neutral-800 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700">※ 현재 '인게임 동기화' 상태(잠금/등급)를 출발점으로 계산합니다.</div>
            
            <div class="flex gap-2 mb-3">
              <button @click="calcTargetType = 'OPTION'" class="flex-1 py-1.5 text-[11px] font-bold rounded-lg border transition-colors" :class="calcTargetType === 'OPTION' ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent text-neutral-500 border-neutral-300 dark:border-neutral-700'">옵션 목표 달성</button>
              <button @click="calcTargetType = 'TIER'" class="flex-1 py-1.5 text-[11px] font-bold rounded-lg border transition-colors" :class="calcTargetType === 'TIER' ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent text-neutral-500 border-neutral-300 dark:border-neutral-700'">순수 승급 목표</button>
            </div>

            <div class="space-y-3 mb-4 flex-1 overflow-y-auto pr-1">
              <template v-if="calcTargetType === 'OPTION'">
                <div class="bg-neutral-50 dark:bg-neutral-800 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-xs font-bold text-neutral-700 dark:text-neutral-300">목표 옵션 (조합)</span>
                    <button @click="addCalcPreset" class="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-1 rounded font-bold hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex items-center gap-1"><Plus class="w-3 h-3"/>옵션 추가</button>
                  </div>
                  <div class="space-y-1.5">
                    <div v-for="(preset, idx) in calcPresets" :key="preset.id" class="flex gap-1.5 items-center">
                      <select v-model="preset.optId" class="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-1.5 text-[11px] font-bold outline-none truncate cursor-pointer"><option v-for="(opt, i) in CURRENT_DATA" :key="i" :value="i">{{opt.name}}</option></select>
                      <select v-model.number="preset.count" class="w-14 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-1.5 text-xs font-bold outline-none text-center cursor-pointer"><option v-for="n in 6" :key="n" :value="n">{{n}}개</option></select>
                      <button @click="removeCalcPreset(idx)" class="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 class="w-4 h-4"/></button>
                    </div>
                    <div v-if="calcPresets.length === 0" class="text-[10px] text-center text-neutral-400 py-2">목표 옵션을 추가해주세요.</div>
                  </div>
                </div>

                <div class="space-y-2">
                  <label class="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800/50 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                    <input type="checkbox" v-model="requireAllMaster" class="mt-0.5 w-3.5 h-3.5 accent-blue-600 shrink-0">
                    <div class="flex flex-col">
                      <span class="text-[11px] font-extrabold text-blue-800 dark:text-blue-300">목표 옵션을 모두 '마스터 등급'으로 달성 (기본)</span>
                      <span class="text-[9px] font-medium text-blue-600 dark:text-blue-400 mt-0.5 leading-tight">체크 해제 시 엠블럼 모양만 맞으면 달성으로 인정합니다.</span>
                    </div>
                  </label>

                  <label class="flex items-start gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800/50 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors">
                    <input type="checkbox" v-model="useSpecialSlot" class="mt-0.5 w-3.5 h-3.5 accent-purple-600 shrink-0">
                    <div class="flex flex-col">
                      <span class="text-[11px] font-extrabold text-purple-800 dark:text-purple-300">특별 슬롯을 우선 돌려 목표 하나 선점 (메모리 소모)</span>
                    </div>
                  </label>

                  <div class="flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                    <span class="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 w-12 shrink-0">잠금 전략:</span>
                    <select v-model.number="calcLockStrategy" class="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-1.5 text-[10px] font-bold outline-none cursor-pointer truncate">
                      <option :value="1">1개라도 뜨면 즉시 잠금 (AP 절약, CASH 큼)</option>
                      <option :value="2">2개 이상 동시 출현 시 잠금 (밸런스형)</option>
                      <option :value="3">3개 이상 동시 출현 시 잠금 (AP 극대화, CASH 절약)</option>
                    </select>
                  </div>
                </div>
              </template>

              <template v-else>
                <div class="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm flex items-center gap-3">
                  <span class="text-xs font-bold text-neutral-700 dark:text-neutral-300 shrink-0">목표 등급:</span>
                  <select v-model.number="calcTierTarget.tier" class="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-1.5 text-xs font-bold outline-none cursor-pointer">
                    <option :value="3">마스터</option><option :value="2">프로</option><option :value="1">엘리트</option>
                  </select>
                  <select v-model.number="calcTierTarget.count" class="w-16 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-1.5 text-xs font-bold outline-none text-center cursor-pointer">
                    <option v-for="n in 5" :key="n" :value="n">{{n}}개</option>
                  </select>
                </div>
              </template>

              <div class="bg-blue-50 dark:bg-blue-900/10 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800/50 shadow-sm">
                <div class="text-[10px] font-extrabold text-blue-700 dark:text-blue-400 mb-1.5 leading-tight">보유 중인 승급 메모리 최우선 투입 (병목 스킵)</div>
                <div class="flex gap-2">
                  <div class="flex-1 flex flex-col gap-1"><label class="text-[9px] text-neutral-500 font-bold text-center">엘리트</label><input type="number" v-model.number="userMemories.elite" min="0" class="w-full text-center text-xs font-bold p-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 outline-none focus:border-blue-500"></div>
                  <div class="flex-1 flex flex-col gap-1"><label class="text-[9px] text-neutral-500 font-bold text-center">프로</label><input type="number" v-model.number="userMemories.pro" min="0" class="w-full text-center text-xs font-bold p-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 outline-none focus:border-blue-500"></div>
                  <div class="flex-1 flex flex-col gap-1"><label class="text-[9px] text-neutral-500 font-bold text-center">마스터</label><input type="number" v-model.number="userMemories.master" min="0" class="w-full text-center text-xs font-bold p-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 outline-none focus:border-blue-500"></div>
                </div>
              </div>
              
              <div class="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <span class="text-[10px] font-bold text-neutral-500 shrink-0 w-16">가상 시행:</span>
                <select v-model.number="calcIterations" class="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-1.5 text-[11px] font-bold outline-none cursor-pointer">
                  <option :value="1000">1,000 번 (빠름)</option><option :value="10000">10,000 번 (권장)</option>
                  <option :value="50000">50,000 번</option><option :value="100000">100,000 번 (초정밀)</option>
                </select>
              </div>
            </div>

            <button @click="runExpectedValueCalc" :disabled="isCalculating" class="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-extrabold text-sm shadow-md transition-transform active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50 shrink-0 mt-auto">
              <BarChart class="w-4 h-4"/> 
              {{ isCalculating ? '데이터 수집 중...' : `시뮬레이션 가동 (${formatNum(calcIterations)}회)` }}
            </button>
          </div>
        </section>

        <!-- [4구역] 결과창 (차트 & 운세) -->
        <section class="flex flex-col h-full gap-3">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex-1 flex flex-col relative overflow-hidden" v-if="calcResult || isCalculating">
            
            <div class="mb-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 shadow-inner">
              <div class="flex justify-between gap-1 mb-3">
                <button @click="resultViewMode = 'TOP10'" class="flex-1 py-1.5 text-[10px] font-bold rounded border transition-colors" :class="resultViewMode === 'TOP10' ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-500'">상위 10% (비틱)</button>
                <button @click="resultViewMode = 'AVG'" class="flex-1 py-1.5 text-[10px] font-bold rounded border transition-colors" :class="resultViewMode === 'AVG' ? 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-500'">평균 (상위 50%)</button>
                <button @click="resultViewMode = 'BOT90'" class="flex-1 py-1.5 text-[10px] font-bold rounded border transition-colors" :class="resultViewMode === 'BOT90' ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-300' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-500'">하위 90% (천장)</button>
              </div>
              
              <div v-if="calcResult" class="space-y-1">
                <div class="flex justify-between items-center px-1 py-1">
                  <span class="text-[11px] font-extrabold" :class="{'text-blue-600': resultViewMode==='TOP10', 'text-indigo-600': resultViewMode==='AVG', 'text-red-600': resultViewMode==='BOT90'}">소모 AP</span>
                  <span class="text-sm font-black" :class="{'text-blue-600': resultViewMode==='TOP10', 'text-indigo-600': resultViewMode==='AVG', 'text-red-600': resultViewMode==='BOT90'}">{{ formatNum(resultViewMode === 'TOP10' ? calcResult.top10.ap : resultViewMode === 'AVG' ? calcResult.avg.ap : calcResult.bot90.ap) }} <span class="text-[9px] font-normal text-neutral-500">AP</span></span>
                </div>
                
                <div v-if="calcTargetType === 'OPTION' && (resultViewMode === 'TOP10' ? calcResult.top10.cash : resultViewMode === 'AVG' ? calcResult.avg.cash : calcResult.bot90.cash) > 0" class="flex justify-between items-center px-1 py-1 bg-purple-50 dark:bg-purple-900/20 rounded">
                  <span class="text-[10px] font-bold text-purple-600 dark:text-purple-400">소모 CASH (잠금)</span>
                  <span class="text-xs font-black text-purple-600 dark:text-purple-400">{{ formatNum(resultViewMode === 'TOP10' ? calcResult.top10.cash : resultViewMode === 'AVG' ? calcResult.avg.cash : calcResult.bot90.cash) }} <span class="text-[8px] font-normal">💎</span></span>
                </div>
                
                <div v-if="calcTargetType === 'OPTION' && (resultViewMode === 'TOP10' ? calcResult.top10.sr : resultViewMode === 'AVG' ? calcResult.avg.sr : calcResult.bot90.sr) >= 0" class="flex justify-between items-center px-1 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded">
                  <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">특별 교체 메모리 소모</span>
                  <span class="text-xs font-black text-emerald-600 dark:text-emerald-400">{{ formatNum(resultViewMode === 'TOP10' ? calcResult.top10.sr : resultViewMode === 'AVG' ? calcResult.avg.sr : calcResult.bot90.sr) }} <span class="text-[8px] font-normal">개</span></span>
                </div>
              </div>
              <div v-else class="text-center text-neutral-400 text-xs py-4 font-bold">통계 계산 중...</div>

              <div class="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                <div class="text-[10px] font-extrabold text-neutral-600 dark:text-neutral-400 mb-1.5 flex items-center gap-1"><Search class="w-3 h-3"/> 내 운세 (백분위) 판독기</div>
                <div class="flex gap-2">
                  <input type="number" v-model.number="userSpentAp" placeholder="실제 소모한 AP 입력" class="flex-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg p-1.5 text-[10px] font-bold outline-none focus:border-indigo-500">
                  <button @click="checkMyLuck" class="px-3 bg-neutral-800 dark:bg-neutral-700 text-white rounded-lg text-[10px] font-bold hover:bg-black transition-colors shrink-0">결과 확인</button>
                </div>
                <div v-if="myLuckPercentile !== null" class="mt-2 text-center text-[11px] font-extrabold bg-white dark:bg-neutral-900 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  상위 <span :class="myLuckPercentile <= 10 ? 'text-blue-500' : myLuckPercentile >= 90 ? 'text-red-500' : 'text-indigo-500'">{{ myLuckPercentile }}%</span> 입니다! <span class="ml-1 font-medium text-neutral-500 truncate">{{ luckTitle }}</span>
                </div>
              </div>
            </div>

            <div class="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-2 min-h-[200px] relative flex flex-col shadow-inner">
              <div class="text-[9px] font-bold text-neutral-400 mb-1 text-center">AP 소모량 누적 확률 분포도 (1회 성공 확률: {{ calcResult?.oneTryProb.toFixed(4) || 0 }}%)</div>
              <div class="relative flex-1 w-full h-full">
                <canvas ref="chartCanvas"></canvas>
              </div>
            </div>
          </div>
          
          <div v-else class="bg-neutral-50 dark:bg-neutral-800 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-4 flex-1 flex flex-col items-center justify-center text-neutral-400">
             <BarChart class="w-8 h-8 mb-2 opacity-30"/>
             <span class="text-xs font-bold text-center leading-relaxed">시뮬레이션을 가동하면<br>초정밀 통계가 표시됩니다.</span>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

/* 커스텀 스크롤바 */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
.dark ::-webkit-scrollbar-thumb { background: #334155; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
.dark ::-webkit-scrollbar-thumb:hover { background: #475569; }
</style>
