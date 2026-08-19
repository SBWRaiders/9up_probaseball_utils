<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { 
  Zap, RefreshCw, ArrowRight, Check, X, Calculator, History, 
  Lock, Unlock, Play, Star, Settings, Pause, Edit3, Target, BarChart, Info, Gem, RefreshCcw
} from 'lucide-vue-next'

const activeTab = ref<'enhance' | 'career' | 'engraving'>('engraving')

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

const calcTargetGoal = ref<'5MASTER' | 'TARGET_SET' | 'TARGET_3_3'>('5MASTER')
const calcTargetSetCount = ref(3)
const calcTargetSetOptId = ref(0)
const calcTarget3_3_Opt1 = ref(0)
const calcTarget3_3_Opt2 = ref(1)
const useUpgradeMemory = ref(true)

const calcResult = ref<{ 
  avgRolls: number, avgAp: number, avgCash: number, specialRolls: number,
  memElite: number, memPro: number, memMaster: number 
} | null>(null)
const isCalculating = ref(false)

function SeededRNG(seed: number) {
  let state = seed
  return function() { state = (state * 9301 + 49297) % 233280; return state / 233280 }
}

const runExpectedValueCalc = () => {
  isCalculating.value = true
  calcResult.value = null
  
  setTimeout(() => {
    const card = selectedCard.value
    let rng = SeededRNG(12345) 
    let simAp = 0, simCash = 0, simRolls = 0, simSpecialRolls = 0
    let simMemE = 0, simMemP = 0, simMemM = 0
    const iterations = 3000 
    
    for (let i = 0; i < iterations; i++) {
      let tempSlots = slots.value.map(s => ({ ...s }))
      let spOpt = specialSlot.value.optId
      let r = 0, ap = 0, cash = 0, sr = 0
      let mE = 0, mP = 0, mM = 0
      
      if (calcTargetGoal.value === '5MASTER') {
        while (true) {
          if (useUpgradeMemory.value) {
            let rCount = tempSlots.filter(s => s.tier === 0).length
            if (rCount === 1 && tempSlots.filter(s => s.tier >= 1).length >= 4) { tempSlots.find(s => s.tier === 0)!.tier = 1; mE++ }
            let eCount = tempSlots.filter(s => s.tier === 1).length
            if (eCount === 1 && tempSlots.filter(s => s.tier >= 2).length >= 4) { tempSlots.find(s => s.tier === 1)!.tier = 2; mP++ }
            let pCount = tempSlots.filter(s => s.tier === 2).length
            if (pCount === 1 && tempSlots.filter(s => s.tier === 3).length >= 4) { tempSlots.find(s => s.tier === 2)!.tier = 3; mM++ }
          }
          if (tempSlots.every(s => s.tier === 3)) break
          r++
          let lc = tempSlots.filter(s => s.isLocked).length
          let loopAp = card.lockAP[lc]
          tempSlots.forEach(s => {
            if (!s.isLocked) {
              loopAp += card.baseAP[s.tier]
              if (s.tier < 3 && rng() < 0.01) s.tier++
            }
          })
          ap += loopAp
          if (r > 15000) break
        }
      } 
      else if (calcTargetGoal.value === 'TARGET_SET') {
        if (calcTargetSetCount.value === 6 && spOpt !== calcTargetSetOptId.value) {
          const w = calcTargetSetOptId.value === 11 ? 1 : 3
          sr += 1 / (w / 34)
          spOpt = calcTargetSetOptId.value
        }
        while (true) {
          if (useUpgradeMemory.value) {
            let rCount = tempSlots.filter(s => s.tier === 0).length
            if (rCount === 1 && tempSlots.filter(s => s.tier >= 1).length >= 4) { tempSlots.find(s => s.tier === 0)!.tier = 1; mE++ }
            let eCount = tempSlots.filter(s => s.tier === 1).length
            if (eCount === 1 && tempSlots.filter(s => s.tier >= 2).length >= 4) { tempSlots.find(s => s.tier === 1)!.tier = 2; mP++ }
            let pCount = tempSlots.filter(s => s.tier === 2).length
            if (pCount === 1 && tempSlots.filter(s => s.tier === 3).length >= 4) { tempSlots.find(s => s.tier === 2)!.tier = 3; mM++ }
          }
          let c = (spOpt === calcTargetSetOptId.value ? 1 : 0) + tempSlots.filter(s => s.tier === 3 && s.optId === calcTargetSetOptId.value).length
          if (c >= calcTargetSetCount.value) break
          r++
          let allMaster = tempSlots.every(s => s.tier === 3)
          if (allMaster) {
            let currentLocked = (spOpt === calcTargetSetOptId.value ? 1 : 0) + tempSlots.filter(s => s.isLocked && s.optId === calcTargetSetOptId.value).length
            tempSlots.forEach(s => {
              if (!s.isLocked && s.tier === 3 && s.optId === calcTargetSetOptId.value && currentLocked < calcTargetSetCount.value) {
                s.isLocked = true; currentLocked++
              }
            })
          }
          let lc = tempSlots.filter(s => s.isLocked).length
          let loopAp = card.lockAP[lc]; let loopCash = card.lockCash[lc]
          tempSlots.forEach(s => {
            if (!s.isLocked) {
              loopAp += card.baseAP[s.tier]
              if (s.tier < 3 && rng() < 0.01) s.tier++
              const rolled = rollOption(s.tier, false, rng)
              s.optId = rolled.optId
            }
          })
          ap += loopAp; cash += loopCash
          if (r > 20000) break
        }
      }
      else if (calcTargetGoal.value === 'TARGET_3_3') {
        if (spOpt !== calcTarget3_3_Opt1.value && spOpt !== calcTarget3_3_Opt2.value) {
          const w1 = calcTarget3_3_Opt1.value === 11 ? 1 : 3
          const w2 = calcTarget3_3_Opt2.value === 11 ? 1 : 3
          const prob = (w1 + w2) / 34
          sr += 1 / prob
          spOpt = (rng() < w1/(w1+w2)) ? calcTarget3_3_Opt1.value : calcTarget3_3_Opt2.value
        }
        while (true) {
          if (useUpgradeMemory.value) {
            let rCount = tempSlots.filter(s => s.tier === 0).length
            if (rCount === 1 && tempSlots.filter(s => s.tier >= 1).length >= 4) { tempSlots.find(s => s.tier === 0)!.tier = 1; mE++ }
            let eCount = tempSlots.filter(s => s.tier === 1).length
            if (eCount === 1 && tempSlots.filter(s => s.tier >= 2).length >= 4) { tempSlots.find(s => s.tier === 1)!.tier = 2; mP++ }
            let pCount = tempSlots.filter(s => s.tier === 2).length
            if (pCount === 1 && tempSlots.filter(s => s.tier === 3).length >= 4) { tempSlots.find(s => s.tier === 2)!.tier = 3; mM++ }
          }
          let c1 = (spOpt === calcTarget3_3_Opt1.value ? 1 : 0) + tempSlots.filter(s => s.tier === 3 && s.optId === calcTarget3_3_Opt1.value).length
          let c2 = (spOpt === calcTarget3_3_Opt2.value ? 1 : 0) + tempSlots.filter(s => s.tier === 3 && s.optId === calcTarget3_3_Opt2.value).length
          if (c1 >= 3 && c2 >= 3) break
          r++
          let allMaster = tempSlots.every(s => s.tier === 3)
          if (allMaster) {
            let currentLocked1 = (spOpt === calcTarget3_3_Opt1.value ? 1 : 0) + tempSlots.filter(s => s.isLocked && s.optId === calcTarget3_3_Opt1.value).length
            let currentLocked2 = (spOpt === calcTarget3_3_Opt2.value ? 1 : 0) + tempSlots.filter(s => s.isLocked && s.optId === calcTarget3_3_Opt2.value).length
            tempSlots.forEach(s => {
              if (!s.isLocked && s.tier === 3) {
                if (s.optId === calcTarget3_3_Opt1.value && currentLocked1 < 3) { s.isLocked = true; currentLocked1++ }
                else if (s.optId === calcTarget3_3_Opt2.value && currentLocked2 < 3) { s.isLocked = true; currentLocked2++ }
              }
            })
          }
          let lc = tempSlots.filter(s => s.isLocked).length
          let loopAp = card.lockAP[lc]; let loopCash = card.lockCash[lc]
          tempSlots.forEach(s => {
            if (!s.isLocked) {
              loopAp += card.baseAP[s.tier]
              if (s.tier < 3 && rng() < 0.01) s.tier++
              const rolled = rollOption(s.tier, false, rng)
              s.optId = rolled.optId
            }
          })
          ap += loopAp; cash += loopCash
          if (r > 20000) break
        }
      }
      simRolls += r; simAp += ap; simCash += cash; simSpecialRolls += sr
      simMemE += mE; simMemP += mP; simMemM += mM
    }
    calcResult.value = { 
      avgRolls: Math.round(simRolls / iterations), avgAp: Math.round(simAp / iterations), avgCash: Math.round(simCash / iterations),
      specialRolls: Math.round(simSpecialRolls / iterations), memElite: simMemE / iterations, memPro: simMemP / iterations, memMaster: simMemM / iterations
    }
    isCalculating.value = false
  }, 50)
}

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
const checkAutoStopCondition = () => {
  const unlockedSlots = slots.value.filter(s => !s.isLocked)
  if (unlockedSlots.length === 0) return true
  if (autoTab.value === 'SET') {
    if (autoTargetSetOpts.value.length === 0) return false
    const counts: Record<number, number> = {}
    slots.value.forEach(s => counts[s.optId] = (counts[s.optId] || 0) + 1)
    counts[specialSlot.value.optId] = (counts[specialSlot.value.optId] || 0) + 1
    return autoTargetSetOpts.value.some(optId => (counts[optId] || 0) >= autoTargetSetCount.value)
  }
  if (autoTab.value === 'TIER') return unlockedSlots.filter(s => s.tier >= autoTargetTierTier.value).length >= autoTargetTierCount.value
  if (autoTab.value.startsWith('OPT_')) {
    if (autoTargetOptOpts.value.length === 0) return false
    const targetTier = autoTab.value === 'OPT_MASTER' ? 3 : autoTab.value === 'OPT_PRO' ? 2 : autoTab.value === 'OPT_ELITE' ? 1 : 0
    return unlockedSlots.some(s => s.tier === targetTier && autoTargetOptOpts.value.includes(s.optId))
  }
  return false
}
const startAutoSpin = () => {
  if (slots.value.every(s => s.isLocked)) return alert("모든 슬롯이 잠겨있습니다.")
  if (autoTab.value === 'SET' && autoTargetSetOpts.value.length === 0) return alert("목표 옵션을 선택해주세요.")
  if (autoTab.value.startsWith('OPT_') && autoTargetOptOpts.value.length === 0) return alert("목표 옵션을 선택해주세요.")
  isAutoModalOpen.value = false; isSpinning.value = true
  spinInterval = setInterval(() => { rollSlots(); if (checkAutoStopCondition() || totalApSpent.value > 1500000000) stopAutoSpin() }, 35)
}
const stopAutoSpin = () => { isSpinning.value = false; if (spinInterval) clearInterval(spinInterval) }


// ==============================================
// [3] 🔥 각인 시뮬레이터 로직
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

const ENG_COSTS = {
  enhance: { legend: [60, 120, 240, 600, 1200], ultimate: [250, 500, 1000, 2500, 5000] },
  reset: { legend: [10, 20, 30, 50, 100], ultimate: [100, 200, 300, 400, 500] }
}

const ENG_DB = computed(() => {
  const isBatter = engPlayerType.value === 'BATTER'
  
  const createStat = (name: string, uMin: number, uMax: number, uEmin: number, uEmax: number, lMin: number, lMax: number, lEmin: number, lEmax: number) => ({
    name, ult: { min: uMin, max: uMax, eMin: uEmin, eMax: uEmax }, leg: { min: lMin, max: lMax, eMin: lEmin, eMax: lEmax }
  })

  const common7to13 = [
    createStat('수비 능력치 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('지고 있을 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('박빙 상황(2점차 이내)에서 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('자신보다 파워 높은 카드 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('자신보다 파워 낮은 카드 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('2아웃 상황에서 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10)
  ]

  const batterSub = [
    createStat('전체 능력치 상승', 3, 5, 1, 3, 2, 3, 1, 2),
    createStat('컨택트 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8),
    createStat('갭파워 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8),
    createStat('홈런 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8),
    createStat('선구 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8),
    createStat('삼진회피 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8),
    ...common7to13,
    createStat('구종 스킬 가진 투수 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('출루 시 주루 상승', 25, 40, 5, 7, 15, 25, 3, 5),
    createStat('다른 핸드타입의 투수 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('주자가 2루 또는 3루에 있을 경우, 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('타점 기록 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('주자 없을 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('상대 팀 선발을 상대시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('경기 1회~4회까지만 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('경기 5회~9회까지만 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('경기 총 수익 증가', 5, 7, 2, 4, 3, 5, 1, 3)
  ]

  const pitcherSub = [
    createStat('전체 능력치 상승', 3, 5, 1, 3, 2, 3, 1, 2),
    createStat('무브먼트 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8),
    createStat('장타 억제 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8),
    createStat('홈런 억제 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8),
    createStat('컨트롤 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8),
    createStat('스터프 능력치 상승', 15, 20, 5, 10, 10, 15, 5, 8),
    ...common7to13,
    createStat('클린업 타순을 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('주자 있을 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('같은 핸드타입의 타자 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('한계투구 능력치 상승', 10, 15, 3, 5, 6, 10, 3, 4),
    createStat('실점한 이닝에 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('등판 후 첫 타자 상대 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('1선발, 2선발로 기용 시 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('경기 1회~4회까지만 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('경기 5회~9회까지만 파워 상승', 40, 60, 6, 15, 30, 50, 6, 10),
    createStat('경기 총 수익 증가', 5, 7, 2, 4, 3, 5, 1, 3)
  ]

  return {
    positions: [isBatter ? '타자' : '투수'],
    mainTypes: isBatter ? ['컨택트', '갭파워', '홈런', '선구', '삼진회피'] : ['무브먼트', '장타 억제', '홈런 억제', '컨트롤', '스터프'],
    pctConditions: ['MMVP', '골든글러브', '디그니티', '신인왕', '에이스', '탑클래스', '팀플레이어', '히트', '연도(골글)'],
    pctValues: [1, 2, 3], 
    ultMainValues: [190, 200, 210, 220, 230],
    subStats: isBatter ? batterSub : pitcherSub
  }
})

const engAddLog = (msg: string, type: 'normal'|'success'|'fail'|'action' = 'normal') => {
  engLogs.value.unshift({ id: engLogId++, msg, type })
  if (engLogs.value.length > 50) engLogs.value.pop()
}

const pickRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

// 강화 횟수를 기억하여 1/n로 보너스를 재계산하는 핵심 로직
const generateSubStat = (grade: 'legend' | 'ultimate', enhanceCount: number = 0): SubStat => {
  const effect = pickRandom(ENG_DB.value.subStats)
  const stats = grade === 'ultimate' ? effect.ult : effect.leg
  
  const base = randomInt(stats.min, stats.max)
  let bonus = 0
  
  // 기존 누적 강화 횟수만큼 새로 1/n 굴림을 수행하여 보너스 추가
  for (let i = 0; i < enhanceCount; i++) {
    bonus += randomInt(stats.eMin, stats.eMax)
  }
  
  return { name: effect.name, base, bonus, eMin: stats.eMin, eMax: stats.eMax, enhanceCount }
}

const drawLegend = () => {
  engPlayerType.value = Math.random() < 0.5 ? 'BATTER' : 'PITCHER'
  engCard.value = {
    grade: 'legend', position: engPlayerType.value === 'BATTER' ? '타자' : '투수', mainName: pickRandom(ENG_DB.value.mainTypes),
    mainBase: 200, mainBonus: 0, subStats: [generateSubStat('legend', 0), generateSubStat('legend', 0), generateSubStat('legend', 0)], level: 0, resetCount: 0
  }
  engAddLog(`[레전드 획득] ${engCard.value.position} ${engCard.value.mainName} 레전드 각인을 뽑았습니다!`, 'action')
}

const drawUltimate = () => {
  engPlayerType.value = Math.random() < 0.5 ? 'BATTER' : 'PITCHER'
  engCard.value = {
    grade: 'ultimate', position: engPlayerType.value === 'BATTER' ? '타자' : '투수', mainName: pickRandom(ENG_DB.value.mainTypes),
    mainBase: pickRandom(ENG_DB.value.ultMainValues), mainBonus: 0,
    subStats: [generateSubStat('ultimate', 0), generateSubStat('ultimate', 0), generateSubStat('ultimate', 0)],
    pctName: pickRandom(ENG_DB.value.pctConditions), pctBase: pickRandom(ENG_DB.value.pctValues), level: 0, resetCount: 0
  }
  engAddLog(`[얼티밋 획득] ${engCard.value.position} ${engCard.value.mainName} 얼티밋 각인을 뽑았습니다!`, 'action')
}

const combineUltimate = () => {
  // Alert 경고창 제거 -> 시스템 로그에만 빨간색으로 출력
  if (engState.gachaCount <= 0) {
    engAddLog(`[경고] 주간 조합 횟수(15회)를 모두 소진했습니다. 초기화 후 시도해주세요.`, 'fail')
    return 
  }
  
  engState.gachaCount--; engState.legendUsed += 3
  
  if (Math.random() < 0.04) {
    engPlayerType.value = Math.random() < 0.5 ? 'BATTER' : 'PITCHER'
    engCard.value = {
      grade: 'ultimate', position: engPlayerType.value === 'BATTER' ? '타자' : '투수', mainName: pickRandom(ENG_DB.value.mainTypes),
      mainBase: pickRandom(ENG_DB.value.ultMainValues), mainBonus: 0,
      subStats: [generateSubStat('ultimate', 0), generateSubStat('ultimate', 0), generateSubStat('ultimate', 0)],
      pctName: pickRandom(ENG_DB.value.pctConditions), pctBase: pickRandom(ENG_DB.value.pctValues), level: 0, resetCount: 0
    }
    engAddLog(`[대성공] 4% 확률을 뚫고 얼티밋 조합에 성공했습니다!`, 'success')
  } else {
    engAddLog(`[실패] 조합 실패... 레전드 각인 3개가 파괴되었습니다.`, 'fail')
  }
}

const resetGachaLimit = () => {
  engState.gachaCount = 15
  engAddLog(`[시스템] 주간 조합 가능 횟수가 15회로 초기화되었습니다.`, 'action')
}

const enhanceCard = () => {
  if (!engCard.value || engCard.value.level >= 5) return
  const card = engCard.value
  const reqCores = ENG_COSTS.enhance[card.grade][card.level]
  engState.core += reqCores
  
  const mainIncrease = randomInt(card.grade === 'ultimate' ? 10 : 5, card.grade === 'ultimate' ? 25 : 15)
  card.mainBonus += mainIncrease

  const targetSubIndex = Math.floor(Math.random() * 3)
  const targetSub = card.subStats[targetSubIndex]
  const subIncrease = randomInt(targetSub.eMin, targetSub.eMax)
  targetSub.bonus += subIncrease
  targetSub.enhanceCount++ // 슬롯 자체의 누적 강화 횟수 증가 트래킹

  card.level++
  engAddLog(`[강화+${card.level} 성공] 메인+${mainIncrease}, [ ${targetSubIndex+1}번 부가옵션(${targetSub.name}) +${subIncrease} ] 상승!`, 'action')
}

const resetEnhanceCard = () => {
  if (!engCard.value || engCard.value.resetCount >= 3 || engCard.value.level === 0) return
  const card = engCard.value
  const reqCash = ENG_COSTS.reset[card.grade][card.level - 1]
  engState.cash += reqCash
  card.resetCount++; card.level = 0; card.mainBonus = 0
  card.subStats.forEach(sub => { sub.bonus = 0; sub.enhanceCount = 0 })
  engAddLog(`[강화 초기화] ${reqCash}캐시를 소모하여 강화를 초기화했습니다. (남은 횟수: ${3 - card.resetCount}/3)`, 'fail')
}

const useRefiningStone = () => {
  if (!engCard.value) return
  
  // 1. 연성석은 0강 상태에서만 사용 가능! (강화되면 비활성화)
  if (engCard.value.level > 0) {
    engAddLog(`[경고] 강화된 각인(+${engCard.value.level})에는 연성석을 사용할 수 없습니다. 초기화 후 사용하세요.`, 'fail')
    return
  }
  
  engState.refining++; 
  // 0강이므로 enhanceCount는 무조건 0
  engCard.value.subStats = [generateSubStat(engCard.value.grade, 0), generateSubStat(engCard.value.grade, 0), generateSubStat(engCard.value.grade, 0)]
  engAddLog(`[연성석 사용] 부가 옵션 3개가 모두 변경되었습니다.`, 'action')
}

const useConversionStone = (index: number) => {
  if (!engCard.value) return
  
  // 2. 변환석은 강화 상태 상관없이 언제든 사용 가능!
  engState.conversion++; 
  // 누적 강화 횟수(enhanceCount)를 기억하여 해당 슬롯 재굴림
  engCard.value.subStats[index] = generateSubStat(engCard.value.grade, engCard.value.subStats[index].enhanceCount)
  engAddLog(`[변환석 사용] ${index + 1}번 부가 옵션이 변경되었습니다.`, 'action')
}

const updateSubStatRanges = (sub: SubStat) => {
  const found = ENG_DB.value.subStats.find(s => s.name === sub.name)
  if (found && engCard.value) {
    const stats = engCard.value.grade === 'ultimate' ? found.ult : found.leg
    sub.eMin = stats.eMin
    sub.eMax = stats.eMax
  }
}

const formatNum = (num: number) => new Intl.NumberFormat().format(num)
</script>

<template>
  <div class="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 font-sans text-neutral-900 dark:text-neutral-100 flex flex-col min-h-screen">
    
    <!-- 최상단 통합 탭 메뉴 -->
    <div class="flex justify-center shrink-0 mb-5">
      <div class="bg-white dark:bg-neutral-800 p-1.5 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex gap-1">
        <button @click="activeTab = 'engraving'" class="px-6 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2" :class="activeTab === 'engraving' ? 'bg-amber-500 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'"><Gem class="w-4 h-4"/>각인 시뮬레이터</button>
        <button @click="activeTab = 'enhance'" class="px-6 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2" :class="activeTab === 'enhance' ? 'bg-blue-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'"><Zap class="w-4 h-4"/>강화 시뮬레이터</button>
        <button @click="activeTab = 'career'" class="px-6 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2" :class="activeTab === 'career' ? 'bg-purple-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'"><Star class="w-4 h-4"/>커리어 시뮬레이터</button>
      </div>
    </div>

    <!-- ==============================================
         [탭 1] 💎 각인 시뮬레이터
         ============================================== -->
    <div v-show="activeTab === 'engraving'" class="flex flex-col w-full animate-fade-in">
      
      <!-- 타자/투수 포지션 토글 -->
      <div class="flex justify-center mb-5">
        <div class="bg-white dark:bg-neutral-900 p-1.5 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 flex gap-1 w-64">
          <button @click="engPlayerType = 'BATTER'" class="flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors" :class="engPlayerType === 'BATTER' ? 'bg-blue-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'">타자 각인</button>
          <button @click="engPlayerType = 'PITCHER'" class="flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors" :class="engPlayerType === 'PITCHER' ? 'bg-red-500 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'">투수 각인</button>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-12 gap-5 w-full">
        
        <!-- 좌측: 영수증 & 가챠 조합소 -->
        <section class="xl:col-span-3 flex flex-col gap-4">
          <!-- 영수증 -->
          <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-5 text-white shadow-xl shrink-0">
            <div class="flex justify-between items-center mb-3 pb-2 border-b border-neutral-700">
              <div class="font-extrabold text-sm flex items-center gap-2"><Calculator class="w-4 h-4 text-green-400"/> 파산 영수증</div>
              <span class="text-[10px] text-neutral-400">실시간 누적 소모량</span>
            </div>
            <div class="space-y-2.5 text-xs">
              <div class="flex justify-between items-center"><span class="text-neutral-300">소모 AP</span><span class="font-black text-yellow-400">{{ formatNum(engState.ap) }}</span></div>
              <div class="flex justify-between items-center"><span class="text-neutral-300">소모 캐시</span><span class="font-black text-purple-400">{{ formatNum(engState.cash) }} 💎</span></div>
              <div class="flex justify-between items-center"><span class="text-neutral-300">레전드 각인 (재료)</span><span class="font-bold text-white">{{ formatNum(engState.legendUsed) }} 개</span></div>
              <div class="flex justify-between items-center"><span class="text-neutral-300">강화 코어</span><span class="font-bold text-blue-400">{{ formatNum(engState.core) }} 개</span></div>
              <div class="flex justify-between items-center"><span class="text-neutral-300">연성석 (3개 변경)</span><span class="font-bold text-green-400">{{ formatNum(engState.refining) }} 개</span></div>
              <div class="flex justify-between items-center"><span class="text-neutral-300">변환석 (1개 변경)</span><span class="font-bold text-teal-400">{{ formatNum(engState.conversion) }} 개</span></div>
            </div>
          </div>

          <!-- 가챠 & 조합소 -->
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
            <h3 class="font-extrabold text-xs border-b border-neutral-100 dark:border-neutral-800 pb-2">🎰 각인 획득소</h3>
            
            <button @click="drawLegend" class="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold shadow-md transition-transform active:scale-95 text-xs">
              레전드 각인 뽑기
            </button>
            <button @click="drawUltimate" class="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-md transition-transform active:scale-95 text-xs">
              얼티밋 각인 뽑기 (확정)
            </button>
            
            <div class="border-t border-neutral-100 dark:border-neutral-800 pt-3 mt-1">
              <div class="flex justify-between items-center mb-2">
                <span class="text-[11px] font-bold text-purple-600 dark:text-purple-400">얼티밋 조합 (4%)</span>
                <span class="text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-bold">주간 <span class="text-purple-500">{{ engState.gachaCount }}</span>/15</span>
              </div>
              <button @click="combineUltimate" class="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md transition-transform active:scale-95 text-xs mb-2">
                조합 시도 (재료 3개 소모)
              </button>
              <button @click="resetGachaLimit" class="w-full py-1.5 border border-purple-200 dark:border-purple-800/50 text-purple-600 dark:text-purple-400 text-[10px] font-bold rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex justify-center items-center gap-1">
                <RefreshCcw class="w-3 h-3"/> 횟수 15회 강제 초기화
              </button>
            </div>
          </div>

          <!-- 로그 박스 -->
          <div class="bg-[#0f0f13] border border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-col h-[160px]">
            <div class="text-[11px] font-bold text-neutral-500 mb-2 flex items-center gap-1.5"><History class="w-3.5 h-3.5"/> 시스템 로그</div>
            <div class="flex-1 overflow-y-auto space-y-1 font-mono text-[10px]">
              <div v-for="log in engLogs" :key="log.id" :class="{'text-green-400': log.type === 'normal', 'text-yellow-400 font-bold': log.type === 'success', 'text-red-400': log.type === 'fail', 'text-blue-300': log.type === 'action'}">
                <span class="opacity-50 mr-1">></span>{{ log.msg }}
              </div>
            </div>
          </div>
        </section>

        <!-- 우측: 각인 카드 뷰 및 조작부 -->
        <section class="xl:col-span-9 flex flex-col gap-4">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
            
            <!-- 왼쪽 뷰: 렌더링된 각인 카드 (넓게) -->
            <div class="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm flex flex-col relative">
              <h2 class="text-lg font-black mb-4 flex items-center gap-2"><Settings class="w-5 h-5 text-amber-500"/> 내 각인 인벤토리</h2>

              <div v-if="!engCard" class="flex-1 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl flex flex-col items-center justify-center text-neutral-400 min-h-[400px]">
                <Gem class="w-12 h-12 mb-3 opacity-20"/>
                <p class="font-bold text-sm">장착된 각인이 없습니다.</p>
                <p class="text-xs">좌측 획득소에서 각인을 생성해주세요.</p>
              </div>

              <!-- 생성된 각인 UI -->
              <div v-else class="flex flex-col gap-4 flex-1">
                
                <!-- 카드 렌더링 영역 -->
                <div class="bg-gradient-to-br from-neutral-800 to-black p-6 rounded-2xl border-2 shadow-xl relative overflow-hidden flex-1 flex flex-col min-h-[420px]" :class="engCard.grade === 'ultimate' ? 'border-amber-400' : 'border-neutral-500'">
                  <Gem class="absolute -right-6 -top-6 w-40 h-40 opacity-5" :class="engCard.grade === 'ultimate' ? 'text-amber-500' : 'text-neutral-100'"/>
                  
                  <!-- 헤더 -->
                  <div class="flex justify-between items-end mb-4 relative z-10">
                    <div>
                      <div class="text-[10px] font-black px-2 py-1 rounded inline-block mb-1 shadow-sm" :class="engCard.grade === 'ultimate' ? 'bg-amber-500 text-black' : 'bg-neutral-500 text-white'">{{ engCard.grade.toUpperCase() }}</div>
                      <h3 class="text-2xl font-black text-white tracking-tight">{{ engCard.level > 0 ? `+${engCard.level} ` : '' }}{{ engCard.position }} {{ engCard.mainName }} 각인</h3>
                    </div>
                    <div class="text-right text-xs font-medium text-neutral-400">
                      초기화 가능: <strong class="text-white">{{ 3 - engCard.resetCount }}</strong> / 3
                    </div>
                  </div>

                  <!-- 스탯 리스트 뷰 -->
                  <div class="space-y-3 relative z-10 mt-2 mb-4 flex-1">
                    <!-- 메인 스탯 -->
                    <div class="flex items-center bg-white/10 rounded-xl p-3 border border-white/5 backdrop-blur-sm">
                      <div class="w-2/5 font-bold text-amber-300 text-sm flex items-center gap-1.5"><Star class="w-4 h-4"/> 메인 스탯</div>
                      <div class="w-1/4 font-black text-white text-base">{{ engCard.mainBase }}</div>
                      <div class="flex-1 font-black text-green-400 text-right text-base">+ {{ engCard.mainBonus }}</div>
                    </div>

                    <!-- 부가 옵션 1~3 -->
                    <div v-for="(sub, i) in engCard.subStats" :key="i" class="flex items-center bg-white/5 rounded-xl p-3 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                      <div class="w-2/5 font-medium text-neutral-300 text-[13px] truncate pr-2">{{ sub.name }}</div>
                      <div class="w-1/4 font-bold text-white text-sm">{{ sub.base }}</div>
                      <div class="w-1/4 font-bold text-green-400 text-sm">+ {{ sub.bonus }}</div>
                      <div class="flex-1 text-right">
                        <!-- 변환석은 강화 상태 무관 상시 사용 가능! disabled 제거됨 -->
                        <button @click="useConversionStone(i)" class="px-2 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold rounded shadow-sm">변환</button>
                      </div>
                    </div>

                    <!-- 조건부 옵션 (얼티밋 전용) -->
                    <div v-if="engCard.grade === 'ultimate'" class="flex items-center bg-purple-900/40 rounded-xl p-3 border border-purple-500/30 backdrop-blur-sm mt-3">
                      <div class="w-2/5 font-extrabold text-purple-300 text-[13px] flex items-center gap-1.5">조건부 효과</div>
                      <div class="w-1/4 font-black text-purple-200 text-sm">[{{ engCard.pctName }}]</div>
                      <div class="flex-1 text-right font-black text-amber-300 text-sm">{{ engCard.pctBase }}% (고정)</div>
                    </div>
                  </div>
                </div>

                <!-- 하단 컨트롤 버튼 -->
                <div class="grid grid-cols-3 gap-3 shrink-0 mt-auto">
                  <button @click="enhanceCard" :disabled="engCard.level >= 5" class="col-span-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-base shadow-md transition-transform active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2">
                    <Zap class="w-5 h-5"/> {{ engCard.level >= 5 ? '강화 완료' : `강화 진행 (+${engCard.level + 1})` }}
                  </button>
                  <button @click="resetEnhanceCard" :disabled="engCard.resetCount >= 3 || engCard.level === 0" class="col-span-1 py-4 bg-neutral-700 hover:bg-red-600 text-white rounded-xl font-bold text-[11px] shadow-md transition-colors disabled:opacity-50 flex flex-col justify-center items-center leading-tight">
                    <span>초기화</span>
                    <span v-if="engCard.level > 0" class="text-[10px] text-red-200 mt-1">{{ ENG_COSTS.reset[engCard.grade][engCard.level - 1] }}💎</span>
                  </button>
                  <!-- 연성석은 0강 전용! 강화를 1번이라도 하면 버튼 비활성화 됨 -->
                  <button @click="useRefiningStone" :disabled="engCard.level > 0" class="col-span-3 py-3 mt-1 border border-green-500 text-green-600 dark:text-green-400 hover:bg-green-500 hover:text-white rounded-xl font-extrabold text-[13px] transition-colors disabled:opacity-50 disabled:border-neutral-600 disabled:text-neutral-500 disabled:bg-transparent">
                    연성석 사용 (부가 옵션 3개 전체 변경 / 0강 전용)
                  </button>
                </div>
              </div>
            </div>

            <!-- 오른쪽 뷰: 내 인게임 각인 완벽 수동 동기화 패널 (에디터) -->
            <div class="lg:col-span-5 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 shadow-sm flex flex-col relative overflow-y-auto">
              <h3 class="font-extrabold text-sm flex items-center gap-1.5 mb-3 text-blue-700 dark:text-blue-400 border-b border-blue-200 dark:border-blue-800/50 pb-2"><Edit3 class="w-4 h-4"/> 내 인게임 각인 수동 세팅 (에디터)</h3>
              
              <div v-if="!engCard" class="text-xs text-neutral-500 text-center py-10">각인이 먼저 생성되어야 수정할 수 있습니다.</div>
              
              <div v-else class="space-y-3">
                <!-- 1. 기본 정보 세팅 -->
                <div class="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm text-xs">
                  <div class="font-bold text-neutral-500 mb-2">기본 정보</div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="block text-[10px] text-neutral-400 mb-1">등급 변경</label>
                      <select v-model="engCard.grade" class="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded p-1.5 font-bold outline-none"><option value="legend">레전드</option><option value="ultimate">얼티밋</option></select>
                    </div>
                    <div>
                      <label class="block text-[10px] text-neutral-400 mb-1">현재 강화 단계</label>
                      <select v-model.number="engCard.level" class="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded p-1.5 font-bold text-blue-600 outline-none"><option v-for="n in 6" :key="n-1" :value="n-1">+{{n-1}}강</option></select>
                    </div>
                  </div>
                </div>

                <!-- 2. 메인 스탯 세팅 -->
                <div class="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm text-xs">
                  <div class="font-bold text-amber-500 mb-2">메인 옵션 (고유)</div>
                  <div class="grid grid-cols-12 gap-2 items-center">
                    <select v-model="engCard.mainName" class="col-span-6 bg-neutral-50 dark:bg-neutral-800 border-none rounded p-1.5 font-bold outline-none"><option v-for="name in ENG_DB.mainTypes" :key="name" :value="name">{{name}}</option></select>
                    <input type="number" v-model.number="engCard.mainBase" class="col-span-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded p-1.5 text-center font-bold outline-none" placeholder="기본">
                    <input type="number" v-model.number="engCard.mainBonus" class="col-span-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-1.5 text-center font-bold text-green-600 outline-none" placeholder="추가">
                  </div>
                </div>

                <!-- 3. 부가 스탯 3종 세팅 -->
                <div class="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm text-xs">
                  <div class="font-bold text-neutral-500 mb-2">부가 옵션 3종</div>
                  <div class="space-y-2">
                    <div v-for="(sub, i) in engCard.subStats" :key="i" class="grid grid-cols-12 gap-2 items-center">
                      <select v-model="sub.name" @change="updateSubStatRanges(sub)" class="col-span-6 bg-neutral-50 dark:bg-neutral-800 border-none rounded p-1.5 font-bold outline-none truncate"><option v-for="opt in ENG_DB.subStats" :key="opt.name" :value="opt.name">{{opt.name}}</option></select>
                      <input type="number" v-model.number="sub.base" class="col-span-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded p-1.5 text-center font-bold outline-none" placeholder="기본">
                      <input type="number" v-model.number="sub.bonus" class="col-span-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-1.5 text-center font-bold text-green-600 outline-none" placeholder="추가">
                    </div>
                  </div>
                </div>

                <!-- 4. 조건부 옵션 세팅 (얼티밋) -->
                <div v-if="engCard.grade === 'ultimate'" class="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-purple-200 dark:border-purple-800 shadow-sm text-xs">
                  <div class="font-bold text-purple-500 mb-2">조건부 옵션 (얼티밋)</div>
                  <div class="grid grid-cols-12 gap-2 items-center">
                    <select v-model="engCard.pctName" class="col-span-8 bg-purple-50 dark:bg-purple-900/20 border-none rounded p-1.5 font-bold text-purple-700 dark:text-purple-300 outline-none"><option v-for="c in ENG_DB.pctConditions" :key="c" :value="c">{{c}}</option></select>
                    <select v-model.number="engCard.pctBase" class="col-span-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded p-1.5 font-bold text-center text-amber-500 outline-none"><option v-for="v in ENG_DB.pctValues" :key="v" :value="v">{{v}}%</option></select>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- [2] 강화 탭 (기존 UI 유지) -->
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

    <!-- [3] 커리어 탭 (기존 UI 유지) -->
    <div v-show="activeTab === 'career'" class="flex flex-col w-full animate-fade-in">
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

        <section class="lg:col-span-4 flex flex-col h-full">
          <div class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl p-5 shadow-sm flex-1 flex flex-col relative overflow-hidden">
            <h3 class="font-extrabold text-base flex items-center gap-2 mb-4 text-blue-700 dark:text-blue-400"><Target class="w-5 h-5"/> 커리어 목표 고정 기대값 계산기</h3>
            
            <div class="space-y-4 mb-4 flex-1">
              <div>
                <label class="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">어떤 목표를 계산할까요?</label>
                <select v-model="calcTargetGoal" class="w-full bg-white dark:bg-neutral-900 border border-blue-200 dark:border-blue-800 rounded-xl p-2.5 text-sm font-bold outline-none shadow-sm cursor-pointer">
                  <option value="5MASTER">목표: 잠금 없이 모든 슬롯 '마스터' 달성</option>
                  <option value="TARGET_SET">목표: 특정 옵션 N세트 달성 (잠금 비용 포함)</option>
                  <option value="TARGET_3_3">목표: 3-3 듀얼 세트 달성 (잠금 비용 포함)</option>
                </select>
              </div>

              <div v-if="calcTargetGoal === 'TARGET_SET'" class="flex gap-2 p-3 bg-white dark:bg-neutral-900 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                <select v-model="calcTargetSetOptId" class="flex-1 bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg p-2 text-[11px] font-bold outline-none truncate cursor-pointer">
                  <option v-for="(opt, i) in CURRENT_DATA" :key="i" :value="i">{{opt.name}}</option>
                </select>
                <select v-model="calcTargetSetCount" class="w-20 bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg p-2 text-xs font-bold outline-none text-center cursor-pointer">
                  <option v-for="n in [3,4,5,6]" :key="n" :value="n">{{n}}세트</option>
                </select>
              </div>

              <div v-if="calcTargetGoal === 'TARGET_3_3'" class="flex flex-col gap-2 p-3 bg-white dark:bg-neutral-900 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                <div class="text-[11px] font-bold text-blue-600">첫 번째 3세트 목표</div>
                <select v-model="calcTarget3_3_Opt1" class="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg p-2 text-[11px] font-bold outline-none truncate cursor-pointer">
                  <option v-for="(opt, i) in CURRENT_DATA" :key="i" :value="i">{{opt.name}}</option>
                </select>
                <div class="text-[11px] font-bold text-pink-600 mt-1">두 번째 3세트 목표</div>
                <select v-model="calcTarget3_3_Opt2" class="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg p-2 text-[11px] font-bold outline-none truncate cursor-pointer">
                  <option v-for="(opt, i) in CURRENT_DATA" :key="i" :value="i">{{opt.name}}</option>
                </select>
              </div>

              <div class="pt-2">
                <label class="flex items-start gap-2 p-3 bg-blue-100/50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                  <input type="checkbox" v-model="useUpgradeMemory" class="mt-0.5 w-4 h-4 accent-blue-600">
                  <div class="flex flex-col">
                    <span class="text-sm font-extrabold text-blue-800 dark:text-blue-300">하위 등급 1칸 남을 시 '승급 메모리' 사용</span>
                    <span class="text-[11px] font-medium text-blue-600 dark:text-blue-400 mt-0.5 leading-relaxed">
                      상위 등급 슬롯의 막대한 스핀 비용을 절약하기 위해, 마지막 남은 하위 등급 1개는 잠금 없이 승급 메모리로 바로 올립니다.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <button @click="runExpectedValueCalc" :disabled="isCalculating" class="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-sm shadow-md transition-colors flex justify-center items-center gap-2 disabled:opacity-50 shrink-0">
              <BarChart class="w-5 h-5"/> 
              {{ isCalculating ? '정밀 시뮬레이션 계산 중...' : '기대값 및 소모량 계산하기' }}
            </button>

            <div v-if="calcResult" class="mt-4 p-4 bg-white dark:bg-neutral-900 rounded-xl border border-blue-200 dark:border-blue-800/50 shadow-inner shrink-0">
              <div class="text-center text-[11px] font-bold text-neutral-500 mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-2">현재 상태를 기준으로 한 수학적 평균 도달치</div>
              
              <div class="flex justify-between items-center mb-2.5">
                <span class="text-sm font-bold text-neutral-700 dark:text-neutral-300">평균 스핀 횟수</span>
                <span class="text-lg font-black text-blue-600 dark:text-blue-400">{{ formatNum(calcResult.avgRolls) }} 회</span>
              </div>
              
              <div class="flex justify-between items-center mb-2.5">
                <span class="text-sm font-bold text-neutral-700 dark:text-neutral-300 flex flex-col">
                  <span>평균 소모 AP</span>
                  <span class="text-[10px] text-neutral-400 font-normal">5칸 동시 소모 비용 포함</span>
                </span>
                <span class="text-xl font-black text-yellow-500">{{ formatNum(calcResult.avgAp) }} AP</span>
              </div>
              
              <div v-if="calcTargetGoal !== '5MASTER'" class="flex justify-between items-center pt-2.5 border-t border-neutral-100 dark:border-neutral-800">
                <span class="text-sm font-bold text-neutral-700 dark:text-neutral-300 flex flex-col">
                  <span>평균 소모 CASH</span>
                  <span class="text-[10px] text-neutral-400 font-normal">잠금 페널티 비용</span>
                </span>
                <span class="text-lg font-black text-purple-500">{{ formatNum(calcResult.avgCash) }} 💎</span>
              </div>

              <div v-if="useUpgradeMemory && (calcResult.memElite > 0.05 || calcResult.memPro > 0.05 || calcResult.memMaster > 0.05)" class="pt-2.5 mt-2.5 border-t border-blue-100 dark:border-blue-900/30 space-y-1">
                <div class="text-xs font-bold text-blue-500 mb-1.5">평균 필요 승급 메모리 (AP 절약용)</div>
                <div class="flex justify-between text-[11px]" v-if="calcResult.memElite > 0.05"><span class="text-neutral-500">엘리트 메모리</span><span class="font-bold text-blue-600">{{ calcResult.memElite.toFixed(1) }} 개</span></div>
                <div class="flex justify-between text-[11px]" v-if="calcResult.memPro > 0.05"><span class="text-neutral-500">프로 메모리</span><span class="font-bold text-pink-600">{{ calcResult.memPro.toFixed(1) }} 개</span></div>
                <div class="flex justify-between text-[11px]" v-if="calcResult.memMaster > 0.05"><span class="text-neutral-500">마스터 메모리</span><span class="font-bold text-yellow-600">{{ calcResult.memMaster.toFixed(1) }} 개</span></div>
              </div>
              
              <div v-if="calcTargetGoal !== '5MASTER' && calcResult.specialRolls > 0" class="flex justify-between items-center pt-2.5 mt-2.5 border-t border-red-100 dark:border-red-900/30">
                <span class="text-sm font-bold text-red-500 flex flex-col">
                  <span>스페셜 갱신 횟수</span>
                  <span class="text-[10px] text-red-400 font-normal">목표 옵션 등장을 위한 평균치</span>
                </span>
                <span class="text-lg font-black text-red-500">{{ formatNum(calcResult.specialRolls) }} 회</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
</style>
