<script setup lang="ts">
import { ref, computed, watch, reactive, onMounted, nextTick } from 'vue'
import { 
  Zap, RefreshCw, ArrowRight, Check, X, Calculator, History, 
  Lock, Unlock, Play, Star, Settings, Pause, Edit3, Target, BarChart, Info, Gem, RefreshCcw, Plus, Trash2, Search,
  Calendar, Wallet, ShoppingCart, Package, RotateCcw
} from 'lucide-vue-next'

const activeTab = ref<'enhance' | 'career' | 'engraving' | 'dignity'>('dignity')

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
// ⚡ [1] 강화 시뮬레이터 (리얼리티 엔진)
// ==============================================
// 각 구간별 [기본 확률, 실패 시 추가 확률] 데이터셋
const ENH_BASE: Record<number, { b: number, i: number }> = {
  0: { b: 100, i: 0 }, 1: { b: 80, i: 8 }, 2: { b: 60, i: 6 }, 3: { b: 50, i: 5 }, 4: { b: 40, i: 4 }, 
  5: { b: 30, i: 3 }, 6: { b: 20, i: 2 }, 7: { b: 10, i: 1 }, 8: { b: 7.5, i: 0.75 }, 
  9: { b: 5, i: 2.5 }, 10: { b: 5, i: 2.5 }, 11: { b: 5, i: 2.5 }, 12: { b: 5, i: 2.5 }, 
  13: { b: 5, i: 2.5 }, 14: { b: 5, i: 2.5 }
};

// 특정 레벨 1업을 위한 통계적 기댓값(장) 계산 헬퍼 함수
const getStepEV = (lv: number) => {
  if (lv >= 15) return 0;
  let { b, i: inc } = ENH_BASE[lv];
  let ev = 0; let pReach = 1.0;
  for(let t = 1; t <= 300; t++) {
    let cur = Math.min(100, b + inc * (t - 1)) / 100;
    ev += t * pReach * cur;
    pReach *= (1 - cur);
    if(pReach < 1e-8) break;
  }
  return ev;
};

// 0강부터 n강까지의 누적 기댓값 배열 캐싱
const EV_CUMULATIVE = [0];
let _cum = 0;
for(let i = 0; i <= 14; i++) { _cum += getStepEV(i); EV_CUMULATIVE.push(_cum); }

// 강화 상태 관리 반응형 객체
const enhState = reactive({
  cards: 100,        // 보유 카드
  startLv: 11,       // 팩트 체크 시작점 (초기화 기준)
  curLv: 11,         // 현재 강화 단계
  targetLv: 15,      // 목표 강화 단계
  extraProb: 0.0,    // 현재 쌓인 추가 확률
  usedCount: 0,      // 현재 시작점부터 쓴 카드 수
  logs: [] as { id: number, type: string, from: number, to: number, prob: string, used: number }[]
});

// 강제 초기화 (인게임 리셋권)
const enhReset = () => {
  enhState.curLv = enhState.startLv;
  enhState.extraProb = 0.0;
  enhState.usedCount = 0;
  enhState.logs = [];
}

// 시작 단계가 변경되면 기댓값 측정을 위해 강제 리셋
watch(() => enhState.startLv, () => { enhReset(); });

// 🔥 실시간 기댓값 비교 연산기
const enhCalcDiff = computed(() => {
  if (enhState.curLv <= enhState.startLv) return { expected: 0, diff: 0, text: '기록이 없습니다.', color: 'text-slate-400 dark:text-neutral-500' };
  let expected = EV_CUMULATIVE[enhState.curLv] - EV_CUMULATIVE[enhState.startLv];
  let diff = expected - enhState.usedCount;
  
  if (diff > 0) return { expected, diff, text: `평균보다 ${diff.toFixed(1)}장 덜 썼습니다! (개이득 🍀)`, color: 'text-blue-600 dark:text-blue-400 font-bold' };
  else if (diff < 0) return { expected, diff, text: `평균보다 ${Math.abs(diff).toFixed(1)}장 더 썼습니다 (억까 😭)`, color: 'text-red-600 dark:text-red-500 font-bold' };
  return { expected, diff, text: `정확히 평균 수준입니다. (무난)`, color: 'text-green-600 dark:text-green-500 font-bold' };
});

const doEnhance = (isAuto: boolean) => {
  let loopCount = 0;
  if (enhState.curLv >= 15) return alert("이미 최대 강화(+15) 상태입니다.");
  
  while (true) {
    if (enhState.cards <= 0) { alert("보유 카드가 모두 소진되었습니다! (파산)"); break; }
    if (enhState.curLv >= enhState.targetLv) { if (isAuto) alert(`목표 강화(+${enhState.targetLv})에 도달하여 자동 강화를 멈춥니다!`); break; }

    enhState.cards--;
    enhState.usedCount++;
    let { b, i: inc } = ENH_BASE[enhState.curLv];
    let currentProb = b + enhState.extraProb;
    if (currentProb > 100) currentProb = 100;

    let roll = Math.random() * 100;
    let success = roll < currentProb;

    if (success) {
      enhState.logs.unshift({ id: Date.now() + loopCount, type: 'success', from: enhState.curLv, to: enhState.curLv + 1, prob: currentProb.toFixed(1), used: enhState.usedCount });
      enhState.curLv++;
      enhState.extraProb = 0.0;
      if (!isAuto) break; // 수동이면 1번 멈춤
    } else {
      enhState.logs.unshift({ id: Date.now() + loopCount, type: 'fail', from: enhState.curLv, to: enhState.curLv, prob: currentProb.toFixed(1), used: enhState.usedCount });
      enhState.extraProb += inc;
      if (!isAuto) break; // 수동이면 1번 멈춤
    }

    if (enhState.logs.length > 300) enhState.logs.pop();
    loopCount++;
    if (isAuto && loopCount > 2000) break; // 무한루프 방지
  }
}

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

// ==============================================
// 💎 [4] 디그니티 시뮬레이터 전용 로직
// ==============================================
const TEAMS = ['kia', 'ssg', 'kiwoom', 'samsung', 'doosan', 'lg', 'hanwha', 'lotte', 'hyundai', 'kt', 'sbw', 'nc']
const T_NAMES: Record<string, string> = { kia:'KIA', ssg:'SSG', kiwoom:'키움', samsung:'삼성', doosan:'두산', lg:'LG', hanwha:'한화', lotte:'롯데', hyundai:'현대', kt:'KT', sbw:'쌍방울', nc:'NC' }
const T_COLORS: Record<string, string> = { kia:'text-red-600 dark:text-red-500', ssg:'text-red-600 dark:text-red-500', kiwoom:'text-rose-800 dark:text-rose-700', samsung:'text-blue-700 dark:text-blue-500', doosan:'text-indigo-800 dark:text-indigo-400', lg:'text-pink-700 dark:text-pink-500', hanwha:'text-orange-600 dark:text-orange-500', lotte:'text-cyan-800 dark:text-cyan-600', hyundai:'text-green-700 dark:text-green-500', kt:'text-slate-800 dark:text-white', sbw:'text-yellow-700 dark:text-yellow-500', nc:'text-blue-500 dark:text-blue-400' }

const D_WAVES: Record<number, Record<string, string>> = {
  1: { kia:'홍현우', ssg:'최정', kiwoom:'이블렉', samsung:'양준혁', doosan:'박건우', lg:'류지현', hanwha:'장종훈', lotte:'이대호', hyundai:'박재홍', kt:'강백호', sbw:'박노준', nc:'나성범' },
  2: { kia:'이종범', nc:'테이준', hyundai:'심정수', samsung:'구자욱', sbw:'김기태', doosan:'김동주', lg:'박용택', hanwha:'김태균', kiwoom:'박병호', lotte:'조성환', kt:'로하스', ssg:'박경완' },
  3: { hanwha:'폰세', ssg:'앤더슨', nc:'페디', kia:'네일', samsung:'밴덴헐크', lotte:'스트레일리', doosan:'린드블럼', hyundai:'임선동', lg:'소사', sbw:'김원형', kt:'데스파이네', kiwoom:'나이트' },
  4: { samsung:'오승환', sbw:'조규제', ssg:'박희수', doosan:'정재훈', kia:'임에렉', kt:'김재윤', hyundai:'정명원', kiwoom:'손승락', hanwha:'박정진', nc:'임창민', lotte:'손승락', lg:'김용수' },
  5: { kt:'안현민', kiwoom:'강정호', lotte:'호식', doosan:'김현수', kia:'김도영', lg:'오스틴', ssg:'정근우', hyundai:'브로빈', samsung:'이승엽', hanwha:'송지만', nc:'박민우', sbw:'최태원' }
}

const TOP_DB: Record<string, string[]> = {
  kia: ['선동열', '이종범', '홍현우', '윤석민', '장성호', '이강철', '김성한', '조계현', '최형우', '양현종', '이순철', '이범호', '안치홍', '김선빈', '임에렉', '나성범', '김정수', '유동훈', '장채근'],
  ssg: ['최정', '김광현', '박희수', '에레디아', '정근우', '이진영', '브레띵', '정우람', '이승호', '채병용', '박재홍', '박경완', '이호준', '로맥', '켈리', '정대현', '김재현', '이재원', '박종훈'],
  kiwoom: ['이블렉', '안우진', '강정호', '박병호', '송성문', '서건창', '요키시', '김혜성', '김블렉', '이택근', '유한준', '브리검', '밴헤켄', '최원태', '조상우', '손승락', '한현희', '박동원'],
  samsung: ['오승환', '장효조', '양준혁', '이만수', '최형우', '이승엽', '구자욱', '김시진', '박석민', '김성래', '김일융', '박한이', '배영수', '강민호', '김상엽', '원태인', '김현욱', '권혁', '류중일'],
  doosan: ['양의지', '김현수', '김동주', '김상진', '박철순', '박명환', '니퍼트', '정재훈', '심정수', '김재환', '김경원', '박종훈', '박건우', '우준', '안경현', '홍성흔', '장원준', '김재호', '진필중'],
  lg: ['이병규', '이상훈', '오스틴', '김현수', '류지현', '켈리', '김동수', '김재현', '김태원', '박용택', '정성훈', '고우석', '임찬규', '윌슨', '이진영', '오지환', '김상훈', '김용수', '봉중근'],
  hanwha: ['이정훈', '정민철', '류현진', '장종훈', '김태균', '한용덕', '구대성', '데임병수', '이범호', '송진우', '이영우', '한희민', '송지만', '정근우', '정우람', '이강돈', '박정진', '강석천', '유승안'],
  lotte: ['최동원', '이대호', '호식', '주형광', '박정태', '손아섭', '마해영', '윤학길', '손민한', '전준우', '전준호', '황재균', '김용희', '강민호', '홍성흔', '박세웅', '강상수', '박석진', '임경완'],
  hyundai: ['심정수', '박재홍', '최창호', '김수경', '브로빈', '정민태', '박종호', '박정현', '전준호', '이숭용', '정성훈', '박경완', '박진만', '김동기', '정명원', '조웅천', '장명부', '조용준', '김경기'],
  kt: ['로하스', '쿠에바스', '소형준', '강백호', '김재윤', '엄상백', '고영표', '유한준', '황재균', '박영현', '피어밴드', '장성우', '박경수', '주권', '배정대'],
  sbw: ['김기태', '조규제', '조원우', '최태원', '김광림', '성영재', '김현욱', '김원형', '박경완', '심성보', '박성기', '김기덕'],
  nc: ['테이준', '양의지', '박건우', '박민우', '해커', '루친스키', '구창모', '나성범', '이재학', '원종현', '김진성', '임창민', '박석민', '김주원', '노진혁']
}
const ALL_TOPS = Object.entries(TOP_DB).flatMap(([t, players]) => players.map(p => ({ team: t, name: p })))

const dgnState = reactive({
  month: 1, myTeam: 'kia', targetWave: 5,
  inv: { normal: 0, pickup: 0, tickets: 0, myDgn: 0, myTop: 0, otherTop: 0, cash: 0 },
  album: Object.fromEntries(TEAMS.map(t => [t, 0])),
  topAlbum: Object.fromEntries(TEAMS.map(t => [t, Object.fromEntries(TOP_DB[t].map(p => [p, 0]))])),
  shop: { wQ: 0, wC: 0, sp: 0, rk: 0, pt: 0, pk: 0, pr: 0, lg: 0, unl: 0 }, 
  payback: { spent: 0, totalKrw: 0, t1: false, t2: false, t3: false, t4: false, inf: 0 }, 
  pity: { pack: 50, trade: 30 },
  logs: [] as { id: number, msg: string, type: string }[]
})

// 도감 ON/OFF 및 수량 조절
const toggleDgnAlbum = (t: string) => { 
  if (dgnState.album[t] === 0) dgnState.album[t] = 1; 
  else dgnState.album[t] = 0;
}
const incDgnAlbum = (t: string) => { dgnState.album[t]++ }
const decDgnAlbum = (t: string) => { 
  if(dgnState.album[t] > 1) dgnState.album[t]--; 
  else if(dgnState.album[t] === 1) dgnState.album[t] = 0; 
}
const turnOnAllAlbum = () => { TEAMS.forEach(t => { if(t !== dgnState.myTeam) dgnState.album[t] = Math.max(1, dgnState.album[t]); }) }
const turnOffAllAlbum = () => { TEAMS.forEach(t => { if(t !== dgnState.myTeam) dgnState.album[t] = 0; }) }

const dgnWaitlist = computed(() => {
  let list: string[] = []; TEAMS.forEach(t => { if(t !== dgnState.myTeam && dgnState.album[t] > 1) list.push(`${T_NAMES[t]} ${D_WAVES[dgnState.targetWave][t]} (${dgnState.album[t]-1}장)`) }); return list;
})
const topWaitlist = computed(() => {
  let list: string[] = []; TEAMS.forEach(t => { if(t !== dgnState.myTeam) { TOP_DB[t].forEach(p => { if(dgnState.topAlbum[t][p] > 0) list.push(`[${T_NAMES[t]}] ${p} (${dgnState.topAlbum[t][p]}장)`) }) } }); return list;
})

const manualKrwInput = ref(0)
const previewTotalKrw = computed(() => dgnState.payback.totalKrw + (manualKrwInput.value || 0))
const previewSpentKrw = computed(() => dgnState.payback.spent + (manualKrwInput.value || 0))

const dgnAlbumTab = ref<'dignity'|'top'>('dignity')

let dgnLId = 0
const dgnLog = (msg: string, type: 'normal'|'success'|'fail'|'action'|'epic' = 'normal') => { 
  dgnState.logs.unshift({ id: dgnLId++, msg, type })
  if(dgnState.logs.length > 50) dgnState.logs.pop() 
}

const dgnResetAll = () => {
  if(!confirm("모든 시뮬레이션 데이터를 초기화하시겠습니까?")) return
  dgnState.month = 1; dgnState.inv = { normal: 0, pickup: 0, tickets: 0, myDgn: 0, myTop: 0, otherTop: 0, cash: 0 }
  TEAMS.forEach(t => dgnState.album[t] = 0)
  TEAMS.forEach(t => TOP_DB[t].forEach(p => dgnState.topAlbum[t][p] = 0))
  dgnState.shop = { wQ: 0, wC: 0, sp: 0, rk: 0, pt: 0, pk: 0, pr: 0, lg: 0, unl: 0 }
  dgnState.payback = { spent: 0, totalKrw: 0, t1: false, t2: false, t3: false, t4: false, inf: 0 }
  dgnState.pity = { pack: 50, trade: 30 }; dgnState.logs = []
  dgnLog(`[시스템] 데이터가 완벽히 리셋되었습니다.`, 'action')
}

const dgnNextMonth = () => {
  dgnState.month++
  dgnState.shop = { wQ: 0, wC: 0, sp: 0, rk: 0, pt: 0, pk: 0, pr: 0, lg: 0, unl: 0 }
  dgnState.payback = { spent: 0, totalKrw: dgnState.payback.totalKrw, t1: false, t2: false, t3: false, t4: false, inf: dgnState.payback.inf } 
  dgnLog(`🗓️ ${dgnState.month}개월 차 시작! 월간 상점 및 페이백이 갱신되었습니다.`, 'action')
}

watch(() => dgnState.targetWave, () => { 
  TEAMS.forEach(t => dgnState.album[t] = 0)
  dgnLog(`[시스템] ${dgnState.targetWave}차 도감으로 전환되었습니다.`, 'action') 
})

const dgnDupeCount = computed(() => { 
  let c=0; TEAMS.forEach(t=>{ if(t!==dgnState.myTeam && dgnState.album[t]>1) c+=dgnState.album[t]-1 })
  return c 
})

const dgnProcessPayback = () => {
  const k = dgnState.payback.spent; const tk = dgnState.payback.totalKrw; const p = dgnState.payback
  if (k >= 9900 && !p.t1) { p.t1 = true; dgnState.inv.normal++; dgnLog(`[페이백] 9,900원 누적! 일반팩 지급`, 'success') }
  if (k >= 99000 && !p.t2) { p.t2 = true; dgnState.inv.pickup++; dgnLog(`[페이백] 99,000원 누적! 픽업팩 지급`, 'success') }
  if (k >= 199000 && !p.t3) { p.t3 = true; dgnState.inv.normal++; dgnLog(`[페이백] 199,000원 누적! 일반팩 지급`, 'success') }
  if (k >= 299000 && !p.t4) { p.t4 = true; dgnState.inv.normal++; dgnLog(`[페이백] 299,000원 누적! 일반팩 지급`, 'success') }
  let nextInf = (p.inf + 1) * 300000
  while (tk >= nextInf) { p.inf++; dgnState.inv.tickets += 9; dgnLog(`[무한 페이백] 총 ${tk.toLocaleString()}원 달성! 트레이드권 9개 지급!`, 'epic'); nextInf = (p.inf + 1) * 300000 }
}

const dgnAddManualPayback = () => { 
  if(manualKrwInput.value <= 0) return
  dgnState.payback.spent += manualKrwInput.value
  dgnState.payback.totalKrw += manualKrwInput.value
  dgnLog(`[수동 충전] 타 패키지로 ${manualKrwInput.value.toLocaleString()}원 채움 완료!`, 'action')
  manualKrwInput.value = 0
  dgnProcessPayback() 
}

const dgnBuyPkg = (key: keyof typeof dgnState.shop, limit: number, price: number, n: number, p: number, t: number, name: string, isCash: boolean = false, purchaseCount: number = 1) => {
  if (limit < 999 && dgnState.shop[key] + purchaseCount > limit) return alert(`남은 구매 가능 횟수가 부족합니다. (남은 횟수: ${limit - dgnState.shop[key]}회)`)
  if (isCash) { dgnState.inv.cash += (price * purchaseCount) } 
  else { 
    dgnState.payback.spent += (price * purchaseCount); 
    dgnState.payback.totalKrw += (price * purchaseCount); 
  }
  dgnState.shop[key] += purchaseCount
  dgnState.inv.normal += (n * purchaseCount); dgnState.inv.pickup += (p * purchaseCount); dgnState.inv.tickets += (t * purchaseCount)
  dgnLog(`[상점] ${name} ${purchaseCount}회 구매! (${isCash?'캐시 누적':'원화'}: ${price * purchaseCount}${isCash?'💎':'원'})`, 'action')
  if(!isCash) dgnProcessPayback()
}

const dgnOpenPack = (count: number) => {
  if (dgnState.inv.normal < count) return alert("일반팩이 부족합니다.")
  dgnState.inv.normal -= count; 
  dgnState.inv.tickets += (count * 2); 
  for (let i=0; i<count; i++) {
    for (let j=0; j<8; j++) {
      if (Math.random() < 0.03) {
        let t = TEAMS[Math.floor(Math.random()*12)], pn = D_WAVES[dgnState.targetWave][t]
        if (t === dgnState.myTeam) { dgnState.inv.myDgn++; dgnLog(`✨[기적] 일반팩에서 자팀 ${pn} 등장!✨`, 'epic') }
        else { dgnState.album[t]++; dgnLog(`[획득] 타팀 ${T_NAMES[t]} ${pn} 획득!`, 'success') }
      } else {
        let top = ALL_TOPS[Math.floor(Math.random()*212)]
        if (top.team === dgnState.myTeam) { dgnState.inv.myTop++; dgnState.topAlbum[top.team][top.name]++ }
        else { dgnState.inv.otherTop++; dgnState.topAlbum[top.team][top.name]++ }
      }
    }
    dgnState.pity.pack--; 
    if(dgnState.pity.pack <= 0) {
      dgnState.inv.myDgn++; dgnLog(`🎉[팩 천장] 선택권으로 자팀 디그니티 확정 획득!`, 'epic')
      dgnState.pity.pack = 50 
    }
  }
}

const dgnOpenPickup = () => {
  if (dgnState.inv.pickup < 1) return alert("픽업팩이 부족합니다.")
  dgnState.inv.pickup--; 
  let t = TEAMS[Math.floor(Math.random()*12)], pn = D_WAVES[dgnState.targetWave][t]
  if (t === dgnState.myTeam) { dgnState.inv.myDgn++; dgnLog(`✨[픽업] 자팀 ${pn} 100% 확정 등장!✨`, 'epic') }
  else { dgnState.album[t]++; dgnLog(`[픽업] 타팀 ${T_NAMES[t]} ${pn} 획득.`, 'success') }
}

const dgnDistinctDgnCount = computed(() => TEAMS.filter(t => t !== dgnState.myTeam && dgnState.album[t] > 1).length)
const dgnDistinctTopCount = computed(() => { let count = 0; TEAMS.forEach(t => { if (t !== dgnState.myTeam) { TOP_DB[t].forEach(p => { if (dgnState.topAlbum[t][p] > 0) count++ }) } }); return count; })

const dgnRunMixer = () => {
  let cnt = 0
  while (true) {
    let dgnDupes = TEAMS.filter(t => t !== dgnState.myTeam && dgnState.album[t] > 1)
    if (dgnDupes.length >= 3 && dgnState.inv.tickets >= 1) {
      dgnState.album[dgnDupes[0]]--; dgnState.album[dgnDupes[1]]--; dgnState.album[dgnDupes[2]]--;
      dgnState.inv.tickets--; dgnState.pity.trade--; cnt++ 
      let t = TEAMS[Math.floor(Math.random()*12)], pn = D_WAVES[dgnState.targetWave][t]
      if (t === dgnState.myTeam) { dgnState.inv.myDgn++; dgnLog(`[믹서기] 대박! 자팀 ${pn} 디그니티 획득! (8.3%)`, 'epic') } else { dgnState.album[t]++; dgnLog(`[믹서기] 타팀 ${T_NAMES[t]} ${pn} 획득...`, 'normal') }
      if (dgnState.pity.trade <= 0) { dgnState.inv.myDgn++; dgnLog(`🎉[트레이드 천장] 선택권으로 자팀 확정 획득!`, 'epic'); dgnState.pity.trade = 30 } 
      continue; 
    }
    let topDupes: {t:string, p:string}[] = []
    TEAMS.forEach(t => { if (t !== dgnState.myTeam) { TOP_DB[t].forEach(p => { if (dgnState.topAlbum[t][p] > 0) topDupes.push({t, p}) }) } })
    if (topDupes.length >= 3 && dgnState.inv.tickets >= 1) {
      dgnState.topAlbum[topDupes[0].t][topDupes[0].p]--; dgnState.topAlbum[topDupes[1].t][topDupes[1].p]--; dgnState.topAlbum[topDupes[2].t][topDupes[2].p]--;
      dgnState.inv.otherTop -= 3; dgnState.inv.tickets--; cnt++ 
      if (Math.random() < 0.03) {
        let t = TEAMS[Math.floor(Math.random()*12)], pn = D_WAVES[dgnState.targetWave][t]
        if (t === dgnState.myTeam) { dgnState.inv.myDgn++; dgnLog(`🔥[TOP 3% 기적] 자팀 ${pn} 디그니티 획득!`, 'epic') } else { dgnState.album[t]++; dgnLog(`🔥[TOP 3% 기적] 타팀 ${T_NAMES[t]} ${pn} 획득!`, 'success') }
      } else {
        let top = ALL_TOPS[Math.floor(Math.random()*212)]; if (top.team === dgnState.myTeam) { dgnState.inv.myTop++; dgnState.topAlbum[top.team][top.name]++ } else { dgnState.inv.otherTop++; dgnState.topAlbum[top.team][top.name]++ }
        dgnLog(`[믹서기] TOP 재료 소모... (꽝)`, 'normal')
      }
      continue; 
    }
    break; 
  }
  if(cnt===0) alert("재료(서로 다른 잉여카드 3종류) 또는 티켓이 부족합니다.")
}

const dgnOpenPerfect = (count: number) => {
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < 8; j++) {
      let top = ALL_TOPS[Math.floor(Math.random() * 212)]
      if (top.team === dgnState.myTeam) { dgnState.inv.myTop++; dgnState.topAlbum[top.team][top.name]++ } else { dgnState.inv.otherTop++; dgnState.topAlbum[top.team][top.name]++ }
    }
  }
  dgnLog(`[파이브스타 퍼펙트 팩] ${count}팩 개봉 (TOP ${count * 8}장 획득!)`, 'action')
}

// 플래너 변수 및 기댓값 계산식 (시즌패스 sp 추가)
const dgnPlan = reactive({ target: 11, otherMonthlyKrw: 0, wQ: true, wC: 40, sp: 0, rk: 0, pt: 0, pk: 0, pr: 0, lg: 0, unl: 0 })
const dgnPlanTotalKrw = computed(() => dgnPlan.sp*55000 + dgnPlan.rk*55000 + dgnPlan.pt*99000 + dgnPlan.pk*99000 + dgnPlan.pr*99000 + dgnPlan.lg*149000 + dgnPlan.unl*55000 + (dgnPlan.otherMonthlyKrw || 0) )
const dgnPlanPureKrw = computed(() => dgnPlan.sp*55000 + dgnPlan.rk*55000 + dgnPlan.pt*99000 + dgnPlan.pk*99000 + dgnPlan.pr*99000 + dgnPlan.lg*149000 + dgnPlan.unl*55000 )

const dgnSimResult = ref<any>(null); const isDgnSim = ref(false)
const dgnSimRawResults = ref<any[]>([]); const dgnResultViewMode = ref<'TOP10'|'AVG'|'BOT90'>('AVG')
const dgnChartCanvas = ref<HTMLCanvasElement | null>(null); let dgnChartInstance: any = null
const dgnUserSpentKrw = ref<number | null>(null); const dgnMyLuckPercentile = ref<number | null>(null); const dgnLuckTitle = ref('')

const renderDgnChart = (data: number[], isMonth: boolean) => {
  if (!ChartObj || !dgnChartCanvas.value) return
  if (dgnChartInstance) dgnChartInstance.destroy()
  const p99 = data[Math.floor(data.length * 0.99)] || data[data.length - 1]
  const filteredData = data.filter(d => d <= p99)
  const min = filteredData[0] || 0; const max = filteredData[filteredData.length - 1] || 1
  const binCount = 40; const binSize = (max - min) / binCount || 1
  const bins = Array(binCount).fill(0)
  filteredData.forEach(val => { let idx = Math.floor((val - min) / binSize); if (idx >= binCount) idx = binCount - 1; bins[idx]++ })
  const labels = bins.map((_, i) => formatNum(Math.round(min + (i + 0.5) * binSize)))
  let cdfSum = 0; const cdf = bins.map(count => { cdfSum += count; return (cdfSum / data.length) * 100 })
  dgnChartInstance = new ChartObj(dgnChartCanvas.value, {
    type: 'bar', data: { labels, datasets: [ { type: 'line', label: '누적 달성률 (%)', data: cdf, borderColor: '#4f46e5', backgroundColor: '#4f46e5', borderWidth: 2, yAxisID: 'y-cdf', tension: 0.3, pointRadius: 0, fill: false }, { type: 'bar', label: '해당 구간 인원', data: bins, backgroundColor: 'rgba(99, 102, 241, 0.5)', borderColor: 'rgba(99, 102, 241, 1)', borderWidth: 1, yAxisID: 'y-freq', borderRadius: 4 } ]},
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', callbacks: { title: (ctx:any) => `${isMonth?'소요 기간':'기대 비용'}: ${ctx[0].label}${isMonth?'개월':'원'}`, label: (ctx:any) => ctx.datasetIndex === 0 ? `누적 달성률: ${ctx.raw.toFixed(2)}%` : `이 구간 달성자: ${ctx.raw}명` } } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 6, font: { size: 10 } } }, 'y-freq': { type: 'linear', position: 'left', display: false, beginAtZero: true }, 'y-cdf': { type: 'linear', position: 'right', beginAtZero: true, max: 100, grid: { drawOnChartArea: false }, ticks: { font: { size: 10 }, callback: (v:any) => v + '%' } } } }
  })
}

const dgnRunPlanner = () => {
  isDgnSim.value = true; dgnSimResult.value = null; dgnMyLuckPercentile.value = null; dgnUserSpentKrw.value = null
  setTimeout(() => {
    let totalKrwPerMonth = dgnPlanTotalKrw.value
    let nPerMonth = (dgnPlan.wQ?4:0) + dgnPlan.sp*1 + dgnPlan.rk*1 + dgnPlan.pt*3 + dgnPlan.pr*2 + dgnPlan.lg*2 + dgnPlan.unl*1
    let pPerMonth = dgnPlan.pk*2 + dgnPlan.lg*1
    let tPerMonth = dgnPlan.wC + dgnPlan.rk*20 + dgnPlan.pt*10 + dgnPlan.pr*10 + dgnPlan.unl*1
    if(totalKrwPerMonth===0 && nPerMonth===0 && pPerMonth===0 && tPerMonth===0) { isDgnSim.value=false; return alert("구매 패턴을 하나라도 설정해주세요.") }

    let iter = 10000; let results = [] 
    for(let i=0; i<iter; i++) {
      let week = 0; let totalCostRun = 0; 
      
      let infTotal = dgnState.payback.totalKrw;
      let monthSpent = dgnState.payback.spent;
      let p1 = dgnState.payback.t1, p2 = dgnState.payback.t2, p3 = dgnState.payback.t3, p4 = dgnState.payback.t4;
      let infPity = dgnState.payback.inf;
      
      let myDgn = dgnState.inv.myDgn, tkt = dgnState.inv.tickets;
      let pPack = dgnState.pity.pack, pTrade = dgnState.pity.trade;
      let totalUsedTop = 0; let totalGainedTop = dgnState.inv.otherTop;
      let alb = { ...dgnState.album };
      
      // 팩 개봉 헬퍼
      const simOpenNormal = (count) => {
        for(let c=0; c<count; c++) {
          tkt += 2;
          for(let j=0; j<8; j++) { 
            if(Math.random()<0.03){ let t=TEAMS[Math.floor(Math.random()*12)]; if(t===dgnState.myTeam) myDgn++; else alb[t]++; } 
            else { if(Math.random()>=(TOP_DB[dgnState.myTeam].length/212)) totalGainedTop++; } 
          }
          pPack--; if(pPack<=0) { myDgn++; pPack=50; } 
        }
      }
      const simOpenPickup = (count) => {
        for(let c=0; c<count; c++) {
          let t=TEAMS[Math.floor(Math.random()*12)]; if(t===dgnState.myTeam) myDgn++; else alb[t]++;
        }
      }
      // 믹서기 가동 헬퍼
      const simMixer = () => {
        while(true) {
          let dp = TEAMS.filter(t => t !== dgnState.myTeam && alb[t] > 1);
          if(dp.length>=3 && tkt>=1) { 
            alb[dp[0]]--; alb[dp[1]]--; alb[dp[2]]--; tkt--; pTrade--; 
            let t = TEAMS[Math.floor(Math.random()*12)]; if(t === dgnState.myTeam) myDgn++; else alb[t]++;
            if(pTrade<=0) { myDgn++; pTrade=30; } 
            continue; 
          }
          if(tkt>=1) { 
            totalUsedTop += 3; tkt--; 
            if(Math.random()<0.03){ let t=TEAMS[Math.floor(Math.random()*12)]; if(t===dgnState.myTeam) myDgn++; else alb[t]++; } 
            else { if(Math.random()>=(TOP_DB[dgnState.myTeam].length/212)) totalGainedTop++; }
            continue;
          }
          break;
        }
      }
      
      // 🔥 결제 및 [페이백 즉시 개봉] 함수 (달성 즉시 팩 까봄)
      const simPaybackCheck = (money) => {
         totalCostRun += money; monthSpent += money; infTotal += money;
         let pbN = 0, pbP = 0;
         if (monthSpent >= 9900 && !p1) { p1=true; pbN++; }
         if (monthSpent >= 99000 && !p2) { p2=true; pbP++; }
         if (monthSpent >= 199000 && !p3) { p3=true; pbN++; }
         if (monthSpent >= 299000 && !p4) { p4=true; pbN++; }
         while(infTotal >= (infPity + 1) * 300000) { infPity++; tkt += 9; }
         // 공짜 팩 들어왔으면 즉시 개봉!
         if(pbN > 0) simOpenNormal(pbN);
         if(pbP > 0) simOpenPickup(pbP);
      }

      // 🔥 산해님 기획 0순위 및 가성비 순서 완벽 적용 배열
      let packages = [
        { cost: 55000, n:1, p:0, t:0, max: dgnPlan.sp }, // 0순위: 시즌패스 (혜자 기본 베이스)
        { cost: 99000, n:0, p:2, t:0, max: dgnPlan.pk }, // 1순위: 픽업프레스티지
        { cost: 55000, n:1, p:0, t:20, max: dgnPlan.rk }, // 2순위: 루키
        { cost: 99000, n:3, p:0, t:10, max: dgnPlan.pt }, // 3순위: 프레스티지
        { cost: 149000, n:2, p:1, t:0, max: dgnPlan.lg }, // 4순위: 레전드
        { cost: 99000, n:2, p:0, t:10, max: dgnPlan.pr }, // 5순위: 프로
        { cost: 55000, n:1, p:0, t:1, max: dgnPlan.unl }  // 6순위: 무한 (남은 예산 무제한 꼴박)
      ];

      // 🔥 리얼리티 시간 흐름 시뮬레이션 시작
      while(myDgn < dgnPlan.target) {
        week++;
        // 매달 첫 주에 일반 페이백 게이지 초기화
        if (week > 1 && week % 4 === 1) { monthSpent = 0; p1 = false; p2 = false; p3 = false; p4 = false; }

        // [1] 주간 기본 보상 수급 및 가동 (결제 전 최우선!)
        let wQ = dgnPlan.wQ ? 1 : 0; 
        let wC = Math.floor(dgnPlan.wC / 4); 
        tkt += wC;
        if(wQ > 0) simOpenNormal(wQ);
        simMixer();
        if(myDgn >= dgnPlan.target) break; // 운 좋게 여기서 뜨면 패키지 돈 굳고 즉시 종료!

        // [2] 매달 1주 차에만 숍 패키지 결제 진입
        if (week % 4 === 1) {
           if(dgnPlan.otherMonthlyKrw > 0) {
              simPaybackCheck(dgnPlan.otherMonthlyKrw); simMixer();
              if(myDgn >= dgnPlan.target) break;
           }
           // 0순위 시즌패스부터 가성비 1개씩 사고, 까보고, 목표 달성 시 STOP!
           for(let pkg of packages) {
              for(let c=0; c<pkg.max; c++) {
                 simPaybackCheck(pkg.cost); // 1개 결제 & 혹시 페이백 터졌으면 즉시 까봄
                 if(pkg.n > 0) simOpenNormal(pkg.n);
                 if(pkg.p > 0) simOpenPickup(pkg.p);
                 tkt += pkg.t;
                 simMixer(); // 믹서기 가동
                 if(myDgn >= dgnPlan.target) break; // 🔥 목표 채웠다! 다음 패키지 취소!
              }
              if(myDgn >= dgnPlan.target) break; // 패키지 루프 완전 탈출!
           }
        }
        if (week > 720) break; // 억까 무한루프 방지(15년)
      }
      
      // 진짜 리얼로 쓴 돈(totalCostRun)만 저장
      results.push({ week, cost: totalCostRun, r: week, netTop: totalUsedTop - totalGainedTop })
    }
    
    const isF2P = dgnPlanPureKrw.value === 0 && dgnPlan.otherMonthlyKrw === 0
    const sorted = [...results].sort((a, b) => isF2P ? (a.week - b.week) : (a.cost - b.cost))
    dgnSimRawResults.value = sorted
    const mList = [...results].map(x => x.week).sort((a,b)=>a-b)
    const oneTryProb = mList[Math.floor(iter*0.5)] > 0 ? (1 / (mList[Math.floor(iter*0.5)]/4)) * 100 : 0

    dgnSimResult.value = { top10: sorted[Math.floor(iter * 0.1)], avg: sorted[Math.floor(iter * 0.5)], bot90: sorted[Math.floor(iter * 0.9)], isF2P, oneTryProb }
    dgnResultViewMode.value = 'AVG'
    nextTick(() => { renderDgnChart(sorted.map(r => isF2P ? (r.week/4) : r.cost), isF2P) })
    isDgnSim.value = false
  }, 50)
}

const dgnCheckMyLuck = () => {
  if (!dgnUserSpentKrw.value || dgnSimRawResults.value.length === 0) return alert("시뮬레이션을 먼저 가동한 후 결과값을 입력해주세요.")
  const val = dgnUserSpentKrw.value
  const isF2P = dgnSimResult.value?.isF2P
  const targetVal = isF2P ? val : val
  let rankIndex = dgnSimRawResults.value.findIndex(r => (isF2P ? (r.week/4) : r.cost) >= targetVal)
  if (rankIndex === -1) rankIndex = dgnSimRawResults.value.length
  const pct = (rankIndex / dgnSimRawResults.value.length) * 100
  dgnMyLuckPercentile.value = parseFloat(pct.toFixed(2))
  
  if (pct <= 5) dgnLuckTitle.value = "기만 멈춰! 초특급 비틱 💎"
  else if (pct <= 20) dgnLuckTitle.value = "될놈될! 꽤 운이 좋네요 🍀"
  else if (pct <= 50) dgnLuckTitle.value = "평타 쳤습니다! 무난하네요 👍"
  else if (pct <= 85) dgnLuckTitle.value = "조금 억까 당하셨군요... 🥲"
  else dgnLuckTitle.value = "흑우 등장... 에프가 사랑합니다 😭"
}
</script>

<template>
  <div class="w-full mx-auto px-2 sm:px-4 py-4 font-sans text-neutral-900 dark:text-neutral-100 flex flex-col min-h-screen relative">
    
    <!-- 🌟 [모달] 커리어 자동 스핀 설정 -->
    <div v-if="isAutoModalOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div class="bg-white dark:bg-[#1a1b1e] rounded-xl w-full max-w-[600px] shadow-2xl border border-blue-200/50 dark:border-blue-900/30 flex flex-col overflow-hidden">
        <div class="bg-gradient-to-b from-blue-400 to-cyan-500 p-3.5 flex justify-between items-center text-white shadow-sm">
          <div class="w-8"></div>
          <h3 class="font-extrabold text-[15px] tracking-wide text-center flex-1">자동 승급 옵션 설정</h3>
          <button @click="isAutoModalOpen = false" class="text-white hover:text-blue-100 transition-colors w-8 flex justify-end"><X class="w-5 h-5"/></button>
        </div>
        
        <div class="text-center py-3 bg-white dark:bg-[#1a1b1e] border-b border-neutral-100 dark:border-neutral-800">
          <p class="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 leading-tight">잠금 상태를 제외한 모든 커리어 승급 옵션이<br>선택한 등급 및 옵션의 설정이 적용될 때까지 변경이 시도됩니다.</p>
        </div>

        <div class="flex h-[340px] bg-neutral-50 dark:bg-[#151619]">
          <div class="w-[120px] bg-neutral-100 dark:bg-[#1f2024] flex flex-col p-2 gap-1.5 border-r border-neutral-200 dark:border-neutral-800 shrink-0">
            <button v-for="(label, key) in { set: '세트 도달', tier: '등급 도달', master: '마스터', pro: '프로', elite: '엘리트', rookie: '루키' }" :key="key" 
                    @click="autoMenuTab = key as any"
                    class="py-2.5 px-2 rounded font-extrabold text-[12px] transition-all text-center border relative"
                    :class="autoMenuTab === key ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-blue-400 shadow-md translate-x-1' : 'bg-white dark:bg-[#2a2b30] text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-[#303136]'">
              {{ label }}
              <div v-if="autoMenuTab === key" class="absolute -right-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-l-[6px] border-l-cyan-500"></div>
            </button>
          </div>
          
          <div class="flex-1 p-0 flex flex-col bg-white dark:bg-[#1a1b1e] relative">
            <div v-if="autoMenuTab !== 'tier'" class="flex justify-end p-2 border-b border-neutral-100 dark:border-neutral-800 absolute top-0 right-0 left-0 bg-white/90 dark:bg-[#1a1b1e]/90 backdrop-blur z-10">
               <label class="flex items-center gap-1.5 cursor-pointer px-2">
                 <span class="text-[11px] font-bold text-neutral-500">전체</span>
                 <input type="checkbox" :checked="autoMenuTab === 'set' ? isAllChecked(autoState.setTargetOptions) : autoMenuTab === 'master' ? isAllChecked(autoState.masterOptions) : autoMenuTab === 'pro' ? isAllChecked(autoState.proOptions) : autoMenuTab === 'elite' ? isAllChecked(autoState.eliteOptions) : isAllChecked(autoState.rookieOptions)" 
                        @change="(e) => toggleAll(autoMenuTab as any, (e.target as HTMLInputElement).checked)"
                        class="w-3.5 h-3.5 accent-cyan-500 rounded cursor-pointer">
               </label>
            </div>

            <div class="flex-1 overflow-y-auto px-4 pb-4 pt-10">
              <div v-if="autoMenuTab === 'tier'" class="space-y-6 pt-2">
                <div class="space-y-3">
                  <div class="font-extrabold text-sm text-neutral-800 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-1">마스터 <span class="text-[9px] font-normal text-neutral-400 ml-1">(순수 마스터 개수)</span></div>
                  <div class="flex gap-4 px-2">
                    <label v-for="n in 5" :key="n" class="flex items-center gap-1.5 cursor-pointer group"><span class="text-xs font-bold text-neutral-600 dark:text-neutral-400 group-hover:text-cyan-500">{{n}}개</span><input type="checkbox" :checked="autoState.tierTargetMaster === n" @change="autoState.tierTargetMaster = (autoState.tierTargetMaster === n ? 0 : n)" class="w-4 h-4 accent-cyan-500 rounded cursor-pointer"></label>
                  </div>
                </div>
                <div class="space-y-3">
                  <div class="font-extrabold text-sm text-neutral-800 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-1">프로 <span class="text-[9px] font-normal text-neutral-400 ml-1">(프로+마스터 포함)</span></div>
                  <div class="flex gap-4 px-2">
                    <label v-for="n in 5" :key="n" class="flex items-center gap-1.5 cursor-pointer group"><span class="text-xs font-bold text-neutral-600 dark:text-neutral-400 group-hover:text-cyan-500">{{n}}개</span><input type="checkbox" :checked="autoState.tierTargetPro === n" @change="autoState.tierTargetPro = (autoState.tierTargetPro === n ? 0 : n)" class="w-4 h-4 accent-cyan-500 rounded cursor-pointer"></label>
                  </div>
                </div>
                <div class="space-y-3">
                  <div class="font-extrabold text-sm text-neutral-800 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-1">엘리트 <span class="text-[9px] font-normal text-neutral-400 ml-1">(엘리트+프로+마스터 포함)</span></div>
                  <div class="flex gap-4 px-2">
                    <label v-for="n in 5" :key="n" class="flex items-center gap-1.5 cursor-pointer group"><span class="text-xs font-bold text-neutral-600 dark:text-neutral-400 group-hover:text-cyan-500">{{n}}개</span><input type="checkbox" :checked="autoState.tierTargetElite === n" @change="autoState.tierTargetElite = (autoState.tierTargetElite === n ? 0 : n)" class="w-4 h-4 accent-cyan-500 rounded cursor-pointer"></label>
                  </div>
                </div>
              </div>

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

        <div class="p-3 bg-neutral-100 dark:bg-[#1f2024] border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center px-6">
          <span class="text-[10px] font-bold text-neutral-500">재화 부족 시 자동 종료 됩니다.</span>
          <button @click="startAutoSpin" class="px-10 py-2.5 bg-gradient-to-b from-teal-400 to-cyan-600 hover:from-teal-300 hover:to-cyan-500 text-white font-extrabold text-[13px] rounded-sm shadow-md transition-all active:scale-95 tracking-widest border border-cyan-300/30">시작</button>
        </div>
      </div>
    </div>

    <!-- 탭 메뉴 -->
    <div class="flex justify-center shrink-0 mb-4">
      <div class="bg-white dark:bg-neutral-800 p-1.5 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex gap-1">
        <!-- 🔥 새로 추가된 디그니티 버튼 🔥 -->
        <button @click="activeTab = 'dignity'" class="px-6 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2" :class="activeTab === 'dignity' ? 'bg-slate-800 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'"><Gem class="w-4 h-4"/>디그니티 시뮬레이터</button>
        <!-- 기존 버튼들 -->
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

    <!-- ⚡ [탭 2] 강화 시뮬레이터 (표 추가 & 꼬임 해결) -->
    <div v-show="activeTab==='enhance'" class="grid grid-cols-1 xl:grid-cols-12 gap-5 w-full animate-fade-in max-w-[1600px] mx-auto text-slate-800 dark:text-neutral-100">
      
      <!-- [좌측] 세팅 및 리얼리티 컨트롤러 -->
      <section class="xl:col-span-4 flex flex-col gap-4 h-full">
        
        <!-- 현재 인게임 상태 세팅 -->
        <div class="bg-white dark:bg-[#1e1e24] border border-slate-200 dark:border-neutral-700/50 rounded-2xl p-5 shadow-sm dark:shadow-lg transition-colors shrink-0">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-extrabold text-sm text-indigo-600 dark:text-indigo-400"><Settings class="w-4 h-4 inline-block mr-1"/> 내 인게임 상태 세팅</h3>
            <button @click="enhReset" class="text-xs font-bold text-red-500 hover:text-red-700 dark:hover:text-red-400 flex items-center gap-1 transition-colors"><RotateCcw class="w-3 h-3"/> 초기화권 사용</button>
          </div>
          
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div><label class="text-[10px] font-bold text-slate-500 block mb-1">시작(현재) 단계</label><select v-model.number="enhState.startLv" class="w-full bg-slate-50 dark:bg-[#2a2a35] border border-slate-300 dark:border-neutral-700 rounded p-2 text-sm font-bold outline-none text-slate-900 dark:text-white transition-colors"><option v-for="n in 15" :key="n-1" :value="n-1">+{{ n-1 }}</option></select></div>
            <div><label class="text-[10px] font-bold text-slate-500 block mb-1">목표 강화 단계</label><select v-model.number="enhState.targetLv" class="w-full bg-slate-50 dark:bg-[#2a2a35] border border-slate-300 dark:border-neutral-700 rounded p-2 text-sm font-bold text-blue-600 dark:text-blue-400 outline-none transition-colors"><option v-for="n in 15" :key="n" :value="n">+{{ n }}</option></select></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="text-[10px] font-bold text-slate-500 block mb-1">보유 카드 (장)</label><input type="number" v-model.number="enhState.cards" min="0" class="w-full bg-slate-50 dark:bg-[#2a2a35] border border-slate-300 dark:border-neutral-700 rounded p-2 text-sm font-bold outline-none text-slate-900 dark:text-white transition-colors"></div>
            <div><label class="text-[10px] font-bold text-slate-500 block mb-1">현재 쌓인 추가 확률 (%)</label><input type="number" v-model.number="enhState.extraProb" step="0.1" min="0" class="w-full bg-slate-50 dark:bg-[#2a2a35] border border-red-300 dark:border-red-800 rounded p-2 text-sm font-bold outline-none text-red-600 dark:text-red-400 transition-colors"></div>
          </div>
        </div>

        <!-- 강화 실행 버튼부 -->
        <div class="bg-white dark:bg-[#1e1e24] border border-slate-200 dark:border-neutral-700/50 rounded-2xl p-6 shadow-sm dark:shadow-lg text-center flex flex-col items-center transition-colors shrink-0">
          <div class="text-xs font-bold text-slate-500 mb-2">현재 강화 단계</div>
          <div class="text-6xl font-black text-amber-500 dark:text-yellow-400 mb-2 drop-shadow-sm">+{{ enhState.curLv }}</div>
          <div v-if="enhState.curLv < 15" class="text-xs font-bold text-slate-700 dark:text-neutral-300 mb-6">
            <span class="text-blue-600 dark:text-blue-400">{{ (ENH_BASE[enhState.curLv]?.b + enhState.extraProb).toFixed(1) }}%</span> 
            <span class="text-[10px] text-slate-400 ml-1">(기본 {{ ENH_BASE[enhState.curLv]?.b.toFixed(1) }}% + 추가 {{ enhState.extraProb.toFixed(1) }}%)</span>
          </div>
          <div v-else class="text-xs font-bold text-slate-700 dark:text-neutral-300 mb-6">MAX LEVEL</div>

          <div class="flex flex-col gap-2 w-full">
            <button @click="doEnhance(false)" :disabled="enhState.curLv>=15" class="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-lg shadow-md transition-colors disabled:opacity-50 flex justify-center items-center gap-2"><Zap class="w-5 h-5"/> 1회 수동 강화 시도</button>
            <button @click="doEnhance(true)" :disabled="enhState.curLv>=15" class="w-full py-3 bg-slate-800 dark:bg-[#3a3a45] hover:bg-slate-700 dark:hover:bg-neutral-600 text-white rounded-xl font-bold shadow-sm transition-colors disabled:opacity-50 flex justify-center items-center gap-2"><Play class="w-4 h-4"/>목표까지 자동 오토 돌리기</button>
          </div>
        </div>

        <!-- 🔥 다시 부활한 구간별 기댓값 통계표 🔥 -->
        <div class="bg-white dark:bg-[#1e1e24] border border-slate-200 dark:border-neutral-700/50 rounded-2xl overflow-hidden shadow-sm dark:shadow-lg transition-colors flex flex-col flex-1 min-h-[250px]">
          <div class="font-extrabold text-sm px-4 py-3 border-b border-slate-200 dark:border-neutral-700/50 bg-slate-50 dark:bg-[#2a2a35] flex items-center gap-2 text-slate-800 dark:text-white shrink-0">
            <Calculator class="w-4 h-4 text-blue-500"/> 구간별 강화 확률 및 기댓값
          </div>
          <div class="overflow-y-auto custom-scrollbar flex-1">
            <table class="w-full text-center text-xs">
              <thead class="bg-slate-50 dark:bg-[#1a1b1e] border-b border-slate-200 dark:border-neutral-700/50 sticky top-0 z-10 font-bold text-slate-500 dark:text-neutral-400">
                <tr><th class="py-2.5">단계</th><th>기본 확률</th><th>1업 기댓값</th><th>누적 기댓값</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-neutral-800/50">
                <tr v-for="n in 15" :key="n-1" class="hover:bg-slate-50 dark:hover:bg-neutral-800/30 transition-colors" :class="{'bg-blue-50 dark:bg-blue-900/20 border-l-[3px] border-blue-500': enhState.curLv === n-1}">
                  <td class="py-2.5 font-bold text-slate-700 dark:text-neutral-300" :class="{'text-blue-600 dark:text-blue-400': enhState.curLv === n-1}">+{{n-1}} ➔ +{{n}}</td>
                  <td class="font-medium text-slate-600 dark:text-neutral-400">{{ ENH_BASE[n-1].b.toFixed(1) }}%</td>
                  <td class="font-medium text-slate-500 dark:text-neutral-400">{{ (EV_CUMULATIVE[n] - EV_CUMULATIVE[n-1]).toFixed(1) }}장</td>
                  <td class="font-black text-blue-600 dark:text-blue-400">{{ EV_CUMULATIVE[n].toFixed(1) }}장</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </section>

      <!-- [우측] 기록 및 운빨 기댓값 판독기 -->
      <section class="xl:col-span-8 flex flex-col gap-4 h-full">
        <!-- 🔥 운빨 판독기 -->
        <div class="bg-indigo-50 border border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800/50 rounded-2xl p-5 shadow-sm dark:shadow-lg flex flex-col justify-center transition-colors">
          <h3 class="font-extrabold text-sm mb-3 flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400"><BarChart class="w-4 h-4"/> 실시간 기댓값(운빨) 팩트 체크</h3>
          <div class="grid grid-cols-3 gap-4 mb-3">
            <div class="bg-white dark:bg-[#1a1b1e] border border-slate-200 dark:border-neutral-800 rounded-xl p-3 text-center shadow-inner">
              <div class="text-[10px] font-bold text-slate-500 mb-1">통계적 기댓값</div>
              <div class="text-lg font-black text-slate-900 dark:text-white">{{ enhCalcDiff.expected.toFixed(1) }} <span class="text-xs font-normal text-slate-500">장</span></div>
            </div>
            <div class="bg-white dark:bg-[#1a1b1e] border border-slate-200 dark:border-neutral-800 rounded-xl p-3 text-center shadow-inner">
              <div class="text-[10px] font-bold text-slate-500 mb-1">나의 실제 사용량</div>
              <div class="text-lg font-black text-slate-900 dark:text-white">{{ enhState.usedCount }} <span class="text-xs font-normal text-slate-500">장</span></div>
            </div>
            <div class="bg-white dark:bg-[#1a1b1e] border border-slate-200 dark:border-neutral-800 rounded-xl p-3 text-center shadow-inner">
              <div class="text-[10px] font-bold text-slate-500 mb-1">구간 달성 팩트</div>
              <div class="text-sm font-black mt-1" :class="enhCalcDiff.color">{{ enhState.startLv === enhState.curLv ? '-' : '+'+enhState.startLv+' ➔ +'+enhState.curLv }}</div>
            </div>
          </div>
          <div class="text-center bg-white dark:bg-[#1a1b1e] border border-slate-200 dark:border-neutral-800 py-2 rounded-lg shadow-sm">
            <span class="text-sm" :class="enhCalcDiff.color">{{ enhCalcDiff.text }}</span>
          </div>
        </div>

        <!-- 강화 기록 로그 -->
        <div class="bg-white dark:bg-[#1e1e24] border border-slate-200 dark:border-neutral-700/50 rounded-2xl flex-1 flex flex-col shadow-sm dark:shadow-lg overflow-hidden transition-colors">
          <div class="px-5 py-3 border-b border-slate-200 dark:border-neutral-700/50 font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5"><History class="w-4 h-4"/> 강화 기록</div>
          <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar min-h-[300px]">
            <div v-if="enhState.logs.length === 0" class="text-center text-sm font-bold text-slate-400 dark:text-neutral-500 py-20">기록이 없습니다.</div>
            
            <div v-for="log in enhState.logs" :key="log.id" class="flex justify-between items-center p-3 border-b border-slate-100 dark:border-neutral-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-neutral-800/30 transition-colors">
              <div class="font-bold text-sm tracking-widest" :class="log.type === 'success' ? 'text-blue-600 dark:text-blue-500' : 'text-red-500 dark:text-red-500'">
                +{{ log.from }} ➔ +{{ log.to }}
              </div>
              <div class="text-xs font-medium text-slate-500 dark:text-neutral-400">
                {{ log.prob }}% <span class="mx-1 text-slate-300 dark:text-neutral-600">|</span> {{ log.used }}장
              </div>
            </div>
          </div>
        </div>
      </section>
      
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

    <!-- 💎 [탭 4] 디그니티 탭 (독립형) -->
    <div v-show="activeTab==='dignity'" class="grid grid-cols-1 xl:grid-cols-12 gap-5 w-full animate-fade-in max-w-[1600px] mx-auto text-slate-800 dark:text-neutral-100">
      
      <!-- [좌측] 상점 & 설정 -->
      <section class="xl:col-span-3 flex flex-col gap-4 h-full">
        <div class="bg-white dark:bg-[#1e1e24] border border-slate-200 dark:border-neutral-700/50 rounded-2xl p-4 flex justify-between items-center shrink-0 shadow-sm dark:shadow-lg transition-colors">
          <div class="font-black text-lg flex items-center gap-2"><Calendar class="w-5 h-5 text-amber-500"/> {{ dgnState.month }}개월 차</div>
          <div class="flex gap-2">
            <button @click="dgnResetAll" class="p-2 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-800 dark:text-red-300 rounded-lg transition-colors" title="데이터 싹 밀기"><RotateCcw class="w-4 h-4"/></button>
            <button @click="dgnNextMonth" class="px-4 py-2 bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition-colors">다음 달 가기 (초기화)</button>
          </div>
        </div>

        <div class="bg-white dark:bg-[#1e1e24] border border-slate-200 dark:border-neutral-700/50 rounded-2xl p-4 shrink-0 shadow-sm dark:shadow-lg transition-colors">
          <h3 class="font-extrabold text-sm mb-3 flex items-center gap-1.5 text-blue-600 dark:text-blue-400"><Target class="w-4 h-4"/> 타겟팅 설정</h3>
          <div class="space-y-3">
            <div><label class="text-[10px] font-bold text-slate-500 dark:text-neutral-500 block mb-1">내 구단 선택</label><select v-model="dgnState.myTeam" class="w-full bg-slate-50 dark:bg-[#2a2a35] border border-slate-300 dark:border-neutral-700 rounded p-2 text-sm font-bold outline-none text-slate-900 dark:text-white transition-colors"><option v-for="t in TEAMS" :key="t" :value="t">{{ T_NAMES[t] }}</option></select></div>
            <div><label class="text-[10px] font-bold text-slate-500 dark:text-neutral-500 block mb-1">목표 디그니티 차수 (Wave)</label><select v-model.number="dgnState.targetWave" class="w-full bg-slate-50 dark:bg-[#2a2a35] border border-slate-300 dark:border-neutral-700 rounded p-2 text-sm font-bold text-amber-600 dark:text-amber-500 outline-none transition-colors"><option v-for="n in 5" :key="n" :value="n">{{ n }}st ({{ D_WAVES[n][dgnState.myTeam] }})</option></select></div>
            <div class="text-[10px] text-slate-600 dark:text-neutral-400 bg-slate-50 dark:bg-[#2a2a35] p-2 rounded transition-colors border border-slate-200 dark:border-transparent">해당 구단 TOP 카드 생태계: <span class="text-blue-600 dark:text-blue-400 font-bold">{{ TOP_DB[dgnState.myTeam].length }} / 212 장</span></div>
          </div>
        </div>

        <div class="bg-white dark:bg-[#1e1e24] border border-slate-200 dark:border-neutral-700/50 rounded-2xl p-4 flex-1 flex flex-col overflow-hidden shadow-sm dark:shadow-lg transition-colors">
          <div class="flex justify-between items-center mb-1"><h3 class="font-extrabold text-sm text-cyan-600 dark:text-cyan-400"><Gem class="w-4 h-4 inline-block mr-1"/> 총 누적 과금액</h3></div>
          <div class="text-xl font-black text-cyan-600 dark:text-cyan-400 mb-3 border-b border-slate-200 dark:border-neutral-700/50 pb-2">{{ new Intl.NumberFormat().format(dgnState.payback.totalKrw) }} <span class="text-xs text-slate-500 dark:text-neutral-500">원</span></div>

          <div class="flex justify-between items-center mb-2"><h3 class="font-extrabold text-sm text-green-600 dark:text-green-400"><Wallet class="w-4 h-4 inline-block mr-1"/> 월간 달성 페이백</h3></div>
          <div class="text-lg font-black text-green-600 dark:text-green-400 mb-2">{{ new Intl.NumberFormat().format(dgnState.payback.spent) }} <span class="text-[10px] text-slate-500 dark:text-neutral-500">원</span></div>
          <div class="space-y-1 mb-3">
            <div class="flex justify-between text-[10px] p-1.5 rounded transition-colors" :class="dgnState.payback.t1?'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400':'text-slate-400 dark:text-neutral-500'"><span>9,900원</span><span class="font-bold">일반팩 1</span></div>
            <div class="flex justify-between text-[10px] p-1.5 rounded transition-colors" :class="dgnState.payback.t2?'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400':'text-slate-400 dark:text-neutral-500'"><span>99,000원</span><span class="font-bold">픽업팩 1</span></div>
            <div class="flex justify-between text-[10px] p-1.5 rounded transition-colors" :class="dgnState.payback.t3?'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400':'text-slate-400 dark:text-neutral-500'"><span>199,000원</span><span class="font-bold">일반팩 1</span></div>
            <div class="flex justify-between text-[10px] p-1.5 rounded transition-colors" :class="dgnState.payback.t4?'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400':'text-slate-400 dark:text-neutral-500'"><span>299,000원</span><span class="font-bold">일반팩 1</span></div>
            <div class="flex justify-between text-[10px] p-1.5 bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-500 dark:border-amber-800/50 mt-1 rounded transition-colors"><span>총액 30만 마다</span><span class="font-bold">티켓 9개 ({{dgnState.payback.inf}}회)</span></div>
          </div>
          
          <div class="flex flex-col gap-1 mb-3">
            <div class="flex items-center gap-1">
              <input type="number" v-model.number="manualKrwInput" placeholder="타 패키지 금액" class="flex-1 bg-slate-50 dark:bg-[#2a2a35] border border-slate-300 dark:border-neutral-700 text-slate-800 dark:text-white text-xs p-2 rounded outline-none transition-colors">
              <button @click="dgnAddManualPayback" class="px-3 py-2 bg-green-600 hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600 text-white text-xs font-bold rounded transition-colors">추가</button>
            </div>
            <div v-if="manualKrwInput > 0" class="text-[10px] font-bold text-amber-600 dark:text-yellow-400 animate-fade-in pl-1 pt-1">
              💡 적용 시 예상: 총 누적 {{ new Intl.NumberFormat().format(previewTotalKrw) }}원 (월간 {{ new Intl.NumberFormat().format(previewSpentKrw) }}원)
            </div>
          </div>

          <h3 class="font-extrabold text-sm mb-2 text-slate-700 dark:text-neutral-300 pt-3 border-t border-slate-200 dark:border-neutral-700/50"><ShoppingCart class="w-4 h-4 inline-block mr-1"/> 인게임 상점 <span class="text-[9px] font-normal text-slate-400 dark:text-neutral-500 ml-1">(가격순 정렬)</span></h3>
          <div class="flex justify-between text-[10px] text-slate-500 dark:text-neutral-400 mb-2 px-1"><span>총 누적 소모 캐시:</span> <span class="text-purple-600 dark:text-purple-400 font-bold">{{ new Intl.NumberFormat().format(dgnState.inv.cash) }} 💎</span></div>
          
          <div class="space-y-2 overflow-y-auto pr-1 flex-1 pb-2">
            <!-- 0원 -->
            <button @click="dgnBuyPkg('wQ', 4, 0, 1, 0, 0, '주간 퀘스트')" :disabled="dgnState.shop.wQ>=4" class="w-full text-left p-2 rounded-lg transition-colors flex justify-between" :class="dgnState.shop.wQ<4?'bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50':'bg-slate-50 dark:bg-[#2a2a35] border border-slate-200 dark:border-neutral-700/50 opacity-50'"><div><div class="text-[10px] text-blue-600 dark:text-blue-400">주간 퀘스트 (월) [{{dgnState.shop.wQ}}/4]</div><div class="text-xs font-bold text-slate-900 dark:text-white">일반팩 1</div></div></button>
            <!-- 캐시 -->
            <div class="flex flex-col bg-slate-50 dark:bg-[#2a2a35] border border-slate-200 dark:border-neutral-700/50 rounded-lg p-2 gap-2 transition-colors" :class="{'opacity-50': dgnState.shop.wC >= 40}">
              <div class="flex justify-between items-start px-1">
                <div><div class="text-[10px] text-slate-500 dark:text-neutral-400">티켓 구매 (월) [{{dgnState.shop.wC}}/40]</div><div class="text-xs font-bold text-amber-600 dark:text-amber-500">티켓 1개 = 50캐시</div></div>
                <div class="text-right text-[9px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">자팀 기댓값: 약 400개/1장</div>
              </div>
              <div class="flex gap-2">
                <button @click="dgnBuyPkg('wC', 40, 50, 0, 0, 1, '주간 상점 티켓', true, 1)" :disabled="dgnState.shop.wC >= 40" class="flex-1 py-1.5 bg-white hover:bg-slate-100 dark:bg-[#1e1e24] dark:hover:bg-neutral-700 border border-slate-300 dark:border-neutral-700 text-[11px] font-bold text-slate-800 dark:text-white rounded transition-colors disabled:opacity-50 shadow-sm">1회 구매</button>
                <button @click="dgnBuyPkg('wC', 40, 50, 0, 0, 1, '주간 상점 티켓', true, 10)" :disabled="dgnState.shop.wC > 30" class="flex-1 py-1.5 bg-white hover:bg-slate-100 dark:bg-[#1e1e24] dark:hover:bg-neutral-700 border border-slate-300 dark:border-neutral-700 text-[11px] font-bold text-blue-600 dark:text-blue-300 rounded transition-colors disabled:opacity-50 shadow-sm">10회 구매</button>
              </div>
            </div>
            <!-- 🔥 추가된 시즌패스 패키지 -->
            <button @click="dgnBuyPkg('sp', 1, 55000, 1, 0, 0, '시즌패스')" :disabled="dgnState.shop.sp>=1" class="w-full text-left p-2 rounded-lg transition-colors flex justify-between" :class="dgnState.shop.sp<1?'bg-slate-100 border border-slate-300 dark:bg-[#2a2a35] dark:border-neutral-600':'bg-slate-50 dark:bg-[#2a2a35] border border-slate-200 dark:border-neutral-700/50 opacity-50'">
              <div><div class="text-[10px] text-slate-600 dark:text-slate-400">시즌패스 [{{dgnState.shop.sp}}/1]</div><div class="text-xs font-bold text-slate-900 dark:text-white">일반팩 1</div></div>
              <div class="text-right"><div class="text-[11px] font-bold text-green-600 dark:text-green-500">5.5만</div><div class="text-[9px] text-slate-500 dark:text-neutral-400 font-bold mt-0.5 whitespace-nowrap">자팀 기댓값: 약 183만/1장</div></div>
            </button>
            <!-- 기존 패키지들 -->
            <button @click="dgnBuyPkg('rk', 1, 55000, 1, 0, 20, '루키 패키지')" :disabled="dgnState.shop.rk>=1" class="w-full text-left p-2 rounded-lg transition-colors flex justify-between" :class="dgnState.shop.rk<1?'bg-orange-50 border border-orange-200 dark:bg-orange-900/20 dark:border-orange-800/50':'bg-slate-50 dark:bg-[#2a2a35] border border-slate-200 dark:border-neutral-700/50 opacity-50'">
              <div><div class="text-[10px] text-orange-600 dark:text-orange-400">루키 패키지 [{{dgnState.shop.rk}}/1]</div><div class="text-xs font-bold text-slate-900 dark:text-white">일반1 + 티켓20</div></div>
              <div class="text-right"><div class="text-[11px] font-bold text-green-600 dark:text-green-500">5.5만</div><div class="text-[9px] text-orange-500 dark:text-orange-300 font-bold mt-0.5 whitespace-nowrap">자팀 기댓값: 약 46만/1장</div></div>
            </button>
            <button @click="dgnBuyPkg('unl', 9999, 55000, 1, 0, 1, '무한 패키지')" class="w-full text-left p-2 rounded-lg transition-colors flex justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-[#2a2a35] dark:hover:bg-neutral-700 dark:border-neutral-700/50">
              <div><div class="text-[10px] text-teal-600 dark:text-teal-400">무한 패키지 [제한없음]</div><div class="text-xs font-bold text-slate-900 dark:text-white">일반1 + 티켓1</div></div>
              <div class="text-right"><div class="text-[11px] font-bold text-green-600 dark:text-green-500">5.5만</div><div class="text-[9px] text-slate-500 dark:text-neutral-500 font-bold mt-0.5 whitespace-nowrap">자팀 기댓값: 약 106만/1장</div></div>
            </button>
            <button @click="dgnBuyPkg('pt', 1, 99000, 3, 0, 10, '프레스티지')" :disabled="dgnState.shop.pt>=1" class="w-full text-left p-2 rounded-lg transition-colors flex justify-between" :class="dgnState.shop.pt<1?'bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-[#2a2a35] dark:hover:bg-neutral-700 dark:border-neutral-700/50':'bg-slate-50 border border-slate-200 dark:bg-[#2a2a35] dark:border-neutral-700/50 opacity-50'">
              <div><div class="text-[10px] text-slate-500 dark:text-neutral-400">프레스티지 [{{dgnState.shop.pt}}/1]</div><div class="text-xs font-bold text-slate-900 dark:text-white">일반3 + 티켓10</div></div>
              <div class="text-right"><div class="text-[11px] font-bold text-green-600 dark:text-green-500">9.9만</div><div class="text-[9px] text-amber-600 dark:text-yellow-500 font-bold mt-0.5 whitespace-nowrap">자팀 기댓값: 약 55만/1장</div></div>
            </button>
            <button @click="dgnBuyPkg('pr', 5, 99000, 2, 0, 10, '프로 패키지')" :disabled="dgnState.shop.pr>=5" class="w-full text-left p-2 rounded-lg transition-colors flex justify-between" :class="dgnState.shop.pr<5?'bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-[#2a2a35] dark:hover:bg-neutral-700 dark:border-neutral-700/50':'bg-slate-50 border border-slate-200 dark:bg-[#2a2a35] dark:border-neutral-700/50 opacity-50'">
              <div><div class="text-[10px] text-slate-500 dark:text-neutral-400">프로 패키지 [{{dgnState.shop.pr}}/5]</div><div class="text-xs font-bold text-slate-900 dark:text-white">일반2 + 티켓10</div></div>
              <div class="text-right"><div class="text-[11px] font-bold text-green-600 dark:text-green-500">9.9만</div><div class="text-[9px] text-amber-700 dark:text-yellow-600 font-bold mt-0.5 whitespace-nowrap">자팀 기댓값: 약 75만/1장</div></div>
            </button>
            <button @click="dgnBuyPkg('pk', 1, 99000, 0, 2, 0, '픽업 프레스티지')" :disabled="dgnState.shop.pk>=1" class="w-full text-left p-2 rounded-lg transition-colors flex justify-between" :class="dgnState.shop.pk<1?'bg-purple-50 border border-purple-200 dark:bg-purple-900/20 dark:border-purple-800/50':'bg-slate-50 border border-slate-200 dark:bg-[#2a2a35] dark:border-neutral-700/50 opacity-50'">
              <div><div class="text-[10px] text-purple-600 dark:text-purple-400">픽업 프레스티지 [{{dgnState.shop.pk}}/1]</div><div class="text-xs font-bold text-purple-700 dark:text-purple-300">픽업팩 2</div></div>
              <div class="text-right"><div class="text-[11px] font-bold text-green-600 dark:text-green-500">9.9만</div><div class="text-[9px] text-purple-600 dark:text-purple-400 font-bold mt-0.5 whitespace-nowrap">자팀 기댓값: 약 41만/1장</div></div>
            </button>
            <button @click="dgnBuyPkg('lg', 3, 149000, 2, 1, 0, '레전드 패키지')" :disabled="dgnState.shop.lg>=3" class="w-full text-left p-2 rounded-lg transition-colors flex justify-between" :class="dgnState.shop.lg<3?'bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50':'bg-slate-50 border border-slate-200 dark:bg-[#2a2a35] dark:border-neutral-700/50 opacity-50'">
              <div><div class="text-[10px] text-amber-600 dark:text-amber-500">레전드 패키지 [{{dgnState.shop.lg}}/3]</div><div class="text-xs font-bold text-amber-700 dark:text-amber-300">일반2 + 픽업1</div></div>
              <div class="text-right"><div class="text-[11px] font-bold text-green-600 dark:text-green-500">14.9만</div><div class="text-[9px] text-slate-500 dark:text-neutral-400 font-bold mt-0.5 whitespace-nowrap">자팀 기댓값: 약 69만/1장</div></div>
            </button>
            
            <div class="mt-3 p-2.5 bg-slate-100 border border-slate-200 dark:bg-[#1a1b1e] dark:border-neutral-800 rounded-lg text-[9px] font-bold text-slate-500 dark:text-neutral-500 leading-relaxed text-center break-keep transition-colors">
              ※ 가성비 기댓값은 참고용입니다. 트레이드권의 가치는 변수가 큰 '디그니티 믹서기' 효율을 배제하고, 가장 보편적인 'TOP 재료 믹서기(3%)'만을 기준으로 보수적으로 산정되었습니다.<br>
              <span class="text-indigo-600 dark:text-indigo-400 mt-1 inline-block">💡 실제 스노우볼이 적용된 정확한 기댓값 및 과금 효율은 우측의 '타임라인 과금 플래너' 시뮬레이션을 통해 확인하시는 것을 권장합니다.</span>
            </div>
          </div>
        </div>
      </section>

      <!-- [중앙] 가챠 및 믹서기 -->
      <section class="xl:col-span-5 flex flex-col gap-4 h-full">
        <div class="bg-white dark:bg-[#1e1e24] border border-slate-200 dark:border-neutral-700/50 rounded-2xl p-5 flex flex-col shadow-sm dark:shadow-lg transition-colors">
          <h2 class="text-lg font-black mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400"><Package class="w-5 h-5"/> 인벤토리 & 뽑기</h2>
          <div class="grid grid-cols-3 gap-3 mb-5">
            <div class="bg-slate-50 dark:bg-[#2a2a35] border border-slate-200 dark:border-transparent p-3 rounded-xl text-center transition-colors"><div class="text-[10px] font-bold text-slate-500 dark:text-neutral-400 mb-1">일반 디그팩</div><div class="text-xl font-black text-slate-900 dark:text-white">{{ dgnState.inv.normal }}</div></div>
            <div class="bg-purple-50 border border-purple-200 dark:bg-purple-900/20 dark:border-purple-800/30 p-3 rounded-xl text-center transition-colors"><div class="text-[10px] font-bold text-purple-600 dark:text-purple-400 mb-1">픽업 디그팩</div><div class="text-xl font-black text-purple-700 dark:text-purple-300">{{ dgnState.inv.pickup }}</div></div>
            <div class="bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/30 p-3 rounded-xl text-center transition-colors"><div class="text-[10px] font-bold text-amber-600 dark:text-amber-500 mb-1">트레이드권</div><div class="text-xl font-black text-amber-700 dark:text-amber-400">{{ dgnState.inv.tickets }}</div></div>
          </div>
          <div class="flex flex-col gap-2 mb-3">
            <div class="flex gap-2"><button @click="dgnOpenPack(1)" class="flex-1 py-3 bg-slate-700 hover:bg-slate-800 dark:bg-[#3a3a45] dark:hover:bg-neutral-600 text-white rounded-xl font-bold transition-colors shadow-sm">일반 1팩 까기</button><button @click="dgnOpenPack(10)" class="flex-1 py-3 bg-slate-700 hover:bg-slate-800 dark:bg-[#3a3a45] dark:hover:bg-neutral-600 text-white rounded-xl font-bold transition-colors shadow-sm">일반 10팩 까기</button></div>
            <button @click="dgnOpenPickup()" class="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 dark:from-purple-700 dark:to-indigo-700 dark:hover:from-purple-600 dark:hover:to-indigo-600 text-white rounded-xl font-black shadow-md transition-all">픽업팩 까기 (100% 확정)</button>
            <div class="flex gap-2 mt-1 pt-2 border-t border-slate-200 dark:border-neutral-700/50">
              <button @click="dgnOpenPerfect(1)" class="flex-1 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:border-blue-800 dark:hover:bg-blue-800 dark:text-blue-300 rounded-lg text-[11px] font-bold transition-colors">파이브스타 퍼펙트 1팩</button>
              <button @click="dgnOpenPerfect(10)" class="flex-1 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:border-blue-800 dark:hover:bg-blue-800 dark:text-blue-300 rounded-lg text-[11px] font-bold transition-colors">파이브스타 퍼펙트 10팩</button>
            </div>
          </div>
          <div class="mt-auto pt-3 border-t border-slate-200 dark:border-neutral-700/50 flex justify-between items-center text-[11px] font-bold text-slate-500 dark:text-neutral-500">
            <div class="flex items-center gap-1">남은 팩 개봉: <input type="number" v-model.number="dgnState.pity.pack" class="w-10 bg-slate-50 dark:bg-[#2a2a35] border border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-center rounded outline-none p-0.5 transition-colors"> 번 (확정)</div>
            <div class="flex items-center gap-1">남은 트레이드: <input type="number" v-model.number="dgnState.pity.trade" class="w-10 bg-slate-50 dark:bg-[#2a2a35] border border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-center rounded outline-none p-0.5 transition-colors"> 번 (확정)</div>
          </div>
        </div>

        <div class="bg-white dark:bg-[#1e1e24] border border-slate-200 dark:border-neutral-700/50 rounded-2xl p-5 flex flex-col shrink-0 shadow-sm dark:shadow-lg transition-colors">
          <h3 class="font-extrabold text-sm mb-3 flex items-center gap-1.5 text-green-600 dark:text-green-400"><RefreshCw class="w-4 h-4"/> 믹서기 (트레이드)</h3>
          <div class="grid grid-cols-2 gap-3 mb-2">
            <div class="bg-slate-50 dark:bg-[#2a2a35] border border-slate-200 dark:border-transparent p-3 rounded-xl text-center relative transition-colors"><div class="text-[10px] font-bold text-slate-500 dark:text-neutral-400 mb-1">잉여 디그니티 <span class="text-blue-600 dark:text-blue-400">종류</span></div><div class="text-lg font-black text-red-600 dark:text-red-400">{{ dgnDistinctDgnCount }} 종</div><div class="absolute -top-2 -right-2 bg-red-500 dark:bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm" v-if="dgnDistinctDgnCount<3">3종 필요</div></div>
            <div class="bg-slate-50 dark:bg-[#2a2a35] border border-slate-200 dark:border-transparent p-3 rounded-xl text-center relative transition-colors"><div class="text-[10px] font-bold text-slate-500 dark:text-neutral-400 mb-1">타팀 TOP 선수 <span class="text-blue-600 dark:text-blue-400">종류</span></div><div class="text-lg font-black text-slate-900 dark:text-white">{{ dgnDistinctTopCount }} 종</div><div class="absolute -top-2 -right-2 bg-red-500 dark:bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm" v-if="dgnDistinctTopCount<3">3종 필요</div></div>
          </div>
          <div class="bg-slate-100 dark:bg-[#1a1b1e] border border-slate-200 dark:border-neutral-700/50 rounded-lg p-2 mb-4 transition-colors">
            <div class="text-[9px] font-bold text-amber-600 dark:text-amber-500 border-b border-slate-200 dark:border-neutral-700/50 pb-1 mb-1">🔥 믹서기 투입 대기 중인 잉여 카드 목록</div>
            <div class="flex flex-wrap gap-1">
              <span v-for="item in dgnWaitlist" :key="item" class="bg-red-50 border border-red-200 text-red-600 dark:bg-red-900/40 dark:border-red-800 dark:text-red-200 text-[9px] px-1.5 py-0.5 rounded transition-colors">{{ item }}</span>
              <span v-if="dgnWaitlist.length === 0" class="text-[9px] text-slate-400 dark:text-neutral-500">대기 중인 잉여 디그니티 카드가 없습니다.</span>
            </div>
            <div class="flex flex-wrap gap-1 mt-1">
              <span v-for="item in topWaitlist.slice(0, 8)" :key="item" class="bg-blue-50 border border-blue-200 text-blue-600 dark:bg-blue-900/40 dark:border-blue-800 dark:text-blue-200 text-[9px] px-1.5 py-0.5 rounded transition-colors">{{ item }}</span>
              <span v-if="topWaitlist.length > 8" class="text-[9px] text-slate-400 dark:text-neutral-500">+ 외 {{ topWaitlist.length - 8 }}종 대기 중</span>
            </div>
          </div>
          <button @click="dgnRunMixer" class="w-full py-4 bg-green-600 hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-xl font-black text-lg shadow-md flex justify-center items-center gap-2 transition-colors"><RefreshCw class="w-5 h-5"/> 자동 필터 믹서기 가동</button>
        </div>

        <div class="bg-slate-50 dark:bg-[#0f0f13] border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 flex-1 overflow-hidden flex flex-col min-h-[200px] shadow-inner transition-colors">
          <div class="flex-1 overflow-y-auto space-y-1 font-mono text-[10px]">
            <div v-for="l in dgnState.logs" :key="l.id" :class="{'text-slate-500 dark:text-neutral-400':l.type==='normal', 'text-green-600 dark:text-green-400 font-bold':l.type==='success', 'text-blue-600 dark:text-blue-300':l.type==='action', 'text-amber-600 dark:text-amber-400 font-black text-[11px]':l.type==='epic'}"><span class="opacity-50 mr-1">></span>{{ l.msg }}</div>
          </div>
        </div>
      </section>

      <!-- [우측] 도감 & 플래너 -->
      <section class="xl:col-span-4 flex flex-col gap-4 h-full">
        <div class="bg-gradient-to-b from-blue-100 to-white dark:from-blue-900 dark:to-[#1e1e24] border border-blue-200 dark:border-blue-800/50 rounded-2xl p-5 shadow-sm dark:shadow-xl shrink-0 text-center relative overflow-hidden transition-colors">
          <Gem class="absolute -right-4 -bottom-4 w-32 h-32 text-blue-300 dark:text-blue-500 opacity-20 dark:opacity-10"/>
          <div class="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 mb-1 relative z-10">최종 획득 결과물</div>
          <div class="text-2xl font-black text-slate-900 dark:text-white relative z-10">{{ T_NAMES[dgnState.myTeam] }} {{ D_WAVES[dgnState.targetWave][dgnState.myTeam] }}</div>
          <div class="text-5xl font-black text-amber-500 dark:text-yellow-400 mt-2 relative z-10">{{ dgnState.inv.myDgn }} <span class="text-xl text-amber-600 dark:text-yellow-600">장</span></div>
        </div>

        <div class="bg-white dark:bg-[#1e1e24] border border-slate-200 dark:border-neutral-700/50 rounded-2xl p-4 flex-1 flex flex-col overflow-hidden shadow-sm dark:shadow-lg transition-colors">
          <div class="flex gap-2 mb-3">
            <button @click="dgnAlbumTab='dignity'" class="flex-1 py-1.5 rounded text-[11px] font-bold transition-colors" :class="dgnAlbumTab==='dignity'?'bg-amber-500 text-white dark:bg-amber-600':'bg-slate-100 text-slate-500 dark:bg-[#2a2a35] dark:text-neutral-400'">디그니티 명함</button>
            <button @click="dgnAlbumTab='top'" class="flex-1 py-1.5 rounded text-[11px] font-bold transition-colors" :class="dgnAlbumTab==='top'?'bg-blue-600 text-white':'bg-slate-100 text-slate-500 dark:bg-[#2a2a35] dark:text-neutral-400'">TOP카드 수집함</button>
          </div>
          
          <div v-show="dgnAlbumTab==='dignity'" class="flex flex-col flex-1 overflow-hidden">
            <div class="flex justify-between items-center mb-2 px-1 border-b border-slate-100 dark:border-neutral-700/50 pb-2">
              <span class="text-[10px] text-blue-600 dark:text-blue-400 font-bold">💡 카드를 클릭하여 명함(ON/OFF) 전환!</span>
              <div class="flex gap-1">
                <button @click="turnOnAllAlbum" class="px-2 py-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white text-[9px] font-bold rounded shadow-sm transition-colors">전체 명함 켜기</button>
                <button @click="turnOffAllAlbum" class="px-2 py-1 bg-red-600 hover:bg-red-700 dark:bg-red-800 dark:hover:bg-red-700 text-white text-[9px] font-bold rounded shadow-sm transition-colors">전체 끄기</button>
              </div>
            </div>
            
            <div class="grid grid-cols-3 gap-2 overflow-y-auto pr-1 flex-1 content-start custom-scrollbar pt-1">
              <div v-for="t in TEAMS" :key="t" v-show="t!==dgnState.myTeam" @click="toggleDgnAlbum(t)" class="p-2 rounded-lg border text-center relative transition-colors cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 select-none flex flex-col items-center justify-center min-h-[70px]" :class="dgnState.album[t]>0?'bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700 shadow-sm':'bg-slate-50 border-slate-200 dark:bg-[#2a2a35] dark:border-neutral-700/50 opacity-60 grayscale'">
                <div class="text-[9px] font-black mb-0.5" :class="T_COLORS[t]">{{ T_NAMES[t] }}</div>
                <div class="text-xs font-bold text-slate-800 dark:text-white" :class="{'mb-1': dgnState.album[t]>0}">{{ D_WAVES[dgnState.targetWave][t] }}</div>
                
                <div v-if="dgnState.album[t]>0" class="absolute -top-1.5 -left-1.5 bg-blue-500 dark:bg-blue-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md">✓</div>
                
                <div v-if="dgnState.album[t]>0" class="flex items-center justify-between w-full mt-auto bg-slate-200/80 dark:bg-black/40 rounded px-1 transition-colors" @click.stop>
                  <button @click="decDgnAlbum(t)" class="text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white px-2 py-0.5 font-bold text-xs transition-colors">-</button>
                  <span class="text-[10px] text-slate-800 dark:text-white font-black">{{ dgnState.album[t] }}장</span>
                  <button @click="incDgnAlbum(t)" class="text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white px-2 py-0.5 font-bold text-xs transition-colors">+</button>
                </div>
              </div>
            </div>
          </div>

          <div v-show="dgnAlbumTab==='top'" class="flex flex-col flex-1 overflow-hidden">
            <div class="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-2 border-b border-slate-200 dark:border-neutral-700/50 pb-1">자팀 수집함 (자동 보호) - 총 {{ dgnState.inv.myTop }}장</div>
            <div class="flex-1 overflow-y-auto pr-1 flex flex-col gap-1 mb-2 content-start custom-scrollbar">
              <div v-for="p in TOP_DB[dgnState.myTeam]" :key="p" v-show="dgnState.topAlbum[dgnState.myTeam][p] > 0" class="flex justify-between text-xs bg-slate-50 border border-slate-200 dark:bg-[#2a2a35] dark:border-transparent p-1.5 rounded transition-colors"><span class="text-slate-800 dark:text-white font-medium">{{ p }}</span><span class="text-blue-600 dark:text-blue-400 font-bold">x{{ dgnState.topAlbum[dgnState.myTeam][p] }}</span></div>
            </div>
          </div>
        </div>

        <!-- 🚀 과금 플래너 -->
        <div class="bg-indigo-50 border border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800/50 rounded-2xl p-4 shrink-0 flex flex-col shadow-sm dark:shadow-lg transition-colors">
          <h3 class="font-extrabold text-sm mb-2 flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400"><BarChart class="w-4 h-4"/> 타임라인 과금 플래너</h3>
          
          <div class="mb-3 px-2 py-1.5 bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700/50 rounded-md text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300 flex items-start gap-1">
            <span class="mt-0.5 text-xs">💡</span>
            <span class="leading-relaxed">현재 좌측 도감에 세팅된 보유 현황(명함 및 중복 카드)을 <br class="hidden xl:block">시뮬레이션 시작점으로 완벽히 반영하여 계산합니다.</span>
          </div>
          
          <div class="bg-white border border-slate-200 dark:bg-[#1a1b1e] dark:border-neutral-800 rounded-lg p-2.5 mb-3 flex flex-col gap-1.5 shadow-inner transition-colors">
            <div class="flex justify-between items-end">
              <span class="text-[10px] font-bold text-slate-500 dark:text-neutral-400">월 갱신용 예상 페이백 게이지 (무한 제외)</span>
              <span class="text-xs font-black text-green-600 dark:text-green-400">{{ new Intl.NumberFormat().format(dgnPlanPureKrw) }} 원</span>
            </div>
            <div class="flex gap-1 mt-1">
              <div class="flex-1 h-1.5 rounded-full transition-colors" :class="dgnPlanPureKrw >= 9900 ? 'bg-green-500' : 'bg-slate-200 dark:bg-neutral-800'"></div>
              <div class="flex-1 h-1.5 rounded-full transition-colors" :class="dgnPlanPureKrw >= 99000 ? 'bg-green-500' : 'bg-slate-200 dark:bg-neutral-800'"></div>
              <div class="flex-1 h-1.5 rounded-full transition-colors" :class="dgnPlanPureKrw >= 199000 ? 'bg-green-500' : 'bg-slate-200 dark:bg-neutral-800'"></div>
              <div class="flex-1 h-1.5 rounded-full transition-colors" :class="dgnPlanPureKrw >= 299000 ? 'bg-green-500' : 'bg-slate-200 dark:bg-neutral-800'"></div>
            </div>
            <div class="flex justify-between text-[8px] font-bold text-slate-400 dark:text-neutral-600 px-1"><span :class="{'text-green-600 dark:text-green-500': dgnPlanPureKrw >= 9900}">9.9k</span><span :class="{'text-green-600 dark:text-green-500': dgnPlanPureKrw >= 99000}">99k</span><span :class="{'text-green-600 dark:text-green-500': dgnPlanPureKrw >= 199000}">199k</span><span :class="{'text-green-600 dark:text-green-500': dgnPlanPureKrw >= 299000}">299k</span></div>
          </div>

          <div class="flex flex-col gap-1 mb-4 bg-indigo-100/50 dark:bg-indigo-950/30 p-2 rounded-lg border border-indigo-200 dark:border-indigo-500/30 transition-colors">
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 w-32">디그니티 외 타 결제액</span>
              <input type="number" v-model.number="dgnPlan.otherMonthlyKrw" min="0" class="flex-1 bg-white dark:bg-[#1a1b1e] border border-indigo-300 dark:border-indigo-500/50 text-slate-900 dark:text-white text-xs p-1 rounded outline-none text-center font-bold transition-colors">
              <span class="text-[10px] text-indigo-600 dark:text-indigo-400">원/월</span>
            </div>
            <div v-if="dgnPlan.otherMonthlyKrw > 0" class="text-[9px] font-bold text-amber-600 dark:text-yellow-400 text-right pr-8 animate-fade-in mt-0.5">
              💡 실시간 반영: 플래너 총 누적액 {{ new Intl.NumberFormat().format(dgnPlanTotalKrw) }}원 도달 예상
            </div>
          </div>

          <div class="grid grid-cols-2 gap-x-2 gap-y-1.5 mb-3 text-[10px]">
            <label class="flex items-center gap-1 text-slate-700 dark:text-neutral-300"><input type="checkbox" v-model="dgnPlan.wQ" class="accent-indigo-600 dark:accent-indigo-500"> 주간퀘 완수</label>
            <label class="flex items-center gap-1 text-slate-700 dark:text-neutral-300 justify-end">티켓상점 <input type="number" v-model.number="dgnPlan.wC" min="0" max="40" class="w-8 bg-white dark:bg-[#2a2a35] border border-slate-300 dark:border-neutral-700 text-center rounded outline-none transition-colors"> /월</label>
            
            <label class="flex items-center gap-1 text-indigo-700 dark:text-indigo-300 mt-1 justify-center bg-indigo-100/50 dark:bg-indigo-900/20 py-1 rounded border border-indigo-200 dark:border-indigo-800 transition-colors">시즌패스(5.5) <input type="number" v-model.number="dgnPlan.sp" min="0" max="1" class="w-8 bg-white dark:bg-[#2a2a35] border border-indigo-300 dark:border-indigo-700 text-center rounded outline-none text-slate-900 dark:text-white transition-colors"> /월</label>
            <label class="flex items-center gap-1 text-teal-700 dark:text-teal-300 mt-1 justify-center bg-teal-100/50 dark:bg-teal-900/20 py-1 rounded border border-teal-200 dark:border-teal-800 transition-colors">무한(5.5) <input type="number" v-model.number="dgnPlan.unl" min="0" class="w-8 bg-white dark:bg-[#2a2a35] border border-teal-300 dark:border-teal-700 text-center rounded outline-none text-slate-900 dark:text-white transition-colors"> /월</label>
            
            <label class="flex items-center gap-1 text-orange-700 dark:text-orange-300 mt-1 justify-center bg-orange-100/50 dark:bg-orange-900/20 py-1 rounded border border-orange-200 dark:border-orange-800 transition-colors">루키(5.5) <input type="number" v-model.number="dgnPlan.rk" min="0" max="1" class="w-8 bg-white dark:bg-[#2a2a35] border border-orange-300 dark:border-orange-700 text-center rounded outline-none text-slate-900 dark:text-white transition-colors"> /월</label>
            <label class="flex items-center gap-1 text-slate-700 dark:text-neutral-300 mt-1 justify-center">픽업프레스티지 <input type="number" v-model.number="dgnPlan.pk" min="0" max="1" class="w-8 bg-white dark:bg-[#2a2a35] border border-slate-300 dark:border-neutral-700 text-center rounded outline-none transition-colors"> /월</label>
            
            <label class="flex items-center gap-1 text-slate-700 dark:text-neutral-300 mt-1 justify-center">프레스티지 <input type="number" v-model.number="dgnPlan.pt" min="0" max="1" class="w-8 bg-white dark:bg-[#2a2a35] border border-slate-300 dark:border-neutral-700 text-center rounded outline-none transition-colors"> /월</label>
            <label class="flex items-center gap-1 text-slate-700 dark:text-neutral-300 mt-1 justify-center">프로 <input type="number" v-model.number="dgnPlan.pr" min="0" max="5" class="w-8 bg-white dark:bg-[#2a2a35] border border-slate-300 dark:border-neutral-700 text-center rounded outline-none transition-colors"> /월</label>
            
            <label class="flex items-center gap-1 text-slate-700 dark:text-neutral-300 mt-1 justify-center bg-amber-100/50 dark:bg-amber-900/20 py-1 rounded transition-colors col-span-2 mx-auto px-4">레전드 <input type="number" v-model.number="dgnPlan.lg" min="0" max="3" class="w-8 bg-white dark:bg-[#2a2a35] border border-slate-300 dark:border-neutral-700 text-center rounded outline-none transition-colors"> /월</label>
          </div>
          
          <div class="flex items-center gap-2 mb-3 justify-center">
            <span class="text-xs font-bold text-indigo-700 dark:text-indigo-300">목표 자팀 획득:</span>
            <input type="number" v-model.number="dgnPlan.target" class="w-12 bg-white dark:bg-[#2a2a35] border border-indigo-300 dark:border-indigo-700 rounded p-1 text-xs text-center font-bold outline-none text-slate-900 dark:text-white transition-colors">
            <span class="text-xs font-bold text-indigo-700 dark:text-indigo-300">장</span>
          </div>
          
          <button @click="dgnRunPlanner" :disabled="isDgnSim" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-bold rounded-lg text-xs transition-colors shadow-sm">{{ isDgnSim ? '만 번의 미래 연산 중...' : '시뮬레이션 가동' }}</button>
          
          <div class="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex-1 flex flex-col relative overflow-hidden mt-3 transition-colors" v-if="dgnSimResult || isDgnSim">
            <div class="mb-4 bg-slate-50 dark:bg-neutral-800 rounded-xl border border-slate-200 dark:border-neutral-700 p-3 shadow-inner transition-colors">
              <div class="flex justify-between gap-1 mb-3">
                <button @click="dgnResultViewMode = 'TOP10'" class="flex-1 py-1.5 text-[10px] font-bold rounded border transition-colors" :class="dgnResultViewMode === 'TOP10' ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700 text-slate-500 dark:text-neutral-500'">상위 10% (비틱)</button>
                <button @click="dgnResultViewMode = 'AVG'" class="flex-1 py-1.5 text-[10px] font-bold rounded border transition-colors" :class="dgnResultViewMode === 'AVG' ? 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700 text-slate-500 dark:text-neutral-500'">평균 (상위 50%)</button>
                <button @click="dgnResultViewMode = 'BOT90'" class="flex-1 py-1.5 text-[10px] font-bold rounded border transition-colors" :class="dgnResultViewMode === 'BOT90' ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-300' : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700 text-slate-500 dark:text-neutral-500'">하위 90% (천장)</button>
              </div>
              
              <div v-if="dgnSimResult" class="space-y-1">
                <div class="flex justify-between items-center px-1 py-1">
                  <span class="text-[11px] font-extrabold" :class="{'text-blue-700 dark:text-blue-500': dgnResultViewMode==='TOP10', 'text-indigo-700 dark:text-indigo-500': dgnResultViewMode==='AVG', 'text-red-700 dark:text-red-500': dgnResultViewMode==='BOT90'}">소요 기간</span>
                  <span class="text-sm font-black" :class="{'text-blue-700 dark:text-blue-500': dgnResultViewMode==='TOP10', 'text-indigo-700 dark:text-indigo-500': dgnResultViewMode==='AVG', 'text-red-700 dark:text-red-500': dgnResultViewMode==='BOT90'}">
                    {{ Math.floor((dgnResultViewMode === 'TOP10' ? dgnSimResult.top10.week : dgnResultViewMode === 'AVG' ? dgnSimResult.avg.week : dgnSimResult.bot90.week) / 4) }}<span class="text-[9px] font-normal text-slate-400 dark:text-neutral-500 mr-1">개월</span>{{ (dgnResultViewMode === 'TOP10' ? dgnSimResult.top10.week : dgnResultViewMode === 'AVG' ? dgnSimResult.avg.week : dgnSimResult.bot90.week) % 4 }}<span class="text-[9px] font-normal text-slate-400 dark:text-neutral-500">주</span>
                  </span>
                </div>
                
                <div v-if="!dgnSimResult.isF2P" class="flex justify-between items-center px-1 py-1 bg-green-50 border border-green-100 dark:border-transparent dark:bg-green-900/20 rounded transition-colors">
                  <span class="text-[10px] font-bold text-green-700 dark:text-green-400">순수 디그니티 비용 (KRW)</span>
                  <span class="text-xs font-black text-green-700 dark:text-green-400">
                    {{ new Intl.NumberFormat().format(dgnResultViewMode === 'TOP10' ? dgnSimResult.top10.cost : dgnResultViewMode === 'AVG' ? dgnSimResult.avg.cost : dgnSimResult.bot90.cost) }} <span class="text-[8px] font-normal">원</span>
                  </span>
                </div>

                <div class="flex justify-between items-center px-1 py-1 bg-red-50 border border-red-100 dark:border-transparent dark:bg-red-900/20 rounded mt-1 transition-colors">
                  <span class="text-[10px] font-bold text-red-600 dark:text-red-500">예상 부족 타팀 TOP 재료</span>
                  <span class="text-xs font-black text-red-600 dark:text-red-500">
                    - {{ new Intl.NumberFormat().format(Math.max(0, dgnResultViewMode === 'TOP10' ? dgnSimResult.top10.netTop : dgnResultViewMode === 'AVG' ? dgnSimResult.avg.netTop : dgnSimResult.bot90.netTop)) }} <span class="text-[8px] font-normal">장</span>
                  </span>
                </div>
              </div>
              <div v-else class="text-center text-slate-400 dark:text-neutral-400 text-xs py-4 font-bold">통계 계산 중...</div>

              <div class="mt-3 pt-3 border-t border-slate-200 dark:border-neutral-700 transition-colors">
                <div class="text-[10px] font-extrabold text-slate-600 dark:text-neutral-400 mb-1.5 flex items-center gap-1"><Search class="w-3 h-3"/> 내 운세 (백분위) 판독기</div>
                <div class="flex gap-2">
                  <input type="number" v-model.number="dgnUserSpentKrw" :placeholder="dgnSimResult?.isF2P ? '실제 걸린 개월 수 입력' : '실제 소모한 금액(원) 입력'" class="flex-1 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-600 rounded-lg p-1.5 text-[10px] font-bold outline-none focus:border-indigo-500 text-slate-900 dark:text-white transition-colors">
                  <button @click="dgnCheckMyLuck" class="px-3 bg-slate-800 dark:bg-neutral-700 text-white rounded-lg text-[10px] font-bold hover:bg-slate-900 dark:hover:bg-black transition-colors shrink-0">결과 확인</button>
                </div>
                <div v-if="dgnMyLuckPercentile !== null" class="mt-2 text-center text-[11px] font-extrabold bg-white dark:bg-neutral-900 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 transition-colors">
                  상위 <span :class="dgnMyLuckPercentile <= 10 ? 'text-blue-600 dark:text-blue-500' : dgnMyLuckPercentile >= 90 ? 'text-red-600 dark:text-red-500' : 'text-indigo-600 dark:text-indigo-500'">{{ dgnMyLuckPercentile }}%</span> 입니다! <span class="ml-1 font-medium text-slate-500 dark:text-neutral-500 truncate">{{ dgnLuckTitle }}</span>
                </div>
              </div>
            </div>

            <div class="flex-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-2 min-h-[200px] relative flex flex-col shadow-inner transition-colors">
              <div class="text-[9px] font-bold text-slate-400 dark:text-neutral-400 mb-1 text-center">{{ dgnSimResult?.isF2P ? '소요 기간(개월)' : '소모 금액(원)' }} 누적 확률 분포도 (1회 성공 확률: {{ dgnSimResult?.oneTryProb?.toFixed(4) || 0 }}%)</div>
              <div class="relative flex-1 w-full h-full">
                <canvas ref="dgnChartCanvas"></canvas>
              </div>
            </div>
          </div>
        </div>
      </section>
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
