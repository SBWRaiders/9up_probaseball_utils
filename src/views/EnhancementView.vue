<script setup lang="ts">
import { ref, computed, watch, reactive, onMounted, nextTick } from 'vue'
import { 
  Zap, RefreshCw, ArrowRight, Check, X, Calculator, History, 
  Lock, Unlock, Play, Star, Settings, Pause, Edit3, Target, BarChart, Info, Gem, RefreshCcw, Plus, Trash2, Search, ShoppingCart, Wallet, Package
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
// [2] 커리어 옵션 시뮬레이터
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
const BATTER_OPTS = [ { id: 0, name: '전체 능력치 상승', setBonus: 6, vals: [[2,3,4], [5,6,7], [8,9,10], [12,13,14]] }, { id: 1, name: '컨택트 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] }, { id: 2, name: '홈런 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] }, { id: 3, name: '삼진회피 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] }, { id: 4, name: '선구 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] }, { id: 5, name: '갭파워 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] }, { id: 6, name: '지고 있을 시, 파워 상승', setBonus: 50, vals: [[5,12,17], [22,29,34], [39,46,51], [56,63,68]] }, { id: 7, name: '안타를 기록할 때마다 파워 상승', setBonus: 40, vals: [[3,5,9], [12,14,17], [20,22,26], [29,31,34]] }, { id: 8, name: '자신 보다 파워 높은 카드 상대 시, 파워 상승', setBonus: 40, vals: [[7,14,22], [29,36,43], [49,56,65], [71,78,85]] }, { id: 9, name: '박빙 상황(2점차 이내)에서 파워 상승', setBonus: 50, vals: [[5,11,16], [22,27,33], [38,43,49], [54,60,65]] }, { id: 10, name: '자신보다 파워 낮은 카드 상대 시, 파워 상승', setBonus: 40, vals: [[7,14,22], [29,36,43], [49,56,65], [71,78,85]] }, { id: 11, name: '★ 라인업의 동일 팀 카드 수만큼, 파워 상승', setBonus: 2, vals: [[0], [0], [0], [2]] } ]
const PITCHER_OPTS = [ { id: 0, name: '전체 능력치 상승', setBonus: 6, vals: [[2,3,4], [5,6,7], [8,9,10], [12,13,14]] }, { id: 1, name: '무브먼트 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] }, { id: 2, name: '홈런억제 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] }, { id: 3, name: '스터프 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] }, { id: 4, name: '컨트롤 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] }, { id: 5, name: '장타 억제 능력치 상승', setBonus: 25, vals: [[5,10,14], [19,23,28], [32,37,41], [46,50,55]] }, { id: 6, name: '지고 있을 시, 파워 상승', setBonus: 50, vals: [[5,12,17], [22,29,34], [39,46,51], [56,63,68]] }, { id: 7, name: '삼진을 기록할 때마다 파워 상승', setBonus: 6, vals: [[1,2,3], [3,5,7], [7,9,10], [10,12,14]] }, { id: 8, name: '자신 보다 파워 높은 카드 상대 시, 파워 상승', setBonus: 40, vals: [[7,14,22], [29,36,43], [49,56,65], [71,78,85]] }, { id: 9, name: '박빙 상황(2점차 이내)에서 파워 상승', setBonus: 50, vals: [[5,11,16], [22,27,33], [38,43,49], [54,60,65]] }, { id: 10, name: '자신보다 파워 낮은 카드 상대 시, 파워 상승', setBonus: 40, vals: [[7,14,22], [29,36,43], [49,56,65], [71,78,85]] }, { id: 11, name: '★ 라인업의 동일 팀 카드 수만큼, 파워 상승', setBonus: 2, vals: [[0], [0], [0], [2]] } ]
const CURRENT_DATA = computed(() => playerType.value === 'BATTER' ? BATTER_OPTS : PITCHER_OPTS)
const selectedCardIdx = ref(0)
const selectedCard = computed(() => CARD_TYPES[selectedCardIdx.value])
const slots = ref(Array.from({ length: 5 }, (_, i) => ({ id: i, tier: 0, optId: 0, statVal: 4, isLocked: false })))
const specialSlot = ref({ tier: 3, optId: 0, statVal: 14 })
const totalApSpent = ref(0); const totalCashSpent = ref(0); const specialSpinCount = ref(0); const apSpinCount = ref(0)
const currentRollCostAP = computed(() => { const card = selectedCard.value; let lockedCount = slots.value.filter(s => s.isLocked).length; if (lockedCount === 5) return 0; let cost = card.lockAP[lockedCount]; slots.value.forEach(slot => { cost += card.baseAP[slot.tier] }); return cost })
const rollOption = (tier: number) => { const isMaster = tier === 3; const totalWeight = isMaster ? 34 : 33; let rand = Math.random() * totalWeight; let optId = 0; for (let i = 0; i < 12; i++) { if (!isMaster && i === 11) continue; rand -= (i === 11) ? 1 : 3; if (rand < 0) { optId = i; break } }; const vals = CURRENT_DATA.value[optId].vals[tier]; const valIdx = Math.floor(Math.random() * vals.length); return { optId, statVal: vals[valIdx] } }
const rollSlots = () => { const card = selectedCard.value; let lockedCount = slots.value.filter(s => s.isLocked).length; if (lockedCount === 5) return; let costAP = card.lockAP[lockedCount]; let costCash = card.lockCash[lockedCount]; slots.value.forEach(slot => { costAP += card.baseAP[slot.tier]; if (!slot.isLocked) { if (slot.tier < 3 && Math.random() < 0.01) slot.tier++; const rolled = rollOption(slot.tier); slot.optId = rolled.optId; slot.statVal = rolled.statVal } }); totalApSpent.value += costAP; totalCashSpent.value += costCash; apSpinCount.value++ }
const spinSpecialSlot = () => { const rolled = rollOption(3); specialSlot.value.optId = rolled.optId; specialSlot.value.statVal = rolled.statVal; specialSpinCount.value++ }
const resetCareerSim = () => { totalApSpent.value = 0; totalCashSpent.value = 0; apSpinCount.value = 0; specialSpinCount.value = 0; slots.value.forEach(s => { s.tier = 0; s.isLocked = false; s.optId = 0; s.statVal = CURRENT_DATA.value[0].vals[0][0] }); specialSlot.value.optId = 0; specialSlot.value.statVal = CURRENT_DATA.value[0].vals[3][2] }
const toggleLock = (index: number) => slots.value[index].isLocked = !slots.value[index].isLocked
const setEffects = computed(() => { const counts: Record<number, number> = {}; slots.value.forEach(s => counts[s.optId] = (counts[s.optId] || 0) + 1); counts[specialSlot.value.optId] = (counts[specialSlot.value.optId] || 0) + 1; return Object.entries(counts).filter(([_, count]) => count >= 3).map(([optId, count]) => { const optData = CURRENT_DATA.value[Number(optId)]; const totalBonus = optData.setBonus * count; return { name: optData.name, count, bonusStr: `슬롯당 +${optData.setBonus} (총 +${totalBonus})` } }) })
const validateStatVal = (slot: any) => { if (slot.tier !== 3 && slot.optId === 11) slot.optId = 0; const validVals = CURRENT_DATA.value[slot.optId].vals[slot.tier]; if (!validVals.includes(Number(slot.statVal))) slot.statVal = validVals[validVals.length - 1] }
watch(playerType, () => { slots.value.forEach(s => validateStatVal(s)); validateStatVal(specialSlot.value) })
const isSpinning = ref(false); const isAutoModalOpen = ref(false); const autoSpinInterval = ref<any>(null); const autoMenuTab = ref<'set'|'tier'|'master'|'pro'|'elite'|'rookie'>('set')
const autoState = reactive({ setTargetOptions: [] as number[], tierTargetMaster: 0, tierTargetPro: 0, tierTargetElite: 0, masterOptions: [] as number[], proOptions: [] as number[], eliteOptions: [] as number[], rookieOptions: [] as number[] })
const isAllChecked = (tabOptions: number[]) => tabOptions.length === CURRENT_DATA.value.length
const toggleAll = (tab: 'set'|'master'|'pro'|'elite'|'rookie', isChecked: boolean) => { const allIds = CURRENT_DATA.value.map(opt => opt.id); if (tab === 'set') autoState.setTargetOptions = isChecked ? [...allIds] : []; if (tab === 'master') autoState.masterOptions = isChecked ? [...allIds] : []; if (tab === 'pro') autoState.proOptions = isChecked ? [...allIds] : []; if (tab === 'elite') autoState.eliteOptions = isChecked ? [...allIds] : []; if (tab === 'rookie') autoState.rookieOptions = isChecked ? [...allIds] : [] }
const getTierCount = (tierIdx: number) => slots.value.filter(s => s.tier >= tierIdx).length 
const checkAutoStopCondition = () => { const unlockedSlots = slots.value.filter(s => !s.isLocked); if (unlockedSlots.length === 0) return true; if (autoState.setTargetOptions.length > 0) { for (const ef of setEffects.value) { const optId = CURRENT_DATA.value.findIndex(o => o.name === ef.name); if (autoState.setTargetOptions.includes(optId)) return true } } if (autoState.tierTargetMaster > 0 && getTierCount(3) >= autoState.tierTargetMaster) return true; if (autoState.tierTargetPro > 0 && getTierCount(2) >= autoState.tierTargetPro) return true; if (autoState.tierTargetElite > 0 && getTierCount(1) >= autoState.tierTargetElite) return true; if (autoState.masterOptions.length > 0) { if (unlockedSlots.some(s => s.tier === 3 && autoState.masterOptions.includes(s.optId))) return true } if (autoState.proOptions.length > 0) { if (unlockedSlots.some(s => s.tier === 2 && autoState.proOptions.includes(s.optId))) return true } if (autoState.eliteOptions.length > 0) { if (unlockedSlots.some(s => s.tier === 1 && autoState.eliteOptions.includes(s.optId))) return true } if (autoState.rookieOptions.length > 0) { if (unlockedSlots.some(s => s.tier === 0 && autoState.rookieOptions.includes(s.optId))) return true } return false }
const startAutoSpin = () => { const isAnySet = autoState.setTargetOptions.length > 0 || autoState.tierTargetMaster > 0 || autoState.tierTargetPro > 0 || autoState.tierTargetElite > 0 || autoState.masterOptions.length > 0 || autoState.proOptions.length > 0 || autoState.eliteOptions.length > 0 || autoState.rookieOptions.length > 0; if (!isAnySet) { alert("자동 승급 옵션 또는 목표 등급을 하나 이상 설정해주세요."); return }; isAutoModalOpen.value = false; isSpinning.value = true; autoSpinInterval.value = setInterval(() => { if (!isSpinning.value) { clearInterval(autoSpinInterval.value); return }; rollSlots(); if (checkAutoStopCondition()) stopAutoSpin() }, 300) }
const stopAutoSpin = () => { isSpinning.value = false; if (autoSpinInterval.value) { clearInterval(autoSpinInterval.value); autoSpinInterval.value = null } }

// ==============================================
// 🔥 각인 시뮬레이터 로직
// ==============================================
const engPlayerType = ref<'BATTER' | 'PITCHER'>('BATTER')
interface SubStat { name: string; base: number; bonus: number; eMin: number; eMax: number; enhanceCount: number }
interface EngCard { grade: 'legend' | 'ultimate'; position: string; mainName: string; mainBase: number; mainBonus: number; subStats: SubStat[]; pctName?: string; pctBase?: number; level: number; resetCount: number; }
const engState = reactive({ ap: 0, cash: 0, legendUsed: 0, core: 0, refining: 0, conversion: 0, gachaCount: 15 })
const engCard = ref<EngCard | null>(null)
const engLogs = ref<{ id: number, msg: string, type: 'normal'|'success'|'fail'|'action' }[]>([{ id: 0, msg: "시스템 준비 완료...", type: 'normal' }])
let engLogId = 1
const ENG_COSTS = { enhance: { legend: [60, 120, 240, 600, 1200], ultimate: [250, 500, 1000, 2500, 5000] }, reset: { legend: [10, 20, 30, 50, 100], ultimate: [100, 200, 300, 400, 500] } }
const ENG_DB = computed(() => { const isBatter = engPlayerType.value === 'BATTER'; const createStat = (name: string, uMin: number, uMax: number, uEmin: number, uEmax: number, lMin: number, lMax: number, lEmin: number, lEmax: number) => ({ name, ult: { min: uMin, max: uMax, eMin: uEmin, eMax: uEmax }, leg: { min: lMin, max: lMax, eMin: lEmin, eMax: lEmax } }); const common7to13 = [ createStat('수비 능력치 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('지고 있을 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('박빙 상황(2점차 이내)에서 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('자신보다 파워 높은 카드 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('자신보다 파워 낮은 카드 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('2아웃 상황에서 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10) ]; const batterSub = [ createStat('전체 능력치 상승', 3, 5, 1, 3, 2, 3, 1, 2), createStat('컨택트 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8), createStat('갭파워 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8), createStat('홈런 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8), createStat('선구 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8), createStat('삼진회피 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8), ...common7to13, createStat('구종 스킬 가진 투수 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('출루 시 주루 상승', 25, 40, 5, 7, 15, 25, 3, 5), createStat('다른 핸드타입의 투수 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('주자가 2루 또는 3루에 있을 경우, 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('타점 기록 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('주자 없을 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('상대 팀 선발을 상대시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('경기 1회~4회까지만 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('경기 5회~9회까지만 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('경기 총 수익 증가', 5, 7, 2, 4, 3, 5, 1, 3) ]; const pitcherSub = [ createStat('전체 능력치 상승', 3, 5, 1, 3, 2, 3, 1, 2), createStat('무브먼트 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8), createStat('장타 억제 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8), createStat('홈런 억제 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8), createStat('컨트롤 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8), createStat('스터프 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8), ...common7to13, createStat('클린업 타순을 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('주자 있을 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('같은 핸드타입의 타자 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('한계투구 능력치 상승', 10, 15, 3, 5, 6, 10, 3, 4), createStat('실점한 이닝에 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('등판 후 첫 타자 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('1선발, 2선발로 기용 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('경기 1회~4회까지만 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('경기 5회~9회까지만 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10), createStat('경기 총 수익 증가', 5, 7, 2, 4, 3, 5, 1, 3) ]; return { positions: [isBatter ? '타자' : '투수'], mainTypes: isBatter ? ['컨택트', '갭파워', '홈런', '선구', '삼진회피'] : ['무브먼트', '장타 억제', '홈런 억제', '컨트롤', '스터프'], pctConditions: ['MMVP', '골든글러브', '디그니티', '신인왕', '에이스', '탑클래스', '팀플레이어', '히트', '연도(골글)'], pctValues: [1, 2, 3], ultMainValues: [190, 200, 210, 220, 230], subStats: isBatter ? batterSub : pitcherSub } })
const pickRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const generateSubStat = (grade: 'legend' | 'ultimate', enhanceCount: number = 0): SubStat => { const effect = pickRandom(ENG_DB.value.subStats); const stats = grade === 'ultimate' ? effect.ult : effect.leg; const base = randomInt(stats.min, stats.max); let bonus = 0; for (let i = 0; i < enhanceCount; i++) bonus += randomInt(stats.eMin, stats.eMax); return { name: effect.name, base, bonus, eMin: stats.eMin, eMax: stats.eMax, enhanceCount } }
const engAddLog = (msg: string, type: 'normal'|'success'|'fail'|'action' = 'normal') => { engLogs.value.unshift({ id: engLogId++, msg, type }); if (engLogs.value.length > 50) engLogs.value.pop() }
const drawLegend = () => { engPlayerType.value = Math.random() < 0.5 ? 'BATTER' : 'PITCHER'; engCard.value = { grade: 'legend', position: engPlayerType.value === 'BATTER' ? '타자' : '투수', mainName: pickRandom(ENG_DB.value.mainTypes), mainBase: 200, mainBonus: 0, subStats: [generateSubStat('legend', 0), generateSubStat('legend', 0), generateSubStat('legend', 0)], level: 0, resetCount: 0 }; engAddLog(`[레전드 획득] ${engCard.value.position} ${engCard.value.mainName} 레전드 각인을 뽑았습니다!`, 'action') }
const drawUltimate = () => { engPlayerType.value = Math.random() < 0.5 ? 'BATTER' : 'PITCHER'; engCard.value = { grade: 'ultimate', position: engPlayerType.value === 'BATTER' ? '타자' : '투수', mainName: pickRandom(ENG_DB.value.mainTypes), mainBase: pickRandom(ENG_DB.value.ultMainValues), mainBonus: 0, subStats: [generateSubStat('ultimate', 0), generateSubStat('ultimate', 0), generateSubStat('ultimate', 0)], pctName: pickRandom(ENG_DB.value.pctConditions), pctBase: pickRandom(ENG_DB.value.pctValues), level: 0, resetCount: 0 }; engAddLog(`[얼티밋 획득] ${engCard.value.position} ${engCard.value.mainName} 얼티밋 각인을 뽑았습니다!`, 'action') }
const combineUltimate = () => { if (engState.gachaCount <= 0) { engAddLog(`[경고] 주간 조합 횟수(15회)를 모두 소진했습니다.`, 'fail'); return }; engState.gachaCount--; engState.legendUsed += 3; if (Math.random() < 0.04) { engPlayerType.value = Math.random() < 0.5 ? 'BATTER' : 'PITCHER'; engCard.value = { grade: 'ultimate', position: engPlayerType.value === 'BATTER' ? '타자' : '투수', mainName: pickRandom(ENG_DB.value.mainTypes), mainBase: pickRandom(ENG_DB.value.ultMainValues), mainBonus: 0, subStats: [generateSubStat('ultimate', 0), generateSubStat('ultimate', 0), generateSubStat('ultimate', 0)], pctName: pickRandom(ENG_DB.value.pctConditions), pctBase: pickRandom(ENG_DB.value.pctValues), level: 0, resetCount: 0 }; engAddLog(`[대성공] 4% 확률을 뚫고 얼티밋 조합에 성공했습니다!`, 'success') } else { engAddLog(`[실패] 조합 실패... 레전드 각인 3개가 파괴되었습니다.`, 'fail') } }
const resetGachaLimit = () => { engState.gachaCount = 15; engAddLog(`[시스템] 주간 조합 가능 횟수가 15회로 초기화되었습니다.`, 'action') }
const enhanceCard = () => { if (!engCard.value || engCard.value.level >= 5) return; const card = engCard.value; const reqCores = ENG_COSTS.enhance[card.grade][card.level]; engState.core += reqCores; const mainIncrease = randomInt(card.grade === 'ultimate' ? 10 : 10, card.grade === 'ultimate' ? 25 : 20); card.mainBonus += mainIncrease; const targetSubIndex = Math.floor(Math.random() * 3); const targetSub = card.subStats[targetSubIndex]; const subIncrease = randomInt(targetSub.eMin, targetSub.eMax); targetSub.bonus += subIncrease; targetSub.enhanceCount++; card.level++; engAddLog(`[강화+${card.level} 성공] 메인+${mainIncrease}, [ ${targetSubIndex+1}번 부가옵션(${targetSub.name}) +${subIncrease} ] 상승!`, 'action') }
const resetEnhanceCard = () => { if (!engCard.value || engCard.value.resetCount >= 3 || engCard.value.level === 0) return; const card = engCard.value; const reqCash = ENG_COSTS.reset[card.grade][card.level - 1]; engState.cash += reqCash; card.resetCount++; card.level = 0; card.mainBonus = 0; card.subStats.forEach(sub => { sub.bonus = 0; sub.enhanceCount = 0 }); engAddLog(`[강화 초기화] ${reqCash}캐시 소모로 강화를 초기화했습니다. (남은 횟수: ${3 - card.resetCount}/3)`, 'fail') }
const useRefiningStone = () => { if (!engCard.value) return; if (engCard.value.level > 0) return; engState.refining++; engCard.value.subStats = [generateSubStat(engCard.value.grade, 0), generateSubStat(engCard.value.grade, 0), generateSubStat(engCard.value.grade, 0)]; engAddLog(`[연성석 사용] 부가 옵션 3개가 모두 변경되었습니다.`, 'action') }
const useConversionStone = (index: number) => { if (!engCard.value) return; engState.conversion++; engCard.value.subStats[index] = generateSubStat(engCard.value.grade, engCard.value.subStats[index].enhanceCount); engAddLog(`[변환석 사용] ${index + 1}번 부가 옵션이 변경되었습니다.`, 'action') }
const updateSubStatRanges = (sub: SubStat) => { const found = ENG_DB.value.subStats.find(s => s.name === sub.name); if (found && engCard.value) { const stats = engCard.value.grade === 'ultimate' ? found.ult : found.leg; sub.eMin = stats.eMin; sub.eMax = stats.eMax } }
const formatNum = (num: number) => new Intl.NumberFormat().format(num)

// ==============================================
// 💎 [4] 디그니티 시뮬레이터 (9UP 인게임 100% 고증)
// ==============================================

const TEAMS = ['kia', 'ssg', 'kiwoom', 'samsung', 'doosan', 'lg', 'hanwha', 'lotte', 'hyundai', 'kt', 'sbw', 'nc']
const TEAM_NAMES: Record<string, string> = { kia: 'KIA', ssg: 'SSG', kiwoom: '키움', samsung: '삼성', doosan: '두산', lg: 'LG', hanwha: '한화', lotte: '롯데', hyundai: '현대', kt: 'KT', sbw: '쌍방울', nc: 'NC' }
const TEAM_COLORS: Record<string, string> = { kia: 'text-red-600', ssg: 'text-red-500', kiwoom: 'text-rose-800', samsung: 'text-blue-600', doosan: 'text-indigo-800', lg: 'text-pink-600', hanwha: 'text-orange-500', lotte: 'text-cyan-800', hyundai: 'text-green-600', kt: 'text-black dark:text-white', sbw: 'text-yellow-600', nc: 'text-blue-400' }

// 🔥 1~5차 디그니티 선수 실명 DB
const DIGNITY_WAVES: Record<number, Record<string, string>> = {
  1: { kia: '홍현우', ssg: '최정', kiwoom: '이택근', samsung: '양준혁', doosan: '박건우', lg: '류지현', hanwha: '장종훈', lotte: '이대호', hyundai: '박재홍', kt: '강백호', sbw: '박노준', nc: '나성범' },
  2: { kia: '이종범', nc: '테임즈', hyundai: '심정수', samsung: '구자욱', sbw: '김기태', doosan: '김동주', lg: '박용택', hanwha: '김태균', kiwoom: '박병호', lotte: '조성환', kt: '로하스', ssg: '박경완' },
  3: { hanwha: '폰세', ssg: '앤더슨', nc: '페디', kia: '네일', samsung: '밴덴헐크', lotte: '스트레일리', doosan: '린드블럼', hyundai: '임선동', lg: '소사', sbw: '김원형', kt: '데스파이네', kiwoom: '나이트' },
  4: { samsung: '오승환', sbw: '조규제', ssg: '박희수', doosan: '정재훈', kia: '임에렉', kt: '김재윤', hyundai: '정명원', kiwoom: '손승락', hanwha: '박정진', nc: '임창민', lotte: '손승락', lg: '김용수' },
  5: { kt: '안현민', kiwoom: '강정호', lotte: '호식', doosan: '김현수', kia: '김도영', lg: '오스틴', ssg: '정근우', hyundai: '브로빈', samsung: '이승엽', hanwha: '송지만', nc: '박민우', sbw: '최태원' }
}

const dignState = reactive({
  myTeam: 'kia',
  targetWave: 5,
  topCardTotal: 1000,
  topCardMyTeam: 83, // 약 1/12
  inventory: { normalPacks: 0, pickupPacks: 0, tickets: 0, myTeamDignity: 0, myTeamTop: 0, otherTop: 0 },
  album: Object.fromEntries(TEAMS.map(t => [t, 0])), // 현재 웨이브의 도감(보유수)
  pity: { pack: 0, trade: 0 },
  payback: {
    spentKRW: 0,
    claimed: { tier1: false, tier2: false, tier3: false, tier4: false, infCount: 0 }
  },
  logs: [] as { id: number, msg: string, type: string }[]
})
let dignLogId = 0
const dLog = (msg: string, type: 'normal'|'success'|'fail'|'action'|'epic' = 'normal') => { dignState.logs.unshift({ id: dignLogId++, msg, type }); if(dignState.logs.length > 50) dignState.logs.pop() }

// 도감 초기화 (웨이브 변경 시)
watch(() => dignState.targetWave, () => {
  TEAMS.forEach(t => dignState.album[t] = 0)
  dignState.inventory.myTeamDignity = 0
  dLog(`[시스템] ${dignState.targetWave}차 디그니티 도감으로 전환되었습니다.`, 'action')
})

// 중복 디그니티 개수 계산
const getDupeDignityTeams = () => {
  let dupes: string[] = []
  for (const t of TEAMS) {
    if (t === dignState.myTeam) continue
    let count = dignState.album[t]
    while (count > 1) { dupes.push(t); count-- } // 1장은 명함용
  }
  return dupes
}
const dupeDignityCount = computed(() => getDupeDignityTeams().length)

// 팩 개봉 로직
const openDignityPack = (count: number, isAuto = false) => {
  if (dignState.inventory.normalPacks < count && !isAuto) return alert("디그니티 팩이 부족합니다.")
  if (!isAuto) dignState.inventory.normalPacks -= count

  for (let i = 0; i < count; i++) {
    dignState.inventory.tickets += 2
    let gotDignity = false
    
    for (let j = 0; j < 8; j++) {
      if (Math.random() < 0.03) {
        gotDignity = true
        const team = TEAMS[Math.floor(Math.random() * 12)]
        const pName = DIGNITY_WAVES[dignState.targetWave][team]
        if (team === dignState.myTeam) {
          dignState.inventory.myTeamDignity++
          dLog(`✨[기적] 디그니티 팩에서 자팀 ${pName} 등장!✨`, 'epic')
        } else {
          dignState.album[team]++
          dLog(`[획득] ${TEAM_NAMES[team]} ${pName} 디그니티 획득! (도감: ${dignState.album[team]}장)`, 'success')
        }
      } else {
        if (Math.random() < (dignState.topCardMyTeam / dignState.topCardTotal)) dignState.inventory.myTeamTop++
        else dignState.inventory.otherTop++
      }
    }
    if(!gotDignity && count === 1) dLog(`[팩 개봉] 꽝... TOP 카드 8장과 티켓 2장 획득.`, 'normal')
    
    dignState.pity.pack++
    if (dignState.pity.pack % 50 === 0) {
      dignState.inventory.myTeamDignity++
      dLog(`🎉[팩 천장] 50회 누적 마일리지로 자팀 디그니티 1장 확정 지급!`, 'epic')
    }
  }
  if(count > 1) dLog(`[팩 개봉] 디그니티 팩 ${count}개를 개봉했습니다.`, 'action')
}

const openPickupPack = (count: number, isAuto = false) => {
  if (dignState.inventory.pickupPacks < count && !isAuto) return alert("디그니티 픽업 팩이 부족합니다.")
  if (!isAuto) dignState.inventory.pickupPacks -= count

  for (let i = 0; i < count; i++) {
    const team = TEAMS[Math.floor(Math.random() * 12)]
    const pName = DIGNITY_WAVES[dignState.targetWave][team]
    if (team === dignState.myTeam) {
      dignState.inventory.myTeamDignity++
      dLog(`✨[픽업팩] 자팀 ${pName} 100% 확정 등장!✨`, 'epic')
    } else {
      dignState.album[team]++
      dLog(`[픽업팩] ${TEAM_NAMES[team]} ${pName} 획득. (도감: ${dignState.album[team]}장)`, 'success')
    }
  }
}

// 트레이드(믹서기) 로직
const runTrades = (manual = false) => {
  let tradeCount = 0
  // 1순위: 디그니티 트레이드 (명함 제외 중복 3장)
  while (true) {
    let dupes = getDupeDignityTeams()
    if (dupes.length >= 3 && dignState.inventory.tickets >= 1) {
      dignState.album[dupes[0]]--; dignState.album[dupes[1]]--; dignState.album[dupes[2]]--;
      dignState.inventory.tickets--
      dignState.inventory.myTeamDignity++
      dignState.pity.trade++
      tradeCount++
      dLog(`[특별 트레이드] 타팀 디그니티 3장 믹서기 ➔ 자팀 디그니티 확정 획득! (스택: ${dignState.pity.trade})`, 'epic')
      
      if (dignState.pity.trade % 30 === 0) {
        dignState.inventory.myTeamDignity++
        dLog(`🎉[트레이드 천장] 30회 마일리지로 자팀 디그니티 1장 추가 지급!`, 'epic')
      }
    } else break;
  }
  // 2순위: TOP 트레이드 (타팀 TOP 3장)
  while (true) {
    if (dignState.inventory.otherTop >= 3 && dignState.inventory.tickets >= 1) {
      dignState.inventory.otherTop -= 3
      dignState.inventory.tickets--
      tradeCount++
      if (Math.random() < 0.03) {
        const team = TEAMS[Math.floor(Math.random() * 12)]
        const pName = DIGNITY_WAVES[dignState.targetWave][team]
        if (team === dignState.myTeam) {
          dignState.inventory.myTeamDignity++
          dLog(`🔥[TOP 트레이드] 3% 기적! 자팀 ${pName} 디그니티 획득!`, 'epic')
        } else {
          dignState.album[team]++
          dLog(`🔥[TOP 트레이드] 3% 기적! ${TEAM_NAMES[team]} ${pName} 획득!`, 'success')
        }
      } else {
        if (Math.random() < (dignState.topCardMyTeam / dignState.topCardTotal)) {
          dignState.inventory.myTeamTop++
          if(manual) dLog(`[TOP 트레이드] 자팀 TOP 카드 획득 (수집함 자동 보호)`, 'normal')
        } else {
          dignState.inventory.otherTop++
        }
      }
    } else break;
  }
  if (manual) {
    if (tradeCount > 0) dLog(`[시스템] 가능한 트레이드를 총 ${tradeCount}회 일괄 진행했습니다.`, 'action')
    else alert("재료(명함 제외 중복 카드 3장) 또는 특별 트레이드권이 부족합니다.")
  }
  return tradeCount
}

// 페이백 시스템 (하이브리드)
const processPayback = () => {
  const k = dignState.payback.spentKRW; const p = dignState.payback.claimed
  if (k >= 9900 && !p.tier1) { p.tier1 = true; dignState.inventory.normalPacks++; dLog(`[페이백] 9,900원 누적! 일반팩 1개 지급`, 'success') }
  if (k >= 99000 && !p.tier2) { p.tier2 = true; dignState.inventory.pickupPacks++; dLog(`[페이백] 99,000원 누적! 픽업팩 1개 지급`, 'success') }
  if (k >= 199000 && !p.tier3) { p.tier3 = true; dignState.inventory.normalPacks++; dLog(`[페이백] 199,000원 누적! 일반팩 1개 지급`, 'success') }
  if (k >= 299000 && !p.tier4) { p.tier4 = true; dignState.inventory.normalPacks++; dLog(`[페이백] 299,000원 누적! 일반팩 1개 지급`, 'success') }
  
  let nextInfTarget = (p.infCount + 1) * 300000
  while (k >= nextInfTarget) {
    p.infCount++
    dignState.inventory.tickets += 9
    dLog(`[페이백 무한] 30만원 당첨! 트레이드권 9개 무제한 지급! (${p.infCount}회차)`, 'epic')
    nextInfTarget = (p.infCount + 1) * 300000
  }
}
const resetPayback = () => { dignState.payback.spentKRW = 0; dignState.payback.claimed = { tier1: false, tier2: false, tier3: false, tier4: false, infCount: 0 }; dLog(`[시스템] 매월 1일: 페이백 누적 금액이 초기화되었습니다.`, 'action') }
const buyPackage = (price: number, normal: number, pickup: number, tickets: number, name: string) => {
  dignState.payback.spentKRW += price
  dignState.inventory.normalPacks += normal
  dignState.inventory.pickupPacks += pickup
  dignState.inventory.tickets += tickets
  dLog(`[상점] ${name} 구매 완료! (-${formatNum(price)}원)`, 'action')
  processPayback()
}

// 기댓값 계산기 (시뮬레이터)
const dignSimResult = ref<any>(null)
const isDignSimulating = ref(false)
const simTargetDignity = ref(1)

const runDignitySimulation = () => {
  if (dignState.inventory.normalPacks === 0 && dignState.inventory.pickupPacks === 0 && dignState.inventory.tickets === 0) return alert("장바구니(인벤토리)에 재화가 하나도 없습니다. 팩을 구매해주세요.")
  isDignSimulating.value = true
  
  setTimeout(() => {
    let successCount = 0
    let totalDignityObtained = 0
    const iterations = 10000
    
    // 현재 유저의 초기 상태 저장
    const initNormal = dignState.inventory.normalPacks
    const initPickup = dignState.inventory.pickupPacks
    const initTickets = dignState.inventory.tickets
    
    for (let i = 0; i < iterations; i++) {
      // 1회 독립 시행을 위한 임시 상태 복사
      let tempMyDign = 0
      let tempAlbum = { ...dignState.album }
      let tempOtherTop = dignState.inventory.otherTop
      let tempPackPity = dignState.pity.pack
      let tempTradePity = dignState.pity.trade
      let tempTickets = initTickets

      // 1. 픽업팩 개봉
      for(let p=0; p<initPickup; p++) {
        let team = TEAMS[Math.floor(Math.random() * 12)]
        if(team === dignState.myTeam) tempMyDign++
        else tempAlbum[team]++
      }

      // 2. 일반팩 개봉
      for(let p=0; p<initNormal; p++) {
        tempTickets += 2
        for(let j=0; j<8; j++) {
          if (Math.random() < 0.03) {
            let team = TEAMS[Math.floor(Math.random() * 12)]
            if(team === dignState.myTeam) tempMyDign++
            else tempAlbum[team]++
          } else {
            if (Math.random() >= (dignState.topCardMyTeam / dignState.topCardTotal)) tempOtherTop++
          }
        }
        tempPackPity++
        if(tempPackPity % 50 === 0) tempMyDign++
      }

      // 3. 트레이드 풀 가동
      while(true) {
        let dupes = []
        for(const t of TEAMS) { if(t !== dignState.myTeam) { let c = tempAlbum[t]; while(c>1){ dupes.push(t); c-- } } }
        
        if (dupes.length >= 3 && tempTickets >= 1) {
          tempAlbum[dupes[0]]--; tempAlbum[dupes[1]]--; tempAlbum[dupes[2]]--
          tempTickets--
          tempMyDign++; tempTradePity++
          if (tempTradePity % 30 === 0) tempMyDign++
        } 
        else if (tempOtherTop >= 3 && tempTickets >= 1) {
          tempOtherTop -= 3; tempTickets--
          if (Math.random() < 0.03) {
             let team = TEAMS[Math.floor(Math.random() * 12)]
             if(team === dignState.myTeam) tempMyDign++
             else tempAlbum[team]++
          } else {
             if (Math.random() >= (dignState.topCardMyTeam / dignState.topCardTotal)) tempOtherTop++
          }
        } 
        else break;
      }
      
      totalDignityObtained += tempMyDign
      if (tempMyDign >= simTargetDignity.value) successCount++
    }
    
    dignSimResult.value = {
      avg: (totalDignityObtained / iterations).toFixed(2),
      prob: ((successCount / iterations) * 100).toFixed(1)
    }
    isDignSimulating.value = false
  }, 100)
}
</script>

<template>
  <div class="w-full mx-auto px-2 sm:px-4 py-4 font-sans text-neutral-900 dark:text-neutral-100 flex flex-col min-h-screen relative">
    
    <!-- 탭 메뉴 -->
    <div class="flex justify-center shrink-0 mb-4">
      <div class="bg-white dark:bg-neutral-800 p-1.5 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex gap-1">
        <button @click="activeTab = 'dignity'" class="px-6 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2" :class="activeTab === 'dignity' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'"><Gem class="w-4 h-4"/>디그니티 시뮬레이터</button>
        <button @click="activeTab = 'engraving'" class="px-6 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2" :class="activeTab === 'engraving' ? 'bg-amber-500 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'"><Gem class="w-4 h-4"/>각인 시뮬레이터</button>
        <button @click="activeTab = 'enhance'" class="px-6 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2" :class="activeTab === 'enhance' ? 'bg-blue-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'"><Zap class="w-4 h-4"/>강화 시뮬레이터</button>
        <button @click="activeTab = 'career'" class="px-6 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2" :class="activeTab === 'career' ? 'bg-purple-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'"><Star class="w-4 h-4"/>커리어 시뮬레이터</button>
      </div>
    </div>

    <!-- 💎 [탭 4] 디그니티 시뮬레이터 (9UP 인게임 완벽 구현) -->
    <div v-show="activeTab === 'dignity'" class="flex flex-col w-full animate-fade-in max-w-[1600px] mx-auto">
      
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-5 w-full">
        <!-- [왼쪽 패널] 상점 & 설정 -->
        <section class="xl:col-span-3 flex flex-col gap-4">
          <!-- 타겟팅 설정 -->
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm">
            <h3 class="font-extrabold text-sm mb-3 flex items-center gap-1.5"><Target class="w-4 h-4 text-blue-500"/> 타겟팅 설정</h3>
            <div class="space-y-3">
              <div>
                <label class="text-[10px] font-bold text-neutral-500 block mb-1">내 구단 선택</label>
                <select v-model="dignState.myTeam" class="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded p-2 text-sm font-bold outline-none cursor-pointer">
                  <option v-for="t in TEAMS" :key="t" :value="t">{{ TEAM_NAMES[t] }}</option>
                </select>
              </div>
              <div>
                <label class="text-[10px] font-bold text-neutral-500 block mb-1">목표 디그니티 차수 (Wave)</label>
                <select v-model.number="dignState.targetWave" class="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded p-2 text-sm font-bold text-amber-600 outline-none cursor-pointer">
                  <option v-for="n in 5" :key="n" :value="n">{{ n }}st DIGNITY ({{ DIGNITY_WAVES[n][dignState.myTeam] }})</option>
                </select>
              </div>
              <div class="p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/50">
                <label class="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 block mb-1">TOP 카드 생태계 (비율)</label>
                <div class="flex gap-2">
                  <input type="number" v-model.number="dignState.topCardTotal" class="w-1/2 p-1 text-xs text-center rounded border outline-none" title="전체 TOP 장수">
                  <input type="number" v-model.number="dignState.topCardMyTeam" class="w-1/2 p-1 text-xs text-center rounded border outline-none" title="내 구단 TOP 장수">
                </div>
              </div>
            </div>
          </div>

          <!-- 페이백 시스템 -->
          <div class="bg-gradient-to-br from-neutral-900 to-black rounded-2xl p-4 text-white shadow-xl relative overflow-hidden">
            <div class="absolute -right-4 -top-4 opacity-10"><Wallet class="w-24 h-24"/></div>
            <div class="flex justify-between items-center mb-2 relative z-10">
              <div class="font-extrabold text-sm flex items-center gap-1.5"><Wallet class="w-4 h-4 text-green-400"/> 월간 누적 페이백</div>
              <button @click="resetPayback" class="text-[9px] bg-white/10 px-2 py-1 rounded hover:bg-white/20">초기화</button>
            </div>
            <div class="flex items-center gap-2 mb-3 relative z-10">
              <input type="number" v-model.number="dignState.payback.spentKRW" @change="processPayback" class="w-full bg-black/50 border border-white/20 rounded p-1.5 text-right font-black text-green-400 text-lg outline-none focus:border-green-400">
              <span class="text-xs font-bold text-neutral-400 shrink-0">원</span>
            </div>
            <div class="space-y-1 relative z-10">
              <div class="flex justify-between items-center text-[10px] p-1.5 rounded" :class="dignState.payback.claimed.tier1 ? 'bg-green-900/50 text-green-300' : 'text-neutral-500'"><span>9,900원</span><span class="font-bold">일반팩 1개</span></div>
              <div class="flex justify-between items-center text-[10px] p-1.5 rounded" :class="dignState.payback.claimed.tier2 ? 'bg-green-900/50 text-green-300' : 'text-neutral-500'"><span>99,000원</span><span class="font-bold">픽업팩 1개</span></div>
              <div class="flex justify-between items-center text-[10px] p-1.5 rounded" :class="dignState.payback.claimed.tier3 ? 'bg-green-900/50 text-green-300' : 'text-neutral-500'"><span>199,000원</span><span class="font-bold">일반팩 1개</span></div>
              <div class="flex justify-between items-center text-[10px] p-1.5 rounded" :class="dignState.payback.claimed.tier4 ? 'bg-green-900/50 text-green-300' : 'text-neutral-500'"><span>299,000원</span><span class="font-bold">일반팩 1개</span></div>
              <div class="flex justify-between items-center text-[10px] p-1.5 bg-yellow-900/30 text-yellow-500 rounded border border-yellow-700/50 mt-1"><span>30만 마다 (무한)</span><span class="font-bold">티켓 9개 ({{dignState.payback.claimed.infCount}}회)</span></div>
            </div>
          </div>

          <!-- 상점 패키지 -->
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex-1 overflow-y-auto">
            <h3 class="font-extrabold text-sm mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-2"><ShoppingCart class="w-4 h-4 inline-block mr-1"/> 상점</h3>
            <div class="space-y-2">
              <button @click="dignState.inventory.normalPacks++; dLog('주간 퀘스트 보상 획득 (일반팩 1)', 'action')" class="w-full text-left p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 transition-colors">
                <div class="text-[10px] font-bold text-blue-600 mb-0.5">주간 퀘스트 (무료)</div>
                <div class="text-xs font-black">일반팩 1개</div>
              </button>
              <button @click="dignState.inventory.tickets++; dignState.payback.spentKRW += 500; processPayback()" class="w-full text-left p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition-colors">
                <div class="text-[10px] font-bold text-neutral-500 mb-0.5">주간 캐시상점 (50캐시 = 500원)</div>
                <div class="text-xs font-black text-amber-600">특별 트레이드권 1개</div>
              </button>
              <button @click="buyPackage(55000, 1, 0, 20, '루키 패키지')" class="w-full text-left p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition-colors flex justify-between items-end">
                <div><div class="text-[10px] font-bold text-neutral-500 mb-0.5">루키 패키지</div><div class="text-xs font-black">일반1 + 티켓20</div></div>
                <div class="text-[11px] font-bold text-green-600">5.5만</div>
              </button>
              <button @click="buyPackage(99000, 3, 0, 10, '프레스티지 패키지')" class="w-full text-left p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition-colors flex justify-between items-end">
                <div><div class="text-[10px] font-bold text-neutral-500 mb-0.5">프레스티지 패키지</div><div class="text-xs font-black">일반3 + 티켓10</div></div>
                <div class="text-[11px] font-bold text-green-600">9.9만</div>
              </button>
              <button @click="buyPackage(99000, 0, 2, 0, '픽업 프레스티지')" class="w-full text-left p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800/50 transition-colors flex justify-between items-end">
                <div><div class="text-[10px] font-bold text-purple-500 mb-0.5">픽업 프레스티지</div><div class="text-xs font-black text-purple-700 dark:text-purple-400">픽업팩 2</div></div>
                <div class="text-[11px] font-bold text-green-600">9.9만</div>
              </button>
              <button @click="buyPackage(99000, 2, 0, 10, '프로 패키지')" class="w-full text-left p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition-colors flex justify-between items-end">
                <div><div class="text-[10px] font-bold text-neutral-500 mb-0.5">프로 패키지</div><div class="text-xs font-black">일반2 + 티켓10</div></div>
                <div class="text-[11px] font-bold text-green-600">9.9만</div>
              </button>
              <button @click="buyPackage(149000, 2, 1, 0, '레전드 패키지')" class="w-full text-left p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800/50 transition-colors flex justify-between items-end">
                <div><div class="text-[10px] font-bold text-amber-600 mb-0.5">레전드 패키지</div><div class="text-xs font-black text-amber-700 dark:text-amber-400">일반2 + 픽업1</div></div>
                <div class="text-[11px] font-bold text-green-600">14.9만</div>
              </button>
            </div>
          </div>
        </section>

        <!-- [중앙 패널] 인벤토리 & 플레이 (수동 가챠) -->
        <section class="xl:col-span-5 flex flex-col gap-4">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
            <h2 class="text-lg font-black mb-4 flex items-center gap-2"><Package class="w-5 h-5 text-indigo-500"/> 내 인벤토리</h2>
            <div class="grid grid-cols-3 gap-3 mb-5">
              <div class="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl text-center border border-neutral-200 dark:border-neutral-700">
                <div class="text-[10px] font-bold text-neutral-500 mb-1">일반 디그팩</div>
                <div class="text-xl font-black">{{ dignState.inventory.normalPacks }}</div>
              </div>
              <div class="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl text-center border border-purple-200 dark:border-purple-800/50">
                <div class="text-[10px] font-bold text-purple-500 mb-1">픽업 디그팩</div>
                <div class="text-xl font-black text-purple-600 dark:text-purple-400">{{ dignState.inventory.pickupPacks }}</div>
              </div>
              <div class="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl text-center border border-amber-200 dark:border-amber-800/50">
                <div class="text-[10px] font-bold text-amber-600 mb-1">특별 트레이드권</div>
                <div class="text-xl font-black text-amber-600 dark:text-amber-500">{{ dignState.inventory.tickets }}</div>
              </div>
            </div>

            <div class="flex flex-col gap-3">
              <div class="flex gap-2">
                <button @click="openDignityPack(1)" class="flex-1 py-3 bg-neutral-800 hover:bg-black dark:bg-neutral-700 dark:hover:bg-neutral-600 text-white rounded-xl font-bold shadow-md active:scale-95 transition-all text-sm">일반 1팩 개봉</button>
                <button @click="openDignityPack(10)" class="flex-1 py-3 bg-neutral-800 hover:bg-black dark:bg-neutral-700 dark:hover:bg-neutral-600 text-white rounded-xl font-bold shadow-md active:scale-95 transition-all text-sm">일반 10팩 개봉</button>
              </div>
              <button @click="openPickupPack(1)" class="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-extrabold shadow-md active:scale-95 transition-all text-sm">픽업 1팩 개봉 (100% 확정)</button>
            </div>
            
            <div class="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-between text-xs font-bold text-neutral-500">
              <span>팩 천장 스택: <span class="text-blue-500">{{dignState.pity.pack % 50}}</span> / 50</span>
              <span>트레이드 천장 스택: <span class="text-blue-500">{{dignState.pity.trade % 30}}</span> / 30</span>
            </div>
          </div>

          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm flex flex-col flex-1">
            <h3 class="font-extrabold text-sm mb-4 flex items-center gap-1.5"><RefreshCw class="w-4 h-4 text-green-500"/> 자동 필터 믹서기 (트레이드)</h3>
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div class="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl text-center border border-neutral-200 dark:border-neutral-700">
                <div class="text-[10px] font-bold text-neutral-500 mb-1">명함 제외, 갈려나갈 타팀 디그니티</div>
                <div class="text-lg font-black text-red-500">{{ dupeDignityCount }} 장</div>
              </div>
              <div class="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl text-center border border-neutral-200 dark:border-neutral-700">
                <div class="text-[10px] font-bold text-neutral-500 mb-1">타팀 TOP (자팀은 자동보호)</div>
                <div class="text-lg font-black text-neutral-700 dark:text-neutral-300">{{ dignState.inventory.otherTop }} 장</div>
              </div>
            </div>
            <button @click="runTrades(true)" class="w-full py-4 mt-auto bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-lg shadow-md active:scale-95 transition-all flex items-center justify-center gap-2">
              <RefreshCw class="w-5 h-5"/> 믹서기 가동 (티켓 소모)
            </button>
            <div class="text-[10px] text-center text-neutral-400 mt-2 font-bold">1순위: 디그니티 트레이드 (자팀 확정) / 2순위: TOP 트레이드 (3%)</div>
          </div>

          <!-- 로그창 -->
          <div class="bg-[#0f0f13] border border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-col h-[200px]">
            <div class="text-[11px] font-bold text-neutral-500 mb-2 flex items-center gap-1.5"><History class="w-3.5 h-3.5"/> 실시간 가챠 로그</div>
            <div class="flex-1 overflow-y-auto space-y-1 font-mono text-[10px]">
              <div v-for="log in dignState.logs" :key="log.id" :class="{'text-neutral-300': log.type === 'normal', 'text-green-400 font-bold': log.type === 'success', 'text-blue-300': log.type === 'action', 'text-amber-400 font-black text-[11px]': log.type === 'epic', 'text-red-400': log.type === 'fail'}">
                <span class="opacity-50 mr-1">></span>{{ log.msg }}
              </div>
            </div>
          </div>
        </section>

        <!-- [오른쪽 패널] 도감 & 기댓값 플래너 -->
        <section class="xl:col-span-4 flex flex-col gap-4">
          <div class="bg-gradient-to-b from-blue-900 to-black border border-blue-800 rounded-2xl p-5 shadow-xl shrink-0 flex flex-col relative overflow-hidden">
            <Gem class="absolute -right-4 -bottom-4 w-32 h-32 text-blue-500 opacity-10"/>
            <div class="text-center relative z-10">
              <div class="text-[11px] font-extrabold text-blue-400 mb-1">최종 목표 획득 결과물</div>
              <div class="text-3xl font-black text-white flex items-center justify-center gap-2">
                {{ TEAM_NAMES[dignState.myTeam] }} {{ DIGNITY_WAVES[dignState.targetWave][dignState.myTeam] }}
              </div>
              <div class="text-5xl font-black text-yellow-400 mt-2">{{ dignState.inventory.myTeamDignity }} <span class="text-xl text-yellow-600">장</span></div>
              <div class="text-[10px] text-blue-200 mt-3 bg-blue-950/50 py-1 rounded">수집함 보호된 자팀 TOP 카드: {{ dignState.inventory.myTeamTop }} 장</div>
            </div>
          </div>

          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex-1 flex flex-col">
            <h3 class="font-extrabold text-sm mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-2">📖 {{ dignState.targetWave }}차 타팀 디그니티 도감</h3>
            <div class="grid grid-cols-3 gap-2 overflow-y-auto pr-1 flex-1 content-start">
              <div v-for="t in TEAMS" :key="t" v-show="t !== dignState.myTeam" class="p-2 rounded-lg border text-center relative transition-colors" :class="dignState.album[t] > 0 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700' : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-800 opacity-60 grayscale'">
                <div class="text-[9px] font-black mb-0.5" :class="TEAM_COLORS[t]">{{ TEAM_NAMES[t] }}</div>
                <div class="text-xs font-bold" :class="dignState.album[t] > 0 ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'">{{ DIGNITY_WAVES[dignState.targetWave][t] }}</div>
                <div v-if="dignState.album[t] > 1" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm">+{{ dignState.album[t] - 1 }} 중복</div>
                <div v-if="dignState.album[t] === 1" class="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm"><Lock class="w-2.5 h-2.5 inline"/> 명함</div>
              </div>
            </div>
          </div>

          <div class="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl p-4 shadow-sm shrink-0">
            <h3 class="font-extrabold text-sm mb-2 flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400"><Calculator class="w-4 h-4"/> 기댓값 시뮬레이터 (과금 플래너)</h3>
            <div class="text-[10px] font-bold text-neutral-500 mb-3">현재 보유(장바구니) 중인 재화(팩, 티켓)를 전소했을 때의 기댓값을 산출합니다. (시행 1만 회)</div>
            
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xs font-bold text-indigo-900 dark:text-indigo-200">목표 자팀 획득:</span>
              <input type="number" v-model.number="simTargetDignity" class="w-16 bg-white dark:bg-neutral-900 border border-indigo-300 dark:border-indigo-700 rounded p-1 text-xs text-center font-bold outline-none">
              <span class="text-xs font-bold text-indigo-900 dark:text-indigo-200">장 이상</span>
            </div>

            <button @click="runDignitySimulation" :disabled="isDignSimulating" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 text-sm flex justify-center items-center gap-2">
              <BarChart class="w-4 h-4"/> {{ isDignSimulating ? '10,000회 연산 중...' : '시뮬레이션 가동' }}
            </button>
            
            <div v-if="dignSimResult" class="mt-3 p-3 bg-white dark:bg-neutral-900 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-inner flex justify-between items-center">
              <div>
                <div class="text-[10px] font-bold text-neutral-500 mb-0.5">평균 획득량 (기댓값)</div>
                <div class="text-lg font-black text-indigo-600">{{ dignSimResult.avg }} <span class="text-xs font-medium text-neutral-500">장</span></div>
              </div>
              <div class="text-right">
                <div class="text-[10px] font-bold text-neutral-500 mb-0.5">목표 달성 확률</div>
                <div class="text-lg font-black" :class="dignSimResult.prob >= 50 ? 'text-green-500' : 'text-red-500'">{{ dignSimResult.prob }} <span class="text-xs font-medium text-neutral-500">%</span></div>
              </div>
            </div>
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
